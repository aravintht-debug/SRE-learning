/* Week 18 · Agentification: Claude Code at team scale (shared .claude/, subagents, MCP, plugins, headless, costs),
   AZ-104 final cram, Azure Cost Management and the FinOps Framework, and measuring alert volume and toil before/after.
   Structure follows week01.js (the template). Run `node tests/validate.js --week 18` after editing. */
(function () {
  'use strict';
  const PL = window.PL;
  const { ADAPTIVE, user, L, obj, arr, en, S, N, I, jsonFormat, textTurn, jsonTurn, think } = PL.B;

  const SRC = {
    settings: { label: 'Claude Code docs · Settings files and precedence', url: 'https://code.claude.com/docs/en/settings' },
    managed: { label: 'Claude Code docs · Managed settings', url: 'https://code.claude.com/docs/en/managed-settings' },
    hooksGuide: { label: 'Claude Code docs · Hooks guide', url: 'https://code.claude.com/docs/en/hooks-guide' },
    hooks: { label: 'Claude Code docs · Hooks reference', url: 'https://code.claude.com/docs/en/hooks' },
    subagents: { label: 'Claude Code docs · Subagents', url: 'https://code.claude.com/docs/en/sub-agents' },
    headless: { label: 'Claude Code docs · Run Claude Code programmatically (headless)', url: 'https://code.claude.com/docs/en/headless' },
    mcp: { label: 'Claude Code docs · Connect Claude Code to tools via MCP', url: 'https://code.claude.com/docs/en/mcp' },
    plugins: { label: 'Claude Code docs · Plugins overview', url: 'https://code.claude.com/docs/en/plugins/overview' },
    costs: { label: 'Claude Code docs · Manage costs effectively', url: 'https://code.claude.com/docs/en/costs' },
    monitoring: { label: 'Claude Code docs · Monitoring usage (OpenTelemetry)', url: 'https://code.claude.com/docs/en/monitoring-usage' },
    ghActions: { label: 'Claude Code docs · GitHub Actions', url: 'https://code.claude.com/docs/en/github-actions' },
    ccAction: { label: 'Anthropic Academy · Claude Code in Action (free)', url: 'https://anthropic.skilljar.com/claude-code-in-action' },
    subCourse: { label: 'Anthropic Academy · Introduction to subagents (free)', url: 'https://anthropic.skilljar.com/introduction-to-subagents' },
    azureMcp: { label: 'Microsoft Learn · What is the Azure MCP Server?', url: 'https://learn.microsoft.com/en-us/azure/developer/azure-mcp-server/overview' },
    azureMcpStart: { label: 'Microsoft Learn · Get started with the Azure MCP Server', url: 'https://learn.microsoft.com/en-us/azure/developer/azure-mcp-server/get-started' },
    az104: { label: 'Microsoft Learn · AZ-104 study guide (skills measured)', url: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104' },
    az104practice: { label: 'Microsoft Learn · AZ-104 practice assessment (free)', url: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/practice/assessment?assessment-type=practice&assessmentId=21' },
    az104cert: { label: 'Microsoft Learn · Azure Administrator Associate', url: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/' },
    budgetsTut: { label: 'Microsoft Learn · Create and manage budgets', url: 'https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets' },
    budgetBicep: { label: 'Microsoft Learn · Quickstart: create a budget with Bicep', url: 'https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/quick-create-budget-bicep' },
    budgetCli: { label: 'Microsoft Learn · az consumption budget (CLI reference, preview)', url: 'https://learn.microsoft.com/en-us/cli/azure/consumption/budget?view=azure-cli-latest' },
    anomaly: { label: 'Microsoft Learn · Identify anomalies and unexpected changes in cost', url: 'https://learn.microsoft.com/en-us/azure/cost-management-billing/understand/analyze-unexpected-charges' },
    costAlerts: { label: 'Microsoft Learn · Monitor usage and spending with cost alerts', url: 'https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/cost-mgt-alerts-monitor-usage-spending' },
    tagInherit: { label: 'Microsoft Learn · Group and allocate costs using tag inheritance', url: 'https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/enable-tag-inheritance' },
    tagPolicies: { label: 'Microsoft Learn · Policy definitions for tagging resources', url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-policies' },
    policyCli: { label: 'Microsoft Learn · az policy assignment (CLI reference)', url: 'https://learn.microsoft.com/en-us/cli/azure/policy/assignment?view=azure-cli-latest' },
    finops: { label: 'FinOps Foundation · FinOps Framework', url: 'https://www.finops.org/framework/' },
    finopsAlloc: { label: 'FinOps Foundation · Allocation capability', url: 'https://www.finops.org/framework/capabilities/allocation/' },
    finopsAnomaly: { label: 'FinOps Foundation · Anomaly Management capability', url: 'https://www.finops.org/framework/capabilities/anomaly-management/' },
    finopsBudget: { label: 'FinOps Foundation · Budgeting capability', url: 'https://www.finops.org/framework/capabilities/budgeting/' },
    toilWb: { label: 'Google SRE Workbook · Eliminating toil', url: 'https://sre.google/workbook/eliminating-toil/' },
    sloAlerts: { label: 'Google SRE Workbook · Alerting on SLOs', url: 'https://sre.google/workbook/alerting-on-slos/' },
  };

  /* Pull the first ```json block out of Claude's answer and parse it. */
  const jsonBlock = (c, h) => {
    const m = /```json\s*([\s\S]*?)```/.exec(h.text(c));
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch (e) { return null; }
  };
  const rules = (j, kind) => ((j && j.permissions && j.permissions[kind]) || []).join('\n');

  /* ---- lab files ---- */
  PL.PLACEHOLDERS.W18_REPO = L(
    'Repository: contoso/platform-infra (GitHub), 14 engineers use Claude Code in it.',
    'Layout:',
    '  terraform/          Azure landing zone + AKS (azurerm), remote state in Azure Storage',
    '  bicep/              subscription-level budgets and policy assignments',
    '  scripts/            bash + PowerShell ops scripts',
    '  .env                local ARM_CLIENT_SECRET for dev (gitignored)',
    '  secrets/            SOPS-encrypted files',
    'Team rules:',
    '  - Claude may run terraform fmt, validate and plan. apply and destroy only in the pipeline, never locally.',
    '  - Nobody (human or Claude) reads .env or secrets/ through Claude Code.',
    '  - az read commands are fine; az group delete never.',
    '  - git push needs a human to confirm.',
    '  - Every Bash command Claude runs must be written to an audit log by a hook script in the repo.'
  );
  PL.FILE_LABELS.W18_REPO = 'repo-and-team-rules.txt';

  PL.PLACEHOLDERS.W18_AFTER_LAB = L(
    'Service: shop platform on-call (AKS, Proxmox Backup Server, Key Vault). Triage agent went live 2026-08-31 (observe-and-propose,',
    'human gate on writes). Windows: 30 days before (2026-07-31 to 2026-08-29) vs 30 days after (2026-09-01 to 2026-09-30).',
    '',
    'rule,alerts_before,alerts_after,toil_hours_before,toil_hours_after',
    'aks-node-cpu-pressure,180,54,21.0,6.0',
    'pbs-backup-job-failed,96,40,15.0,5.5',
    'kv-cert-expiry,36,24,5.5,2.5',
    '',
    'Agent activity (after window): runs=94, auto_triaged_and_closed_by_human_after_review=71, escalated_to_on_call=23,',
    'write_actions_proposed=12, write_actions_approved=9, irreversible_actions_without_approval=0.',
    'Notes: traffic was 6% higher in the after window. The pbs rule was also retuned in August (Week 17 Outcome Record).'
  );
  PL.FILE_LABELS.W18_AFTER_LAB = 'oncall-before-after-30d.csv';

  /* =====================================================================
     Topic 1 — Advanced Claude Code at team scale
     ===================================================================== */
  const SETTINGS_SIM = L(
    'Commit this as `.claude/settings.json` (shared with everyone in the repo). Personal overrides go in `.claude/settings.local.json`, which is gitignored; organization-wide rules belong in managed settings.',
    '',
    '```json',
    '{',
    '  "permissions": {',
    '    "allow": [',
    '      "Bash(terraform fmt *)",',
    '      "Bash(terraform validate *)",',
    '      "Bash(terraform plan *)",',
    '      "Bash(az account show)",',
    '      "Bash(git diff *)",',
    '      "Bash(git status *)"',
    '    ],',
    '    "ask": [',
    '      "Bash(git push *)"',
    '    ],',
    '    "deny": [',
    '      "Read(./.env)",',
    '      "Read(./.env.*)",',
    '      "Read(./secrets/**)",',
    '      "Bash(terraform apply *)",',
    '      "Bash(terraform destroy *)",',
    '      "Bash(az group delete *)"',
    '    ]',
    '  },',
    '  "hooks": {',
    '    "PreToolUse": [',
    '      {',
    '        "matcher": "Bash",',
    '        "hooks": [',
    '          { "type": "command", "command": "\\"$CLAUDE_PROJECT_DIR\\"/.claude/hooks/audit-bash.sh" }',
    '        ]',
    '      }',
    '    ]',
    '  }',
    '}',
    '```',
    '',
    '- **deny** wins over allow and ask, so apply/destroy and the secret paths are blocked for everyone.',
    '- `git push` is an **ask** rule: Claude Code prompts a human each time.',
    '- The **PreToolUse hook** runs before every Bash call; `audit-bash.sh` reads the JSON on stdin and appends the command to the audit log (exit 0 to allow).',
    '- Bash rules match commands as written, so keep the pipeline as the only place that can apply.'
  );

  const t1 = {
    id: 'w18-t1',
    title: 'Advanced Claude Code: running it at team scale',
    programmeItem: 'Advanced Claude Code, part 2 (free equivalent: Claude Code docs — settings, hooks, subagents, headless mode, MCP, plugins, costs + Anthropic Academy Claude Code in Action)',
    blurb: 'One engineer with Claude Code is a productivity gain; fourteen need shared rules. Commit a .claude/ kit to the repo (settings, hooks, subagents, MCP servers), run Claude Code headless in CI, and keep usage and cost visible.',
    outcomes: [
      'Commit shared .claude/settings.json permissions and hooks, and know how settings precedence works',
      'Build a team subagent library and project-scoped MCP servers for GitHub and Azure',
      'Run Claude Code headless in CI with a locked-down tool set and a spend cap, and track team usage',
    ],
    concepts: [
      { t: 'Settings precedence', d: 'Managed settings (organization) override the command line, then .claude/settings.local.json (you, this repo), .claude/settings.json (everyone in the repo), then ~/.claude/settings.json (you, every repo).', ex: 'managed > CLI > local > project > user' },
      { t: 'Permissions and hooks in the repo', d: 'permissions.allow / ask / deny use rule syntax like Bash(terraform plan *) or Read(./.env). Deny wins. Hooks (PreToolUse, PostToolUse...) run your scripts at lifecycle events; exit code 2 blocks the action.', ex: '"deny": ["Bash(terraform apply *)"]' },
      { t: 'Subagents library', d: 'Markdown files with YAML frontmatter in .claude/agents/ (name, description, tools, model...). Commit them so the whole team shares the same reviewers and investigators, each with its own context and tool list.', ex: '.claude/agents/tf-reviewer.md' },
      { t: 'MCP at project scope', d: 'claude mcp add --scope project writes .mcp.json at the repo root, shared through git. GitHub offers a remote MCP server; Microsoft publishes the Azure MCP Server, which uses Entra ID and your Azure RBAC.', ex: 'claude mcp add --scope project --transport http github https://api.githubcopilot.com/mcp/' },
      { t: 'Plugins', d: 'A plugin packages skills, agents, hooks and MCP servers as one unit (manifest at .claude-plugin/plugin.json), installed from a marketplace. Project-scope installs are enabled for everyone through .claude/settings.json.', ex: '/plugin → Discover' },
      { t: 'Headless and cost controls', d: 'claude -p runs non-interactively; --bare skips local hooks, plugins and MCP for reproducible CI; --output-format json returns total_cost_usd; --max-budget-usd and --max-turns cap a run. /usage, workspace spend limits and OpenTelemetry show team usage.', ex: 'claude --bare -p "..." --max-budget-usd 2' },
    ],
    leverage: [
      { t: 'One kit per repo', d: 'Put the team rules for each IaC repo into .claude/settings.json and hooks, so every engineer and every CI run gets the same guardrails without relying on memory.' },
      { t: 'Specialist subagents', d: 'Commit a Terraform reviewer, a KQL investigator and a runbook writer as subagents with read-only tools, and let Claude delegate to them to keep the main context small.' },
      { t: 'Claude in the pipeline', d: 'Run a headless review of every Terraform plan in GitHub Actions with read-only tools and a budget cap, and post the summary to the PR.' },
      { t: 'Know what it costs', d: 'Export Claude Code telemetry with OpenTelemetry to your Grafana stack and set workspace spend limits, so adoption is visible and bounded.' },
    ],
    sources: [SRC.settings, SRC.hooksGuide, SRC.subagents, SRC.headless, SRC.mcp, SRC.plugins, SRC.costs, SRC.monitoring, SRC.azureMcp, SRC.ccAction],
    quiz: [
      { q: 'A rule in .claude/settings.json allows Bash(terraform apply *) but the organization\'s managed settings deny it. What happens?', options: ['Allowed: project settings win', 'Denied: managed settings have the highest precedence and deny wins', 'Claude asks each time'], a: 1, why: 'Managed settings override everything else, and deny rules take priority over allow.' },
      { q: 'Why use --bare in CI?', options: ['It makes Claude faster at reasoning', 'It skips hooks, plugins, MCP servers and CLAUDE.md found on the machine, so every run is reproducible', 'It removes the need for an API key'], a: 1, why: 'Bare mode ignores local auto-discovery; you pass exactly the settings, MCP config and agents you want.' },
      { q: 'Where do shared project subagents live?', options: ['~/.claude/agents/', '.claude/agents/ in the repository', 'In the system prompt'], a: 1, why: 'Project subagents are checked into .claude/agents/ so the whole team uses them.' },
    ],
    steps: [
      {
        id: 'w18-t1-s1', kind: 'guide', title: 'Commit a team .claude/ kit to an IaC repo', minutes: 60, source: SRC.settings,
        scenario: 'Turn your team\'s Claude Code habits into files in the repository: shared permissions, an audit hook, and a small subagent library, reviewed like any other change.',
        task: [
          'Create a branch in a real infrastructure repo (or a copy). Open Claude Code at the repo root.',
          'Run prompts 1 to 3. Review each file before accepting it.',
          'Open a pull request so the team reviews the kit, and test it in a fresh session (prompt 4).',
        ],
        prompts: [
          { label: '1. Shared settings', where: 'Claude Code', text: 'Create .claude/settings.json for this repo using the documented permission rule syntax. Allow: terraform fmt, validate and plan; git diff and status; read-only az commands we use (az account show, az group list). Ask: git push. Deny: reading .env, .env.* and secrets/**, terraform apply and destroy, az group delete. Add .claude/settings.local.json to .gitignore. Explain the precedence between managed, local, project and user settings in 3 lines.' },
          { label: '2. Audit hook', where: 'Claude Code', text: 'Add a PreToolUse hook for the Bash tool in .claude/settings.json that runs "$CLAUDE_PROJECT_DIR"/.claude/hooks/audit-bash.sh. Write the script: read the hook JSON from stdin, append timestamp, user and tool_input.command as one JSON line to .claude/audit/bash.jsonl (gitignored), and exit 0. It must never print or store environment variables or secrets. Then run /hooks so I can confirm it is registered.' },
          { label: '3. Subagent library', where: 'Claude Code', text: 'Create three project subagents in .claude/agents/ with YAML frontmatter (name, description, tools, model):\n- tf-reviewer: reviews terraform plan output for destroys, replacements, public exposure and missing tags; tools Read, Grep, Glob only\n- kql-investigator: writes and explains KQL for Log Analytics from a symptom; tools Read only\n- runbook-writer: turns incident notes into our runbook template; tools Read, Write limited to docs/runbooks\nUse model sonnet for the reviewers. Keep each system prompt under 20 lines.' },
          { label: '4. Test the kit', where: 'Claude Code', text: 'In a fresh session: try to read .env, try terraform apply, run terraform plan in terraform/, and ask the tf-reviewer subagent to review the plan. Report which calls were denied, which were allowed, and show the new lines in .claude/audit/bash.jsonl.' },
        ],
        expected: ['.claude/settings.json with allow, ask and deny rules and the PreToolUse hook', 'An audit log line for every Bash command', 'Three subagents in .claude/agents/ that the team can call', 'A pull request the team reviewed'],
        verify: 'Check the rule syntax and precedence against the Claude Code settings page and the hook configuration against the hooks guide. Confirm the .env read was denied in your own test, not just in Claude\'s summary.',
        atWork: 'Every repo that Claude Code touches should carry its own kit. Rules in git are reviewed, versioned and the same for every engineer.',
        checks: [
          { id: 'settings', label: 'Shared settings committed; .env and apply denied in my own test', manual: true },
          { id: 'hook', label: 'The audit hook logs every Bash command', manual: true },
          { id: 'agents', label: 'Three subagents committed and one used on a real plan', manual: true },
          { id: 'pr', label: 'The kit went through a team pull request', manual: true },
        ],
      },
      {
        id: 'w18-t1-s2', title: 'Write the shared settings.json from the team rules', minutes: 8, source: SRC.settings, files: ['W18_REPO'],
        scenario: 'Ask Claude to turn the written team rules into a shared <code>.claude/settings.json</code> with permissions and an audit hook.',
        task: ['Read <code>repo-and-team-rules.txt</code>.', 'Click <b>Run</b>.', 'The checks parse the JSON block and test the rules: plan allowed, apply denied, secrets denied, push asks, Bash hooked.'],
        atWork: 'Written team rules drift; settings files are enforced. Ask Claude to translate the rules, then review the file in a pull request like any other policy.',
        hint: 'Rule syntax looks like Bash(terraform plan *) and Read(./.env). Deny, ask and allow are separate lists under "permissions".',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' },
          system: 'You are a Claude Code administrator. Use only documented settings keys and permission rule syntax. Return the file in one ```json block, then short notes.',
          messages: user(L('<repo>', '{{W18_REPO}}', '</repo>', 'Write .claude/settings.json that enforces these team rules for everyone in the repo, including the audit hook.')),
        },
        checks: [
          { id: 'parse', label: 'Returns a valid JSON settings file with a permissions object', test: (c, h) => { const j = jsonBlock(c, h); return !!j && !!j.permissions; } },
          { id: 'plan', label: 'terraform plan is allowed', test: (c, h) => /Bash\(terraform plan/.test(rules(jsonBlock(c, h), 'allow')) },
          { id: 'apply', label: 'terraform apply and destroy are denied, and never allowed', test: (c, h) => { const j = jsonBlock(c, h); const d = rules(j, 'deny'); return /terraform apply/.test(d) && /terraform destroy/.test(d) && !/terraform apply/.test(rules(j, 'allow')); } },
          { id: 'secrets', label: '.env and secrets/ reads are denied', test: (c, h) => { const d = rules(jsonBlock(c, h), 'deny'); return /Read\(\.\/\.env\)/.test(d) && /Read\(\.\/secrets/.test(d); } },
          { id: 'push', label: 'git push is an ask rule', test: (c, h) => /git push/.test(rules(jsonBlock(c, h), 'ask')) },
          { id: 'hook', label: 'A PreToolUse hook matches Bash and runs a command', test: (c, h) => { const j = jsonBlock(c, h); const p = j && j.hooks && j.hooks.PreToolUse; return Array.isArray(p) && p.some((m) => m.matcher === 'Bash' && (m.hooks || []).some((x) => x.type === 'command' && /audit/.test(x.command))); } },
        ],
        sim: [textTurn(SETTINGS_SIM, { input_tokens: 500, output_tokens: 520 })],
      },
      {
        id: 'w18-t1-s3', title: 'Headless Claude Code in CI, locked down and capped', minutes: 8, source: SRC.headless,
        scenario: 'Add a pull-request job that pipes the Terraform plan into Claude Code headless and posts a risk summary. It must be read-only, reproducible and cost-capped.',
        task: ['Click <b>Run</b>.', 'Read every flag in the generated step.', 'Check the flags against the headless and CLI reference pages before you commit the workflow.'],
        atWork: 'Headless runs are unattended, so the permission mode, tool list and budget cap are the whole safety story. Never use a bypass flag in CI.',
        hint: 'Look for -p, --bare, --output-format json, a read-only --allowedTools list, --permission-mode dontAsk and --max-budget-usd.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' },
          system: 'You are a DevOps engineer writing GitHub Actions. Use only documented Claude Code CLI flags. The API key comes from a repository secret.',
          messages: user('Write the GitHub Actions job step (bash) for pull requests on contoso/platform-infra: run terraform plan -no-color into plan.txt, pipe it to Claude Code in non-interactive mode, and save a JSON result with a risk summary (destroys, replacements, public exposure, missing tags). Requirements: reproducible (ignore any local hooks, plugins or MCP config), read-only tools only, deny anything that would prompt, cap spend at 2 USD and 10 turns, and print total_cost_usd to the job log. Explain each flag in one line.'),
        },
        checks: [
          { id: 'p', label: 'Runs claude -p (non-interactive)', test: (c, h) => /claude\b[^\n]*\s-p\b/.test(h.text(c)) },
          { id: 'bare', label: 'Uses --bare for reproducible CI runs', test: (c, h) => /--bare/.test(h.text(c)) },
          { id: 'json', label: 'Uses --output-format json and reads total_cost_usd', test: (c, h) => /--output-format json/.test(h.text(c)) && /total_cost_usd/.test(h.text(c)) },
          { id: 'locked', label: 'Read-only --allowedTools with --permission-mode dontAsk', test: (c, h) => /--allowedTools\s+"?Read/.test(h.text(c)) && /--permission-mode dontAsk/.test(h.text(c)) },
          { id: 'cap', label: 'Caps spend and turns', test: (c, h) => /--max-budget-usd\s+2/.test(h.text(c)) && /--max-turns\s+10/.test(h.text(c)) },
          { id: 'nobypass', label: 'No bypass flags', test: (c, h) => !/dangerously-skip-permissions|bypassPermissions/.test(h.text(c).replace(/never use[^\n]*/gi, '')) },
          { id: 'secret', label: 'API key from a repository secret, not inline', test: (c, h) => /secrets\.ANTHROPIC_API_KEY/.test(h.text(c)) && !/sk-ant-/.test(h.text(c)) },
        ],
        sim: [textTurn(L(
          '```yaml',
          '- name: Claude plan review',
          '  env:',
          '    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}',
          '  run: |',
          '    # Claude Code CLI installed on the runner in an earlier step (see the setup docs)',
          '    terraform -chdir=terraform plan -no-color > plan.txt',
          '    cat plan.txt | claude --bare -p "Review this Terraform plan. Return JSON: destroys, replacements, public_exposure, missing_tags, risk (low|medium|high), summary." \\',
          '      --allowedTools "Read" \\',
          '      --permission-mode dontAsk \\',
          '      --max-turns 10 \\',
          '      --max-budget-usd 2 \\',
          '      --output-format json > claude-review.json',
          '    jq -r \'.result\' claude-review.json',
          '    echo "Claude cost (USD): $(jq -r \'.total_cost_usd\' claude-review.json)"',
          '```',
          '',
          '- `--bare`: skips hooks, plugins, MCP servers and CLAUDE.md found on the runner, so every run is the same (needs ANTHROPIC_API_KEY).',
          '- `-p`: non-interactive; the plan arrives on stdin, so Claude needs no Bash access to read it.',
          '- `--allowedTools "Read"`: only read access is pre-approved.',
          '- `--permission-mode dontAsk`: anything that would prompt is denied instead of waiting.',
          '- `--max-turns 10` / `--max-budget-usd 2`: hard caps on turns and spend for this run.',
          '- `--output-format json`: structured result with `result` and `total_cost_usd` for the log.',
          '- Never use bypass flags in CI; the key comes only from the repository secret.'
        ), { input_tokens: 350, output_tokens: 520 })],
      },
      {
        id: 'w18-t1-s4', kind: 'guide', title: 'MCP servers, plugins and cost controls for the team', minutes: 45, source: SRC.mcp,
        scenario: 'Give the team shared MCP servers for GitHub and Azure, package the kit as a plugin for other repos, and make usage visible.',
        task: [
          'Add the GitHub MCP server at project scope (prompt 1). Use a fine-grained, read-only personal access token from an environment variable; never commit it.',
          'Read Microsoft\'s Azure MCP Server get-started page, install it the way it describes, and register it with Claude Code (prompt 2). It acts with your own Azure RBAC, so use a Reader-scoped identity in a sandbox subscription.',
          'Run prompts 3 and 4 to package the kit and set up usage tracking.',
        ],
        prompts: [
          { label: '1. GitHub MCP at project scope', where: 'Claude Code', text: 'Add the GitHub remote MCP server for this repo at project scope so it is shared in .mcp.json, reading the token from an environment variable instead of a literal value. Show me the resulting .mcp.json and confirm no token is written to any file. Then list the open pull requests that touch terraform/.' },
          { label: '2. Azure MCP Server', where: 'Claude Code', text: 'I installed the Azure MCP Server following Microsoft\'s get-started guide [paste the command you used]. Register it with Claude Code at local scope (not project, because it uses my Azure login). Then, read-only: list the resource groups in subscription [sandbox name] and show which have no "owner" tag. Do not create, change or delete anything.' },
          { label: '3. Package as a plugin', where: 'Claude Code', text: 'Package our .claude kit (the three subagents, the audit hook and the tf-review skill) as a plugin named platform-kit with a .claude-plugin/plugin.json manifest, following the plugins docs. Explain how another repo enables it through .claude/settings.json and what an enabled plugin adds to every session\'s context.' },
          { label: '4. Usage and cost visibility', where: 'Claude Code', text: 'Explain, from the Claude Code costs and monitoring docs, how we should track team usage: /usage per session, workspace spend limits in the Claude Console, and OpenTelemetry export (CLAUDE_CODE_ENABLE_TELEMETRY and OTEL_METRICS_EXPORTER) to our Grafana stack. Draft the managed-settings env block for the telemetry and list the 3 metrics we should chart first.' },
        ],
        expected: ['.mcp.json with the GitHub server and no secrets in it', 'Azure MCP answering a read-only question in a sandbox', 'A platform-kit plugin another repo can enable', 'A usage-tracking plan with the telemetry settings'],
        verify: 'Check the claude mcp add syntax and scopes against the Claude Code MCP page, and the Azure MCP install steps and authentication against Microsoft Learn. Confirm with git status that no token file is staged.',
        atWork: 'Shared MCP servers and plugins mean new team members get the same tools on day one; telemetry and spend limits keep the rollout accountable.',
        checks: [
          { id: 'github', label: 'GitHub MCP shared in .mcp.json, token from the environment only', manual: true },
          { id: 'azure', label: 'Azure MCP registered at local scope and used read-only in a sandbox', manual: true },
          { id: 'plugin', label: 'Kit packaged as a plugin', manual: true },
          { id: 'usage', label: 'Usage tracking planned (spend limits and OpenTelemetry)', manual: true },
        ],
      },
    ],
  };

  /* =====================================================================
     Topic 2 — AZ-104 final cram
     ===================================================================== */
  const t2 = {
    id: 'w18-t2',
    title: 'AZ-104 · Final cram across the full skills outline',
    programmeItem: 'AZ-104 final cram (free: Microsoft Learn study guide + practice assessment)',
    blurb: 'Last review before the exam window: a timed mock across all five domains in your Claude Project, a drill on your weak areas from Week 17, and a CLI speed round.',
    outcomes: [
      'Sit a timed mock across all five domains and score it by domain',
      'Close your top weak areas with targeted drills',
      'Recall the exact az CLI for the most common admin tasks',
    ],
    concepts: [
      { t: 'The weights', d: 'Identities and governance 20–25%, storage 15–20%, compute 20–25%, networking 15–20%, monitor and maintain 10–15%. Pass mark 700.', ex: 'spend time where the weight is' },
      { t: 'Identity and governance', d: 'Entra users and groups, RBAC role assignments at scope, Azure Policy, locks, tags, budgets and management groups.', ex: 'az role assignment create --scope' },
      { t: 'Storage', d: 'Redundancy (LRS, ZRS, GRS, GZRS), SAS and stored access policies, firewalls and private endpoints, tiers, lifecycle rules, soft delete and versioning.', ex: '--sku Standard_ZRS' },
      { t: 'Compute and networking', d: 'Zones versus availability sets, scale sets, slots, containers; peering, UDRs, NSG evaluation, private endpoints, DNS and load balancers.', ex: 'peering is not transitive' },
      { t: 'Monitor and maintain', d: 'Alert rules, action groups, alert processing rules, KQL, Network Watcher, Recovery Services vault backup and Site Recovery.', ex: 'az monitor action-group create' },
      { t: 'Exam technique', d: 'Read the requirement words (minimize cost, least privilege, no downtime), eliminate options that break a constraint, and flag and move on rather than stall.', ex: '"least administrative effort"' },
    ],
    leverage: [
      { t: 'Timed mock in a Project', d: 'Your SRE Learning Project can run a full-outline mock, time-box it, score it per domain and keep the misses for a second pass.' },
      { t: 'Weak-area drills', d: 'Give Claude your missed skills and ask for five questions each with explanations, then a hands-on sandbox task per skill.' },
      { t: 'CLI from memory', d: 'Ask Claude for a task list, write the commands yourself, then have Claude mark them and explain each wrong flag.' },
    ],
    sources: [SRC.az104, SRC.az104practice, SRC.az104cert],
    quiz: [
      { q: 'Which domain carries 10–15% of the exam?', options: ['Compute', 'Monitor and maintain Azure resources', 'Storage'], a: 1, why: 'Monitor and maintain is 10–15%; compute and identities are 20–25%, storage and networking 15–20%.' },
      { q: 'A question says "minimize administrative effort". What does that usually rule out?', options: ['Built-in, managed features', 'Custom scripts and manual per-resource work', 'Azure Policy'], a: 1, why: 'Prefer built-in, managed or policy-driven options over custom scripts when effort is the constraint.' },
    ],
    steps: [
      {
        id: 'w18-t2-s1', kind: 'guide', title: 'Timed mock and weak-area drill in your Claude Project', minutes: 90, source: SRC.az104,
        scenario: 'Run a timed mock across the whole outline with your SRE Learning Project, then drill the weak areas from Week 17 until you answer them correctly twice.',
        task: [
          'Set a 45-minute timer and run prompt 1 in your SRE Learning Project. No notes, no portal.',
          'Run prompt 2 with your score and misses, then prompt 3 for each weak area.',
          'Retake the free Microsoft practice assessment and compare per-domain results with Week 17.',
        ],
        prompts: [
          { label: 'Timed mock', where: 'claude.ai', text: 'Run a timed AZ-104 mock: 30 questions across all five domains of the skills outline in this Project, weighted like the exam (identities 7, storage 5, compute 7, networking 6, monitor and maintain 5). One question at a time, 4 options, no answers until the end. Then give my score per domain and list every miss with the correct answer and the rule behind it.' },
          { label: 'Rank the gaps', where: 'claude.ai', text: 'My mock results: [paste]. My Week 17 weak areas were: [paste]. Rank my 5 weakest skills now, say which improved, and estimate which domain is most likely to cost me the pass mark.' },
          { label: 'Drill one weak area', where: 'claude.ai', text: 'Drill me on [skill]: 5 harder scenario questions, one at a time. After each answer, explain the trap. Finish with one sandbox task (az CLI, under 15 minutes, with cleanup commands) that proves the concept.' },
        ],
        expected: ['A per-domain score from a timed 30-question mock', 'A ranked list of remaining weak skills', 'Each weak skill drilled and one sandbox task done per skill'],
        verify: 'For every rule you learned from a miss, open the Microsoft Learn page and confirm it, and cross-check the practice assessment results with the mock.',
        atWork: 'Timed practice plus targeted drills is also how you prepare for on-call: find the gaps before the incident finds them for you.',
        checks: [
          { id: 'mock', label: 'I completed the timed 30-question mock', manual: true },
          { id: 'drill', label: 'I drilled my top weak areas', manual: true },
          { id: 'practice', label: 'I retook the Microsoft practice assessment and compared results', manual: true },
        ],
      },
      {
        id: 'w18-t2-s2', title: 'CLI speed round across the domains', minutes: 6, source: SRC.az104,
        scenario: 'Five common admin tasks, one per domain. Claude writes the exact az CLI; the checks look for the right command and flags. Try writing them yourself first.',
        task: ['Write the five commands on paper.', 'Click <b>Run</b> and compare flag by flag.', 'Run them in a sandbox subscription and clean up afterwards.'],
        atWork: 'These are the commands you will script most often. Knowing the flags by heart makes reviewing Claude\'s output fast.',
        hint: 'role assignment create · storage account create --sku · vm create --zone · vnet peering create · monitor action-group create --action email',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'low' },
          system: 'You are an AZ-104 coach. Give exact Azure CLI in a bash block, one command per task, then one line per command on the key flag.',
          messages: user(L(
            '1. Assign the Reader role to Entra group object id 11111111-2222-3333-4444-555555555555 at the scope of resource group rg-shop-prod (subscription id 00000000-0000-0000-0000-000000000000).',
            '2. Create StorageV2 account stshopprod01 in rg-shop-prod, westeurope, zone-redundant, with blob public access disabled and minimum TLS 1.2.',
            '3. Create Ubuntu VM vm-app-02 in rg-shop-prod in availability zone 2, size Standard_D2s_v5, with SSH keys.',
            '4. Peer vnet-hub to vnet-spoke (both in rg-net) with VNet access allowed.',
            '5. Create action group ag-oncall in rg-ops, short name oncall, that emails oncall@contoso.example.'
          )),
        },
        checks: [
          { id: 'rbac', label: 'az role assignment create with Reader at the RG scope', test: (c, h) => /az role assignment create/.test(h.text(c)) && /--role\s+"?Reader/.test(h.text(c)) && /--scope\s+"?\/subscriptions\/0{8}-0{4}-0{4}-0{4}-0{12}\/resourceGroups\/rg-shop-prod/.test(h.text(c)) },
          { id: 'storage', label: 'Storage account with Standard_ZRS, public access off, TLS1_2', test: (c, h) => /az storage account create/.test(h.text(c)) && /Standard_ZRS/.test(h.text(c)) && /--allow-blob-public-access\s+false/.test(h.text(c)) && /TLS1_2/.test(h.text(c)) },
          { id: 'vm', label: 'az vm create with --zone 2', test: (c, h) => /az vm create/.test(h.text(c)) && /--zone\s+2/.test(h.text(c)) },
          { id: 'peer', label: 'az network vnet peering create with --allow-vnet-access', test: (c, h) => /az network vnet peering create/.test(h.text(c)) && /--allow-vnet-access/.test(h.text(c)) },
          { id: 'ag', label: 'az monitor action-group create with an email action', test: (c, h) => /az monitor action-group create/.test(h.text(c)) && /--action\s+email/.test(h.text(c)) && /--short-name\s+oncall/.test(h.text(c)) },
        ],
        sim: [textTurn(L(
          '```bash',
          '# 1. Identities and governance: RBAC at resource-group scope',
          'az role assignment create --assignee 11111111-2222-3333-4444-555555555555 --role "Reader" \\',
          '  --scope /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-shop-prod',
          '',
          '# 2. Storage: zone-redundant, no anonymous blob access, TLS 1.2',
          'az storage account create -n stshopprod01 -g rg-shop-prod -l westeurope --kind StorageV2 \\',
          '  --sku Standard_ZRS --allow-blob-public-access false --min-tls-version TLS1_2',
          '',
          '# 3. Compute: VM pinned to availability zone 2',
          'az vm create -g rg-shop-prod -n vm-app-02 --image Ubuntu2204 --size Standard_D2s_v5 \\',
          '  --zone 2 --admin-username azureuser --generate-ssh-keys',
          '',
          '# 4. Networking: hub-to-spoke peering (create the reverse peering too)',
          'az network vnet peering create -g rg-net -n hub-to-spoke --vnet-name vnet-hub --remote-vnet vnet-spoke --allow-vnet-access',
          '',
          '# 5. Monitor: action group with an email receiver',
          'az monitor action-group create -g rg-ops -n ag-oncall --short-name oncall --action email oncall oncall@contoso.example',
          '```',
          '- `--scope`: the assignment applies only to rg-shop-prod and its resources',
          '- `--sku Standard_ZRS`: copies across three zones in the region',
          '- `--zone 2`: places the VM in zone 2 (pair with a VM in another zone for resilience)',
          '- `--allow-vnet-access`: lets the VNets reach each other; peering is one-way until you add spoke-to-hub',
          '- `--action email NAME ADDRESS`: adds an email receiver to the group'
        ), { input_tokens: 300, output_tokens: 480 })],
      },
    ],
  };

  /* =====================================================================
     Topic 3 — Azure Cost Management and the FinOps Framework
     ===================================================================== */
  const t3 = {
    id: 'w18-t3',
    title: 'Azure Cost Management and the FinOps Framework',
    programmeItem: 'Azure Cost Management and the FinOps Framework — budgets, anomaly alerts, tagging for showback (free: Microsoft Learn + FinOps Foundation framework)',
    blurb: 'Make cloud cost an operational signal: budgets with actual and forecast alerts, anomaly alerts per subscription, and tags that let every team see its own spend (showback), framed by the FinOps Framework.',
    outcomes: [
      'Describe the FinOps Framework phases and the capabilities used this week (Allocation, Budgeting, Anomaly Management)',
      'Deploy a budget with actual and forecasted thresholds as code, and set up an anomaly alert',
      'Enforce and inherit cost tags with Azure Policy for showback',
    ],
    concepts: [
      { t: 'FinOps Framework', d: 'The FinOps Foundation framework has phases (Inform, Optimize, Operate), domains and capabilities, personas, and a Crawl–Walk–Run maturity model. This week uses Allocation, Budgeting and Anomaly Management.', ex: 'Inform → Optimize → Operate' },
      { t: 'Budgets', d: 'A budget tracks cost at a scope over a time grain and sends notifications at thresholds (actual or forecasted, as a % of the amount). Budgets do not stop resources or spending.', ex: '80% actual · 100% forecasted' },
      { t: 'Budgets as code', d: 'Microsoft.Consumption/budgets in Bicep supports notifications with thresholds, emails, roles and action groups. The az consumption budget create command (preview) sets amount and dates but not notifications.', ex: 'az deployment sub create --template-file budget.bicep' },
      { t: 'Anomaly alerts', d: 'Cost anomaly detection runs daily per subscription against the last 60 days. Anomaly alert rules are created in Cost alerts at subscription scope and email a summary when an anomaly is found.', ex: 'Cost alerts → + Add → Anomaly' },
      { t: 'Tags for showback', d: 'Showback shows each team its costs without billing them. Tags such as costcenter and owner make it possible: Azure Policy requires or inherits them; Cost Management tag inheritance applies RG and subscription tags to usage records.', ex: 'Inherit a tag from the resource group if missing' },
    ],
    leverage: [
      { t: 'Budgets and policies as code', d: 'Ask Claude for the Bicep budget and policy assignments for every subscription, reviewed in a pull request, instead of clicking them into the portal.' },
      { t: 'Explain the anomaly', d: 'When an anomaly alert fires, paste the cost export for the day into Claude for Excel and ask which resources and meters changed, with cell citations.' },
      { t: 'Showback packs', d: 'Have Claude build a monthly cost-by-costcenter table and a one-page summary per team from the cost export, flagging untagged spend.' },
    ],
    sources: [SRC.finops, SRC.finopsAlloc, SRC.finopsBudget, SRC.finopsAnomaly, SRC.budgetsTut, SRC.budgetBicep, SRC.budgetCli, SRC.anomaly, SRC.tagInherit, SRC.tagPolicies],
    quiz: [
      { q: 'Your budget reaches 100%. What happens to your VMs?', options: ['They are stopped', 'Nothing: budgets only send notifications', 'They are resized'], a: 1, why: 'Budgets never stop resources or consumption; use action groups for automated responses.' },
      { q: 'Which effect lets a tag policy fix existing resources through a remediation task?', options: ['deny', 'modify', 'audit'], a: 1, why: 'Modify policies (for example "Inherit a tag from the resource group if missing") can remediate existing resources.' },
      { q: 'At which scope do you create a cost anomaly alert rule?', options: ['Resource group', 'Subscription', 'Management group only'], a: 1, why: 'Anomaly alert rules are created at subscription scope.' },
    ],
    steps: [
      {
        id: 'w18-t3-s1', kind: 'guide', title: 'Showback in Excel and an anomaly alert in the portal', minutes: 45, source: SRC.anomaly,
        scenario: 'Use a real (or the course\'s synthetic) Azure cost export to build a showback view by cost center, then set up anomaly detection for the subscription.',
        task: [
          'Export last month\'s costs from Cost analysis (or use the Week 4 synthetic billing CSV). Remove anything you would not share.',
          'In Claude for Excel run prompt 1, then prompt 2.',
          'In the Azure portal: Cost Management → Cost alerts → + Add → Alert type Anomaly, at subscription scope. Use prompt 3 in claude.ai to decide who receives it.',
        ],
        prompts: [
          { label: 'Showback by cost center', where: 'Claude for Excel', text: 'This sheet is our monthly Azure cost export. Build a showback table on a new sheet: cost by the costcenter tag and by ServiceName, with an "Untagged" row for empty tags, and each cost center\'s share of total. Cite the cells behind every total and highlight untagged spend over 5% of the total.' },
          { label: 'Find the day that changed', where: 'Claude for Excel', text: 'Using the daily rows, find the day with the largest increase against the previous 7-day average. Which resource groups, resources and meters explain it? Cite the cells and give a one-paragraph explanation I can send to the owning team.' },
          { label: 'Alert routing', where: 'claude.ai', text: 'We are creating a Cost Management anomaly alert on subscription sub-shop-prod. Our teams: platform (owns AKS and networking), data (owns SQL and storage), finance partner. Propose recipients, a triage runbook of 5 steps for when the email arrives, and what to record so we can measure false positives. Remember anomaly alerts are emailed once at detection.' },
        ],
        expected: ['A showback table by cost center with untagged spend flagged', 'The day and resources behind the biggest change, with citations', 'An anomaly alert rule at subscription scope with agreed recipients'],
        verify: 'Check the showback total against the export\'s cost column total, and confirm the anomaly alert appears under Alert rules at subscription scope as described on Microsoft Learn.',
        atWork: 'Monthly showback plus daily anomaly alerts is the FinOps "Inform" phase in practice: teams see their own spend and surprises are caught within a day or two.',
        checks: [
          { id: 'showback', label: 'Showback table built and its total checked against the export', manual: true },
          { id: 'change', label: 'Biggest daily change explained with cell citations', manual: true },
          { id: 'anomaly', label: 'Anomaly alert rule created at subscription scope', manual: true },
        ],
      },
      {
        id: 'w18-t3-s2', title: 'Budget with actual and forecasted alerts, as code', minutes: 8, source: SRC.budgetBicep,
        scenario: 'Finance wants a monthly budget of 8,000 on subscription sub-shop-prod, an email at 80% actual spend, and an action-group alert when the forecast passes 100%. Ask Claude for code you can deploy and review.',
        task: ['Click <b>Run</b>.', 'Check how the thresholds are expressed and which deployment command is used.', 'Deploy it to a sandbox subscription and confirm it with az consumption budget list.'],
        atWork: 'Budgets in Bicep live next to the subscription\'s other guardrails, go through review, and are recreated identically for every new subscription.',
        hint: 'The preview az consumption budget create has no notification parameter; the Microsoft.Consumption/budgets resource does.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' },
          system: 'You are an Azure FinOps engineer. Use only documented resource types, properties and az CLI commands. Say plainly when a CLI command cannot do something.',
          messages: user('Create a monthly cost budget "bud-shop-prod-monthly" of 8000 for the whole subscription, starting 2026-10-01. Notify finops@contoso.example at 80% of actual cost, and the action group /subscriptions/<sub-id>/resourceGroups/rg-ops/providers/microsoft.insights/actionGroups/ag-finops when forecasted cost reaches 100%. Give the Bicep and the az command to deploy it, and say whether az consumption budget create alone can do this. Does the budget stop spending at 100%?'),
        },
        checks: [
          { id: 'type', label: 'Uses the Microsoft.Consumption/budgets resource at subscription scope', test: (c, h) => /Microsoft\.Consumption\/budgets@/.test(h.text(c)) && /targetScope\s*=\s*'subscription'/.test(h.text(c)) },
          { id: 'actual', label: '80% actual-cost notification to the email', test: (c, h) => /threshold:\s*80/.test(h.text(c)) && /finops@contoso\.example/.test(h.text(c)) },
          { id: 'forecast', label: '100% forecasted notification to the action group', test: (c, h) => /threshold:\s*100/.test(h.text(c)) && /thresholdType:\s*'Forecasted'/.test(h.text(c)) && /contactGroups/.test(h.text(c)) },
          { id: 'deploy', label: 'Deploys with az deployment sub create', test: (c, h) => /az deployment sub create/.test(h.text(c)) },
          { id: 'cli', label: 'Says az consumption budget create does not set notifications', test: (c, h) => /az consumption budget create/.test(h.text(c)) && /(no|not|doesn't|does not|cannot|can't)[^.\n]*notification/i.test(h.text(c)) },
          { id: 'nostop', label: 'Says the budget does not stop spending', test: (c, h) => /(not|never|doesn't|does not)[^.\n]*(stop|shut|block)/i.test(h.text(c)) },
        ],
        sim: [textTurn(L(
          '```bicep',
          "targetScope = 'subscription'",
          '',
          "param startDate string = '2026-10-01'",
          "param endDate string = '2027-09-30'",
          'param actionGroupId string',
          '',
          "resource budget 'Microsoft.Consumption/budgets@2023-11-01' = {",
          "  name: 'bud-shop-prod-monthly'",
          '  properties: {',
          "    category: 'Cost'",
          '    amount: 8000',
          "    timeGrain: 'Monthly'",
          '    timePeriod: {',
          '      startDate: startDate',
          '      endDate: endDate',
          '    }',
          '    notifications: {',
          '      Actual80: {',
          '        enabled: true',
          "        operator: 'GreaterThanOrEqualTo'",
          '        threshold: 80',
          "        thresholdType: 'Actual'",
          "        contactEmails: [ 'finops@contoso.example' ]",
          '      }',
          '      Forecast100: {',
          '        enabled: true',
          "        operator: 'GreaterThanOrEqualTo'",
          '        threshold: 100',
          "        thresholdType: 'Forecasted'",
          '        contactGroups: [ actionGroupId ]',
          '      }',
          '    }',
          '  }',
          '}',
          '```',
          '',
          '```bash',
          'az deployment sub create --name bud-shop-prod --location westeurope --template-file budget.bicep \\',
          '  --parameters actionGroupId=/subscriptions/<sub-id>/resourceGroups/rg-ops/providers/microsoft.insights/actionGroups/ag-finops',
          'az consumption budget list --output table   # verify',
          '```',
          '',
          '- Thresholds are **percentages of the amount**; the start date must be the first of a month.',
          '- `az consumption budget create` (preview) sets the amount, time grain and dates but has **no notification parameter**, so it cannot add these alerts on its own. Use the Bicep resource (or the portal).',
          '- At 100% the budget **does not stop** resources or spending: it only notifies. Any automated response must come from the action group.'
        ), { input_tokens: 350, output_tokens: 620 })],
      },
      {
        id: 'w18-t3-s3', title: 'Showback tagging policy with az CLI', minutes: 8, source: SRC.tagPolicies,
        scenario: 'For showback every resource needs a <code>costcenter</code> tag. Resource groups must have it, and resources should inherit it from their resource group if missing, including existing ones.',
        task: ['Click <b>Run</b>.', 'Check the built-in policy names and effects against the Microsoft tag policies page.', 'Try it in a sandbox subscription: create an untagged resource and watch it inherit the tag.'],
        atWork: 'Deny on resource groups plus modify-inherit on resources is a simple, low-friction pattern: teams tag once per resource group and showback works for everything inside.',
        hint: 'Built-ins: "Require a tag on resource groups" (deny) and "Inherit a tag from the resource group if missing" (modify: needs a managed identity, a location and a remediation task).',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' },
          system: 'You are an Azure governance engineer. Use built-in policy definitions (name them and give their definition IDs) and documented az CLI flags.',
          messages: user('Subscription sub-shop-prod (id 00000000-0000-0000-0000-000000000000). Write the az CLI to: 1) require a costcenter tag on every resource group, 2) make resources inherit costcenter from their resource group when missing, and remediate existing resources. Explain what each effect does and why the second assignment needs an identity.'),
        },
        checks: [
          { id: 'assign', label: 'Uses az policy assignment create at subscription scope', test: (c, h) => /az policy assignment create/.test(h.text(c)) && /--scope\s+"?\/subscriptions\/0{8}-0{4}-0{4}-0{4}-0{12}/.test(h.text(c)) },
          { id: 'require', label: 'Assigns "Require a tag on resource groups" (96670d01...)', test: (c, h) => /96670d01-0a4d-4649-9c89-2d3abc0a5025/.test(h.text(c)) },
          { id: 'inherit', label: 'Assigns "Inherit a tag from the resource group if missing" (ea3f2387...)', test: (c, h) => /ea3f2387-9b95-492a-a190-fcdc54f7b070/.test(h.text(c)) },
          { id: 'identity', label: 'Modify assignment has a managed identity and location', test: (c, h) => /--mi-system-assigned/.test(h.text(c)) && /--location\s+\w+/.test(h.text(c)) },
          { id: 'remediate', label: 'Creates a remediation task for existing resources', test: (c, h) => /az policy remediation create/.test(h.text(c)) },
          { id: 'param', label: 'Passes tagName costcenter', test: (c, h) => /tagName/.test(h.text(c)) && /costcenter/.test(h.text(c)) },
        ],
        sim: [textTurn(L(
          '```bash',
          'SUB=/subscriptions/00000000-0000-0000-0000-000000000000',
          '',
          '# 1. Deny: every resource group must carry costcenter ("Require a tag on resource groups")',
          'az policy assignment create --name require-rg-costcenter --display-name "Require costcenter on resource groups" \\',
          '  --scope /subscriptions/00000000-0000-0000-0000-000000000000 --policy 96670d01-0a4d-4649-9c89-2d3abc0a5025 \\',
          '  --params \'{ "tagName": { "value": "costcenter" } }\'',
          '',
          '# 2. Modify: resources inherit costcenter from their RG when missing ("Inherit a tag from the resource group if missing")',
          'az policy assignment create --name inherit-costcenter --display-name "Inherit costcenter from resource group" \\',
          '  --scope /subscriptions/00000000-0000-0000-0000-000000000000 --policy ea3f2387-9b95-492a-a190-fcdc54f7b070 \\',
          '  --params \'{ "tagName": { "value": "costcenter" } }\' \\',
          '  --mi-system-assigned --location westeurope --identity-scope $SUB --role Contributor',
          '',
          '# 3. Fix existing resources',
          'az policy remediation create --name remediate-costcenter --policy-assignment inherit-costcenter',
          '```',
          '',
          '- **deny** (assignment 1) blocks creating or updating a resource group without the tag.',
          '- **modify** (assignment 2) adds the tag from the parent resource group at create or update time. It changes resources, so the assignment needs a **managed identity** (and a location for it) with a role that can write tags; the remediation task uses that identity to update resources that already exist.',
          '- For cost reports, you can also turn on Cost Management **tag inheritance**, which applies RG and subscription tags to usage records without changing the resources.'
        ), { input_tokens: 300, output_tokens: 560 })],
      },
    ],
  };

  /* =====================================================================
     Topic 4 — Apply: measure alert volume and toil, publish the numbers
     ===================================================================== */
  const MEASURE_SCHEMA = obj({
    period_days: I,
    rules: arr(obj({ rule: S, alerts_before: I, alerts_after: I, alert_reduction_pct: N, toil_before_h: N, toil_after_h: N })),
    totals: obj({ alerts_before: I, alerts_after: I, alert_reduction_pct: N, toil_before_h: N, toil_after_h: N, toil_saved_h: N, toil_reduction_pct: N }),
    agent: obj({ runs: I, escalated: I, writes_approved: I, irreversible_without_approval: I }),
    headline: S,
    caveats: arr(S),
  });
  const ruleOf = (j, name) => j && (j.rules || []).find((r) => r.rule === name);

  const t4 = {
    id: 'w18-t4',
    title: 'Apply: measure alert volume and toil before and after, and publish',
    programmeItem: 'Apply task · Measure alert volume and toil before and after. Publish the numbers.',
    blurb: 'The agent is live. Now prove what it changed: alert volume and toil hours per rule, 30 days before and after, with the agent\'s own activity and the caveats, published where the team and reviewers can see them.',
    outcomes: [
      'Compute per-rule and total deltas in alerts and toil from raw data, checked by code',
      'Report the agent\'s safety record: escalations, approvals, irreversible actions without approval',
      'Publish the numbers with honest caveats as evidence for the "Agent in production" milestone',
    ],
    concepts: [
      { t: 'Per rule, then total', d: 'Totals hide where the change came from. Report each alert rule, then the sum.', ex: 'cpu-pressure −70%, cert-expiry −33%' },
      { t: 'Same windows', d: 'Equal 30-day windows either side of go-live, the go-live day excluded.', ex: '30 d before vs 30 d after' },
      { t: 'Attribute carefully', d: 'Other changes in the window (a retuned rule, traffic growth) also move the numbers. Name them as caveats rather than claiming everything for the agent.', ex: 'pbs rule retuned in August' },
      { t: 'Safety record', d: 'The milestone needs the gate to have held: count escalations, approved writes and irreversible actions taken without approval (the target is zero).', ex: 'irreversible_without_approval = 0' },
      { t: 'Publish', d: 'Numbers nobody sees change nothing. Publish a short page in the team space with the table, the chart and the caveats, and link it in the milestone evidence.', ex: 'wiki page + Grafana panel' },
    ],
    leverage: [
      { t: 'Claude computes, checks confirm', d: 'Ask Claude for the JSON from the raw CSV and let code verify every delta before anything is published.' },
      { t: 'Write for two audiences', d: 'Ask Claude for a 5-line summary for leadership and a detailed table for engineers from the same data.' },
      { t: 'Keep the series going', d: 'Have Claude Code write a scheduled script that recomputes the numbers monthly from Grafana or Log Analytics exports.' },
    ],
    sources: [SRC.toilWb, SRC.sloAlerts, SRC.monitoring],
    quiz: [
      { q: 'Alerts fell 62% after the agent went live, but one rule was also retuned in the same month. What do you publish?', options: ['62%, all due to the agent', 'The numbers per rule, with the retune named as a caveat', 'Nothing until next quarter'], a: 1, why: 'Per-rule numbers plus caveats let readers see what the agent can and cannot take credit for.' },
      { q: 'Which number must be zero for the "Agent in production" milestone?', options: ['Escalations', 'Irreversible actions taken without approval', 'Agent runs'], a: 1, why: 'Escalations are healthy; irreversible actions without a human gate are not allowed.' },
    ],
    steps: [
      {
        id: 'w18-t4-s1', title: 'Compute the before/after numbers', minutes: 8, source: SRC.toilWb, files: ['W18_AFTER_LAB'],
        scenario: 'Thirty days before and after the triage agent went live, per alert rule. Turn the raw data into the numbers you will publish.',
        task: ['Read <code>oncall-before-after-30d.csv</code> and total the columns yourself.', 'Click <b>Run</b>.', 'The checks recompute every delta to one decimal and check the safety record.'],
        atWork: 'Always publish numbers that code has recomputed. One wrong percentage in a published report costs more trust than the whole project earned.',
        hint: 'Totals: 312 → 118 alerts (−62.2%), 41.5 → 14.0 h (27.5 h saved, −66.3%).',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium', format: jsonFormat(MEASURE_SCHEMA) },
          system: 'You report reliability outcomes. Percentages are reductions relative to the before value, rounded to 1 decimal. Name every confounding change as a caveat.',
          messages: user(L('<data>', '{{W18_AFTER_LAB}}', '</data>', 'Compute the per-rule and total before/after numbers, the agent\'s safety record, a one-sentence headline and the caveats.')),
        },
        checks: [
          { id: 'totals', label: 'Totals: 312 → 118 alerts, 62.2% reduction', test: (c, h) => { const j = h.json(c); return !!j && j.totals.alerts_before === 312 && j.totals.alerts_after === 118 && h.near(String(j.totals.alert_reduction_pct), 62.2, 0.1); } },
          { id: 'toil', label: 'Toil: 41.5 → 14.0 h, 27.5 h saved, 66.3% reduction', test: (c, h) => { const j = h.json(c); return !!j && h.near(String(j.totals.toil_before_h), 41.5, 0.05) && h.near(String(j.totals.toil_after_h), 14, 0.05) && h.near(String(j.totals.toil_saved_h), 27.5, 0.05) && h.near(String(j.totals.toil_reduction_pct), 66.3, 0.1); } },
          { id: 'rules', label: 'Per-rule reductions: cpu 70.0%, backup 58.3%, cert 33.3%', test: (c, h) => { const j = h.json(c); const a = ruleOf(j, 'aks-node-cpu-pressure'), b = ruleOf(j, 'pbs-backup-job-failed'), k = ruleOf(j, 'kv-cert-expiry'); return !!(a && b && k) && h.near(String(a.alert_reduction_pct), 70, 0.1) && h.near(String(b.alert_reduction_pct), 58.3, 0.1) && h.near(String(k.alert_reduction_pct), 33.3, 0.1); } },
          { id: 'safety', label: 'Safety record: 23 escalations, 9 approved writes, 0 irreversible without approval', test: (c, h) => { const j = h.json(c); return !!j && j.agent.escalated === 23 && j.agent.writes_approved === 9 && j.agent.irreversible_without_approval === 0; } },
          { id: 'caveats', label: 'Caveats name the August pbs retune and the traffic change', test: (c, h) => { const j = h.json(c); const t = j ? j.caveats.join(' ') : ''; return /pbs|retun/i.test(t) && /traffic/i.test(t); } },
        ],
        sim: [jsonTurn({
          period_days: 30,
          rules: [
            { rule: 'aks-node-cpu-pressure', alerts_before: 180, alerts_after: 54, alert_reduction_pct: 70.0, toil_before_h: 21.0, toil_after_h: 6.0 },
            { rule: 'pbs-backup-job-failed', alerts_before: 96, alerts_after: 40, alert_reduction_pct: 58.3, toil_before_h: 15.0, toil_after_h: 5.5 },
            { rule: 'kv-cert-expiry', alerts_before: 36, alerts_after: 24, alert_reduction_pct: 33.3, toil_before_h: 5.5, toil_after_h: 2.5 },
          ],
          totals: { alerts_before: 312, alerts_after: 118, alert_reduction_pct: 62.2, toil_before_h: 41.5, toil_after_h: 14.0, toil_saved_h: 27.5, toil_reduction_pct: 66.3 },
          agent: { runs: 94, escalated: 23, writes_approved: 9, irreversible_without_approval: 0 },
          headline: 'In the 30 days after the triage agent went live, on-call alerts fell 62.2% (312 to 118) and toil fell 27.5 hours (66.3%), with no irreversible action taken without human approval.',
          caveats: [
            'The pbs-backup-job-failed rule was also retuned in August (Week 17 Outcome Record), so part of its 58.3% drop is not the agent\'s.',
            'Traffic was 6% higher in the after window, which, if anything, understates the improvement.',
            'Toil hours are on-call estimates; one 30-day window each side is a short series, so keep measuring monthly.',
          ],
        }, { input_tokens: 700, output_tokens: 600 })],
      },
      {
        id: 'w18-t4-s2', kind: 'guide', title: 'Publish the numbers and assemble the milestone evidence', minutes: 60, source: SRC.sloAlerts,
        scenario: 'Measure your own agent\'s before and after from real data, publish it for the team, and put together the "Agent in production" evidence pack for the AI Delivery Engineer.',
        task: [
          'Export 30 days before and after your go-live from Grafana, Elastic or Log Analytics (alerts per rule, on-call time). Remove hostnames and customer data you would not share.',
          'Run prompt 1 in Claude for Excel, then prompts 2 and 3 in claude.ai.',
          'Publish the page in the team space and send the evidence pack (prompt 3) to the reviewer.',
        ],
        prompts: [
          { label: '1. Build the table and chart', where: 'Claude for Excel', text: 'This sheet has alert history and on-call durations. Build a table per alert rule for [before window] and [after window]: alerts, toil hours (duration in hours), and reduction %. Add totals and a clustered bar chart of alerts per rule, before vs after. Cite the cells behind each total.' },
          { label: '2. Write the published page', where: 'claude.ai', text: 'Write a one-page team update from these numbers: [paste table and agent activity]. Sections: Headline (one sentence), Numbers (the table), What the agent does and does not do (read-only triage, human gate on writes), Safety record (escalations, approved writes, irreversible actions without approval), Caveats (other changes, traffic, estimates), Next steps. Plain English, under 350 words. Numbers exactly as given.' },
          { label: '3. Milestone evidence pack', where: 'claude.ai', text: 'Assemble the evidence for milestone EV-RE-07 "Agent in production" from these inputs: [paste docs/action-set.md, go-live-evidence.md summary, escalation test ids, the published numbers]. Structure: 1) Enumerated action set with gates, 2) Human gate on anything irreversible, with the test results, 3) Tested escalation path with who acknowledged it and when, 4) Before/after numbers and link to the published page. Mark anything missing as OPEN.' },
        ],
        expected: ['A per-rule before/after table and chart with cited totals', 'A published team page with headline, numbers, safety record and caveats', 'An EV-RE-07 evidence pack with no OPEN items'],
        verify: 'Recompute the totals and percentages yourself from the spreadsheet before publishing, and check the safety record against the audit log rather than the agent\'s own summary.',
        atWork: 'Publishing before/after numbers is how an agent earns its place: the team sees the toil it removed and the reviewer sees the gate held.',
        checks: [
          { id: 'measured', label: 'I measured alerts and toil per rule, 30 days before and after, from real (redacted) data', manual: true },
          { id: 'published', label: 'I published the numbers with caveats where the team can see them', manual: true },
          { id: 'actions', label: 'Evidence: enumerated action set with gates', manual: true },
          { id: 'gate', label: 'Evidence: human gate on anything irreversible, with zero irreversible actions without approval', manual: true },
          { id: 'escalation', label: 'Evidence: escalation path tested and acknowledged (milestone EV-RE-07)', manual: true },
        ],
      },
    ],
  };

  PL.addWeek({
    week: 18,
    title: 'Claude Code at team scale, FinOps & measured outcomes',
    stream: 'agent',
    hours: 9,
    focus: 'Run Claude Code across a team (shared .claude/ settings and hooks, subagents, MCP servers, plugins, headless CI with cost caps), cram for AZ-104, put budgets, anomaly alerts and showback tags in place, and publish the before/after numbers for your production agent.',
    apply: 'Measure alert volume and toil before and after. Publish the numbers.',
    milestone: { id: 'EV-RE-07', title: 'Agent in production', reviewer: 'AI Delivery Engineer', passes: 'Enumerated action set, human gate on anything irreversible, tested escalation path.' },
    topics: [t1, t2, t3, t4],
  });
})();
