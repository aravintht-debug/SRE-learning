/* Week 4 · extra topic: AZ-104 · Implement and manage storage.
   Appended to the Week 4 registration (week04.js) with PL.addTopic. Follows the week01.js template:
   briefing (official docs) + leverage (Claude for DevOps/Cloud) + guide and API steps. */
(function () {
  'use strict';
  const PL = window.PL;
  const { ADAPTIVE, user, L, textTurn, think } = PL.B;

  const SRC = {
    az104: { label: 'Microsoft Learn · AZ-104 study guide (skills measured)', url: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104' },
    firewall: { label: 'Microsoft Learn · Azure Storage firewall rules and network access', url: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security' },
    sas: { label: 'Microsoft Learn · Grant limited access to data with shared access signatures (SAS)', url: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview' },
    filesAuth: { label: 'Microsoft Learn · Azure Files identity-based authentication overview', url: 'https://learn.microsoft.com/en-us/azure/storage/files/storage-files-active-directory-overview' },
    redundancy: { label: 'Microsoft Learn · Azure Storage data redundancy', url: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy' },
    objRepl: { label: 'Microsoft Learn · Object replication overview', url: 'https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview' },
    encryption: { label: 'Microsoft Learn · Azure Storage encryption for data at rest', url: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-service-encryption' },
    azcopy: { label: 'Microsoft Learn · Copy or move data with AzCopy v10', url: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10' },
    tiers: { label: 'Microsoft Learn · Access tiers for blob data', url: 'https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview' },
    softDelete: { label: 'Microsoft Learn · Soft delete for blobs', url: 'https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-blob-overview' },
    versioning: { label: 'Microsoft Learn · Blob versioning', url: 'https://learn.microsoft.com/en-us/azure/storage/blobs/versioning-overview' },
    filesSnap: { label: 'Microsoft Learn · Azure Files share snapshots', url: 'https://learn.microsoft.com/en-us/azure/storage/files/storage-snapshots-files' },
    lcmOverview: { label: 'Microsoft Learn · Blob lifecycle management overview', url: 'https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview' },
    lcmStructure: { label: 'Microsoft Learn · Lifecycle management policy structure', url: 'https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure' },
    lcmConfigure: { label: 'Microsoft Learn · Configure a lifecycle management policy', url: 'https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure' },
  };

  /* ---- helpers for the lifecycle policy checks ---- */
  const firstJsonBlock = (c, h) => {
    const m = /```json\s*([\s\S]*?)```/i.exec(h.text(c));
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch (e) { return null; }
  };
  const getCI = (o, k) => { if (!o || typeof o !== 'object') return undefined; const key = Object.keys(o).find((x) => x.toLowerCase() === k.toLowerCase()); return key === undefined ? undefined : o[key]; };
  const applogsRule = (c, h) => {
    const p = firstJsonBlock(c, h);
    const rules = (p && getCI(p, 'rules')) || [];
    return rules.find((r) => { const f = getCI(getCI(r, 'definition'), 'filters') || {}; return (getCI(f, 'prefixMatch') || []).some((x) => /^applogs(\/|$)/.test(x)); });
  };
  const days = (rule, target, action, cond) => {
    const a = getCI(getCI(getCI(rule, 'definition'), 'actions'), target);
    return getCI(getCI(a, action), cond);
  };

  const LCM_ASK = L(
    'Storage account stapplogsprod01 in resource group rg-logs-prod (StorageV2, Standard_GRS, blob versioning enabled).',
    'Write a lifecycle management policy for the block blobs in container applogs only:',
    '- move to cool 30 days after last modification',
    '- move to archive 90 days after last modification',
    '- delete 365 days after last modification',
    '- delete previous versions 90 days after they were created',
    '- delete snapshots 90 days after they were created',
    'Give me the full policy.json in a ```json block, the az CLI command to apply it, and one command to read it back.',
    'Then list the gotchas I should know before applying it in production.'
  );

  const LCM_ANSWER = L(
    '## policy.json',
    '```json',
    '{',
    '  "rules": [',
    '    {',
    '      "enabled": true,',
    '      "name": "applogs-tiering-and-retention",',
    '      "type": "Lifecycle",',
    '      "definition": {',
    '        "filters": {',
    '          "blobTypes": ["blockBlob"],',
    '          "prefixMatch": ["applogs/"]',
    '        },',
    '        "actions": {',
    '          "baseBlob": {',
    '            "tierToCool": { "daysAfterModificationGreaterThan": 30 },',
    '            "tierToArchive": { "daysAfterModificationGreaterThan": 90, "daysAfterLastTierChangeGreaterThan": 7 },',
    '            "delete": { "daysAfterModificationGreaterThan": 365 }',
    '          },',
    '          "version": {',
    '            "delete": { "daysAfterCreationGreaterThan": 90 }',
    '          },',
    '          "snapshot": {',
    '            "delete": { "daysAfterCreationGreaterThan": 90 }',
    '          }',
    '        }',
    '      }',
    '    }',
    '  ]',
    '}',
    '```',
    '',
    '## Apply and read back',
    '```bash',
    'az storage account management-policy create \\',
    '  --account-name stapplogsprod01 --resource-group rg-logs-prod \\',
    '  --policy @policy.json',
    '',
    'az storage account management-policy show \\',
    '  --account-name stapplogsprod01 --resource-group rg-logs-prod',
    '```',
    '',
    '## Gotchas',
    '- **The policy is written in full.** Partial updates are not supported, so `create` replaces any existing rules: export the current policy with `show` first and merge.',
    '- **Up to 24 hours** before a new or changed policy takes effect and the first run starts.',
    '- **Archive needs LRS, GRS or RA-GRS.** It works here (Standard_GRS) but not on ZRS, GZRS or RA-GZRS accounts.',
    '- **Minimum retention:** cool 30 days, cold 90, archive 180. Deleting archived blobs before 180 days triggers an early deletion charge; at 365 days you are clear.',
    '- `daysAfterLastTierChangeGreaterThan` stops a rehydrated blob being sent straight back to archive.',
    '- **Versions and snapshots** must be covered by the rule, because lifecycle management will not delete a current version while it still has previous versions or snapshots.',
    '- `prefixMatch` starts with the container name and has no wildcards; `blobTypes` is required.'
  );

  const SAS_ASK = L(
    'A vendor needs to download one file for 24 hours: container exports, blob billing/2026-06.csv, storage account stapplogsprod01.',
    'Give me the az CLI to create the most secure SAS for this, signed with my Entra ID rather than the account key, read-only, HTTPS only.',
    'Tell me which Azure role I need to create it, and how I would revoke it early.'
  );
  const SAS_ANSWER = L(
    'Use a **user delegation SAS**: it is signed with a user delegation key obtained with your Microsoft Entra credentials, so no account key is involved.',
    '',
    '```bash',
    'az login',
    'az storage blob generate-sas \\',
    '  --account-name stapplogsprod01 \\',
    '  --container-name exports \\',
    '  --name billing/2026-06.csv \\',
    '  --permissions r \\',
    '  --expiry 2026-07-02T09:00:00Z \\',
    '  --https-only \\',
    '  --as-user --auth-mode login \\',
    '  --full-uri',
    '```',
    '',
    '- `--as-user --auth-mode login`: creates a user delegation SAS from your Entra sign-in.',
    '- `--permissions r`: read only, for this one blob.',
    '- `--https-only`: refuses plain HTTP.',
    '- `--expiry`: 24 hours from now. A user delegation SAS can be valid for at most 7 days.',
    '',
    '**Role:** you need `Microsoft.Storage/storageAccounts/blobServices/generateUserDelegationKey`, which the **Storage Blob Delegator** role grants, plus a data role that allows reading the blob, such as **Storage Blob Data Reader**, scoped to the container.',
    '',
    '**Revoke early:** revoke all user delegation keys for the account (`az storage account revoke-delegation-keys --name stapplogsprod01 --resource-group rg-logs-prod`), or remove your role assignment. Stored access policies do not apply to a user delegation SAS; they only work with a service SAS.',
    '',
    'Do not generate an account SAS or a service SAS with the account key for this: it can only be revoked by rotating the key or through a stored access policy.'
  );

  const t = {
    id: 'w04-az104',
    title: 'AZ-104 · Implement and manage storage',
    programmeItem: 'AZ-104 Microsoft Azure Administrator · Implement and manage storage, 15–20% (free: Microsoft Learn study guide and storage docs)',
    blurb: 'Storage access (firewalls, SAS, stored access policies, keys, identity-based Azure Files), account configuration (redundancy, object replication, encryption, AzCopy) and data management (tiers, soft delete, versioning, snapshots, lifecycle management).',
    outcomes: [
      'Secure a storage account: network rules, the right kind of SAS, keys versus Entra ID, and identity-based access for Azure Files',
      'Choose redundancy, set up object replication and data protection (soft delete, versioning, share snapshots)',
      'Write and apply a lifecycle management policy with az CLI, and know its limits for the exam',
    ],
    concepts: [
      { t: 'Network access', d: 'Storage firewall rules limit the public endpoint to selected VNet subnets (with a Microsoft.Storage service endpoint), public IP ranges, resource instances and trusted Azure services. Private endpoints give the account a private IP in your VNet instead.', ex: 'az storage account update --default-action Deny' },
      { t: 'SAS and stored access policies', d: 'Three SAS types: user delegation (signed with Entra ID, recommended), service and account (both signed with the account key). A stored access policy on a container lets you change or revoke service SASs without rotating keys. It does not apply to user delegation or account SASs.', ex: 'generate-sas --as-user --auth-mode login' },
      { t: 'Keys and identity-based access', d: 'Two account keys let you rotate without downtime, but prefer Entra ID with data roles and consider disallowing Shared Key. Azure Files over SMB supports identity-based access through AD DS, Microsoft Entra Domain Services or Microsoft Entra Kerberos, with share-level RBAC plus file and directory permissions.', ex: 'Storage File Data SMB Share Contributor' },
      { t: 'Redundancy and replication', d: 'LRS (one datacenter), ZRS (three or more zones), GRS and GZRS (plus an asynchronous copy in the paired region), and RA- variants for read access to the secondary. Object replication copies block blobs asynchronously between accounts and needs versioning on both accounts and change feed on the source.', ex: '--sku Standard_GZRS' },
      { t: 'Encryption and tools', d: 'All data is encrypted at rest with 256-bit AES by default and it cannot be turned off. Keys are Microsoft-managed by default; customer-managed keys live in Key Vault, and infrastructure encryption adds a second layer. AzCopy authorizes with Entra ID or a SAS; Storage Explorer is the GUI.', ex: 'azcopy login · azcopy copy --recursive' },
      { t: 'Tiers, protection and lifecycle', d: 'Hot, cool (30-day minimum), cold (90) and archive (180, offline, not on ZRS/GZRS). Blob soft delete keeps deleted data for 1–365 days; container soft delete and versioning complete the protection; a share snapshot is a read-only copy (up to 200 per share). Lifecycle rules tier or delete by age.', ex: 'tierToCool at 30 days · delete at 365' },
    ],
    leverage: [
      { t: 'CLI you can explain', d: 'Ask Claude for the az CLI for each storage task (network rules, SAS, soft delete, lifecycle) with every flag explained, then run it in a sandbox subscription. You learn the exam objectives and end up with scripts for your pipelines.' },
      { t: 'Lifecycle policies from plain English', d: 'Describe the retention rules the business wants and let Claude write the policy JSON. Then check the action names, day counts and the account\'s redundancy (archive is not available on ZRS or GZRS) against the policy structure page.' },
      { t: 'Access review of a storage estate', d: 'Paste a redacted `az storage account list` export and ask Claude to flag accounts with public network access, Shared Key allowed, public blob access, no soft delete or an old TLS version, with the fix command for each.' },
      { t: 'A study coach that explains wrong answers', d: 'In your SRE Learning Project, ask for scenario questions on SAS types, redundancy and tiers, and have Claude explain why each wrong option is wrong. Verify every explanation on Microsoft Learn.' },
    ],
    sources: [SRC.az104, SRC.firewall, SRC.sas, SRC.filesAuth, SRC.redundancy, SRC.objRepl, SRC.encryption, SRC.azcopy, SRC.tiers, SRC.softDelete, SRC.versioning, SRC.filesSnap, SRC.lcmOverview, SRC.lcmStructure, SRC.lcmConfigure],
    quiz: [
      { q: 'Which SAS type does Microsoft recommend, and why?', options: ['Account SAS, because it covers all services', 'User delegation SAS, because it is signed with Entra ID credentials instead of the account key', 'Service SAS, because it never expires'], a: 1, why: 'A user delegation SAS avoids the account key entirely and is the recommended option.' },
      { q: 'Your lifecycle policy moves blobs to archive, but the account is Standard_ZRS. What happens?', options: ['It works the same', 'Archive is not supported on ZRS, GZRS or RA-GZRS, so plan for LRS/GRS/RA-GRS or use cold instead', 'The blobs are deleted'], a: 1, why: 'The archive tier is only supported on LRS, GRS and RA-GRS accounts.' },
      { q: 'What must be enabled before you configure object replication?', options: ['Soft delete on the destination only', 'Blob versioning on both accounts and change feed on the source', 'A private endpoint on both accounts'], a: 1, why: 'Object replication depends on versioning on both sides and change feed on the source account.' },
    ],
    steps: [
      {
        id: 'w04-az104-s1', kind: 'guide', title: 'Study coach and sandbox hands-on: secure and protect a storage account', minutes: 45, source: SRC.az104,
        scenario: 'Use your SRE Learning Project as a coach, then build a hardened storage account in a <b>sandbox subscription</b> with commands Claude generates and explains.',
        task: [
          'In your SRE Learning Project, run prompt 1 and answer the questions before you look at the explanations.',
          'Run prompt 2 to get the sandbox script, read every flag, then run it in Cloud Shell against a sandbox resource group only.',
          'Run prompt 3 with the answers you got wrong, and delete the sandbox resource group when you finish.',
        ],
        prompts: [
          { label: 'Practice questions', where: 'claude.ai', text: 'Using the AZ-104 skills outline in this Project, give me 8 scenario questions on "Implement and manage storage": SAS types and stored access policies, storage firewall and service endpoints, identity-based access for Azure Files, redundancy (LRS/ZRS/GRS/GZRS/RA-), object replication prerequisites, access tiers and minimum retention, soft delete and versioning, lifecycle management. Four options each. Do not show the answers until I reply with mine.' },
          { label: 'Sandbox script with every flag explained', where: 'claude.ai', text: 'Write an az CLI script for my sandbox (resource group rg-az104-storage-lab, westeurope) that:\n1. creates a StorageV2 account with Standard_GRS, TLS 1.2 minimum, public blob access disabled;\n2. enables blob soft delete (14 days), container soft delete (14 days) and blob versioning;\n3. creates a VNet and subnet with a Microsoft.Storage service endpoint, adds a VNet rule and sets the default network action to Deny;\n4. creates a container and a file share, and takes a share snapshot;\n5. prints a user delegation SAS (read-only, 1 hour, HTTPS only) for one test blob.\nExplain each flag in one line. Use placeholders for anything unique and never include keys or connection strings in the output.' },
          { label: 'Explain what I got wrong', where: 'claude.ai', text: 'Here are my answers: [paste]. For each one I got wrong, explain the concept in 3 lines, why my option is wrong, and which Microsoft Learn page (title) I should read to confirm it.' },
        ],
        expected: [
          'Eight scenario questions covering every storage sub-objective',
          'A script that uses az storage account create, blob-service-properties update, network-rule add and generate-sas --as-user, with each flag explained',
          'A sandbox account you inspected in the portal (Networking, Data protection) and then deleted',
        ],
        verify: 'Check each command against the az CLI reference and the Microsoft Learn pages in this topic\'s sources before you run it. Confirm in the portal that Data protection shows soft delete and versioning enabled and Networking shows "Enabled from selected virtual networks".',
        atWork: 'The same script, reviewed and parameterized, is a baseline for every new storage account in your estate. Keep it in your IaC repo and let Claude explain a flag whenever someone asks.',
        checks: [
          { id: 'quiz', label: 'I answered the 8 practice questions and reviewed the explanations', manual: true },
          { id: 'sandbox', label: 'I ran the reviewed script in a sandbox resource group, not production', manual: true },
          { id: 'verify', label: 'I checked the flags against the docs and inspected the result in the portal', manual: true },
          { id: 'cleanup', label: 'I deleted the sandbox resource group', manual: true },
        ],
      },
      {
        id: 'w04-az104-s2', title: 'Generate and validate a lifecycle management policy', minutes: 8, source: SRC.lcmStructure,
        scenario: 'Application logs in <code>stapplogsprod01</code> grow every month. The retention standard says: cool after 30 days, archive after 90, delete after a year, and clean up old versions and snapshots. Ask Claude for the policy JSON and the az CLI to apply it. The checks parse the JSON and test the rule itself.',
        task: ['Click <b>Run</b>.', 'Read the policy: filter, the three baseBlob actions, the version and snapshot actions.', 'Read the gotchas. Could you answer an exam question on each?'],
        atWork: 'Describe retention in plain English, let Claude write the JSON, then check it against the policy structure page and export the current policy before you replace it, because a policy is always written in full.',
        hint: 'Rule type is Lifecycle; prefixMatch starts with the container name; versions and snapshots use daysAfterCreationGreaterThan.',
        body: { max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' }, system: 'You are an Azure storage administrator. Produce valid lifecycle management policy JSON exactly as the Azure Storage policy schema expects, and exact az CLI commands. Be explicit about limits and risks.', messages: user(LCM_ASK) },
        checks: [
          { id: 'json', label: 'Returns a policy.json that parses, with a rule of type Lifecycle scoped to applogs block blobs', test: (c, h) => { const r = applogsRule(c, h); if (!r) return false; const f = getCI(getCI(r, 'definition'), 'filters'); return getCI(r, 'type') === 'Lifecycle' && (getCI(f, 'blobTypes') || []).some((b) => /^blockblob$/i.test(b)); } },
          { id: 'tiers', label: 'baseBlob: tierToCool at 30 and tierToArchive at 90 days after modification', test: (c, h) => { const r = applogsRule(c, h); return !!r && days(r, 'baseBlob', 'tierToCool', 'daysAfterModificationGreaterThan') === 30 && days(r, 'baseBlob', 'tierToArchive', 'daysAfterModificationGreaterThan') === 90; } },
          { id: 'delete', label: 'baseBlob: delete at 365 days after modification', test: (c, h) => { const r = applogsRule(c, h); return !!r && days(r, 'baseBlob', 'delete', 'daysAfterModificationGreaterThan') === 365; } },
          { id: 'versions', label: 'Previous versions and snapshots deleted 90 days after creation', test: (c, h) => { const r = applogsRule(c, h); return !!r && days(r, 'version', 'delete', 'daysAfterCreationGreaterThan') === 90 && days(r, 'snapshot', 'delete', 'daysAfterCreationGreaterThan') === 90; } },
          { id: 'cli', label: 'Applies it with az storage account management-policy create --policy @file', test: (c, h) => /az storage account management-policy create/.test(h.text(c)) && /--policy\s+@/.test(h.text(c)) },
          { id: 'gotchas', label: 'Mentions the 24-hour delay and that archive is not supported on ZRS/GZRS', test: (c, h) => /24 hours/i.test(h.text(c)) && /ZRS/.test(h.text(c)) && /archive/i.test(h.text(c)) },
        ],
        sim: [{
          content: [
            think('GRS account, so archive is allowed. Versioning is on, so versions must be cleaned up or the base blob delete will not complete. Use camelCase action names from the schema and prefixMatch starting with the container name.'),
            { type: 'text', text: LCM_ANSWER },
          ],
          stop_reason: 'end_turn', usage: { input_tokens: 380, output_tokens: 820 },
        }],
      },
      {
        id: 'w04-az104-s3', title: 'Choose the right SAS: user delegation, read-only, short-lived', minutes: 6, source: SRC.sas,
        scenario: 'A vendor needs one billing export for 24 hours. The exam (and your security team) expects you to pick the SAS that avoids the account key, grants the least permissions and can be revoked.',
        task: ['Click <b>Run</b>.', 'Check the SAS type, the permissions and the expiry.', 'Note how revocation differs between a user delegation SAS and a service SAS with a stored access policy.'],
        atWork: 'Whenever someone asks for "a SAS link", ask Claude for the user delegation version with least permissions and the revocation path. Never paste account keys or generated tokens into a chat: use placeholders.',
        hint: 'Look for --as-user with --auth-mode login, --permissions r and --https-only, and no --account-key.',
        body: { max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'low' }, system: 'You are an Azure storage security reviewer. Prefer Microsoft Entra ID over account keys. Give exact az CLI and explain each flag.', messages: user(SAS_ASK) },
        checks: [
          { id: 'udsas', label: 'Creates a user delegation SAS (--as-user --auth-mode login)', test: (c, h) => /generate-sas/.test(h.text(c)) && /--as-user/.test(h.text(c)) && /--auth-mode login/.test(h.text(c)) },
          { id: 'least', label: 'Read-only permissions and HTTPS only', test: (c, h) => /--permissions\s+r\b(?![a-z])/.test(h.text(c)) && /--https-only/.test(h.text(c)) },
          { id: 'nokey', label: 'Does not use the account key', test: (c, h) => !/--account-key/.test(h.text(c)) },
          { id: 'role', label: 'Names the role needed (Storage Blob Delegator / data reader)', test: (c, h) => /Storage Blob Delegator|Storage Blob Data (Reader|Contributor)/.test(h.text(c)) },
          { id: 'revoke', label: 'Explains revocation (delegation keys) and that stored access policies are for service SAS', test: (c, h) => /revoke-delegation-keys/.test(h.text(c)) && /stored access polic/i.test(h.text(c)) },
        ],
        sim: [textTurn(SAS_ANSWER, { input_tokens: 190, output_tokens: 430 })],
      },
    ],
  };

  PL.addTopic(4, t);
})();
