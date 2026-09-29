/* Week 12 · Role-critical: AZ-104 monitoring (metrics, diagnostic settings, KQL, alerts, Insights, Network Watcher),
   Elastic Security fundamentals (detection engine, prebuilt rules, timelines, cases), and the apply task:
   restore from a simulated compromise (feeds milestone EV-RE-05 in Week 16).
   Structure follows week01.js. Run `node tests/validate.js --week 12 --allow-missing` after editing. */
(function () {
  'use strict';
  const PL = window.PL;
  const { ADAPTIVE, user, L, obj, arr, en, S, I, jsonFormat, textTurn, jsonTurn, think } = PL.B;

  const SRC = {
    az104: { label: 'Microsoft Learn · AZ-104 study guide (skills measured)', url: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104' },
    monitor: { label: 'Microsoft Learn · Azure Monitor overview', url: 'https://learn.microsoft.com/en-us/azure/azure-monitor/overview' },
    diag: { label: 'Microsoft Learn · Diagnostic settings in Azure Monitor', url: 'https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/diagnostic-settings' },
    logQuery: { label: 'Microsoft Learn · Log queries in Azure Monitor', url: 'https://learn.microsoft.com/en-us/azure/azure-monitor/logs/log-query-overview' },
    kql: { label: 'Microsoft Learn · Kusto Query Language (KQL) reference', url: 'https://learn.microsoft.com/en-us/kusto/query/' },
    alerts: { label: 'Microsoft Learn · Azure Monitor alerts overview', url: 'https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-overview' },
    actionGroups: { label: 'Microsoft Learn · Action groups', url: 'https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/action-groups' },
    apr: { label: 'Microsoft Learn · Alert processing rules', url: 'https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-processing-rules' },
    aprCli: { label: 'Azure CLI · az monitor alert-processing-rule', url: 'https://learn.microsoft.com/en-us/cli/azure/monitor/alert-processing-rule' },
    logAlert: { label: 'Microsoft Learn · Create log search alert rules', url: 'https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-create-log-alert-rule' },
    vmMon: { label: 'Microsoft Learn · Monitor virtual machines in Azure', url: 'https://learn.microsoft.com/en-us/azure/azure-monitor/vm/monitor-vm' },
    nw: { label: 'Microsoft Learn · What is Azure Network Watcher?', url: 'https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-overview' },
    connMon: { label: 'Microsoft Learn · Connection monitor overview', url: 'https://learn.microsoft.com/en-us/azure/network-watcher/connection-monitor-overview' },
    esec: { label: 'Elastic docs · Elastic Security', url: 'https://www.elastic.co/docs/solutions/security' },
    esecDetect: { label: 'Elastic docs · Detections and alerts', url: 'https://www.elastic.co/docs/solutions/security/detect-and-alert' },
    esecRule: { label: 'Elastic docs · Create a detection rule', url: 'https://www.elastic.co/docs/solutions/security/detect-and-alert/create-detection-rule' },
    esecPrebuilt: { label: 'Elastic docs · Install Elastic prebuilt rules', url: 'https://www.elastic.co/docs/solutions/security/detect-and-alert/install-manage-elastic-prebuilt-rules' },
    esecTimeline: { label: 'Elastic docs · Timeline', url: 'https://www.elastic.co/docs/solutions/security/investigate/timeline' },
    esecCases: { label: 'Elastic docs · Cases for Elastic Security', url: 'https://www.elastic.co/docs/solutions/security/investigate/cases' },
    esecMitre: { label: 'Elastic docs · MITRE ATT&CK coverage', url: 'https://www.elastic.co/docs/solutions/security/detect-and-alert/mitre-attandckr-coverage' },
    eql: { label: 'Elastic docs · EQL', url: 'https://www.elastic.co/docs/reference/query-languages/eql' },
    ransomware: { label: 'Microsoft Learn · Backup and restore plan to protect against ransomware', url: 'https://learn.microsoft.com/en-us/azure/security/fundamentals/backup-plan-to-protect-against-ransomware' },
    azBackupSec: { label: 'Microsoft Learn · Azure Backup security features', url: 'https://learn.microsoft.com/en-us/azure/backup/backup-azure-security-feature' },
    azRestoreVm: { label: 'Microsoft Learn · Restore Azure VMs', url: 'https://learn.microsoft.com/en-us/azure/backup/backup-azure-arm-restore-vms' },
    immutable: { label: 'Microsoft Learn · Immutable vault for Azure Backup', url: 'https://learn.microsoft.com/en-us/azure/backup/backup-azure-immutable-vault-concept' },
    pveBackup: { label: 'Proxmox VE wiki · Backup and Restore', url: 'https://pve.proxmox.com/wiki/Backup_and_Restore' },
    pbs: { label: 'Proxmox Backup Server documentation', url: 'https://pbs.proxmox.com/docs/' },
    pbsMaint: { label: 'Proxmox Backup Server · Maintenance tasks (verify, prune, GC)', url: 'https://pbs.proxmox.com/docs/maintenance.html' },
    pbm: { label: 'Percona Backup for MongoDB documentation', url: 'https://docs.percona.com/percona-backup-mongodb/' },
    pbmRestore: { label: 'Percona Backup for MongoDB · Restore from a logical backup', url: 'https://docs.percona.com/percona-backup-mongodb/latest/usage/restore.html' },
    pbmPitr: { label: 'Percona Backup for MongoDB · Point-in-time restore from a logical backup', url: 'https://docs.percona.com/percona-backup-mongodb/latest/usage/pitr-tutorial.html' },
  };

  /* ---- lab files ---- */
  PL.PLACEHOLDERS.W12_KQL_REQ = L(
    'Workspace: law-shop-prod (VMs send performance counters and heartbeats through Azure Monitor Agent data collection rules).',
    'Tables available: Perf, Heartbeat, AzureActivity, AzureDiagnostics, Event, Syslog.',
    '',
    'Requirement from the on-call lead:',
    '  1. For the last 24 hours, average CPU (% Processor Time, all instances) per computer in 5-minute bins,',
    '     but only for computers whose 5-minute average went above 80 % at least once. Render as a time chart.',
    '  2. A second query: computers that have not sent a heartbeat in the last 15 minutes, with the time they were last seen.',
    '     Use it later as a log search alert.'
  );
  PL.FILE_LABELS.W12_KQL_REQ = 'kql-requirement.txt';

  PL.PLACEHOLDERS.W12_AUTH_EVENTS = L(
    '# Elastic Security · logs-system.auth-default · host pve-02 (Proxmox VE node, SSH on 22) · times UTC, 2026-09-26',
    '@timestamp            event.category  event.action  event.outcome  user.name  source.ip       message',
    '23:31:04              authentication  ssh_login     failure        root       198.51.100.23   Failed password for root',
    '23:31:39              authentication  ssh_login     failure        admin      198.51.100.23   Failed password for invalid user admin',
    '23:32:15              authentication  ssh_login     failure        backup     198.51.100.23   Failed password for backup',
    '23:33:02              authentication  ssh_login     failure        backup     198.51.100.23   Failed password for backup',
    '23:34:47              authentication  ssh_login     failure        backup     198.51.100.23   Failed password for backup',
    '23:36:20              authentication  ssh_login     failure        backup     198.51.100.23   Failed password for backup',
    '23:40:12              authentication  ssh_login     success        backup     198.51.100.23   Accepted password for backup',
    '23:42:05              iam             user-added    success        svc-sync   -               new user: name=svc-sync, UID=1002',
    '23:44:31              process         sudo          success        backup     -               backup : COMMAND=/usr/sbin/usermod -aG sudo svc-sync',
    '23:51:10              network         connection    success        svc-sync   10.20.30.210    ssh svc-sync@mongo-01 (VM 210)',
    '',
    'Existing coverage: prebuilt rules installed, none enabled for logs-system.auth-*. No alert fired.'
  );
  PL.FILE_LABELS.W12_AUTH_EVENTS = 'pve-02-auth-events.txt';

  PL.PLACEHOLDERS.W12_RESTORE_POINTS = L(
    'INCIDENT INC-2026-0927 · simulated compromise (tabletop + technical restore test)',
    '',
    'Timeline (UTC) from Elastic, Wazuh and the Azure Activity Log:',
    '  2026-09-26 23:31  SSH password guessing against pve-02 from 198.51.100.23',
    '  2026-09-26 23:40  INITIAL ACCESS: successful login as "backup" on pve-02',
    '  2026-09-26 23:51  lateral movement to mongo-01 (Proxmox VM 210, MongoDB replica set rs-orders)',
    '  2026-09-27 00:58  service principal sp-orders-sync (client secret read from /etc/orders-sync.env on VM 210) signs in to Azure',
    '  2026-09-27 01:12  sp-orders-sync adds a role assignment and changes app settings on vm-orders-api-01 (Azure)',
    '  2026-09-27 03:14  FIRST ALERT: Wazuh rule on unexpected sudo group change; incident opened',
    '',
    'Azure Backup · vault rsv-shop-prod · item vm-orders-api-01 (recovery points):',
    '  rp_20260925_0200   2026-09-25 02:00   Snapshot and Vault',
    '  rp_20260926_0200   2026-09-26 02:00   Snapshot and Vault',
    '  rp_20260927_0200   2026-09-27 02:00   Snapshot and Vault',
    '  rp_20260928_0200   2026-09-28 02:00   Snapshot',
    '',
    'Proxmox Backup Server · datastore pbs-store · VM 210 (mongo-01) snapshots (all "verify ok"):',
    '  vm/210/2026-09-25T01:00:00Z',
    '  vm/210/2026-09-26T01:00:00Z',
    '  vm/210/2026-09-27T01:00:00Z',
    '  vm/210/2026-09-28T01:00:00Z',
    '',
    'Percona Backup for MongoDB · rs-orders:',
    '  logical backups: 2026-09-25T01:30:00Z, 2026-09-26T01:30:00Z, 2026-09-27T01:30:00Z',
    '  PITR oplog chunks: 2026-09-25T01:30:00Z → 2026-09-28T09:00:00Z',
    '',
    'Constraints: orders written between 2026-09-26 01:30 and 23:30 are legitimate and should be kept if possible.',
    'An isolated network exists: Azure VNet vnet-restore-iso (no peering, NSG denies internet), Proxmox bridge vmbr9 (no uplink).'
  );
  PL.FILE_LABELS.W12_RESTORE_POINTS = 'inc-2026-0927-restore-points.txt';

  /* ---- sims ---- */
  const KQL_ANSWER = L(
    '### 1. CPU over 80 % (5-minute bins, last 24 h)',
    '```kusto',
    'let window = 24h;',
    'let cpu = Perf',
    '    | where TimeGenerated > ago(window)',
    '    | where ObjectName == "Processor" and CounterName == "% Processor Time" and InstanceName == "_Total"',
    '    | summarize AvgCPU = avg(CounterValue) by Computer, bin(TimeGenerated, 5m);',
    'let hot = cpu | where AvgCPU > 80 | distinct Computer;',
    'cpu',
    '| where Computer in (hot)',
    '| render timechart',
    '```',
    'Windows reports the total as instance `_Total`; for Linux counters collected by a DCR, check the instance name in your workspace (`Perf | distinct ObjectName, CounterName, InstanceName`).',
    '',
    '### 2. Missing heartbeat (last seen more than 15 minutes ago)',
    '```kusto',
    'Heartbeat',
    '| where TimeGenerated > ago(24h)',
    '| summarize LastSeen = max(TimeGenerated) by Computer, ResourceGroup = _ResourceId',
    '| where LastSeen < ago(15m)',
    '| order by LastSeen asc',
    '```',
    'Use query 2 in a log search alert with "Number of results greater than 0", evaluated every 5 minutes, routed to the on-call action group.'
  );

  const ALERT_ANSWER = L(
    '## 1. Send Key Vault audit logs and metrics to the workspace',
    '```bash',
    'KV_ID=$(az keyvault show -n kv-shop-prod -g rg-shop-prod --query id -o tsv)',
    'LAW_ID=$(az monitor log-analytics workspace show -g rg-monitor -n law-shop-prod --query id -o tsv)',
    'az monitor diagnostic-settings create --name diag-kv-to-law --resource "$KV_ID" --workspace "$LAW_ID" \\',
    '  --logs \'[{"categoryGroup":"audit","enabled":true}]\' --metrics \'[{"category":"AllMetrics","enabled":true}]\'',
    '```',
    '## 2. Action group for on-call',
    '```bash',
    'az monitor action-group create --resource-group rg-monitor --name ag-platform-oncall --short-name plat-oncall \\',
    '  --action email oncall platform-oncall@contoso.example',
    'AG_ID=$(az monitor action-group show -g rg-monitor -n ag-platform-oncall --query id -o tsv)',
    '```',
    '## 3. Metric alert: CPU above 80 % for 5 minutes',
    '```bash',
    'VM_ID=$(az vm show -g rg-shop-prod -n vm-orders-api-01 --query id -o tsv)',
    'az monitor metrics alert create --name alert-cpu-high-orders-api --resource-group rg-monitor \\',
    '  --scopes "$VM_ID" --condition "avg Percentage CPU > 80" \\',
    '  --window-size 5m --evaluation-frequency 1m --severity 2 --action "$AG_ID" \\',
    '  --description "CPU above 80% for 5 minutes on vm-orders-api-01"',
    '```',
    '## 4. Silence notifications during the Saturday patch window',
    '```bash',
    'az monitor alert-processing-rule create --name apr-sat-patch-window --resource-group rg-monitor \\',
    '  --rule-type RemoveAllActionGroups --scopes "/subscriptions/<sub-id>/resourceGroups/rg-shop-prod" \\',
    '  --schedule-recurrence-type Weekly --schedule-recurrence Saturday \\',
    '  --schedule-recurrence-start-time "22:00:00" --schedule-recurrence-end-time "23:59:59" \\',
    '  --schedule-time-zone "W. Europe Standard Time" \\',
    '  --description "Suppress notifications during the weekly patch window"',
    '```',
    'Alerts still fire and are recorded during the window; only the notifications are removed. `alert-processing-rule` comes from the alertsmanagement CLI extension, which installs on first use.',
    '',
    '## 5. Verify',
    '```bash',
    'az monitor diagnostic-settings list --resource "$KV_ID" -o table',
    'az monitor metrics alert show -g rg-monitor -n alert-cpu-high-orders-api -o table',
    'az monitor alert-processing-rule show -g rg-monitor -n apr-sat-patch-window',
    '```'
  );

  const RULE = {
    name: 'SSH password guessing followed by successful login (Proxmox hosts)',
    description: 'Five or more failed SSH logins from one source IP to one host, followed by a successful login from the same IP within 15 minutes.',
    type: 'eql',
    language: 'eql',
    index: ['logs-system.auth-*'],
    query: 'sequence by source.ip, host.name with maxspan=15m\n  [authentication where event.action == "ssh_login" and event.outcome == "failure"] with runs=5\n  [authentication where event.action == "ssh_login" and event.outcome == "success"]',
    severity: 'high',
    risk_score: 73,
    interval: '5m',
    from: 'now-20m',
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: { id: 'TA0006', name: 'Credential Access', reference: 'https://attack.mitre.org/tactics/TA0006/' },
        technique: [{ id: 'T1110', name: 'Brute Force', reference: 'https://attack.mitre.org/techniques/T1110/' }],
      },
      {
        framework: 'MITRE ATT&CK',
        tactic: { id: 'TA0001', name: 'Initial Access', reference: 'https://attack.mitre.org/tactics/TA0001/' },
        technique: [{ id: 'T1078', name: 'Valid Accounts', reference: 'https://attack.mitre.org/techniques/T1078/' }],
      },
    ],
    false_positives: ['An engineer mistyping a password several times before logging in from a known admin IP; exclude the bastion subnet after review.'],
    triage_timeline: [
      { time: '2026-09-26T23:31:04Z', event: 'First failed SSH login (root)', host: 'pve-02', user: 'root', note: 'Start of password guessing from 198.51.100.23' },
      { time: '2026-09-26T23:36:20Z', event: 'Sixth failed login, four against backup', host: 'pve-02', user: 'backup', note: 'Attacker focused on the backup account' },
      { time: '2026-09-26T23:40:12Z', event: 'Successful SSH login as backup', host: 'pve-02', user: 'backup', note: 'Initial access: password authentication succeeded' },
      { time: '2026-09-26T23:42:05Z', event: 'Local user svc-sync created', host: 'pve-02', user: 'svc-sync', note: 'Persistence (T1136 Create Account)' },
      { time: '2026-09-26T23:44:31Z', event: 'svc-sync added to sudo group by backup', host: 'pve-02', user: 'backup', note: 'Privilege escalation' },
      { time: '2026-09-26T23:51:10Z', event: 'SSH from pve-02 to mongo-01 (VM 210) as svc-sync', host: 'pve-02', user: 'svc-sync', note: 'Lateral movement to the MongoDB VM' },
    ],
    case_summary: 'Brute force against SSH on pve-02 from 198.51.100.23 led to a successful login as backup at 23:40 UTC, a new sudo user svc-sync, and lateral movement to mongo-01. Treat pve-02 and VM 210 as compromised from 2026-09-26 23:40 UTC.',
    next_actions: [
      'Isolate pve-02 management access and VM 210 network (move to an isolated bridge) while preserving evidence.',
      'Disable the backup and svc-sync accounts and block 198.51.100.23 at the edge.',
      'Rotate every credential reachable from pve-02 and VM 210 (SSH keys, PBS tokens, MongoDB users, service principal secrets).',
      'Disable SSH password authentication on all Proxmox nodes.',
      'Open a case, attach this timeline, and start the compromise-restore plan with a clean point before 23:40 UTC.',
    ],
  };

  const PLAN = {
    incident_id: 'INC-2026-0927',
    initial_access_time: '2026-09-26T23:40:00Z',
    clean_point_rule: 'Use the latest restore point taken before initial access (2026-09-26 23:40 UTC), not before the first alert (03:14 on 27 Sep). Points taken after initial access may contain attacker changes or stolen credentials.',
    phases: ['isolate', 'preserve_evidence', 'select_clean_point', 'restore_isolated', 'validate', 'rotate_credentials', 'cutover', 'post_incident'],
    workloads: [
      {
        name: 'vm-orders-api-01', platform: 'azure', restore_point_id: 'rp_20260926_0200', restore_point_time: '2026-09-26T02:00:00Z',
        why_clean: 'Latest recovery point before initial access; rp_20260927_0200 was taken after sp-orders-sync changed the VM at 01:12.',
        isolation: 'Stop the compromised VM (keep its disks for forensics) and restore as a new VM into the isolated VNet vnet-restore-iso, which has no peering and an NSG that denies internet traffic.',
        restore_command: 'az backup restore restore-disks --resource-group rg-shop-prod --vault-name rsv-shop-prod --container-name vm-orders-api-01 --item-name vm-orders-api-01 --rp-name rp_20260926_0200 --storage-account stshoprestore --target-resource-group rg-restore-iso',
        integrity_checks: ['Compare installed packages, local users and app settings against the golden image and IaC', 'Defender for Endpoint / antimalware full scan on the restored disks', 'Check for the role assignment and app-setting changes from 01:12: they must be absent'],
      },
      {
        name: 'mongo-01 (VM 210)', platform: 'proxmox', restore_point_id: 'vm/210/2026-09-26T01:00:00Z', restore_point_time: '2026-09-26T01:00:00Z',
        why_clean: 'Snapshot from 01:00 on 26 Sep predates the 23:40 login; later snapshots include the period after lateral movement.',
        isolation: 'Shut down VM 210 and keep it for forensics; restore as VM 910 with --unique and attach net0 to vmbr9, which has no uplink, before first boot.',
        restore_command: 'qmrestore pbs-store:backup/vm/210/2026-09-26T01:00:00Z 910 --unique 1 && qm set 910 --net0 virtio,bridge=vmbr9',
        integrity_checks: ['PBS verify job result for the snapshot is ok', 'No svc-sync user, no unknown authorized_keys, no new cron or systemd units', 'mongod starts cleanly and rs.status() is healthy'],
      },
      {
        name: 'rs-orders MongoDB data', platform: 'mongodb', restore_point_id: 'PITR from logical backup 2026-09-26T01:30:00Z', restore_point_time: '2026-09-26T23:30:00Z',
        why_clean: 'Point-in-time restore to 23:30, before the first successful login at 23:40, keeps the legitimate orders written that day.',
        isolation: 'Restore into the replica set on the isolated VM 910, reaching the backup storage read-only and nothing else.',
        restore_command: 'pbm config --set pitr.enabled=false && pbm restore --time="2026-09-26T23:30:00"',
        integrity_checks: ['Document counts and the latest order timestamp per collection match expectations up to 23:30', 'db.getUsers() shows no unknown users or roles', 'Application read/write smoke test from an isolated test client'],
      },
    ],
    credential_rotation: [
      { credential: 'sp-orders-sync service principal', action: 'Delete the client secret and remove the rogue role assignment; replace with a managed identity or a new secret stored only in Key Vault.' },
      { credential: 'MongoDB users on rs-orders', action: 'Rotate every application and admin password, store the new ones in Key Vault, and remove any user created after 23:40.' },
      { credential: 'Linux accounts and SSH keys on pve-02 and VM 910', action: 'Disable backup and svc-sync, rotate SSH host and user keys, disable password authentication.' },
      { credential: 'Proxmox and PBS API tokens, root@pam', action: 'Revoke and reissue tokens used by pve-02; change root passwords and enforce 2FA on the PVE and PBS web UIs.' },
      { credential: 'Key Vault secrets readable by the compromised identities', action: 'Rotate each secret version and check the Key Vault audit log for reads after 00:58.' },
    ],
    cutover: {
      go_criteria: ['All integrity checks passed on the isolated restores', 'All credentials rotated and old ones tested to fail', 'Detection rule for the entry path is enabled and tested', 'Service owner signs off on the data loss window (23:30 onwards)'],
      steps: ['Move VM 910 to the production bridge and update the replica set membership', 'Swap the restored Azure VM into the production subnet and load balancer pool', 'Re-enable PITR and take a fresh full backup of rs-orders', 'Watch the W11 SLO dashboard and error budget for 24 hours'],
      rollback: 'Keep the isolated restores and the original disks; if validation fails after cutover, drain traffic and return to maintenance mode rather than to the compromised systems.',
    },
    evidence: ['Timeline with initial-access time and the reasoning for each clean point', 'Restore command output and durations (RTO) and data-loss window (RPO)', 'Integrity check results', 'Credential rotation log', 'Cutover sign-off'],
  };

  /* =====================================================================
     Topic 1 — AZ-104: monitor resources
     ===================================================================== */
  const t1 = {
    id: 'w12-t1',
    title: 'AZ-104 · Monitor Azure resources',
    programmeItem: 'AZ-104 Microsoft Azure Administrator (5h slot): metrics, log settings, KQL, alert rules, action groups, alert processing rules, Insights, Network Watcher and Connection monitor (free: Microsoft Learn)',
    blurb: 'Get the right signals into Azure Monitor, query them with KQL, alert on what matters, send alerts to the right people, and use Insights and Network Watcher when something breaks.',
    outcomes: [
      'Configure diagnostic settings and interpret metrics for Azure resources',
      'Write KQL queries in Log Analytics for performance, heartbeat and activity data',
      'Build alert rules with action groups and alert processing rules, and use VM, storage and network Insights plus Network Watcher',
    ],
    concepts: [
      { t: 'Metrics and logs', d: 'Platform metrics are collected automatically and kept for a limited time. Resource logs are not collected until you create a diagnostic setting that sends them to a Log Analytics workspace, storage account or event hub.', ex: 'az monitor diagnostic-settings create' },
      { t: 'KQL basics', d: 'A query starts from a table and pipes through operators: where to filter, summarize to aggregate, bin() to group by time, render to chart. Always filter TimeGenerated early.', ex: 'Perf | where … | summarize avg(CounterValue) by bin(TimeGenerated, 5m)' },
      { t: 'Common tables', d: 'Perf (performance counters), Heartbeat (agent liveness), AzureActivity (control-plane operations), AzureDiagnostics (many resource logs), plus resource-specific tables for newer services.', ex: 'AzureActivity | where OperationNameValue has "delete"' },
      { t: 'Alert rules', d: 'Metric, log search and activity log alerts evaluate a signal and fire with a severity (Sev0 to Sev4). An action group decides who is notified and what runs: email, SMS, webhook, Function, Logic App, ITSM.', ex: 'metric alert → ag-platform-oncall' },
      { t: 'Alert processing rules', d: 'Change what happens to fired alerts at scale: add action groups, or remove all action groups during a maintenance window. The alerts still fire and are recorded.', ex: '--rule-type RemoveAllActionGroups' },
      { t: 'Insights and Network Watcher', d: 'VM, storage and network Insights give ready-made views. Network Watcher adds IP flow verify, next hop, NSG diagnostics, packet capture and Connection monitor for ongoing reachability and latency tests.', ex: 'Connection monitor: app → SQL :1433' },
    ],
    leverage: [
      { t: 'KQL from plain English', d: 'Describe what you need ("VMs silent for 15 minutes") and the table you think holds it. Claude writes the query and explains each operator, and you run it in Log Analytics.' },
      { t: 'Alert design review', d: 'Paste your alert rules and ask Claude which are noisy, which lack an owner or runbook, and which should be burn-rate or log alerts instead.' },
      { t: 'Scripted monitoring baselines', d: 'Have Claude generate az CLI or Bicep for diagnostic settings, action groups and standard alerts, so every new subscription gets the same baseline.' },
    ],
    sources: [SRC.az104, SRC.monitor, SRC.diag, SRC.logQuery, SRC.alerts, SRC.apr, SRC.connMon],
    quiz: [
      { q: 'Key Vault audit logs are not in Log Analytics. What is missing?', options: ['An action group', 'A diagnostic setting that sends the logs to the workspace', 'A metric alert'], a: 1, why: 'Resource logs are only collected when a diagnostic setting routes them somewhere.' },
      { q: 'You need no notifications during Saturday patching, but alerts should still be recorded. What do you use?', options: ['Disable every alert rule', 'An alert processing rule that removes all action groups on a schedule', 'Delete the action group'], a: 1, why: 'Alert processing rules suppress notifications while alerts still fire.' },
      { q: 'Which operator groups results into 5-minute buckets?', options: ['take 5m', 'summarize … by bin(TimeGenerated, 5m)', 'where TimeGenerated == 5m'], a: 1, why: 'bin() rounds timestamps into buckets for summarize.' },
    ],
    steps: [
      {
        id: 'w12-t1-s1', kind: 'guide', title: 'Study coach and sandbox monitoring baseline', minutes: 60, source: SRC.az104,
        scenario: 'Drill the monitoring objectives with your AZ-104 study Project, then build a small monitoring baseline in a sandbox and test Network Watcher tools.',
        task: [
          'Run prompt 1 in your "AZ-104 study" Project and answer each question before reading the explanation.',
          'Run prompt 2 and build the baseline in a sandbox subscription. Then use IP flow verify and next hop on one VM.',
          'Delete the sandbox resource group when you finish.',
        ],
        prompts: [
          { label: 'Practice questions', where: 'claude.ai', text: 'Quiz me on the AZ-104 area "Monitor resources in Azure": metrics, diagnostic settings, KQL in Log Analytics, alert rules, action groups, alert processing rules, VM/storage/network Insights, Network Watcher and Connection monitor. 10 scenario questions, one at a time, 4 options each. After each answer, explain the right and wrong options and name the Microsoft Learn page to verify.' },
          { label: 'Sandbox baseline', where: 'claude.ai', text: 'Give me az CLI for a sandbox in rg-az104-mon (westeurope): a Log Analytics workspace, one small Ubuntu VM with the Azure Monitor Agent and a data collection rule sending CPU/memory counters and Syslog to the workspace, a diagnostic setting sending a storage account\'s blob logs to the workspace, an action group with my email, and a metric alert on VM CPU > 80 % for 5 minutes. Then give the Network Watcher commands for IP flow verify and next hop on that VM, and explain what each result tells me. No secrets in the output.' },
        ],
        expected: ['10 practice questions answered with explanations reviewed', 'Perf and Syslog data visible in the workspace', 'A test alert email received, and IP flow verify and next hop results understood'],
        verify: 'Check the commands against the Azure Monitor diagnostic settings, action groups and Network Watcher docs before running them. Confirm the data arrives with a quick Perf | take 10.',
        atWork: 'Build the baseline once, save it as a script or Bicep module, and apply it to every new subscription. Use the study Project whenever an alert or KQL question comes up on call.',
        checks: [
          { id: 'quiz', label: 'I answered 10 practice questions and reviewed the explanations', manual: true },
          { id: 'baseline', label: 'I built the sandbox baseline and saw data and a test alert', manual: true },
          { id: 'nw', label: 'I ran IP flow verify and next hop and understood the results', manual: true },
        ],
      },
      {
        id: 'w12-t1-s2', title: 'Write KQL from an on-call requirement', minutes: 8, source: SRC.logQuery, files: ['W12_KQL_REQ'],
        scenario: 'The on-call lead wants two queries: hot CPU in 5-minute bins and computers that stopped sending heartbeats. Ask Claude for both.',
        task: ['Read <code>kql-requirement.txt</code>.', 'Click <b>Run</b>.', 'Paste the queries into Log Analytics in your sandbox workspace and check the results make sense.'],
        atWork: 'Say which tables exist and what the output should look like. Claude writes the KQL, but you still run it and check the counts against a resource you know.',
        hint: 'CPU is in Perf (ObjectName "Processor", CounterName "% Processor Time"); liveness is in Heartbeat.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' },
          system: 'You are an Azure Monitor engineer. Write correct, efficient KQL in kusto code blocks and explain briefly. Filter on TimeGenerated early.',
          messages: user(L('<requirement>', '{{W12_KQL_REQ}}', '</requirement>', 'Write both queries.')),
        },
        checks: [
          { id: 'perf', label: 'Query 1 uses the Perf table with the % Processor Time counter', test: (c, h) => /\bPerf\b/.test(h.text(c)) && /% Processor Time/.test(h.text(c)) },
          { id: 'time', label: 'Filters TimeGenerated to the last 24 hours with ago()', test: (c, h) => /TimeGenerated\s*>\s*ago\(\s*(24h|1d|window)\s*\)/.test(h.text(c)) },
          { id: 'bin', label: 'Uses summarize … by bin(TimeGenerated, 5m)', test: (c, h) => /summarize[^\n]*avg\(CounterValue\)[^\n]*bin\(TimeGenerated,\s*5m\)/.test(h.text(c)) },
          { id: 'threshold', label: 'Keeps only computers above 80 %', test: (c, h) => /> ?80\b/.test(h.text(c)) },
          { id: 'hb', label: 'Query 2 finds the last Heartbeat per computer older than 15 minutes', test: (c, h) => /\bHeartbeat\b/.test(h.text(c)) && /max\(TimeGenerated\)[^\n]*by[^\n]*Computer/.test(h.text(c)) && /<\s*ago\(15m\)/.test(h.text(c)) },
        ],
        sim: [textTurn(KQL_ANSWER, { input_tokens: 240, output_tokens: 520 })],
      },
      {
        id: 'w12-t1-s3', title: 'Diagnostic setting, action group, alert and maintenance window', minutes: 8, source: SRC.aprCli,
        scenario: 'Wire up one complete alerting chain with az CLI: Key Vault logs to the workspace, an on-call action group, a CPU metric alert, and an alert processing rule that silences notifications during the Saturday patch window.',
        task: ['Click <b>Run</b>.', 'Check each command against the Azure CLI reference.', 'Notice the difference between disabling an alert and removing its notifications.'],
        atWork: 'Ask for the whole chain (collect, alert, route, suppress, verify). A metric alert without an action group, or a patch window with no suppression, is how teams end up with alert fatigue.',
        hint: 'Alert processing rules use --rule-type RemoveAllActionGroups with --schedule-* parameters.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' },
          system: 'You are an Azure administrator. Give exact Azure CLI commands in bash code blocks with a one-line explanation each.',
          messages: user('Workspace law-shop-prod in rg-monitor. 1) Send kv-shop-prod (rg-shop-prod) audit logs and all metrics to it. 2) Create action group ag-platform-oncall emailing platform-oncall@contoso.example. 3) Alert when vm-orders-api-01 (rg-shop-prod) averages CPU above 80 % over 5 minutes, severity 2, to that action group. 4) Every Saturday 22:00 to midnight (W. Europe time), stop notifications for alerts in rg-shop-prod, but keep the alerts. 5) How to verify.'),
        },
        checks: [
          { id: 'diag', label: 'Creates a diagnostic setting to the workspace', test: (c, h) => /az monitor diagnostic-settings create/.test(h.text(c)) && /--workspace/.test(h.text(c)) },
          { id: 'ag', label: 'Creates the action group with a short name and email action', test: (c, h) => /az monitor action-group create/.test(h.text(c)) && /--short-name/.test(h.text(c)) && /--action email/.test(h.text(c)) },
          { id: 'alert', label: 'Creates a metric alert on Percentage CPU > 80 wired to the action group', test: (c, h) => { const t = h.text(c); return /az monitor metrics alert create/.test(t) && /--condition "avg Percentage CPU > 80"/.test(t) && /--window-size 5m/.test(t) && /--action/.test(t); } },
          { id: 'apr', label: 'Adds an alert processing rule that removes action groups on a weekly schedule', test: (c, h) => { const t = h.text(c); return /az monitor alert-processing-rule create/.test(t) && /--rule-type RemoveAllActionGroups/.test(t) && /--schedule-recurrence-type Weekly/.test(t) && /Saturday/.test(t); } },
          { id: 'nodisable', label: 'Does not disable or delete the alert rule to silence it', test: (c, h) => !/metrics alert (update[^\n]*--enabled false|delete)/.test(h.text(c)) },
        ],
        sim: [textTurn(ALERT_ANSWER, { input_tokens: 280, output_tokens: 760 })],
      },
    ],
  };

  /* =====================================================================
     Topic 2 — Elastic Security fundamentals
     ===================================================================== */
  const t2 = {
    id: 'w12-t2',
    title: 'Elastic Security fundamentals: detections, timelines and cases',
    programmeItem: 'Elastic Security fundamentals: detection engine, prebuilt rules, timelines, cases (free: Elastic Security documentation)',
    blurb: 'Turn logs you already ship into Elastic into alerts that matter: enable the right prebuilt rules, write a custom rule for your estate, and investigate with Timeline and Cases.',
    outcomes: [
      'Explain how the detection engine runs rules and what the main rule types do',
      'Draft a custom EQL or KQL rule with index patterns, severity, risk score and MITRE ATT&CK mapping',
      'Investigate an alert in Timeline and track it in a case',
    ],
    concepts: [
      { t: 'Detection engine', d: 'Rules run on a schedule (interval) over a look-back window (from) against index patterns or data views, and write alerts you triage in the Alerts page.', ex: 'interval 5m, from now-20m' },
      { t: 'Rule types', d: 'Custom query (KQL or Lucene), EQL for event sequences, threshold, indicator match, new terms, ES|QL and machine learning. Use EQL when order matters, for example failures followed by success.', ex: 'sequence by source.ip [...] [...]' },
      { t: 'Prebuilt rules', d: 'Elastic ships and updates a large set of prebuilt rules mapped to MITRE ATT&CK. Install them, then enable the ones whose data you actually collect, and tune exceptions rather than disabling them.', ex: 'Rules → Add Elastic rules' },
      { t: 'Severity and risk score', d: 'Severity (low, medium, high, critical) drives triage; the risk score (0 to 100) feeds entity risk. Elastic\'s defaults map them as 21, 47, 73 and 99.', ex: 'high → 73' },
      { t: 'Timeline', d: 'A workspace for investigating: drag events and alerts in, query around them, add notes, and save it so others can follow your reasoning.', ex: 'timeline: pve-02, 23:30–23:55' },
      { t: 'Cases', d: 'Track an investigation with its alerts, timelines, comments and status, and push it to an external system such as Jira or ServiceNow if connected.', ex: 'case INC-2026-0927' },
    ],
    leverage: [
      { t: 'Rule drafting', d: 'Describe the attack and paste a few sample events in ECS format. Claude drafts the EQL or KQL rule, the MITRE mapping and false-positive notes, and you test it against your data before enabling.' },
      { t: 'Faster triage summaries', d: 'Export alert and timeline events (redacted) and ask Claude for a timeline, the probable entry point and the next actions for the case.' },
      { t: 'Coverage gaps', d: 'Give Claude your enabled rules list and your log sources, and ask which ATT&CK tactics you cannot see and which prebuilt rules would close the gap.' },
    ],
    sources: [SRC.esec, SRC.esecDetect, SRC.esecRule, SRC.esecPrebuilt, SRC.esecTimeline, SRC.esecCases, SRC.eql],
    quiz: [
      { q: 'You need to detect failed logins followed by a success from the same IP. Which rule type fits best?', options: ['Threshold', 'EQL sequence', 'Machine learning'], a: 1, why: 'EQL sequences match ordered events joined on a field such as source.ip.' },
      { q: 'A prebuilt rule is noisy for one known admin host. What should you do first?', options: ['Disable the rule', 'Add a rule exception for that host after reviewing it', 'Delete the index'], a: 1, why: 'Exceptions keep coverage while removing a known false positive.' },
      { q: 'Where do you keep the investigation of an alert so others can follow it?', options: ['Only in chat', 'A saved Timeline attached to a case', 'In the rule description'], a: 1, why: 'Timelines hold the evidence and notes; cases track the investigation.' },
    ],
    steps: [
      {
        id: 'w12-t2-s1', kind: 'guide', title: 'Enable prebuilt rules and investigate in Timeline', minutes: 45, source: SRC.esecPrebuilt,
        scenario: 'In your Elastic Security space (lab or production with approval), enable prebuilt rules for the data you collect, then investigate one alert with Timeline and a case, using Claude to summarise.',
        task: [
          'Run prompt 1 in claude.ai with a list of your integrations (names only) to pick the prebuilt rules to enable.',
          'Enable them, trigger or pick one real alert, and build a Timeline around it.',
          'Export the timeline events (redact usernames and IPs you should not share) and run prompt 2. Create a case with the summary.',
        ],
        prompts: [
          { label: 'Choose prebuilt rules', where: 'claude.ai', text: 'We run Elastic Security with these integrations: [System (auth, syslog), Elastic Defend on Linux, Azure activity logs, Wazuh forwarder]. Our estate: Proxmox VE nodes, Linux VMs with MongoDB, Azure App Service and VMs. Which Elastic prebuilt rule categories and specific rule themes should we enable first, which ATT&CK tactics would still be blind, and what exceptions would we likely need (backup jobs, admin bastion)? Output a table. I will check each rule name in Kibana.' },
          { label: 'Triage summary', where: 'claude.ai', text: 'Here are the events from my Elastic Timeline (redacted). Build a triage summary: an ordered timeline with the ATT&CK technique for each step, the probable entry point, affected hosts and accounts, what is confirmed vs suspected, and the next 5 actions. Keep it short enough to paste into an Elastic case.\n[paste redacted events]' },
        ],
        expected: ['A shortlist of prebuilt rules mapped to your data sources', 'A saved Timeline with notes', 'A case containing Claude\'s summary, which you reviewed and corrected'],
        verify: 'Look up every rule Claude names in Kibana (Rules → Add Elastic rules) because names change between versions, and confirm each timeline step against the raw events.',
        atWork: 'Claude is fast at turning a pile of events into an ordered story. You stay responsible for what is confirmed and for the actions taken.',
        checks: [
          { id: 'rules', label: 'I enabled prebuilt rules that match our data sources', manual: true },
          { id: 'timeline', label: 'I built and saved a Timeline for one alert', manual: true },
          { id: 'case', label: 'I created a case with a reviewed triage summary', manual: true },
        ],
      },
      {
        id: 'w12-t2-s2', title: 'Draft a detection rule and a triage timeline', minutes: 10, source: SRC.esecRule, files: ['W12_AUTH_EVENTS'],
        scenario: 'A Proxmox node was brute-forced over SSH and no alert fired. Ask Claude for a custom detection rule plus the triage timeline for this incident, as JSON.',
        task: ['Read <code>pve-02-auth-events.txt</code>.', 'Click <b>Run</b>.', 'Check the rule type, the index pattern, the severity and risk score pairing, and the MITRE mapping.'],
        atWork: 'This is how most custom rules start: a real miss, sample events, a draft from Claude, then testing against historical data before you enable it.',
        hint: 'Order matters here (failures, then a success from the same IP), so use an EQL sequence.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: {
            effort: 'high',
            format: jsonFormat(obj({
              name: S, description: S,
              type: en('query', 'eql', 'threshold', 'new_terms'),
              language: en('kuery', 'eql', 'lucene'),
              index: arr(S), query: S,
              severity: en('low', 'medium', 'high', 'critical'),
              risk_score: I, interval: S, from: S,
              threat: arr(obj({ framework: S, tactic: obj({ id: S, name: S, reference: S }), technique: arr(obj({ id: S, name: S, reference: S })) })),
              false_positives: arr(S),
              triage_timeline: arr(obj({ time: S, event: S, host: S, user: S, note: S })),
              case_summary: S,
              next_actions: arr(S),
            })),
          },
          system: 'You are a detection engineer for Elastic Security. Use ECS field names and valid EQL or KQL. Map severity to Elastic default risk scores (low 21, medium 47, high 73, critical 99).',
          messages: user(L('<events>', '{{W12_AUTH_EVENTS}}', '</events>', 'Draft a custom detection rule that would have caught this, with MITRE ATT&CK mapping, and give the triage timeline, a case summary and next actions.')),
        },
        checks: [
          { id: 'type', label: 'Uses an EQL sequence rule joined on source.ip', test: (c, h) => { const j = h.json(c); return !!j && j.type === 'eql' && j.language === 'eql' && /^sequence by [^\n]*source\.ip/.test(j.query) && /event\.outcome == "failure"/.test(j.query) && /event\.outcome == "success"/.test(j.query); } },
          { id: 'index', label: 'Targets the system auth logs index pattern', test: (c, h) => { const j = h.json(c); return !!j && j.index.some((i) => /^logs-system\.auth-\*$|^logs-\*$|^filebeat-\*$/.test(i)); } },
          { id: 'sev', label: 'Severity high or critical with the matching risk score', test: (c, h) => { const j = h.json(c); return !!j && ((j.severity === 'high' && j.risk_score >= 73 && j.risk_score < 99) || (j.severity === 'critical' && j.risk_score >= 99)); } },
          { id: 'mitre', label: 'Maps to MITRE ATT&CK Credential Access (TA0006) / Brute Force (T1110)', test: (c, h) => { const j = h.json(c); return !!j && j.threat.some((t) => t.framework === 'MITRE ATT&CK' && t.tactic.id === 'TA0006' && t.technique.some((x) => /^T1110/.test(x.id))); } },
          { id: 'timeline', label: 'Timeline includes the 23:40 successful login and the svc-sync user creation', test: (c, h) => { const j = h.json(c); return !!j && j.triage_timeline.some((e) => /23:40/.test(e.time)) && j.triage_timeline.some((e) => /svc-sync/.test(e.event + e.user) && /23:42/.test(e.time)); } },
          { id: 'actions', label: 'Next actions include isolation and credential rotation', test: (c, h) => { const j = h.json(c); return !!j && j.next_actions.some((a) => /isolat/i.test(a)) && j.next_actions.some((a) => /rotat/i.test(a)); } },
        ],
        sim: [jsonTurn(RULE, { input_tokens: 900, output_tokens: 1150 })],
      },
    ],
  };

  /* =====================================================================
     Topic 3 — Apply: restore from a simulated compromise
     ===================================================================== */
  const t3 = {
    id: 'w12-t3',
    title: 'Apply: restore from a simulated compromise',
    programmeItem: 'Apply task · Restore from a simulated compromise, not just an accidental failure: one Azure workload and one Proxmox VM with its MongoDB data. Feeds milestone EV-RE-05 (Week 16).',
    blurb: 'A restore after an attack is different from a restore after a disk failure: the newest backup may be poisoned and the credentials are burned. Prove you can isolate, pick a clean point, restore in isolation, validate, rotate and only then cut over.',
    outcomes: [
      'Choose a restore point from the initial-access time, not the alert time',
      'Restore one Azure workload and one Proxmox VM with its MongoDB data into an isolated network and validate them',
      'Rotate the exposed credentials before cutover and record evidence for EV-RE-05',
    ],
    concepts: [
      { t: 'Assume the latest backup is dirty', d: 'The attacker was inside before anyone noticed. Work out initial access from the evidence (Elastic, Wazuh, Activity Log) and restore from before it.', ex: 'alert 03:14, access 23:40 → restore ≤ 23:40' },
      { t: 'Isolate first', d: 'Contain the compromised systems and keep their disks for forensics. Restore into a network with no route to production or the internet.', ex: 'vnet-restore-iso · Proxmox vmbr9 (no uplink)' },
      { t: 'Protect the backups', d: 'Attackers go after backups. Azure Backup soft delete, immutable vaults and multi-user authorization, and PBS permissions, protected snapshots and verify jobs keep restore points trustworthy.', ex: 'immutable vault · PBS verify ok' },
      { t: 'Point-in-time for data', d: 'For MongoDB, a Percona Backup for MongoDB logical backup plus oplog (PITR) lets you restore to just before initial access and keep the legitimate writes.', ex: 'pbm restore --time="…23:30:00"' },
      { t: 'Rotate before cutover', d: 'Every credential the attacker could reach is burned: service principals, database users, SSH keys, API tokens and Key Vault secrets. Rotate them before restored systems rejoin production.', ex: 'new secrets in Key Vault, old ones revoked' },
      { t: 'Validate, then cut over', d: 'Check integrity (no persistence, expected data, scans clean), agree the data-loss window, cut over, then watch the SLO.', ex: 'go criteria signed off' },
    ],
    leverage: [
      { t: 'Plan drafting', d: 'Give Claude the incident timeline and the list of restore points. It proposes clean points with reasoning and a phased plan you can challenge.' },
      { t: 'Commands for each platform', d: 'Ask for the exact Azure Backup, qmrestore and pbm commands for your names, then check each against the docs before the exercise.' },
      { t: 'Evidence record', d: 'After the exercise, have Claude turn your notes, timings and outputs into the restore evidence record that EV-RE-05 reviewers read.' },
    ],
    sources: [SRC.ransomware, SRC.azBackupSec, SRC.azRestoreVm, SRC.immutable, SRC.pveBackup, SRC.pbs, SRC.pbmPitr],
    quiz: [
      { q: 'The first alert fired at 03:14; initial access was at 23:40 the evening before. Which restore point do you use?', options: ['The one just before 03:14', 'The latest one before 23:40', 'The newest one available'], a: 1, why: 'Anything after initial access may contain attacker changes or stolen credentials.' },
      { q: 'Where do you restore first?', options: ['Straight over production', 'Into an isolated network, keeping the compromised disks for forensics', 'On a developer laptop'], a: 1, why: 'Isolation stops reinfection and keeps evidence.' },
      { q: 'When do you rotate the credentials?', options: ['After cutover, when things calm down', 'Before cutover, so restored systems never run with burned credentials', 'Only if the attacker used them'], a: 1, why: 'Assume every reachable credential is known to the attacker.' },
    ],
    steps: [
      {
        id: 'w12-t3-s1', kind: 'guide', title: 'Draft the compromise-restore plan with Claude', minutes: 40, source: SRC.ransomware,
        scenario: 'Plan a restore exercise for one Azure workload and one Proxmox VM with its MongoDB data, using a simulated compromise (the Elastic incident from topic 2 works as the scenario). Use the prompts in order.',
        task: [
          'Run the four prompts in one claude.ai conversation (or in a Project with your runbooks). Paste only redacted names, no secrets.',
          'Challenge Claude\'s clean-point choice: ask what evidence would move it earlier.',
          'Save the final plan as an Artifact and share it with the service owner and security for review before the exercise.',
        ],
        prompts: [
          { label: '1 · Scope and isolation', where: 'claude.ai', text: 'We are running a restore-from-compromise exercise. Workloads: [Azure VM or App Service name, vault name] and [Proxmox VM id and name] running MongoDB replica set [name] backed up with Percona Backup for MongoDB (PITR on) and Proxmox Backup Server. Simulated incident timeline: [paste]. First, give the isolation steps for each workload that preserve forensic evidence, and describe the isolated restore network for Azure and for Proxmox (no route to prod or the internet, only read access to backup storage).' },
          { label: '2 · Clean restore point', where: 'claude.ai', text: 'Here are the available restore points: [paste Azure recovery points, PBS snapshots, PBM backups and the PITR range]. Pick the clean point for each workload based on initial-access time, not alert time. Explain the reasoning, the data-loss window, and what evidence would force us to go earlier. For MongoDB, pick a PITR target time.' },
          { label: '3 · Restore and validate', where: 'claude.ai', text: 'Give exact commands and checks to: restore the Azure VM to the isolated VNet from the chosen recovery point; restore the Proxmox VM from PBS as a new VMID with a unique MAC on the isolated bridge; run the PBM point-in-time restore (including any steps the Percona docs require before and after, such as PITR settings and a fresh backup). Then list integrity checks: persistence (users, keys, cron, systemd), config drift against IaC, malware scan, data counts and a smoke test.' },
          { label: '4 · Credentials and cutover', where: 'claude.ai', text: 'List every credential the attacker could have reached from these systems and how to rotate each (Key Vault, managed identity, MongoDB users, SSH keys, PBS/PVE tokens, service principals). Then write go/no-go criteria and cutover steps, a rollback that never returns to the compromised systems, and the evidence we must record for our reviewers (RTO, RPO, checks, sign-off).' },
        ],
        expected: ['A phased plan: isolate, preserve, select clean point, restore isolated, validate, rotate, cut over', 'Clean points chosen from initial-access time with reasoning', 'Exact commands for Azure Backup, qmrestore and pbm, checked against the docs', 'Go/no-go criteria and an evidence list'],
        verify: 'Check each command against the Azure Backup "Restore Azure VMs" page, the Proxmox VE Backup and Restore wiki and the Percona Backup for MongoDB restore docs (especially the steps required before a point-in-time restore).',
        atWork: 'Write the plan before the incident. In a real compromise the stress is high and the backups may be targeted; a rehearsed plan with known commands is what makes the restore safe.',
        checks: [
          { id: 'plan', label: 'I have a phased plan covering both workloads', manual: true },
          { id: 'clean', label: 'Clean points are chosen from initial-access time, with reasoning', manual: true },
          { id: 'reviewed', label: 'The service owner and security reviewed the plan', manual: true },
        ],
      },
      {
        id: 'w12-t3-s2', kind: 'guide', title: 'Run the restore exercise and record the evidence', minutes: 150, source: SRC.pbmPitr,
        scenario: 'Execute the plan in a controlled window: restore one Azure workload and one Proxmox VM with its MongoDB data into isolation, validate, rotate credentials and cut over (or cut over to a staging slot if production cutover is not approved). This evidence feeds EV-RE-05 in Week 16.',
        task: [
          'Follow the plan step by step and note the time of each step. Use Claude Code (with the Week 11 guardrails) for scripted checks, never for destructive commands.',
          'Use prompt 1 during the exercise when a check fails. Redact names and data before pasting output.',
          'Afterwards, run prompt 2 to write the evidence record and attach the raw outputs.',
        ],
        prompts: [
          { label: 'Unblock a failed check', where: 'claude.ai', text: 'During our isolated restore, this check failed: [paste redacted command and output]. Context: [workload, restore point, network]. What are the likely causes, what should I check next, and is it safe to continue towards cutover? Do not suggest connecting the restored system to production to test.' },
          { label: 'Evidence record', where: 'claude.ai', text: 'Write the restore evidence record titled "Restore from simulated compromise: [workloads]". Sections: scenario and initial-access time; clean point per workload and why; isolation used; restore steps with start and end times (RTO) and the data-loss window (RPO); integrity check results; credentials rotated and old ones tested to fail; cutover and sign-off; what went wrong and the fixes to the runbook. Use only these notes: [paste notes and outputs].' },
        ],
        expected: ['Both restores completed in isolation and validated', 'Credentials rotated before cutover, old ones tested to fail', 'Measured RTO and RPO for each workload', 'An evidence record with raw outputs attached, ready for EV-RE-05'],
        verify: 'Confirm the restored MongoDB data stops at the chosen PITR time (latest document timestamp), the PBS snapshot verify state, and the Azure restore job status in the vault. Check that nothing in the record is taken from Claude\'s suggestions rather than your outputs.',
        atWork: 'This exercise is what separates "we have backups" from "we can recover from an attack". Repeat it at least yearly and after big platform changes.',
        checks: [
          { id: 'azure', label: 'Azure workload restored in isolation from a pre-compromise point and validated', manual: true },
          { id: 'proxmox', label: 'Proxmox VM restored from PBS in isolation and validated', manual: true },
          { id: 'mongo', label: 'MongoDB data restored to a point before initial access (PBM PITR) and checked', manual: true },
          { id: 'creds', label: 'Exposed credentials rotated before cutover and old ones tested to fail', manual: true },
          { id: 'record', label: 'Evidence record with RTO, RPO, checks and sign-off saved for EV-RE-05', manual: true },
        ],
      },
      {
        id: 'w12-t3-s3', title: 'Check a compromise-restore plan', minutes: 10, source: SRC.ransomware, files: ['W12_RESTORE_POINTS'],
        scenario: 'Ask Claude for a structured restore plan for incident INC-2026-0927. The checks test the decisions that matter: clean points before initial access, isolation, integrity checks, credential rotation before cutover, and phase order.',
        task: ['Read <code>inc-2026-0927-restore-points.txt</code>. Which restore points are clean?', 'Click <b>Run</b>.', 'Compare Claude\'s choices with yours. Did it anchor on the first alert or on initial access?'],
        atWork: 'Use this structure as the template for real compromise restores. The most common mistake is restoring from the last point before the alert, which brings the attacker back.',
        hint: 'Initial access was 2026-09-26 23:40 UTC. The alert time (03:14 on 27 Sep) is a trap.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: {
            effort: 'high',
            format: jsonFormat(obj({
              incident_id: S,
              initial_access_time: S,
              clean_point_rule: S,
              phases: arr(en('isolate', 'preserve_evidence', 'select_clean_point', 'restore_isolated', 'validate', 'rotate_credentials', 'cutover', 'post_incident')),
              workloads: arr(obj({ name: S, platform: en('azure', 'proxmox', 'mongodb'), restore_point_id: S, restore_point_time: S, why_clean: S, isolation: S, restore_command: S, integrity_checks: arr(S) })),
              credential_rotation: arr(obj({ credential: S, action: S })),
              cutover: obj({ go_criteria: arr(S), steps: arr(S), rollback: S }),
              evidence: arr(S),
            })),
          },
          system: 'You are an SRE leading recovery from a security compromise. Choose restore points from the initial-access time, restore only into isolated networks, and rotate credentials before cutover. Use exact Azure CLI, Proxmox and Percona Backup for MongoDB commands.',
          messages: user(L('<incident>', '{{W12_RESTORE_POINTS}}', '</incident>', 'Produce the restore plan for the Azure VM, the Proxmox VM 210 and the rs-orders MongoDB data.')),
        },
        checks: [
          { id: 'access', label: 'Anchors on initial access (2026-09-26 23:40), not the 03:14 alert', test: (c, h) => { const j = h.json(c); return !!j && /2026-09-26[T ]23:40/.test(j.initial_access_time); } },
          { id: 'azure', label: 'Azure VM restored from rp_20260926_0200 (not 27 or 28 Sep)', test: (c, h) => { const j = h.json(c); const w = j && j.workloads.find((x) => x.platform === 'azure'); return !!w && w.restore_point_id === 'rp_20260926_0200'; } },
          { id: 'pbs', label: 'Proxmox VM 210 restored from the 2026-09-26T01:00 PBS snapshot', test: (c, h) => { const j = h.json(c); const w = j && j.workloads.find((x) => x.platform === 'proxmox'); return !!w && /vm\/210\/2026-09-26T01:00:00Z/.test(w.restore_point_id) && /qmrestore/.test(w.restore_command); } },
          { id: 'pitr', label: 'MongoDB point-in-time restore to after 01:30 and before 23:40 on 26 Sep', test: (c, h) => { const j = h.json(c); const w = j && j.workloads.find((x) => x.platform === 'mongodb'); if (!w) return false; const t = Date.parse(w.restore_point_time.replace(' ', 'T').replace(/Z?$/, 'Z')); return /pbm restore/.test(w.restore_command) && /--time/.test(w.restore_command) && t > Date.parse('2026-09-26T01:30:00Z') && t < Date.parse('2026-09-26T23:40:00Z'); } },
          { id: 'isolate', label: 'Every workload is restored into an isolated network', test: (c, h) => { const j = h.json(c); return !!j && j.workloads.length >= 3 && j.workloads.every((w) => /isolat|vmbr9|no uplink/i.test(w.isolation)); } },
          { id: 'integrity', label: 'Every workload has integrity checks (persistence, verify, scan or data checks)', test: (c, h) => { const j = h.json(c); return !!j && j.workloads.every((w) => w.integrity_checks.length >= 2) && JSON.stringify(j.workloads).match(/svc-sync|authorized_keys|scan|verify/gi).length >= 2; } },
          { id: 'creds', label: 'Rotates the service principal, MongoDB users and SSH/Proxmox credentials', test: (c, h) => { const j = h.json(c); if (!j) return false; const s = JSON.stringify(j.credential_rotation); return /sp-orders-sync|service principal/i.test(s) && /MongoDB/i.test(s) && /SSH|PBS|Proxmox|root@pam/i.test(s); } },
          { id: 'order', label: 'Phases run isolate → restore → validate → rotate → cutover', test: (c, h) => { const j = h.json(c); if (!j) return false; const p = j.phases, i = (x) => p.indexOf(x); return ['isolate', 'restore_isolated', 'validate', 'rotate_credentials', 'cutover'].every((x) => i(x) >= 0) && i('isolate') < i('restore_isolated') && i('restore_isolated') < i('validate') && i('rotate_credentials') < i('cutover') && i('validate') < i('cutover'); } },
        ],
        sim: [{
          content: [
            think('The alert at 03:14 is late; initial access is the 23:40 login on 26 Sep. Azure: rp_20260927_0200 is after the 01:12 changes, so use rp_20260926_0200. PBS: 26T01:00 is the last snapshot before 23:40. MongoDB: PITR from the 26T01:30 logical backup to 23:30 keeps the day\'s legitimate orders.'),
            { type: 'text', text: JSON.stringify(PLAN, null, 2) },
          ],
          stop_reason: 'end_turn', usage: { input_tokens: 1100, output_tokens: 1600 },
        }],
      },
    ],
  };

  PL.addWeek({
    week: 12,
    title: 'Monitoring & KQL, Elastic detections, and restoring from a compromise',
    stream: 'role',
    hours: 9,
    focus: 'Finish the AZ-104 monitoring objectives (metrics, diagnostic settings, KQL, alerts, Insights, Network Watcher), learn the Elastic Security detection workflow, and prove you can restore from a simulated compromise rather than an accidental failure.',
    apply: 'Restore from a simulated compromise, not just an accidental failure — one Azure workload and one Proxmox VM with its MongoDB data.',
    topics: [t1, t2, t3],
  });
})();
