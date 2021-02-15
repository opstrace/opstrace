# AWS account configuration

## Required permissions

Generally speaking, we subscribe to the [principle of least privilege](https://en.wikipedia.org/wiki/Principle_of_least_privilege).
However, since it is common for many developers to have the [AWS managed policy](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html#aws-managed-policies) `AdministratorAccess`, we recommend this as the easiest way to get started on AWS.

If you can't get this access or do not want to use it, you will need to build a [customer managed policy](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html#customer-managed-policies) and [add a user](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html).
These are the required permissions for the policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "autoscaling:CreateAutoScalingGroup",
                "autoscaling:DeleteAutoScalingGroup",
                "autoscaling:CreateLaunchConfiguration",
                "autoscaling:DeleteLaunchConfiguration",
                "autoscaling:DescribeLaunchConfigurations",
                "autoscaling:DescribeAutoScalingGroups",
                "autoscaling:DescribeScalingActivities",
                "ec2:AllocateAddress",
                "ec2:AssociateRouteTable",
                "ec2:AttachInternetGateway",
                "ec2:AuthorizeSecurityGroupEgress",
                "ec2:AuthorizeSecurityGroupIngress",
                "ec2:CreateInternetGateway",
                "ec2:CreateNatGateway",
                "ec2:CreateRoute",
                "ec2:CreateRouteTable",
                "ec2:CreateSecurityGroup",
                "ec2:CreateSubnet",
                "ec2:CreateTags",
                "ec2:CreateVpc",
                "ec2:CreateVpcEndpoint",
                "ec2:DescribeVpcs",
                "ec2:DescribeVpcAttribute",
                "ec2:DescribeVpcEndpoints",
                "ec2:DeleteInternetGateway",
                "ec2:DeleteNatGateway",
                "ec2:DeleteRouteTable",
                "ec2:DeleteSecurityGroup",
                "ec2:DeleteSubnet",
                "ec2:DeleteVpc",
                "ec2:DeleteVpcEndpoints",
                "ec2:DescribeSubnets",
                "ec2:DescribeInternetGateways",
                "ec2:DescribeAddresses",
                "ec2:DescribeNatGateways",
                "ec2:DetachInternetGateway",
                "ec2:DescribeRouteTables",
                "ec2:DisassociateRouteTable",
                "ec2:ModifyVpcAttribute",
                "ec2:ReleaseAddress",
                "ec2:RevokeSecurityGroupEgress",
                "ec2:RevokeSecurityGroupIngress",
                "ec2:DescribeSecurityGroups",
                "eks:CreateCluster",
                "eks:DeleteCluster",
                "eks:DescribeCluster",
                "eks:TagResource",
                "eks:ListClusters",
                "iam:AddRoleToInstanceProfile",
                "iam:AttachRolePolicy",
                "iam:CreateInstanceProfile",
                "iam:CreatePolicy",
                "iam:CreateRole",
                "iam:DeleteInstanceProfile",
                "iam:DeletePolicy",
                "iam:DeleteRole",
                "iam:DetachRolePolicy",
                "iam:RemoveRoleFromInstanceProfile",
                "iam:ListPolicies",
                "iam:ListRoles",
                "iam:PassRole",
                "iam:GetInstanceProfile",
                "rds:CreateDBCluster",
                "rds:CreateDBInstance",
                "rds:CreateDBSubnetGroup",
                "rds:DeleteDBCluster",
                "rds:DeleteDBInstance",
                "rds:DeleteDBSubnetGroup",
                "rds:AddTagsToResource",
                "rds:DescribeDBSubnetGroups",
                "rds:DescribeDBClusters",
                "rds:DescribeDBInstances",
                "route53:CreateHostedZone",
                "route53:ChangeResourceRecordSets",
                "route53:ListResourceRecordSets",
                "route53:DeleteHostedZone",
                "route53:GetChange",
                "route53:ListHostedZones",
                "route53:ListHostedZonesByName",
                "s3:CreateBucket",
                "s3:GetLifecycleConfiguration",
                "s3:PutLifecycleConfiguration",
                "s3:ListBucket",
                "sts:GetCallerIdentity",
                "sts:GetSessionToken",
                "elasticloadbalancing:DescribeLoadBalancers",
                "elasticloadbalancing:DeleteLoadBalancer"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": "iam:CreateServiceLinkedRole",
            "Resource": "*",
            "Condition": {
                "StringEquals": {
                    "iam:AWSServiceName": [
                        "autoscaling.amazonaws.com",
                        "eks.amazonaws.com",
                        "elasticloadbalancing.amazonaws.com"
                    ]
                }
            }
        }
    ]
}
```
