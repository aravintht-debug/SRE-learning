/* Week 8 · Role-critical: AZ-104 containers and App Service, Microsoft Entra ID Governance (PIM, access reviews,
   lifecycle workflows). Apply: review privileged access, remove what is not needed, evidence one leaver or mover.
   Structure follows week01.js. Run `node tests/validate.js --week 8` after editing. */
(function () {
  'use strict';
  const PL = window.PL;
  const { ADAPTIVE, user, L, obj, arr, en, S, jsonFormat, textTurn, jsonTurn, think } = PL.B;

  const SRC = {
    az104: { label: 'Microsoft Learn · AZ-104 study guide (skills measured)', url: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104' },
    acr: { label: 'Microsoft Learn · Azure Container Registry overview', url: 'https://learn.microsoft.com/en-us/azure/container-registry/container-registry-intro' },
    acrSku: { label: 'Microsoft Learn · Azure Container Registry service tiers', url: 'https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus' },
    aci: { label: 'Microsoft Learn · Azure Container Instances overview', url: 'https://learn.microsoft.com/en-us/azure/container-instances/container-instances-overview' },
    aca: { label: 'Microsoft Learn · Azure Container Apps overview', url: 'https://learn.microsoft.com/en-us/azure/container-apps/overview' },
    acaScale: { label: 'Microsoft Learn · Scaling in Azure Container Apps', url: 'https://learn.microsoft.com/en-us/azure/container-apps/scale-app' },
    acaCli: { label: 'Microsoft Learn · az containerapp CLI reference', url: 'https://learn.microsoft.com/en-us/cli/azure/containerapp' },
    plans: { label: 'Microsoft Learn · App Service plans', url: 'https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans' },
    scaleUp: { label: 'Microsoft Learn · Scale up an app in App Service', url: 'https://learn.microsoft.com/en-us/azure/app-service/manage-scale-up' },
    slots: { label: 'Microsoft Learn · Set up staging environments (deployment slots)', url: 'https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots' },
    slotCli: { label: 'Microsoft Learn · az webapp deployment slot CLI reference', url: 'https://learn.microsoft.com/en-us/cli/azure/webapp/deployment/slot' },
    domain: { label: 'Microsoft Learn · Map a custom DNS name to App Service', url: 'https://learn.microsoft.com/en-us/azure/app-service/app-service-web-tutorial-custom-domain' },
    tls: { label: 'Microsoft Learn · Add and manage TLS/SSL certificates in App Service', url: 'https://learn.microsoft.com/en-us/azure/app-service/configure-ssl-certificate' },
    backup: { label: 'Microsoft Learn · Back up an app in App Service', url: 'https://learn.microsoft.com/en-us/azure/app-service/manage-backup' },
    appNet: { label: 'Microsoft Learn · App Service networking features', url: 'https://learn.microsoft.com/en-us/azure/app-service/networking-features' },
    govOverview: { label: 'Microsoft Learn · Microsoft Entra ID Governance overview', url: 'https://learn.microsoft.com/en-us/entra/id-governance/identity-governance-overview' },
    pim: { label: 'Microsoft Learn · What is Privileged Identity Management?', url: 'https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure' },
    pimSettings: { label: 'Microsoft Learn · Configure Microsoft Entra role settings in PIM', url: 'https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-how-to-change-default-settings' },
    pimAzure: { label: 'Microsoft Learn · Assign Azure resource roles in PIM', url: 'https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-resource-roles-assign-roles' },
    reviews: { label: 'Microsoft Learn · What are access reviews?', url: 'https://learn.microsoft.com/en-us/entra/id-governance/access-reviews-overview' },
    lcw: { label: 'Microsoft Learn · What are lifecycle workflows?', url: 'https://learn.microsoft.com/en-us/entra/id-governance/what-are-lifecycle-workflows' },
    lcwTemplates: { label: 'Microsoft Learn · Lifecycle workflow templates', url: 'https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-templates' },
    rbacList: { label: 'Microsoft Learn · List Azure role assignments using Azure CLI', url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-cli' },
    projects: { label: 'Claude Help Center · What are Projects?', url: 'https://support.claude.com/en/articles/9517075-what-are-projects' },
    cowork: { label: 'Claude docs · Cowork overview', url: 'https://claude.com/docs/cowork/overview' },
    excel: { label: 'Claude docs · Use Claude for Excel', url: 'https://claude.com/docs/office-agents/excel' },
  };

  /* ---- lab files (synthetic) ---- */
  PL.PLACEHOLDERS.W08_ROLE_EXPORT = L(
    '# Privileged role assignments export, tenant contoso.example, taken 2026-09-29 (synthetic data)',
    '# Policy: privileged roles (Global Administrator, Owner, User Access Administrator, Key Vault Administrator) must be PIM-eligible,',
    '# except the two documented emergency access (break-glass) accounts. Leavers and movers must lose access within 1 business day.',
    'principal,principalType,role,scope,assignmentType,endDate,lastSignIn',
    'breakglass-01@contoso.example,User,Global Administrator,/,Active,permanent,2026-06-30',
    'breakglass-02@contoso.example,User,Global Administrator,/,Active,permanent,2026-06-30',
    'aisha.khan@contoso.example,User,Global Administrator,/,Eligible,2027-03-31,2026-09-28',
    'priya.nair@contoso.example,User,Owner,/subscriptions/sub-shop-prod,Active,permanent,2026-09-29',
    'tom.berg@contoso.example,User,User Access Administrator,/subscriptions/sub-shop-prod,Active,permanent,2026-09-25',
    'sam.okafor@contoso.example,User,Contributor,/subscriptions/sub-shop-prod/resourceGroups/rg-shop-prod,Eligible,2026-12-31,2026-09-27',
    'lena.fischer@contoso.example,User,Owner,/subscriptions/sub-shop-prod/resourceGroups/rg-data-prod,Active,permanent,2026-09-11',
    'marco.rossi@contoso.example,User,Key Vault Administrator,/subscriptions/sub-shop-prod/resourceGroups/rg-shop-prod/providers/Microsoft.KeyVault/vaults/kv-shop-prod,Eligible,2027-01-31,2026-09-15',
    'sp-github-deploy,ServicePrincipal,Contributor,/subscriptions/sub-shop-prod/resourceGroups/rg-shop-prod,Active,permanent,2026-09-29',
    'vendor.jo_partner.example#EXT#@contoso.example,Guest,Contributor,/subscriptions/sub-shop-staging,Active,permanent,2026-05-12',
    '',
    '# HR feed (synthetic)',
    'employee,event,effectiveDate,detail',
    'lena.fischer@contoso.example,leaver,2026-09-12,Left the company',
    'marco.rossi@contoso.example,mover,2026-09-01,Moved from Platform team to Finance; no longer needs platform access',
    'vendor.jo_partner.example,contract,2026-06-30,Vendor contract ended'
  );
  PL.FILE_LABELS.W08_ROLE_EXPORT = 'privileged-role-assignments.csv';

  /* ---- expert answers used by the sims ---- */
  const CONTAINERS_ANSWER = L(
    '```bash',
    '# 1. Registry: Standard tier, admin user left disabled (the default)',
    'az acr create --resource-group rg-orders-sbx --name acrorderssbx --sku Standard --location westeurope',
    '',
    '# 2. Build the image in the registry (no local Docker needed)',
    'az acr build --registry acrorderssbx --image orders-api:1.4.0 .',
    '',
    '# 3. Container Apps environment',
    'az containerapp env create --resource-group rg-orders-sbx --name cae-orders-sbx --location westeurope',
    '',
    '# 4. Container app: pulls with its system-assigned managed identity (AcrPull), 1 to 10 replicas',
    'az containerapp create --resource-group rg-orders-sbx --name ca-orders-api \\',
    '  --environment cae-orders-sbx \\',
    '  --image acrorderssbx.azurecr.io/orders-api:1.4.0 \\',
    '  --registry-server acrorderssbx.azurecr.io --registry-identity system \\',
    '  --ingress external --target-port 8080 \\',
    '  --cpu 0.5 --memory 1.0Gi \\',
    '  --min-replicas 1 --max-replicas 10 \\',
    '  --scale-rule-name http-rule --scale-rule-type http --scale-rule-http-concurrency 50',
    '',
    '# 5. Verify',
    'az containerapp show -g rg-orders-sbx -n ca-orders-api --query "properties.template.scale"',
    'az containerapp revision list -g rg-orders-sbx -n ca-orders-api -o table',
    '```',
    '',
    '- `--registry-identity system`: no registry password anywhere; the CLI assigns AcrPull to the identity where it can.',
    '- `--min-replicas 1`: keeps one replica warm (the default minimum is 0, which allows scale to zero and cold starts).',
    '- `--max-replicas 10`: caps cost; the HTTP rule adds replicas when concurrent requests per replica exceed 50.',
    '- For a one-off batch job with no scaling needs, Azure Container Instances is simpler: `az container create ... --restart-policy Never`.'
  );

  const APPSVC_ANSWER = L(
    '```bash',
    '# 1. Plan: Standard S1 or higher is needed for deployment slots and autoscale',
    'az appservice plan create --resource-group rg-web-sbx --name asp-web-sbx --sku S1 --is-linux',
    '',
    '# 2. App, HTTPS only, TLS 1.2 minimum',
    'az webapp create --resource-group rg-web-sbx --plan asp-web-sbx --name app-shop-sbx --runtime "NODE:20-lts"',
    'az webapp update --resource-group rg-web-sbx --name app-shop-sbx --https-only true',
    'az webapp config set --resource-group rg-web-sbx --name app-shop-sbx --min-tls-version 1.2',
    '',
    '# 3. Staging slot; keep the environment name on each slot (slot setting, not swapped)',
    'az webapp deployment slot create --resource-group rg-web-sbx --name app-shop-sbx --slot staging --configuration-source app-shop-sbx',
    'az webapp config appsettings set --resource-group rg-web-sbx --name app-shop-sbx --slot staging \\',
    '  --settings APP_ENV=staging --slot-settings APP_ENV',
    '',
    '# 4. Deploy to staging, test https://app-shop-sbx-staging.azurewebsites.net, then swap with preview',
    'az webapp deployment slot swap --resource-group rg-web-sbx --name app-shop-sbx --slot staging --target-slot production --action preview',
    '# ...validate staging with production settings, then complete:',
    'az webapp deployment slot swap --resource-group rg-web-sbx --name app-shop-sbx --slot staging --target-slot production --action swap',
    '# or cancel:  --action reset',
    '```',
    '',
    '- **Rollback:** swap the same two slots again to get the last known good version back.',
    '- Custom domains, non-public certificates, TLS settings and scale settings stay with the slot and are not swapped.',
    '- Backups: automatic backups run hourly on Basic and higher; add a custom backup to a storage account if you need longer retention or downloads.'
  );

  const REVIEW = {
    review_date: '2026-09-29',
    findings: [
      { principal: 'priya.nair@contoso.example', role: 'Owner', scope: '/subscriptions/sub-shop-prod', issue: 'standing_privileged', action: 'convert_to_eligible', reason: 'Permanent active Owner on production. Make it PIM-eligible with MFA, justification and approval on activation.' },
      { principal: 'tom.berg@contoso.example', role: 'User Access Administrator', scope: '/subscriptions/sub-shop-prod', issue: 'standing_privileged', action: 'convert_to_eligible', reason: 'Standing ability to grant any role on production. Convert to eligible with approval.' },
      { principal: 'lena.fischer@contoso.example', role: 'Owner', scope: '/subscriptions/sub-shop-prod/resourceGroups/rg-data-prod', issue: 'leaver_with_access', action: 'remove', reason: 'Left on 2026-09-12; still holds permanent Owner 17 days later, breaching the 1 business day policy. Remove now, disable the account, and check sign-in logs since 2026-09-12.' },
      { principal: 'marco.rossi@contoso.example', role: 'Key Vault Administrator', scope: '/subscriptions/sub-shop-prod/resourceGroups/rg-shop-prod/providers/Microsoft.KeyVault/vaults/kv-shop-prod', issue: 'mover_with_access', action: 'remove', reason: 'Moved to Finance on 2026-09-01 and no longer needs platform access. Remove the eligible assignment; check activations since the move.' },
      { principal: 'vendor.jo_partner.example#EXT#@contoso.example', role: 'Contributor', scope: '/subscriptions/sub-shop-staging', issue: 'stale_guest', action: 'remove', reason: 'Vendor contract ended 2026-06-30 and no sign-in since 2026-05-12. Remove the assignment and the guest account.' },
      { principal: 'sp-github-deploy', role: 'Contributor', scope: '/subscriptions/sub-shop-prod/resourceGroups/rg-shop-prod', issue: 'ok', action: 'review', reason: 'Workload identity for the pipeline, not a PIM candidate. Keep, but review whether a narrower role is enough and that it uses OIDC federation, not a client secret.' },
      { principal: 'breakglass-01@contoso.example', role: 'Global Administrator', scope: '/', issue: 'ok', action: 'keep', reason: 'Documented emergency access account: stays permanent active, excluded from PIM conversion; monitor its sign-ins.' },
      { principal: 'breakglass-02@contoso.example', role: 'Global Administrator', scope: '/', issue: 'ok', action: 'keep', reason: 'Second emergency access account; same treatment as breakglass-01.' },
      { principal: 'aisha.khan@contoso.example', role: 'Global Administrator', scope: '/', issue: 'ok', action: 'keep', reason: 'Already PIM-eligible with an end date.' },
      { principal: 'sam.okafor@contoso.example', role: 'Contributor', scope: '/subscriptions/sub-shop-prod/resourceGroups/rg-shop-prod', issue: 'ok', action: 'keep', reason: 'Eligible, scoped to one resource group, with an end date.' },
    ],
    break_glass_excluded: ['breakglass-01@contoso.example', 'breakglass-02@contoso.example'],
    summary: 'Two standing privileged assignments to convert to PIM-eligible, one leaver and one mover with remaining access (both past the 1 business day limit), and one stale guest to remove. Break-glass accounts stay permanent by design.',
  };

  /* =====================================================================
     Topic 1 — AZ-104 · Containers
     ===================================================================== */
  const t1 = {
    id: 'w08-t1',
    title: 'AZ-104 · Containers: ACR, Container Instances and Container Apps',
    programmeItem: 'AZ-104 slot · Provision and manage containers: Azure Container Registry, Container Instances, Container Apps, sizing and scaling (free: Microsoft Learn)',
    blurb: 'Store images in Azure Container Registry, run simple containers in Azure Container Instances, and run scalable services in Azure Container Apps, with the right size and scale rules.',
    outcomes: [
      'Choose between Container Instances and Container Apps for a workload',
      'Create a registry and a container app that pulls with a managed identity',
      'Configure replicas and HTTP scale rules for a container app',
    ],
    concepts: [
      { t: 'Azure Container Registry', d: 'A private registry for container images and artifacts. Tiers are Basic, Standard and Premium; Premium adds features such as geo-replication and private endpoints.', ex: 'az acr create --sku Standard' },
      { t: 'Pull with identity', d: 'Let the app pull images with a managed identity that has AcrPull, instead of turning on the registry admin user or storing a password.', ex: '--registry-identity system' },
      { t: 'Container Instances', d: 'Run a container or container group quickly with no orchestration. Good for simple tasks and batch jobs; you set CPU, memory and a restart policy.', ex: 'az container create --restart-policy Never' },
      { t: 'Container Apps', d: 'A serverless platform for microservices and APIs, with revisions, ingress and automatic scaling, running in a Container Apps environment.', ex: 'az containerapp create --environment ...' },
      { t: 'Scaling', d: 'Set minimum and maximum replicas (default 0 to 10) and rules: HTTP, TCP or custom KEDA scalers. With min 0 the app scales to zero; set min 1 or more to avoid cold starts.', ex: '--min-replicas 1 --max-replicas 10' },
      { t: 'Sizing', d: 'Each container gets CPU and memory. In Container Apps they are set per container; scale out adds replicas, since vertical scaling is not supported.', ex: '--cpu 0.5 --memory 1.0Gi' },
    ],
    leverage: [
      { t: 'Pick the platform', d: 'Describe the workload (always on or batch, HTTP or queue, traffic pattern) and ask Claude to compare ACI, Container Apps and App Service for it in a table.' },
      { t: 'Scale rules from real traffic', d: 'Give Claude your request rate and latency targets and ask it to propose min and max replicas and an HTTP concurrency value, with the reasoning.' },
      { t: 'Identity, not passwords', d: 'Ask Claude to rewrite any script that uses --registry-password or the ACR admin user to use a managed identity instead.' },
    ],
    sources: [SRC.acr, SRC.acrSku, SRC.aci, SRC.aca, SRC.acaScale, SRC.az104],
    quiz: [
      { q: 'A container app must never have a cold start. Which setting matters?', options: ['--max-replicas 1', '--min-replicas 1 (or more)', '--ingress internal'], a: 1, why: 'The default minimum is 0, which lets the app scale to zero.' },
      { q: 'What is the recommended way for a container app to pull from ACR?', options: ['Enable the ACR admin user', 'A managed identity with AcrPull', 'A public registry'], a: 1, why: 'Managed identity removes stored registry credentials.' },
      { q: 'A nightly script runs for 10 minutes in a container and exits. The simplest service?', options: ['Azure Container Instances with restart policy Never', 'A VM Scale Set', 'App Service Premium'], a: 0, why: 'ACI runs a single container with no orchestration, and you pay while it runs.' },
    ],
    steps: [
      {
        id: 'w08-t1-s1', kind: 'guide', title: 'Study coach and a sandbox container app', minutes: 45, source: SRC.acaScale,
        scenario: 'Use your AZ-104 study Project for the container objectives, then deploy a small container app in a sandbox and watch it scale.',
        task: [
          'Run prompt 1 in your AZ-104 study Project and answer each question before reading the explanation.',
          'Run prompt 2 in Claude Code, deploy in a sandbox, and generate some load (for example with a simple loop of curl requests).',
          'Watch the replica count change, then delete the resource group.',
        ],
        prompts: [
          { label: 'Practice questions', where: 'claude.ai', text: 'Quiz me with 6 AZ-104 scenario questions on containers: ACR tiers and authentication, ACI container groups and restart policies, Container Apps environments, revisions, replicas and scale rules, and sizing CPU and memory. One at a time; after each answer explain why the wrong options are wrong and name the Microsoft Learn page.' },
          { label: 'Deploy and scale', where: 'Claude Code', text: 'Write a script for a sandbox: create resource group rg-aca-sbx, an ACR (Standard), build a tiny HTTP container from a Dockerfile in this folder with az acr build, and deploy it to Container Apps with a system-assigned identity for the registry pull, external ingress on port 8080, min 0 and max 5 replicas, and an HTTP scale rule of 10 concurrent requests. Then give me a command to watch the replica count and a simple load loop. No passwords or admin user.' },
        ],
        expected: ['Six practice questions with explanations', 'A running container app that scaled out under load and back in afterwards', 'No registry admin user or password used'],
        verify: 'Check the flag names against the az containerapp CLI reference and the default scale limits on the Container Apps scaling page.',
        atWork: 'Use Claude to draft the deployment and the load test, and use the replica count you observe, not the theory, to set production limits.',
        checks: [
          { id: 'quiz', label: 'I answered the six questions and reviewed the wrong answers', manual: true },
          { id: 'scale', label: 'I saw the app scale out under load and back in', manual: true },
          { id: 'cleanup', label: 'I deleted the sandbox resource group', manual: true },
        ],
      },
      {
        id: 'w08-t1-s2', title: 'az CLI: registry and a container app with replicas and scale rule', minutes: 8, source: SRC.acaCli,
        scenario: 'Ask Claude for the exact az CLI to create a registry and a container app that pulls with a managed identity and scales between 1 and 10 replicas.',
        task: ['Click <b>Run</b>.', 'Check the replicas, the scale rule and the registry authentication.', 'Confirm no password or admin user is used.'],
        atWork: 'Ask Claude for the command, a one-line reason for each important flag, and the verify command. You get a script for your runbook and practice for the exam.',
        hint: 'az containerapp create takes --registry-identity system to pull from ACR without a password.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' },
          system: 'You are an Azure administrator coach. Give exact Azure CLI commands and never use registry passwords or the ACR admin user.',
          messages: user('Sandbox resource group rg-orders-sbx in westeurope. Create a Standard ACR named acrorderssbx, build image orders-api:1.4.0 from the current folder, create a Container Apps environment cae-orders-sbx, and deploy container app ca-orders-api from that image: external ingress on port 8080, 0.5 CPU and 1 GiB, at least 1 and at most 10 replicas, HTTP scale rule at 50 concurrent requests, pulling with a managed identity. Then show how to verify the scale settings.'),
        },
        checks: [
          { id: 'acr', label: 'Creates the registry with az acr create and a --sku', test: (c, h) => /az acr create[^\n]*--sku\s+(Basic|Standard|Premium)/i.test(h.text(c)) },
          { id: 'app', label: 'Uses az containerapp create', test: (c, h) => /az containerapp create/.test(h.text(c)) },
          { id: 'replicas', label: 'Sets --min-replicas 1 and --max-replicas 10', test: (c, h) => /--min-replicas\s+1\b/.test(h.text(c)) && /--max-replicas\s+10\b/.test(h.text(c)) },
          { id: 'rule', label: 'Adds an HTTP scale rule at 50 concurrent requests', test: (c, h) => /--scale-rule-http-concurrency\s+50/.test(h.text(c)) },
          { id: 'identity', label: 'Pulls with a managed identity, no password or admin user', test: (c, h) => /--registry-identity/.test(h.text(c)) && !/--registry-password|--admin-enabled\s+true/.test(h.text(c)) },
        ],
        sim: [textTurn(CONTAINERS_ANSWER, { input_tokens: 200, output_tokens: 620 })],
      },
    ],
  };

  /* =====================================================================
     Topic 2 — AZ-104 · App Service
     ===================================================================== */
  const t2 = {
    id: 'w08-t2',
    title: 'AZ-104 · App Service: plans, scaling, TLS, domains, backup, networking, slots',
    programmeItem: 'AZ-104 slot · Create and configure Azure App Service (free: Microsoft Learn)',
    blurb: 'Provision App Service plans and apps, scale them, secure them with TLS and custom domains, back them up, connect them to networks, and release safely with deployment slots.',
    outcomes: [
      'Pick an App Service plan tier for the features you need (slots, autoscale, backup)',
      'Configure HTTPS only, minimum TLS, a custom domain and a certificate',
      'Release with a staging slot, swap with preview, and roll back',
    ],
    concepts: [
      { t: 'App Service plan', d: 'The compute your apps run on: region, OS, instance size and count. Apps in the same plan share it. The tier decides which features you get.', ex: 'az appservice plan create --sku S1' },
      { t: 'Scale up and out', d: 'Scale up changes the tier or size; scale out adds instances, manually or with autoscale rules in supported tiers.', ex: 'az appservice plan update --number-of-workers 3' },
      { t: 'TLS and custom domains', d: 'Map a custom domain with a CNAME or A record plus a TXT verification record, then bind a certificate (a free managed certificate or your own). Turn on HTTPS only and set a minimum TLS version.', ex: 'asuid.www TXT record for verification' },
      { t: 'Backup', d: 'Basic and higher tiers get automatic hourly backups kept for 30 days. Custom backups to a storage account give you schedules, downloads and longer retention.', ex: 'az webapp config snapshot list' },
      { t: 'Networking', d: 'Inbound: access restrictions and private endpoints. Outbound: VNet integration to reach private resources.', ex: 'az webapp vnet-integration add' },
      { t: 'Deployment slots', d: 'Standard, Premium and Isolated tiers support slots: live apps with their own host names. Swap warms up the source first; swap with preview lets you test with production settings; swap back to roll back.', ex: 'az webapp deployment slot swap --action preview' },
    ],
    leverage: [
      { t: 'Release runbooks', d: 'Ask Claude for a slot-based release runbook for your app: deploy to staging, smoke test, swap with preview, complete, and the rollback swap.' },
      { t: 'Settings audit', d: 'Paste az webapp show and config output (secrets removed) and ask Claude to flag HTTPS-only off, old TLS versions, missing health checks and settings that should be slot settings.' },
      { t: 'DNS change plans', d: 'Ask Claude for the exact DNS records to add for a custom domain and the order of steps, so there is no downtime during cutover.' },
    ],
    sources: [SRC.plans, SRC.scaleUp, SRC.slots, SRC.domain, SRC.tls, SRC.backup, SRC.appNet],
    quiz: [
      { q: 'Your app is on the Basic tier and you need a staging slot. What must change?', options: ['Nothing', 'Scale up to Standard, Premium or Isolated', 'Enable VNet integration'], a: 1, why: 'Deployment slots need the Standard tier or higher.' },
      { q: 'Which is NOT swapped between slots?', options: ['App settings (not marked as slot settings)', 'Custom domain names and TLS settings', 'Language framework version'], a: 1, why: 'Custom domains, non-public certificates and TLS settings stay with the slot.' },
      { q: 'A swap put a bad version in production. The fastest rollback?', options: ['Redeploy from source', 'Swap the same two slots again', 'Restore from backup'], a: 1, why: 'After a swap the staging slot holds the previous production app, so swapping back restores it.' },
    ],
    steps: [
      {
        id: 'w08-t2-s1', kind: 'guide', title: 'Study coach: domains, TLS and backup in a sandbox', minutes: 45, source: SRC.domain,
        scenario: 'Use Claude as a study coach for App Service, then practise a custom domain, a managed certificate and a backup restore in a sandbox.',
        task: [
          'Run prompt 1 in your AZ-104 study Project.',
          'Run prompt 2 and follow the lab in a sandbox. Use a test domain or subdomain you control.',
          'Restore one automatic backup to a new slot and compare it with production.',
        ],
        prompts: [
          { label: 'Practice questions', where: 'claude.ai', text: 'Quiz me with 8 AZ-104 scenario questions on App Service: choosing a plan tier, scale up vs scale out and autoscale, custom domains and DNS verification, TLS certificates and bindings, backup types and limits, VNet integration vs private endpoints, and deployment slots (what is swapped, swap with preview). One at a time, explain why wrong options are wrong, and name the Microsoft Learn page.' },
          { label: 'Sandbox lab', where: 'claude.ai', text: 'Give me an az CLI lab for a sandbox app app-lab-sbx on an S1 Linux plan: set HTTPS only and minimum TLS 1.2, map the custom domain lab.[my-test-domain] (list the exact DNS records to create first), create a free managed certificate and bind it, list automatic backups, and restore one to a new slot named restore-test. Explain each step and what can fail. No secrets.' },
        ],
        expected: ['Eight scenario questions with explanations', 'A custom domain with a bound certificate and HTTPS only', 'A backup restored to a slot without touching production'],
        verify: 'Check the DNS record names and the certificate binding steps on the Microsoft Learn custom domain and certificate pages.',
        atWork: 'Ask Claude for the DNS records and the order of the steps before any domain change, then have a colleague review it before you touch production DNS.',
        checks: [
          { id: 'quiz', label: 'I completed the eight questions and reviewed wrong answers', manual: true },
          { id: 'domain', label: 'I mapped a test domain and bound a certificate', manual: true },
          { id: 'restore', label: 'I restored a backup to a slot', manual: true },
        ],
      },
      {
        id: 'w08-t2-s2', title: 'az CLI: plan, HTTPS, staging slot and swap with preview', minutes: 8, source: SRC.slotCli,
        scenario: 'Ask Claude for the az CLI to set up a web app for safe releases: a plan that supports slots, HTTPS only, TLS 1.2, a staging slot with a slot setting, and a swap with preview.',
        task: ['Click <b>Run</b>.', 'Check the plan tier, the security settings and the swap sequence.', 'Find the rollback step.'],
        atWork: 'Turn this into your release runbook and pipeline: deploy to staging, test, swap with preview, complete. Rollback is one more swap.',
        hint: 'Slots need Standard or higher. A swap with preview uses --action preview, then --action swap (or reset to cancel).',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' },
          system: 'You are an Azure administrator coach. Give exact Azure CLI commands and explain important flags in one line.',
          messages: user('Sandbox resource group rg-web-sbx. Create a Linux App Service plan asp-web-sbx that supports deployment slots, a Node 20 web app app-shop-sbx with HTTPS only and minimum TLS 1.2, a staging slot where APP_ENV=staging stays with the slot, and the commands to swap staging into production with preview, complete it, or cancel it. Include how to roll back.'),
        },
        checks: [
          { id: 'plan', label: 'Creates a plan at Standard or higher (slots supported)', test: (c, h) => /az appservice plan create[^\n]*--sku\s+(S\d|P\d+v\d|I\d+v\d)/i.test(h.text(c)) },
          { id: 'https', label: 'Sets HTTPS only and minimum TLS 1.2', test: (c, h) => /--https-only\s+true/.test(h.text(c)) && /--min-tls-version\s+1\.2/.test(h.text(c)) },
          { id: 'slot', label: 'Creates the staging slot and a slot setting', test: (c, h) => /az webapp deployment slot create[^\n]*--slot\s+staging/.test(h.text(c)) && /--slot-settings\s+APP_ENV/.test(h.text(c)) },
          { id: 'swap', label: 'Swaps into production with --action preview, then swap', test: (c, h) => /az webapp deployment slot swap[^\n]*--target-slot\s+production[^\n]*--action\s+preview/.test(h.text(c)) && /--action\s+swap/.test(h.text(c)) },
          { id: 'rollback', label: 'Explains rollback by swapping again', test: (c, h) => /roll ?back/i.test(h.text(c)) && /swap/i.test(h.text(c)) },
        ],
        sim: [textTurn(APPSVC_ANSWER, { input_tokens: 190, output_tokens: 640 })],
      },
    ],
  };

  /* =====================================================================
     Topic 3 — Microsoft Entra ID Governance
     ===================================================================== */
  const t3 = {
    id: 'w08-t3',
    title: 'Microsoft Entra ID Governance: PIM, access reviews and lifecycle workflows',
    programmeItem: 'Microsoft Entra ID governance: Privileged Identity Management, access reviews, lifecycle workflows (free: Microsoft Learn)',
    blurb: 'Replace standing admin access with just-in-time roles, prove access is still needed with regular reviews, and automate joiner, mover and leaver changes. Claude drafts the designs; you check them against the docs and your policy.',
    outcomes: [
      'Design PIM role settings: eligible vs active, activation duration, MFA, justification, approval',
      'Plan recurring access reviews for privileged roles, groups and guests',
      'Draft joiner, mover and leaver lifecycle workflows, and review an access export with Claude',
    ],
    concepts: [
      { t: 'Eligible vs active', d: 'An eligible assignment must be activated before use, for a limited time. An active assignment is always on. Privileged roles should be eligible, except emergency access accounts.', ex: 'Owner: eligible, max 4 h activation' },
      { t: 'PIM role settings', d: 'Per role: activation maximum duration (1 to 24 hours), MFA or a Conditional Access authentication context on activation, justification, ticket number, approval, assignment expiry, and notifications.', ex: 'Require approval + 2 approvers' },
      { t: 'Emergency access', d: 'Keep two break-glass accounts with permanent Global Administrator, excluded from normal PIM and approval flows so you cannot lock yourself out. Monitor their sign-ins.', ex: 'breakglass-01, breakglass-02' },
      { t: 'Access reviews', d: 'Recurring reviews (weekly to annually) where owners, managers or the users themselves confirm access. They cover groups, apps, access packages, Entra roles and Azure resource roles, and can remove denied access automatically.', ex: 'Quarterly review of Owner on prod' },
      { t: 'Lifecycle workflows', d: 'Automated joiner, mover and leaver tasks triggered by user attributes such as employeeHireDate or employeeLeaveDateTime: send emails, add or remove groups, disable and delete accounts.', ex: 'Leaver: disable account on last day' },
      { t: 'Licensing', d: 'Lifecycle workflows and many access review features need Microsoft Entra ID Governance or Entra Suite; some capabilities work with Entra ID P2. Check before you design.', ex: 'licensing fundamentals page' },
    ],
    leverage: [
      { t: 'Draft the PIM design', d: 'Give Claude your role list and risk rules and ask for a table of PIM settings per role. Review it with security before configuring anything.' },
      { t: 'Review access exports', d: 'Export role assignments and an HR feed (synthetic or redacted), and ask Claude to flag standing privilege, leavers and movers with access, and stale guests, as JSON you can track.' },
      { t: 'Write JML workflows', d: 'Ask Claude to turn your joiner, mover and leaver process into lifecycle workflow triggers and tasks, and to point out steps that need a person.' },
      { t: 'Evidence packs', d: 'Use Claude for Excel on review exports to build an evidence sheet: who was reviewed, decisions, removals and dates.' },
    ],
    sources: [SRC.govOverview, SRC.pim, SRC.pimSettings, SRC.pimAzure, SRC.reviews, SRC.lcw],
    quiz: [
      { q: 'Which assignment should a production Owner role normally have?', options: ['Permanent active', 'PIM-eligible with MFA, justification and time-limited activation', 'None, use a shared account'], a: 1, why: 'Just-in-time activation removes standing privilege and leaves an audit trail.' },
      { q: 'What is the maximum activation duration you can set for a PIM role?', options: ['1 hour', '24 hours', '30 days'], a: 1, why: 'The activation maximum duration can be set from one to 24 hours.' },
      { q: 'Why are break-glass accounts excluded from PIM approval?', options: ['They are not important', 'So an approval or MFA failure cannot lock everyone out of the tenant', 'To save licences'], a: 1, why: 'The PIM docs warn about lockout if all admins are eligible, approval is required and no approvers are configured.' },
    ],
    steps: [
      {
        id: 'w08-t3-s1', kind: 'guide', title: 'Draft a PIM design, an access review plan and JML workflows', minutes: 50, source: SRC.pimSettings,
        scenario: 'Use Claude to draft your team\'s identity governance design, then check each part against Microsoft Learn before anyone configures it.',
        task: [
          'Create a claude.ai Project "Identity governance" and add your (redacted) role list and joiner, mover and leaver process as knowledge.',
          'Run prompts 1 to 3 and turn each result into an Artifact.',
          'Check every setting against the Microsoft Learn pages linked in this topic, and mark what needs licences you do not have.',
        ],
        prompts: [
          { label: 'PIM role design', where: 'claude.ai', text: 'Draft a PIM design for these roles: Global Administrator, Privileged Role Administrator, Owner and User Access Administrator on production subscriptions, Contributor on production resource groups, Key Vault Administrator. For each give: eligible or active, activation maximum duration, MFA or authentication context on activation, justification, ticket number, approval and approvers, assignment expiry, and notifications. Keep two emergency access accounts permanent and explain how they are protected and monitored. Output a table, then the risks of your design. Use placeholders, not real names.' },
          { label: 'Access review plan', where: 'claude.ai', text: 'Draft an access review plan: what to review (privileged Entra roles, Azure resource roles on production, groups that grant production access, guest users), how often, who reviews, what happens if reviewers do not respond, and whether results are applied automatically. Output a table, plus a one-paragraph note for auditors on how this shows access is reviewed.' },
          { label: 'JML lifecycle workflows', where: 'claude.ai', text: 'Turn our joiner, mover and leaver process (in the Project knowledge) into Microsoft Entra lifecycle workflows. For each workflow give the trigger (attribute and offset, e.g. employeeLeaveDateTime), scope, and tasks in order. Flag any step that lifecycle workflows cannot do and needs a person or a Logic App, and how a mover loses old access. Output as a table per workflow.' },
        ],
        expected: ['A PIM table with every role, with break-glass accounts handled separately', 'An access review plan with frequency, reviewers and auto-apply decisions', 'Three lifecycle workflows with triggers and tasks, and gaps flagged'],
        verify: 'Check each PIM setting name and limit on the "Configure Microsoft Entra role settings in PIM" page, and the licensing notes on the access reviews and lifecycle workflows pages.',
        atWork: 'Claude produces a complete first draft in minutes. Your security lead and the docs decide the final settings, and the Artifact becomes the design record.',
        checks: [
          { id: 'pim', label: 'I have a PIM design table checked against Microsoft Learn', manual: true },
          { id: 'reviews', label: 'I have an access review plan with owners and frequency', manual: true },
          { id: 'jml', label: 'I have joiner, mover and leaver workflows with gaps flagged', manual: true },
        ],
      },
      {
        id: 'w08-t3-s2', title: 'Review a privileged access export for standing access and leavers', minutes: 10, source: SRC.pim, files: ['W08_ROLE_EXPORT'],
        scenario: 'You have an export of privileged role assignments and an HR feed (synthetic). Ask Claude for a structured review against the stated policy.',
        task: ['Read <code>privileged-role-assignments.csv</code> and make your own list first.', 'Click <b>Run</b>. Claude returns JSON findings.', 'Compare: did it convert the right assignments, catch the leaver and mover, and leave the break-glass accounts alone?'],
        atWork: 'Run this every review cycle on a real export (redacted). The JSON becomes your tracking list, and every removal still goes through your change process.',
        hint: 'Emergency access accounts stay permanent by design. Service principals are not PIM candidates; review their scope instead.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: { effort: 'high', format: jsonFormat(obj({ review_date: S, findings: arr(obj({ principal: S, role: S, scope: S, issue: en('standing_privileged', 'leaver_with_access', 'mover_with_access', 'stale_guest', 'ok'), action: en('convert_to_eligible', 'remove', 'review', 'keep'), reason: S })), break_glass_excluded: arr(S), summary: S })) },
          system: 'You are an identity governance reviewer for a cloud platform team. Apply the stated policy exactly, and never recommend changes that could lock the organization out of its tenant.',
          messages: user(L('<export>', '{{W08_ROLE_EXPORT}}', '</export>', 'Review every assignment against the policy in the file. Give one finding per assignment.')),
        },
        checks: [
          { id: 'standing', label: 'Converts Priya\'s Owner and Tom\'s User Access Administrator to eligible', test: (c, h) => { const j = h.json(c); if (!j) return false; const f = (p) => j.findings.find((x) => x.principal.startsWith(p)); return !!f('priya.nair') && f('priya.nair').action === 'convert_to_eligible' && !!f('tom.berg') && f('tom.berg').action === 'convert_to_eligible'; } },
          { id: 'leaver', label: 'Flags Lena (leaver) for removal', test: (c, h) => { const j = h.json(c); const f = j && j.findings.find((x) => x.principal.startsWith('lena.fischer')); return !!f && f.issue === 'leaver_with_access' && f.action === 'remove'; } },
          { id: 'mover', label: 'Flags Marco (mover) for removal', test: (c, h) => { const j = h.json(c); const f = j && j.findings.find((x) => x.principal.startsWith('marco.rossi')); return !!f && f.issue === 'mover_with_access' && f.action === 'remove'; } },
          { id: 'guest', label: 'Removes the stale vendor guest', test: (c, h) => { const j = h.json(c); const f = j && j.findings.find((x) => /^vendor\.jo/.test(x.principal)); return !!f && f.action === 'remove'; } },
          { id: 'breakglass', label: 'Keeps both break-glass accounts permanent (not converted)', test: (c, h) => { const j = h.json(c); return !!j && ['breakglass-01', 'breakglass-02'].every((b) => j.break_glass_excluded.some((x) => x.startsWith(b)) && j.findings.filter((x) => x.principal.startsWith(b)).every((x) => x.action === 'keep')); } },
          { id: 'sp', label: 'Does not try to make the pipeline service principal PIM-eligible', test: (c, h) => { const j = h.json(c); const f = j && j.findings.find((x) => x.principal === 'sp-github-deploy'); return !!f && f.action !== 'convert_to_eligible'; } },
        ],
        sim: [jsonTurn(REVIEW, { input_tokens: 900, output_tokens: 900 })],
      },
    ],
  };

  /* =====================================================================
     Topic 4 — Apply
     ===================================================================== */
  const t4 = {
    id: 'w08-t4',
    title: 'Apply: review privileged access and evidence a leaver or mover removal',
    programmeItem: 'Apply task · Review privileged access across the estate. Remove what is not needed. Evidence one leaver or mover removed within the stated period.',
    blurb: 'Run a real privileged access review across Azure, Entra ID and Proxmox, remove what is not needed through your change process, and keep evidence of one leaver or mover removal. This evidence feeds milestone EV-RE-05 in Week 16.',
    outcomes: [
      'Export and review privileged access across the estate',
      'Remove or convert unneeded access through the normal change process',
      'Produce evidence that one leaver or mover lost access within the stated period',
    ],
    concepts: [
      { t: 'Scope the estate', d: 'Entra roles, Azure RBAC on management groups and subscriptions, Key Vault access, pipeline identities, and the Proxmox and other on-premises admin accounts.', ex: 'az role assignment list --all' },
      { t: 'State the period first', d: 'Write down the policy before you look: for example "leavers and movers lose privileged access within 1 business day". Evidence is measured against it.', ex: 'HR effective date vs removal timestamp' },
      { t: 'Evidence, not claims', d: 'Keep exports, audit log entries with timestamps, the change or ticket reference, and a before and after view. Redact personal data you do not need.', ex: 'Entra audit log: Remove member from role' },
      { t: 'Change control', d: 'Removals are changes: ticket, approver, time, rollback (re-grant), and a note to the affected person or manager.', ex: 'CHG-6012: remove Owner from leaver' },
    ],
    leverage: [
      { t: 'Export commands', d: 'Ask Claude Code for the az CLI and Microsoft Graph queries to export role assignments and audit entries into CSV files.' },
      { t: 'Review in Excel', d: 'Open the exports with Claude for Excel to join them with the HR list, flag issues with cell citations, and build the evidence sheet.' },
      { t: 'Write the evidence note', d: 'Ask Claude to draft the one-page evidence summary from your sheet and audit entries, then check every date yourself.' },
    ],
    sources: [SRC.rbacList, SRC.pim, SRC.reviews, SRC.lcw, SRC.excel],
    quiz: [
      { q: 'What proves a leaver lost access within the period?', options: ['A statement in chat', 'The HR effective date plus an audit log entry showing the removal time, linked to a change record', 'The user no longer works here'], a: 1, why: 'Evidence must be timestamped and traceable to compare with the policy period.' },
      { q: 'You find a standing Owner assignment you think is not needed. First step?', options: ['Delete it immediately', 'Confirm with the owner or manager and raise a change, then remove or convert it to eligible', 'Ignore it'], a: 1, why: 'Removals are changes: confirm, record and have a rollback.' },
    ],
    steps: [
      {
        id: 'w08-t4-s1', kind: 'guide', title: 'Privileged access review with an evidence pack', minutes: 120, source: SRC.rbacList,
        scenario: 'Run the review on your real estate. Work from exports, redact personal data before sharing anything with Claude, and make every removal through your change process. Keep the evidence for EV-RE-05.',
        task: [
          'Write the policy and the period down first (prompt 1).',
          'Export the access (prompt 2), review it with Claude (prompt 3), and agree removals with owners.',
          'Remove or convert through your change process, then assemble the evidence pack (prompt 4) for one leaver or mover.',
        ],
        prompts: [
          { label: '1. Policy and period', where: 'claude.ai', text: 'Help me write a one-paragraph privileged access policy for our estate (Entra ID roles, Azure RBAC on production, Key Vault, pipeline identities, Proxmox admin accounts): which roles count as privileged, that they must be PIM-eligible except two documented break-glass accounts, and that leavers and movers lose privileged access within [N] business day(s) of the HR effective date. Keep it short enough to paste into a change record.' },
          { label: '2. Export the access', where: 'Claude Code', text: 'Write a script that exports to CSV: all Azure role assignments for Owner, User Access Administrator, Contributor and Key Vault roles across the subscriptions I can see (az role assignment list --all), Entra directory role assignments and PIM eligibility (Microsoft Graph via az rest), and the Entra audit log entries for role removals in the last 30 days. Read-only calls only. Do not print tokens. Output one file per source with a timestamp.' },
          { label: '3. Review against the policy', where: 'Claude for Excel', text: 'These sheets are our privileged access exports and the HR joiner, mover and leaver list (personal data minimized). Against the policy in cell A1 of the Policy sheet, flag: standing privileged assignments to convert to PIM-eligible, leavers and movers who still have access, stale guests, and service principals with broader access than needed. Put the findings on a new sheet with principal, role, scope, issue, action, and cite the source cells.' },
          { label: '4. Evidence pack', where: 'claude.ai', text: 'Draft a one-page evidence record for milestone EV-RE-05 (privileged access review and one JML removal). Sections: Scope and date of review; Policy and period; Findings summary (counts by issue); Removals and conversions with change references; JML evidence for [leaver or mover, pseudonymised]: HR effective date, removal timestamp from the audit log, time taken vs the period, change reference, who approved; Exceptions and follow-ups. Here are my notes and the audit entries:\n[paste redacted notes and entries]' },
        ],
        expected: ['A written policy with a clear removal period', 'Exports from every privileged source, reviewed against the policy', 'Unneeded access removed or converted to PIM-eligible through changes', 'An evidence record for one leaver or mover removal within the period'],
        verify: 'Check every date and timestamp in the evidence record against the original audit log entries, not against Claude\'s summary, and confirm the role names against the Azure and Entra built-in role lists.',
        atWork: 'Repeat this each quarter. Claude does the exporting, joining and drafting, and you own the decisions, the changes and the evidence. The record is reviewed again in Week 16 for EV-RE-05.',
        checks: [
          { id: 'policy', label: 'I wrote down the policy and the removal period before reviewing', manual: true },
          { id: 'export', label: 'I exported privileged access from every source (read-only)', manual: true },
          { id: 'removed', label: 'I removed or converted unneeded access through the change process', manual: true },
          { id: 'jml', label: 'I have audit evidence that one leaver or mover lost access within the period', manual: true },
          { id: 'record', label: 'The evidence record is saved for EV-RE-05, with personal data minimized', manual: true },
        ],
      },
    ],
  };

  PL.addWeek({
    week: 8,
    title: 'Containers, App Service and identity governance',
    stream: 'role',
    hours: 9,
    focus: 'AZ-104 compute part 2 (containers and App Service), then Microsoft Entra ID Governance: PIM, access reviews and lifecycle workflows, ending with a real privileged access review and a leaver or mover evidenced.',
    apply: 'Review privileged access across the estate. Remove what is not needed. Evidence one leaver or mover removed within the stated period.',
    topics: [t1, t2, t3, t4],
  });
})();
