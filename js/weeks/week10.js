/* Week 10 · Role-critical: AZ-104 secure access to VNets (NSGs, ASGs, effective rules, Bastion, service and
   private endpoints), Azure Backup ransomware protection, on-prem backup with Proxmox Backup Server and Percona
   Backup for MongoDB, and the restore test + Projects → Support handover gate (EV-RE-03).
   Structure follows week01.js. Run `node tests/validate.js --week 10` after editing. */
(function () {
  'use strict';
  const PL = window.PL;
  const { ADAPTIVE, user, L, obj, arr, en, S, B, jsonFormat, textTurn, jsonTurn, think } = PL.B;

  const SRC = {
    az104: { label: 'Microsoft Learn · AZ-104 study guide (skills measured)', url: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104' },
    nsg: { label: 'Microsoft Learn · Network security groups overview', url: 'https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview' },
    nsgHow: { label: 'Microsoft Learn · How network security groups filter traffic', url: 'https://learn.microsoft.com/en-us/azure/virtual-network/network-security-group-how-it-works' },
    asg: { label: 'Microsoft Learn · Application security groups', url: 'https://learn.microsoft.com/en-us/azure/virtual-network/application-security-groups' },
    diag: { label: 'Microsoft Learn · Diagnose a VM network traffic filter problem', url: 'https://learn.microsoft.com/en-us/azure/virtual-network/diagnose-network-traffic-filter-problem' },
    ipflow: { label: 'Microsoft Learn · Network Watcher IP flow verify', url: 'https://learn.microsoft.com/en-us/azure/network-watcher/ip-flow-verify-overview' },
    bastion: { label: 'Microsoft Learn · What is Azure Bastion?', url: 'https://learn.microsoft.com/en-us/azure/bastion/bastion-overview' },
    svcEp: { label: 'Microsoft Learn · Virtual network service endpoints', url: 'https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-service-endpoints-overview' },
    pe: { label: 'Microsoft Learn · What is a private endpoint?', url: 'https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview' },
    cliBastion: { label: 'Azure CLI reference · az network bastion', url: 'https://learn.microsoft.com/en-us/cli/azure/network/bastion' },
    cliPe: { label: 'Azure CLI reference · az network private-endpoint', url: 'https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint' },
    backup: { label: 'Microsoft Learn · What is Azure Backup?', url: 'https://learn.microsoft.com/en-us/azure/backup/backup-overview' },
    immutable: { label: 'Microsoft Learn · Immutable vault for Azure Backup', url: 'https://learn.microsoft.com/en-us/azure/backup/backup-azure-immutable-vault-concept' },
    softDelete: { label: 'Microsoft Learn · Secure by default with soft delete for Azure Backup', url: 'https://learn.microsoft.com/en-us/azure/backup/secure-by-default' },
    mua: { label: 'Microsoft Learn · Multi-user authorization using Resource Guard', url: 'https://learn.microsoft.com/en-us/azure/backup/multi-user-authorization-concept' },
    ransomware: { label: 'Microsoft Learn · Protect backups from ransomware (FAQ)', url: 'https://learn.microsoft.com/en-us/azure/backup/protect-backups-from-ransomware-faq' },
    backupSec: { label: 'Microsoft Learn · Azure Backup security overview', url: 'https://learn.microsoft.com/en-us/azure/backup/security-overview' },
    pbs: { label: 'Proxmox Backup Server documentation', url: 'https://pbs.proxmox.com/docs/' },
    pbsTech: { label: 'Proxmox Backup Server · Technical overview (chunks and deduplication)', url: 'https://pbs.proxmox.com/docs/technical-overview.html' },
    pbsMaint: { label: 'Proxmox Backup Server · Maintenance tasks (prune, GC, verify)', url: 'https://pbs.proxmox.com/docs/maintenance.html' },
    pbsRemotes: { label: 'Proxmox Backup Server · Managing remotes and sync jobs', url: 'https://pbs.proxmox.com/docs/managing-remotes.html' },
    pbm: { label: 'Percona Backup for MongoDB documentation', url: 'https://docs.percona.com/percona-backup-mongodb/' },
    pbmPitr: { label: 'Percona Backup for MongoDB · Point-in-time recovery', url: 'https://docs.percona.com/percona-backup-mongodb/features/point-in-time-recovery.html' },
    pbmRestore: { label: 'Percona Backup for MongoDB · Restore a backup', url: 'https://docs.percona.com/percona-backup-mongodb/usage/restore.html' },
    sreBook: { label: 'Google SRE Book (free online)', url: 'https://sre.google/sre-book/table-of-contents/' },
    claude101: { label: 'Anthropic Academy · Claude 101 (free)', url: 'https://anthropic.skilljar.com/claude-101' },
  };

  /* ---- lab files ---- */
  PL.PLACEHOLDERS.W10_NSG_SCENARIO = L(
    'VNet vnet-shop-prod 10.30.0.0/16',
    '  snet-web     10.30.1.0/24   vm-web-01 10.30.1.4 (member of ASG asg-web)',
    '  snet-app     10.30.2.0/24   vm-app-01 10.30.2.4 (member of ASG asg-app), NIC nic-app-01',
    '  snet-mon     10.30.3.0/24   prometheus-01 10.30.3.10',
    '  snet-db      10.30.4.0/24   vm-db-01 10.30.4.4 (no ASG)',
    '  AzureBastionSubnet 10.30.250.0/26',
    '',
    'NSG nsg-snet-app (associated with subnet snet-app), custom INBOUND rules:',
    '  100 allow-web-to-app   Allow  TCP  src ASG asg-web            dst ASG asg-app  port 8080',
    '  200 allow-bastion-ssh  Allow  TCP  src 10.30.250.0/26         dst *            port 22',
    '  300 deny-internet      Deny   *    src Internet               dst *            port *',
    '  + default rules: 65000 AllowVnetInBound, 65001 AllowAzureLoadBalancerInBound, 65500 DenyAllInBound',
    '',
    'NSG nsg-nic-app-01 (associated with NIC nic-app-01), custom INBOUND rules:',
    '  100 allow-8080-vnet    Allow  TCP  src VirtualNetwork          dst *            port 8080',
    '  150 deny-ssh-all       Deny   TCP  src *                       dst *            port 22',
    '  200 allow-node-exp     Allow  TCP  src 10.30.3.10              dst *            port 9100',
    '  + default rules: 65000 AllowVnetInBound, 65001 AllowAzureLoadBalancerInBound, 65500 DenyAllInBound',
    '',
    'Flows to evaluate (all inbound to vm-app-01 10.30.2.4):',
    '  F1  vm-web-01 10.30.1.4      → TCP 8080',
    '  F2  Bastion 10.30.250.5      → TCP 22',
    '  F3  prometheus-01 10.30.3.10 → TCP 9100',
    '  F4  Internet 203.0.113.50    → TCP 443',
    '  F5  vm-db-01 10.30.4.4       → TCP 8080',
    '',
    'Security intent: only the web tier may call the app on 8080; SSH only via Bastion; monitoring may scrape 9100.'
  );
  PL.FILE_LABELS.W10_NSG_SCENARIO = 'nsg-effective-rules-scenario.txt';

  PL.PLACEHOLDERS.W10_VAULT_POSTURE = L(
    'Recovery Services vault rsv-shop-prod (westeurope) · exported 2026-09-28',
    '  Protected items: 14 Azure VMs, 2 SQL Server in Azure VM databases, 1 Azure Files share',
    '  Storage redundancy: LocallyRedundant',
    '  Cross Region Restore: Disabled',
    '  Immutability: Enabled (not locked), based on backup policy',
    '  Soft delete: Enabled (secure by default), soft-delete retention: 14 days',
    '  Multi-user authorization: Enabled via Resource Guard rg-guard-sec (subscription sub-security)',
    '  Resource Guard role assignments:',
    '    grp-security-admins     Backup MUA Admin',
    '    grp-backup-admins       Contributor        <- same group that administers the vault',
    '  Vault role assignments:',
    '    grp-backup-admins       Backup Contributor',
    '  Backup policy pol-vm-daily: daily 23:00, retain daily 14 days, weekly 8 weeks, monthly 6 months',
    '  Alerts: Azure Monitor built-in alerts on; no action group attached (notifications not routed)',
    '  Last restore test: none recorded'
  );
  PL.FILE_LABELS.W10_VAULT_POSTURE = 'vault-posture-rsv-shop-prod.txt';

  PL.PLACEHOLDERS.W10_ONPREM_ENV = L(
    'On-prem estate (datacentre DC1) and off-site site (DC2)',
    '- Proxmox VE cluster pve-dc1 (6 nodes): 80 VMs and 25 LXC containers, backups every night to',
    '  Proxmox Backup Server pbs-dc1, datastore "main" (ZFS). Retention wanted: 7 daily, 4 weekly, 6 monthly.',
    '- A second PBS, pbs-dc2 (datastore "offsite"), sits in DC2 and must hold an off-site copy.',
    '  Security requirement: if pbs-dc1 is compromised, the attacker must not be able to delete the DC2 copy,',
    '  and deletions on pbs-dc1 must NOT propagate to DC2.',
    '- Nobody has verified backups since the PBS install. GC runs weekly.',
    '- MongoDB replica set rs-orders (3 nodes, MongoDB 7) with Percona Backup for MongoDB: pbm-agent on each node,',
    '  storage: S3-compatible bucket. Nightly logical backup. PITR is NOT enabled. Required RPO: 15 minutes.',
    '- Incident scenario to prepare for: a bad deploy corrupted orders at 2026-09-27 14:05 UTC; we want the data as it was at 14:00.'
  );
  PL.FILE_LABELS.W10_ONPREM_ENV = 'onprem-backup-estate.txt';

  PL.PLACEHOLDERS.W10_HANDOVER_PACK = L(
    'Handover pack · Project "Payments API migration" → Support · hypercare ends 2026-10-03',
    '',
    '1. Infrastructure as code',
    '   - Terraform repo infra-payments deploys dev and test fully from code.',
    '   - Prod: terraform plan (2026-09-26) shows 3 changes: a Key Vault access policy, an App Gateway WAF custom',
    '     rule and a DNS record were created by hand in the portal during go-live and are not in code.',
    '2. Rollback',
    '   - Runbook "payments-rollback.md" says: swap App Service deployment slots back, then run the DB down-migration.',
    '   - Never exercised in staging or prod. In test (2026-09-18) the down-migration failed: migration 0042 drops a column.',
    '3. Monitoring',
    '   - Grafana dashboards exist for latency and error rate. Azure Monitor alert rules created 2026-09-30.',
    '   - Alerts route to the email list payments-project@, which is closed when the project team is released.',
    '   - No on-call routing to Support. No SLO defined.',
    '4. Backup and restore',
    '   - Azure Backup for the SQL database and VMs; restore test on 2026-09-10 recovered the DB to a sandbox and',
    '     the app passed smoke tests against it. Evidence: ticket SUP-3381.',
    '5. Runbooks and knowledge transfer',
    '   - 2 of 5 agreed runbooks delivered (deploy, scale). Missing: rollback (tested), certificate rotation, DR failover.'
  );
  PL.FILE_LABELS.W10_HANDOVER_PACK = 'handover-pack-payments.txt';

  /* =====================================================================
     Topic 1 — AZ-104 · Secure access to virtual networks
     ===================================================================== */
  const NSG_VERDICTS = {
    flows: [
      { id: 'F1', verdict: 'Allow', deciding_nsg: 'nsg-nic-app-01', deciding_rule: 'allow-8080-vnet', explanation: 'Subnet NSG rule 100 (asg-web → asg-app 8080) allows it, then NIC NSG rule 100 allows VirtualNetwork on 8080. Both NSGs allow.' },
      { id: 'F2', verdict: 'Deny', deciding_nsg: 'nsg-nic-app-01', deciding_rule: 'deny-ssh-all', explanation: 'Subnet NSG rule 200 allows SSH from the Bastion subnet, but the NIC NSG rule 150 denies TCP 22 from any source. Inbound traffic must be allowed by both NSGs.' },
      { id: 'F3', verdict: 'Allow', deciding_nsg: 'nsg-nic-app-01', deciding_rule: 'allow-node-exp', explanation: 'No custom subnet rule matches, so the subnet default AllowVnetInBound (65000) allows it; the NIC NSG rule 200 allows 10.30.3.10 on 9100.' },
      { id: 'F4', verdict: 'Deny', deciding_nsg: 'nsg-snet-app', deciding_rule: 'deny-internet', explanation: 'Subnet NSG rule 300 denies all Internet-sourced traffic; it never reaches the NIC NSG.' },
      { id: 'F5', verdict: 'Allow', deciding_nsg: 'nsg-nic-app-01', deciding_rule: 'allow-8080-vnet', explanation: 'vm-db-01 is not in asg-web so subnet rule 100 does not match, but the default AllowVnetInBound allows it; the NIC NSG allows VirtualNetwork on 8080. This breaks the intent.' },
    ],
    intent_violations: ['F5: the database tier can call the app on 8080; only asg-web should.', 'F2: SSH via Bastion is blocked by the NIC NSG, so operators cannot connect.'],
    fixes: [
      'az network nsg rule create -g rg-shop-prod --nsg-name nsg-snet-app -n deny-vnet-8080 --priority 400 --direction Inbound --access Deny --protocol Tcp --source-address-prefixes VirtualNetwork --destination-port-ranges 8080',
      'az network nsg rule create -g rg-shop-prod --nsg-name nsg-nic-app-01 -n allow-bastion-ssh --priority 140 --direction Inbound --access Allow --protocol Tcp --source-address-prefixes 10.30.250.0/26 --destination-port-ranges 22',
    ],
    verify_command: 'az network nic list-effective-nsg -g rg-shop-prod -n nic-app-01',
  };
  const PE_BASTION = L(
    '```bash',
    '# --- Azure Bastion ---',
    '# The subnet must be named AzureBastionSubnet, /26 or larger',
    'az network vnet subnet create -g rg-shop-prod --vnet-name vnet-shop-prod -n AzureBastionSubnet --address-prefixes 10.30.250.0/26',
    'az network public-ip create -g rg-shop-prod -n pip-bas-shop-prod --sku Standard --location westeurope',
    'az network bastion create -g rg-shop-prod -n bas-shop-prod --vnet-name vnet-shop-prod \\',
    '  --public-ip-address pip-bas-shop-prod --sku Standard --location westeurope',
    '',
    '# --- Private endpoint for the storage account (blob) ---',
    'SA_ID=$(az storage account show -g rg-shop-prod -n stshopprod01 --query id -o tsv)',
    'az network private-endpoint create -g rg-shop-prod -n pe-stshopprod01-blob --vnet-name vnet-shop-prod --subnet snet-pe \\',
    '  --private-connection-resource-id "$SA_ID" --group-id blob --connection-name pec-stshopprod01-blob',
    '',
    '# Private DNS so stshopprod01.blob.core.windows.net resolves to the private IP',
    'az network private-dns zone create -g rg-shop-prod -n privatelink.blob.core.windows.net',
    'az network private-dns link vnet create -g rg-shop-prod --zone-name privatelink.blob.core.windows.net \\',
    '  -n link-vnet-shop-prod --virtual-network vnet-shop-prod --registration-enabled false',
    'az network private-endpoint dns-zone-group create -g rg-shop-prod --endpoint-name pe-stshopprod01-blob \\',
    '  -n default --private-dns-zone privatelink.blob.core.windows.net --zone-name blob',
    '',
    '# Only after the app is confirmed to work over the private endpoint:',
    'az storage account update -g rg-shop-prod -n stshopprod01 --public-network-access Disabled',
    '```',
    '',
    '- Bastion gives RDP/SSH over TLS from the portal (or native client with Standard SKU and tunneling), so VMs need no public IP.',
    '- The Bastion public IP must be Standard SKU.',
    '- `--group-id blob`: the sub-resource; a separate endpoint is needed for file, queue or dfs.',
    '- A private endpoint puts a private IP from snet-pe on the storage account; a service endpoint would not, it only keeps traffic on the backbone and the account keeps its public endpoint.',
    '- Test from a VM: `nslookup stshopprod01.blob.core.windows.net` should return a 10.30.x.x address.'
  );
  const t1 = {
    id: 'w10-t1',
    title: 'AZ-104 · Secure access to virtual networks',
    programmeItem: 'AZ-104 Microsoft Azure Administrator · Configure secure access to virtual networks (free: Microsoft Learn)',
    blurb: 'NSGs and application security groups, how to evaluate effective security rules, Azure Bastion, and service endpoints vs private endpoints.',
    outcomes: [
      'Work out whether a flow is allowed when both a subnet NSG and a NIC NSG apply',
      'Use ASGs to write rules by workload instead of by IP address',
      'Choose between service endpoints and private endpoints, and deploy Bastion and a private endpoint with az CLI',
    ],
    concepts: [
      { t: 'NSG rule processing', d: 'Rules are processed by priority (100–4096, lowest number first) and processing stops at the first match. NSGs are stateful: return traffic for an allowed flow is allowed automatically.', ex: 'priority 150 Deny beats 200 Allow' },
      { t: 'Default rules', d: 'Inbound defaults: AllowVnetInBound (65000), AllowAzureLoadBalancerInBound (65001), DenyAllInBound (65500). The VirtualNetwork tag covers the whole VNet and peered VNets, so default rules allow more than people expect.', ex: 'AllowVnetInBound lets every subnet in' },
      { t: 'Subnet + NIC NSGs', d: 'Inbound: the subnet NSG is evaluated first, then the NIC NSG. Outbound: NIC first, then subnet. Traffic must be allowed by both. Effective security rules and IP flow verify show the combined result.', ex: 'az network nic list-effective-nsg' },
      { t: 'Application security groups', d: 'Group NICs by role (web, app, db) and use the ASG as source or destination in rules. Rules keep working as VMs scale, without IP lists.', ex: 'src asg-web → dst asg-app 8080' },
      { t: 'Azure Bastion', d: 'A managed PaaS host in a subnet named AzureBastionSubnet that gives RDP/SSH to VMs over TLS, so VMs don\'t need public IPs or open 22/3389 to the internet.', ex: 'az network bastion create' },
      { t: 'Service vs private endpoints', d: 'Service endpoints keep traffic from a subnet to a PaaS service on the Azure backbone, and the service still has a public endpoint. A private endpoint gives the service a private IP in your VNet and needs private DNS (privatelink zones).', ex: 'privatelink.blob.core.windows.net' },
    ],
    leverage: [
      { t: 'Effective rules, explained', d: 'Paste the subnet and NIC NSG rules and the flow. Claude walks both NSGs in priority order and tells you which rule decides, which is how you spot a default rule quietly allowing traffic.' },
      { t: 'Intent vs reality reviews', d: 'Give Claude the security intent ("only web may call app on 8080") with the exported rules, and ask for every flow that breaks it plus the least-privilege fix.' },
      { t: 'Private endpoint rollouts', d: 'Ask for the full sequence (endpoint, DNS zone, VNet link, zone group, then disable public access) with a DNS test at each step, so a DNS gap doesn\'t cause an outage.' },
      { t: 'Study coach', d: 'Ask your SRE Learning Project for NSG puzzles with two NSGs and ASGs, and check your answers with IP flow verify in a sandbox.' },
    ],
    sources: [SRC.az104, SRC.nsg, SRC.nsgHow, SRC.asg, SRC.bastion, SRC.svcEp, SRC.pe],
    quiz: [
      { q: 'The subnet NSG allows TCP 22 from the Bastion subnet; the NIC NSG denies TCP 22 from any. Result?', options: ['Allowed, because the subnet NSG is evaluated first', 'Denied, because inbound traffic must be allowed by both NSGs', 'Allowed, because NSGs are stateful'], a: 1, why: 'Inbound traffic passes the subnet NSG and then the NIC NSG, and either one can deny it.' },
      { q: 'Which option gives an Azure Storage account a private IP address in your VNet?', options: ['Service endpoint', 'Private endpoint', 'Route table'], a: 1, why: 'Private endpoints create a NIC with a private IP; service endpoints do not.' },
      { q: 'What must the Bastion subnet be called?', options: ['BastionSubnet', 'AzureBastionSubnet', 'Any name'], a: 1, why: 'Bastion requires a subnet named AzureBastionSubnet (for all SKUs except Developer).' },
    ],
    steps: [
      {
        id: 'w10-t1-s1', kind: 'guide', title: 'Study coach: NSG puzzles and IP flow verify', minutes: 60, source: SRC.ipflow,
        scenario: 'Use your AZ-104 Claude Project for NSG/ASG puzzles, then prove the answers in a sandbox with effective security rules and IP flow verify.',
        task: [
          'In your SRE Learning Project, run prompt 1 and answer each puzzle before looking.',
          'Build one of the puzzles in a sandbox subscription (two VMs, a subnet NSG and a NIC NSG) and check your answer with prompt 2\'s commands.',
          'Run prompt 3 to review service vs private endpoints, then delete the sandbox resource group.',
        ],
        prompts: [
          { label: 'NSG puzzles', where: 'claude.ai', text: 'Give me 6 AZ-104 style puzzles. Each has a subnet NSG and a NIC NSG (with priorities, ASGs and service tags) and one flow. I answer Allow/Deny and the deciding rule. Include at least one where a default rule (AllowVnetInBound or DenyAllInBound) decides, and one outbound flow. One at a time; mark my answer and explain.' },
          { label: 'Prove it in the sandbox', where: 'claude.ai', text: 'For this puzzle [paste], give me the exact az CLI to (1) list effective NSG rules on the NIC and (2) run IP flow verify for the flow with az network watcher test-ip-flow, and tell me what output proves the answer.' },
          { label: 'Endpoints and Bastion', where: 'claude.ai', text: 'Compare service endpoints and private endpoints for Azure Storage in a table: IP address, DNS, public endpoint, on-prem access over VPN, cost, when to pick each. Then quiz me with 3 exam-style questions on this plus Azure Bastion.' },
        ],
        expected: ['6 puzzles answered with the deciding rule', 'One puzzle confirmed with effective rules and IP flow verify output', 'A comparison table you checked against Microsoft Learn'],
        verify: 'IP flow verify output (access and rule name) is the ground truth. If it disagrees with Claude, check the "How network security groups filter traffic" page and find out why.',
        atWork: 'When a connection fails in production, check effective rules and IP flow verify first. Claude helps you read the output quickly, but the tool gives you the evidence.',
        checks: [
          { id: 'puzzles', label: 'I answered the 6 puzzles and reviewed mistakes', manual: true },
          { id: 'proved', label: 'I proved one answer with IP flow verify in a sandbox', manual: true },
          { id: 'cleanup', label: 'I deleted the sandbox resources', manual: true },
        ],
      },
      {
        id: 'w10-t1-s2', title: 'Evaluate effective NSG rules (JSON verdicts)', minutes: 10, source: SRC.nsgHow, files: ['W10_NSG_SCENARIO'],
        scenario: '<code>vm-app-01</code> sits behind a subnet NSG and a NIC NSG. Ask Claude to decide five inbound flows, name the deciding rule, spot where reality breaks the security intent, and give the fixes.',
        task: ['Read <code>nsg-effective-rules-scenario.txt</code> and work out F1–F5 yourself first.', 'Click <b>Run</b>.', 'Compare with your answers. Which flow surprised you?'],
        atWork: 'Use this before any NSG change review: export both NSGs, state the intent, and ask for the verdicts and intent violations. Then confirm with IP flow verify.',
        hint: 'Inbound: subnet NSG first, then NIC NSG; both must allow. Check where default rules decide.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: {
            effort: 'high',
            format: jsonFormat(obj({
              flows: arr(obj({ id: S, verdict: en('Allow', 'Deny'), deciding_nsg: S, deciding_rule: S, explanation: S })),
              intent_violations: arr(S),
              fixes: arr(S),
              verify_command: S,
            })),
          },
          system: 'You are an Azure network security reviewer. Evaluate NSGs exactly as Azure does: priority order, first match wins, default rules included; inbound = subnet NSG then NIC NSG, and both must allow. deciding_rule is the rule that allowed it at the last NSG, or the rule that denied it. Fixes must be az network nsg rule create commands, least privilege.',
          messages: user(L('<scenario>', '{{W10_NSG_SCENARIO}}', '</scenario>', 'Evaluate F1–F5, list intent violations, and give the fix commands and one command to verify effective rules on nic-app-01. Resource group: rg-shop-prod.')),
        },
        checks: [
          { id: 'f1', label: 'F1 (web → 8080) is Allow', test: (c, h) => { const j = h.json(c); const f = j && j.flows.find((x) => x.id === 'F1'); return !!f && f.verdict === 'Allow'; } },
          { id: 'f2', label: 'F2 (Bastion SSH) is Deny by the NIC NSG rule deny-ssh-all', test: (c, h) => { const j = h.json(c); const f = j && j.flows.find((x) => x.id === 'F2'); return !!f && f.verdict === 'Deny' && /deny-ssh-all/.test(f.deciding_rule); } },
          { id: 'f3', label: 'F3 (Prometheus → 9100) is Allow', test: (c, h) => { const j = h.json(c); const f = j && j.flows.find((x) => x.id === 'F3'); return !!f && f.verdict === 'Allow'; } },
          { id: 'f4', label: 'F4 (Internet → 443) is Deny by deny-internet on the subnet NSG', test: (c, h) => { const j = h.json(c); const f = j && j.flows.find((x) => x.id === 'F4'); return !!f && f.verdict === 'Deny' && /deny-internet/.test(f.deciding_rule) && /snet/.test(f.deciding_nsg); } },
          { id: 'f5', label: 'F5 (db → 8080) is Allow, and flagged as an intent violation', test: (c, h) => { const j = h.json(c); const f = j && j.flows.find((x) => x.id === 'F5'); return !!f && f.verdict === 'Allow' && j.intent_violations.some((v) => /F5|db/i.test(v)); } },
          { id: 'fix', label: 'Fix includes an az network nsg rule create with --access Deny for 8080', test: (c, h) => { const j = h.json(c); return !!j && j.fixes.some((x) => /az network nsg rule create/.test(x) && /--access Deny/.test(x) && /8080/.test(x)); } },
          { id: 'verify', label: 'Verifies with effective NSG rules or IP flow verify', test: (c, h) => { const j = h.json(c); return !!j && /list-effective-nsg|test-ip-flow/.test(j.verify_command); } },
        ],
        sim: [{ content: [think('F2: subnet allows via 200, NIC 150 denies 22 from any, so Deny. F5: db not in asg-web, subnet default AllowVnetInBound allows, NIC 100 allows VirtualNetwork 8080, so Allow and a violation. Fix: subnet deny VirtualNetwork 8080 at 400 (after ASG allow 100).'), { type: 'text', text: JSON.stringify(NSG_VERDICTS, null, 2) }], stop_reason: 'end_turn', usage: { input_tokens: 900, output_tokens: 820 } }],
      },
      {
        id: 'w10-t1-s3', title: 'Generate CLI: Azure Bastion and a storage private endpoint', minutes: 8, source: SRC.cliPe,
        scenario: 'Remove public SSH and public storage access: deploy Azure Bastion, then put the storage account behind a private endpoint with private DNS.',
        task: ['Click <b>Run</b>.', 'Check the flags against the Azure CLI reference for bastion and private-endpoint.', 'Note the order: DNS must be working before public access is disabled.'],
        atWork: 'Most private endpoint outages are DNS. Ask Claude for the DNS zone, VNet link and zone group every time, plus an nslookup test before you turn off public access.',
        hint: 'Bastion needs AzureBastionSubnet and a Standard public IP. The private endpoint needs --group-id blob and a privatelink DNS zone.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' },
          system: 'You are an Azure administrator coach. Give exact Azure CLI commands in one bash block in a safe order, then explain the key flags in one line each.',
          messages: user('Resource group rg-shop-prod, westeurope, VNet vnet-shop-prod (10.30.0.0/16). 1) Deploy Azure Bastion (Standard SKU) using 10.30.250.0/26 so our VMs no longer need public IPs. 2) Put storage account stshopprod01 (blob) behind a private endpoint in existing subnet snet-pe, with private DNS so the normal blob hostname resolves privately. 3) Then disable public network access on the storage account.'),
        },
        checks: [
          { id: 'subnet', label: 'Creates AzureBastionSubnet with 10.30.250.0/26', test: (c, h) => /AzureBastionSubnet/.test(h.text(c)) && /10\.30\.250\.0\/26/.test(h.text(c)) },
          { id: 'pip', label: 'Standard SKU public IP for Bastion', test: (c, h) => /az network public-ip create[^\n]*--sku Standard/.test(h.text(c)) },
          { id: 'bastion', label: 'az network bastion create with --public-ip-address and --vnet-name', test: (c, h) => /az network bastion create[\s\S]*--public-ip-address/.test(h.text(c)) && /az network bastion create[^\n]*--vnet-name/.test(h.text(c)) },
          { id: 'pe', label: 'Private endpoint with --group-id blob, --connection-name and --private-connection-resource-id', test: (c, h) => /az network private-endpoint create/.test(h.text(c)) && /--group-id blob/.test(h.text(c)) && /--connection-name/.test(h.text(c)) && /--private-connection-resource-id/.test(h.text(c)) },
          { id: 'dns', label: 'privatelink.blob DNS zone, VNet link and zone group', test: (c, h) => /privatelink\.blob\.core\.windows\.net/.test(h.text(c)) && /private-dns link vnet create/.test(h.text(c)) && /dns-zone-group create/.test(h.text(c)) },
          { id: 'public', label: 'Disables public network access last', test: (c, h) => { const t = h.text(c); const i = t.search(/--public-network-access Disabled/); return i > 0 && i > t.search(/dns-zone-group create/); } },
        ],
        sim: [textTurn(PE_BASTION, { input_tokens: 220, output_tokens: 780 })],
      },
    ],
  };

  /* =====================================================================
     Topic 2 — Azure Backup: immutable vaults, soft delete, MUA, ransomware
     ===================================================================== */
  const VAULT_REVIEW = {
    findings: [
      { area: 'Immutability', current: 'Enabled, not locked', risk: 'An attacker with vault admin rights can disable immutability and then delete recovery points.', recommendation: 'After confirming the policy retention is right, lock immutability (Enabled and locked). Locking is irreversible, so get sign-off first.', severity: 'high' },
      { area: 'Multi-user authorization', current: 'grp-backup-admins has Contributor on Resource Guard rg-guard-sec', risk: 'The vault admins can approve their own critical operations, which cancels MUA protection.', recommendation: 'Remove Contributor from grp-backup-admins on the Resource Guard; grant Backup MUA Operator only just-in-time through Entra PIM, approved by grp-security-admins.', severity: 'critical' },
      { area: 'Soft delete retention', current: '14 days', risk: 'An attack found after 14 days leaves no soft-deleted data to recover.', recommendation: 'Extend soft-delete retention (for example to 30–60 days; range 14–180). Days beyond 14 are charged.', severity: 'medium' },
      { area: 'Redundancy', current: 'LocallyRedundant, Cross Region Restore disabled', risk: 'A regional outage or datacentre loss can leave no usable copy.', recommendation: 'For production, plan a move to GRS with Cross Region Restore (redundancy can only be changed before items are protected, so this may mean a new vault).', severity: 'medium' },
      { area: 'Alerts', current: 'Built-in alerts, no action group', risk: 'Deletion or security alerts are raised but nobody is notified.', recommendation: 'Attach an action group that routes backup security alerts to the on-call rota.', severity: 'high' },
      { area: 'Restore testing', current: 'No restore test recorded', risk: 'Backups are unproven.', recommendation: 'Run and record a restore test for one VM and one SQL database this month.', severity: 'high' },
    ],
    ransomware_ready: false,
    summary: 'Not ransomware-ready: MUA is undermined by the Contributor assignment, immutability is unlocked, alerts are not routed and no restore has been tested.',
  };
  const t2 = {
    id: 'w10-t2',
    title: 'Azure Backup: immutable vaults, soft delete, MUA and ransomware protection',
    programmeItem: 'Azure Backup and recovery: immutable vaults, soft delete, multi-user authorisation, ransomware protection (free: Microsoft Learn)',
    blurb: 'How Azure Backup protects recovery points from deletion by attackers and mistakes: immutable vaults, soft delete, multi-user authorization with Resource Guard, and alerting.',
    outcomes: [
      'Explain the three immutability states and why locking is irreversible',
      'Configure soft-delete retention and MUA so that no single admin can destroy backups',
      'Review a vault\'s posture and produce a prioritized ransomware-readiness fix list',
    ],
    concepts: [
      { t: 'Recovery Services and Backup vaults', d: 'Vaults hold recovery points apart from the workload. Recovery Services vaults cover VMs, SQL/SAP HANA in VMs and Azure Files. Backup vaults cover newer workloads such as Azure Database for PostgreSQL and AKS.', ex: 'rsv-shop-prod' },
      { t: 'Immutable vault', d: 'Blocks operations that could lose recovery points (such as stopping protection with delete data, or reducing retention). States: Disabled, Enabled (can be turned off) and Enabled and locked, which is irreversible and adds WORM storage where supported.', ex: 'lock only after testing retention' },
      { t: 'Soft delete', d: 'Deleted backup data is kept in a soft-deleted state and can be restored. Retention defaults to 14 days and can be set from 14 to 180 days; days beyond 14 are charged. Secure by default now enforces it for Recovery Services vaults.', ex: 'soft-delete retention 30 days' },
      { t: 'Multi-user authorization', d: 'A Resource Guard, owned by a different team (ideally in another subscription or tenant), must authorize critical operations such as disabling soft delete or reducing retention. The backup admin must not hold Contributor, Backup MUA Admin or Backup MUA Operator on it.', ex: 'Backup MUA Operator via PIM, just in time' },
      { t: 'Ransomware layers', d: 'Combine immutability, soft delete, MUA, least-privilege RBAC, routed alerts and regular restore tests. Each layer covers a gap the others leave.', ex: 'defence in depth for backups' },
    ],
    leverage: [
      { t: 'Posture review from an export', d: 'Paste a vault\'s settings and role assignments and ask Claude for findings ranked by severity. It quickly spots problems such as the vault admins having Contributor on the Resource Guard.' },
      { t: 'Change plans with sign-off notes', d: 'Ask Claude to draft the change request for locking immutability, stating clearly that it is irreversible and what must be confirmed first (retention, cost, compliance).' },
      { t: 'Tabletop the attack', d: 'Ask Claude to play a ransomware operator with vault admin rights and list what they would try, then check each step is blocked by your settings.' },
    ],
    sources: [SRC.immutable, SRC.softDelete, SRC.mua, SRC.ransomware, SRC.backupSec, SRC.backup],
    quiz: [
      { q: 'You set the vault to "Enabled and locked". Can you disable immutability later?', options: ['Yes, from the portal', 'No, locking is irreversible', 'Only with Owner'], a: 1, why: 'The locked state cannot be disabled, so decide carefully.' },
      { q: 'MUA is configured, but the backup admins have Contributor on the Resource Guard. Effect?', options: ['Stronger protection', 'MUA is effectively bypassed, because they can authorize themselves', 'No effect'], a: 1, why: 'Microsoft Learn says the backup admin must not hold Contributor or MUA roles on the Resource Guard.' },
      { q: 'What is the soft-delete retention range for Azure Backup?', options: ['1–7 days', '14–180 days', 'Unlimited, free'], a: 1, why: 'Default 14 days, configurable up to 180, and days beyond 14 are charged.' },
    ],
    steps: [
      {
        id: 'w10-t2-s1', kind: 'guide', title: 'Ransomware tabletop for your backup vault', minutes: 40, source: SRC.ransomware,
        scenario: 'Use Claude to tabletop an attack on a real (or sandbox) Recovery Services vault and turn the gaps into a change plan.',
        task: [
          'Export your vault settings: in the portal note Properties (immutability, soft delete, redundancy), Security settings (MUA), role assignments on the vault and the Resource Guard, and alert routing. Remove subscription IDs.',
          'Run prompt 1 in claude.ai, then prompt 2.',
          'Run prompt 3 to draft the change request, and review it with your security lead before making changes.',
        ],
        prompts: [
          { label: 'Attacker tabletop', where: 'claude.ai', text: 'Act as a ransomware operator who has phished an account with Backup Contributor on this Recovery Services vault. Given these settings [paste redacted export], list step by step what you would try in order to destroy the backups (disable soft delete, reduce retention, stop protection with delete data, disable immutability, delete the vault). For each step say whether these settings block it and why, citing immutability, soft delete or MUA.' },
          { label: 'Fix list', where: 'claude.ai', text: 'Now switch sides. Give me a prioritized fix list: setting, current value, target value, risk if unfixed, and whether the change is reversible. Mark irreversible changes (like locking immutability) clearly.' },
          { label: 'Change request', where: 'claude.ai', text: 'Draft a change request for the top 3 fixes: purpose, exact steps (portal or az CLI), pre-checks, cost impact (soft delete beyond 14 days), rollback or "irreversible" statement, approvers (backup admin and security admin), and evidence to attach.' },
        ],
        expected: ['A step-by-step attack walk-through with blocked/not blocked for each step', 'A ranked fix list with irreversible items flagged', 'A change request ready for review'],
        verify: 'Check each "blocked" claim against the immutable vault, soft delete and MUA pages on Microsoft Learn. Where possible, test in a sandbox vault, e.g. try to reduce policy retention with immutability enabled.',
        atWork: 'Run this tabletop every time vault settings or admin groups change. It turns backup security from checkboxes into tested defences.',
        checks: [
          { id: 'export', label: 'I exported vault posture with IDs redacted', manual: true },
          { id: 'tabletop', label: 'I ran the attacker tabletop and fix list', manual: true },
          { id: 'cr', label: 'I drafted a change request and reviewed it with security', manual: true },
        ],
      },
      {
        id: 'w10-t2-s2', title: 'Review a vault\'s ransomware readiness (JSON)', minutes: 8, source: SRC.mua, files: ['W10_VAULT_POSTURE'],
        scenario: 'Review the exported posture of <code>rsv-shop-prod</code> and return findings ranked by severity, plus a ransomware-ready verdict.',
        task: ['Read <code>vault-posture-rsv-shop-prod.txt</code>. Find the setting that cancels MUA.', 'Click <b>Run</b>.', 'Check that no recommendation weakens protection (for example disabling soft delete).'],
        atWork: 'Run this review on every production vault each quarter. JSON findings go straight into your tracker.',
        hint: 'Look at who holds which role on the Resource Guard, whether immutability is locked, and where alerts go.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: {
            effort: 'high',
            format: jsonFormat(obj({
              findings: arr(obj({ area: S, current: S, risk: S, recommendation: S, severity: en('critical', 'high', 'medium', 'low') })),
              ransomware_ready: B,
              summary: S,
            })),
          },
          system: 'You are an Azure Backup security reviewer. Base findings on Microsoft Learn guidance for immutable vaults, soft delete and multi-user authorization. Never recommend weakening protection. Flag irreversible changes.',
          messages: user(L('<vault>', '{{W10_VAULT_POSTURE}}', '</vault>', 'Review this vault for ransomware readiness.')),
        },
        checks: [
          { id: 'mua', label: 'Flags Contributor on the Resource Guard as breaking MUA (critical or high)', test: (c, h) => { const j = h.json(c); return !!j && j.findings.some((f) => /resource guard|MUA|multi-user/i.test(f.area + f.current + f.risk) && /contributor/i.test(f.current + f.risk + f.recommendation) && /critical|high/.test(f.severity)); } },
          { id: 'jit', label: 'Recommends Backup MUA Operator just-in-time (PIM) instead', test: (c, h) => { const j = h.json(c); return !!j && j.findings.some((f) => /Backup MUA Operator/.test(f.recommendation) && /PIM|just-in-time|temporar/i.test(f.recommendation)); } },
          { id: 'lock', label: 'Recommends locking immutability and warns it is irreversible', test: (c, h) => { const j = h.json(c); return !!j && j.findings.some((f) => /immutab/i.test(f.area + f.recommendation) && /lock/i.test(f.recommendation) && /irreversible/i.test(f.recommendation)); } },
          { id: 'soft', label: 'Recommends extending soft-delete retention beyond 14 days', test: (c, h) => { const j = h.json(c); return !!j && j.findings.some((f) => /soft/i.test(f.area) && /extend|increase|30|60|90|180/i.test(f.recommendation)); } },
          { id: 'safe', label: 'Never recommends disabling soft delete or immutability', test: (c, h) => { const j = h.json(c); return !!j && !j.findings.some((f) => /\b(disable|turn off)\b[^.]*(soft.?delete|immutab)/i.test(f.recommendation)); } },
          { id: 'verdict', label: 'Verdict: not ransomware-ready', test: (c, h) => { const j = h.json(c); return !!j && j.ransomware_ready === false; } },
        ],
        sim: [jsonTurn(VAULT_REVIEW, { input_tokens: 620, output_tokens: 700 })],
      },
    ],
  };

  /* =====================================================================
     Topic 3 — On-prem backup: Proxmox Backup Server and Percona Backup for MongoDB
     ===================================================================== */
  const ONPREM_PLAN = L(
    '## 1. Retention on pbs-dc1 (prune job)',
    '```bash',
    'proxmox-backup-manager prune-job create main-retention --store main --schedule daily \\',
    '  --keep-daily 7 --keep-weekly 4 --keep-monthly 6',
    '# Pruning removes snapshot indexes; garbage collection then frees unreferenced chunks',
    'proxmox-backup-manager garbage-collection start main',
    '```',
    '',
    '## 2. Verification (nobody has verified since install)',
    '```bash',
    'proxmox-backup-manager verify main          # one full verification now',
    'proxmox-backup-manager verify-job create verify-main --store main --schedule daily \\',
    '  --ignore-verified true --outdated-after 30  # re-verify each snapshot at least monthly',
    '```',
    '',
    '## 3. Off-site copy: pbs-dc2 PULLS from pbs-dc1',
    'Run on **pbs-dc2**, so pbs-dc1 holds no credentials that can delete the off-site copy:',
    '```bash',
    'proxmox-backup-manager remote create pbs-dc1 --host pbs-dc1.dc1.example --userid sync@pbs \\',
    '  --password "<from your secret store>" --fingerprint <pbs-dc1 cert fingerprint>',
    'proxmox-backup-manager sync-job create offsite-from-dc1 --remote pbs-dc1 --remote-store main \\',
    '  --store offsite --schedule daily --verified-only true --remove-vanished false',
    'proxmox-backup-manager verify-job create verify-offsite --store offsite --schedule weekly',
    '```',
    '- `--remove-vanished false` (the default): deletions on pbs-dc1 do not propagate to DC2.',
    '- The sync user on pbs-dc1 only needs read access to the datastore; give pbs-dc2 its own prune job for retention.',
    '- Deduplication: VM disks use fixed-size chunks, containers use dynamic chunks (pxar); chunks are identified by SHA-256, so the off-site sync only transfers chunks that DC2 does not already have.',
    '',
    '## 4. MongoDB: enable PITR for a 15-minute RPO',
    '```bash',
    'pbm config --set pitr.enabled=true',
    'pbm config --set pitr.oplogSpanMin=10   # oplog slices every 10 min (default) keep RPO under 15 min',
    'pbm backup                              # a base backup must exist for PITR',
    'pbm list                                # shows backups and PITR time ranges',
    '```',
    '',
    '## 5. Restore rs-orders to 2026-09-27 14:00 UTC',
    '1. Stop the application writers (and any mongos, and the balancer on sharded clusters) so no writes land during restore.',
    '2. Confirm 14:00 is inside a PITR range in `pbm list`.',
    '```bash',
    'pbm restore --time="2026-09-27T14:00:00"',
    'pbm status',
    'pbm describe-restore <restore-name>',
    '```',
    '3. Validate order counts against a known-good report, restart writers, then take a fresh `pbm backup` as a new base.',
    '- Rehearse this on a copy of the replica set first; a restore overwrites the data on the target.'
  );
  const t3 = {
    id: 'w10-t3',
    title: 'On-prem backup: Proxmox Backup Server and Percona Backup for MongoDB',
    programmeItem: 'On-prem backup: Proxmox Backup Server (VM and container backups, deduplication, verification, off-site sync) and Percona Backup for MongoDB (consistent backups, point-in-time restore) (free docs: pbs.proxmox.com, docs.percona.com)',
    blurb: 'Back up Proxmox VMs and containers to Proxmox Backup Server with deduplication, verify them, keep an off-site copy that an attacker cannot delete, and protect MongoDB with consistent backups and point-in-time restore.',
    outcomes: [
      'Configure PBS retention (prune + garbage collection), verification jobs and an off-site sync job',
      'Explain how PBS deduplication works for VMs and containers',
      'Enable PITR in Percona Backup for MongoDB and restore to a point in time',
    ],
    concepts: [
      { t: 'PBS deduplication', d: 'Backups are split into chunks identified by their SHA-256 hash, so identical data is stored once across all snapshots. VM images use fixed-size chunks (with dirty bitmaps for fast incrementals); containers and file archives use dynamically sized chunks in the pxar format.', ex: '80 VMs, far less disk than 80 copies' },
      { t: 'Prune and garbage collection', d: 'Prune applies keep-last/daily/weekly/monthly rules and removes snapshot indexes. Garbage collection then marks chunks still in use and deletes the rest after a grace period.', ex: 'prune-job create --keep-daily 7' },
      { t: 'Verification', d: 'Verify jobs re-read chunks and check them against their checksums to catch bit rot. The docs recommend re-verifying all backups at least monthly.', ex: 'verify-job create --outdated-after 30' },
      { t: 'Off-site sync', d: 'A remote plus a sync job copies a datastore to another PBS. Pull (the default) is run by the off-site server. Leave remove-vanished off so deletions at the source do not propagate, and use verified-only or encrypted-only as needed.', ex: 'sync-job create --remote pbs-dc1' },
      { t: 'PBM consistent backups', d: 'Percona Backup for MongoDB runs a pbm-agent next to each mongod and writes consistent logical or physical backups of replica sets and sharded clusters to remote storage such as S3.', ex: 'pbm backup · pbm list' },
      { t: 'PBM point-in-time recovery', d: 'With `pitr.enabled=true` the agents save oplog slices (10-minute spans by default). A restore replays a base backup plus oplog up to the time you choose. Stop writers before restoring, and take a fresh backup afterwards.', ex: 'pbm restore --time="2026-09-27T14:00:00"' },
    ],
    leverage: [
      { t: 'Backup plans from requirements', d: 'Give Claude the RPO, retention and threat model ("a compromised primary must not delete off-site copies") and ask for the exact PBS and PBM commands with the reasoning.' },
      { t: 'Restore runbooks you can follow at 3 a.m.', d: 'Ask Claude to turn the PBM restore steps into a runbook with pre-checks (stop writers, confirm PITR range), commands and validation queries.' },
      { t: 'Read job logs fast', d: 'Paste PBS verify or sync task logs and ask which snapshots failed, why, and what to re-run, then confirm in the PBS GUI.' },
    ],
    sources: [SRC.pbs, SRC.pbsTech, SRC.pbsMaint, SRC.pbsRemotes, SRC.pbm, SRC.pbmPitr, SRC.pbmRestore],
    quiz: [
      { q: 'Why should the off-site PBS pull, with remove-vanished off?', options: ['It is faster', 'A compromised primary then cannot delete the off-site copy, and deletions don\'t propagate', 'Push is not supported'], a: 1, why: 'The off-site server holds the credentials and keeps snapshots even if they vanish at the source.' },
      { q: 'What does PBM need before a point-in-time restore is possible?', options: ['Only oplog slices', 'A base backup plus PITR oplog slices covering the target time', 'A physical backup only'], a: 1, why: 'PITR replays oplog on top of a base backup.' },
      { q: 'How often do the PBS docs recommend re-verifying all backups?', options: ['Never, once is enough', 'At least monthly', 'Only after restores'], a: 1, why: 'Re-verification catches bit rot that appears after the first check.' },
    ],
    steps: [
      {
        id: 'w10-t3-s1', kind: 'guide', title: 'Draft and review your on-prem backup configuration with Claude', minutes: 45, source: SRC.pbsRemotes,
        scenario: 'Use Claude to review your real PBS and PBM setup against the docs, and produce the missing jobs (verify, off-site sync, PITR) as a reviewed change.',
        task: [
          'Collect (redacted): <code>proxmox-backup-manager datastore list</code>, <code>prune-job list</code>, <code>verify-job list</code>, <code>sync-job list</code>, and <code>pbm status</code> / <code>pbm config --list</code>. Remove hostnames, passwords and keys.',
          'Run prompt 1 in claude.ai (or in Claude Code in the repo where you keep your config management).',
          'Run prompt 2 and review the commands with the team before applying them in a maintenance window.',
        ],
        prompts: [
          { label: 'Gap review', where: 'claude.ai', text: 'Here is our Proxmox Backup Server and Percona Backup for MongoDB configuration [paste redacted output]. Requirements: retention 7 daily / 4 weekly / 6 monthly, monthly re-verification, an off-site copy that survives a compromised primary, MongoDB RPO 15 minutes. List every gap with the doc section it relates to (PBS maintenance, remotes and sync, PBM PITR).' },
          { label: 'Commands to close gaps', where: 'claude.ai', text: 'Give the exact proxmox-backup-manager and pbm commands to close each gap, which server to run each on, and the permissions the sync user needs. Explain why remove-vanished should stay off. Do not include any real passwords; use placeholders.' },
        ],
        expected: ['A gap list tied to the official docs', 'Commands for prune, verify and sync jobs plus PBM PITR', 'A clear statement of which server holds which credentials'],
        verify: 'Check every command and flag against the proxmox-backup-manager synopsis in the PBS docs and the PBM PITR page. Run `sync-job list` and `pbm list` afterwards to confirm.',
        atWork: 'Keep the resulting config in your config-management repo, so rebuilding a PBS server means running code rather than working from memory.',
        checks: [
          { id: 'collect', label: 'I collected redacted PBS and PBM configuration', manual: true },
          { id: 'gaps', label: 'I have a gap list and commands checked against the docs', manual: true },
          { id: 'review', label: 'The team reviewed the change before applying it', manual: true },
        ],
      },
      {
        id: 'w10-t3-s2', title: 'Plan verify, off-site sync and MongoDB PITR', minutes: 10, source: SRC.pbsMaint, files: ['W10_ONPREM_ENV'],
        scenario: 'Given the on-prem estate, ask Claude for the exact PBS and PBM commands: retention, verification, a ransomware-safe off-site copy, PITR for a 15-minute RPO, and the restore to 14:00.',
        task: ['Read <code>onprem-backup-estate.txt</code>.', 'Click <b>Run</b>.', 'Check the off-site design: who initiates the sync, and do deletions propagate?'],
        atWork: 'Ask for the threat model with the commands. A sync that mirrors deletions protects you from hardware failure, but not from an attacker.',
        hint: 'Pull from DC2, keep --remove-vanished off, schedule verify jobs, enable pitr, and stop writers before pbm restore --time.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'high' },
          system: 'You are a backup engineer for Proxmox Backup Server and Percona Backup for MongoDB. Give exact commands from the official CLIs (proxmox-backup-manager, pbm), say which server each runs on, and explain safety decisions briefly. Use placeholders for secrets.',
          messages: user(L('<estate>', '{{W10_ONPREM_ENV}}', '</estate>', 'Give me the plan and commands: retention, verification, off-site copy, PITR, and the restore for the incident scenario.')),
        },
        checks: [
          { id: 'prune', label: 'Prune job with the wanted keep-* values', test: (c, h) => /prune-job create/.test(h.text(c)) && /--keep-daily 7/.test(h.text(c)) && /--keep-weekly 4/.test(h.text(c)) && /--keep-monthly 6/.test(h.text(c)) },
          { id: 'verify', label: 'Scheduled verify job (verify-job create with --schedule)', test: (c, h) => /verify-job create[^\n]*(\\\n[^\n]*)?--schedule/.test(h.text(c)) },
          { id: 'sync', label: 'Sync job with --remote, --remote-store and --store', test: (c, h) => /sync-job create[\s\S]*--remote \S+[\s\S]*--remote-store/.test(h.text(c)) && /sync-job create[\s\S]*--store/.test(h.text(c)) },
          { id: 'novanish', label: 'Does not enable --remove-vanished on the off-site copy', test: (c, h) => !/--remove-vanished(=|\s+)(true|1|yes)/i.test(h.text(c)) },
          { id: 'pitr', label: 'Enables PBM PITR (pbm config --set pitr.enabled=true)', test: (c, h) => /pbm config --set pitr\.enabled=true/.test(h.text(c)) },
          { id: 'restore', label: 'Restores with pbm restore --time to 14:00 and stops writers first', test: (c, h) => /pbm restore --time="?2026-09-27T14:00/.test(h.text(c)) && /stop[^\n]*(writ|application|mongos|balancer)/i.test(h.text(c)) },
        ],
        sim: [textTurn(ONPREM_PLAN, { input_tokens: 420, output_tokens: 980 })],
      },
    ],
  };

  /* =====================================================================
     Topic 4 — Apply: restore test + Projects → Support handover gate (EV-RE-03)
     ===================================================================== */
  const HANDOVER_REVIEW = {
    items: [
      { criterion: 'reproducible_from_code', status: 'partial', evidence: 'dev and test deploy from code; prod plan shows 3 manual changes (Key Vault access policy, WAF custom rule, DNS record).', action: 'Import the 3 resources into Terraform and get a clean prod plan (no changes).', owner: 'Project team' },
      { criterion: 'rollback_proven', status: 'fail', evidence: 'Rollback never exercised in staging or prod; down-migration 0042 failed in test because it drops a column.', action: 'Make the migration reversible (expand/contract), then rehearse slot swap plus DB rollback in staging and record it.', owner: 'Project team' },
      { criterion: 'monitoring_live', status: 'fail', evidence: 'Alert rules only created 2026-09-30 and routed to payments-project@, which closes at handover; no on-call routing to Support and no SLO.', action: 'Route alerts to the Support on-call action group, define an availability/latency SLO, and fire a test alert before hypercare ends.', owner: 'Support + Project team' },
      { criterion: 'backup_restore_tested', status: 'pass', evidence: 'DB restored to a sandbox on 2026-09-10 and app smoke tests passed (SUP-3381).', action: 'None; schedule the next restore test in the Support calendar.', owner: 'Support' },
      { criterion: 'runbooks_handed_over', status: 'partial', evidence: '2 of 5 runbooks delivered; rollback, certificate rotation and DR failover missing.', action: 'Deliver the 3 missing runbooks; the rollback runbook must reference the rehearsal.', owner: 'Project team' },
    ],
    gate: 'not_ready',
    blockers: ['Rollback not proven (down-migration fails)', 'Monitoring not routed to Support on-call; no SLO', 'Prod not reproducible from code (3 manual changes)'],
    hypercare_extension_recommended: true,
  };
  const t4 = {
    id: 'w10-t4',
    title: 'Apply: restore test and the Projects → Support handover gate',
    programmeItem: 'Apply task · Run a restore test. Document what broke and fix it. Cross-pillar: PROJECTS → SUPPORT. Assess a real handover for operability: environments reproducible from code, rollback proven, monitoring live before hypercare ends.',
    blurb: 'Prove a restore works end to end, record what broke and fix it. Then assess a real project handover against the operability gate before hypercare ends (milestone EV-RE-03).',
    outcomes: [
      'Plan, run and record a restore test with Claude drafting the plan and the findings log',
      'Fix what broke and re-test, so the evidence shows the fix',
      'Assess a real handover for operability and give the Engagement Lead a clear ready / not-ready verdict',
    ],
    concepts: [
      { t: 'A backup is only a hope', d: 'Until you restore it, you don\'t know it works. A restore test covers the data, the application running on it, and the time it took (compare with the RTO).', ex: 'restore → smoke test → time it' },
      { t: 'Restore to an isolated target', d: 'Restore into a sandbox or an alternate location, never over production. Watch for DNS names, connection strings and jobs that would talk to prod.', ex: 'alternate location, isolated VNet' },
      { t: 'Record what broke', d: 'Missing permissions, wrong runbook steps, restores slower than the RTO, missing encryption keys: each becomes a finding with an owner and a fix, then a re-test.', ex: 'finding → fix → re-test' },
      { t: 'The operability gate', d: 'Before Support accepts a service: environments are reproducible from code, rollback has been proven (not just written down), and monitoring is live and routed to Support before hypercare ends.', ex: 'EV-RE-03' },
      { t: 'Evidence, not assertions', d: 'Each criterion needs an artefact: a clean terraform plan, a rollback rehearsal record, a test alert that reached on-call, a restore ticket.', ex: 'plan output · rehearsal log · alert screenshot' },
    ],
    leverage: [
      { t: 'Claude drafts the test plan', d: 'Give it the workload, backup type, RTO/RPO and the target environment. It produces a step-by-step restore plan with pre-checks, isolation steps, validation queries and timing points.' },
      { t: 'Claude keeps the findings log', d: 'Paste notes as you go. Claude turns them into a findings table (what broke, impact, fix, owner, re-test result) for the evidence pack.' },
      { t: 'Handover checklist review', d: 'Give Claude the handover pack and the gate criteria. It returns a pass/partial/fail per criterion with the evidence gap and action, and you verify every line.' },
    ],
    sources: [SRC.backup, SRC.pbmRestore, SRC.pbsMaint, SRC.sreBook, SRC.claude101],
    quiz: [
      { q: 'The rollback runbook exists but was never run. Rollback status?', options: ['Pass', 'Fail: rollback is not proven until it has been exercised', 'Not applicable'], a: 1, why: 'The gate asks for rollback proven, not documented.' },
      { q: 'Where should a restore test restore to?', options: ['Over production, to be realistic', 'An isolated target such as a sandbox or alternate location', 'Anywhere'], a: 1, why: 'Restoring over production can cause the outage you are testing for.' },
    ],
    steps: [
      {
        id: 'w10-t4-s1', kind: 'guide', title: 'Run a restore test: plan, run, record, fix, re-test', minutes: 120, source: SRC.backup,
        scenario: 'Pick one real workload (an Azure VM or SQL database from Azure Backup, a Proxmox VM from PBS, or a MongoDB replica set with PBM) and prove it can be restored. Claude drafts the plan and keeps the findings log.',
        task: [
          'Pick the workload and agree an isolated restore target and a time window with the owner.',
          'Run prompts 1 and 2 before the test. During the test, paste your notes into prompt 3 as you go.',
          'Fix the top finding, re-test, and run prompt 4 to produce the evidence record.',
        ],
        prompts: [
          { label: '1 · Test plan', where: 'claude.ai', text: 'Draft a restore test plan for [workload, e.g. SQL database sqldb-orders in Azure Backup / VM 104 on PBS datastore main / MongoDB rs-orders with PBM]. RTO [x], RPO [y]. Restore target: [isolated sandbox]. Include: pre-checks (latest recovery point, keys/credentials needed, permissions), isolation steps so nothing talks to production (DNS, connection strings, scheduled jobs), exact restore steps, validation (row counts, app smoke test), timing checkpoints, and cleanup. No real secrets: use placeholders.' },
          { label: '2 · What could break', where: 'claude.ai', text: 'Before I run it: list the 8 most likely reasons this restore will fail or be slower than the RTO, with how I would detect each during the test.' },
          { label: '3 · Findings log (live)', where: 'claude.ai', text: 'Here are my raw notes so far [paste]. Keep a findings table: time, step, what happened, expected vs actual, impact on RTO/RPO, fix, owner. Also track elapsed time against the RTO.' },
          { label: '4 · Evidence record', where: 'claude.ai', text: 'Turn the final findings and re-test results into a one-page restore test record: workload, recovery point used, target, start/end times, achieved RTO and RPO vs targets, what broke, what we fixed, re-test result, remaining actions with owners and dates.' },
        ],
        expected: ['A test plan with isolation and validation steps', 'A findings table with at least one real issue', 'A fix applied and a re-test that shows it', 'A one-page evidence record with achieved RTO/RPO'],
        verify: 'The evidence must come from the systems: restore job IDs, PBS/PBM task logs, query results and timestamps. Compare each restore step with the product docs (Azure Backup, PBS, PBM restore pages).',
        atWork: 'Schedule this at least quarterly per critical workload. The record feeds EV-RE-05 later (restore proven from a simulated compromise).',
        checks: [
          { id: 'plan', label: 'I ran the restore from a written, isolated test plan', manual: true },
          { id: 'broke', label: 'I documented what broke with evidence', manual: true },
          { id: 'fixed', label: 'I fixed the top issue and re-tested successfully', manual: true },
          { id: 'record', label: 'The restore test record is filed with RTO/RPO achieved', manual: true },
        ],
      },
      {
        id: 'w10-t4-s2', kind: 'guide', title: 'EV-RE-03: assess a real handover for operability', minutes: 90, source: SRC.sreBook,
        scenario: 'Pick a project that is in (or about to enter) hypercare. With Claude, build the operability checklist, collect evidence for each criterion, and give the Engagement Lead a verdict before hypercare ends.',
        task: [
          'Collect the handover pack: repo links, latest prod <code>terraform plan</code> output, rollback runbook and any rehearsal record, alert rules and routing, restore test record, runbook list. Redact secrets.',
          'Run prompts 1 and 2. Gather any evidence Claude flags as missing, and check each status yourself.',
          'Run prompt 3, review the summary with the project lead, and send it to the Engagement Lead for sign-off.',
        ],
        prompts: [
          { label: '1 · Build the checklist', where: 'claude.ai', text: 'Build an operability handover checklist as an Artifact for a Projects → Support handover. Criteria: (1) environments reproducible from code (a clean prod plan, no manual changes), (2) rollback proven (rehearsed, with a record), (3) monitoring live and routed to Support on-call, with an SLO, before hypercare ends, (4) backup restore tested, (5) runbooks handed over. For each: what evidence proves it, how to check it, and pass/partial/fail rules.' },
          { label: '2 · Assess the pack', where: 'claude.ai', text: 'Assess this handover pack against the checklist [paste redacted pack]. For each criterion give status, the evidence you relied on, what evidence is missing, the action and the owner. Then give a gate verdict (ready / not ready) and whether hypercare should be extended. Do not assume anything that is not in the pack.' },
          { label: '3 · Summary for the Engagement Lead', where: 'claude.ai', text: 'Write a half-page summary for the Engagement Lead: verdict, blockers with owners and dates, what Support will accept once fixed, and the date we re-assess. Plain English, no jargon.' },
        ],
        expected: ['A checklist with evidence rules per criterion', 'An assessment where each status is backed by an artefact you checked', 'A verdict and a summary the Engagement Lead signed off'],
        verify: 'Check each "pass" yourself: run or read the prod plan, open the rehearsal record, and trigger a test alert to confirm it reaches Support on-call. Claude only sees what you paste, so anything missing from the pack is unproven.',
        atWork: 'Use the same checklist on every handover. Support should not accept a service that it cannot rebuild, roll back or see.',
        checks: [
          { id: 'code', label: 'Evidence: environments reproducible from code (clean prod plan or a gap recorded)', manual: true },
          { id: 'rollback', label: 'Evidence: rollback proven by a rehearsal record (or a blocker recorded)', manual: true },
          { id: 'monitoring', label: 'Evidence: monitoring live and routed to Support before hypercare ended (test alert received)', manual: true },
          { id: 'signoff', label: 'The Engagement Lead reviewed the assessment (EV-RE-03)', manual: true },
        ],
      },
      {
        id: 'w10-t4-s3', title: 'Operability gate review of a handover pack (JSON checklist)', minutes: 10, source: SRC.sreBook, files: ['W10_HANDOVER_PACK'],
        scenario: 'The "Payments API migration" project wants to hand over to Support; hypercare ends 2026-10-03. Ask Claude to assess the pack against the gate criteria and return a JSON checklist and verdict.',
        task: ['Read <code>handover-pack-payments.txt</code> and decide pass/partial/fail for each criterion yourself.', 'Click <b>Run</b>.', 'Compare: a written but unexercised rollback is not "proven".'],
        atWork: 'Store the JSON with the handover record. It makes the gate decision auditable and easy to re-check at the next assessment.',
        hint: 'Rollback has never been exercised and fails in test. Alerts route to a list that closes at handover. Prod has manual changes.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: {
            effort: 'high',
            format: jsonFormat(obj({
              items: arr(obj({ criterion: en('reproducible_from_code', 'rollback_proven', 'monitoring_live', 'backup_restore_tested', 'runbooks_handed_over'), status: en('pass', 'partial', 'fail'), evidence: S, action: S, owner: S })),
              gate: en('ready', 'not_ready'),
              blockers: arr(S),
              hypercare_extension_recommended: B,
            })),
          },
          system: 'You assess Projects → Support handovers for operability. A criterion passes only with evidence in the pack. Documented-but-unexercised counts as fail for rollback. Monitoring must be live and routed to Support before hypercare ends. Any fail on reproducibility, rollback or monitoring means the gate is not_ready.',
          messages: user(L('<handover_pack>', '{{W10_HANDOVER_PACK}}', '</handover_pack>', 'Assess each criterion, give the gate verdict, blockers, and whether to extend hypercare.')),
        },
        checks: [
          { id: 'rollback', label: 'Rollback is fail (never exercised; down-migration fails)', test: (c, h) => { const j = h.json(c); const i = j && j.items.find((x) => x.criterion === 'rollback_proven'); return !!i && i.status === 'fail'; } },
          { id: 'code', label: 'Reproducible from code is not pass (3 manual prod changes)', test: (c, h) => { const j = h.json(c); const i = j && j.items.find((x) => x.criterion === 'reproducible_from_code'); return !!i && i.status !== 'pass' && /manual|drift|3/i.test(i.evidence); } },
          { id: 'mon', label: 'Monitoring is not pass (routes to a closing list, no on-call, no SLO)', test: (c, h) => { const j = h.json(c); const i = j && j.items.find((x) => x.criterion === 'monitoring_live'); return !!i && i.status !== 'pass' && /on-call|Support|route/i.test(i.evidence + i.action); } },
          { id: 'backup', label: 'Backup restore tested is pass (SUP-3381)', test: (c, h) => { const j = h.json(c); const i = j && j.items.find((x) => x.criterion === 'backup_restore_tested'); return !!i && i.status === 'pass'; } },
          { id: 'gate', label: 'Gate is not_ready with at least two blockers', test: (c, h) => { const j = h.json(c); return !!j && j.gate === 'not_ready' && j.blockers.length >= 2; } },
          { id: 'ext', label: 'Recommends extending hypercare', test: (c, h) => { const j = h.json(c); return !!j && j.hypercare_extension_recommended === true; } },
        ],
        sim: [jsonTurn(HANDOVER_REVIEW, { input_tokens: 640, output_tokens: 720 })],
      },
    ],
  };

  PL.addWeek({
    week: 10,
    title: 'Secure network access, backup protection & the handover gate',
    stream: 'role',
    hours: 9,
    focus: 'AZ-104: NSGs, ASGs, effective rules, Bastion, and service and private endpoints. Protect backups against ransomware with Azure Backup (immutable vaults, soft delete, MUA) and on-prem with Proxmox Backup Server and Percona Backup for MongoDB. Then prove a restore, and assess a real Projects → Support handover for operability.',
    apply: 'Run a restore test. Document what broke and fix it. PROJECTS → SUPPORT: assess a real handover for operability: environments reproducible from code, rollback proven, monitoring live before hypercare ends.',
    milestone: {
      id: 'EV-RE-03',
      title: 'Projects → Support handover gate exercised',
      reviewer: 'Engagement Lead',
      passes: 'You assessed a real handover for operability: environments reproducible from code, rollback proven, monitoring in place before hypercare ended.',
    },
    topics: [t1, t2, t3, t4],
  });
})();
