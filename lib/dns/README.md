# Manages DNS across aws and gcp

Opstrace owns the root domain opstrace.net (prod) or opstrace.io (dev). These domains are hosted in our GCP production and development accounts respectively.

When a new organization signs up, we (currently manually) create a hosted zone for (`<org>.opstrace.net`) in the organizations cloud account and then we add the NS records to our Opstrace zone (`opstrace.net`) to point to the orgs subdomain.

When a new stack is created in the organization, we automatically create another subzone (`<stack>.<org>.opstrace.net`) to resolve DNS specifically for this stack.

ExternalDns runs inside each stack to manage dns for ingresses relating to it's stack. ExternalDns uses the `<stack>.<org>.opstrace.net` zone that was automatically created when installing a stack.

## Future

* Automate the organizations sub zone creation, however this requires a secure way of managing dns records across the customers environment and the Opstrace production account.
* Consider moving the Opstrace root zones to Cloudflare. Not sure how much I trust GCP to handle this centralized part of our infrastructure.
