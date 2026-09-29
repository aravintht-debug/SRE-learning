/* Week 9 · Role-critical: Introduction to Claude Code, its strengths and limits, AZ-104 virtual networking
   (VNets, peering, public IPs, UDRs, troubleshooting), and automating one piece of recurring toil.
   Structure follows week01.js. Run `node tests/validate.js --week 9` after editing. */
(function () {
  'use strict';
  const PL = window.PL;
  const { ADAPTIVE, user, L, obj, arr, en, S, N, jsonFormat, textTurn, jsonTurn, think } = PL.B;

  const SRC = {
    ccAction: { label: 'Anthropic Academy · Claude Code in Action (free)', url: 'https://anthropic.skilljar.com/claude-code-in-action' },
    aiLimits: { label: 'Anthropic Academy · AI Capabilities and Limitations (free)', url: 'https://anthropic.skilljar.com/ai-capabilities-and-limitations' },
    ccOverview: { label: 'Claude Code docs · Overview', url: 'https://code.claude.com/docs/en/overview' },
    ccQuick: { label: 'Claude Code docs · Quickstart', url: 'https://code.claude.com/docs/en/quickstart' },
    ccMemory: { label: 'Claude Code docs · How Claude remembers your project (CLAUDE.md)', url: 'https://code.claude.com/docs/en/memory' },
    ccWorkflows: { label: 'Claude Code docs · Common workflows', url: 'https://code.claude.com/docs/en/common-workflows' },
    ccBest: { label: 'Claude Code docs · Best practices', url: 'https://code.claude.com/docs/en/best-practices' },
    ccPerms: { label: 'Claude Code docs · Configure permissions', url: 'https://code.claude.com/docs/en/permissions' },
    ccModes: { label: 'Claude Code docs · Permission modes', url: 'https://code.claude.com/docs/en/permission-modes' },
    ccHeadless: { label: 'Claude Code docs · Non-interactive mode', url: 'https://code.claude.com/docs/en/headless' },
    az104: { label: 'Microsoft Learn · AZ-104 study guide (skills measured)', url: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104' },
    vnet: { label: 'Microsoft Learn · What is Azure Virtual Network?', url: 'https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-overview' },
    peering: { label: 'Microsoft Learn · Virtual network peering', url: 'https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-peering-overview' },
    udr: { label: 'Microsoft Learn · Virtual network traffic routing (UDRs)', url: 'https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview' },
    pip: { label: 'Microsoft Learn · Public IP addresses', url: 'https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses' },
    nw: { label: 'Microsoft Learn · Azure Network Watcher overview', url: 'https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-overview' },
    nextHop: { label: 'Microsoft Learn · Network Watcher next hop', url: 'https://learn.microsoft.com/en-us/azure/network-watcher/next-hop-overview' },
    cliPeering: { label: 'Azure CLI reference · az network vnet peering', url: 'https://learn.microsoft.com/en-us/cli/azure/network/vnet/peering' },
    cliRoute: { label: 'Azure CLI reference · az network route-table route', url: 'https://learn.microsoft.com/en-us/cli/azure/network/route-table/route' },
    cliVnet: { label: 'Azure CLI reference · az network vnet', url: 'https://learn.microsoft.com/en-us/cli/azure/network/vnet' },
    toilBook: { label: 'Google SRE Book · Eliminating toil', url: 'https://sre.google/sre-book/eliminating-toil/' },
    toilWorkbook: { label: 'Google SRE Workbook · Eliminating toil', url: 'https://sre.google/workbook/eliminating-toil/' },
  };

  /* ---- lab files ---- */
  PL.PLACEHOLDERS.W09_REPO_TREE = L(
    'infra-platform/            (git repo, default branch: main)',
    '├── README.md              "Terraform for the shop platform on Azure. CI runs plan on PRs, apply on merge to main."',
    '├── Makefile               fmt: terraform fmt -recursive | validate: terraform validate | plan-%: terraform plan -var-file=env/$*.tfvars',
    '├── .github/workflows/',
    '│   ├── terraform-plan.yml   on: pull_request → fmt -check, validate, tflint, plan (OIDC to Azure)',
    '│   └── terraform-apply.yml  on: push to main → apply with manual approval (environment: prod)',
    '├── modules/',
    '│   ├── network/           vnet, subnets, nsg, route tables',
    '│   ├── app-service/       plan, web app, slots',
    '│   └── keyvault/',
    '├── env/',
    '│   ├── dev.tfvars',
    '│   ├── test.tfvars',
    '│   └── prod.tfvars        (contains subscription IDs; no secrets, secrets live in Key Vault)',
    '├── backend.tf             azurerm backend: storage account sttfstateprod, container tfstate',
    '├── tests/                 terraform test files (*.tftest.hcl) for modules/network',
    '├── .tflint.hcl',
    '└── .env                   (local only, gitignored: ARM_CLIENT_SECRET for break-glass SP)',
    '',
    'Team conventions (from the wiki):',
    '- Resource names: <type>-<app>-<env>, e.g. vnet-shop-prod',
    '- Every resource must carry tags env, owner, costcenter',
    '- Branch names: feat/<ticket>, fix/<ticket>; PRs need one reviewer from platform-team',
    '- Nobody applies from a laptop. Apply only runs in the GitHub Actions workflow.',
    '- Never run terraform state commands without a change ticket.'
  );
  PL.FILE_LABELS.W09_REPO_TREE = 'infra-platform-tree.txt';

  PL.PLACEHOLDERS.W09_TOIL_LOG = L(
    'Toil log · platform team · September 2026 (one engineer, before and after automating with Claude Code)',
    '',
    '| # | Task | Runs per month | Manual minutes per run | Minutes per run after automation (review only) |',
    '|---|------|----------------|------------------------|-----------------------------------------------|',
    '| 1 | Weekly TLS certificate expiry report across App Services and Key Vaults | 4 | 45 | 5 |',
    '| 2 | Terraform drift check across 6 workspaces (plan, read, summarise) | 8 | 30 | 3 |',
    '| 3 | Monthly stale NSG rule audit (rules with no hits, overly broad sources) | 1 | 120 | 15 |',
    '',
    'Cost of the automation:',
    '- One-off build time with Claude Code: 6 hours',
    '- Ongoing maintenance (fixing the scripts, reviewing changes): 1 hour per month'
  );
  PL.FILE_LABELS.W09_TOIL_LOG = 'toil-log-2026-09.md';

  const CLAUDE_MD = L(
    '# infra-platform',
    '',
    'Terraform for the shop platform on Azure. CI runs `plan` on pull requests and `apply` on merge to main (with manual approval for prod).',
    '',
    '## Commands',
    '- Format: `terraform fmt -recursive` (CI runs `terraform fmt -check`)',
    '- Validate: `terraform validate` and `tflint`',
    '- Plan one environment: `make plan-dev` (runs `terraform plan -var-file=env/dev.tfvars`)',
    '- Module tests: `terraform test` (tests live in `tests/*.tftest.hcl`)',
    '',
    '## Layout',
    '- `modules/network`, `modules/app-service`, `modules/keyvault`: reusable modules',
    '- `env/*.tfvars`: per-environment values; `backend.tf`: remote state in `sttfstateprod`',
    '',
    '## Conventions',
    '- Names: `<type>-<app>-<env>`, e.g. `vnet-shop-prod`',
    '- Every resource carries the tags `env`, `owner`, `costcenter`',
    '- Branches: `feat/<ticket>` or `fix/<ticket>`; open a PR, never push to main',
    '',
    '## Guardrails (always)',
    '- NEVER run `terraform apply` or `terraform destroy`. Apply only runs in the GitHub Actions workflow.',
    '- Never run `terraform state` commands or `force-unlock`; ask the user, a change ticket is required.',
    '- Do not read or print `.env` or any secret; secrets live in Key Vault.',
    '- After editing `.tf` files: run fmt, validate and `make plan-dev`, then show me the plan summary.'
  );

  const TOIL_RESULT = {
    tasks: [
      { task: 'TLS certificate expiry report', minutes_saved_per_month: 160 },
      { task: 'Terraform drift check', minutes_saved_per_month: 216 },
      { task: 'Stale NSG rule audit', minutes_saved_per_month: 105 },
    ],
    gross_hours_per_month: 8.02,
    maintenance_hours_per_month: 1,
    net_hours_per_month: 7.02,
    payback_months: 0.86,
    summary: '481 minutes (8.02 h) of toil removed per month; minus 1 h maintenance gives 7.02 h returned per month. The 6 h build pays back in about 0.86 months.',
  };

  /* =====================================================================
     Topic 1 — Introduction to Claude Code
     ===================================================================== */
  const t1 = {
    id: 'w09-t1',
    title: 'Introduction to Claude Code',
    programmeItem: 'Introduction to Claude Code (free equivalent: Anthropic Academy Claude Code in Action + Claude Code docs, Quickstart)',
    blurb: 'Claude Code is an agentic coding tool that runs in your terminal (and IDE, desktop and web): it reads your repo, edits files, runs commands and uses git, while you approve and review.',
    outcomes: [
      'Install Claude Code, start it in an infrastructure repo and give it project memory with CLAUDE.md',
      'Use plan mode and permission prompts to review changes before they touch disk',
      'Run a git workflow with Claude Code: branch, change, review the diff, commit, open a PR',
    ],
    concepts: [
      { t: 'Install and start', d: 'Install with the native installer (or Homebrew/WinGet), then run `claude` inside a project folder. It asks you to log in on first use and reads files as it needs them.', ex: 'curl -fsSL https://claude.ai/install.sh | bash → cd infra && claude' },
      { t: 'CLAUDE.md memory', d: 'A markdown file of project instructions loaded at the start of every session: build commands, conventions, "never do X". `/init` drafts one from your codebase; keep it short and specific.', ex: './CLAUDE.md · ~/.claude/CLAUDE.md · CLAUDE.local.md' },
      { t: 'Plan mode', d: 'Claude reads and proposes a plan but does not edit your files until you approve. Press Shift+Tab until the status bar shows plan mode, or start with `--permission-mode plan`.', ex: 'claude --permission-mode plan' },
      { t: 'Permission prompts', d: 'By default Claude asks before edits and most shell commands. Rules in settings.json (allow/ask/deny) and `/permissions` decide what runs without asking. These rules are enforced by Claude Code itself, while CLAUDE.md only guides Claude.', ex: '"deny": ["Bash(terraform apply *)"]' },
      { t: 'Git is conversational', d: 'Ask "what did I change?", "create a branch", "commit with a descriptive message" or "create a pr". Review every diff yourself: you are the reviewer of record.', ex: '"create branch feat/PLAT-212 and commit"' },
      { t: 'Sessions and scripts', d: '`claude -c` continues the last session, `claude -r` picks one, and `claude -p "…"` runs one query and exits, which is useful in scripts and CI.', ex: 'git log --oneline -20 | claude -p "summarize"' },
    ],
    leverage: [
      { t: 'Onboard onto an unfamiliar IaC repo in minutes', d: 'Ask for an overview of modules, environments, state backends and pipelines before you touch anything. It is faster than reading every file, and you can ask follow-up questions.' },
      { t: 'Safe Terraform changes', d: 'Plan mode + a CLAUDE.md that forbids `terraform apply` means Claude drafts the change, runs fmt/validate/plan, and you review the diff and the plan before a PR.' },
      { t: 'PRs with real descriptions', d: 'Claude summarizes what changed and why, lists risks and the plan output, and opens the PR with the gh CLI, so reviewers get context and you don\'t have to write it up.' },
      { t: 'Team-wide defaults', d: 'Commit CLAUDE.md and `.claude/settings.json` so every engineer gets the same conventions and guardrails in that repo.' },
    ],
    sources: [SRC.ccAction, SRC.ccQuick, SRC.ccMemory, SRC.ccWorkflows, SRC.ccPerms],
    quiz: [
      { q: 'You want Claude to propose a Terraform change without editing any file yet. What do you use?', options: ['`claude -p`', 'Plan mode (Shift+Tab or `--permission-mode plan`)', '`/clear`'], a: 1, why: 'In plan mode Claude reads and plans, and edits only after you approve.' },
      { q: 'Your CLAUDE.md says "never run terraform apply". Is that a hard block?', options: ['Yes, Claude Code enforces it', 'No, it is guidance. Use a permissions deny rule (or a hook) to enforce it', 'Only in plan mode'], a: 1, why: 'CLAUDE.md is context, not enforcement. Permission rules are enforced by Claude Code.' },
      { q: 'What does `/init` do?', options: ['Installs Claude Code', 'Analyzes the codebase and drafts a starting CLAUDE.md', 'Initializes a git repo'], a: 1, why: '/init generates a starting CLAUDE.md (or suggests improvements to an existing one).' },
    ],
    steps: [
      {
        id: 'w09-t1-s1', kind: 'guide', title: 'Install Claude Code and onboard onto an infra repo', minutes: 30, source: SRC.ccQuick,
        scenario: 'Install Claude Code, start it in a Terraform or pipeline repo you work on (or a clone of a public one), get an overview, and create project memory with <code>/init</code>.',
        task: [
          'Install with the command for your OS from the Quickstart, open a new terminal, and run <code>claude --version</code>.',
          'Clone the repo to a working folder, create a branch (<code>git switch -c chore/claude-onboarding</code>), then <code>cd</code> into it and run <code>claude</code>. Log in when asked.',
          'Run prompts 1 and 2, then run <code>/init</code>, and edit the generated CLAUDE.md with prompt 3.',
          'Run <code>/context</code> (or <code>/memory</code>) to confirm CLAUDE.md is loaded.',
        ],
        prompts: [
          { label: 'Overview first', where: 'Claude Code', text: 'Give me an overview of this repository: what infrastructure it manages, the modules, how environments are separated, where Terraform state lives, and what the CI/CD pipelines do. Do not change any files. Do not open .env or any file that might contain secrets.' },
          { label: 'Find the risky parts', where: 'Claude Code', text: 'Which files or commands in this repo could change production if run by mistake? List them with the reason, and tell me which pipeline step is the only place apply should run.' },
          { label: 'Tighten CLAUDE.md', where: 'Claude Code', text: 'Update CLAUDE.md: keep it under 60 lines, and add a "Guardrails" section that says never run terraform apply/destroy, terraform state or force-unlock, never read .env or tfvars secrets, and always run terraform fmt, terraform validate and a dev plan after editing .tf files. Show me the diff before saving.' },
        ],
        expected: ['`claude --version` prints a version', 'An accurate overview that names your modules, state backend and pipelines', 'A short CLAUDE.md with commands, conventions and a Guardrails section, listed under Memory files in /context'],
        verify: 'Compare the overview to the repo yourself (backend.tf, workflow files). Check CLAUDE.md commands actually run, and look up anything unfamiliar in the Claude Code memory docs.',
        atWork: 'Do this in every repo you own: overview first, then CLAUDE.md with the commands and the rules that must never be broken. New teammates (and Claude) get the same context from day one.',
        hint: 'If `claude` is not found, the install folder is not on PATH yet. The Quickstart links a fix.',
        checks: [
          { id: 'install', label: 'Claude Code is installed and I logged in', manual: true },
          { id: 'overview', label: 'I got a repo overview and checked it against the files', manual: true },
          { id: 'claudemd', label: 'CLAUDE.md exists with a Guardrails section and shows in /context', manual: true },
        ],
      },
      {
        id: 'w09-t1-s2', kind: 'guide', title: 'Plan mode, permission prompts and a reviewed PR', minutes: 40, source: SRC.ccWorkflows,
        scenario: 'Make a small, real change (add a required <code>costcenter</code> tag to a module) the safe way: plan first, approve edits one by one, review the diff and plan output, then open a PR.',
        task: [
          'Press <b>Shift+Tab</b> until the status bar shows plan mode (or restart with <code>claude --permission-mode plan</code>). Run prompt 1 and read the plan.',
          'Approve the plan, switch back to the default mode, and watch the permission prompts. Approve edits, and say <b>no</b> to anything you did not expect.',
          'Run prompt 2, then read <code>git diff</code> yourself before running prompt 3.',
        ],
        prompts: [
          { label: 'Plan the change', where: 'Claude Code', text: 'Plan (do not edit yet): add a required variable "costcenter" to modules/app-service and pass it through to the tags of every resource in that module. Update the callers in each environment using the values in env/*.tfvars (use CC-0000 as a placeholder where none exists and flag it). List every file you will touch and the commands you will run to check the change.' },
          { label: 'Implement and check', where: 'Claude Code', text: 'Implement the plan on a new branch feat/PLAT-212-costcenter-tag. Then run terraform fmt -recursive, terraform validate and make plan-dev, and summarize the plan: resources changed, added or destroyed. If anything would be destroyed or replaced, stop and tell me.' },
          { label: 'Commit and PR', where: 'Claude Code', text: 'Commit with a descriptive message, then create a PR with gh. The PR description must include: why, what changed, the dev plan summary, risks, and how to roll back. Do not push to main.' },
        ],
        expected: ['A plan listing files and checks before any edit', 'A diff that only touches the module, callers and tfvars', 'A dev plan showing in-place tag updates only (no destroy/replace)', 'A PR with why, what, plan summary, risks and rollback'],
        verify: 'Read the full diff and the plan output yourself. A tag change should be in-place. Check the gh CLI created the PR against the right base branch.',
        atWork: 'This is the default loop for IaC with Claude Code: plan mode → approve → Claude runs fmt/validate/plan → you review the diff and plan → PR. Apply stays in the pipeline.',
        checks: [
          { id: 'plan', label: 'I reviewed a plan in plan mode before any edit', manual: true },
          { id: 'prompts', label: 'I handled permission prompts and declined anything unexpected', manual: true },
          { id: 'diff', label: 'I read the diff and the plan summary myself', manual: true },
          { id: 'pr', label: 'Claude opened a PR with a full description (not pushed to main)', manual: true },
        ],
      },
      {
        id: 'w09-t1-s3', title: 'Draft a CLAUDE.md for a Terraform repo', minutes: 8, source: SRC.ccMemory, files: ['W09_REPO_TREE'],
        scenario: 'Give Claude the layout and conventions of <code>infra-platform</code> and ask for a concise CLAUDE.md with commands, conventions and guardrails.',
        task: ['Read <code>infra-platform-tree.txt</code>.', 'Click <b>Run</b>.', 'Check that the guardrails match the team rules (no apply from a laptop, no state commands, no secrets).'],
        atWork: 'Generate the first draft of CLAUDE.md, then cut it down. The docs recommend specific, verifiable instructions and a short file, so put multi-step procedures in skills instead.',
        hint: 'The checks look for real commands (fmt, validate, plan, test), a rule against terraform apply, and the .env secret rule.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' },
          system: 'You write CLAUDE.md files for Claude Code. Keep them short (under 60 lines), specific and verifiable, grouped with markdown headings. Output only the file content.',
          messages: user(L('<repo>', '{{W09_REPO_TREE}}', '</repo>', 'Write the CLAUDE.md for this repo. Include sections: Commands, Layout, Conventions, Guardrails.')),
        },
        checks: [
          { id: 'cmds', label: 'Commands section with terraform fmt, validate, plan and test', test: (c, h) => h.section(c, 'Commands') && /terraform fmt/.test(h.text(c)) && /terraform validate/.test(h.text(c)) && /plan/.test(h.text(c)) && /terraform test/.test(h.text(c)) },
          { id: 'noapply', label: 'Guardrails forbid terraform apply outside the pipeline', test: (c, h) => h.section(c, 'Guardrails') && /(never|do not|don't)[^\n]*terraform apply/i.test(h.text(c)) },
          { id: 'state', label: 'Forbids terraform state commands without a ticket', test: (c, h) => /terraform state/i.test(h.text(c)) },
          { id: 'secrets', label: 'Says not to read or print .env / secrets', test: (c, h) => /\.env/.test(h.text(c)) && /secret/i.test(h.text(c)) },
          { id: 'short', label: 'Stays short (under 80 lines)', test: (c, h) => h.text(c).split('\n').length < 80 },
        ],
        sim: [textTurn(CLAUDE_MD, { input_tokens: 700, output_tokens: 420 })],
      },
    ],
  };

  /* =====================================================================
     Topic 2 — Strengths and limitations of Claude Code
     ===================================================================== */
  const PERMS_ANSWER = {
    permissions: {
      allow: ['Bash(terraform fmt *)', 'Bash(terraform validate)', 'Bash(terraform plan *)', 'Bash(terraform test *)', 'Bash(tflint *)', 'Bash(make plan-*)', 'Bash(git diff *)', 'Bash(git status)'],
      ask: ['Bash(git push *)', 'Bash(gh pr create *)'],
      deny: ['Bash(terraform apply *)', 'Bash(terraform destroy *)', 'Bash(terraform state *)', 'Bash(terraform force-unlock *)', 'Read(./.env)', 'Read(./.env.*)'],
    },
    notes: [
      { rule: 'Bash(terraform apply *)', why: 'Apply only runs in the GitHub Actions workflow with approval.' },
      { rule: 'Bash(terraform state *)', why: 'State surgery needs a change ticket.' },
      { rule: 'Read(./.env)', why: 'Holds a break-glass service principal secret.' },
      { rule: 'Bash(git push *)', why: 'Pushing is visible to others, so a human confirms each push.' },
    ],
  };
  const t2 = {
    id: 'w09-t2',
    title: 'Strengths and limitations of Claude Code',
    programmeItem: 'Strengths and Limitations of Claude Code (free equivalent: Claude Code docs, Common workflows and Best practices + Anthropic Academy AI Capabilities and Limitations)',
    blurb: 'Know where Claude Code shines on infra work (exploring code, refactors, tests, scripts, PR review) and where it needs guardrails (context limits, confident mistakes, non-determinism).',
    outcomes: [
      'Pick tasks where Claude Code saves real time, and spot the ones where it needs more checks',
      'Put guardrails in place: permissions, tests, plan mode, small increments',
      'Give Claude a way to verify its own work (tests, fmt/validate/plan) instead of trusting it',
    ],
    concepts: [
      { t: 'Where it shines', d: 'Understanding an unfamiliar codebase, finding code, fixing bugs from an error, refactoring in small steps, writing tests, writing docs and drafting PRs. These recipes are all in the Common workflows docs.', ex: '"find deprecated azurerm arguments in modules/"' },
      { t: 'Give it a way to check', d: 'Claude does much better when it can run a check: tests, linters, `terraform validate`, a plan. Without a check you are relying only on its judgement.', ex: '"run terraform test and fix failures"' },
      { t: 'Context is finite', d: 'Every file read fills the context window. Long sessions drift, so use `/clear` between tasks, keep CLAUDE.md short, and delegate broad exploration to subagents.', ex: '"use a subagent to map all NSG rules"' },
      { t: 'Confident and non-deterministic', d: 'The same prompt can give different answers, and a wrong answer can look right. Review every diff, and don\'t let it pick flags or SKUs without checking the docs.', ex: 'check a flag in `az … --help`' },
      { t: 'Guardrails are config', d: 'Permission rules (allow/ask/deny) are enforced by Claude Code; CLAUDE.md is guidance only. Deny destructive commands and secret files, and ask before pushes.', ex: 'deny Bash(terraform destroy *)' },
      { t: 'Know when not to use it', d: 'Don\'t use it for live production changes from a laptop, work that needs credentials it should never see, or decisions that need context only people have (commercial, org). Keep a human on anything irreversible.', ex: 'break-glass access stays human' },
    ],
    leverage: [
      { t: 'Scripts and glue code', d: 'az CLI/PowerShell/bash scripts with --dry-run, logging and idempotency are a sweet spot. Ask it to write a test or dry-run harness too.' },
      { t: 'PR review assistant', d: 'Ask Claude Code to review a Terraform PR for security, cost and blast radius before a human review. It catches missing tags, open NSG rules and forced replacements.' },
      { t: 'Test-first refactors', d: 'Ask it to add `terraform test` cases for a module before refactoring, and then refactor until the tests pass. The tests are the guardrail.' },
      { t: 'Repo guardrails as code', d: 'Commit `.claude/settings.json` with deny rules for apply/destroy/state and secret files, so every engineer\'s Claude Code starts safe.' },
    ],
    sources: [SRC.ccWorkflows, SRC.ccBest, SRC.aiLimits, SRC.ccPerms],
    quiz: [
      { q: 'Which task is the best fit for Claude Code with little risk?', options: ['Running terraform apply on prod from your laptop', 'Adding terraform test cases to a module and running them', 'Rotating a production secret it can read'], a: 1, why: 'Tests give Claude a way to check its own work, and nothing reaches production.' },
      { q: 'Claude Code gave two different answers to the same question. What does that tell you?', options: ['It is broken', 'Output is non-deterministic: verify with tests, docs and review', 'Use the longer answer'], a: 1, why: 'Model output varies. Checks, not trust, decide what is correct.' },
      { q: 'How do you make sure Claude Code can never run terraform destroy in a repo?', options: ['Write it in CLAUDE.md', 'Add a permissions deny rule such as Bash(terraform destroy *)', 'Ask nicely'], a: 1, why: 'Deny rules are enforced by Claude Code, and CLAUDE.md is only guidance.' },
    ],
    steps: [
      {
        id: 'w09-t2-s1', kind: 'guide', title: 'Strengths vs limits scorecard on your repo', minutes: 45, source: SRC.ccWorkflows,
        scenario: 'Run four different kinds of task in Claude Code on your infra repo and score each: time saved, correctness, and how you verified it.',
        task: [
          'Work on a branch. Run prompts 1 to 4 as separate tasks, using <code>/clear</code> between them.',
          'For each, note: minutes taken (including review), what was wrong, and how you caught it.',
          'Run prompt 5 to turn your notes into a scorecard, and keep it for the Apply task.',
        ],
        prompts: [
          { label: '1 · Explore', where: 'Claude Code', text: 'Trace how a request reaches the app: which Terraform resources create the network path (public IP, load balancer or app gateway, NSG, subnet, app). Give file and line references. Do not edit anything.' },
          { label: '2 · Tests', where: 'Claude Code', text: 'Add terraform test cases (tests/*.tftest.hcl) for modules/network that assert: every subnet has an NSG, no NSG rule allows 0.0.0.0/0 or Internet on port 22 or 3389, and all resources have env/owner/costcenter tags. Run terraform test and fix only the tests, not the module.' },
          { label: '3 · Script', where: 'Claude Code', text: 'Write scripts/report-untagged.sh using az CLI: list resources in a subscription missing env, owner or costcenter tags, output CSV, support --dry-run and --subscription, exit non-zero on az errors. Use az graph query if it is simpler and explain why. Do not run it against prod.' },
          { label: '4 · Review', where: 'Claude Code', text: 'Review the diff of my current branch against main for security, cost and blast radius. Output a table: file, line, issue, severity, suggested fix. Flag anything that forces a replacement.' },
          { label: '5 · Scorecard', where: 'claude.ai', text: 'Turn my notes into a scorecard table with columns: task type, minutes with Claude incl. review, estimated minutes without, correctness (1–5), what was wrong, how I verified. Then list the 3 task types I should use Claude Code for first, and 2 where I need more guardrails.\n[paste notes, secrets removed]' },
        ],
        expected: ['Four completed tasks with honest notes', 'At least one mistake caught by a test, validate/plan, or your own review', 'A scorecard that shows where Claude Code works best on your repo'],
        verify: 'Check the tests really fail when you break the rule (e.g. add an SSH-from-Internet rule on a scratch branch). Check the az CLI flags in the script against the Azure CLI reference.',
        atWork: 'Share the scorecard with your team: it is evidence-based guidance on where to use Claude Code, and it shows which guardrails you still need.',
        checks: [
          { id: 'four', label: 'I ran all four task types on a branch', manual: true },
          { id: 'caught', label: 'I caught at least one mistake and noted how', manual: true },
          { id: 'score', label: 'I have the scorecard saved', manual: true },
        ],
      },
      {
        id: 'w09-t2-s2', title: 'Guardrails as code: .claude/settings.json permissions', minutes: 8, source: SRC.ccPerms, files: ['W09_REPO_TREE'],
        scenario: 'Turn the team rules for <code>infra-platform</code> into Claude Code permission rules that are enforced: allow the safe checks, ask before pushes, deny apply/destroy/state and the secrets file.',
        task: ['Click <b>Run</b>. Claude returns the <code>permissions</code> block as JSON.', 'Check that each deny rule has a reason.', 'In your repo, put the block in <code>.claude/settings.json</code> and confirm it with <code>/permissions</code>.'],
        atWork: 'Commit this file to each infra repo. It is the cheapest control you have: Claude Code enforces it whatever the prompt or CLAUDE.md says.',
        hint: 'Rule syntax: Tool(specifier), e.g. Bash(terraform plan *) or Read(./.env). The * goes after the subcommand.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: {
            effort: 'medium',
            format: jsonFormat(obj({
              permissions: obj({ allow: arr(S), ask: arr(S), deny: arr(S) }),
              notes: arr(obj({ rule: S, why: S })),
            })),
          },
          system: 'You configure Claude Code permissions. Use the documented rule syntax: Bash(command *) with the wildcard after the subcommand, Read(./path) for files. Least privilege: only allow read-only or check commands; ask for anything others can see; deny destructive commands and secret files.',
          messages: user(L('<repo>', '{{W09_REPO_TREE}}', '</repo>', 'Write the permissions block for .claude/settings.json for this repo, plus a short reason for each deny and ask rule.')),
        },
        checks: [
          { id: 'apply', label: 'Denies terraform apply and destroy', test: (c, h) => { const j = h.json(c); const d = (j && j.permissions.deny) || []; return d.some((r) => /^Bash\(terraform apply/.test(r)) && d.some((r) => /^Bash\(terraform destroy/.test(r)); } },
          { id: 'state', label: 'Denies terraform state commands', test: (c, h) => { const j = h.json(c); return !!j && j.permissions.deny.some((r) => /^Bash\(terraform state/.test(r)); } },
          { id: 'env', label: 'Denies reading .env', test: (c, h) => { const j = h.json(c); return !!j && j.permissions.deny.some((r) => /^Read\(.*\.env/.test(r)); } },
          { id: 'allow', label: 'Allows plan/validate but never apply or a blanket Bash rule', test: (c, h) => { const j = h.json(c); if (!j) return false; const a = j.permissions.allow; return a.some((r) => /terraform (plan|validate)/.test(r)) && !a.some((r) => /apply|destroy|^Bash\(\*\)$|^Bash$|^Bash\(terraform \*\)$/.test(r)); } },
          { id: 'push', label: 'Asks before git push', test: (c, h) => { const j = h.json(c); return !!j && j.permissions.ask.some((r) => /git push/.test(r)); } },
        ],
        sim: [jsonTurn(PERMS_ANSWER, { input_tokens: 760, output_tokens: 380 })],
      },
    ],
  };

  /* =====================================================================
     Topic 3 — AZ-104 · Virtual networks, peering, public IPs, UDRs
     ===================================================================== */
  const HUBSPOKE = L(
    '```bash',
    '# 1. Hub and spoke VNets',
    'az network vnet create -g rg-net-lab -n vnet-hub -l westeurope --address-prefixes 10.0.0.0/16 \\',
    '  --subnet-name snet-nva --subnet-prefixes 10.0.1.0/24',
    'az network vnet create -g rg-net-lab -n vnet-spoke-app -l westeurope --address-prefixes 10.1.0.0/16 \\',
    '  --subnet-name snet-app --subnet-prefixes 10.1.1.0/24',
    '',
    '# 2. Peering must be created in BOTH directions',
    'az network vnet peering create -g rg-net-lab -n hub-to-spoke --vnet-name vnet-hub --remote-vnet vnet-spoke-app \\',
    '  --allow-vnet-access --allow-forwarded-traffic',
    'az network vnet peering create -g rg-net-lab -n spoke-to-hub --vnet-name vnet-spoke-app --remote-vnet vnet-hub \\',
    '  --allow-vnet-access --allow-forwarded-traffic',
    '',
    '# 3. Route table: send all spoke egress through the NVA',
    'az network route-table create -g rg-net-lab -n rt-spoke-app -l westeurope',
    'az network route-table route create -g rg-net-lab --route-table-name rt-spoke-app -n default-via-nva \\',
    '  --address-prefix 0.0.0.0/0 --next-hop-type VirtualAppliance --next-hop-ip-address 10.0.1.4',
    'az network vnet subnet update -g rg-net-lab --vnet-name vnet-spoke-app -n snet-app --route-table rt-spoke-app',
    '',
    '# 4. The NVA must forward packets that are not addressed to it',
    'az network nic update -g rg-net-lab -n nic-nva-01 --ip-forwarding true',
    '',
    '# 5. Verify',
    'az network vnet peering list -g rg-net-lab --vnet-name vnet-spoke-app -o table   # peeringState: Connected',
    'az network nic show-effective-route-table -g rg-net-lab -n nic-app-01 -o table',
    'az network watcher show-next-hop -g rg-net-lab --vm vm-app-01 --source-ip 10.1.1.4 --dest-ip 8.8.8.8',
    '```',
    '',
    '- `--allow-vnet-access`: lets VMs in each VNet reach the other (default is False on create).',
    '- `--allow-forwarded-traffic`: accepts traffic that the NVA forwards, which did not originate in the peered VNet.',
    '- Peering is **not transitive**: a second spoke cannot reach this one through the hub without routing via the NVA.',
    '- `VirtualAppliance` requires `--next-hop-ip-address`; the next hop should report `VirtualAppliance 10.0.1.4`.',
    '- No `--use-remote-gateways`: the hub has no VPN/ExpressRoute gateway, so that flag would fail.'
  );
  const t3 = {
    id: 'w09-t3',
    title: 'AZ-104 · Virtual networks, peering, public IPs and routing',
    programmeItem: 'AZ-104 Microsoft Azure Administrator · Implement and manage virtual networking (free: Microsoft Learn)',
    blurb: 'VNets and subnets, peering, public IP addresses, user-defined routes, and how to troubleshoot connectivity with Network Watcher. This is part of the 15–20% networking domain.',
    outcomes: [
      'Design VNets and subnets with non-overlapping address spaces, and peer them correctly in both directions',
      'Create user-defined routes that send traffic through a virtual appliance, and verify the effective routes',
      'Troubleshoot connectivity with effective routes, next hop and IP flow verify',
    ],
    concepts: [
      { t: 'VNets and subnets', d: 'A VNet is a private address space in one region and subscription; subnets divide it. Azure reserves 5 addresses in every subnet. Address spaces must not overlap if you ever want to peer or connect them.', ex: '10.0.0.0/16 → snet-app 10.0.1.0/24' },
      { t: 'Peering', d: 'Connects two VNets over the Microsoft backbone, in the same or different regions (global). It must be created from both sides, and it is not transitive, so hub-and-spoke needs an NVA/firewall or gateway for spoke-to-spoke traffic.', ex: 'hub-to-spoke + spoke-to-hub' },
      { t: 'Peering options', d: 'Allow virtual network access, allow forwarded traffic (for traffic from an NVA), gateway transit on the hub, and use remote gateways on the spoke.', ex: '--allow-forwarded-traffic' },
      { t: 'Public IPs', d: 'Standard SKU is the one to use: static, secure by default (closed until an NSG allows traffic), and zone-aware. Basic SKU public IPs are retired.', ex: 'az network public-ip create --sku Standard' },
      { t: 'System routes and UDRs', d: 'Azure adds system routes (VNet, peering, Internet). A route table with user-defined routes overrides them for a subnet; the longest matching prefix wins. Next hop types: VirtualAppliance, VirtualNetworkGateway, VnetLocal, Internet, None.', ex: '0.0.0.0/0 → VirtualAppliance 10.0.1.4' },
      { t: 'Troubleshoot', d: 'Network Watcher: next hop (where does this packet go?), IP flow verify (which NSG rule allows or denies it?), connection troubleshoot, plus effective routes on a NIC.', ex: 'az network watcher show-next-hop' },
    ],
    leverage: [
      { t: 'Address plans without overlaps', d: 'Give Claude your existing VNets and ask for an IP plan for new spokes that avoids overlaps, leaves room to grow, and keeps subnets sized for the services you plan to use.' },
      { t: 'Explain effective routes', d: 'Paste `az network nic show-effective-route-table` output and ask which route wins for a destination and why. This is a fast way to find a UDR that breaks traffic.' },
      { t: 'CLI you can defend in the exam', d: 'Ask Claude for az CLI plus a one-line reason per flag, then run it in a sandbox and compare with the CLI reference.' },
      { t: 'A study coach Project', d: 'Keep using the AZ-104 Project from Week 1: ask for scenario questions on peering and UDRs, and have it explain wrong answers against Microsoft Learn.' },
    ],
    sources: [SRC.az104, SRC.vnet, SRC.peering, SRC.udr, SRC.pip, SRC.nw, SRC.cliPeering, SRC.cliRoute],
    quiz: [
      { q: 'Spoke A and spoke B are both peered to the hub. Can A reach B by default?', options: ['Yes, peering is transitive', 'No. Peering is not transitive; route through an NVA/firewall or peer A and B directly', 'Only with Basic SKU'], a: 1, why: 'Peering only connects the two VNets in the peering.' },
      { q: 'A UDR sends 0.0.0.0/0 to 10.0.1.4 with next hop type VirtualAppliance. What else is required on the NVA NIC?', options: ['Accelerated networking', 'IP forwarding enabled', 'A Basic public IP'], a: 1, why: 'Without IP forwarding the NIC drops packets that are not addressed to it.' },
      { q: 'Which tool tells you which NSG rule blocks a specific 5-tuple?', options: ['Next hop', 'IP flow verify', 'Azure Advisor'], a: 1, why: 'IP flow verify returns allow/deny and the rule name for a given flow.' },
    ],
    steps: [
      {
        id: 'w09-t3-s1', kind: 'guide', title: 'Study coach: peering and routing drills', minutes: 60, source: SRC.az104,
        scenario: 'Use your AZ-104 Claude Project to drill the networking domain with scenario questions, then build and break a hub-and-spoke in a sandbox subscription.',
        task: [
          'In your "AZ-104 study" Project, run prompt 1 and answer without notes.',
          'Run prompt 2 for every question you got wrong.',
          'In a sandbox subscription, deploy the hub-and-spoke from the next step, break it on purpose with prompt 3, and fix it using Network Watcher. Delete the resource group afterwards.',
        ],
        prompts: [
          { label: 'Scenario questions', where: 'claude.ai', text: 'Give me 8 AZ-104 style scenario questions on virtual networking: address space overlap, subnet sizing, peering options (allow forwarded traffic, gateway transit, use remote gateways), non-transitive peering, Standard public IPs, and user-defined routes with a virtual appliance. One at a time, wait for my answer, then tell me if I am right.' },
          { label: 'Explain what I got wrong', where: 'claude.ai', text: 'I got this wrong: [paste question and my answer]. Explain the concept in 5 lines, why each wrong option is wrong, and name the Microsoft Learn page I should read to confirm.' },
          { label: 'Break-and-fix lab', where: 'claude.ai', text: 'I deployed a hub (10.0.0.0/16, NVA 10.0.1.4) and a spoke (10.1.0.0/16) with peering and a 0.0.0.0/0 UDR to the NVA. Give me 3 realistic ways to break connectivity (one peering, one routing, one NVA setting), the symptom for each, and the exact az network watcher or az network nic command that would reveal the cause.' },
        ],
        expected: ['A score out of 8 and a list of weak spots', 'Explanations you checked against Microsoft Learn', 'Three break/fix cases, each diagnosed with next hop, effective routes or IP flow verify'],
        verify: 'Confirm each explanation on the Microsoft Learn pages for peering and traffic routing. Your lab results are the final proof: the next hop output should match what Claude predicted.',
        atWork: 'Break-and-fix in a sandbox is the fastest way to learn networking, and the commands you learn here are the ones you will need during an outage.',
        checks: [
          { id: 'quiz', label: 'I answered the 8 scenario questions and reviewed the wrong ones', manual: true },
          { id: 'lab', label: 'I broke and fixed the hub-and-spoke three ways in a sandbox', manual: true },
          { id: 'cleanup', label: 'I deleted the sandbox resource group', manual: true },
        ],
      },
      {
        id: 'w09-t3-s2', title: 'Generate hub-and-spoke CLI: peering and a UDR to an NVA', minutes: 10, source: SRC.cliRoute,
        scenario: 'Ask Claude for the Azure CLI to build a hub and one spoke, peer them both ways, and force spoke egress through a network virtual appliance at <code>10.0.1.4</code>.',
        task: ['Click <b>Run</b>.', 'Check every flag against the CLI reference (peering and route-table route).', 'Run it in a sandbox and confirm the next hop is VirtualAppliance.'],
        atWork: 'Ask for the verification commands with every networking change. The next hop and effective routes show whether the change did what you intended, before users find out.',
        hint: 'Peering is created twice (one per side). A VirtualAppliance route needs --next-hop-ip-address, and the NVA NIC needs IP forwarding.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' },
          system: 'You are an Azure administrator coach. Give exact Azure CLI commands in one bash block, then explain the important flags in one line each.',
          messages: user('Resource group rg-net-lab in westeurope. Create vnet-hub 10.0.0.0/16 with subnet snet-nva 10.0.1.0/24, and vnet-spoke-app 10.1.0.0/16 with subnet snet-app 10.1.1.0/24. Peer them so VMs can talk and so traffic forwarded by the NVA is accepted. Route all spoke egress (0.0.0.0/0) through the NVA at 10.0.1.4 (NIC nic-nva-01), and associate the route table with snet-app. The hub has no VPN gateway. Finish with commands to verify peering state, effective routes on nic-app-01 and the next hop from vm-app-01.'),
        },
        checks: [
          { id: 'vnets', label: 'Creates both VNets with the right address spaces', test: (c, h) => (h.text(c).match(/az network vnet create/g) || []).length >= 2 && /10\.0\.0\.0\/16/.test(h.text(c)) && /10\.1\.0\.0\/16/.test(h.text(c)) },
          { id: 'peer2', label: 'Creates peering in both directions with --allow-vnet-access', test: (c, h) => (h.text(c).match(/az network vnet peering create/g) || []).length >= 2 && /--allow-vnet-access/.test(h.text(c)) },
          { id: 'fwd', label: 'Allows forwarded traffic on the peering', test: (c, h) => /--allow-forwarded-traffic/.test(h.text(c)) },
          { id: 'udr', label: 'UDR 0.0.0.0/0 with --next-hop-type VirtualAppliance and --next-hop-ip-address 10.0.1.4', test: (c, h) => /az network route-table route create/.test(h.text(c)) && /0\.0\.0\.0\/0/.test(h.text(c)) && /--next-hop-type VirtualAppliance/.test(h.text(c)) && /--next-hop-ip-address 10\.0\.1\.4/.test(h.text(c)) },
          { id: 'assoc', label: 'Associates the route table with snet-app', test: (c, h) => /az network vnet subnet update[\s\S]*--route-table/.test(h.text(c)) },
          { id: 'ipfwd', label: 'Enables IP forwarding on the NVA NIC', test: (c, h) => /--ip-forwarding/.test(h.text(c)) },
          { id: 'verify', label: 'Verifies with next hop or effective routes', test: (c, h) => /show-next-hop|show-effective-route-table/.test(h.text(c)) },
          { id: 'nogw', label: 'Does not use --use-remote-gateways (there is no gateway)', test: (c, h) => !/az network vnet peering create[^\n]*(\\\n[^\n]*)*--use-remote-gateways/.test(h.text(c)) },
        ],
        sim: [textTurn(HUBSPOKE, { input_tokens: 240, output_tokens: 760 })],
      },
    ],
  };

  /* =====================================================================
     Topic 4 — Apply: automate one piece of recurring toil
     ===================================================================== */
  const t4 = {
    id: 'w09-t4',
    title: 'Apply: automate one piece of recurring toil with Claude Code',
    programmeItem: 'Apply task · Automate one piece of recurring toil with Claude Code. Measure the hours returned per month.',
    blurb: 'Pick a manual, repetitive, automatable task you do every week, automate it with Claude Code, and measure the hours it gives back.',
    outcomes: [
      'Pick a real piece of toil with a clear baseline (runs per month × minutes per run)',
      'Automate it with Claude Code safely: plan, tests or dry-run, review, PR',
      'Measure the hours returned per month, net of maintenance, and show when the work pays back',
    ],
    concepts: [
      { t: 'What counts as toil', d: 'The SRE books describe toil as manual, repetitive, automatable, tactical work with no lasting value that grows as the service grows. Reports, checks and routine tickets are typical.', ex: 'weekly cert-expiry report' },
      { t: 'Baseline first', d: 'Measure before you automate: runs per month and minutes per run from your calendar, tickets or shell history. Without a baseline you cannot claim hours returned.', ex: '4 runs × 45 min' },
      { t: 'Net, not gross', d: 'Hours returned = (manual minutes − remaining review minutes) × runs, minus maintenance. Payback = build hours ÷ net hours per month.', ex: '(45−5)×4 = 160 min/month' },
      { t: 'Safe automation', d: 'Read-only first (reports, checks), --dry-run for anything that changes state, and a PR with tests. Schedule it in a pipeline, not on a laptop.', ex: 'GitHub Actions schedule: cron' },
    ],
    leverage: [
      { t: 'Claude Code builds the automation', d: 'Describe the manual steps. Claude Code writes the script, a test or dry-run mode, and the pipeline that runs it on a schedule.' },
      { t: 'Headless runs for summaries', d: 'Use `claude -p` in a pipeline to summarize the script output (e.g. drift found) for the team channel, and keep the script itself deterministic.' },
      { t: 'Claude does the maths', d: 'Give Claude the toil log and ask for gross, net and payback. Then check the arithmetic yourself, as in the API step below.' },
    ],
    sources: [SRC.toilBook, SRC.toilWorkbook, SRC.ccWorkflows, SRC.ccHeadless],
    quiz: [
      { q: 'A task runs 8 times a month, took 30 min, now takes 3 min to review. Minutes returned per month?', options: ['240', '216', '24'], a: 1, why: '(30 − 3) × 8 = 216 minutes.' },
      { q: 'Why subtract maintenance hours?', options: ['It looks better', 'Automation has an ongoing cost; net hours is the honest number', 'The SRE book requires it'], a: 1, why: 'Scripts break and need review. Claiming gross hours overstates the benefit.' },
    ],
    steps: [
      {
        id: 'w09-t4-s1', kind: 'guide', title: 'Pick, automate and measure one piece of toil', minutes: 150, source: SRC.toilWorkbook,
        scenario: 'Automate one recurring task from your real work with Claude Code, ship it through a PR, and record the hours returned per month.',
        task: [
          'Pick the task: it repeats at least monthly, is manual, and you can measure it. Fill the baseline row of the template (prompt 1) before you start.',
          'In Claude Code, on a branch, run prompts 2 to 4 in order. Use plan mode for prompt 2.',
          'After two weeks of real runs, fill the "after" columns and run prompt 5 to compute the hours returned.',
        ],
        prompts: [
          { label: '1 · Measurement template', where: 'claude.ai', text: 'Make me a one-page toil measurement template as an Artifact table with columns: task, trigger, runs per month, manual minutes per run (baseline source: calendar/tickets/history), minutes per run after automation (review only), one-off build hours, maintenance hours per month, gross hours returned, net hours returned, payback months. Include the formulas in a note.' },
          { label: '2 · Plan the automation', where: 'Claude Code', text: 'Plan mode. Today I do this by hand: [describe the steps, tools and outputs, e.g. check TLS expiry for all App Services and Key Vault certificates and post a list of anything expiring in 30 days]. Propose the simplest automation: a script (az CLI or PowerShell) plus a scheduled GitHub Actions workflow using OIDC. It must be read-only, have --dry-run, log clearly, and exit non-zero on errors. List files, permissions it needs (least privilege) and how we will test it.' },
          { label: '3 · Build with tests', where: 'Claude Code', text: 'Implement the plan on branch feat/toil-<name>. Add a test or a fixture-based dry run so the script can be checked without touching Azure. Run it. Do not print or commit any secrets; use placeholders and the workflow\'s OIDC login.' },
          { label: '4 · Review and PR', where: 'Claude Code', text: 'Review your own change for security (permissions, secrets, injection in shell variables), then create a PR whose description includes: the manual process it replaces, baseline minutes, expected minutes after, required role assignment, and how to disable it.' },
          { label: '5 · Measure', where: 'claude.ai', text: 'Here is my filled toil template. Compute gross and net hours returned per month and the payback in months, show the working, and write 3 lines I can use as evidence for the milestone.\n[paste table]' },
        ],
        expected: ['A merged (or approved) PR that automates one real task', 'A baseline and an after measurement, both with sources', 'Net hours returned per month and payback months, with the working shown'],
        verify: 'Recompute the numbers yourself from the template. Check that the workflow\'s identity has only the role it needs (for example Reader, plus Key Vault certificate read permission if required) in the Azure portal.',
        atWork: 'Do this every quarter: one piece of toil, measured and automated. The hours returned are evidence for later milestones (W17 asks for expected-before and actual-after).',
        checks: [
          { id: 'baseline', label: 'I recorded a baseline before automating', manual: true },
          { id: 'pr', label: 'The automation went through a reviewed PR with a test or dry-run', manual: true },
          { id: 'measure', label: 'I measured net hours returned per month after real runs', manual: true },
        ],
      },
      {
        id: 'w09-t4-s2', title: 'Compute hours returned from a toil log', minutes: 6, source: SRC.toilBook, files: ['W09_TOIL_LOG'],
        scenario: 'The platform team automated three toil tasks with Claude Code. Ask Claude to compute gross and net hours returned per month and the payback period, as JSON.',
        task: ['Read <code>toil-log-2026-09.md</code>.', 'Click <b>Run</b>.', 'Check the arithmetic: minutes saved per task, then hours, then net and payback.'],
        atWork: 'Use the same calculation for any automation proposal. Net hours and payback are what a manager needs to approve the time.',
        hint: 'Saved per task = (manual − after) × runs. Net = gross − maintenance. Payback = build hours ÷ net hours per month.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: {
            effort: 'medium',
            format: jsonFormat(obj({
              tasks: arr(obj({ task: S, minutes_saved_per_month: N })),
              gross_hours_per_month: N, maintenance_hours_per_month: N, net_hours_per_month: N, payback_months: N, summary: S,
            })),
          },
          system: 'You are an SRE analyst. Compute exactly from the log. Round hours to 2 decimals.',
          messages: user(L('<toil_log>', '{{W09_TOIL_LOG}}', '</toil_log>', 'Compute minutes saved per month for each task, gross and net hours returned per month, and payback months for the build time.')),
        },
        checks: [
          { id: 'tasks', label: 'Per-task minutes saved are 160, 216 and 105', test: (c, h) => { const j = h.json(c); if (!j) return false; const m = j.tasks.map((t) => Math.round(t.minutes_saved_per_month)).sort((a, b) => a - b); return m.join(',') === '105,160,216'; } },
          { id: 'gross', label: 'Gross is about 8.02 hours per month', test: (c, h) => { const j = h.json(c); return !!j && h.near(String(j.gross_hours_per_month), 8.02, 0.02); } },
          { id: 'net', label: 'Net is about 7.02 hours per month (after 1 h maintenance)', test: (c, h) => { const j = h.json(c); return !!j && h.near(String(j.net_hours_per_month), 7.02, 0.02); } },
          { id: 'payback', label: 'Payback is about 0.86 months', test: (c, h) => { const j = h.json(c); return !!j && h.near(String(j.payback_months), 0.855, 0.02); } },
        ],
        sim: [{ content: [think('Task 1: (45-5)*4=160. Task 2: (30-3)*8=216. Task 3: (120-15)*1=105. Total 481 min = 8.02 h. Net 7.02 h. Payback 6/7.0167 = 0.855 months.'), { type: 'text', text: JSON.stringify(TOIL_RESULT, null, 2) }], stop_reason: 'end_turn', usage: { input_tokens: 380, output_tokens: 260 } }],
      },
    ],
  };

  PL.addWeek({
    week: 9,
    title: 'Claude Code for infrastructure & Azure virtual networking',
    stream: 'role',
    hours: 9,
    focus: 'Start using Claude Code on your infrastructure repos: install, CLAUDE.md, plan mode, permissions and git, and learn where it shines and where it needs guardrails. AZ-104: VNets, peering, public IPs and user-defined routes. Then automate one piece of real toil and measure the hours returned.',
    apply: 'Automate one piece of recurring toil with Claude Code. Measure the hours returned per month.',
    topics: [t1, t2, t3, t4],
  });
})();
