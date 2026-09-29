/* Week 15 · Agentification: multi-agent systems, advanced Claude Code (hooks, subagents, headless),
   error budget policy, and the Apply task: an enumerated action set with a human gate for the ops agent.
   Structure follows week01.js. Run `node tests/validate.js --week 15 --allow-missing` after editing. */
(function () {
  'use strict';
  const PL = window.PL;
  const { ADAPTIVE, user, L, obj, arr, en, S, N, B, I, jsonFormat, textTurn, jsonTurn, think } = PL.B;

  const SRC = {
    multiAgent: { label: 'Anthropic engineering · How we built our multi-agent research system', url: 'https://www.anthropic.com/engineering/multi-agent-research-system' },
    effectiveAgents: { label: 'Anthropic engineering · Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents' },
    subagentsCourse: { label: 'Anthropic Academy · Introduction to subagents (free)', url: 'https://anthropic.skilljar.com/introduction-to-subagents' },
    subagents: { label: 'Claude Code docs · Subagents', url: 'https://code.claude.com/docs/en/sub-agents' },
    hooks: { label: 'Claude Code docs · Hooks reference', url: 'https://code.claude.com/docs/en/hooks' },
    hooksGuide: { label: 'Claude Code docs · Hooks guide', url: 'https://code.claude.com/docs/en/hooks-guide' },
    headless: { label: 'Claude Code docs · Run Claude Code programmatically (headless)', url: 'https://code.claude.com/docs/en/headless' },
    settings: { label: 'Claude Code docs · Settings', url: 'https://code.claude.com/docs/en/settings' },
    permissions: { label: 'Claude Code docs · Permissions', url: 'https://code.claude.com/docs/en/permissions' },
    ebPolicy: { label: 'Google SRE Workbook · Example error budget policy', url: 'https://sre.google/workbook/error-budget-policy/' },
    implSlo: { label: 'Google SRE Workbook · Implementing SLOs', url: 'https://sre.google/workbook/implementing-slos/' },
    toolUse: { label: 'Claude API docs · Tool use overview', url: 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview' },
  };

  /* Extract the first fenced block of a given language from Claude's answer. */
  const fenced = (text, lang) => { const m = new RegExp('```' + lang + '[^\\n]*\\n([\\s\\S]*?)```', 'i').exec(text || ''); return m ? m[1] : ''; };
  const parseJson = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };

  /* ---- lab files ---- */
  PL.PLACEHOLDERS.W15_TASKS = L(
    'T1  Overnight, 40 Terraform workspaces (one per customer landing zone) report drift. For each, find what changed',
    '    (terraform plan -refresh-only, read-only) and classify it: portal hotfix, provider upgrade, or unknown.',
    'T2  One unit test in modules/naming/test_naming.py fails after a rename. Fix it.',
    'T3  Every month: pull the Azure cost export, flag services that grew more than 20%, and draft the FinOps summary',
    '    email from a fixed template. Always the same three steps, in the same order.',
    'T4  Research question: compare Grafana Loki and Elastic for 90-day log retention across five criteria',
    '    (cost, query language, retention tiers, RBAC, OpenTelemetry support), each from the vendor docs.',
    'T5  Rotate the payments-api database secret in Key Vault kv-pay-prod and restart the app. Each step depends on',
    '    the previous one, and the rotation cannot be undone once the old secret is disabled.'
  );
  PL.FILE_LABELS.W15_TASKS = 'agent-candidate-tasks.txt';

  PL.PLACEHOLDERS.W15_SLO_LOG = L(
    'Service: checkout (the W11 SLO)',
    'SLI: proportion of successful checkout requests, measured at the load balancer',
    'SLO: 99.9% over a rolling four-week (28-day) window',
    'Traffic is roughly uniform, so treat budget in minutes of full outage.',
    '',
    'Incidents in the current window:',
    '  INC-2291  2026-09-03  full outage of checkout      9 minutes',
    '  INC-2310  2026-09-12  full outage of checkout      14 minutes',
    '  INC-2324  2026-09-21  full outage of checkout      6 minutes',
    '',
    'Error budget policy (adapted from the SRE Workbook example):',
    '  - If the budget for the preceding four-week window is exhausted: freeze changes and releases except P0 and security fixes.',
    '  - If a single incident consumes more than 20% of the four-week budget: postmortem with at least one P0 action item.'
  );
  PL.FILE_LABELS.W15_SLO_LOG = 'checkout-error-budget.txt';

  PL.PLACEHOLDERS.W15_CANDIDATE_ACTIONS = L(
    'Candidate actions for the ops agent (namespace shop on AKS, and the platform Terraform repo):',
    '  1. kubectl_get: list deployments, pods, nodes or events (read-only)',
    '  2. get_metrics: 5-minute CPU/memory for a pod or node (read-only)',
    '  3. scale_deployment: change replica count, 1-10 (tool guardrail rejects more than 10)',
    '  4. rollout restart of a deployment',
    '  5. rollback a deployment to its previous revision',
    '  6. delete a single pod so its ReplicaSet recreates it',
    '  7. silence a Grafana alert for up to 1 hour',
    '  8. drain an AKS node',
    '  9. rotate a Key Vault secret and disable the old version',
    ' 10. delete a namespace',
    ' 11. terraform apply / terraform destroy against prod',
    '',
    'Rules from the Quality & Release Steward: anything irreversible needs a named human approver.',
    'Nothing outside namespace shop. Infrastructure changes go through a PR and CI, never the agent.'
  );
  PL.FILE_LABELS.W15_CANDIDATE_ACTIONS = 'ops-agent-candidate-actions.txt';

  /* =====================================================================
     Topic 1 — Applying multi-agent systems to daily tasks
     ===================================================================== */
  const DECISION_SCHEMA = obj({
    decisions: arr(obj({
      task_id: en('T1', 'T2', 'T3', 'T4', 'T5'),
      pattern: en('single_agent', 'orchestrator_workers', 'prompt_chain_workflow'),
      parallelizable: B,
      reason: S,
    })),
    cost_note: S,
  });
  const DECISIONS = {
    decisions: [
      { task_id: 'T1', pattern: 'orchestrator_workers', parallelizable: true, reason: '40 independent, read-only workspaces. A lead agent fans out one worker per batch of workspaces, each with its own context, then merges the classifications.' },
      { task_id: 'T2', pattern: 'single_agent', parallelizable: false, reason: 'One file, one failing test, tightly coupled context. Extra agents add tokens and coordination with no gain.' },
      { task_id: 'T3', pattern: 'prompt_chain_workflow', parallelizable: false, reason: 'Fixed, known sequence (export, analyze, draft). A predefined workflow is cheaper and more predictable than an agent choosing steps.' },
      { task_id: 'T4', pattern: 'orchestrator_workers', parallelizable: true, reason: 'Breadth-first research: independent criteria per product can be researched in parallel and condensed for the lead.' },
      { task_id: 'T5', pattern: 'single_agent', parallelizable: false, reason: 'Sequential, shared state and an irreversible step. Keep one agent (or a runbook) with a human approval before disabling the old secret.' },
    ],
    cost_note: 'Anthropic reports multi-agent systems use about 15x the tokens of a chat, so use them only where parallel, independent work justifies the spend.',
  };

  const t1 = {
    id: 'w15-t1',
    title: 'Applying multi-agent systems to daily tasks',
    programmeItem: 'Applying Multi-Agent Systems to Daily Tasks (free equivalent: Anthropic engineering "How we built our multi-agent research system" + Anthropic Academy Introduction to subagents)',
    blurb: 'When one agent is enough, when a lead agent should fan work out to parallel subagents, and when a plain workflow beats both. Multi-agent is powerful and expensive, so pick it on purpose.',
    outcomes: [
      'Explain the orchestrator-worker pattern and why context isolation helps',
      'Decide per task between a single agent, a fixed workflow, and parallel subagents',
      'Run a real fan-out in Claude Code with subagents on independent infrastructure work',
    ],
    concepts: [
      { t: 'Orchestrator-worker', d: 'A lead agent plans the job, spawns subagents for separate parts, and combines their results. Anthropic\'s research system is built this way.', ex: 'lead: "check drift" → 4 workers × 10 workspaces' },
      { t: 'Parallel subagents', d: 'Workers run at the same time on independent pieces, so breadth-first jobs finish faster than one agent working through a list.', ex: 'one subagent per landing zone' },
      { t: 'Context isolation', d: 'Each subagent has its own context window. It reads the noisy detail and hands back a short summary, so the lead\'s context stays clean.', ex: '2,000 lines of plan → 5-line verdict' },
      { t: 'The cost', d: 'Anthropic reports agents use about 4x the tokens of a chat and multi-agent systems about 15x. The task has to be worth that.', ex: 'drift across 40 workspaces: yes · one failing test: no' },
      { t: 'Poor fits', d: 'Tasks where every step needs the same shared context, or steps depend tightly on each other, like most single-file coding fixes.', ex: 'secret rotation: sequential, keep it single' },
      { t: 'Workflows first', d: '"Building effective agents" recommends the simplest thing that works: a fixed prompt chain when the steps are known, an agent only when they are not.', ex: 'monthly cost report = workflow' },
    ],
    leverage: [
      { t: 'Estate-wide read-only sweeps', d: 'Drift checks, tag audits and NSG reviews across many subscriptions or workspaces are independent: fan them out to subagents and get one merged table.' },
      { t: 'Protect your main session', d: 'Send log trawling and large plan reviews to a subagent so your main Claude Code session keeps its context for the actual change.' },
      { t: 'Parallel research for decisions', d: 'For tool choices (Loki vs Elastic, AKS vs Container Apps) give each criterion to a worker, then have the lead write the comparison with sources.' },
      { t: 'Say no to over-engineering', d: 'Before building a multi-agent flow, ask Claude to classify the task. A runbook or a single prompt chain is often the cheaper, safer answer.' },
    ],
    sources: [SRC.multiAgent, SRC.subagentsCourse, SRC.effectiveAgents, SRC.subagents],
    quiz: [
      { q: 'Which task is the best fit for parallel subagents?', options: ['Fixing one failing unit test', 'Checking 40 independent Terraform workspaces for drift', 'Rotating one secret and restarting the app'], a: 1, why: 'Independent, read-only, breadth-first work parallelizes well; the others need shared, sequential context.' },
      { q: 'Why does context isolation help the lead agent?', options: ['Subagents share one big context', 'Each subagent digests detail in its own window and returns a summary', 'It removes the need for tools'], a: 1, why: 'Workers condense their findings, so the lead only sees what matters.' },
      { q: 'Roughly how many more tokens than a chat did Anthropic report for multi-agent systems?', options: ['About 2x', 'About 15x', 'About 100x'], a: 1, why: 'The engineering post reports about 15x, which is why the task must be valuable enough.' },
    ],
    steps: [
      {
        id: 'w15-t1-s1', title: 'Single agent, workflow or subagents? Classify five real tasks', minutes: 8, source: SRC.multiAgent, files: ['W15_TASKS'],
        scenario: 'Your team wants to "make everything multi-agent". Ask Claude to classify five real platform tasks and justify each choice, including cost.',
        task: ['Read <code>agent-candidate-tasks.txt</code>.', 'Click <b>Run</b>. Claude returns a structured decision per task.', 'Do you agree with each choice? Which one would you have over-engineered?'],
        atWork: 'Run this triage before you build any agent. It keeps multi-agent spend for sweeps and research, and keeps sequential, risky changes in a single, gated flow.',
        hint: 'Independent and read-only points to workers; fixed steps point to a workflow; shared state or irreversible steps point to a single agent with a gate.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: { effort: 'medium', format: jsonFormat(DECISION_SCHEMA) },
          system: 'You are a platform architect who designs agent systems. Prefer the simplest pattern that works. Multi-agent systems cost far more tokens, so recommend them only for parallel, independent work.',
          messages: user(L('<tasks>', '{{W15_TASKS}}', '</tasks>', 'For each task choose single_agent, orchestrator_workers or prompt_chain_workflow, say whether it is parallelizable, and give a one-sentence reason. Add a one-line cost note.')),
        },
        checks: [
          { id: 't1', label: 'T1 (40 independent workspaces) uses orchestrator_workers', test: (c, h) => { const j = h.json(c); const d = j && j.decisions.find((x) => x.task_id === 'T1'); return !!d && d.pattern === 'orchestrator_workers' && d.parallelizable === true; } },
          { id: 't2', label: 'T2 (one failing test) stays single_agent', test: (c, h) => { const j = h.json(c); const d = j && j.decisions.find((x) => x.task_id === 'T2'); return !!d && d.pattern === 'single_agent'; } },
          { id: 't3', label: 'T3 (fixed monthly steps) is a prompt_chain_workflow', test: (c, h) => { const j = h.json(c); const d = j && j.decisions.find((x) => x.task_id === 'T3'); return !!d && d.pattern === 'prompt_chain_workflow'; } },
          { id: 't5', label: 'T5 (sequential, irreversible rotation) is not fanned out', test: (c, h) => { const j = h.json(c); const d = j && j.decisions.find((x) => x.task_id === 'T5'); return !!d && d.pattern !== 'orchestrator_workers' && d.parallelizable === false; } },
          { id: 'cost', label: 'Cost note mentions the token overhead', test: (c, h) => { const j = h.json(c); return !!j && /token|cost|15/i.test(j.cost_note); } },
        ],
        sim: [{ content: [think('T1 and T4 are breadth-first and independent. T3 has fixed steps. T2 and T5 need shared, sequential context, and T5 has an irreversible step.'), { type: 'text', text: JSON.stringify(DECISIONS, null, 2) }], stop_reason: 'end_turn', usage: { input_tokens: 620, output_tokens: 430 } }],
      },
      {
        id: 'w15-t1-s2', kind: 'guide', title: 'Fan out a drift sweep with subagents in Claude Code', minutes: 30, source: SRC.subagents,
        scenario: 'Use Claude Code on a copy of your Terraform repo (or the <code>work-kit</code> sample) to run a read-only drift and tag review across several stacks in parallel, with each stack reviewed by its own subagent.',
        task: ['Open Claude Code in a clone of the Terraform repo. Work read-only: no apply, no state changes.', 'Run prompt 1 and watch Claude spawn one subagent per stack.', 'Run prompt 2 to compare the cost of the fan-out with a single-agent pass (use <code>/cost</code> or the session usage).'],
        prompts: [
          { label: 'Parallel read-only review', where: 'Claude Code', text: 'Use subagents in parallel, one per top-level folder under stacks/. Each subagent must work read-only: read the .tf files, run only `terraform fmt -check` and `terraform validate` (no plan against real state, no apply), and return at most 8 lines: missing required tags (env, owner, costcenter), public exposure, and validation errors. Then merge the results into one table sorted by severity. Do not print any secret values you find; just say where they are.' },
          { label: 'Was it worth it?', where: 'Claude Code', text: 'Now review the same stacks in a single pass without subagents and compare: time, token usage, and whether the merged table was better. Give me a one-paragraph recommendation on when our team should use subagents for reviews.' },
        ],
        expected: ['One subagent per stack, each returning a short summary', 'A merged, severity-sorted table', 'A clear, evidence-based view of when the fan-out is worth its cost'],
        verify: 'Open two flagged stacks yourself and confirm the missing tags or exposure are real. Check the subagent behaviour you saw against the Claude Code subagents docs.',
        atWork: 'Use fan-out for estate-wide read-only sweeps (drift, tags, NSGs, policy compliance) and keep changes in a single, reviewed session.',
        checks: [
          { id: 'fanout', label: 'I ran a parallel subagent review on a copy of the repo, read-only', manual: true },
          { id: 'compare', label: 'I compared cost and quality with a single-agent pass', manual: true },
          { id: 'verify', label: 'I verified two findings myself', manual: true },
        ],
      },
    ],
  };

  /* =====================================================================
     Topic 2 — Advanced Claude Code: subagents, hooks, headless
     ===================================================================== */
  const HOOK_SCRIPT = L(
    '#!/usr/bin/env bash',
    '# .claude/hooks/block-tf-apply.sh: PreToolUse guard for the Bash tool',
    'input=$(cat)',
    'cmd=$(jq -r \'.tool_input.command // ""\' <<<"$input")',
    '',
    'if echo "$cmd" | grep -Eq \'terraform([[:space:]]+-[^[:space:]]+)*[[:space:]]+(apply|destroy)\'; then',
    '  if [ "${CI:-}" != "true" ]; then',
    '    echo "Blocked: terraform apply/destroy runs only in CI (GitHub Actions). Open a PR instead." >&2',
    '    exit 2   # exit code 2 blocks the tool call; stderr is shown to Claude',
    '  fi',
    'fi',
    'exit 0'
  );
  const HOOK_SETTINGS = {
    hooks: {
      PreToolUse: [
        { matcher: 'Bash', hooks: [{ type: 'command', command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/block-tf-apply.sh' }] },
      ],
    },
    permissions: { deny: ['Bash(terraform apply *)', 'Bash(terraform destroy *)'] },
  };
  const HOOK_ANSWER = L(
    '## .claude/settings.json',
    '```json',
    JSON.stringify(HOOK_SETTINGS, null, 2),
    '```',
    '',
    '## .claude/hooks/block-tf-apply.sh',
    '```bash',
    HOOK_SCRIPT,
    '```',
    '',
    '## How it works',
    '- `PreToolUse` runs before every tool call; the `Bash` matcher limits it to shell commands.',
    '- The hook reads the event JSON on stdin and checks `tool_input.command`.',
    '- **Exit code 2** blocks the call and sends the stderr message back, so Claude explains and suggests a PR instead.',
    '- In GitHub Actions, `CI=true` is set, so the pipeline can still apply.',
    '- The `permissions.deny` rules are defense in depth: they also stop a direct `terraform apply` locally.',
    '',
    'Make the script executable (`chmod +x .claude/hooks/block-tf-apply.sh`) and commit both files so the whole team gets the guard.'
  );

  const HEADLESS_ANSWER = L(
    '```bash',
    '#!/usr/bin/env bash',
    '# review-plan.sh: non-interactive Terraform plan review with Claude Code',
    'set -euo pipefail',
    '',
    'terraform plan -no-color -out=tfplan > /dev/null',
    'terraform show -no-color tfplan > plan.txt',
    '',
    'claude --bare -p "Review plan.txt as a senior platform engineer. List every destroy or replace, public exposure, and missing tags. End with APPROVE or BLOCK on its own line." \\',
    '  --allowedTools "Read" \\',
    '  --output-format json > review.json',
    '',
    'jq -r \'.result\' review.json > review.md',
    'echo "Estimated cost: $(jq -r \'.total_cost_usd\' review.json) USD"',
    '',
    'if grep -q "^BLOCK" review.md; then',
    '  echo "Claude flagged the plan. See review.md" >&2',
    '  exit 1',
    'fi',
    '```',
    '',
    '- `-p` runs Claude Code non-interactively; `--bare` skips local hooks, plugins and CLAUDE.md so CI gets the same result everywhere (it needs `ANTHROPIC_API_KEY` in the environment, from a CI secret).',
    '- `--allowedTools "Read"` lets Claude read the plan file and nothing else. No shell, no edits.',
    '- `--output-format json` returns metadata; the answer is in `.result`, and `.total_cost_usd` tracks spend.',
    '- The script never applies anything: it only reviews and fails the job on BLOCK.'
  );

  const t2 = {
    id: 'w15-t2',
    title: 'Advanced Claude Code: subagents, hooks and headless mode',
    programmeItem: 'Advanced Claude Code (free equivalent: Claude Code docs: Hooks, Subagents, Headless mode)',
    blurb: 'Three features that turn Claude Code from a chat in your terminal into part of your platform: specialist subagents, hooks that enforce rules in code, and non-interactive runs for scripts and CI.',
    outcomes: [
      'Write a project subagent for Terraform plan review with limited tools',
      'Enforce "no terraform apply/destroy outside CI" with a PreToolUse hook',
      'Run Claude Code headless in a script with JSON output and minimal permissions',
    ],
    concepts: [
      { t: 'Subagent files', d: 'Markdown files in .claude/agents/ (project) or ~/.claude/agents/ (personal). YAML frontmatter needs name and description; tools, model and others are optional. The body is the system prompt.', ex: '.claude/agents/tf-plan-reviewer.md' },
      { t: 'Subagent context', d: 'Each subagent runs in its own context window with its own prompt and tool list, and returns a summary to the main session. Omit tools you do not want it to have.', ex: 'tools: Read, Grep, Glob' },
      { t: 'Hook events', d: 'Hooks run your commands at lifecycle events such as PreToolUse, PostToolUse, UserPromptSubmit, Stop and SessionStart. A matcher narrows a hook to specific tools.', ex: 'PreToolUse + matcher "Bash"' },
      { t: 'Blocking with hooks', d: 'A command hook gets the event JSON on stdin. Exit code 2 blocks the tool call and shows stderr; or return JSON with permissionDecision "deny" and a reason.', ex: 'exit 2 + "Blocked: use CI"' },
      { t: 'Where hooks live', d: 'In the "hooks" key of settings.json. Project settings in .claude/settings.json are committed so the whole team gets the same guard; ${CLAUDE_PROJECT_DIR} points at the repo root.', ex: '"${CLAUDE_PROJECT_DIR}/.claude/hooks/x.sh"' },
      { t: 'Headless mode', d: 'claude -p runs non-interactively. --output-format text, json or stream-json; --allowedTools pre-approves tools; --bare skips local config for reproducible CI runs.', ex: 'claude -p "..." --output-format json | jq -r .result' },
    ],
    leverage: [
      { t: 'A reviewer that never forgets the checklist', d: 'A tf-plan-reviewer subagent with your review criteria gives the same structured review on every plan, in its own context, with read-only tools.' },
      { t: 'Guardrails in code, not in the prompt', d: 'A prompt can be ignored or injected; a PreToolUse hook cannot. Put your hard "never do this locally" rules in hooks and deny rules.' },
      { t: 'Claude as a pipeline step', d: 'Use claude -p in scripts and CI to summarize plans, triage failed builds, or lint runbooks, with JSON output your tooling can parse.' },
      { t: 'Audit what the agent did', d: 'PostToolUse hooks can log every command Claude ran to a file your team reviews, which helps with change evidence.' },
    ],
    sources: [SRC.subagents, SRC.hooks, SRC.hooksGuide, SRC.headless, SRC.settings],
    quiz: [
      { q: 'Which frontmatter fields does a Claude Code subagent require?', options: ['name and description', 'name, tools and model', 'Only tools'], a: 0, why: 'Only name and description are required; tools and model are optional.' },
      { q: 'How does a PreToolUse command hook block a tool call most simply?', options: ['Print "no" to stdout', 'Exit with code 2 and explain on stderr', 'Delete the settings file'], a: 1, why: 'Exit code 2 blocks the call and the stderr message is fed back.' },
      { q: 'Which command runs Claude Code non-interactively and returns JSON?', options: ['claude --json', 'claude -p "..." --output-format json', 'claude run --ci'], a: 1, why: '-p (print) with --output-format json returns the result and metadata as JSON.' },
    ],
    steps: [
      {
        id: 'w15-t2-s1', kind: 'guide', title: 'Build the tf-plan-reviewer subagent and the apply guard', minutes: 40, source: SRC.subagents,
        scenario: 'In a copy of your Terraform repo, add a project subagent that reviews plans, a PreToolUse hook that blocks <code>terraform apply</code> and <code>destroy</code> outside CI, and try both.',
        task: ['Open Claude Code in the repo and run prompt 1 to create <code>.claude/agents/tf-plan-reviewer.md</code>. Read the file it writes.', 'Run prompt 2 to create the hook and settings. Review the script line by line before accepting.', 'Test it with prompt 3: the apply must be blocked, and the plan review must still work.'],
        prompts: [
          { label: '1 · Create the subagent', where: 'Claude Code', text: 'Create a project subagent at .claude/agents/tf-plan-reviewer.md. Frontmatter: name tf-plan-reviewer, a description that says to use it proactively for any terraform plan output or plan file review, tools: Read, Grep, Glob (no Bash, no Edit). Body: review a plan for destroys and replacements, public exposure (NSG 0.0.0.0/0, public IPs, storage public access), missing tags env/owner/costcenter, and cost jumps. Output a table (resource, change, risk, severity) and end with APPROVE or BLOCK. Never print secret values.' },
          { label: '2 · Create the hook', where: 'Claude Code', text: 'Add a PreToolUse hook in .claude/settings.json with matcher "Bash" that runs ${CLAUDE_PROJECT_DIR}/.claude/hooks/block-tf-apply.sh. The script reads the hook JSON from stdin with jq, and if tool_input.command runs terraform apply or terraform destroy (also with flags like -chdir) and the CI environment variable is not "true", it prints a reason to stderr and exits 2. Also add permissions.deny rules for Bash(terraform apply *) and Bash(terraform destroy *). Make the script executable.' },
          { label: '3 · Test it', where: 'Claude Code', text: 'First, use the tf-plan-reviewer subagent to review plans/sample.plan.txt. Then try to run `terraform -chdir=stacks/network apply -auto-approve`. Tell me exactly what blocked it and what message you received.' },
        ],
        expected: ['A subagent file with name/description frontmatter and read-only tools', 'A settings.json with a PreToolUse Bash hook and deny rules', 'The apply is blocked with your message; the plan review still runs'],
        verify: 'Compare the settings.json structure and the exit-code behaviour with the Claude Code hooks reference, and run /hooks to see the hook registered.',
        atWork: 'Commit the subagent and the hook to the repo so every engineer who runs Claude Code there gets the same reviewer and the same guard.',
        checks: [
          { id: 'agent', label: 'I created and read the tf-plan-reviewer subagent file', manual: true },
          { id: 'hook', label: 'I reviewed the hook script and settings before accepting them', manual: true },
          { id: 'blocked', label: 'terraform apply was blocked locally, and the plan review still worked', manual: true },
        ],
      },
      {
        id: 'w15-t2-s2', title: 'Generate the hook settings and check them', minutes: 8, source: SRC.hooks,
        scenario: 'Ask Claude for the <code>.claude/settings.json</code> hook config and the guard script, then check them automatically: correct event, matcher and type, and a script that really blocks both commands outside CI.',
        task: ['Click <b>Run</b>.', 'The checks parse the JSON block and read the bash script.', 'Would this script also catch <code>terraform -chdir=x destroy</code>?'],
        atWork: 'Have Claude draft hook configs, but check them against the hooks reference and test them with a harmless command before you rely on them.',
        hint: 'The structure is hooks → PreToolUse → [{ matcher, hooks: [{ type: "command", command }] }]. Exit code 2 blocks.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' },
          system: 'You are a Claude Code expert. Follow the current Claude Code hooks reference exactly. Give the settings JSON in a ```json block and the script in a ```bash block.',
          messages: user('Write the project .claude/settings.json and the hook script that block `terraform apply` and `terraform destroy` (including forms with flags such as -chdir) from the Bash tool unless the CI environment variable is "true". Use a PreToolUse command hook with a Bash matcher, reference the script via ${CLAUDE_PROJECT_DIR}, and add matching permissions.deny rules. Explain briefly how it blocks.'),
        },
        checks: [
          { id: 'struct', label: 'settings.json has hooks.PreToolUse with a Bash matcher and a command hook', test: (c, h) => { const j = parseJson(fenced(h.text(c), 'json')); const e = j && j.hooks && j.hooks.PreToolUse; return Array.isArray(e) && e.some((m) => /Bash/.test(m.matcher || '') && (m.hooks || []).some((x) => x.type === 'command' && /\.sh/.test(x.command || ''))); } },
          { id: 'dir', label: 'Script path uses ${CLAUDE_PROJECT_DIR}', test: (c, h) => /CLAUDE_PROJECT_DIR/.test(fenced(h.text(c), 'json')) },
          { id: 'both', label: 'Script matches both apply and destroy', test: (c, h) => { const s = fenced(h.text(c), 'bash'); return /apply/.test(s) && /destroy/.test(s) && /tool_input/.test(s); } },
          { id: 'exit2', label: 'Script blocks with exit 2 unless CI is true', test: (c, h) => { const s = fenced(h.text(c), 'bash'); return /exit 2/.test(s) && /\bCI\b/.test(s); } },
          { id: 'deny', label: 'Adds permissions.deny rules for terraform apply and destroy', test: (c, h) => { const j = parseJson(fenced(h.text(c), 'json')); const d = (j && j.permissions && j.permissions.deny) || []; return d.some((r) => /terraform apply/.test(r)) && d.some((r) => /terraform destroy/.test(r)); } },
        ],
        sim: [textTurn(HOOK_ANSWER, { input_tokens: 240, output_tokens: 620 })],
      },
      {
        id: 'w15-t2-s3', title: 'Headless: a plan-review script with claude -p', minutes: 8, source: SRC.headless,
        scenario: 'Wrap Claude Code in a script that reviews a Terraform plan without anyone at the keyboard, returns JSON, and fails the job if Claude says BLOCK. It must not be able to change anything.',
        task: ['Click <b>Run</b>.', 'Check the flags: non-interactive, JSON output, the narrowest tool permission.', 'Look for anything that would let Claude run commands or skip permissions.'],
        atWork: 'Headless Claude Code is how Claude becomes a CI step. Keep permissions minimal, parse <code>.result</code> from JSON, and let the pipeline, not Claude, decide pass or fail.',
        hint: 'Look for -p, --output-format json, a restricted --allowedTools, and no permission bypass.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' },
          system: 'You are a platform engineer who automates with Claude Code. Follow the Claude Code headless documentation. Least privilege always.',
          messages: user('Write a bash script review-plan.sh for CI: create a Terraform plan, save it as text, have Claude Code review it non-interactively with JSON output, extract the review text and cost with jq, and exit 1 if the review ends with BLOCK. Claude must only be able to read files. Explain each Claude flag in one line.'),
        },
        checks: [
          { id: 'p', label: 'Uses claude -p (non-interactive)', test: (c, h) => /claude\b[^\n]*\s-p\b|claude\b[^\n]*--print/.test(h.text(c)) },
          { id: 'json', label: 'Uses --output-format json and reads .result with jq', test: (c, h) => /--output-format json/.test(h.text(c)) && /jq[^\n]*\.result/.test(h.text(c)) },
          { id: 'tools', label: 'Restricts tools to reading (--allowedTools "Read")', test: (c, h) => /--allowedTools\s+"?Read"?(\s|\\|$)/m.test(h.text(c)) },
          { id: 'nobypass', label: 'No permission bypass flags', test: (c, h) => !/dangerously-skip-permissions|bypassPermissions/.test(h.text(c)) },
          { id: 'noapply', label: 'The script never runs terraform apply', test: (c, h) => !/terraform apply/.test(fenced(h.text(c), 'bash')) },
        ],
        sim: [textTurn(HEADLESS_ANSWER, { input_tokens: 200, output_tokens: 520 })],
      },
    ],
  };

  /* =====================================================================
     Topic 3 — SRE Workbook: SLOs and error budgets (policy)
     ===================================================================== */
  const BUDGET_SCHEMA = obj({
    budget_minutes: N,
    consumed_minutes: N,
    consumed_pct: N,
    remaining_minutes: N,
    largest_incident: S,
    largest_incident_pct: N,
    postmortem_required: B,
    release_freeze: B,
    actions: arr(S),
  });
  const BUDGET = {
    budget_minutes: 40.32, consumed_minutes: 29, consumed_pct: 71.9, remaining_minutes: 11.32,
    largest_incident: 'INC-2310', largest_incident_pct: 34.7, postmortem_required: true, release_freeze: false,
    actions: [
      'INC-2310 alone used 34.7% of the four-week budget (over the 20% threshold): postmortem with at least one P0 action item.',
      'Budget is not exhausted (11.32 minutes left), so no release freeze yet; prioritise reliability work and review risky changes.',
      'If the remaining 11.32 minutes are used before the window rolls, freeze all changes except P0 and security fixes.',
      'Take this to the monthly SLO review with the Quality & Release Steward.',
    ],
  };

  const t3 = {
    id: 'w15-t3',
    title: 'SRE Workbook: error budget policy and SLO review',
    programmeItem: 'SRE Workbook: SLOs and error budgets (free: Google SRE Workbook, sre.google) · 1h',
    blurb: 'An SLO without a policy is just a number. The error budget policy says, in advance, what happens when the budget runs low or runs out, and who decides.',
    outcomes: [
      'Calculate an error budget and how much of it incidents consumed',
      'Write an error budget policy with clear thresholds, exceptions and escalation',
      'Set an SLO review cadence and record who approved what',
    ],
    concepts: [
      { t: 'Error budget', d: 'One minus the SLO, over the window. 99.9% over 28 days allows about 40.3 minutes of full outage.', ex: '0.001 × 40,320 min = 40.32 min' },
      { t: 'Budget exhausted', d: 'The Workbook example halts all changes and releases except P0 issues and security fixes until the service is back within SLO.', ex: 'freeze: only P0 + security' },
      { t: 'Single-incident rule', d: 'In the example policy, one incident that consumes more than 20% of the four-week budget needs a postmortem with at least one P0 action.', ex: '14 min of 40.32 = 34.7% → postmortem' },
      { t: 'Exceptions and escalation', d: 'The policy lists what does not count against the team (for example, outages caused by other teams or company-wide infrastructure) and names who settles disputes.', ex: 'disputes → CTO' },
      { t: 'Review cadence', d: 'Review a new SLO often, around monthly, then quarterly once it has settled. Record authors, reviewers, approvers and the next review date.', ex: 'monthly for the first quarter' },
    ],
    leverage: [
      { t: 'Budget maths without mistakes', d: 'Give Claude the SLO, window and incident durations and ask for the budget, consumption and which policy thresholds are crossed, then check the arithmetic.' },
      { t: 'A policy people will sign', d: 'Have Claude draft the policy from the Workbook structure with your thresholds and names, then ask it to argue the case against each rule before review.' },
      { t: 'SLO review packs', d: 'Ask Claude to turn a month of SLO data and incidents into a one-page review: budget used, top consumers, and the decisions needed.' },
    ],
    sources: [SRC.ebPolicy, SRC.implSlo],
    quiz: [
      { q: 'A 99.9% SLO over 28 days allows roughly how much full outage?', options: ['4 minutes', '40 minutes', '4 hours'], a: 1, why: '0.1% of 40,320 minutes is 40.32 minutes.' },
      { q: 'In the Workbook example policy, what happens when the four-week budget is exhausted?', options: ['Nothing until next quarter', 'Changes and releases halt except P0 issues and security fixes', 'The SLO is lowered'], a: 1, why: 'The example policy freezes non-essential change until the service is back within SLO.' },
      { q: 'How often should a new SLO be reviewed?', options: ['Only after a major outage', 'Often at first, around monthly, then less often once it has settled', 'Every day'], a: 1, why: 'The Workbook suggests frequent early reviews that relax to quarterly or less.' },
    ],
    steps: [
      {
        id: 'w15-t3-s1', title: 'Error budget maths for the checkout SLO', minutes: 6, source: SRC.ebPolicy, files: ['W15_SLO_LOG'],
        scenario: 'Three outages hit checkout this window. Have Claude calculate the budget, what was consumed, and which rules of the policy now apply.',
        task: ['Read <code>checkout-error-budget.txt</code>.', 'Click <b>Run</b>.', 'Check the arithmetic yourself: 28 days × 1,440 minutes × 0.001.'],
        atWork: 'Use this at every SLO review. Claude does the maths and maps it to the policy; you check the numbers and own the decision.',
        hint: 'Budget = 40.32 minutes. The 14-minute incident is 34.7% of it.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: { effort: 'medium', format: jsonFormat(BUDGET_SCHEMA) },
          system: 'You are an SRE. Compute error budgets precisely (two decimals for minutes, one decimal for percentages) and apply the given policy literally.',
          messages: user(L('<slo>', '{{W15_SLO_LOG}}', '</slo>', 'Compute the budget in minutes, the consumed minutes and percentage, the remaining budget, the largest incident and its share, and whether the policy requires a postmortem or a release freeze. List the actions.')),
        },
        checks: [
          { id: 'budget', label: 'Budget is about 40.32 minutes', test: (c, h) => { const j = h.json(c); return !!j && Math.abs(j.budget_minutes - 40.32) <= 0.1; } },
          { id: 'consumed', label: '29 minutes consumed, about 71.9%', test: (c, h) => { const j = h.json(c); return !!j && Math.abs(j.consumed_minutes - 29) <= 0.1 && Math.abs(j.consumed_pct - 71.9) <= 0.5; } },
          { id: 'pm', label: 'INC-2310 (about 34.7%) triggers a postmortem', test: (c, h) => { const j = h.json(c); return !!j && j.largest_incident === 'INC-2310' && Math.abs(j.largest_incident_pct - 34.7) <= 0.5 && j.postmortem_required === true; } },
          { id: 'nofreeze', label: 'No release freeze yet (budget not exhausted)', test: (c, h) => { const j = h.json(c); return !!j && j.release_freeze === false && j.remaining_minutes > 0; } },
        ],
        sim: [{ content: [think('Budget: 28 × 1440 × 0.001 = 40.32 min. Consumed 9 + 14 + 6 = 29 min = 71.9%. Largest 14/40.32 = 34.7% > 20%. Not exhausted.'), { type: 'text', text: JSON.stringify(BUDGET, null, 2) }], stop_reason: 'end_turn', usage: { input_tokens: 520, output_tokens: 320 } }],
      },
      {
        id: 'w15-t3-s2', kind: 'guide', title: 'Draft the error budget policy for your W11 SLO', minutes: 30, source: SRC.ebPolicy,
        scenario: 'Write the policy that goes with the SLO you set live in Week 11, so the team knows in advance what happens when the budget runs low or out. It also feeds the EV-RE-05 evidence next week.',
        task: ['In a claude.ai Project with your SLO document, run prompt 1.', 'Run prompt 2 to stress-test the draft.', 'Book the first monthly SLO review and record the approvers.'],
        prompts: [
          { label: '1 · Draft the policy', where: 'claude.ai', text: 'Draft an error budget policy for our [service] SLO: [SLO, e.g. 99.9% of checkout requests succeed, 28-day rolling window]. Follow the structure of the Google SRE Workbook example: service overview, goals, non-goals, SLO miss policy (what happens when the four-week budget is exhausted: freeze except P0 and security fixes), outage policy (single incident over 20% of budget → postmortem with a P0 action), escalation (who decides disputes: [name/role]), exceptions, and a table of authors, reviewers, approvers, approval date and next review date. Keep it to one page. No internal hostnames or secrets.' },
          { label: '2 · Stress-test it', where: 'claude.ai', text: 'Now act as a sceptical product owner. For each rule, give the strongest objection and a scenario where it would do harm (for example, a freeze that blocks a security fix). Then propose the smallest change to the policy that handles it.' },
        ],
        expected: ['A one-page policy with thresholds, exceptions and an escalation owner', 'Objections answered with specific changes', 'A review date and named approvers'],
        verify: 'Check each rule against the SRE Workbook example error budget policy and the "Implementing SLOs" chapter; confirm the budget numbers yourself.',
        atWork: 'Get the policy signed before the budget runs out. It is much easier to agree the rules while nothing is on fire.',
        checks: [
          { id: 'draft', label: 'I drafted the policy with thresholds, exceptions and escalation', manual: true },
          { id: 'stress', label: 'I stress-tested it and updated at least one rule', manual: true },
          { id: 'review', label: 'I booked the first SLO review and recorded approvers', manual: true },
        ],
      },
    ],
  };

  /* =====================================================================
     Topic 4 — Apply: enumerated allowed actions and the human gate
     ===================================================================== */
  const BLAST = en('none_read_only', 'single_pod', 'single_deployment', 'single_namespace', 'environment');
  const ACTION_SCHEMA = obj({
    agent: S,
    actions: arr(obj({ action: S, tool: S, reversible: B, requires_human_approval: B, max_blast_radius: BLAST, rationale: S })),
    forbidden: arr(obj({ action: S, reason: S })),
    escalation: S,
  });
  const ACTION_SET = {
    agent: 'ops-agent (namespace shop)',
    actions: [
      { action: 'List deployments, pods, nodes and events', tool: 'kubectl_get', reversible: true, requires_human_approval: false, max_blast_radius: 'none_read_only', rationale: 'Read-only diagnosis.' },
      { action: 'Read pod or node CPU/memory', tool: 'get_metrics', reversible: true, requires_human_approval: false, max_blast_radius: 'none_read_only', rationale: 'Read-only diagnosis.' },
      { action: 'Scale a deployment between 1 and 10 replicas', tool: 'scale_deployment', reversible: true, requires_human_approval: false, max_blast_radius: 'single_deployment', rationale: 'Reversible by scaling back; the tool rejects more than 10. Scale-down below current replicas asks a human.' },
      { action: 'Rollout restart of one deployment', tool: 'kubectl rollout restart', reversible: true, requires_human_approval: false, max_blast_radius: 'single_deployment', rationale: 'Rolling, no data change.' },
      { action: 'Roll back one deployment to its previous revision', tool: 'kubectl rollout undo', reversible: true, requires_human_approval: true, max_blast_radius: 'single_deployment', rationale: 'Reversible but changes the running version, so the on-call approves.' },
      { action: 'Delete a single pod for its ReplicaSet to recreate', tool: 'kubectl delete pod', reversible: true, requires_human_approval: false, max_blast_radius: 'single_pod', rationale: 'The ReplicaSet recreates it.' },
      { action: 'Silence one Grafana alert for up to 1 hour', tool: 'grafana silence', reversible: true, requires_human_approval: true, max_blast_radius: 'single_namespace', rationale: 'Hides signal; a human confirms.' },
      { action: 'Drain an AKS node', tool: 'kubectl drain', reversible: true, requires_human_approval: true, max_blast_radius: 'environment', rationale: 'Affects every workload on the node.' },
      { action: 'Rotate a Key Vault secret and disable the old version', tool: 'az keyvault secret', reversible: false, requires_human_approval: true, max_blast_radius: 'environment', rationale: 'Irreversible once the old version is disabled; can break every consumer.' },
    ],
    forbidden: [
      { action: 'Delete a namespace', reason: 'Irreversible and destroys everything in it. Humans only, through a change request.' },
      { action: 'terraform apply / terraform destroy against prod', reason: 'Infrastructure changes go through a PR and CI, never the agent.' },
      { action: 'Anything outside namespace shop', reason: 'Out of scope for this agent.' },
    ],
    escalation: 'Approval requests go to the on-call SRE in the Teams incident channel with the exact command, target and reason; if nobody approves within 15 minutes, page the secondary. The agent never retries an unapproved action.',
  };

  const t4 = {
    id: 'w15-t4',
    title: 'Apply: the enumerated action set and the human gate',
    programmeItem: 'Apply task · Write the enumerated allowed actions and the human gate.',
    blurb: 'Before the ops agent touches production, write down exactly what it may do, what each action can break, and which actions need a named human to say yes. This becomes the spine of EV-RE-07 in Week 18.',
    outcomes: [
      'List every action the ops agent may take, with reversibility and blast radius',
      'Put a human approval gate on everything irreversible or wide-reaching',
      'Write the forbidden list and the escalation path',
    ],
    concepts: [
      { t: 'Enumerate, don\'t describe', d: 'An allow-list of concrete actions ("scale checkout-api 1-10") is testable. A description ("help with incidents") is not.', ex: 'action · tool · limits' },
      { t: 'Reversible?', d: 'Can you undo it fully and quickly? Scaling yes; disabling a secret or deleting data no. Irreversible means a human approves, always.', ex: 'reversible:false → approval:true' },
      { t: 'Blast radius', d: 'The most that one call can affect: a pod, a deployment, a namespace, or the whole environment. Wider radius, stronger gate.', ex: 'drain node = environment' },
      { t: 'Guardrails in code', d: 'Limits belong in the tool implementation (for example, reject more than 10 replicas), not only in the prompt, because prompts can be ignored or injected.', ex: 'tool rejects replicas > 10' },
      { t: 'The forbidden list', d: 'Name what the agent must never do, even if asked. It is what you will test adversarially next week.', ex: 'no namespace delete, no terraform apply' },
      { t: 'Escalation path', d: 'Who gets the approval request, where, with what detail, and what happens if nobody answers.', ex: 'Teams on-call → 15 min → secondary' },
    ],
    leverage: [
      { t: 'Draft the action set from your runbooks', d: 'Give Claude your runbooks and tool list and ask for a structured action set with reversibility and blast radius; then challenge every "reversible: true".' },
      { t: 'Turn the set into tool definitions', d: 'Each allowed action becomes a tool with strict input schemas and limits in code, which is how you build the agent in Weeks 17-18.' },
      { t: 'Evidence for the milestone', d: 'The action set, the gate and the escalation test are exactly what EV-RE-07 "Agent in production" asks for.' },
    ],
    sources: [SRC.effectiveAgents, SRC.toolUse, SRC.permissions],
    quiz: [
      { q: 'Rotating a secret and disabling the old version is…', options: ['Reversible, no approval needed', 'Irreversible, so it needs human approval', 'Read-only'], a: 1, why: 'Once the old version is disabled, consumers can break and you cannot simply undo it.' },
      { q: 'Where should the "max 10 replicas" limit be enforced?', options: ['Only in the system prompt', 'In the tool code, with the prompt as a second layer', 'In a wiki page'], a: 1, why: 'Code guardrails hold even when the prompt is ignored or injected.' },
    ],
    steps: [
      {
        id: 'w15-t4-s1', title: 'Generate the ops agent\'s action set', minutes: 8, source: SRC.effectiveAgents, files: ['W15_CANDIDATE_ACTIONS'],
        scenario: 'Turn the candidate list into a structured action set: each action with its tool, reversibility, approval flag and blast radius, plus the forbidden list and escalation.',
        task: ['Read <code>ops-agent-candidate-actions.txt</code>.', 'Click <b>Run</b>.', 'Challenge every <code>reversible: true</code>. Would you sign it?'],
        atWork: 'Keep this JSON in the agent\'s repo. It is the contract you test against, generate tools from, and show reviewers.',
        hint: 'Every reversible:false must have requires_human_approval:true; namespace delete and terraform apply belong in forbidden.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: { effort: 'high', format: jsonFormat(ACTION_SCHEMA) },
          system: 'You are an SRE designing a production ops agent. Be conservative: anything irreversible, or with environment-wide blast radius, needs a named human approver. Infrastructure changes are never done by the agent.',
          messages: user(L('<candidates>', '{{W15_CANDIDATE_ACTIONS}}', '</candidates>', 'Produce the enumerated action set: allowed actions (tool, reversible, requires_human_approval, max_blast_radius, rationale), forbidden actions with reasons, and the escalation path.')),
        },
        checks: [
          { id: 'irrev', label: 'Every irreversible action requires human approval', test: (c, h) => { const j = h.json(c); return !!j && j.actions.length >= 5 && j.actions.every((a) => a.reversible || a.requires_human_approval); } },
          { id: 'env', label: 'Every environment-wide action requires human approval', test: (c, h) => { const j = h.json(c); return !!j && j.actions.filter((a) => a.max_blast_radius === 'environment').every((a) => a.requires_human_approval); } },
          { id: 'read', label: 'Read-only diagnosis (kubectl_get) needs no approval', test: (c, h) => { const j = h.json(c); const a = j && j.actions.find((x) => /kubectl_get/.test(x.tool)); return !!a && a.requires_human_approval === false && a.max_blast_radius === 'none_read_only'; } },
          { id: 'forbid', label: 'Namespace delete and terraform apply/destroy are forbidden', test: (c, h) => { const j = h.json(c); const f = j ? j.forbidden.map((x) => x.action).join(' ') : ''; return /namespace/i.test(f) && /terraform/i.test(f); } },
          { id: 'notallowed', label: 'Neither appears in the allowed list', test: (c, h) => { const j = h.json(c); return !!j && !j.actions.some((a) => /delete (a )?namespace|terraform (apply|destroy)/i.test(a.action + ' ' + a.tool)); } },
          { id: 'esc', label: 'Escalation names who approves and what happens with no answer', test: (c, h) => { const j = h.json(c); return !!j && /on-call|owner|approver/i.test(j.escalation) && /minute|timeout|no answer|nobody/i.test(j.escalation); } },
        ],
        sim: [{ content: [think('Rotation with disable is irreversible; drain and rotation are environment-wide; namespace delete and terraform apply are forbidden outright.'), { type: 'text', text: JSON.stringify(ACTION_SET, null, 2) }], stop_reason: 'end_turn', usage: { input_tokens: 700, output_tokens: 900 } }],
      },
      {
        id: 'w15-t4-s2', kind: 'guide', title: 'Write and sign off the action set and gate', minutes: 90, source: SRC.effectiveAgents,
        scenario: 'Do it for your real ops agent: from your runbooks and tools to a signed action set, a working approval gate, and an escalation path you have actually tested once.',
        task: ['Run prompts 1-3 in a claude.ai Project that holds your runbooks and tool list (secrets removed).', 'Build the gate in Claude Code (prompt 4) and test it with one harmless action.', 'Review the set with the Quality & Release Steward and store it in the agent repo.'],
        prompts: [
          { label: '1 · Inventory', where: 'claude.ai', text: 'From the runbooks in this Project, list every action an on-call engineer takes on [service/namespace], with the exact command or API call. Mark each read-only or change. Remove any secret values; use placeholders.' },
          { label: '2 · Classify', where: 'claude.ai', text: 'For each change action give: reversible (true only if fully undone in minutes), max_blast_radius (pod / deployment / namespace / environment), requires_human_approval, and the guardrail that should live in the tool code. Rule: every irreversible or environment-wide action requires approval. Output a table and the same data as JSON.' },
          { label: '3 · Forbidden list and escalation', where: 'claude.ai', text: 'Write the forbidden list (actions the agent must refuse even if a user, a ticket or a log line tells it to), and the escalation path: who approves, in which Teams channel, what the request must contain (exact command, target, reason, rollback), and what happens after 15 minutes without an answer.' },
          { label: '4 · Build the gate', where: 'Claude Code', text: 'In the ops-agent repo, implement the approval gate: tools marked requires_human_approval must not execute directly; they post an approval request (command, target, reason, rollback) and wait. Add tests: an unapproved request never executes, a forbidden action is refused, and a timeout escalates. Do not add any real webhook URLs or tokens; read them from environment variables.' },
        ],
        expected: ['A signed action set (table + JSON) in the agent repo', 'A gate that blocks unapproved actions, with tests', 'An escalation path tested once end to end'],
        verify: 'Check each action\'s reversibility against the product docs (for example, Key Vault secret version behaviour) and have a second engineer challenge every "reversible: true".',
        atWork: 'This is the core of a safe production agent: an allow-list, guardrails in code, a human gate on anything irreversible, and a tested escalation path.',
        checks: [
          { id: 'set', label: 'I have the enumerated action set with reversibility and blast radius', manual: true },
          { id: 'gate', label: 'Every irreversible action requires a named human approval, enforced in code with tests', manual: true },
          { id: 'forbidden', label: 'The forbidden list and escalation path are written and the escalation was tested once', manual: true },
          { id: 'signoff', label: 'The Quality & Release Steward reviewed the set', manual: true },
        ],
      },
    ],
  };

  PL.addWeek({
    week: 15,
    title: 'Multi-agent systems, advanced Claude Code, and the human gate',
    stream: 'agent',
    hours: 9,
    focus: 'Decide when multi-agent is worth it, make Claude Code enforce your rules with subagents, hooks and headless runs, put an error budget policy behind the SLO, and write the ops agent\'s allowed actions and human gate.',
    apply: 'Write the enumerated allowed actions and the human gate.',
    internal: ['Agent Factory lab — part two · 5h'],
    topics: [t1, t2, t3, t4],
  });
})();
