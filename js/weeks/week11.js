/* Week 11 · Role-critical: governance and security in Claude Code, AZ-104 Azure DNS and load balancing,
   Azure Key Vault (secrets, keys, certificates, rotation, managed identities), and the W11 SLO that EV-RE-05 checks.
   Structure follows week01.js. Run `node tests/validate.js --week 11 --allow-missing` after editing. */
(function () {
  'use strict';
  const PL = window.PL;
  const { ADAPTIVE, user, L, obj, arr, en, S, N, B, I, jsonFormat, textTurn, jsonTurn, think } = PL.B;

  const SRC = {
    ccPerms: { label: 'Claude Code docs · Configure permissions', url: 'https://code.claude.com/docs/en/permissions' },
    ccSettings: { label: 'Claude Code docs · Settings files and precedence', url: 'https://code.claude.com/docs/en/settings' },
    ccManaged: { label: 'Claude Code docs · Deploy managed settings', url: 'https://code.claude.com/docs/en/managed-settings' },
    ccSecurity: { label: 'Claude Code docs · Security', url: 'https://code.claude.com/docs/en/security' },
    az104: { label: 'Microsoft Learn · AZ-104 study guide (skills measured)', url: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104' },
    dns: { label: 'Microsoft Learn · What is Azure DNS?', url: 'https://learn.microsoft.com/en-us/azure/dns/dns-overview' },
    privDns: { label: 'Microsoft Learn · What is Azure Private DNS?', url: 'https://learn.microsoft.com/en-us/azure/dns/private-dns-overview' },
    dnsCli: { label: 'Azure CLI · az network dns record-set a', url: 'https://learn.microsoft.com/en-us/cli/azure/network/dns/record-set/a' },
    lb: { label: 'Microsoft Learn · What is Azure Load Balancer?', url: 'https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-overview' },
    lbComponents: { label: 'Microsoft Learn · Azure Load Balancer components', url: 'https://learn.microsoft.com/en-us/azure/load-balancer/components' },
    lbProbe: { label: 'Microsoft Learn · Load Balancer health probes', url: 'https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview' },
    lbPublicCli: { label: 'Microsoft Learn · Quickstart: public load balancer (Azure CLI)', url: 'https://learn.microsoft.com/en-us/azure/load-balancer/quickstart-load-balancer-standard-public-cli' },
    lbInternalCli: { label: 'Microsoft Learn · Quickstart: internal load balancer (Azure CLI)', url: 'https://learn.microsoft.com/en-us/azure/load-balancer/quickstart-load-balancer-standard-internal-cli' },
    lbTrouble: { label: 'Microsoft Learn · Troubleshoot health probe status', url: 'https://learn.microsoft.com/en-us/troubleshoot/azure/load-balancer/load-balancer-troubleshoot-health-probe-status' },
    lbCli: { label: 'Azure CLI · az network lb', url: 'https://learn.microsoft.com/en-us/cli/azure/network/lb' },
    kv: { label: 'Microsoft Learn · Azure Key Vault overview', url: 'https://learn.microsoft.com/en-us/azure/key-vault/general/overview' },
    kvRbac: { label: 'Microsoft Learn · Key Vault access with Azure RBAC', url: 'https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide' },
    kvSoftDelete: { label: 'Microsoft Learn · Key Vault soft-delete', url: 'https://learn.microsoft.com/en-us/azure/key-vault/general/soft-delete-overview' },
    kvRotation: { label: 'Microsoft Learn · Automate secret rotation (single credential)', url: 'https://learn.microsoft.com/en-us/azure/key-vault/secrets/tutorial-rotation' },
    kvRotationDual: { label: 'Microsoft Learn · Automate rotation for resources with two credentials', url: 'https://learn.microsoft.com/en-us/azure/key-vault/secrets/tutorial-rotation-dual' },
    kvKeyRotation: { label: 'Microsoft Learn · Configure key auto-rotation', url: 'https://learn.microsoft.com/en-us/azure/key-vault/keys/how-to-configure-key-rotation' },
    kvCertRenew: { label: 'Microsoft Learn · Renew Key Vault certificates', url: 'https://learn.microsoft.com/en-us/azure/key-vault/certificates/overview-renew-certificate' },
    kvRef: { label: 'Microsoft Learn · Key Vault references in App Service', url: 'https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references' },
    mi: { label: 'Microsoft Learn · Managed identities for Azure resources', url: 'https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview' },
    sloBook: { label: 'Google SRE Book · Service Level Objectives', url: 'https://sre.google/sre-book/service-level-objectives/' },
    sloWorkbook: { label: 'Google SRE Workbook · Implementing SLOs', url: 'https://sre.google/workbook/implementing-slos/' },
    sloAlerting: { label: 'Google SRE Workbook · Alerting on SLOs', url: 'https://sre.google/workbook/alerting-on-slos/' },
    promRules: { label: 'Prometheus docs · Recording rules', url: 'https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/' },
    grafanaJson: { label: 'Grafana docs · Dashboard JSON model', url: 'https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/view-dashboard-json-model/' },
    grafanaDash: { label: 'Grafana docs · Dashboards', url: 'https://grafana.com/docs/grafana/latest/dashboards/' },
  };

  /* ---- lab files ---- */
  PL.PLACEHOLDERS.W11_REPO_TREE = L(
    'Repository: platform-infra (Terraform for the shop platform, run from GitHub Actions and by engineers with Claude Code)',
    '',
    'platform-infra/',
    '├── .env                      # ARM_CLIENT_SECRET and other local creds (gitignored)',
    '├── .env.example',
    '├── secrets/',
    '│   ├── sp-terraform.json     # service principal credentials (gitignored)',
    '│   └── pve-api-token.txt     # Proxmox API token (gitignored)',
    '├── infra/',
    '│   ├── main.tf',
    '│   ├── network.tf',
    '│   ├── prod.tfvars',
    '│   └── modules/',
    '├── scripts/',
    '│   ├── az-inventory.sh       # read-only az list/show calls',
    '│   └── cleanup-sandbox.sh    # runs az group delete on rg-sandbox-*',
    '└── .github/workflows/terraform.yml',
    '',
    'Commands the team runs daily: terraform fmt -check, terraform validate, terraform plan,',
    'az account show, az group list, az resource list, git status, git diff, git log.',
    'Commands that must never run from Claude Code: terraform destroy, terraform apply -destroy,',
    'az group delete, az keyvault purge, rm -rf.',
    'terraform apply and git push are allowed only after a human approves the prompt.'
  );
  PL.FILE_LABELS.W11_REPO_TREE = 'platform-infra-tree.txt';

  PL.PLACEHOLDERS.W11_LB_STATE = L(
    '$ az network lb show -g rg-shop-prod -n lb-shop-web --query "{sku:sku.name, probes:probes[].{name:name,protocol:protocol,port:port,path:requestPath}, rules:loadBalancingRules[].{name:name,fe:frontendPort,be:backendPort}}"',
    '{ "sku": "Standard",',
    '  "probes": [ { "name": "hp-web", "protocol": "Http", "port": 80, "path": "/healthz" } ],',
    '  "rules":  [ { "name": "rule-http", "fe": 80, "be": 8080 } ] }',
    '',
    '$ az network lb address-pool show -g rg-shop-prod --lb-name lb-shop-web -n bepool-web --query "backendIPConfigurations[].id" -o tsv',
    '/subscriptions/…/networkInterfaces/vm-web-01-nic/ipConfigurations/ipconfig1',
    '',
    '$ az network nsg rule list -g rg-shop-prod --nsg-name nsg-web -o table',
    'Name                 Priority  Access  Direction  SourceAddressPrefix  DestinationPortRange',
    'allow-http-internet  200       Allow   Inbound    Internet             8080',
    'deny-all-custom      100       Deny    Inbound    *                    *',
    '',
    '# On vm-web-01 and vm-web-02',
    '$ sudo ss -tlnp | grep nginx',
    'LISTEN 0 511 0.0.0.0:8080 0.0.0.0:*  users:(("nginx",pid=911))',
    '$ curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/healthz',
    '200',
    '',
    '# Azure Monitor, lb-shop-web, last 1h',
    'Health Probe Status (DipAvailability): 0 %',
    'Data Path Availability (VipAvailability): 100 %',
    '',
    'Symptom: http://shop.contoso.example times out for every user. vm-web-02 was rebuilt yesterday.'
  );
  PL.FILE_LABELS.W11_LB_STATE = 'lb-shop-web-diagnostics.txt';

  /* Fake lab secrets, assembled at runtime so secret scanners do not flag this repository. */
  const FAKE_SQL_PW = ['Lab', 'Pa55', 'w0rd', '7731'].join('-') + '!';
  const FAKE_SA_KEY = ['Q2xh', 'dWRl', 'TGFi', 'RmFr', 'ZUtl'].join('') + 'eU5vdFJlYWw' + '==';
  const FAKE_PGW_KEY = 'pgw' + '_' + 'lab' + '_' + ['4f9a', '2c71', 'be08', 'd3e6'].join('');
  PL.PLACEHOLDERS.W11_APP_CONFIG = L(
    '--- src/Shop.Api/appsettings.Production.json ---',
    '{',
    '  "ConnectionStrings": {',
    '    "OrdersDb": "Server=tcp:sql-shop-prod.database.windows.net,1433;Database=orders;User ID=shopapp;Password=' + FAKE_SQL_PW + ';Encrypt=True;"',
    '  },',
    '  "Storage": {',
    '    "ConnectionString": "DefaultEndpointsProtocol=https;AccountName=stshopprod;AccountKey=' + FAKE_SA_KEY + ';EndpointSuffix=core.windows.net"',
    '  },',
    '  "PaymentGateway": { "BaseUrl": "https://api.paygw.example", "ApiKey": "' + FAKE_PGW_KEY + '" }',
    '}',
    '',
    '--- infra/app.tf ---',
    'resource "azurerm_linux_web_app" "api" {',
    '  name                = "app-shop-api-prod"',
    '  resource_group_name = azurerm_resource_group.shop.name',
    '  location            = "westeurope"',
    '  service_plan_id     = azurerm_service_plan.shop.id',
    '  site_config {}',
    '  app_settings = {',
    '    "PAYMENT_API_KEY" = "' + FAKE_PGW_KEY + '"',
    '  }',
    '}',
    '',
    '--- .github/workflows/deploy.yml (excerpt) ---',
    '      - uses: azure/login@v2',
    '        with:',
    '          creds: ${{ secrets.AZURE_CREDENTIALS }}   # JSON with a client secret for sp-shop-deploy',
    '',
    'Existing resources: Key Vault kv-shop-prod (RBAC mode) in rg-shop-prod; App Service app-shop-api-prod; SQL server sql-shop-prod; storage stshopprod.'
  );
  PL.FILE_LABELS.W11_APP_CONFIG = 'shop-api-config-sample.txt';

  PL.PLACEHOLDERS.W11_JOURNEYS = L(
    'Service: shop (Kubernetes behind ingress-nginx, metrics scraped by Prometheus, dashboards in Grafana)',
    '',
    'Top user journeys (from product analytics, share of revenue):',
    '  1. Checkout: POST /api/checkout            62 % of revenue, users abandon after ~2 s',
    '  2. Browse catalogue: GET /api/products      high traffic, low revenue impact',
    '  3. Login: POST /api/login                   needed before checkout',
    '',
    'Available Prometheus metrics:',
    '  nginx_ingress_controller_requests{ingress="shop", path, method, status}                     counter',
    '  nginx_ingress_controller_request_duration_seconds_bucket{ingress="shop", path, method, le}   histogram',
    '  node_cpu_seconds_total{instance, mode}                                                        counter',
    '  mongodb_up{instance}                                                                          gauge',
    '  kube_pod_container_status_restarts_total{namespace="shop", pod}                              counter',
    '',
    'Last 30 days on /api/checkout: 1.84 M requests, 5xx ratio 0.21 %, p95 latency 640 ms.',
    'Business ask: "Checkout must work." Product owner accepts roughly 3.5 hours of checkout errors per month.'
  );
  PL.FILE_LABELS.W11_JOURNEYS = 'shop-journeys-and-metrics.txt';

  /* ---- sims ---- */
  const SETTINGS_JSON = {
    $schema: 'https://json.schemastore.org/claude-code-settings.json',
    permissions: {
      allow: [
        'Bash(terraform fmt -check *)',
        'Bash(terraform validate)',
        'Bash(terraform plan *)',
        'Bash(az account show *)',
        'Bash(az group list *)',
        'Bash(az resource list *)',
        'Bash(git status)',
        'Bash(git diff *)',
        'Bash(git log *)',
        'Bash(./scripts/az-inventory.sh)',
      ],
      ask: [
        'Bash(terraform apply *)',
        'Bash(git push *)',
      ],
      deny: [
        'Read(./.env)',
        'Read(./.env.*)',
        'Read(!./.env.example)',
        'Read(./secrets/**)',
        'Bash(terraform destroy *)',
        'Bash(terraform apply -destroy *)',
        'Bash(az group delete *)',
        'Bash(az keyvault purge *)',
        'Bash(rm -rf *)',
        'Bash(./scripts/cleanup-sandbox.sh *)',
      ],
      disableBypassPermissionsMode: 'disable',
    },
  };

  const LB_ANSWER = L(
    '## 1. Standard public IP and load balancer',
    '```bash',
    'az network public-ip create --resource-group rg-shop-prod --name pip-lb-shop \\',
    '  --sku Standard --zone 1 2 3',
    '',
    'az network lb create --resource-group rg-shop-prod --name lb-shop-web --sku Standard \\',
    '  --public-ip-address pip-lb-shop --frontend-ip-name fe-web --backend-pool-name bepool-web',
    '```',
    '## 2. Health probe (HTTPS on /healthz)',
    '```bash',
    'az network lb probe create --resource-group rg-shop-prod --lb-name lb-shop-web --name hp-web-https \\',
    '  --protocol Https --port 443 --path /healthz --interval 5',
    '```',
    '## 3. Load-balancing rule',
    '```bash',
    'az network lb rule create --resource-group rg-shop-prod --lb-name lb-shop-web --name rule-https \\',
    '  --protocol Tcp --frontend-port 443 --backend-port 443 \\',
    '  --frontend-ip-name fe-web --backend-pool-name bepool-web --probe-name hp-web-https \\',
    '  --disable-outbound-snat true --enable-tcp-reset true --idle-timeout 4',
    '```',
    '## 4. Add both VMs to the backend pool',
    '```bash',
    'for vm in vm-web-01 vm-web-02; do',
    '  az network nic ip-config address-pool add --resource-group rg-shop-prod \\',
    '    --nic-name ${vm}-nic --ip-config-name ipconfig1 --lb-name lb-shop-web --address-pool bepool-web',
    'done',
    '```',
    '## 5. NSG: Standard LB is closed by default',
    'A Standard load balancer only passes traffic an NSG allows. Allow HTTPS from the internet; probes come from the `AzureLoadBalancer` service tag (168.63.129.16), which the default rule `AllowAzureLoadBalancerInBound` permits as long as no higher-priority rule denies it.',
    '```bash',
    'az network nsg rule create --resource-group rg-shop-prod --nsg-name nsg-web --name allow-https-internet \\',
    '  --priority 200 --direction Inbound --access Allow --protocol Tcp \\',
    '  --source-address-prefixes Internet --destination-port-ranges 443',
    '```',
    '## 6. Public DNS record in the existing zone',
    '```bash',
    'LB_IP=$(az network public-ip show -g rg-shop-prod -n pip-lb-shop --query ipAddress -o tsv)',
    'az network dns record-set a add-record --resource-group rg-dns --zone-name contoso.example \\',
    '  --record-set-name shop --ipv4-address "$LB_IP" --ttl 300',
    '```',
    '## 7. Verify',
    '```bash',
    'az network dns record-set a show -g rg-dns -z contoso.example -n shop -o table',
    'nslookup shop.contoso.example',
    'curl -I https://shop.contoso.example/healthz',
    '```',
    'Then check the **Health Probe Status** metric on lb-shop-web: it should read 100 % for both instances. Basic SKU is retired, so do not use `--sku Basic`.'
  );

  const LB_DIAG = {
    root_cause: 'The health probe checks port 80 while nginx listens on 8080, and a custom NSG deny rule at priority 100 blocks probe traffic from AzureLoadBalancer, so every backend is marked down (DipAvailability 0 %) and the load balancer sends traffic nowhere.',
    findings: [
      { id: 'F1', component: 'health_probe', evidence: 'Probe hp-web uses Http port 80 /healthz; nginx listens on 0.0.0.0:8080 and /healthz returns 200 on 8080.', fix_command: 'az network lb probe update -g rg-shop-prod --lb-name lb-shop-web -n hp-web --protocol Http --port 8080 --path /healthz' },
      { id: 'F2', component: 'nsg', evidence: 'deny-all-custom (priority 100, source *) is evaluated before allow-http-internet (200) and before the default AllowAzureLoadBalancerInBound (65001), so it blocks both user traffic and probes from 168.63.129.16.', fix_command: 'az network nsg rule delete -g rg-shop-prod --nsg-name nsg-web -n deny-all-custom && az network nsg rule create -g rg-shop-prod --nsg-name nsg-web -n allow-azlb-probe --priority 150 --direction Inbound --access Allow --protocol Tcp --source-address-prefixes AzureLoadBalancer --destination-port-ranges 8080' },
      { id: 'F3', component: 'backend_pool', evidence: 'bepool-web contains only vm-web-01-nic; vm-web-02 was rebuilt and its NIC was not re-added.', fix_command: 'az network nic ip-config address-pool add -g rg-shop-prod --nic-name vm-web-02-nic --ip-config-name ipconfig1 --lb-name lb-shop-web --address-pool bepool-web' },
    ],
    verify_steps: [
      'Watch the Health Probe Status (DipAvailability) metric on lb-shop-web return to 100 % for both backend instances.',
      'az network lb address-pool show -g rg-shop-prod --lb-name lb-shop-web -n bepool-web --query "backendIPConfigurations[].id" lists both NICs.',
      'az network nic list-effective-nsg -g rg-shop-prod -n vm-web-01-nic shows no deny ahead of the allow rules.',
      'curl -I http://shop.contoso.example from outside Azure returns 200.',
    ],
  };

  const KV_PLAN = {
    findings: [
      { file: 'src/Shop.Api/appsettings.Production.json', location: 'ConnectionStrings.OrdersDb', secret_type: 'sql_password', risk: 'SQL password for shopapp in plain text in the repo; anyone with read access can reach the orders database.', remediation: 'replace_with_managed_identity' },
      { file: 'src/Shop.Api/appsettings.Production.json', location: 'Storage.ConnectionString', secret_type: 'storage_account_key', risk: 'Storage account key grants full data-plane access to stshopprod.', remediation: 'replace_with_managed_identity' },
      { file: 'src/Shop.Api/appsettings.Production.json', location: 'PaymentGateway.ApiKey', secret_type: 'api_key', risk: 'Third-party payment API key in source control.', remediation: 'move_to_key_vault' },
      { file: 'infra/app.tf', location: 'azurerm_linux_web_app.api app_settings.PAYMENT_API_KEY', secret_type: 'api_key', risk: 'Same payment key hard-coded in Terraform, so it also lands in state and plan output.', remediation: 'move_to_key_vault' },
      { file: '.github/workflows/deploy.yml', location: 'azure/login creds: secrets.AZURE_CREDENTIALS', secret_type: 'service_principal_secret', risk: 'Long-lived client secret for sp-shop-deploy stored as a GitHub secret.', remediation: 'use_oidc_federation' },
    ],
    managed_identity: {
      type: 'system_assigned',
      grants: [
        'Key Vault Secrets User on kv-shop-prod for app-shop-api-prod',
        'Storage Blob Data Contributor on stshopprod for app-shop-api-prod',
        'Entra ID database user for app-shop-api-prod in the orders database (db_datareader, db_datawriter)',
      ],
    },
    key_vault: { name: 'kv-shop-prod', rbac_role_for_app: 'Key Vault Secrets User', soft_delete_and_purge_protection: true },
    app_reference_format: '@Microsoft.KeyVault(VaultName=kv-shop-prod;SecretName=payment-api-key)',
    rotation_steps: [
      { order: 1, secret: 'app identity', action: 'Enable the system-assigned managed identity on app-shop-api-prod and grant the roles above.', command: 'az webapp identity assign -g rg-shop-prod -n app-shop-api-prod' },
      { order: 2, secret: 'payment-api-key', action: 'Issue a new key at the payment provider (keep the old one active), store it as a new secret version in Key Vault.', command: 'az keyvault secret set --vault-name kv-shop-prod --name payment-api-key --file new-key.txt' },
      { order: 3, secret: 'payment-api-key', action: 'Replace the literal in app.tf and appsettings with the Key Vault reference, deploy, and confirm the app resolves it.', command: 'az webapp config appsettings set -g rg-shop-prod -n app-shop-api-prod --settings "PAYMENT_API_KEY=@Microsoft.KeyVault(VaultName=kv-shop-prod;SecretName=payment-api-key)"' },
      { order: 4, secret: 'OrdersDb', action: 'Switch the connection string to Authentication=Active Directory Managed Identity, deploy, then disable the SQL login shopapp.', command: 'ALTER LOGIN shopapp DISABLE;' },
      { order: 5, secret: 'stshopprod keys', action: 'Switch the app to DefaultAzureCredential, then rotate both keys because they were exposed: key2 first, then key1.', command: 'az storage account keys renew -g rg-shop-prod -n stshopprod --key secondary && az storage account keys renew -g rg-shop-prod -n stshopprod --key primary' },
      { order: 6, secret: 'sp-shop-deploy', action: 'Add a federated credential for the GitHub repo, change the workflow to OIDC (client-id, tenant-id, subscription-id), then delete the client secret.', command: 'az ad app federated-credential create --id <app-id> --parameters federated.json' },
      { order: 7, secret: 'payment-api-key', action: 'Revoke the old payment key at the provider once the new version is confirmed in production.', command: 'provider console: revoke previous key' },
    ],
    verification: [
      'Run a secret scanner (for example gitleaks) over the working tree and the full git history; the only hits allowed are revoked values.',
      'grep the repo for AccountKey=, Password= and the payment key prefix: no matches.',
      'App Service configuration shows the Key Vault reference status as resolved.',
      'Old payment key, old storage keys and the SQL login no longer authenticate.',
      'terraform plan shows no secret literal in app_settings.',
    ],
  };

  const SLO_DEF = {
    service: 'shop',
    user_journey: 'Checkout: POST /api/checkout (62 % of revenue)',
    sli: {
      kind: 'availability',
      good_events_promql: 'sum(rate(nginx_ingress_controller_requests{ingress="shop",path="/api/checkout",status!~"5.."}[5m]))',
      total_events_promql: 'sum(rate(nginx_ingress_controller_requests{ingress="shop",path="/api/checkout"}[5m]))',
      description: 'Share of checkout requests that did not fail with a server error, measured at the ingress, which is the closest point to the user we control.',
    },
    objective: 0.995,
    window_days: 30,
    error_budget_minutes: 216,
    recording_rules: [
      { record: 'shop:checkout_requests:rate5m', expr: 'sum(rate(nginx_ingress_controller_requests{ingress="shop",path="/api/checkout"}[5m]))' },
      { record: 'shop:checkout_requests_errors:rate5m', expr: 'sum(rate(nginx_ingress_controller_requests{ingress="shop",path="/api/checkout",status=~"5.."}[5m]))' },
      { record: 'shop:checkout_error_ratio:rate1h', expr: 'sum(rate(nginx_ingress_controller_requests{ingress="shop",path="/api/checkout",status=~"5.."}[1h])) / sum(rate(nginx_ingress_controller_requests{ingress="shop",path="/api/checkout"}[1h]))' },
    ],
    burn_rate_alerts: [
      { long_window: '1h', short_window: '5m', burn_rate: 14.4, severity: 'page' },
      { long_window: '6h', short_window: '30m', burn_rate: 6, severity: 'page' },
      { long_window: '3d', short_window: '6h', burn_rate: 1, severity: 'ticket' },
    ],
    dashboard_panels: [
      { title: 'Checkout availability (30d)', type: 'stat', promql: '1 - (sum(increase(nginx_ingress_controller_requests{ingress="shop",path="/api/checkout",status=~"5.."}[30d])) / sum(increase(nginx_ingress_controller_requests{ingress="shop",path="/api/checkout"}[30d])))' },
      { title: 'Error budget remaining (30d)', type: 'gauge', promql: '1 - ((sum(increase(nginx_ingress_controller_requests{ingress="shop",path="/api/checkout",status=~"5.."}[30d])) / sum(increase(nginx_ingress_controller_requests{ingress="shop",path="/api/checkout"}[30d]))) / (1 - 0.995))' },
      { title: 'Burn rate (1h)', type: 'timeseries', promql: 'shop:checkout_error_ratio:rate1h / (1 - 0.995)' },
      { title: 'Checkout p95 latency (context)', type: 'timeseries', promql: 'histogram_quantile(0.95, sum by (le) (rate(nginx_ingress_controller_request_duration_seconds_bucket{ingress="shop",path="/api/checkout"}[5m])))' },
    ],
  };

  /* =====================================================================
     Topic 1 — Governance and security in Claude Code
     ===================================================================== */
  const t1 = {
    id: 'w11-t1',
    title: 'Governance and security in Claude Code',
    programmeItem: 'Applying Governance and Security in Claude Code (free equivalent: Claude Code docs, Permissions, Managed settings and Security)',
    blurb: 'Decide what Claude Code may read and run in your infrastructure repos. Write it down as permission rules in settings files, and let managed settings enforce the organisation\'s policy.',
    outcomes: [
      'Write allow, ask and deny rules with the correct syntax for Bash, Read and Edit',
      'Choose the right settings scope: user, project, local or managed',
      'Know the limits of rules and when to add sandboxing or least-privilege cloud identities',
    ],
    concepts: [
      { t: 'Allow, ask, deny', d: 'Permission rules live under permissions in a settings file. Deny is checked first, then ask, then allow, and the first match wins. An allow rule can never carve an exception out of a deny.', ex: '"deny": ["Bash(terraform destroy *)"]' },
      { t: 'Rule syntax', d: 'A rule is Tool or Tool(specifier). For Bash, a trailing " *" matches the command with any arguments (":*" is the same). Read and Edit rules use gitignore-style paths: ./ is relative to the project, ~/ is your home, // is the filesystem root.', ex: 'Read(./.env) · Read(./secrets/**) · Bash(git log *)' },
      { t: 'Permission modes', d: 'default (Manual) asks on first use, acceptEdits auto-accepts file edits, plan explores without editing, auto uses a classifier, dontAsk denies anything not pre-approved, and bypassPermissions skips prompts. Use bypassPermissions only in isolated containers or VMs.', ex: '"defaultMode": "plan"' },
      { t: 'Settings scopes', d: 'Managed settings beat command-line flags, which beat .claude/settings.local.json, which beats the shared .claude/settings.json, which beats ~/.claude/settings.json. Commit the shared project file so the whole team gets the same guardrails.', ex: '.claude/settings.json in the repo' },
      { t: 'Managed settings', d: 'Admins deploy managed-settings.json (Windows: C:\\Program Files\\ClaudeCode\\, Linux/WSL: /etc/claude-code/, macOS: /Library/Application Support/ClaudeCode/), MDM policy or server-managed settings. Users and projects cannot override them. Keys like disableBypassPermissionsMode and allowManagedPermissionRulesOnly lock things down.', ex: '"disableBypassPermissionsMode": "disable"' },
      { t: 'Rules are not a sandbox', d: 'A Bash rule matches the command as written. /bin/rm or sh -c "…" can slip past it, and a Read deny does not stop a script that opens the file itself. For hard limits, add sandboxing and give Claude a cloud identity that cannot destroy anything anyway.', ex: 'Reader role on prod + deny rules + sandbox' },
    ],
    leverage: [
      { t: 'Guardrails in the repo', d: 'Ship a .claude/settings.json with every IaC repo: read-only commands allowed, apply and push on ask, destroy, delete and secrets denied. New joiners get safe defaults on day one.' },
      { t: 'Let Claude draft the policy', d: 'Give Claude your repo tree and the commands the team actually uses, and have it draft the rules. Then test each deny by asking Claude Code to do the forbidden thing.' },
      { t: 'Org-wide baseline', d: 'Work with your admin on a managed-settings.json that blocks bypass mode and denies reads of credential files across every project, then check /status on a developer machine to confirm it applies.' },
      { t: 'Defence in depth', d: 'Pair permission rules with a least-privilege Azure identity for Claude Code sessions (for example Reader plus a narrow custom role), so a rule gap cannot become an outage.' },
    ],
    sources: [SRC.ccPerms, SRC.ccSettings, SRC.ccManaged, SRC.ccSecurity],
    quiz: [
      { q: 'Your settings allow "Bash(az *)" and deny "Bash(az group delete *)". What happens when Claude runs az group delete -n rg-x?', options: ['It runs, because the allow rule matches too', 'It is blocked, because deny rules are checked first', 'Claude Code asks you'], a: 1, why: 'Rules are evaluated deny, then ask, then allow. The first match wins, and an allow cannot override a deny.' },
      { q: 'Where does a policy go that no developer or project can override?', options: ['~/.claude/settings.json', '.claude/settings.local.json', 'Managed settings (managed-settings.json, MDM or server-managed)'], a: 2, why: 'Managed settings sit above every other scope.' },
      { q: 'Why is a deny rule on Bash(rm *) not a complete security boundary?', options: ['It only works on macOS', 'It matches the command as written, so forms like /bin/rm or sh -c can bypass it', 'Deny rules are ignored in Manual mode'], a: 1, why: 'The docs say Bash rules match the command text, so pair them with sandboxing and least privilege for hard limits.' },
    ],
    steps: [
      {
        id: 'w11-t1-s1', kind: 'guide', title: 'Write and test project guardrails in Claude Code', minutes: 30, source: SRC.ccPerms,
        scenario: 'Add a committed <code>.claude/settings.json</code> to one of your IaC repos (or a copy of one), then prove each deny rule works.',
        task: [
          'Open Claude Code in a <b>copy</b> of an infrastructure repo and run prompt 1. Review the proposed file before accepting it.',
          'Restart the session (or check <code>/permissions</code>) so the rules load, then run prompt 2. Each forbidden action should be refused.',
          'Run prompt 3 to have Claude explain the gaps, then commit the file with a short README note.',
        ],
        prompts: [
          { label: 'Draft the project settings', where: 'Claude Code', text: 'Create .claude/settings.json for this repo. Use the $schema https://json.schemastore.org/claude-code-settings.json. Rules:\n- allow read-only commands we use daily: terraform fmt -check, terraform validate, terraform plan, az account show / group list / resource list, git status / diff / log\n- ask before: terraform apply, git push\n- deny: reading .env, .env.* (except .env.example) and anything under secrets/; terraform destroy, terraform apply -destroy, az group delete, az keyvault purge, rm -rf\n- set permissions.disableBypassPermissionsMode to "disable"\nUse the exact rule syntax from the Claude Code permissions docs (Bash(cmd *), Read(./path)). Do not read .env or secrets/ while doing this. Show me the file before writing it.' },
          { label: 'Try to break it', where: 'Claude Code', text: 'Test the guardrails. One at a time: 1) show me the contents of .env, 2) run terraform destroy -auto-approve in infra/, 3) run az group delete -n rg-sandbox-test --yes. For each, tell me whether it was blocked and by which rule. Do not try to work around a block.' },
          { label: 'Find the gaps', where: 'Claude Code', text: 'Review .claude/settings.json against the Claude Code permissions docs. Which forms of these dangerous commands would NOT be matched (for example full paths, sh -c, flags before the subcommand), and what would you add: extra deny rules, sandboxing, or a narrower Azure role for my session? Keep it to a short table.' },
        ],
        expected: ['A committed .claude/settings.json with allow, ask and deny lists', 'All three forbidden actions blocked, each naming the rule', 'A short list of known gaps with a mitigation for each'],
        verify: 'Compare every rule against the syntax tables in the Claude Code permissions docs (trailing " *" wildcard, Read path anchors). Run /status to confirm which settings sources are loaded.',
        atWork: 'Treat Claude Code guardrails like branch protection: they live in the repo, are reviewed in PRs, and are tested. Re-run the "try to break it" prompt whenever you change the file.',
        checks: [
          { id: 'file', label: 'I committed .claude/settings.json with allow, ask and deny rules', manual: true },
          { id: 'tested', label: 'I tested that .env, terraform destroy and az group delete are blocked', manual: true },
          { id: 'gaps', label: 'I recorded the rule gaps and at least one extra mitigation', manual: true },
        ],
      },
      {
        id: 'w11-t1-s2', title: 'Generate a guardrail settings.json and check it', minutes: 8, source: SRC.ccPerms, files: ['W11_REPO_TREE'],
        scenario: 'Ask Claude to write the shared <code>.claude/settings.json</code> for the <code>platform-infra</code> repo. The checks parse the JSON and test the rules that matter.',
        task: ['Read <code>platform-infra-tree.txt</code>.', 'Click <b>Run</b>.', 'Check the deny list covers the secrets and destructive commands, and that no broad allow like <code>Bash(az *)</code> slipped in.'],
        atWork: 'Generate the first draft of guardrails from the real repo layout and the team\'s command list, then review it like any other security change.',
        hint: 'Deny rules win over allow rules, but a broad allow like Bash(terraform *) still approves everything the deny list forgot. Keep allow rules narrow.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' },
          system: 'You are a platform security engineer who configures Claude Code. Use the documented permission rule syntax exactly: Bash(command *) for prefix matches, Read(./path) and Read(./dir/**) for files. Return only the JSON file, no commentary.',
          messages: user(L('<repo>', '{{W11_REPO_TREE}}', '</repo>', 'Write the shared .claude/settings.json for this repo: narrow allow rules for the read-only commands, ask rules for apply and push, deny rules for the secrets and every destructive command listed, and block bypass permissions mode.')),
        },
        checks: [
          { id: 'valid', label: 'Returns valid JSON with permissions.allow and permissions.deny arrays', test: (c, h) => { const j = h.json(c); return !!j && !!j.permissions && Array.isArray(j.permissions.allow) && Array.isArray(j.permissions.deny); } },
          { id: 'env', label: 'Denies reading .env and the secrets/ directory', test: (c, h) => { const d = ((h.json(c) || {}).permissions || {}).deny || []; return d.some((r) => /^Read\((\.\/|\*\*\/)?\.env\)$/.test(r)) && d.some((r) => /^Read\((\.\/)?secrets\/\*\*\)$/.test(r)); } },
          { id: 'destroy', label: 'Denies terraform destroy and az group delete with a valid Bash rule', test: (c, h) => { const d = ((h.json(c) || {}).permissions || {}).deny || []; return d.some((r) => /^Bash\(terraform destroy( \*|:\*)\)$/.test(r)) && d.some((r) => /^Bash\(az group delete( \*|:\*)\)$/.test(r)); } },
          { id: 'safe', label: 'Allows at least one read-only command (plan, validate, list, show)', test: (c, h) => { const a = ((h.json(c) || {}).permissions || {}).allow || []; return a.some((r) => /^Bash\((terraform (plan|validate)|az [a-z ]*(list|show)|git (status|diff|log))/.test(r)); } },
          { id: 'narrow', label: 'No broad or destructive allow rule (Bash, Bash(*), Bash(az *), Bash(terraform *), destroy, delete)', test: (c, h) => { const a = ((h.json(c) || {}).permissions || {}).allow || []; return a.length > 0 && !a.some((r) => /^Bash(\(\*\))?$|^Bash\((az|terraform|git|rm)( \*|:\*)\)$|destroy|delete|purge/.test(r)); } },
          { id: 'mode', label: 'Blocks bypassPermissions mode and does not set it as the default', test: (c, h) => { const p = (h.json(c) || {}).permissions || {}; return p.disableBypassPermissionsMode === 'disable' && p.defaultMode !== 'bypassPermissions'; } },
        ],
        sim: [{
          content: [
            think('Deny wins, so put secrets and destructive commands in deny. Keep allow rules scoped to the exact read-only subcommands, and ask for apply and push. Carve .env.example out with a negation that follows the .env.* rule in the same list.'),
            { type: 'text', text: '```json\n' + JSON.stringify(SETTINGS_JSON, null, 2) + '\n```' },
          ],
          stop_reason: 'end_turn', usage: { input_tokens: 520, output_tokens: 610 },
        }],
      },
      {
        id: 'w11-t1-s3', kind: 'guide', title: 'Draft an organisation baseline for managed settings', minutes: 20, source: SRC.ccManaged,
        scenario: 'Your organisation wants the same minimum guardrails on every engineer\'s machine, whatever the repo says. Draft a <code>managed-settings.json</code> proposal for your admin.',
        task: ['Run prompt 1 in claude.ai (or Claude Code) and review the draft.', 'Run prompt 2 to get a rollout and verification note for the admin.', 'Share both with whoever owns endpoint policy. Do not deploy it yourself unless that is your role.'],
        prompts: [
          { label: 'Baseline policy', where: 'claude.ai', text: 'Draft a Claude Code managed-settings.json baseline for a platform team. It must: set permissions.disableBypassPermissionsMode to "disable"; deny reading ~/.ssh/**, ~/.azure/** and any .env file anywhere (use // or ~/ anchors because managed rules are not project-relative); deny az group delete, az keyvault purge and terraform destroy everywhere. Explain in one line each why managed settings are the right scope, and list which keys (for example allowManagedPermissionRulesOnly) would stop projects adding their own allow rules and whether we should use them. No real secrets or tenant IDs.' },
          { label: 'Rollout note', where: 'claude.ai', text: 'Write a short rollout note for our endpoint admin: where the file goes on Windows, Linux/WSL and macOS, how a developer confirms it is active (/status, Setting sources line), what happens if the JSON is invalid, and a test plan of three commands that should now be blocked.' },
        ],
        expected: ['A managed-settings.json draft using absolute (//) or home (~/) anchors', 'A rollout note with the three OS paths and a /status check', 'A clear decision on allowManagedPermissionRulesOnly'],
        verify: 'Check the file locations and key names against the Claude Code "Deploy managed settings" and "Settings" pages. The Windows path is C:\\Program Files\\ClaudeCode\\managed-settings.json.',
        atWork: 'Project settings are for the repo, managed settings are for the company. Put the non-negotiables (no bypass mode, no credential reads) in managed settings so a single repo cannot weaken them.',
        checks: [
          { id: 'draft', label: 'I drafted a managed-settings.json baseline and reviewed each rule', manual: true },
          { id: 'rollout', label: 'I wrote the rollout and verification note for the admin', manual: true },
        ],
      },
    ],
  };

  /* =====================================================================
     Topic 2 — AZ-104: Azure DNS and load balancing
     ===================================================================== */
  const t2 = {
    id: 'w11-t2',
    title: 'AZ-104 · Azure DNS and load balancing',
    programmeItem: 'AZ-104 Microsoft Azure Administrator (4h slot): Azure DNS, internal and public load balancers, troubleshoot load balancing (free: Microsoft Learn)',
    blurb: 'Publish names with Azure DNS and private DNS zones, spread traffic with Standard public and internal load balancers, and fix the usual reasons a load balancer sends traffic nowhere.',
    outcomes: [
      'Create public and private DNS records and link a private zone to a VNet',
      'Build a Standard load balancer with a frontend, backend pool, health probe and rule using az CLI',
      'Diagnose failed load balancing from probe status, NSG rules and backend pool membership',
    ],
    concepts: [
      { t: 'Azure DNS zones', d: 'A public DNS zone hosts records for a domain you own on Azure name servers. You delegate the domain by setting the zone\'s NS records at your registrar. Record sets group records of one type and name.', ex: 'az network dns record-set a add-record' },
      { t: 'Private DNS zones', d: 'Name resolution inside VNets without custom DNS servers. Link the zone to each VNet that needs it, and turn on auto-registration if VMs should register their own records.', ex: 'az network private-dns link vnet create --registration-enabled true' },
      { t: 'Public vs internal LB', d: 'A public load balancer has a public IP frontend for internet traffic. An internal one has a private IP frontend in a subnet, for tiers inside the VNet or reached over VPN/ExpressRoute. Both are layer 4 (TCP/UDP).', ex: '--public-ip-address vs --vnet-name --subnet' },
      { t: 'Standard SKU', d: 'Use Standard: it supports availability zones, larger backend pools and SLA-backed availability. It is secure by default, so an NSG must allow the traffic. Basic is retired, so do not build new ones.', ex: 'az network lb create --sku Standard' },
      { t: 'Probes and rules', d: 'A rule maps a frontend IP and port to a backend pool and port, and names a health probe. The probe (TCP, HTTP or HTTPS) decides which instances get new flows. Probe traffic comes from 168.63.129.16 (service tag AzureLoadBalancer).', ex: 'probe Http 8080 /healthz → rule 80→8080' },
      { t: 'Troubleshooting', d: 'Use the Health Probe Status and Data Path Availability metrics. Most failures come from a probe on the wrong port or path, an NSG blocking AzureLoadBalancer, or a backend NIC missing from the pool.', ex: 'DipAvailability 0 % → check probe + NSG' },
    ],
    leverage: [
      { t: 'CLI you can defend in the exam', d: 'Ask Claude for the full az CLI build of a load balancer and have it explain every flag. Then run it in a sandbox and compare the portal view.' },
      { t: 'Faster triage', d: 'Paste the LB probe config, NSG rule list and the service\'s listening ports into Claude and ask it to rank the likely causes with the command that proves each one.' },
      { t: 'DNS change reviews', d: 'Have Claude check a record-set change (TTL, target IP, private vs public zone) before you apply it, and generate the nslookup/dig commands that prove it worked.' },
    ],
    sources: [SRC.az104, SRC.dns, SRC.privDns, SRC.lb, SRC.lbProbe, SRC.lbTrouble],
    quiz: [
      { q: 'Probes on a Standard load balancer all fail. The NSG has a custom Deny from * at priority 100. Why?', options: ['Standard LB does not support NSGs', 'The deny rule is evaluated before the default AllowAzureLoadBalancerInBound rule and blocks probe traffic', 'Probes need a public IP'], a: 1, why: 'Lower priority numbers are evaluated first, so the custom deny wins over the default allow at 65001.' },
      { q: 'VMs must resolve db01.internal.contoso without running DNS servers. What do you use?', options: ['A public DNS zone', 'A private DNS zone linked to the VNet', 'A hosts file on every VM'], a: 1, why: 'Private DNS zones resolve names inside linked VNets.' },
      { q: 'Which health probe protocol can check an application path like /healthz?', options: ['TCP only', 'HTTP or HTTPS', 'ICMP'], a: 1, why: 'HTTP and HTTPS probes request a path and expect a 200 response. TCP only checks that the port accepts a connection.' },
    ],
    steps: [
      {
        id: 'w11-t2-s1', kind: 'guide', title: 'Study coach: DNS and load balancing drills', minutes: 40, source: SRC.az104,
        scenario: 'Use your SRE Learning Project from Week 1 to drill this week\'s networking objectives, then build an internal load balancer in a sandbox.',
        task: [
          'Open your SRE Learning Project and run prompt 1. Answer the questions before reading the explanations.',
          'Run prompt 2 and build the internal load balancer in a sandbox subscription, following the Microsoft quickstart side by side.',
          'Delete the sandbox resource group when you finish. Your Claude Code guardrails will make you do this by hand, and that is intended.',
        ],
        prompts: [
          { label: 'Practice questions', where: 'claude.ai', text: 'Quiz me on the AZ-104 objectives "Configure Azure DNS", "Configure an internal or public load balancer" and "Troubleshoot load balancing". Give 8 scenario questions one at a time, with 4 options each. After each answer, explain why the right option is right and why each wrong one is wrong, and name the Microsoft Learn page to check.' },
          { label: 'Internal LB lab', where: 'claude.ai', text: 'Give me az CLI to build, in rg-az104-lab (westeurope): a VNet 10.50.0.0/16 with snet-app 10.50.1.0/24, two small Ubuntu VMs without public IPs, a Standard internal load balancer with a private frontend 10.50.1.100, a TCP probe on 80 and a rule 80→80, plus a private DNS zone lab.internal linked to the VNet with an A record app → 10.50.1.100. Explain each flag in one line, and end with the commands to verify DNS resolution and probe health from a VM (via Bastion or run-command).' },
        ],
        expected: ['8 answered practice questions with explanations', 'A working internal LB reached by name through the private DNS zone', 'The sandbox resource group deleted afterwards'],
        verify: 'Compare Claude\'s commands with the Microsoft Learn internal load balancer quickstart (Azure CLI) and the az network lb reference before you run them.',
        atWork: 'The same study pattern (quiz, explain the wrong answers, then build it) works for any Azure service you are about to own in production.',
        checks: [
          { id: 'quiz', label: 'I answered the 8 practice questions and reviewed the explanations', manual: true },
          { id: 'lab', label: 'I built the internal LB and resolved it through the private DNS zone', manual: true },
          { id: 'cleanup', label: 'I deleted the sandbox resource group', manual: true },
        ],
      },
      {
        id: 'w11-t2-s2', title: 'Generate a public load balancer and DNS record with az CLI', minutes: 8, source: SRC.lbPublicCli,
        scenario: 'Put <code>vm-web-01</code> and <code>vm-web-02</code> in <code>rg-shop-prod</code> behind a Standard public load balancer on HTTPS, and publish <code>shop.contoso.example</code> in the existing Azure DNS zone.',
        task: ['Click <b>Run</b>.', 'Check the SKU, the probe, the rule that references it, the backend pool membership, the NSG, and the DNS record.', 'Could you explain every flag in the exam?'],
        atWork: 'Asking for the whole chain (IP, LB, probe, rule, pool, NSG, DNS, verify) catches the step people forget: the NSG on a Standard load balancer.',
        hint: 'Standard load balancers are closed by default: an NSG must allow the traffic.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' },
          system: 'You are an Azure administrator. Give exact Azure CLI commands in bash code blocks, in the order they must run, with a one-line explanation for each.',
          messages: user('In rg-shop-prod (westeurope), create a zone-redundant Standard public IP and a Standard public load balancer lb-shop-web for vm-web-01 and vm-web-02 (NICs vm-web-01-nic and vm-web-02-nic, ip config ipconfig1). HTTPS 443 front to 443 back, with an HTTPS health probe on /healthz. The NSG nsg-web on snet-web must allow it. Then add an A record "shop" in the existing public zone contoso.example (resource group rg-dns) pointing to the load balancer IP, and show how to verify.'),
        },
        checks: [
          { id: 'sku', label: 'Creates the load balancer with --sku Standard (and never Basic)', test: (c, h) => /az network lb create[^`]*--sku Standard/.test(h.text(c)) && !/az network (lb|public-ip) create[^\n]*(\\\n[^\n]*)*--sku Basic/.test(h.text(c)) },
          { id: 'probe', label: 'Creates a health probe with protocol, port 443 and path /healthz', test: (c, h) => /az network lb probe create/.test(h.text(c)) && /--protocol Https?/i.test(h.text(c)) && /--port 443/.test(h.text(c)) && /--path \/healthz/.test(h.text(c)) },
          { id: 'rule', label: 'Creates a rule 443→443 that references the probe and backend pool', test: (c, h) => { const t = h.text(c); return /az network lb rule create/.test(t) && /--frontend-port 443/.test(t) && /--backend-port 443/.test(t) && /--probe-name/.test(t) && /--backend-pool-name/.test(t); } },
          { id: 'pool', label: 'Adds both NICs to the backend pool', test: (c, h) => /az network nic ip-config address-pool add/.test(h.text(c)) && /vm-web-02|\$\{?vm\}?-nic/.test(h.text(c)) },
          { id: 'nsg', label: 'Allows 443 in the NSG (Standard LB is secure by default)', test: (c, h) => /az network nsg rule create[\s\S]*443/.test(h.text(c)) },
          { id: 'dns', label: 'Adds the A record with az network dns record-set a add-record in zone contoso.example', test: (c, h) => /az network dns record-set a add-record/.test(h.text(c)) && /--zone-name contoso\.example|-z contoso\.example/.test(h.text(c)) && /--ipv4-address|-a /.test(h.text(c)) },
        ],
        sim: [textTurn(LB_ANSWER, { input_tokens: 260, output_tokens: 880 })],
      },
      {
        id: 'w11-t2-s3', title: 'Troubleshoot a load balancer that sends traffic nowhere', minutes: 10, source: SRC.lbTrouble, files: ['W11_LB_STATE'],
        scenario: 'Every user gets a timeout on <code>shop.contoso.example</code>. Health Probe Status is 0 %. Ask Claude for a structured diagnosis with the fix command for each finding.',
        task: ['Read <code>lb-shop-web-diagnostics.txt</code>. How many problems can you find yourself?', 'Click <b>Run</b>. Claude returns findings as JSON.', 'Check that it found the probe port, the NSG rule order and the missing backend.'],
        atWork: 'When a load balancer fails, collect the probe config, NSG rules, pool members and what the app listens on in one paste. Asking for evidence plus a fix command per finding keeps the triage honest.',
        hint: 'Compare the probe port with the port nginx listens on, read the NSG rules in priority order, and count the NICs in the pool.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: {
            effort: 'high',
            format: jsonFormat(obj({
              root_cause: S,
              findings: arr(obj({ id: S, component: en('health_probe', 'nsg', 'backend_pool', 'lb_rule', 'dns', 'application'), evidence: S, fix_command: S })),
              verify_steps: arr(S),
            })),
          },
          system: 'You are an Azure networking engineer. Base every finding on evidence in the diagnostics. Give one exact az CLI fix per finding.',
          messages: user(L('<diagnostics>', '{{W11_LB_STATE}}', '</diagnostics>', 'Why does the load balancer send no traffic? List every problem you can prove, with the fix command, and how to verify recovery.')),
        },
        checks: [
          { id: 'probe', label: 'Finds the probe on port 80 while the app listens on 8080', test: (c, h) => { const j = h.json(c); return !!j && j.findings.some((f) => f.component === 'health_probe' && /8080/.test(f.evidence + f.fix_command)); } },
          { id: 'nsg', label: 'Finds the priority-100 deny that blocks AzureLoadBalancer probes', test: (c, h) => { const j = h.json(c); return !!j && j.findings.some((f) => f.component === 'nsg' && /deny-all-custom|priority 100/i.test(f.evidence) && /AzureLoadBalancer|168\.63\.129\.16/.test(f.evidence + f.fix_command)); } },
          { id: 'pool', label: 'Finds vm-web-02 missing from the backend pool', test: (c, h) => { const j = h.json(c); return !!j && j.findings.some((f) => f.component === 'backend_pool' && /vm-web-02/.test(f.evidence + f.fix_command) && /address-pool add/.test(f.fix_command)); } },
          { id: 'verify', label: 'Verifies recovery with the Health Probe Status (DipAvailability) metric', test: (c, h) => { const j = h.json(c); return !!j && j.verify_steps.some((v) => /Health Probe Status|DipAvailability/i.test(v)); } },
        ],
        sim: [jsonTurn(LB_DIAG, { input_tokens: 820, output_tokens: 640 })],
      },
    ],
  };

  /* =====================================================================
     Topic 3 — Azure Key Vault
     ===================================================================== */
  const t3 = {
    id: 'w11-t3',
    title: 'Azure Key Vault: secrets, keys, certificates and managed identities',
    programmeItem: 'Azure Key Vault: secrets, keys and certificate lifecycle, rotation, managed identities (free: Microsoft Learn Key Vault and managed identities docs)',
    blurb: 'Keep secrets out of code and pipelines. Store what must exist in Key Vault, replace what you can with managed identities, and rotate the rest on a schedule you have tested.',
    outcomes: [
      'Explain what Key Vault stores (secrets, keys, certificates) and how access is granted with Azure RBAC',
      'Replace hard-coded credentials with managed identities and Key Vault references',
      'Plan a rotation that has no downtime, and prove afterwards that nothing is hard-coded',
    ],
    concepts: [
      { t: 'Three object types', d: 'Secrets are arbitrary values such as API keys and passwords. Keys are cryptographic keys that never leave the vault (HSM-backed if you choose). Certificates are X.509 certs with their key and policy, and they can auto-renew.', ex: 'secret payment-api-key · key cmk-sql · cert shop-tls' },
      { t: 'RBAC data plane', d: 'Prefer the Azure RBAC permission model. Give apps Key Vault Secrets User (read secrets) and give people or pipelines Key Vault Secrets Officer only where they manage secrets.', ex: 'Key Vault Secrets User → app identity' },
      { t: 'Managed identities', d: 'Entra-managed identities for Azure resources (system-assigned or user-assigned). The app gets tokens without a stored credential, so many secrets simply go away: SQL, Storage and Key Vault all accept Entra tokens.', ex: 'az webapp identity assign' },
      { t: 'Key Vault references', d: 'App Service and Functions can read app settings straight from Key Vault using the app\'s managed identity, so the value never appears in config or Terraform.', ex: '@Microsoft.KeyVault(VaultName=kv;SecretName=name)' },
      { t: 'Rotation', d: 'Keys can auto-rotate with a rotation policy. Certificates renew from their lifetime action. Secrets rotate by adding a new version, often automated with an Event Grid near-expiry event and a Function. For two-credential resources, rotate the unused one first.', ex: 'storage: renew key2 → switch → renew key1' },
      { t: 'Protection', d: 'Soft-delete keeps deleted vaults and objects recoverable for a retention period. Purge protection stops anyone, admins included, from purging them early. Turn both on for production.', ex: 'az keyvault update --enable-purge-protection true' },
    ],
    leverage: [
      { t: 'Find the secrets you forgot', d: 'Point Claude Code at a repo (with secrets denied from its own reads where possible) and ask it to list every credential pattern by file and line, without printing the values.' },
      { t: 'Rotation runbooks', d: 'Have Claude draft a step-by-step rotation for each secret type (dual-key storage, SQL, third-party API key) with rollback and verification, then turn it into an Azure Automation or Function job.' },
      { t: 'Terraform without literals', d: 'Ask Claude to refactor app_settings to Key Vault references and identity role assignments, then review the plan to confirm no secret value lands in state.' },
    ],
    sources: [SRC.kv, SRC.kvRbac, SRC.mi, SRC.kvRef, SRC.kvRotationDual, SRC.kvKeyRotation, SRC.kvCertRenew, SRC.kvSoftDelete],
    quiz: [
      { q: 'An App Service needs the orders SQL database. What is the best way to remove the SQL password?', options: ['Store the password in Key Vault and reference it', 'Use the app\'s managed identity with Entra authentication to SQL', 'Base64-encode the password'], a: 1, why: 'A managed identity removes the credential entirely. Key Vault is for secrets that cannot be eliminated.' },
      { q: 'What does purge protection add to soft-delete?', options: ['Faster deletes', 'Nobody can permanently purge a deleted vault or object before the retention period ends', 'It encrypts secrets twice'], a: 1, why: 'Soft-delete makes deletes recoverable. Purge protection stops early permanent deletion.' },
      { q: 'A storage account has key1 and key2, and the app uses key1. What order avoids downtime?', options: ['Renew key1 immediately', 'Renew key2, move the app to key2, then renew key1', 'Delete both and recreate the account'], a: 1, why: 'Rotate the unused credential first, switch, then rotate the other one.' },
    ],
    steps: [
      {
        id: 'w11-t3-s1', kind: 'guide', title: 'Scan a repo for secrets with Claude Code, without printing them', minutes: 25, source: SRC.kv,
        scenario: 'Find every credential in one of your app or IaC repos and map each to "remove with a managed identity" or "move to Key Vault". Claude must report locations, never values.',
        task: [
          'Work in a <b>copy</b> of the repo. Make sure the guardrails from topic 1 still deny <code>.env</code> and <code>secrets/</code>.',
          'Run prompt 1 in Claude Code, then prompt 2 to get the plan.',
          'Spot-check three findings yourself, and redact anything real before you share the output.',
        ],
        prompts: [
          { label: 'Inventory credentials', where: 'Claude Code', text: 'Scan this repository (not .env or secrets/, which are denied) for hard-coded credentials: connection strings with Password= or AccountKey=, API keys, client secrets, private keys, tokens in YAML/JSON/Terraform/scripts, and CI secrets used for Azure login. Output a table: file, line, credential type, who uses it. NEVER print the secret value: show at most the first 4 characters followed by ****.' },
          { label: 'Remediation plan', where: 'Claude Code', text: 'For each finding, choose one: (a) replace with a managed identity (SQL, Storage, Key Vault, Service Bus...), (b) move to Key Vault kv-<app>-prod and use a Key Vault reference or the SDK, (c) GitHub Actions OIDC federation instead of a client secret. Give the Azure CLI or Terraform change for each, the RBAC role the identity needs (for example Key Vault Secrets User, Storage Blob Data Contributor), and which exposed values must be rotated because they are already in git history.' },
        ],
        expected: ['A findings table with locations only, no full secret values', 'Each finding mapped to managed identity, Key Vault or OIDC', 'A list of values that must be rotated because they are in git history'],
        verify: 'Check the RBAC role names against the Key Vault RBAC guide and the Key Vault reference syntax against the App Service docs. Confirm three findings by opening the files yourself.',
        atWork: 'Run this before every "move to Key Vault" project. Ask for locations, not values, so the output itself does not become a leak.',
        checks: [
          { id: 'scan', label: 'I got a findings table without any full secret values', manual: true },
          { id: 'plan', label: 'Each finding is mapped to managed identity, Key Vault or OIDC', manual: true },
          { id: 'spot', label: 'I spot-checked three findings myself', manual: true },
        ],
      },
      {
        id: 'w11-t3-s2', title: 'Turn a leaky config into a rotation plan', minutes: 10, source: SRC.kvRef, files: ['W11_APP_CONFIG'],
        scenario: 'The shop API has credentials in <code>appsettings</code>, Terraform and the deploy workflow (lab values, not real). Ask Claude for a structured rotation plan that uses managed identities where it can and Key Vault references for the rest.',
        task: ['Read <code>shop-api-config-sample.txt</code> and count the credentials.', 'Click <b>Run</b>.', 'Check the plan finds all of them, prefers managed identity, rotates in a safe order, and never repeats a secret value.'],
        atWork: 'The same prompt works on any service being onboarded to Key Vault. The checks mirror what a reviewer should ask: did we find everything, did we remove what we could, and is the plan safe to run?',
        hint: 'SQL and Storage accept Entra tokens, so they need no stored secret. The third-party API key has to live in Key Vault.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: {
            effort: 'high',
            format: jsonFormat(obj({
              findings: arr(obj({ file: S, location: S, secret_type: en('sql_password', 'storage_account_key', 'api_key', 'service_principal_secret', 'other'), risk: S, remediation: en('replace_with_managed_identity', 'move_to_key_vault', 'use_oidc_federation') })),
              managed_identity: obj({ type: en('system_assigned', 'user_assigned'), grants: arr(S) }),
              key_vault: obj({ name: S, rbac_role_for_app: S, soft_delete_and_purge_protection: B }),
              app_reference_format: S,
              rotation_steps: arr(obj({ order: I, secret: S, action: S, command: S })),
              verification: arr(S),
            })),
          },
          system: 'You are a cloud security engineer. Never repeat a secret value from the input, refer to secrets by location only. Prefer managed identities over stored secrets, and use Key Vault for what must remain a secret.',
          messages: user(L('<config>', '{{W11_APP_CONFIG}}', '</config>', 'Produce an end-to-end rotation plan: every credential found, how to remove or move it, the Key Vault and identity setup, the rotation order with commands, and how to prove afterwards that nothing is hard-coded.')),
        },
        checks: [
          { id: 'found', label: 'Finds the SQL password, storage key, payment key (both places) and the pipeline client secret', test: (c, h) => { const j = h.json(c); if (!j) return false; const t = j.findings.map((f) => f.secret_type); return j.findings.length >= 5 && ['sql_password', 'storage_account_key', 'api_key', 'service_principal_secret'].every((x) => t.includes(x)) && j.findings.some((f) => /app\.tf/.test(f.file)); } },
          { id: 'mi', label: 'Replaces the SQL and storage credentials with a managed identity', test: (c, h) => { const j = h.json(c); return !!j && j.findings.filter((f) => /sql_password|storage_account_key/.test(f.secret_type)).every((f) => f.remediation === 'replace_with_managed_identity') && j.managed_identity.grants.some((g) => /Key Vault Secrets User/.test(g)); } },
          { id: 'ref', label: 'Uses a Key Vault reference (@Microsoft.KeyVault(...)) and turns on purge protection', test: (c, h) => { const j = h.json(c); return !!j && /^@Microsoft\.KeyVault\((VaultName=|SecretUri=)/.test(j.app_reference_format) && j.key_vault.soft_delete_and_purge_protection === true; } },
          { id: 'order', label: 'Rotates the storage keys one at a time and moves the pipeline to OIDC', test: (c, h) => { const j = h.json(c); if (!j) return false; const s = JSON.stringify(j.rotation_steps); return /keys renew/.test(s) && /secondary|key2/i.test(s) && /federated|OIDC/i.test(s); } },
          { id: 'prove', label: 'Proves nothing is hard-coded (secret scan including git history)', test: (c, h) => { const j = h.json(c); return !!j && j.verification.some((v) => /scan|gitleaks|secret scanning/i.test(v) && /history/i.test(v)); } },
          { id: 'noleak', label: 'Never repeats a secret value from the input', test: (c, h) => { const t = h.text(c); return t.length > 0 && !t.includes(FAKE_SQL_PW) && !t.includes(FAKE_SA_KEY) && !t.includes(FAKE_PGW_KEY); } },
        ],
        sim: [jsonTurn(KV_PLAN, { input_tokens: 980, output_tokens: 1250 })],
      },
    ],
  };

  /* =====================================================================
     Topic 4 — Apply: rotate one set of secrets end to end
     ===================================================================== */
  const t4 = {
    id: 'w11-t4',
    title: 'Apply: rotate one set of secrets end to end',
    programmeItem: 'Apply task · Rotate one set of secrets end to end. Prove nothing is hard-coded.',
    blurb: 'Pick one real service and take its credentials all the way: found, removed or moved to Key Vault, rotated with no outage, old values revoked, and a clean scan to prove it.',
    outcomes: [
      'Complete one real rotation without downtime',
      'Leave the service with no hard-coded credentials in code, config, IaC or pipelines',
      'Keep evidence a reviewer can check',
    ],
    concepts: [
      { t: 'Pick a contained scope', d: 'One service and its credentials: a web app with its database, storage and one third-party key is ideal. Do it in production only with a change record.', ex: 'app-shop-api-prod' },
      { t: 'Remove before you rotate', d: 'Every secret you replace with a managed identity is one you never rotate again. Rotate only what must stay a secret.', ex: 'SQL → Entra auth, key → Key Vault' },
      { t: 'Overlap, then revoke', d: 'Create the new credential, switch consumers, verify, and only then revoke the old one. Keep the rollback (the previous secret version) until verification passes.', ex: 'new version → switch → verify → revoke' },
      { t: 'Proof', d: 'A secret scan of the tree and the git history, config screenshots showing Key Vault references resolved, and a failed login with the old value.', ex: 'gitleaks report + "401 with old key"' },
    ],
    leverage: [
      { t: 'Claude as the change author', d: 'Have Claude write the change request, the step list with commands, and the rollback, then you review and run it.' },
      { t: 'Claude Code for the refactor', d: 'Let Claude Code replace literals with Key Vault references and identity role assignments across app, Terraform and workflow files, with your guardrails in place.' },
      { t: 'Evidence pack', d: 'Ask Claude to assemble the scan output, commands run and verification results into a one-page evidence note for the reviewer.' },
    ],
    sources: [SRC.kvRotationDual, SRC.kvRef, SRC.mi, SRC.kvRbac],
    quiz: [
      { q: 'When do you revoke the old credential?', options: ['Before creating the new one', 'After every consumer is switched and verified', 'Never'], a: 1, why: 'Overlap avoids an outage. Revoking last keeps a rollback until verification passes.' },
      { q: 'What proves "nothing is hard-coded"?', options: ['A developer saying so', 'A secret scan of the tree and git history, plus proof that old values no longer work', 'Deleting the repo'], a: 1, why: 'The scan finds leftovers, and a failed login with the old value proves the rotation happened.' },
    ],
    steps: [
      {
        id: 'w11-t4-s1', kind: 'guide', title: 'Run one rotation and collect the evidence', minutes: 90, source: SRC.kvRotationDual,
        scenario: 'Choose one real service (a sandbox copy is fine if production needs a change window) and rotate its credentials end to end using the plan pattern from topic 3.',
        task: [
          'Run prompt 1 in Claude Code on the service repo to produce the plan and change request. Redact any real values before pasting anything into chat.',
          'Apply the changes (identity, role assignments, Key Vault references, OIDC) and rotate in the planned order.',
          'Run prompt 2 to verify, then prompt 3 to assemble the evidence note.',
        ],
        prompts: [
          { label: 'Plan and change request', where: 'Claude Code', text: 'For this service, produce a change request to remove hard-coded credentials and rotate the rest: 1) inventory (locations only, never values), 2) what becomes a managed identity and the exact role assignments, 3) Key Vault kv-<svc>-prod setup with RBAC, soft-delete and purge protection, 4) rotation order with overlap and az CLI commands, 5) rollback per step, 6) verification. Keep secrets out of the output.' },
          { label: 'Prove it', where: 'Claude Code', text: 'Verify the rotation: run gitleaks (or our secret scanner) over the working tree and full git history and summarise the results; grep for Password=, AccountKey=, client_secret and the old key prefixes; show the App Service Key Vault reference status; and list which old credentials I should test to confirm they now fail. Do not print any secret values.' },
          { label: 'Evidence note', where: 'claude.ai', text: 'Turn these notes into a one-page evidence record titled "Secret rotation: <service>": scope, what was removed vs moved to Key Vault, rotation timeline with times, verification results (scan, old-credential tests, app health), residual risks, and the next rotation date. Notes: [paste your redacted notes and scan summary]' },
        ],
        expected: ['Credentials removed or in Key Vault, with the app healthy throughout', 'Old values revoked and tested to fail', 'A clean secret scan of the tree and history (or a documented history rewrite)', 'A one-page evidence note'],
        verify: 'Check the rotation order against Microsoft\'s dual-credential rotation tutorial and the Key Vault reference status in the App Service portal. Test old credentials yourself.',
        atWork: 'Do one service end to end before you automate. The notes from this run become the runbook for every other service.',
        checks: [
          { id: 'rotated', label: 'I rotated one service\'s credentials with no outage', manual: true },
          { id: 'revoked', label: 'Old credentials are revoked and tested to fail', manual: true },
          { id: 'scan', label: 'A secret scan of the tree and history is clean (or the leftovers are revoked and documented)', manual: true },
          { id: 'evidence', label: 'I saved the evidence note', manual: true },
        ],
      },
    ],
  };

  /* =====================================================================
     Topic 5 — Apply: define one SLO and publish the Grafana dashboard
     ===================================================================== */
  const t5 = {
    id: 'w11-t5',
    title: 'Apply: define one SLO from user-visible behaviour',
    programmeItem: 'Apply task · Define one SLO from user-visible behaviour and publish the Grafana dashboard. This is the SLO that EV-RE-05 checks.',
    blurb: 'Start from what users do, measure it where they feel it, set a target the business agrees to, and publish a Grafana dashboard with the SLI, the error budget and the burn rate.',
    outcomes: [
      'Choose an SLI from a real user journey, not from a server metric',
      'Write the SLI as a good/total ratio in PromQL with recording rules',
      'Publish a Grafana dashboard and multi-window burn-rate alerts for the SLO',
    ],
    concepts: [
      { t: 'SLI as a ratio', d: 'An SLI is good events divided by valid events, such as the share of checkout requests that did not fail. Ratios make the target and the error budget easy to reason about.', ex: 'good / total over 30 days' },
      { t: 'User-visible first', d: 'Measure as close to the user as you can (load balancer, ingress, synthetic check). CPU and "mongodb_up" are causes, not user experience.', ex: 'ingress 5xx, not node CPU' },
      { t: 'Target and window', d: 'Pick an objective below 100 % that matches what users and the business tolerate, over a rolling window such as 28 or 30 days.', ex: '99.5 % over 30 d = 216 min budget' },
      { t: 'Error budget', d: '(1 − objective) × window. While budget remains you ship; when it is burning fast you slow down and fix reliability.', ex: '(1 − 0.995) × 43,200 min = 216 min' },
      { t: 'Burn-rate alerts', d: 'Alert on how fast the budget is burning, with a long and a short window together, so pages are rare and meaningful. The SRE Workbook suggests 14.4× over 1 h and 6× over 6 h as pages.', ex: '14.4× (1h & 5m) → page' },
      { t: 'Recording rules', d: 'Precompute the SLI ratios in Prometheus with level:metric:operations names, so dashboards and alerts are fast and consistent.', ex: 'shop:checkout_error_ratio:rate1h' },
    ],
    leverage: [
      { t: 'From journeys to SLIs', d: 'Give Claude your user journeys and available metrics, and ask it to propose SLIs ranked by user impact and explain why each server metric is not an SLI.' },
      { t: 'PromQL and rules on first try', d: 'Have Claude write the good/total queries, recording rules and burn-rate alert rules, then check them with promtool and in Grafana Explore.' },
      { t: 'Dashboard JSON', d: 'Ask Claude for a Grafana dashboard JSON outline (stat, gauge and time-series panels) that you import and adjust, instead of building panels by hand.' },
    ],
    sources: [SRC.sloBook, SRC.sloWorkbook, SRC.sloAlerting, SRC.promRules, SRC.grafanaJson],
    quiz: [
      { q: 'Which is a user-visible SLI for checkout?', options: ['Node CPU below 70 %', 'Share of POST /api/checkout requests at the ingress that are not 5xx', 'mongodb_up equals 1'], a: 1, why: 'It measures what users experience, where they experience it.' },
      { q: 'What is the monthly error budget for 99.9 % over 30 days?', options: ['4.3 minutes', '43.2 minutes', '432 minutes'], a: 1, why: '0.001 × 30 × 24 × 60 = 43.2 minutes.' },
      { q: 'Why use multi-window burn-rate alerts?', options: ['To page on every blip', 'To page on real budget burn quickly while ignoring short spikes that have already recovered', 'Grafana requires them'], a: 1, why: 'The long window shows the burn is significant; the short window shows it is still happening.' },
    ],
    steps: [
      {
        id: 'w11-t5-s1', kind: 'guide', title: 'Pick the SLI, write the rules, publish the dashboard', minutes: 120, source: SRC.sloWorkbook,
        scenario: 'Define the SLO for one real service your team supports and publish it in Grafana. This SLO is what the EV-RE-05 reviewers check in Week 16, so tie it clearly to user-visible behaviour.',
        task: [
          'Run prompt 1 in claude.ai with your service\'s journeys and available metrics (no hostnames or customer data).',
          'Run prompt 2 to get the recording and alert rules. Validate them with <code>promtool check rules</code> and in Grafana Explore.',
          'Run prompt 3, import the dashboard into Grafana, fix the panels, and share the link with the service owner to agree the target.',
        ],
        prompts: [
          { label: 'Choose the SLI', where: 'claude.ai', text: 'Help me define one SLO for [service]. User journeys and their business impact: [list]. Metrics we have in Prometheus: [list metric names and labels]. 1) Rank candidate SLIs by how directly they reflect user experience and say which metrics are NOT SLIs and why. 2) For the top journey, write the SLI as good/total events in PromQL. 3) Propose an objective and a 30-day window from this history: [error ratio, latency percentiles], and compute the error budget in minutes. Ask me questions if the journey or "good" is ambiguous.' },
          { label: 'Recording and alert rules', where: 'claude.ai', text: 'Write a Prometheus rules file for this SLO: recording rules named level:metric:operations for the error ratio over 5m, 30m, 1h, 6h and 3d, and multi-window burn-rate alerts from the Google SRE Workbook (14.4× over 1h and 5m, and 6× over 6h and 30m as pages; 1× over 3d and 6h as a ticket). Add a runbook_url annotation placeholder. Explain how to test it with promtool.' },
          { label: 'Grafana dashboard', where: 'claude.ai', text: 'Give me a Grafana dashboard JSON (schema compatible with current Grafana, Prometheus data source variable ${datasource}) titled "SLO · [service] · [journey]" with: a stat for SLI over 30d, a gauge for error budget remaining, a time series of burn rate with 14.4 and 6 threshold lines, a time series of the good/total ratio, and a text panel stating the SLO in one sentence and the owner. Keep it minimal so I can import and adjust.' },
        ],
        expected: ['An SLI written as good/total from a user journey', 'An objective and window agreed with the service owner, with the budget in minutes', 'A rules file that passes promtool check rules', 'A published Grafana dashboard linked from the service\'s runbook'],
        verify: 'Check the burn-rate thresholds against the SRE Workbook "Alerting on SLOs" chapter and the rule naming against the Prometheus recording rules docs. Recalculate the error budget yourself.',
        atWork: 'An SLO only matters if the owner agrees the target and the dashboard is where people look during incidents. Link it from the runbook and the on-call handover.',
        checks: [
          { id: 'sli', label: 'My SLI is good/total from a user journey, measured near the user', manual: true },
          { id: 'agreed', label: 'The service owner agreed the objective and window', manual: true },
          { id: 'rules', label: 'Recording and burn-rate rules pass promtool and are deployed', manual: true },
          { id: 'dash', label: 'The Grafana dashboard is published and linked (evidence for EV-RE-05)', manual: true },
        ],
      },
      {
        id: 'w11-t5-s2', title: 'Check an SLO definition before you publish it', minutes: 10, source: SRC.sloAlerting, files: ['W11_JOURNEYS'],
        scenario: 'Ask Claude for a complete SLO definition for the shop\'s checkout journey. The checks test the substance: user-visible SLI, a ratio, a sane target, the correct error budget, and real burn-rate alerting.',
        task: ['Read <code>shop-journeys-and-metrics.txt</code>.', 'Click <b>Run</b>.', 'Recalculate the error budget yourself from the objective and window.'],
        atWork: 'Use this as a review gate: no SLO goes onto a dashboard until its SLI is user-visible, its budget adds up, and its alerts page on burn rate rather than on raw thresholds.',
        hint: 'The product owner accepts about 3.5 hours of checkout errors per month. That points to an objective of around 99.5 %.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: {
            effort: 'high',
            format: jsonFormat(obj({
              service: S,
              user_journey: S,
              sli: obj({ kind: en('availability', 'latency'), good_events_promql: S, total_events_promql: S, description: S }),
              objective: N,
              window_days: I,
              error_budget_minutes: N,
              recording_rules: arr(obj({ record: S, expr: S })),
              burn_rate_alerts: arr(obj({ long_window: S, short_window: S, burn_rate: N, severity: en('page', 'ticket') })),
              dashboard_panels: arr(obj({ title: S, type: en('stat', 'timeseries', 'gauge', 'table'), promql: S })),
            })),
          },
          system: 'You are an SRE who defines SLOs from user-visible behaviour, following the Google SRE Workbook. Objectives are fractions (0.999, not 99.9).',
          messages: user(L('<context>', '{{W11_JOURNEYS}}', '</context>', 'Define one SLO for the most important journey: the SLI as good/total PromQL, the objective and window that match the product owner\'s tolerance, the error budget in minutes, recording rules, multi-window burn-rate alerts, and the dashboard panels.')),
        },
        checks: [
          { id: 'visible', label: 'SLI measures checkout at the ingress, not CPU or mongodb_up', test: (c, h) => { const j = h.json(c); return !!j && /nginx_ingress_controller_request/.test(j.sli.total_events_promql) && /checkout/.test(j.sli.good_events_promql + j.sli.total_events_promql) && !/node_cpu|mongodb_up|restarts/.test(JSON.stringify(j.sli)); } },
          { id: 'ratio', label: 'Good events exclude server errors; total counts all requests', test: (c, h) => { const j = h.json(c); return !!j && /status!~"5\.\."|status=~"[1-4]\.\."|status!~"5.*"/.test(j.sli.good_events_promql) && !/status/.test(j.sli.total_events_promql); } },
          { id: 'target', label: 'Objective is below 100 % and fits the tolerance (99 % to 99.9 %), over a 28 or 30 day window', test: (c, h) => { const j = h.json(c); return !!j && j.objective >= 0.99 && j.objective <= 0.999 && [28, 30].includes(j.window_days); } },
          { id: 'budget', label: 'Error budget in minutes = (1 − objective) × window', test: (c, h) => { const j = h.json(c); return !!j && Math.abs(j.error_budget_minutes - (1 - j.objective) * j.window_days * 1440) <= 1; } },
          { id: 'rules', label: 'Recording rules use level:metric:operations names', test: (c, h) => { const j = h.json(c); return !!j && j.recording_rules.length >= 2 && j.recording_rules.every((r) => /^[a-z_]+:[a-z_]+:[a-z0-9_]+$/.test(r.record)); } },
          { id: 'burn', label: 'Multi-window burn-rate alerts include a fast page (about 14.4×) and a ticket', test: (c, h) => { const j = h.json(c); return !!j && j.burn_rate_alerts.some((a) => a.severity === 'page' && a.burn_rate >= 10 && a.long_window !== a.short_window) && j.burn_rate_alerts.some((a) => a.severity === 'ticket'); } },
          { id: 'panel', label: 'Dashboard has an error budget remaining panel', test: (c, h) => { const j = h.json(c); return !!j && j.dashboard_panels.some((p) => /budget/i.test(p.title)); } },
        ],
        sim: [jsonTurn(SLO_DEF, { input_tokens: 640, output_tokens: 1100 })],
      },
    ],
  };

  PL.addWeek({
    week: 11,
    title: 'Governed Claude Code, DNS & load balancing, Key Vault, and the W11 SLO',
    stream: 'role',
    hours: 9,
    focus: 'Put guardrails on Claude Code with permission rules and managed settings, finish AZ-104 networking with Azure DNS and load balancers, move secrets to Key Vault and managed identities, and define the SLO that EV-RE-05 checks.',
    apply: 'Rotate one set of secrets end to end. Prove nothing is hard-coded. Define one SLO from user-visible behaviour and publish the Grafana dashboard. This is the SLO that EV-RE-05 checks.',
    topics: [t1, t2, t3, t4, t5],
  });
})();
