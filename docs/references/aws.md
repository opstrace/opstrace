# AWS account configuration

## Required permissions

Generally speaking, we subscribe to the [principle of least privilege](https://en.wikipedia.org/wiki/Principle_of_least_privilege).
However, since it is common for many developers to have the [AWS managed policy](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html#aws-managed-policies) `AdministratorAccess`, we recommend this as the easiest way to get started on AWS.

If you can't get this access or do not want to use it, you will need to build a [customer managed policy](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html#customer-managed-policies).
This policy can be created by combining `PowerUserAccess` plus `IAMFullAccess`.
This is because we use an EKS cluster to manage Opstrace under the hood, and we create a custom role for just that purpose (rather than relying on an existing role you may have).
In this way, Opstrace remains a black-box appliance; i.e. someday we may move away from EKS.
