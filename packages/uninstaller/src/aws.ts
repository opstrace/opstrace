/**
 * Copyright 2020 Opstrace, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { IAM } from "aws-sdk";
import {
  call,
  fork,
  join,
  JoinEffect,
  CallEffect,
  ForkEffect
} from "redux-saga/effects";
import { Task } from "redux-saga";
import {
  ensureAddressDoesNotExist,
  destroyVPC,
  destroyRDSCluster,
  destroyRDSInstance,
  ensureSubnetsDoNotExist,
  ensureRoleDoesNotExist,
  destroyInstanceProfile,
  destroyAutoScalingGroup,
  ensurePolicyDoesNotExist,
  ensureInternetGatewayDoesNotExist,
  destroyEKS,
  ensureSecurityGroupDoesNotExist,
  ensureSecurityGroupPermissionsDoNotExist,
  ensureLaunchConfigurationDoesNotExist,
  removeRole,
  detachPolicy,
  getPolicy,
  route53PurgeZonesForDnsName,
  S3BucketRes,
  NatGatewayRes,
  VpcEndpointRes,
  RouteTablePrivateRes,
  RouteTablePublicRes,
  RDSSubnetGroupRes
} from "@opstrace/aws";
import { DNSClient } from "@opstrace/dns";

import { log, getBucketName } from "@opstrace/utils";

import { destroyConfig } from "./index";

interface RolenamePolicyarnAssociation {
  RoleName: string;
  PolicyArn: string;
}

export function* destroyAWSInfra(): Generator<
  JoinEffect | CallEffect | ForkEffect | Generator<ForkEffect, Task[], Task>,
  void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
> {
  const lokiBucketName = getBucketName({
    clusterName: destroyConfig.clusterName,
    suffix: "loki"
  });
  const lokiConfigBucketName = getBucketName({
    clusterName: destroyConfig.clusterName,
    suffix: "loki-config"
  });
  const cortexDataBucketName = getBucketName({
    clusterName: destroyConfig.clusterName,
    suffix: "cortex"
  });
  const cortexConfigBucketName = getBucketName({
    clusterName: destroyConfig.clusterName,
    suffix: "cortex-config"
  });

  const InstanceProfileName = `${destroyConfig.clusterName}-instance-profile`;
  const LaunchConfigurationName = `${destroyConfig.clusterName}-primary-launch-configuration`;
  const EKSWorkerNodesRoleName = `${destroyConfig.clusterName}-eks-nodes`;
  const EKSClusterRoleName = `${destroyConfig.clusterName}-eks-controlplane`;
  const CertManagerRoleName = `${destroyConfig.clusterName}-cert-manager`;

  const opstraceClient = yield call([DNSClient, DNSClient.getInstance]);

  // Note(JP): fork "effect": is an "attached" fork (task). Use that for
  // implementing concurrently executing (and crash-looping) micro teardown
  // tasks, towards more robust dependency resolution and best-effort outcome,
  // and overall fast teardown. Think: individual tasks terminate on success,
  // otherwise run forever (rely on global timeout control). For an "attached
  // fork" there is no explicit wait required in the caller -- the caller
  // implicitly waits for all attached forks to terminate. Nevertheless, wait
  // for some tasks / task groups explicitly every now and then for now to keep
  // things debuggable.

  const taskGroup1 = [];

  taskGroup1.push(
    yield fork(destroyAutoScalingGroup, destroyConfig.clusterName)
  );

  taskGroup1.push(
    yield fork(ensureLaunchConfigurationDoesNotExist, {
      LaunchConfigurationName
    })
  );

  taskGroup1.push(
    yield fork(removeRole, {
      InstanceProfileName,
      RoleName: EKSWorkerNodesRoleName
    })
  );

  taskGroup1.push(
    yield fork(destroyInstanceProfile, destroyConfig.clusterName)
  );

  taskGroup1.push(yield fork(destroyRDSInstance, destroyConfig.clusterName));

  taskGroup1.push(yield fork(destroyRDSCluster, destroyConfig.clusterName));

  // Note(JP): with the autoscaling group being gone: assume that all
  // ec2 instances are gone, i.e. workloads are gone.

  const eksDestroyTask = yield fork(destroyEKS, destroyConfig.clusterName);

  const taskGroup2 = [];

  taskGroup2.push(
    yield fork(
      detachPoliciesFromRoles,
      cortexDataBucketName,
      cortexConfigBucketName,
      lokiBucketName,
      lokiConfigBucketName
    )
  );

  for (const rname of [
    EKSWorkerNodesRoleName,
    EKSClusterRoleName,
    CertManagerRoleName
  ]) {
    taskGroup2.push(
      yield fork(ensureRoleDoesNotExist, {
        RoleName: rname
      })
    );
  }

  const taskGroup3 = [];
  for (const rtclass of [RouteTablePrivateRes, RouteTablePublicRes]) {
    taskGroup3.push(
      yield fork([new rtclass(destroyConfig.clusterName), "teardown"])
    );
  }

  taskGroup3.push(
    yield fork([
      new VpcEndpointRes(
        destroyConfig.clusterName,
        `${destroyConfig.clusterName}-s3`
      ),
      "teardown"
    ])
  );

  const taskGroup4 = [];

  const route53dnsname = `${destroyConfig.clusterName}.opstrace.io.`;
  taskGroup4.push(yield fork(route53PurgeZonesForDnsName, route53dnsname));
  taskGroup4.push(
    yield fork(
      [opstraceClient, opstraceClient.delete],
      destroyConfig.clusterName
    )
  );

  for (const bn of [
    lokiBucketName,
    lokiConfigBucketName,
    cortexDataBucketName,
    cortexConfigBucketName
  ]) {
    taskGroup4.push(
      yield fork([new S3BucketRes(destroyConfig.clusterName, bn), "teardown"])
    );
  }

  yield join([...taskGroup1]);
  log.debug("task group 1 finished");

  yield join([...taskGroup2]);
  log.debug("task group 2 finished");

  yield join([...taskGroup3]);
  log.debug("task group 3 finished");

  yield join([...taskGroup4]);
  log.debug("task group 4 finished");

  // A task group that needs a better name, tasks will be joined late in the
  // game.
  const taskGroupBob = [];

  taskGroupBob.push(
    yield fork([new RDSSubnetGroupRes(destroyConfig.clusterName), "teardown"])
  );

  taskGroupBob.push(
    yield fork(ensureSubnetsDoNotExist, destroyConfig.clusterName)
  );

  taskGroupBob.push(
    yield fork([new NatGatewayRes(destroyConfig.clusterName), "teardown"])
  );

  taskGroupBob.push(
    yield fork(ensureAddressDoesNotExist, destroyConfig.clusterName)
  );

  taskGroupBob.push(
    yield fork(ensureInternetGatewayDoesNotExist, destroyConfig.clusterName)
  );

  const taskGroupSGs = yield startSecurityGroupDeletionTasks();

  yield call(destroyVPC, {
    clusterName: destroyConfig.clusterName
  });

  // note that when the global operation times out there should be an explicit,
  // clean, reliable way to cancel all tasks ("to preempt/kill all coroutines")
  // -- should evaluate how to do that once redux-saga is out of the picuture,
  // also see
  // opstrace-prelaunch/issues/1457
  // opstrace-prelaunch/issues/1445
  // one clean way would be to perform the teardown logic in a child process
  // which gets killed upon timeout.

  yield join([...taskGroupSGs]);
  log.debug("task group (security group deletion) finished");

  log.debug("joining eks destroy task");
  join([eksDestroyTask]);
  log.debug("eks destroy task finished");

  log.debug("joining taskGroupBob");
  join([...taskGroupBob]);
  log.debug("joined taskGroupBob");

  log.debug("end of destroyAWSInfra()");
  log.info(
    "S3 has been instructed to wipe the data buckets behind the scenes, " +
      "asynchronously. This process may take a day or longer. After " +
      "completion, three empty S3 buckets will be left behind which you " +
      "have to delete manually: %s, %s, %s, %s",
    lokiBucketName,
    lokiConfigBucketName,
    cortexDataBucketName,
    cortexConfigBucketName
  );
}

function* startSecurityGroupDeletionTasks() {
  const taskGroupSGs: Task[] = [];

  const EKSMasterSecurityGroupName = `${destroyConfig.clusterName}-eks-master-security-group`;
  const EKSWorkerSecurityGroupName = `${destroyConfig.clusterName}-eks-worker-security-group`;
  const RDSSecurityGroupName = `${destroyConfig.clusterName}-rds-security-group`;

  taskGroupSGs.push(
    yield fork(ensureSecurityGroupPermissionsDoNotExist, {
      GroupName: RDSSecurityGroupName
    })
  );

  taskGroupSGs.push(
    yield fork(ensureSecurityGroupPermissionsDoNotExist, {
      GroupName: EKSWorkerSecurityGroupName
    })
  );

  taskGroupSGs.push(
    yield fork(ensureSecurityGroupPermissionsDoNotExist, {
      GroupName: EKSMasterSecurityGroupName
    })
  );

  taskGroupSGs.push(
    yield fork(ensureSecurityGroupDoesNotExist, {
      GroupName: RDSSecurityGroupName
    })
  );

  taskGroupSGs.push(
    yield fork(ensureSecurityGroupDoesNotExist, {
      GroupName: EKSWorkerSecurityGroupName
    })
  );

  taskGroupSGs.push(
    yield fork(ensureSecurityGroupDoesNotExist, {
      GroupName: EKSMasterSecurityGroupName
    })
  );

  return taskGroupSGs;
}

function* detachPoliciesFromRoles(
  cortexDataBucketName: string,
  cortexConfigBucketName: string,
  lokiBucketName: string,
  lokiConfigBucketName: string
) {
  const EKSWorkerNodesRoleName = `${destroyConfig.clusterName}-eks-nodes`;
  const EKSClusterRoleName = `${destroyConfig.clusterName}-eks-controlplane`;
  const CertManagerRoleName = `${destroyConfig.clusterName}-cert-manager`;
  const EKSServiceLinkedRolePolicyName = `${destroyConfig.clusterName}-eks-linked-service`;
  const CortexDataS3PolicyName = `${cortexDataBucketName}-s3`;
  const CortexConfigS3PolicyName = `${cortexConfigBucketName}-s3`;
  const LokiConfigS3PolicyName = `${lokiConfigBucketName}-s3`;
  const LokiS3PolicyName = `${lokiBucketName}-s3`;
  const Route53ExternalDNSPolicyName = `${destroyConfig.clusterName}-externaldns`;

  // Detach policies from roles.
  // First, define a priori known policy-role associations
  const eksWorkerNodeRolePolicies: RolenamePolicyarnAssociation[] = [
    {
      RoleName: EKSClusterRoleName,
      PolicyArn: "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
    },
    {
      RoleName: EKSClusterRoleName,
      PolicyArn: "arn:aws:iam::aws:policy/AmazonEKSServicePolicy"
    },
    {
      RoleName: EKSWorkerNodesRoleName,
      PolicyArn: "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
    },
    {
      RoleName: EKSWorkerNodesRoleName,
      PolicyArn: "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
    },
    {
      RoleName: EKSWorkerNodesRoleName,
      PolicyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
    },
    {
      RoleName: EKSWorkerNodesRoleName,
      PolicyArn: "arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess"
    }
  ];

  // look up a some dynamically created policies (known by convention, by name)
  //@ts-ignore: TS7075 generator lacks return type (TS 4.3)
  const pols1 = yield call(getIamPoliciesByNames, [
    EKSServiceLinkedRolePolicyName
  ]);
  for (const pol of pols1) {
    eksWorkerNodeRolePolicies.push({
      RoleName: EKSClusterRoleName,
      PolicyArn: pol.Arn
    });
  }

  //@ts-ignore: TS7075 generator lacks return type (TS 4.3)
  const pols2 = yield call(getIamPoliciesByNames, [
    Route53ExternalDNSPolicyName,
    LokiS3PolicyName,
    CortexDataS3PolicyName,
    CortexConfigS3PolicyName,
    LokiConfigS3PolicyName
  ]);
  for (const pol of pols2) {
    eksWorkerNodeRolePolicies.push({
      RoleName: EKSWorkerNodesRoleName,
      PolicyArn: pol.Arn
    });
    if (pol.PolicyName == Route53ExternalDNSPolicyName) {
      eksWorkerNodeRolePolicies.push({
        RoleName: CertManagerRoleName,
        PolicyArn: pol.Arn
      });
    }
  }

  // Detach policies from roles concurrently.
  const actors = [];
  for (const pol of eksWorkerNodeRolePolicies) {
    log.info(
      "Try to detach policy %s from role %s",
      pol.PolicyArn,
      pol.RoleName
    );
    actors.push(
      //@ts-ignore: TS7075 generator lacks return type (TS 4.3)
      yield fork(detachPolicy, {
        ...pol
      })
    );
  }
  yield join([...actors]);

  // Delete policies concurrently.
  const policiesToDelete = [
    EKSServiceLinkedRolePolicyName,
    CortexDataS3PolicyName,
    CortexConfigS3PolicyName,
    LokiConfigS3PolicyName,
    LokiS3PolicyName,
    Route53ExternalDNSPolicyName
  ];

  const actors2 = [];
  for (const pn of policiesToDelete) {
    log.info("Try to delete policy %s", pn);
    actors2.push(
      //@ts-ignore: TS7075 generator lacks return type (TS 4.3)
      yield fork(ensurePolicyDoesNotExist, {
        PolicyName: pn
      })
    );
  }
  yield join([...actors2]);
  log.info("All policy-role attachments detached");
}

function* getIamPoliciesByNames(polnames: string[]) {
  const policies = [];
  for (const pname of polnames) {
    const p: IAM.Policy = yield call(getPolicy, {
      PolicyName: pname
    });
    if (p && p.Arn) {
      policies.push(p);
    }
  }
  return policies;
}
