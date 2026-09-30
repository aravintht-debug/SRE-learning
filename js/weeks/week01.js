/* Week 1 · Prompting: Claude foundations, prompting basics, Cowork, Claude for Microsoft 365, AZ-104 orientation.
   TEMPLATE for all week files: each topic = briefing (concepts from official docs) + leverage (how a DevOps/Cloud
   engineer uses Claude for it) + steps. Steps are either kind:'guide' (do it in claude.ai / Claude Code / Cowork, manual
   checks) or API playground steps (body + sim + auto checks). Run `node tests/validate.js --week 1` after editing. */
(function () {
  'use strict';
  const PL = window.PL;
  const { ADAPTIVE, user, L, obj, arr, en, S, jsonFormat, textTurn, jsonTurn, think } = PL.B;

  const SRC = {
    claude101: { label: 'Anthropic Academy · Claude 101 (free)', url: 'https://anthropic.skilljar.com/claude-101' },
    help: { label: 'Claude Help Center', url: 'https://support.claude.com/' },
    promptOverview: { label: 'Docs · Prompt engineering overview', url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview' },
    promptBest: { label: 'Docs · Prompting best practices', url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices' },
    cowork: { label: 'Claude docs · Cowork overview', url: 'https://claude.com/docs/cowork/overview' },
    coworkCourse: { label: 'Anthropic Academy · Introduction to Claude Cowork (free)', url: 'https://anthropic.skilljar.com/introduction-to-claude-cowork' },
    m365: { label: 'Claude docs · Claude for Microsoft 365', url: 'https://claude.com/docs/office-agents/overview' },
    excel: { label: 'Claude docs · Use Claude for Excel', url: 'https://claude.com/docs/office-agents/excel' },
    word: { label: 'Claude docs · Use Claude for Word', url: 'https://claude.com/docs/office-agents/word' },
    ppt: { label: 'Claude docs · Use Claude for PowerPoint', url: 'https://claude.com/docs/office-agents/powerpoint' },
    az104: { label: 'Microsoft Learn · AZ-104 study guide (skills measured)', url: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104' },
    az104cert: { label: 'Microsoft Learn · Azure Administrator Associate', url: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/' },
    armOverview: { label: 'Microsoft Learn · Azure Resource Manager overview', url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/overview' },
    locks: { label: 'Microsoft Learn · Lock resources to prevent changes', url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources' },
    tags: { label: 'Microsoft Learn · Use tags to organize resources', url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-resources' },
    tfState: { label: 'HashiCorp · Terraform state locking', url: 'https://developer.hashicorp.com/terraform/language/state/locking' },
  };

  /* ---- lab files ---- */
  PL.PLACEHOLDERS.TF_LOCK_ERROR = L(
    '$ terraform apply -var-file=prod.tfvars',
    'Acquiring state lock. This may take a few moments...',
    '',
    'Error: Error acquiring the state lock',
    '',
    'Error message: state blob is already locked',
    'Lock Info:',
    '  ID:        6f0c2a7e-91d3-4c55-b7a1-2e7f5d0c9b11',
    '  Path:      tfstate/prod.terraform.tfstate',
    '  Operation: OperationTypeApply',
    '  Who:       runner@gh-actions-7f3b',
    '  Version:   1.9.5',
    '  Created:   2026-06-18 09:41:07 UTC',
    '',
    'Terraform acquires a state lock to protect the state from being written',
    'by multiple users at the same time. Please resolve the issue above and try',
    'again. For most commands, you can disable locking with the "-lock=false"',
    'flag, but this is not recommended.'
  );
  PL.FILE_LABELS.TF_LOCK_ERROR = 'terraform-apply-error.txt';

  const VAGUE_PROMPT = 'fix my nsg so the app works';
  const GOOD_PROMPT = L(
    'Context: Azure, resource group rg-shop-prod, NSG nsg-web attached to subnet snet-web in vnet-shop (10.20.0.0/16).',
    'Problem: users on the internet get a timeout on https://shop.contoso.example. The app runs on port 443 on VMs in snet-web behind a public load balancer.',
    'Constraint: only HTTPS from the internet; SSH only from our bastion subnet 10.20.250.0/26. Do not open anything else.',
    'Task: give me the exact Azure CLI command(s) to add the missing inbound rule, with a priority below 4096, and one command to verify effective rules.',
    'Output format: numbered steps, each with a one-line explanation and the command in a code block.'
  );
  const NSG_ANSWER = L(
    '1. **Allow HTTPS from the internet** (priority 200, above the default DenyAllInbound at 65500):',
    '```bash',
    'az network nsg rule create --resource-group rg-shop-prod --nsg-name nsg-web --name allow-https-inbound \\',
    '  --priority 200 --direction Inbound --access Allow --protocol Tcp \\',
    '  --source-address-prefixes Internet --destination-port-ranges 443',
    '```',
    '2. **Keep SSH restricted to the bastion subnet** (priority 300):',
    '```bash',
    'az network nsg rule create --resource-group rg-shop-prod --nsg-name nsg-web --name allow-ssh-from-bastion \\',
    '  --priority 300 --direction Inbound --access Allow --protocol Tcp \\',
    '  --source-address-prefixes 10.20.250.0/26 --destination-port-ranges 22',
    '```',
    '3. **Verify the effective rules on a VM NIC:**',
    '```bash',
    'az network nic list-effective-nsg --resource-group rg-shop-prod --name vm-web-01-nic',
    '```',
    'Also check that the load balancer health probe targets port 443 and that no NSG on the NIC blocks it.'
  );

  /* =====================================================================
     Topic 1 — Foundations of Claude
     ===================================================================== */
  const t1 = {
    id: 'w01-t1',
    title: 'Foundations of Claude',
    programmeItem: 'Foundations of Claude · Introduction to Claude (free equivalent: Anthropic Academy Claude 101)',
    blurb: 'What Claude is, how conversations work, and the core features you will use every week: chats, Projects, Artifacts, Skills, connectors and research.',
    outcomes: [
      'Hold a productive multi-turn conversation with Claude about real infrastructure',
      'Know when to use a chat, a Project, an Artifact, a Skill or a connector',
      'Use Claude to explain an error safely, without making it worse',
    ],
    concepts: [
      { t: 'Conversations', d: 'Claude works best as a back-and-forth: give context, read the answer, ask follow-ups, correct it. It only knows what is in the conversation.', ex: '"Here is the error… what does it mean? What would you check first?"' },
      { t: 'Projects', d: 'A workspace with custom instructions and knowledge files that every chat in it can use, which is ideal for a team runbook library or an estate overview.', ex: 'Project: "Platform runbooks" + instructions + files' },
      { t: 'Artifacts', d: 'Standalone outputs Claude creates beside the chat, such as documents, code, diagrams, and small apps, which you can iterate on and share.', ex: '"Make this checklist an artifact I can reuse"' },
      { t: 'Skills', d: 'Reusable packaged instructions (and files) Claude loads when a task matches, so your team\'s way of doing something is applied every time.', ex: 'a "write-postmortem" skill with your template' },
      { t: 'Connectors & research', d: 'Connectors let Claude read tools such as Google Drive, GitHub or Microsoft 365; Research does multi-step web investigation with sources.', ex: 'GitHub connector → "summarize open infra PRs"' },
      { t: 'Verify, always', d: 'Claude can be confidently wrong about your estate. Treat answers as a strong draft: check commands against docs and your environment.', ex: 'read the command before you run it' },
    ],
    leverage: [
      { t: 'Explain unfamiliar errors fast', d: 'Paste a Terraform, kubectl or Azure CLI error with its context and ask what it means, what to check, and what NOT to do (for example, don\'t force-unlock a running apply).' },
      { t: 'A Project per platform', d: 'Create a Project with your architecture notes, naming standards and runbooks, so every chat answers in your estate\'s terms.' },
      { t: 'Artifacts for reusable ops docs', d: 'Turn answers into checklists, runbooks and diagrams you keep improving and share with the team.' },
      { t: 'Connect it to where work lives', d: 'With the GitHub connector Claude can read your IaC repos; with Microsoft 365 it can read change docs, which removes copy-paste.' },
    ],
    sources: [SRC.claude101, SRC.help, SRC.tfState],
    quiz: [
      { q: 'Where should your team\'s naming standards and architecture notes live so every chat uses them?', options: ['Pasted into each chat', 'In a Claude Project\'s instructions and knowledge', 'In a browser bookmark'], a: 1, why: 'Projects give every chat shared instructions and knowledge files.' },
      { q: 'Claude suggests "terraform force-unlock". What should you do first?', options: ['Run it immediately', 'Confirm no apply is still running and who holds the lock', 'Delete the state file'], a: 1, why: 'Force-unlocking while another run is active can corrupt state. Verify first.' },
    ],
    steps: [
      {
        id: 'w01-t1-s1', kind: 'guide', title: 'Your first infrastructure conversation in claude.ai', minutes: 15, source: SRC.claude101,
        scenario: 'Get comfortable with Claude as a working partner. Use claude.ai to explain an Azure concept you work with, then turn the answer into a reusable Artifact.',
        task: ['Open claude.ai and start a new chat.', 'Run prompt 1, then ask at least two follow-up questions (prompt 2 shows the style).', 'Run prompt 3 to turn the result into an Artifact checklist, and edit it once.'],
        prompts: [
          { label: 'Explain, in your context', where: 'claude.ai', text: 'I am a DevOps engineer. Explain Azure resource groups, subscriptions and management groups: how they relate, how RBAC and Azure Policy inherit down that hierarchy, and one real mistake teams make with each. Use a short table and keep it under 250 words.' },
          { label: 'Follow up like a colleague', where: 'claude.ai', text: 'Good. Now: if I assign Contributor at the subscription scope to a CI service principal, what exactly can it do that it should not? Give me a least-privilege alternative.' },
          { label: 'Make it reusable', where: 'claude.ai', text: 'Turn this into an Artifact: a one-page "Azure scope and access review" checklist I can use before granting any role assignment.' },
        ],
        expected: ['A clear table of the three scopes and how RBAC and Policy inherit', 'A concrete least-privilege alternative, e.g. a narrower scope or a built-in role such as a specific resource contributor', 'An Artifact checklist you can reopen and edit'],
        verify: 'Check any role names Claude gives against the Azure built-in roles documentation before you use them.',
        atWork: 'Use this pattern whenever you meet something unfamiliar: explain it in context, challenge it with follow-ups, then keep the result as an Artifact for the team.',
        checks: [
          { id: 'chat', label: 'I ran the explanation prompt and asked at least two follow-ups', manual: true },
          { id: 'artifact', label: 'I created and edited an Artifact checklist', manual: true },
          { id: 'verify', label: 'I checked the role names against Microsoft docs', manual: true },
        ],
      },
      {
        id: 'w01-t1-s2', title: 'Explain a Terraform error safely', minutes: 6, source: SRC.tfState, files: ['TF_LOCK_ERROR'],
        scenario: 'A production <code>terraform apply</code> fails with a state lock error. Ask Claude to explain it, and make sure its advice would not make things worse.',
        task: ['Read <code>terraform-apply-error.txt</code>.', 'Click <b>Run</b>. Claude explains the lock and what to check.', 'Confirm the answer checks for a still-running pipeline before any unlock.'],
        atWork: 'Paste errors with their context (what you ran, where, recent changes). Ask for the cause, the safe checks, and what not to do. This is the fastest way to use Claude on-call without risking the estate.',
        hint: 'The lock is held by a GitHub Actions runner: another apply may still be running.',
        body: { max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' }, system: 'You are a senior platform engineer. Be precise and safety-first: never recommend a destructive action without the checks that make it safe.', messages: user(L('<error>', '{{TF_LOCK_ERROR}}', '</error>', 'What does this mean, what should I check, and how do I resolve it safely?')) },
        checks: [
          { id: 'cause', label: 'Explains that another run holds the state lock', test: (c, h) => /lock/i.test(h.text(c)) && /another|already|in progress|still running|concurrent/i.test(h.text(c)) },
          { id: 'check', label: 'Says to check whether the GitHub Actions run is still active first', test: (c, h) => /github actions|runner|pipeline|workflow/i.test(h.text(c)) },
          { id: 'unlock', label: 'Mentions terraform force-unlock with the lock ID, only after checks', test: (c, h) => /force-unlock/.test(h.text(c)) && /6f0c2a7e/.test(h.text(c)) },
          { id: 'nolock', label: 'Warns against -lock=false or deleting the state', test: (c, h) => /-lock=false|delete (the )?state|lease/i.test(h.text(c)) },
        ],
        sim: [{
          content: [
            think('The state blob is locked by an apply from a GitHub Actions runner started at 09:41 UTC. The safe path is to confirm whether that run is still going before touching the lock.'),
            { type: 'text', text: L('## What it means', 'Terraform could not get the **state lock** because **another run already holds it**: an `apply` started by `runner@gh-actions-7f3b` at 09:41 UTC. The lock stops two runs writing the state at once.', '', '## Check first', '1. Open the GitHub Actions run for that time. Is it **still running**? If so, wait for it or cancel it from Actions.', '2. If the run was cancelled or the runner died, the lock is stale. Confirm nobody else is applying to prod.', '', '## Resolve safely', 'Only after both checks, release the stale lock with its ID:', '```bash', 'terraform force-unlock 6f0c2a7e-91d3-4c55-b7a1-2e7f5d0c9b11', '```', '', '## Do not', '- Do **not** use `-lock=false` on prod.', '- Do **not** delete the state file or break the blob lease by hand.', '- Afterwards, run `terraform plan` to confirm the state matches reality before applying again.') },
          ],
          stop_reason: 'end_turn', usage: { input_tokens: 420, output_tokens: 520 },
        }],
      },
    ],
  };

  /* =====================================================================
     Topic 2 — Prompting basics
     ===================================================================== */
  const t2 = {
    id: 'w01-t2',
    title: 'Prompting basics for Claude',
    programmeItem: 'Prompting Basics for Claude (free equivalent: Anthropic prompt engineering overview + Claude 101)',
    blurb: 'Be clear and direct, give context, say what good looks like. The difference between a useless answer and a copy-paste-ready one is usually the prompt.',
    outcomes: [
      'Turn a vague request into a clear prompt with context, constraints and output format',
      'Recognize the parts of a good prompt and apply them to infrastructure tasks',
      'Judge a response against what you asked for',
    ],
    concepts: [
      { t: 'Be clear and direct', d: 'Tell Claude exactly what you want. Imagine briefing a smart colleague who knows nothing about your environment.', ex: '"Give the exact az CLI command to…"' },
      { t: 'Give context', d: 'Say where you are (cloud, resource names, versions), what you already tried, and why it matters. Context changes the answer.', ex: 'RG rg-shop-prod, NSG nsg-web, port 443' },
      { t: 'State constraints', d: 'Say what must not happen: no downtime, least privilege, no new public IPs, CLI only.', ex: '"Do not open anything else."' },
      { t: 'Specify the output', d: 'Ask for the shape you need: numbered steps, a table, a single command, JSON, a runbook.', ex: '"Numbered steps, each with a code block"' },
      { t: 'Success criteria first', d: 'The official guide starts with knowing what a good answer is, so you can test and improve the prompt.', ex: 'works on first try · least privilege · verifiable' },
      { t: 'Iterate', d: 'If the answer misses, don\'t start over: say what was wrong and ask again. Save prompts that work.', ex: '"Too broad. Restrict SSH to the bastion subnet."' },
    ],
    leverage: [
      { t: 'Ops prompts that work first time', d: 'Always include cloud, resource names, versions, the symptom, constraints and the output format. You\'ll get commands you can review and run.' },
      { t: 'A personal prompt library', d: 'Keep your best prompts for explain-error, write-script, review-IaC and draft-runbook. Week 3 turns them into a team prompt pack.' },
      { t: 'Least-privilege by default', d: 'Put security constraints in every infra prompt so Claude doesn\'t "fix" things by opening everything.' },
    ],
    sources: [SRC.promptOverview, SRC.promptBest, SRC.claude101],
    quiz: [
      { q: 'Which prompt gets a safer NSG fix?', options: ['"fix my nsg"', 'One with the RG, NSG, port, allowed sources, what must stay closed, and the output format', '"make it work quickly"'], a: 1, why: 'Context and constraints steer Claude toward a precise, least-privilege change.' },
      { q: 'Claude\'s answer is too broad. Best next move?', options: ['Start a new chat', 'Say what was wrong and add the missing constraint', 'Accept it'], a: 1, why: 'Iterating in the same conversation keeps the context and fixes the gap.' },
    ],
    steps: [
      {
        id: 'w01-t2-s1', title: 'From a vague ask to a precise prompt', minutes: 8, source: SRC.promptBest,
        scenario: 'An app behind an NSG is timing out. The request below says only <i>"fix my nsg so the app works"</i>. Rewrite it so Claude can give a precise, least-privilege fix.',
        task: ['Click <b>Run</b> with the vague prompt and read the generic answer. The checks fail.', 'Rewrite the user message: add the context (RG, NSG, subnet, port), the constraint (HTTPS only, SSH only from the bastion subnet), and the output format.', 'Run again until all checks pass. Stuck? Click <b>Load solution</b>.'],
        atWork: 'Use the same structure (context, problem, constraints, task, output format) for every infrastructure prompt you write. It takes 30 seconds and saves many rounds of back-and-forth.',
        hint: 'The checks look at your prompt (context, constraint, format) and at Claude\'s answer (a real az CLI command for port 443).',
        body: { max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' }, messages: user(VAGUE_PROMPT) },
        solution: { max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' }, messages: user(GOOD_PROMPT) },
        checks: [
          { id: 'ctx', label: 'Your prompt gives context (resource group, NSG and port)', test: (c) => { const p = JSON.stringify(c.requestBody.messages); return /rg-|resource group/i.test(p) && /nsg/i.test(p) && /443|https/i.test(p); } },
          { id: 'constraint', label: 'Your prompt states a constraint (what must stay closed / least privilege)', test: (c) => /only|do not|don't|must not|least privilege/i.test(JSON.stringify(c.requestBody.messages)) },
          { id: 'format', label: 'Your prompt specifies the output format', test: (c) => /format|numbered|steps|table|code block|command/i.test(JSON.stringify(c.requestBody.messages)) },
          { id: 'answer', label: 'Claude returns an exact az network nsg rule create command for port 443', test: (c, h) => /az network nsg rule create/.test(h.text(c)) && /443/.test(h.text(c)) },
        ],
        sim: (c) => /443|https/i.test(JSON.stringify(c.requestBody.messages)) && /nsg/i.test(JSON.stringify(c.requestBody.messages))
          ? [textTurn(NSG_ANSWER, { input_tokens: 260, output_tokens: 380 })]
          : [textTurn('I need more detail to help. Which cloud and resource group is this in, which NSG and subnet, which port does the app listen on, and where should traffic be allowed from? Generally, check that an inbound rule allows the app port above the default deny rules, and that the NSG is attached where you expect.', { input_tokens: 20, output_tokens: 90 })],
      },
      {
        id: 'w01-t2-s2', kind: 'guide', title: 'Rewrite five of your own prompts', minutes: 20, source: SRC.promptOverview,
        scenario: 'Take five prompts you actually used (or would use) this month and upgrade them with the same structure. You will reuse them all programme long.',
        task: ['Pick five real tasks: an error to explain, a script to write, IaC to review, logs to summarize, a doc to draft.', 'For each, fill the template below in claude.ai and run it.', 'Keep the ones that worked in a note. You will turn them into a prompt pack in Week 3.'],
        prompts: [
          { label: 'Prompt template (fill the brackets)', where: 'claude.ai', text: 'Context: [cloud/platform, resource names, versions, environment]\nProblem or goal: [what is happening or what you need]\nWhat I tried: [commands or changes so far]\nConstraints: [least privilege, no downtime, tools allowed, what must not change]\nTask: [exactly what you want Claude to produce]\nOutput format: [numbered steps / table / single command / YAML / runbook]' },
          { label: 'Ask Claude to critique your prompt', where: 'claude.ai', text: 'Before answering, review my prompt above: what context or constraint is missing that would change your answer? Ask me up to 3 questions, then answer.' },
        ],
        expected: ['Five filled prompts saved somewhere you can find them', 'At least one case where Claude\'s questions exposed missing context', 'Answers you could review and run without major edits'],
        atWork: 'Asking Claude to question your prompt before answering is a quick way to catch missing context on complex changes.',
        checks: [
          { id: 'five', label: 'I rewrote and ran five real prompts with the template', manual: true },
          { id: 'critique', label: 'I used the critique prompt at least once', manual: true },
          { id: 'saved', label: 'I saved the prompts that worked', manual: true },
        ],
      },
    ],
  };

  /* =====================================================================
     Topic 3 — Claude Cowork
     ===================================================================== */
  const t3 = {
    id: 'w01-t3',
    title: 'First look: Claude Cowork',
    programmeItem: 'First Look: Claude Cowork (free equivalent: Anthropic Academy Introduction to Claude Cowork)',
    blurb: 'Cowork turns a conversation into a working session: Claude plans and carries out multi-step tasks on your real files and folders while you steer.',
    outcomes: [
      'Explain what Cowork adds over a normal chat (file access, planning, execution, steering)',
      'Run a safe first Cowork task on a folder of runbooks or configs',
      'Apply the safety habits: trusted files, review before accepting, least access',
    ],
    concepts: [
      { t: 'A working session', d: 'You describe the task; Claude plans it, carries it out step by step, and you steer along the way.', ex: '"Inventory every runbook in this folder"' },
      { t: 'Real files and folders', d: 'Cowork can read and edit files in folders you give it access to, and produce real outputs such as documents and spreadsheets.', ex: 'folder: ~/ops/runbooks' },
      { t: 'Standing context', d: 'Global instructions, Projects, Skills and plugins mean Cowork follows your conventions without repeating them.', ex: 'Skill: "our runbook template"' },
      { t: 'Works where you work', d: 'Cowork connects with Chrome and Microsoft 365 apps (Word, Excel, PowerPoint, Outlook).', ex: 'draft in Word from folder notes' },
      { t: 'Background tasks', d: 'Dispatch lets Cowork run tasks in the background while you do something else, and report back.', ex: 'long inventory job via Dispatch' },
      { t: 'Safety', d: 'Give access only to what the task needs, use trusted files (files can hide instructions), and review every change.', ex: 'copy of the folder, not prod' },
    ],
    leverage: [
      { t: 'Runbook and doc hygiene', d: 'Point Cowork at your runbooks folder: find stale commands, missing sections, and produce an inventory spreadsheet with owners.' },
      { t: 'Config inventory', d: 'Give it a folder of exported configs (NSG rules, policy definitions, pipeline YAML) and ask for a summary table of risks and inconsistencies.' },
      { t: 'Report packs', d: 'Have Cowork assemble weekly reports from exported CSVs and notes into Word or Excel outputs for the team.' },
    ],
    sources: [SRC.cowork, SRC.coworkCourse, SRC.help],
    quiz: [
      { q: 'What does Cowork add over a normal chat?', options: ['A bigger font', 'Planning and carrying out multi-step tasks on your real files, with you steering', 'Nothing'], a: 1, why: 'Cowork works directly with files and folders as a supervised working session.' },
      { q: 'Safest first Cowork task?', options: ['Full access to your home folder and prod configs', 'A copy of a runbooks folder, with review before accepting changes', 'Let it run unsupervised on production'], a: 1, why: 'Least access, trusted files, and review keep Cowork safe.' },
    ],
    steps: [
      {
        id: 'w01-t3-s1', kind: 'guide', title: 'Run a safe first Cowork task on your runbooks', minutes: 25, source: SRC.cowork,
        scenario: 'Use Cowork on a <b>copy</b> of a folder of runbooks or configs, and get an inventory with the gaps flagged.',
        task: ['Copy a runbooks (or configs) folder to a scratch location. Never start on the only copy.', 'Open Cowork in the Claude desktop app, give it access to that folder only, and run prompt 1.', 'Steer it once mid-task (prompt 2), then review the output before accepting any file changes.'],
        prompts: [
          { label: 'Inventory and gap analysis', where: 'Cowork', text: 'In this folder, list every runbook in a table: file, service, last-updated date if present, and owner if present. Flag runbooks with no rollback section, commands that reference deprecated tools, or hard-coded hostnames or IPs. Save the table as runbook-inventory.xlsx. Do not modify the runbooks themselves.' },
          { label: 'Steer mid-task', where: 'Cowork', text: 'Also add a column for whether each runbook has an escalation contact. Sort by the number of issues found.' },
        ],
        expected: ['A spreadsheet with one row per runbook and flagged issues', 'No runbook files modified', 'At least one real gap you did not know about'],
        verify: 'Open two flagged runbooks yourself and confirm the issues are real before sharing the inventory.',
        atWork: 'Cowork is best for multi-file chores that would take you an afternoon. Keep access narrow, start on copies, and review before you accept.',
        checks: [
          { id: 'copy', label: 'I worked on a copy of the folder with access limited to it', manual: true },
          { id: 'run', label: 'I ran the inventory task and steered it once', manual: true },
          { id: 'review', label: 'I verified two flagged issues myself', manual: true },
        ],
      },
    ],
  };

  /* =====================================================================
     Topic 4 — Claude for Microsoft 365 (Word, Excel, PowerPoint)
     ===================================================================== */
  const t4 = {
    id: 'w01-t4',
    title: 'Claude for Word, Excel and PowerPoint',
    programmeItem: 'First Look: Claude for Word · Excel · PowerPoint (free equivalent: Claude docs for Microsoft 365)',
    blurb: 'Claude as an add-in inside Microsoft 365: analyze workbooks with cell-level citations, draft documents, and build decks without leaving the app.',
    outcomes: [
      'Install the Claude for Microsoft 365 add-in and sign in',
      'Use Claude in Excel for cost analysis, Word for SOPs, and PowerPoint for review decks',
      'Know the limits: review before sharing, trusted files only (prompt injection)',
    ],
    concepts: [
      { t: 'The add-in', d: 'Claude for Microsoft 365 is installed from Microsoft AppSource (or deployed by an admin) and signs in with your Claude account. It is available on Pro, Max, Team and Enterprise plans.', ex: 'AppSource → "Claude for Microsoft 365"' },
      { t: 'Excel', d: 'Ask about the open workbook with cell-level citations, change assumptions while keeping formulas intact, debug errors, and build or fill models. Macros/VBA and data tables are not supported.', ex: '"Trace why H15 returns #DIV/0"' },
      { t: 'Word & PowerPoint', d: 'Draft and revise documents in Word, and create or refine slides in PowerPoint, with Claude working inside the file.', ex: '"Draft an SOP from these notes"' },
      { t: 'Across apps', d: 'A single conversation can span your open workbook, document, presentation and inbox.', ex: 'numbers from Excel → slide in PowerPoint' },
      { t: 'Instructions per app', d: 'Settings in each add-in holds persistent instructions (formatting, conventions) for that app.', ex: '"Use USD with thousand separators"' },
      { t: 'Prompt-injection risk', d: 'Use it only with trusted files: external files can hide instructions. Claude asks you to confirm risky operations, so review those carefully.', ex: 'vendor template? review first' },
    ],
    leverage: [
      { t: 'FinOps in Excel', d: 'Open the Azure cost export, ask for the top services, anomalies and untagged spend with cell citations, then build a pivot and chart for the monthly review.' },
      { t: 'SOPs and change docs in Word', d: 'Turn rough notes into a standard operating procedure or a change request in your template, then review it as the owner.' },
      { t: 'Postmortem and status decks in PowerPoint', d: 'Build a 5-slide incident review or platform status deck from your notes and numbers in minutes.' },
    ],
    sources: [SRC.m365, SRC.excel, SRC.word, SRC.ppt],
    quiz: [
      { q: 'What makes Claude in Excel answers easy to verify?', options: ['It uses bold text', 'Cell-level citations you can click', 'It never makes mistakes'], a: 1, why: 'Citations jump to the exact cells behind each answer.' },
      { q: 'A vendor sent you a spreadsheet template. Before using Claude on it you should…', options: ['Trust it', 'Treat it as untrusted: it may hide instructions, so review confirmations carefully', 'Enable macros'], a: 1, why: 'The docs warn that external files can carry prompt injections.' },
    ],
    steps: [
      {
        id: 'w01-t4-s1', kind: 'guide', title: 'Excel: analyze the June 2026 Azure bill with citations', minutes: 20, source: SRC.excel,
        scenario: 'Use Claude inside Excel on the synthetic Azure billing export from this course (download it from the Week 4 billing lab or the <code>work-kit</code>).',
        task: ['Install the add-in from Microsoft AppSource (or ask your M365 admin), open Excel, and sign in.', 'Open the billing CSV and run prompts 1 and 2.', 'Click two of the cell citations to confirm the numbers.'],
        prompts: [
          { label: 'Understand the data', where: 'Claude for Excel', text: 'This sheet is our June 2026 Azure cost export. What is the total cost, which 3 services cost the most, and which rows have an empty Environment tag? Cite the cells.' },
          { label: 'Build the review view', where: 'Claude for Excel', text: 'Create a pivot table of cost by ServiceName and ResourceGroup on a new sheet, add a bar chart of the top 5 services, and conditionally format untagged rows in orange.' },
        ],
        expected: ['Total $7,506.05, with Virtual Machines as the top service', 'A new sheet with a pivot table and chart', 'Untagged rows highlighted'],
        verify: 'Check the total against a SUM of the CostUSD column yourself.',
        atWork: 'Use this for monthly FinOps reviews and capacity sheets. Claude does the analysis and formatting, and you verify the key numbers through the citations.',
        checks: [
          { id: 'install', label: 'I installed the add-in and signed in', manual: true },
          { id: 'cite', label: 'I got the analysis and checked two cell citations', manual: true },
          { id: 'pivot', label: 'Claude built the pivot and chart', manual: true },
        ],
      },
      {
        id: 'w01-t4-s2', kind: 'guide', title: 'Word and PowerPoint: SOP and incident deck', minutes: 20, source: SRC.m365,
        scenario: 'Turn rough notes into a standard operating procedure in Word, then into a short review deck in PowerPoint, using the same conversation across apps.',
        task: ['In Word, paste the notes from prompt 1 and run it.', 'In PowerPoint, run prompt 2.', 'Review both as the owner before sharing: you are accountable for the content.'],
        prompts: [
          { label: 'SOP in Word', where: 'Claude for Word', text: 'Turn these notes into a standard operating procedure titled "Rotating the storage account access keys". Sections: Purpose, Scope, Prerequisites, Steps (numbered, with az CLI commands), Verification, Rollback, Owner.\nNotes: two keys; rotate key2 first, update apps to key2, then rotate key1; prefer managed identity long term; check apps after each rotation; owner is the platform team.' },
          { label: 'Deck in PowerPoint', where: 'Claude for PowerPoint', text: 'Create a 5-slide deck from the SOP in my open Word document: title, why we rotate keys, the rotation sequence as a diagram, verification and rollback, and next step (move to managed identity).' },
        ],
        expected: ['An SOP with every section and working az CLI commands', 'A 5-slide deck consistent with the SOP'],
        verify: 'Check the az storage account keys renew syntax in the Microsoft docs before publishing the SOP.',
        atWork: 'Use this for SOPs, change requests, postmortems and status updates: Claude drafts in your templates and you review and own the result.',
        checks: [
          { id: 'sop', label: 'I produced the SOP in Word and reviewed the commands', manual: true },
          { id: 'deck', label: 'I produced the 5-slide deck in PowerPoint', manual: true },
        ],
      },
    ],
  };

  /* =====================================================================
     Topic 5 — AZ-104 orientation
     ===================================================================== */
  const t5 = {
    id: 'w01-t5',
    title: 'AZ-104 · Exam orientation and Azure Resource Manager',
    programmeItem: 'AZ-104 Microsoft Azure Administrator (free: Microsoft Learn learning paths + practice assessment)',
    blurb: 'The AZ-104 skills outline, how Azure is organized (management groups, subscriptions, resource groups), and the Resource Manager basics every later week builds on.',
    outcomes: [
      'Explain the five AZ-104 domains and their weights, and plan your study weeks',
      'Describe the Azure scope hierarchy and how Resource Manager deploys and protects resources',
      'Use Claude to generate, explain and review Azure CLI for everyday admin tasks',
    ],
    concepts: [
      { t: 'The five domains', d: 'Identities & governance (20–25%), storage (15–20%), compute (20–25%), virtual networking (15–20%), monitor & maintain (10–15%). You need 700 to pass.', ex: 'skills measured as of April 2026' },
      { t: 'Scope hierarchy', d: 'Management groups → subscriptions → resource groups → resources. RBAC, Policy and locks inherit down the hierarchy.', ex: 'Policy at MG applies to every sub' },
      { t: 'Azure Resource Manager', d: 'The deployment and management layer: every portal click, CLI command, PowerShell cmdlet, ARM template or Bicep file goes through it.', ex: 'az group create → ARM API' },
      { t: 'Tags', d: 'Name/value metadata on resources, resource groups and subscriptions for cost reporting and ownership. Tags are not inherited by default.', ex: '--tags env=prod owner=platform' },
      { t: 'Resource locks', d: 'CanNotDelete (read/modify allowed, delete blocked) or ReadOnly. Locks apply even to Owners and are inherited by child resources.', ex: 'az lock create --lock-type CanNotDelete' },
      { t: 'Tools', d: 'Portal, Azure CLI, Azure PowerShell and Cloud Shell. The exam expects you to read and use CLI/PowerShell and ARM/Bicep.', ex: 'az · Az PowerShell · Cloud Shell' },
    ],
    leverage: [
      { t: 'A study coach in your Project', d: 'Add the AZ-104 skills outline to your SRE Learning Project knowledge and ask for a weekly plan, flash cards and practice questions per domain.' },
      { t: 'CLI you understand', d: 'Ask Claude to generate az CLI or PowerShell for a task and explain every flag, then run it in a sandbox subscription to learn by doing.' },
      { t: 'Explain the exam scenario', d: 'Paste a practice question you got wrong and ask Claude to explain the concept and why each wrong option is wrong. Verify against Microsoft Learn.' },
    ],
    sources: [SRC.az104, SRC.az104cert, SRC.armOverview, SRC.locks, SRC.tags],
    quiz: [
      { q: 'Which AZ-104 domain has the lowest weight?', options: ['Compute', 'Monitor and maintain Azure resources', 'Identities and governance'], a: 1, why: 'Monitor and maintain is 10–15%; identities/governance and compute are 20–25%.' },
      { q: 'A CanNotDelete lock on a resource group means…', options: ['Nobody can read resources', 'Resources can be changed but not deleted, even by Owners', 'Only Owners can delete'], a: 1, why: 'Locks override permissions, including Owner.' },
    ],
    steps: [
      {
        id: 'w01-t5-s1', kind: 'guide', title: 'Add the AZ-104 track to your SRE Learning Project', minutes: 20, source: SRC.az104,
        scenario: 'Make your SRE Learning Project your AZ-104 study coach for the whole programme. You keep one Project, so the coach also knows your environment and everything you built in the other labs.',
        task: ['Open your <b>SRE Learning</b> Project in claude.ai (from Week 1 › Step 0).', 'Copy the skills-measured section of the official study guide into <code>az104-skills-outline.txt</code> and add it to the Project knowledge.', 'Add prompt 1 to the <b>end</b> of the Project instructions. Keep the instructions that are already there.', 'In a new Project chat, run prompt 2 and pin the plan as an Artifact.'],
        prompts: [
          { label: 'Add to the Project instructions', where: 'claude.ai', note: 'Append this to <b>Project → Instructions</b>, below what is already there, not into a chat.', text: 'AZ-104 track: when a chat name contains "AZ-104" or I ask about the exam, act as my AZ-104 study coach. Use only the official skills outline in az104-skills-outline.txt as the scope. For every topic, explain it briefly, give one hands-on Azure CLI exercise for a sandbox subscription, and link the relevant Microsoft Learn doc title so I can verify. Quiz me when I ask.' },
          { label: 'Weekly plan', where: 'claude.ai', text: 'Map the five AZ-104 domains onto my programme weeks: identities (weeks 2–3), storage (4), compute (7–8), networking (9–11), monitor and backup (12–13), review (14, 17–18), exam window (19). For each week give 3 learning goals and 1 hands-on lab. Make it an Artifact table.' },
        ],
        expected: ['Your SRE Learning Project knowledge now contains the official skills outline, and its instructions include the AZ-104 track', 'A week-by-week plan that covers every domain', 'Hands-on labs you can run in a sandbox subscription'],
        verify: 'Cross-check the plan against the official skills list: every bullet in the study guide should appear somewhere.',
        atWork: 'The same pattern works for any certification or new platform: official outline as knowledge, Claude as the coach, and the official docs as the source of truth.',
        checks: [
          { id: 'project', label: 'I added the official skills outline and the AZ-104 track instructions to my SRE Learning Project', manual: true },
          { id: 'plan', label: 'I have a week-by-week plan as an Artifact', manual: true },
        ],
      },
      {
        id: 'w01-t5-s2', title: 'Generate and review Azure CLI: resource group, tags, lock', minutes: 6, source: SRC.locks,
        scenario: 'Ask Claude for the Azure CLI to create a production resource group with ownership tags and a delete lock, which is a basic AZ-104 governance task.',
        task: ['Click <b>Run</b>.', 'Read every flag. Could you explain each one in the exam?', 'Run the commands in a sandbox subscription (not production) to see the lock in action.'],
        atWork: 'Ask Claude for CLI plus an explanation of every flag. You learn the exam material and get scripts you can put into your pipelines.',
        hint: 'A CanNotDelete lock still allows changes; ReadOnly blocks changes too.',
        body: { max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'low' }, system: 'You are an Azure administrator coach. Give exact Azure CLI commands and explain each flag in one line.', messages: user('Create resource group rg-shop-prod in westeurope with tags env=prod, owner=platform-team and costcenter=CC-4410, then add a lock that prevents deletion but still allows changes. Then show how to list the lock.') },
        checks: [
          { id: 'rg', label: 'Uses az group create with the location', test: (c, h) => /az group create/.test(h.text(c)) && /westeurope/.test(h.text(c)) },
          { id: 'tags', label: 'Adds the three tags', test: (c, h) => /--tags/.test(h.text(c)) && /env=prod/.test(h.text(c)) && /owner=platform-team/.test(h.text(c)) && /costcenter=CC-4410/i.test(h.text(c)) },
          { id: 'lock', label: 'Creates a CanNotDelete lock (not ReadOnly)', test: (c, h) => /az lock create/.test(h.text(c)) && /CanNotDelete/.test(h.text(c)) },
          { id: 'list', label: 'Shows how to list the lock', test: (c, h) => /az lock list/.test(h.text(c)) },
        ],
        sim: [textTurn(L('```bash', '# 1. Resource group with ownership and cost tags', 'az group create --name rg-shop-prod --location westeurope \\', '  --tags env=prod owner=platform-team costcenter=CC-4410', '', '# 2. Delete lock: changes allowed, deletion blocked (even for Owners)', 'az lock create --name lock-no-delete --resource-group rg-shop-prod --lock-type CanNotDelete \\', '  --notes "Production: remove only via change request"', '', '# 3. Verify', 'az lock list --resource-group rg-shop-prod --output table', '```', '', '- `--name` / `--location`: resource group name and region', '- `--tags`: space-separated key=value pairs (not inherited by resources by default)', '- `--lock-type CanNotDelete`: blocks delete, allows modify (ReadOnly would block changes too)', '- `--notes`: why the lock exists, for whoever finds it later'), { input_tokens: 130, output_tokens: 260 })],
      },
    ],
  };

  /* =====================================================================
     Topic 6 — Apply: five real infrastructure tasks
     ===================================================================== */
  const t6 = {
    id: 'w01-t6',
    title: 'Apply: use Claude on five real infrastructure tasks',
    programmeItem: 'Apply task · Use Claude on five real infrastructure tasks. Log what worked.',
    blurb: 'Put the week into practice on your real work, and keep a log of what worked, what did not, and what you had to correct.',
    outcomes: [
      'Use Claude on five different kinds of infrastructure work',
      'Keep an honest log of time saved and mistakes caught',
      'Start the evidence you will build on for the rest of the programme',
    ],
    concepts: [
      { t: 'Pick varied tasks', d: 'Explain, write, review, summarize, document: each shows a different strength and weakness.', ex: 'error · script · IaC review · logs · doc' },
      { t: 'Measure', d: 'Note the time the task would have taken and the time it took with Claude, including review.', ex: '45 min → 15 min incl. review' },
      { t: 'Log corrections', d: 'Every time Claude was wrong, write down how you caught it. This feeds the Week 4 confidently-wrong clinic.', ex: '"wrong flag for az vm create"' },
      { t: 'No secrets', d: 'Remove passwords, keys, customer data and internal IPs you would not share. Use placeholders.', ex: '<REDACTED_KEY>' },
    ],
    leverage: [
      { t: 'Build the habit', d: 'Before starting any infra task, ask "could Claude draft this?" Use it for the first draft and spend your time on review.' },
      { t: 'Evidence for your ladder', d: 'The log becomes evidence of AI adoption and of the judgement you apply, which the programme milestones review.' },
      { t: 'Find your best uses', d: 'After five tasks you will know where Claude saves you the most time. Focus there next week.' },
    ],
    sources: [SRC.claude101, SRC.promptBest],
    quiz: [
      { q: 'What must you remove before pasting logs into Claude?', options: ['Timestamps', 'Secrets, keys and customer data', 'Line numbers'], a: 1, why: 'Never share credentials or personal data in prompts.' },
      { q: 'Why log the cases where Claude was wrong?', options: ['To stop using it', 'To learn how to catch errors and improve prompts', 'It is not useful'], a: 1, why: 'Knowing how you caught mistakes is the core skill of using AI safely.' },
    ],
    steps: [
      {
        id: 'w01-t6-s1', kind: 'guide', title: 'Five tasks and a log', minutes: 100, source: SRC.claude101,
        scenario: 'Use Claude on five real tasks from your current work this week, one of each kind below, and log the results.',
        task: ['Do each of the five prompts on a real task (replace the brackets, remove secrets).', 'After each, fill in one row of the log template.', 'Ask Claude to summarize your log (prompt 6) and keep it for the Week 4 clinic.'],
        prompts: [
          { label: 'Explain', where: 'claude.ai', text: 'Explain this error from [tool] in [environment]. What caused it, what should I check first, and what should I NOT do?\n[paste error and the command you ran]' },
          { label: 'Write', where: 'claude.ai', text: 'Write a [bash/PowerShell/az CLI] script that [task]. Requirements: idempotent, --dry-run flag, clear logging, exits non-zero on failure. Explain any risky line.' },
          { label: 'Review IaC', where: 'claude.ai', text: 'Review this [Terraform/Bicep] for security, cost and reliability issues. Give a table: line, issue, severity, fix.\n[paste code, secrets removed]' },
          { label: 'Summarize logs', where: 'claude.ai', text: 'Summarize these logs for an incident channel in 5 lines: impact, likely cause, evidence, next step, anything suspicious.\n[paste redacted logs]' },
          { label: 'Document', where: 'claude.ai', text: 'Turn these notes into a runbook with: Symptoms, Diagnose, Mitigate, Rollback, Escalate. Use real commands.\n[paste notes]' },
          { label: 'Summarize your log', where: 'claude.ai', text: 'Here is my log of five tasks done with Claude. Summarize: total time saved, which task types worked best, the mistakes I caught and how, and 3 prompt improvements for next week.\n[paste log]' },
        ],
        expected: ['Five log rows: task, time without/with Claude, what worked, what was wrong, how you caught it', 'A short summary with your best use cases'],
        verify: 'Every command Claude produced was reviewed, and tested in a non-production environment, before you used it.',
        atWork: 'Keep this log going through the programme. It is your evidence and the raw material for your prompt pack.',
        checks: [
          { id: 'five', label: 'I completed five real tasks with Claude (secrets removed)', manual: true },
          { id: 'log', label: 'I logged time, what worked, and mistakes caught for each', manual: true },
          { id: 'summary', label: 'I have Claude\'s summary of my log saved for Week 4', manual: true },
        ],
      },
    ],
  };

  PL.addWeek({
    week: 1,
    title: 'Claude foundations & prompting basics',
    stream: 'prompting',
    hours: 9,
    focus: 'Get fluent with Claude: the core features, clear prompting, Cowork, Claude in Microsoft 365, and the AZ-104 exam map. Then use Claude on five real infrastructure tasks.',
    apply: 'Use Claude on five real infrastructure tasks. Log what worked.',
    internal: ['Guardrails induction (B-06): mandatory, annual · 3h'],
    topics: [t1, t2, t3, t4, t5, t6],
  });
})();
