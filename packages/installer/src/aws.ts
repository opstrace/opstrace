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

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { strict as assert } from "assert";
import yaml from "js-yaml";
import AWS from "aws-sdk";
import { all, call, fork, join } from "redux-saga/effects";

import { ensureDNSExists } from "@opstrace/dns";
import {
  createVPC,
  ensureSubnetsExist,
  ensureRoleExists,
  createInstanceProfile,
  ensureAutoScalingGroupExists,
  ensurePolicyExists,
  attachPolicy,
  addRole,
  ensureInternetGatewayExists,
  attachInternetGateway,
  ensureEKSExists,
  ensureRDSClusterExists,
  ensureRDSInstanceExists,
  associateRouteTable,
  ensureSecurityGroupExists,
  authorizeSecurityGroupIngress,
  authorizeSecurityGroupEgress,
  ensureLaunchConfigurationExists,
  generateKubeconfigStringForEksCluster,
  Subnet,
  ElasticIPRes,
  S3BucketRes,
  RouteTablePrivateRes,
  RouteTablePublicRes,
  RouteRes,
  NatGatewayRes,
  VpcEndpointRes,
  ServiceLinkedRoleRes,
  STSRegionCheck,
  STSAccountIDRes,
  getZoneForDNSName,
  getRecordsForZone,
  RDSSubnetGroupRes
} from "@opstrace/aws";

import {
  getClusterConfig,
  getDnsConfig,
  NewRenderedClusterConfigType
} from "@opstrace/config";

import {
  ConfigMap,
  getKubeConfig,
  createOrUpdateCM
} from "@opstrace/kubernetes";

import { log, getBucketName, sleep, entries } from "@opstrace/utils";

import { getAWSConfig } from "@opstrace/config";
import { EnsureInfraExistsResponse } from "./types";

type TagList = { Key: string; Value: string }[];

function* ensureRDSExists({
  name,
  subnetGroupName,
  labels,
  securityGroupId
}: {
  name: string;
  subnetGroupName: string;
  labels: TagList;
  securityGroupId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Generator<any, AWS.RDS.DBCluster, any> {
  // Create the Aurora cluster
  const dbCluster: AWS.RDS.DBCluster = yield call(ensureRDSClusterExists, {
    opstraceDBClusterName: name,
    clusterLabels: labels,
    subnetGroupName,
    securityGroupId
  });
  // Create the Aurora instance
  yield call(ensureRDSInstanceExists, {
    opstraceDBInstanceName: name,
    instanceLabels: labels
  });

  return dbCluster;
}
export function* ensureAWSInfraExists(): Generator<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  EnsureInfraExistsResponse,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
> {
  const ccfg: NewRenderedClusterConfigType = getClusterConfig();
  assert(ccfg.aws !== undefined);

  const awsConfig = getAWSConfig(ccfg);

  // Small start for checks; fail fast for certain known traps.
  yield call([new STSRegionCheck(ccfg.cluster_name), "setup"]);

  const awsAccountID: string = yield call([
    new STSAccountIDRes(ccfg.cluster_name),
    "setup"
  ]);

  // State-mutating API calls below.
  yield call([new ServiceLinkedRoleRes(ccfg.cluster_name), "setup"]);
  yield call(ensureDNSExists, {
    opstraceClusterName: ccfg.cluster_name,
    dnsName: getDnsConfig(ccfg.cloud_provider).dnsName,
    target: ccfg.cloud_provider,
    dnsProvider: ccfg.cloud_provider
  });

  const lokiBucketName = getBucketName({
    clusterName: ccfg.cluster_name,
    suffix: "loki"
  });
  const cortexBucketName = getBucketName({
    clusterName: ccfg.cluster_name,
    suffix: "cortex"
  });

  // create s3 buckets and vpc concurrently
  const tasks = [];
  tasks.push(
    yield fork([
      new S3BucketRes(
        ccfg.cluster_name,
        lokiBucketName,
        ccfg.log_retention_days,
        ccfg.tenants
      ),
      "setup"
    ])
  );
  tasks.push(
    yield fork([
      new S3BucketRes(
        ccfg.cluster_name,
        cortexBucketName,
        ccfg.metric_retention_days,
        ccfg.tenants
      ),
      "setup"
    ])
  );

  const vpctask = yield fork(createVPC, {
    clusterName: ccfg.cluster_name,
    cidr: awsConfig.vpc.CidrBlock
  });
  tasks.push(vpctask);
  yield join([...tasks]);

  const vpc: AWS.EC2.Vpc = vpctask.result();
  assert(vpc.VpcId);
  log.info(`VPC ${vpc.VpcId} created for: ${vpc.CidrBlock}`);

  const subnets: Subnet[] = yield call(ensureSubnetsExist, {
    name: ccfg.cluster_name,
    vpc,
    subnets: awsConfig.subnets
  });

  const rdsSubnets: Subnet[] = yield call(ensureSubnetsExist, {
    name: ccfg.cluster_name,
    vpc,
    nameTag: "-rds",
    subnets: awsConfig.rdsSubnets
  });

  const rdsSubnetIds = rdsSubnets.map(s => s.SubnetId);

  if (rdsSubnetIds.find(s => !s)) {
    throw Error("RDS SubnetId is undefined, retry");
  }

  const rdsSubnetGroup: AWS.RDS.DBSubnetGroup = yield call([
    new RDSSubnetGroupRes(ccfg.cluster_name, rdsSubnetIds as string[]),
    "setup"
  ]);

  log.info(`subnets: ${subnets.map(s => s.CidrBlock).join(", ")}`);
  const internetGateway: AWS.EC2.InternetGateway = yield call(
    ensureInternetGatewayExists,
    ccfg.cluster_name
  );

  // done assert instead of N non-null-assertion.
  assert(internetGateway.InternetGatewayId);

  yield call(attachInternetGateway, {
    VpcId: vpc.VpcId,
    InternetGatewayId: internetGateway.InternetGatewayId
  });

  const address: AWS.EC2.Address = yield call([
    new ElasticIPRes(ccfg.cluster_name),
    "setup"
  ]);

  if (!address || !address.AllocationId) {
    throw Error(`Did not receive an AllocationId from AWS.EC2.Address`);
  }

  // NatGateway needs a public subnetId
  const publicSubnet = subnets.find(
    s =>
      s.AvailabilityZone === awsConfig.zone &&
      awsConfig.subnets.find(cs => cs.CidrBlock === s.CidrBlock && cs.Public)
  );

  if (!publicSubnet || !publicSubnet.SubnetId) {
    throw Error(`Could not find a public Subnet in stacks zone`);
  }

  const natGateway: AWS.EC2.NatGateway = yield call(
    [new NatGatewayRes(ccfg.cluster_name), "setup"],
    {
      SubnetId: publicSubnet.SubnetId,
      AllocationId: address.AllocationId
    }
  );

  const rtPublic: AWS.EC2.RouteTable = yield call(
    [new RouteTablePublicRes(ccfg.cluster_name), "setup"],
    vpc.VpcId
  );
  assert(rtPublic.RouteTableId);

  const rtPrivate: AWS.EC2.RouteTable = yield call(
    [new RouteTablePrivateRes(ccfg.cluster_name), "setup"],
    vpc.VpcId
  );
  assert(rtPrivate.RouteTableId);

  // Create VPC endpoint for S3 (let's maybe add a comment here why that's
  // needed -- probably a simple explanation)
  const vpceParams: AWS.EC2.CreateVpcEndpointRequest = {
    ServiceName: `com.amazonaws.${awsConfig.region}.s3`,
    VpcId: vpc.VpcId,
    RouteTableIds: [rtPublic.RouteTableId, rtPrivate.RouteTableId]
  };
  yield call(
    [new VpcEndpointRes(ccfg.cluster_name, `${ccfg.cluster_name}-s3`), "setup"],
    vpceParams
  );

  log.info("create route for: internet gateway/public route table");
  yield call([
    new RouteRes(ccfg.cluster_name, {
      RouteTableId: rtPublic.RouteTableId,
      GatewayId: internetGateway.InternetGatewayId,
      DestinationCidrBlock: "0.0.0.0/0"
    }),
    "setup"
  ]);

  log.info("create route for: NAT gateway/private route table");
  yield call([
    new RouteRes(ccfg.cluster_name, {
      RouteTableId: rtPrivate.RouteTableId,
      NatGatewayId: natGateway.NatGatewayId,
      DestinationCidrBlock: "0.0.0.0/0"
    }),
    "setup"
  ]);

  const allSubnets = subnets.concat(rdsSubnets);
  // Note(JP): this should be subject to a setup() loop provides by the
  // AWSResource class.
  for (let i = 0; i < allSubnets.length; i++) {
    const { SubnetId, Public } = allSubnets[i];
    if (!SubnetId) {
      throw Error(`Subnet does not exist`);
    }
    if (!Public) {
      // Associate Private RouteTable with Private Subnets
      log.info(
        "ensuring private RouteTable is associated with private subnets"
      );
      yield call(associateRouteTable, {
        RouteTableId: rtPrivate.RouteTableId,
        SubnetId
      });
    }
    if (Public) {
      log.info("ensuring public RouteTable is associated with public subnets");
      // Associate Public RouteTable with Public Subnets
      yield call(associateRouteTable, {
        RouteTableId: rtPublic.RouteTableId,
        SubnetId
      });
    }
  }

  // Policy required for external-dns and cert-manager
  const Route53ExternalDNSPolicyName = `${ccfg.cluster_name}-externaldns`;
  log.info(`Ensuring ${Route53ExternalDNSPolicyName} policy exists`);
  const route53Policy: AWS.IAM.Policy = yield call(ensurePolicyExists, {
    PolicyName: Route53ExternalDNSPolicyName,
    PolicyDocument: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: "route53:GetChange",
          Resource: "arn:aws:route53:::change/*"
        },
        {
          Effect: "Allow",
          Action: ["route53:ChangeResourceRecordSets"],
          Resource: ["arn:aws:route53:::hostedzone/*"]
        },
        {
          Effect: "Allow",
          Action: [
            "route53:ListHostedZones",
            "route53:ListHostedZonesByName",
            "route53:ListResourceRecordSets"
          ],
          Resource: ["*"]
        }
      ]
    })
  });

  // EKS Role
  const EKSClusterRoleName = `${ccfg.cluster_name}-eks-controlplane`;
  log.info(`Ensuring ${EKSClusterRoleName} role exists`);
  const eksClusterRole: AWS.IAM.Role = yield call(ensureRoleExists, {
    RoleName: EKSClusterRoleName,
    AssumeRolePolicyDocument: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {
            Service: "eks.amazonaws.com"
          },
          Action: "sts:AssumeRole"
        }
      ]
    })
  });

  // Worker Nodes Role
  const EKSWorkerNodesRoleName = `${ccfg.cluster_name}-eks-nodes`;
  log.info(`Ensuring ${EKSWorkerNodesRoleName} role exists`);
  const workerNodeRole: AWS.IAM.Role = yield call(ensureRoleExists, {
    RoleName: EKSWorkerNodesRoleName,
    AssumeRolePolicyDocument: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {
            Service: "ec2.amazonaws.com"
          },
          Action: "sts:AssumeRole"
        }
      ]
    })
  });

  const mapRolesYamlString = genMapRolesYamlString(
    workerNodeRole.Arn,
    awsAccountID,
    ccfg.aws.eks_admin_roles
  );

  // Loki Bucket Policy
  const LokiS3PolicyName = `${lokiBucketName}-s3`;
  log.info(`Ensuring ${LokiS3PolicyName} policy exists`);
  const lokiBucketPolicy: AWS.IAM.Policy = yield call(ensurePolicyExists, {
    PolicyName: LokiS3PolicyName,
    PolicyDocument: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "ListObjectsInBucket",
          Effect: "Allow",
          Action: ["s3:ListBucket"],
          Resource: [`arn:aws:s3:::${lokiBucketName}`]
        },
        {
          Sid: "AllObjectActions",
          Effect: "Allow",
          Action: "s3:*Object",
          Resource: [`arn:aws:s3:::${lokiBucketName}/*`]
        }
      ]
    })
  });

  // Cortex Bucket Policy
  const CortexS3PolicyName = `${cortexBucketName}-s3`;
  log.info(`Ensuring ${CortexS3PolicyName} policy exists`);
  const cortexBucketPolicy: AWS.IAM.Policy = yield call(ensurePolicyExists, {
    PolicyName: CortexS3PolicyName,
    PolicyDocument: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "ListObjectsInBucket",
          Effect: "Allow",
          Action: ["s3:ListBucket"],
          Resource: [`arn:aws:s3:::${cortexBucketName}`]
        },
        {
          Sid: "AllObjectActions",
          Effect: "Allow",
          Action: "s3:*Object",
          Resource: [`arn:aws:s3:::${cortexBucketName}/*`]
        }
      ]
    })
  });

  // CertManager role
  const CertManagerRoleName = `${ccfg.cluster_name}-cert-manager`;
  log.info(`Ensuring ${CertManagerRoleName} role exists`);
  const certManagerRole: AWS.IAM.Role = yield call(ensureRoleExists, {
    RoleName: CertManagerRoleName,
    AssumeRolePolicyDocument: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        // allow users in eks-nodes role to assume the cert-manager role, this
        // is required for the node running cert-manager to be able to assume
        // the cert-manager role
        {
          Effect: "Allow",
          Principal: {
            AWS: workerNodeRole.Arn
          },
          Action: "sts:AssumeRole"
        }
      ]
    })
  });

  const EKSServiceLinkedRolePolicyName = `${ccfg.cluster_name}-eks-linked-service`;
  log.info(`Ensuring ${EKSServiceLinkedRolePolicyName} policy exists`);
  const linkedServicePolicy: AWS.IAM.Policy = yield call(ensurePolicyExists, {
    PolicyName: EKSServiceLinkedRolePolicyName,
    PolicyDocument: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: "iam:CreateServiceLinkedRole",
          Resource: "arn:aws:iam::*:role/aws-service-role/*"
        },
        {
          Effect: "Allow",
          Action: ["ec2:DescribeAccountAttributes"],
          Resource: "*"
        }
      ]
    })
  });

  // Attach policies
  const eksWorkerNodeRolePolicies = [
    {
      RoleName: EKSClusterRoleName,
      PolicyArn: "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
    },
    {
      RoleName: EKSClusterRoleName,
      PolicyArn: "arn:aws:iam::aws:policy/AmazonEKSServicePolicy"
    },
    { RoleName: EKSClusterRoleName, PolicyArn: linkedServicePolicy.Arn! },
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
    },
    { RoleName: EKSWorkerNodesRoleName, PolicyArn: route53Policy.Arn! },
    { RoleName: EKSWorkerNodesRoleName, PolicyArn: lokiBucketPolicy.Arn! },
    { RoleName: EKSWorkerNodesRoleName, PolicyArn: cortexBucketPolicy.Arn! },
    // Attach route53 policy to cert manager role
    { RoleName: certManagerRole.RoleName, PolicyArn: route53Policy.Arn! }
  ];

  for (let i = 0; i < eksWorkerNodeRolePolicies.length; i++) {
    const policy = eksWorkerNodeRolePolicies[i];
    log.info(`Ensuring ${policy.RoleName} is attached`);

    yield call(attachPolicy, {
      ...policy
    });
  }

  // EKS Security Group
  const EKSMasterSecurityGroupName = `${ccfg.cluster_name}-eks-master-security-group`;
  const EKSWorkerSecurityGroupName = `${ccfg.cluster_name}-eks-worker-security-group`;

  log.info(`Ensuring ${EKSMasterSecurityGroupName} Security Group exists`);
  const masterSecurityGroup: AWS.EC2.SecurityGroup = yield call(
    ensureSecurityGroupExists,
    {
      VpcId: vpc.VpcId,
      name: ccfg.cluster_name,
      GroupName: EKSMasterSecurityGroupName,
      Description: `Security Group for EKS control plane`
    }
  );

  assert(masterSecurityGroup.GroupId);

  log.info(`Ensuring ${EKSWorkerSecurityGroupName} Security Group exists`);
  const workerSecurityGroup: AWS.EC2.SecurityGroup = yield call(
    ensureSecurityGroupExists,
    {
      VpcId: vpc.VpcId,
      name: ccfg.cluster_name,
      GroupName: EKSWorkerSecurityGroupName,
      Description: `Security Group for EKS worker nodes`
    }
  );

  assert(workerSecurityGroup.GroupId);

  // RDS Security group
  const RDSSecurityGroupName = `${ccfg.cluster_name}-rds-security-group`;
  log.info(`Ensuring ${RDSSecurityGroupName} Security Group exists`);
  const rdsSecurityGroup: AWS.EC2.SecurityGroup = yield call(
    ensureSecurityGroupExists,
    {
      VpcId: vpc.VpcId,
      name: ccfg.cluster_name,
      GroupName: RDSSecurityGroupName,
      Description: `Security Group for RDS`
    }
  );

  // Add ingress rules
  let ingressRules: AWS.EC2.AuthorizeSecurityGroupIngressRequest[] = [
    {
      GroupId: rdsSecurityGroup.GroupId,
      IpPermissions: [
        {
          FromPort: 0,
          ToPort: 5432,
          IpProtocol: "-1",
          UserIdGroupPairs: [
            {
              GroupId: workerSecurityGroup.GroupId,
              VpcId: vpc.VpcId
            }
          ]
        }
      ]
    },
    {
      GroupId: masterSecurityGroup.GroupId,
      IpPermissions: [
        {
          FromPort: 443,
          ToPort: 443,
          IpProtocol: "tcp",
          UserIdGroupPairs: [
            {
              GroupId: workerSecurityGroup.GroupId,
              VpcId: vpc.VpcId
            }
          ]
        }
      ]
    },
    {
      GroupId: workerSecurityGroup.GroupId,
      IpPermissions: [
        {
          FromPort: 0,
          ToPort: 65535,
          IpProtocol: "-1",
          UserIdGroupPairs: [
            {
              GroupId: workerSecurityGroup.GroupId,
              VpcId: vpc.VpcId
            }
          ]
        },
        {
          FromPort: 1025,
          ToPort: 65535,
          IpProtocol: "tcp",
          UserIdGroupPairs: [
            {
              GroupId: masterSecurityGroup.GroupId,
              VpcId: vpc.VpcId
            }
          ]
        },
        {
          FromPort: 443,
          ToPort: 443,
          IpProtocol: "tcp",
          UserIdGroupPairs: [
            {
              GroupId: masterSecurityGroup.GroupId,
              VpcId: vpc.VpcId
            }
          ]
        }
      ]
    }
  ];

  // Add any user defined masterAuthorizedNetworks for connecting to the EKS API
  const { masterAuthorizedNetworks } = awsConfig;
  ingressRules = ingressRules.concat(
    masterAuthorizedNetworks.map(CidrIp => ({
      GroupId: masterSecurityGroup.GroupId,
      IpPermissions: [
        {
          FromPort: 443,
          ToPort: 443,
          IpProtocol: "tcp",
          IpRanges: [
            {
              CidrIp
            }
          ]
        }
      ]
    }))
  );

  log.info(`Ensuring ${ingressRules.length} Ingress Rules exist`);
  for (let i = 0; i < ingressRules.length; i++) {
    yield call(authorizeSecurityGroupIngress, {
      Rule: ingressRules[i]
    });
  }

  // Add egress rules
  const egressRules: AWS.EC2.AuthorizeSecurityGroupEgressRequest[] = [
    {
      GroupId: masterSecurityGroup.GroupId,
      IpPermissions: [
        {
          FromPort: 0,
          ToPort: 0,
          IpProtocol: "-1",
          IpRanges: [
            {
              CidrIp: "0.0.0.0/0"
            }
          ]
        }
      ]
    },
    {
      GroupId: workerSecurityGroup.GroupId,
      IpPermissions: [
        {
          FromPort: 0,
          ToPort: 0,
          IpProtocol: "-1",
          IpRanges: [
            {
              CidrIp: "0.0.0.0/0"
            }
          ]
        }
      ]
    }
  ];

  log.info(`Ensuring ${egressRules.length} Egress Rules exist`);
  for (let i = 0; i < egressRules.length; i++) {
    yield call(authorizeSecurityGroupEgress, {
      Rule: egressRules[i]
    });
  }

  const { endpointPrivateAccess, endpointPublicAccess, k8sVersion } = awsConfig;

  const clusterLabels = {
    opstrace_cluster_name: ccfg.cluster_name
  };

  const clusterLabelList = entries(clusterLabels).reduce<TagList>(
    (acc, curr) => {
      acc.push({
        Key: curr[0],
        Value: curr[1]
      });
      return acc;
    },
    []
  );
  // Run the following in parallel
  const [cluster, dbCluster]: [AWS.EKS.Cluster, AWS.RDS.DBCluster] = yield all([
    call(ensureEKSExists, {
      subnets,
      opstraceClusterName: ccfg.cluster_name,
      endpointPrivateAccess,
      endpointPublicAccess,
      k8sVersion,
      clusterLabels,
      roleArn: eksClusterRole.Arn!,
      securityGroupId: masterSecurityGroup.GroupId
    }),
    call(ensureRDSExists, {
      name: ccfg.cluster_name,
      labels: clusterLabelList,
      subnetGroupName: rdsSubnetGroup.DBSubnetGroupName!,
      securityGroupId: rdsSecurityGroup.GroupId!
    })
  ]);

  log.info(`Generating kubeConfig`);
  const kubeconfigString: string = generateKubeconfigStringForEksCluster(
    awsConfig.region,
    cluster
  );

  const kubeConfig = getKubeConfig({
    loadFromCluster: false,
    kubeconfig: kubeconfigString
  });

  const awsAuthConfigMap = new ConfigMap(
    {
      apiVersion: "v1",
      kind: "ConfigMap",
      metadata: {
        name: "aws-auth",
        namespace: "kube-system"
      },
      data: {
        mapRoles: mapRolesYamlString
      }
    },
    kubeConfig
  );

  yield call(createOrUpdateCM, awsAuthConfigMap);

  const instanceProfileName = yield call(
    createInstanceProfile,
    ccfg.cluster_name
  );

  log.info(
    `Ensuring InstanceProfile has ${EKSWorkerNodesRoleName} role attached`
  );

  yield call(addRole, {
    InstanceProfileName: instanceProfileName,
    RoleName: EKSWorkerNodesRoleName
  });

  // Launch Configuration
  const { imageId, instanceType } = awsConfig;
  const LaunchConfigurationName = `${ccfg.cluster_name}-primary-launch-configuration`;
  yield call(ensureLaunchConfigurationExists, {
    name: ccfg.cluster_name,
    cluster,
    LaunchConfigurationName,
    IamInstanceProfile: instanceProfileName,
    securityGroupId: workerSecurityGroup.GroupId,
    imageId,
    instanceType
  });

  yield call(ensureAutoScalingGroupExists, {
    opstraceClusterName: ccfg.cluster_name,
    subnets,
    zone: awsConfig.zone,
    maxSize: ccfg.node_count,
    minSize: ccfg.node_count,
    desiredCapacity: ccfg.node_count,
    launchConfigurationName: LaunchConfigurationName
  });

  if (!dbCluster.Endpoint) {
    throw Error("RDS Aurora cluster did not return an Endpoint");
  }

  return {
    kubeconfigString,
    // To be used when pushing the controller config to the cluster
    certManagerRoleArn: certManagerRole.Arn,
    // We've hardcoded the password here for now (and in the @opstrace/config package) to keep the installer
    // idempodent. We could generate this during install and then save the value in a secret, but it
    // would certainly add more complexity to maintain an idempodent install and also introduce a critical
    // failure zone between successful RDS creation and writing the password secret to the cluster.
    // If a failure occured in between those two steps, we would likely not be able to recover without
    // additional steps to reset the password on the postgres instance.
    // The Postgres endpoint is attached to it's own private subnet which is only accessible from within the cluster's VPC.
    // Their is no public endpoint for the RDS instance.
    postgreSQLEndpoint: `postgres://opstrace:2020WasQuiteTheYear@${dbCluster.Endpoint}/`,
    opstraceDBName: "opstrace"
  };
}

function genMapRolesYamlString(
  workerNodeRoleArn: string,
  awsAccountID: string,
  userGivenAdminRoleNames: string[]
): string {
  const mapRolesItems = [
    {
      rolearn: workerNodeRoleArn,
      username: "system:node:{{EC2PrivateDNSName}}",
      groups: ["system:bootstrappers", "system:nodes"]
    }
  ];

  for (const rname of userGivenAdminRoleNames) {
    log.info(
      "EKS aws-auth config map: generate custom mapRoles entry for IAM role: %s",
      rname
    );
    mapRolesItems.push({
      rolearn: `arn:aws:iam::${awsAccountID}:role/${rname}`,
      username: "cluster-admin",
      groups: ["system:masters"]
    });
  }

  // // This needs to be a valid YAML document.
  // const mapRolesYamlString =
  //   dedent(`
  //   - rolearn: ${workerNodeRoleArn}
  //     username: system:node:{{EC2PrivateDNSName}}
  //     groups:
  //       - system:bootstrappers
  //       - system:nodes
  //   - rolearn: arn:aws:iam::${awsAccountID}:role/${awsIamRoleName}
  //     username: cluster-admin
  //     groups:
  //       - system:masters
  // `).trim() + "\n";

  const yopts: yaml.DumpOptions = { indent: 2 };
  const mapRolesYamlString = yaml.safeDump(mapRolesItems, yopts);
  log.debug(
    "EKS aws-auth config map, mapRoles key, parsed from YAML: %s",
    mapRolesYamlString
  );

  // This is a developer safety net to confirm that the above's string is a
  // valid YAML doc. Let this crash if it isn't. Better than having AWS/EKS not
  // discovering the nodes (which seems to be the primary outfall when this
  // YAML document is bad). Notably, `yaml.safeLoad()` does not seem to error
  // out when a trailing newline is missing. Strictly, though, a valid YAML
  // document requires a trailing newline character. Also see
  // https://github.com/opstrace/opstrace/pull/112#issuecomment-739836920
  assert(mapRolesYamlString.endsWith("\n"));
  const mapRolesParsed = yaml.safeLoad(mapRolesYamlString);
  log.info(
    "EKS aws-auth config map: mapRoles key, parsed from YAML: %s",
    JSON.stringify(mapRolesParsed, null, 2)
  );
  return mapRolesYamlString;
}

/**
 * Workaround to handle slow Route53 DNS setup. Wait until the data api
 * endpoints are listed in the hosted zone records.
 */
export async function waitUntilRoute53EntriesAreAvailable(
  clusterName: string,
  tenantNames: string[]
): Promise<void> {
  const clusterDNSName = `${clusterName}.opstrace.io.`;

  // system tenant is there by default, check corresponding endpoints, too
  const tnames = [...tenantNames];
  tnames.push("system");

  while (true) {
    log.info(
      "waiting for Route53 hosted zone '%s' to be set up",
      clusterDNSName
    );
    const zone = await getZoneForDNSName(clusterDNSName);

    if (!zone) {
      log.info(
        "route53: hosted zone %s not found, retrying later...",
        clusterDNSName
      );
      await sleep(30.0);
      continue; // retry
    }

    log.debug("route53: found hosted zone %s", zone.Id);

    let letsencryptChallengeDone = true;
    const recordsets = await getRecordsForZone(zone);

    if (recordsets === undefined || recordsets.length == 0) {
      log.info(
        "no records found in hosted zone %s, retrying later...",
        clusterDNSName
      );
      await sleep(30.0);
    }

    // generate the list of domains to check
    const probeDomains = new Map();
    for (const tname of tnames) {
      const tenantDomain = `${tname}.${clusterDNSName}`;

      probeDomains.set(`cortex.${tenantDomain}`, false);
      probeDomains.set(`loki.${tenantDomain}`, false);
    }

    // Based on
    // https://letsencrypt.org/2019/10/09/onboarding-your-customers-with-lets-encrypt-and-acme.html
    //
    // Iterate over the list of records and if we have a TXT entry with
    // _acme-challenge then Let's Encrypt DNS validation is ongoing and we
    // should retry later. This is a precautionary measure to ensure we
    // don't trigger DNS host not found errors later when validating
    // the data api endpoints.
    //
    // Check if the required domains are created.
    //
    for (const r of recordsets) {
      log.debug("record name=%s type=%s", r.Name, r.Type);
      if (r.Type == "TXT" && r.Name.startsWith("_acme-challenge")) {
        letsencryptChallengeDone = false;
      }

      for (const domainName of probeDomains.keys()) {
        if (r.Type == "A" && r.Name == domainName) {
          log.debug("domain %s is set", domainName);
          probeDomains.set(domainName, true);
        }
      }
    }

    if (!letsencryptChallengeDone) {
      log.debug(
        "lets encrypt DNS validation challenge in progress, retrying later..."
      );
      await sleep(30.0);
      continue; // retry
    }

    // check if all entries were found
    const allEntriesFound = Array.from(probeDomains.entries()).reduce(
      (acc, entry) => {
        if (!entry[1]) {
          log.debug(
            "domain %s not found in hosted zone, retrying later...",
            entry[0]
          );
        }
        return acc && entry[1];
      }
    );

    if (allEntriesFound) {
      log.info("hosted zone %s is ready", clusterDNSName);
      break;
    }

    // sleep before retrying
    await sleep(30.0);
  }
}
