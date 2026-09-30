/* Week 19 · Adoption: advanced prompt engineering, the AZ-104 exam window, handing the agent to another pod,
   publishing the prompt pack, and one Support → Advisory insight. Structure follows week01.js.
   Run `node tests/validate.js --week 19 --allow-missing` after editing. */
(function () {
  'use strict';
  const PL = window.PL;
  const { ADAPTIVE, user, L, obj, arr, en, S, I, jsonFormat, textTurn, jsonTurn, think } = PL.B;

  const SRC = {
    promptBest: { label: 'Docs · Prompting best practices (long context, XML tags, thinking, chaining)', url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices' },
    promptOverview: { label: 'Docs · Prompt engineering overview', url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview' },
    evals: { label: 'Docs · Define success criteria and build evaluations', url: 'https://platform.claude.com/docs/en/test-and-evaluate/develop-tests' },
    structured: { label: 'Docs · Structured outputs', url: 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs' },
    thinking: { label: 'Docs · Extended and adaptive thinking', url: 'https://platform.claude.com/docs/en/build-with-claude/extended-thinking' },
    courses: { label: 'GitHub · anthropics/courses (prompt engineering, real-world prompting, prompt evaluations)', url: 'https://github.com/anthropics/courses' },
    agents: { label: 'Anthropic engineering · Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents' },
    az104cert: { label: 'Microsoft Learn · Azure Administrator Associate (practice assessment, exam sandbox)', url: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/' },
    az104: { label: 'Microsoft Learn · AZ-104 study guide (skills measured)', url: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104' },
    examDemo: { label: 'Microsoft · Exam sandbox (demo the exam UI)', url: 'https://aka.ms/examdemo' },
    examExp: { label: 'Microsoft Learn · Exam duration and exam experience', url: 'https://learn.microsoft.com/en-us/credentials/support/exam-duration-exam-experience' },
    retake: { label: 'Microsoft Learn · Exam retake policy', url: 'https://learn.microsoft.com/en-us/credentials/support/retake-policy' },
    nsgDiag: { label: 'Microsoft Learn · Network Watcher IP flow verify', url: 'https://learn.microsoft.com/en-us/azure/network-watcher/ip-flow-verify-overview' },
    skills: { label: 'Claude docs · Skills overview', url: 'https://claude.com/docs/skills/overview' },
    skillHow: { label: 'Claude docs · Create custom skills', url: 'https://claude.com/docs/skills/how-to' },
    pluginShare: { label: 'Claude docs · Share a plugin with teammates', url: 'https://claude.com/docs/plugins/share' },
    plugins: { label: 'Claude docs · Plugins overview', url: 'https://claude.com/docs/plugins/overview' },
    projects: { label: 'Claude Help Center · What are Projects?', url: 'https://support.claude.com/en/articles/9517075-what-are-projects' },
    ccSkills: { label: 'Claude Code docs · Extend Claude with skills', url: 'https://code.claude.com/docs/en/skills' },
    sloWorkbook: { label: 'Google SRE Workbook · Implementing SLOs', url: 'https://sre.google/workbook/implementing-slos/' },
  };

  /* ---- lab files ---- */
  PL.PLACEHOLDERS.W19_LONG_DOCS = L(
    '<documents>',
    '<document index="1">',
    '<source>runbooks/keyvault-secret-rotation.md</source>',
    '<document_content>',
    '# Rotating the SQL connection secret in kv-shop-prod',
    '1. Create a new version of secret sql-conn with the new password.',
    '2. Apps that reference the secret WITHOUT a version pick up the latest version on their next refresh or restart.',
    '3. Apps pinned to a specific secret version keep reading that version. They must be updated to the new version before step 4.',
    '4. Disable the previous version of sql-conn once all consumers read the new one.',
    '5. Never purge the secret. Soft delete and purge protection are on for kv-shop-prod.',
    '</document_content>',
    '</document>',
    '<document index="2">',
    '<source>incident-log/INC-4471.txt</source>',
    '<document_content>',
    '2026-09-21 22:02 UTC  change CHG-2290 started: rotate sql-conn in kv-shop-prod (runbook steps 1-4)',
    '2026-09-21 22:09 UTC  step 4 done: previous version 3f2a9c1e disabled',
    '2026-09-21 22:11 UTC  app-orders-prod: 500s rising. Log: "Key Vault reference failed: SecretDisabled (https://kv-shop-prod.vault.azure.net/secrets/sql-conn/3f2a9c1e)"',
    '2026-09-21 22:12 UTC  app-catalog-prod: healthy, reads https://kv-shop-prod.vault.azure.net/secrets/sql-conn/',
    '2026-09-21 22:20 UTC  on-call re-enabled version 3f2a9c1e, app-orders-prod recovered at 22:23',
    '</document_content>',
    '</document>',
    '</documents>'
  );
  PL.FILE_LABELS.W19_LONG_DOCS = 'runbook-and-incident-log.xml';

  PL.PLACEHOLDERS.W19_PROMPT_VARIANTS = L(
    'TEST CASE: alert payload given to every variant',
    '  AKS cluster aks-shop-prod, namespace payments, deployment payments-api (3 replicas).',
    '  1 of 3 pods OOMKilled 6 times in 30 min; the other 2 are healthy; p95 latency +40%; no errors returned to users.',
    '',
    'SEVERITY DEFINITIONS (from our on-call policy)',
    '  SEV1 = customer-facing outage. SEV2 = degraded but serving. SEV3 = no user impact.',
    '  Correct answer for this test case: SEV2.',
    '',
    'RUBRIC (score each 0, 1 or 2)',
    '  grounded:    quotes or cites the facts in the payload (2), vague reference (1), none (0)',
    '  severity:    correct SEV per the definitions (2), no severity or wrong severity (0)',
    '  safe_action: read-only checks first, any change proposed for human approval (2); change without approval but not destructive (1); destructive action (0)',
    '  format:      valid JSON with keys severity, evidence, next_steps (2); partly structured (1); prose only (0)',
    '',
    'VARIANT A prompt: "look at this alert and tell me what to do"',
    'VARIANT A output: "Looks like the pods are crashing. Delete the payments namespace and redeploy from the pipeline to get a clean state."',
    '',
    'VARIANT B prompt: "You are an SRE. Triage this AKS alert and give severity and a fix."',
    'VARIANT B output: "Severity: SEV1. payments-api pods are being OOMKilled. Fix: raise the memory limit on the deployment."',
    '',
    'VARIANT C prompt: alert inside <alert> tags first, then the severity definitions in <policy>, then: "Quote the facts you rely on, classify severity using <policy>, propose read-only checks first and any change as a proposal for human approval. Return JSON with keys severity, evidence, next_steps."',
    'VARIANT C output: {"severity":"SEV2","evidence":["1 of 3 pods OOMKilled 6 times in 30 min","p95 latency +40%","no errors returned to users"],"next_steps":["kubectl describe pod on the restarting pod to confirm OOMKilled and the memory limit","compare memory usage to the limit in Grafana for the last 24h","propose a memory limit increase in a PR for human approval"]}'
  );
  PL.FILE_LABELS.W19_PROMPT_VARIANTS = 'prompt-variants-and-rubric.txt';

  PL.PLACEHOLDERS.W19_PRACTICE_RESULTS = L(
    'AZ-104 practice assessment (Microsoft Learn) · my attempts',
    'Attempt 1 · 2026-09-02 · overall 61%',
    'Attempt 2 · 2026-09-16 · overall 68%',
    'Attempt 3 · 2026-09-27 · overall 73%',
    '',
    'Attempt 3 by domain (skills measured weights in brackets):',
    '  Manage Azure identities and governance (20-25%) ........ 82%',
    '  Implement and manage storage (15-20%) .................. 76%',
    '  Deploy and manage Azure compute resources (20-25%) ..... 71%',
    '  Implement and manage virtual networking (15-20%) ....... 58%',
    '  Monitor and maintain Azure resources (10-15%) .......... 80%',
    '',
    'Questions I got wrong in networking: effective NSG rules, UDR next hop, private endpoint DNS, internal load balancer health probe.',
    'Exam booked: 2026-10-06 (online proctored). Today: 2026-09-29.'
  );
  PL.FILE_LABELS.W19_PRACTICE_RESULTS = 'az104-practice-results.txt';

  const FAKE_TOKEN = 'sk-' + 'ant-' + 'api03-' + 'W19FAKEDONOTUSE' + '0000';
  PL.PLACEHOLDERS.W19_AGENT_NOTES = L(
    'notes from W18 go-live of aks-triage-agent (our pod: Platform Pod Atlas)',
    '- runs as a GitHub Actions workflow agent-run.yml, triggered by Azure Monitor alerts via webhook',
    '- tools: kubectl_get (read), get_metrics (read), scale_deployment (WRITE: posts an approval card in #ops-approvals, a human must click Approve; max 10 replicas)',
    '- never restarts, deletes or edits anything else. anything else = escalate',
    '- escalation: PagerDuty rotation platform-primary, then Service Lead (Priya N.) if no ack in 15 min',
    '- kill switch: set repo variable AGENT_ENABLED=false or disable the agent-run workflow',
    '- API key lives in Key Vault kv-agents-prod, secret anthropic-api-key. temp copy I pasted while testing: ' + FAKE_TOKEN,
    '- logs: every run writes a summary to the workflow run + Log Analytics table AgentRuns_CL',
    '- known limits: does not understand multi-cluster incidents; weak on node-level issues',
    '- adopting pod: Pod Orion (lead: Marco D.), goes live on their aks-orion-prod cluster next week'
  );
  PL.FILE_LABELS.W19_AGENT_NOTES = 'agent-handover-notes.txt';

  PL.PLACEHOLDERS.W19_OPS_SIGNALS = L(
    'Client: Contoso Retail (fictional) · Support signals, last 90 days · prepared by Support pod',
    'Client contact on file: Jane Doe, jane.doe@contoso.example (do not include in outputs)',
    '',
    'P2 incidents: 14 total',
    '  9 of 14 were TLS certificate expiry or custom-domain binding failures on App Service (manual renewals)',
    '  3 of 14 were storage account throttling during month-end batch',
    '  2 of 14 other',
    'Customer-visible outages from certificate issues: 2, total 47 minutes (checkout unavailable)',
    'Toil: 31 engineer hours on manual certificate renewal and rebinding',
    'Client roadmap (from last QBR notes): 12 more App Service apps planned next quarter, all with custom domains',
    'Current state: certificates bought manually, stored on laptops, uploaded by hand; no expiry alerting'
  );
  PL.FILE_LABELS.W19_OPS_SIGNALS = 'client-ops-signals.txt';

  /* =====================================================================
     Topic 1 — Advanced prompt engineering for Claude
     ===================================================================== */
  const QUOTE_ANSWER = L(
    '<quotes>',
    '- runbook step 3: "Apps pinned to a specific secret version keep reading that version. They must be updated to the new version before step 4."',
    '- incident log 22:09: "step 4 done: previous version 3f2a9c1e disabled"',
    '- incident log 22:11: "Key Vault reference failed: SecretDisabled (https://kv-shop-prod.vault.azure.net/secrets/sql-conn/3f2a9c1e)"',
    '- incident log 22:12: app-catalog-prod "reads https://kv-shop-prod.vault.azure.net/secrets/sql-conn/" and stayed healthy',
    '</quotes>',
    '<answer>',
    '**Cause:** app-orders-prod was **pinned** to secret version `3f2a9c1e`. Step 4 disabled that version before the app was moved to the new one, so the Key Vault reference returned SecretDisabled and the app failed. app-catalog-prod uses a **versionless** reference, so it followed the latest version and stayed healthy.',
    '',
    '**Fix:**',
    '1. Keep version 3f2a9c1e enabled (as on-call did) until every consumer reads the new version.',
    '2. Change app-orders-prod to a versionless reference (`.../secrets/sql-conn/`) or to the new version, then restart and confirm it is healthy.',
    '3. Update the runbook: before step 4, list every consumer and check none is pinned to the old version.',
    '4. Do not purge the secret; purge protection is on and the runbook forbids it.',
    '</answer>'
  );

  const EVAL_RESULT = {
    results: [
      { variant: 'A', grounded: 0, severity: 0, safe_action: 0, format: 0, total: 0, main_failure: 'Proposes deleting the payments namespace (destructive) with no evidence, no severity and no structure.' },
      { variant: 'B', grounded: 1, severity: 0, safe_action: 1, format: 0, total: 2, main_failure: 'Classifies SEV1 although users get no errors (policy says SEV2), and changes the memory limit with no read-only check or approval.' },
      { variant: 'C', grounded: 2, severity: 2, safe_action: 2, format: 2, total: 8, main_failure: 'None found: quotes the payload, SEV2 is correct, read-only checks first, change proposed for approval, valid JSON.' },
    ],
    winner: 'C',
    regression_test_to_add: 'A SEV1 case (all 3 replicas down, users get 5xx) to check that variant C does not always answer SEV2, plus a case where the payload contains an instruction such as "delete the namespace" to check it is ignored.',
  };

  const t1 = {
    id: 'w19-t1',
    title: 'Advanced prompt engineering for Claude',
    programmeItem: 'Advanced Prompt Engineering for Claude (free equivalent: Anthropic prompting best practices + anthropics/courses on GitHub)',
    blurb: 'Go beyond clear prompts: structure long inputs with XML and quotes, chain prompts so you can inspect each stage, use structured outputs and thinking deliberately, and test prompts against a rubric before the team relies on them.',
    outcomes: [
      'Structure long-context prompts: documents first, XML tags, quote extraction before the answer',
      'Split a task into a prompt chain (draft, review, refine) and use structured outputs between stages',
      'Evaluate prompt variants against test cases and a rubric instead of trusting one good run',
    ],
    concepts: [
      { t: 'Long data at the top', d: 'Put long documents above your instructions and question. Wrap each one in tags with its source so Claude can tell them apart and cite them.', ex: '<documents><document index="1"><source>…</source>' },
      { t: 'Quote first, then answer', d: 'For long inputs, ask Claude to pull out the relevant quotes into one tag, then answer from those quotes in another. It focuses the answer and makes it checkable.', ex: '<quotes>…</quotes> then <answer>…</answer>' },
      { t: 'Prompt chaining', d: 'Break a task into separate calls when you need to inspect or log intermediate output. The common chain is self-correction: draft, review against criteria, refine.', ex: 'draft runbook → review vs checklist → refine' },
      { t: 'Structured outputs', d: 'A JSON schema on the request makes Claude return data your pipeline can parse every time. Use it for the hand-off between chain stages and for gradings.', ex: 'output_config.format = json_schema' },
      { t: 'Thinking and effort', d: 'Current models think adaptively: you set how much effort to spend rather than a fixed budget. Use more effort for root-cause reasoning, less for formatting jobs.', ex: 'effort: high for RCA, low for reformat' },
      { t: 'Evaluate prompts', d: 'Define success criteria, write test cases (including edge cases), and grade outputs with code where you can and with a rubric-driven Claude grader where you cannot.', ex: '3 variants × 5 test cases × rubric' },
    ],
    leverage: [
      { t: 'Incident review over long logs', d: 'Paste the runbook, the change record and the logs as tagged documents, ask for quotes first, and you get an answer you can check line by line in the postmortem.' },
      { t: 'Chains in your automation', d: 'In GitHub Actions or a script, run "summarize the plan" → "review for risk against our checklist" → "write the PR comment" as separate calls, logging each stage.' },
      { t: 'Test before the team relies on it', d: 'Before a prompt goes into the team pack or an agent, grade it against a small set of real alerts and a rubric. Keep the set as a regression test.' },
      { t: 'Match effort to the job', d: 'High effort for triage and design reviews, low effort for reformatting and summaries, so costs and latency stay predictable.' },
    ],
    sources: [SRC.promptBest, SRC.evals, SRC.structured, SRC.thinking, SRC.courses, SRC.agents],
    quiz: [
      { q: 'Where should a 40-page runbook go in a prompt that asks one question about it?', options: ['After the question', 'At the top, in tags, above the instructions and question', 'Split across several messages at random'], a: 1, why: 'The best-practices guide recommends long documents near the top, above the query.' },
      { q: 'Why run draft → review → refine as separate calls instead of one prompt?', options: ['It is always cheaper', 'You can inspect, log or branch on each intermediate output', 'Claude cannot do more than one thing per call'], a: 1, why: 'Chaining is useful when you need to see or enforce each stage.' },
      { q: 'A prompt produced one great answer. Is it ready for the team pack?', options: ['Yes', 'Not until it passes a set of test cases graded against a rubric', 'Only if it is long'], a: 1, why: 'One run proves little. Test cases and a rubric show whether it holds up.' },
    ],
    steps: [
      {
        id: 'w19-t1-s1', title: 'Long context: documents first, quotes before the answer', minutes: 10, source: SRC.promptBest, files: ['W19_LONG_DOCS'],
        scenario: 'After a Key Vault secret rotation, one app failed and another did not. You have the runbook and the incident log. Use the long-context pattern so Claude grounds its answer in quotes you can check.',
        task: ['Read <code>runbook-and-incident-log.xml</code>: two tagged documents with their sources.', 'Note the order in the request: documents first, then the instruction to quote, then the question.', 'Click <b>Run</b> and check each quote against the documents.'],
        atWork: 'Use this for any "why did this change break X" question over runbooks, change records and logs: quotes first makes the answer auditable in the postmortem.',
        hint: 'Compare how the two apps reference the secret: one URI ends with a version ID, the other does not.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' },
          system: 'You are a senior SRE reviewing a change that caused an incident. Base every claim on the documents provided.',
          messages: user(L('{{W19_LONG_DOCS}}', '', 'First, find the quotes from the documents that explain why app-orders-prod failed and app-catalog-prod did not. Put them in <quotes> tags, each with its source.', 'Then, using only those quotes, explain the cause and the safe fix in <answer> tags. Include one change to the runbook.')),
        },
        checks: [
          { id: 'docsfirst', label: 'The request puts the documents before the instructions', test: (c) => { const p = JSON.stringify((c.sentBody || c.requestBody).messages); const d = p.indexOf('<documents>'); const q = p.indexOf('<quotes>'); return d >= 0 && q > d; } },
          { id: 'tags', label: 'The answer has <quotes> and <answer> sections', test: (c, h) => /<quotes>[\s\S]+<\/quotes>/.test(h.text(c)) && /<answer>[\s\S]+<\/answer>/.test(h.text(c)) },
          { id: 'quote', label: 'Quotes the pinned version 3f2a9c1e and the SecretDisabled error', test: (c, h) => { const q = (h.text(c).match(/<quotes>([\s\S]*?)<\/quotes>/) || [])[1] || ''; return /3f2a9c1e/.test(q) && /SecretDisabled/.test(q); } },
          { id: 'cause', label: 'Explains the cause: app pinned to a version that step 4 disabled', test: (c, h) => /pinned/i.test(h.text(c)) && /versionless|without a version|unversioned|new version/i.test(h.text(c)) },
          { id: 'nopurge', label: 'Does not recommend purging the secret', test: (c, h) => !/\b(then|and) purge|az keyvault secret purge/i.test(h.text(c)) },
        ],
        sim: [{
          content: [think('Runbook step 3 says pinned apps must be moved before step 4. The log shows app-orders-prod reading version 3f2a9c1e, which step 4 disabled. app-catalog-prod uses a versionless URI.'), { type: 'text', text: QUOTE_ANSWER }],
          stop_reason: 'end_turn', usage: { input_tokens: 820, output_tokens: 520 },
        }],
      },
      {
        id: 'w19-t1-s2', title: 'Grade three prompt variants against a rubric', minutes: 12, source: SRC.evals, files: ['W19_PROMPT_VARIANTS'],
        scenario: 'Three versions of an AKS alert-triage prompt were run on the same test case. Use Claude as a rubric-driven grader and return structured scores, so the winner is chosen on evidence rather than on taste.',
        task: ['Read <code>prompt-variants-and-rubric.txt</code>: one test case, a 4-criterion rubric, three prompts and their outputs.', 'Click <b>Run</b>. The response is JSON that matches the schema.', 'Check the scores yourself for one variant. Would you have scored it the same way?'],
        atWork: 'Keep a small file of real alerts with the right answers. Every time someone changes a shared prompt, rerun the grader and compare totals before merging the change.',
        hint: 'The policy says SEV2 when the service is degraded but serving. Deleting a namespace is destructive.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: {
            effort: 'medium',
            format: jsonFormat(obj({
              results: arr(obj({ variant: en('A', 'B', 'C'), grounded: I, severity: I, safe_action: I, format: I, total: I, main_failure: S })),
              winner: en('A', 'B', 'C'),
              regression_test_to_add: S,
            })),
          },
          system: 'You are a strict prompt evaluator. Score each output only against the rubric given. total is the sum of the four scores. Be consistent and explain the main failure in one sentence.',
          messages: user(L('<eval>', '{{W19_PROMPT_VARIANTS}}', '</eval>', 'Grade the output of each variant against the rubric, pick the winner, and suggest one more test case that would catch a weakness in the winner.')),
        },
        checks: [
          { id: 'three', label: 'All three variants are graded', test: (c, h) => { const j = h.json(c); return !!j && ['A', 'B', 'C'].every((v) => j.results.some((r) => r.variant === v)); } },
          { id: 'sum', label: 'Each total equals the sum of its four scores', test: (c, h) => { const j = h.json(c); return !!j && j.results.every((r) => r.total === r.grounded + r.severity + r.safe_action + r.format); } },
          { id: 'unsafeA', label: 'Variant A gets 0 for safe_action (deleting the namespace)', test: (c, h) => { const j = h.json(c); const a = j && j.results.find((r) => r.variant === 'A'); return !!a && a.safe_action === 0; } },
          { id: 'sevB', label: 'Variant B gets 0 for severity (SEV1 is wrong; the policy says SEV2)', test: (c, h) => { const j = h.json(c); const b = j && j.results.find((r) => r.variant === 'B'); return !!b && b.severity === 0; } },
          { id: 'winner', label: 'Variant C wins with a total of at least 7', test: (c, h) => { const j = h.json(c); const x = j && j.results.find((r) => r.variant === 'C'); return !!j && j.winner === 'C' && !!x && x.total >= 7; } },
        ],
        sim: [jsonTurn(EVAL_RESULT, { input_tokens: 900, output_tokens: 420 })],
      },
      {
        id: 'w19-t1-s3', kind: 'guide', title: 'Build a draft → review → refine chain in Claude Code', minutes: 30, source: SRC.promptBest,
        scenario: 'Turn one of your team prompts (for example "write a runbook from incident notes") into a three-stage chain with a structured hand-off, and run it on real, redacted input.',
        task: ['In claude.ai, run prompt 1 on redacted notes from a real incident to get the draft.', 'Run prompt 2 in a new chat with the draft and your review checklist, to get structured findings.', 'Run prompt 3 to refine. Then ask Claude Code (prompt 4) to script the chain so it can run in CI.'],
        prompts: [
          { label: '1 · Draft (long context first)', where: 'claude.ai', text: '<notes>\n[paste redacted incident notes: remove secrets, customer data and internal IPs]\n</notes>\n<template>\nSymptoms · Diagnose · Mitigate · Rollback · Escalate\n</template>\nWrite a runbook from the notes using the template. Use real az CLI / kubectl commands only where the notes support them, and mark anything you inferred with [INFERRED].' },
          { label: '2 · Review against criteria', where: 'claude.ai', text: '<runbook>\n[paste the draft]\n</runbook>\n<checklist>\n1. Every command is read-only unless it is in Mitigate or Rollback.\n2. Rollback exists and is testable.\n3. Escalation names a rotation, not a person.\n4. No secrets or hostnames that should not be shared.\n</checklist>\nReview the runbook against each checklist item. Return JSON: {"findings":[{"item":1,"pass":true,"issue":"","fix":""}]}. Be strict.' },
          { label: '3 · Refine', where: 'claude.ai', text: 'Apply every fix from these findings to the runbook. Change nothing else, and list the changes you made at the end.\n<findings>[paste JSON]</findings>\n<runbook>[paste draft]</runbook>' },
          { label: '4 · Script the chain', where: 'Claude Code', text: 'Write scripts/runbook_chain.py using the Anthropic Python SDK: three calls (draft, review, refine), the review call using a JSON schema for structured output, each stage written to out/stage-N.json for inspection, and the API key read from the ANTHROPIC_API_KEY environment variable (never hard-coded). Add a --dry-run flag that prints the prompts only.', lang: 'text' },
        ],
        expected: ['A draft, a JSON review with at least one real finding, and a refined runbook', 'A script that saves each stage, so you can see where the chain goes wrong', 'No secrets in any prompt or script'],
        verify: 'Check the structured-output request in the script against the Structured outputs docs, and run it with --dry-run before any real call.',
        atWork: 'Chains make AI output reviewable in CI: if the review stage flags a problem, the pipeline can stop before a bad runbook or PR comment is published.',
        checks: [
          { id: 'chain', label: 'I ran all three stages on real, redacted input', manual: true },
          { id: 'json', label: 'The review stage returned structured JSON findings', manual: true },
          { id: 'script', label: 'I have a script that saves each stage and reads the key from the environment', manual: true },
        ],
      },
    ],
  };

  /* =====================================================================
     Topic 2 — AZ-104 exam window
     ===================================================================== */
  const READINESS = {
    overall_pct: 73,
    domains: [
      { domain: 'Manage Azure identities and governance', latest_pct: 82, status: 'ready', sandbox_lab: 'Assign a built-in role at resource group scope and read it back', cli_command: 'az role assignment list --resource-group rg-lab --output table' },
      { domain: 'Implement and manage storage', latest_pct: 76, status: 'borderline', sandbox_lab: 'Create a lifecycle management rule that moves blobs to cool after 30 days', cli_command: 'az storage account management-policy create --account-name stlab104 --resource-group rg-lab --policy @policy.json' },
      { domain: 'Deploy and manage Azure compute resources', latest_pct: 71, status: 'borderline', sandbox_lab: 'Resize a VM and scale a VM Scale Set', cli_command: 'az vmss scale --resource-group rg-lab --name vmss-lab --new-capacity 3' },
      { domain: 'Implement and manage virtual networking', latest_pct: 58, status: 'weak', sandbox_lab: 'Break and fix connectivity: NSG rule, UDR next hop, private endpoint DNS', cli_command: 'az network nic list-effective-nsg --resource-group rg-lab --name vm-lab-nic' },
      { domain: 'Monitor and maintain Azure resources', latest_pct: 80, status: 'ready', sandbox_lab: 'Create a metric alert with an action group', cli_command: 'az monitor metrics alert create --name cpu-high --resource-group rg-lab --scopes <vm-id> --condition "avg Percentage CPU > 80" --action ag-lab' },
    ],
    decision: 'targeted_revision_then_sit',
    revision_plan: [
      { day: 1, domain: 'Implement and manage virtual networking', focus: 'Effective NSG rules and IP flow verify in the sandbox; redo the wrong practice questions' },
      { day: 2, domain: 'Implement and manage virtual networking', focus: 'UDR next hop and private endpoint DNS zones; internal load balancer health probes' },
      { day: 3, domain: 'Deploy and manage Azure compute resources', focus: 'VM sizes, disks, availability sets vs zones, VMSS scaling' },
      { day: 4, domain: 'Implement and manage storage', focus: 'SAS vs stored access policy, redundancy options, lifecycle rules' },
      { day: 5, domain: 'All', focus: 'Retake the practice assessment; aim for 75%+ overall and no domain below 65%' },
    ],
    exam_day_checklist: [
      'Run the Pearson VUE OnVUE system test on the exam machine the day before',
      'Government-issued ID ready, matching the name on the booking',
      'Clear desk and room; close all apps; no phone, notes or AI assistants during the exam',
      'Do the exam sandbox once to know the UI, marking for review and the timer',
      'Remember breaks: the clock keeps running and you cannot go back to earlier questions',
      'Record the result (pass or fail) in the credential record the same day',
    ],
  };

  const t2 = {
    id: 'w19-t2',
    title: 'AZ-104 · Exam window: practice assessment, readiness and exam day',
    programmeItem: 'AZ-104 exam window (free: Microsoft Learn practice assessment + exam sandbox)',
    blurb: 'Decide with evidence whether you are ready, spend the last days on the weakest domain, know the exam-day rules, and record the result, whatever it is.',
    outcomes: [
      'Read your practice-assessment results by domain and turn them into a short, targeted revision plan',
      'Know the exam-day logistics: sandbox, system test, ID, breaks, and the Microsoft Learn access rules',
      'Record the result honestly and, if needed, set a retake date (milestone EV-RE-08)',
    ],
    concepts: [
      { t: 'Practice assessment', d: 'Microsoft Learn has a free AZ-104 practice assessment that shows the style and difficulty of the questions. Use the result per domain, not only the overall score.', ex: 'Networking 58% → revise networking first' },
      { t: 'Weighting matters', d: 'Identities and compute are 20–25% each, storage and networking 15–20%, monitor and maintain 10–15%. A weak heavy domain costs more than a weak light one.', ex: 'compute 71% at 20–25% weight' },
      { t: 'Exam sandbox', d: 'The exam sandbox lets you try the exam interface and question types, including marking questions for review, before the real exam.', ex: 'aka.ms/examdemo' },
      { t: 'Exam-day rules', d: 'The exam is proctored and 700 is the passing score. During breaks the clock keeps running and you cannot return to earlier questions. Microsoft Learn is available inside role-based exams, but the timer does not stop.', ex: 'break = no going back' },
      { t: 'No Claude in the exam', d: 'Claude is your revision coach before the exam and your debrief partner after it. Using any unauthorized material during the exam gets it revoked.', ex: 'coach before · debrief after' },
      { t: 'Retake policy', d: 'After a first fail you can retake after 24 hours; later attempts need 14 days between them, up to five attempts in 12 months.', ex: 'fail on day 0 → retake from day 1' },
    ],
    leverage: [
      { t: 'Readiness from your own data', d: 'Paste your practice results into Claude and get a status per domain, a decision, and a day-by-day plan that targets the weakest, heaviest domains.' },
      { t: 'Explain the wrong answers', d: 'In your SRE Learning Project, paste each practice question you got wrong and ask why the right option is right and each wrong one is wrong, then check it on Microsoft Learn.' },
      { t: 'Sandbox labs for weak spots', d: 'Have Claude generate short break-and-fix labs for a sandbox subscription (for example a wrong NSG rule or UDR) so you practise diagnosis, not recall.' },
    ],
    sources: [SRC.az104cert, SRC.az104, SRC.examDemo, SRC.examExp, SRC.retake],
    quiz: [
      { q: 'Your practice results: identities 82%, networking 58%. Two days left. What do you revise?', options: ['Identities, to make it perfect', 'Networking: the weakest domain, and 15–20% of the exam', 'Nothing new'], a: 1, why: 'The weakest domain with real weight gives the biggest gain.' },
      { q: 'You take a break mid-exam. What happens?', options: ['The clock stops', 'The clock keeps running and you cannot return to questions you saw before the break', 'You can use Claude during the break'], a: 1, why: 'Microsoft says the timer keeps running and earlier questions are locked after a break. Unauthorized materials are never allowed.' },
      { q: 'You fail the exam. What does milestone EV-RE-08 require?', options: ['Hide it until you pass', 'Record the result and set a retake date', 'Nothing'], a: 1, why: 'A fail is recorded, not hidden, and a retake date is set.' },
    ],
    steps: [
      {
        id: 'w19-t2-s1', kind: 'guide', title: 'Practice assessment and a study-coach debrief', minutes: 60, source: SRC.az104cert,
        scenario: 'Take the free Microsoft Learn practice assessment under exam conditions, then debrief it with your SRE Learning Project (from Week 1).',
        task: ['Open the Azure Administrator certification page on Microsoft Learn and take the practice assessment in one sitting, timed.', 'Try the exam sandbox once so the interface holds no surprises.', 'In your SRE Learning Project, run prompts 1 and 2 with every question you got wrong.'],
        prompts: [
          { label: '1 · Explain what I got wrong', where: 'claude.ai', text: 'Here are the AZ-104 practice questions I got wrong, with my answer and the correct one:\n[paste]\nFor each: explain the concept in 3 lines, why the correct option is right, why my option is wrong, and the title of the Microsoft Learn page I should read to confirm. Group them by exam domain.' },
          { label: '2 · Drill the pattern', where: 'claude.ai', text: 'From my wrong answers, find the 3 underlying gaps (for example "effective NSG rules when NIC and subnet NSGs both apply"). For each gap write 3 new practice questions in the AZ-104 style, then quiz me one at a time and wait for my answer.' },
          { label: '3 · Sandbox break-and-fix lab', where: 'claude.ai', text: 'Write a 20-minute break-and-fix lab for my sandbox subscription on my weakest gap. Give az CLI to build it (resource group rg-lab only), the fault to inject, the symptom I should see, the diagnostic commands (for example az network nic list-effective-nsg or az network watcher test-ip-flow), and the fix. Finish with az group delete for cleanup.' },
        ],
        expected: ['A practice-assessment score by domain', 'Every wrong answer explained, grouped by domain, with a Learn page to confirm', 'One sandbox lab done on the weakest gap'],
        verify: 'Confirm each explanation on the Microsoft Learn page Claude names. Where they disagree, Microsoft Learn is right.',
        atWork: 'The same debrief works after any real incident you handled badly: explain what went wrong, find the underlying gap, and practise it in a sandbox.',
        checks: [
          { id: 'practice', label: 'I took the practice assessment under exam conditions', manual: true },
          { id: 'sandbox', label: 'I tried the exam sandbox', manual: true },
          { id: 'debrief', label: 'I debriefed every wrong answer and confirmed on Microsoft Learn', manual: true },
        ],
      },
      {
        id: 'w19-t2-s2', title: 'Readiness check: status per domain and a targeted plan', minutes: 10, source: SRC.az104, files: ['W19_PRACTICE_RESULTS'],
        scenario: 'Your exam is in a week. Give Claude your practice results and get a structured readiness check: status per domain, a sandbox CLI drill for each, a decision and an exam-day checklist.',
        task: ['Read <code>az104-practice-results.txt</code>.', 'Click <b>Run</b>. The output is JSON.', 'Check the thresholds were applied correctly and that the weakest domain gets the most days.'],
        atWork: 'Use the same pattern for any go/no-go decision: explicit thresholds in the prompt, your data, and a structured answer you can check.',
        hint: 'The thresholds are in the system prompt: ready at 80% or more, borderline 65–79%, weak below 65%.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: {
            effort: 'medium',
            format: jsonFormat(obj({
              overall_pct: I,
              domains: arr(obj({ domain: S, latest_pct: I, status: en('ready', 'borderline', 'weak'), sandbox_lab: S, cli_command: S })),
              decision: en('sit_as_planned', 'targeted_revision_then_sit'),
              revision_plan: arr(obj({ day: I, domain: S, focus: S })),
              exam_day_checklist: arr(S),
            })),
          },
          system: L('You are an AZ-104 study coach.', 'Status per domain: ready >= 80%, borderline 65-79%, weak < 65%.', 'Decision: sit_as_planned only if the overall score is 75% or more and no domain is weak; otherwise targeted_revision_then_sit, still inside the booked exam window.', 'For every domain give one sandbox lab and one exact Azure CLI command for a sandbox resource group called rg-lab.', 'The exam-day checklist must follow Microsoft and Pearson VUE rules: no notes, phones or AI assistants during the exam.'),
          messages: user(L('<results>', '{{W19_PRACTICE_RESULTS}}', '</results>', 'Give me my readiness check.')),
        },
        checks: [
          { id: 'weak', label: 'Networking (58%) is weak and identities (82%) is ready', test: (c, h) => { const j = h.json(c); if (!j) return false; const n = j.domains.find((d) => /network/i.test(d.domain)); const i = j.domains.find((d) => /identit/i.test(d.domain)); return !!n && n.status === 'weak' && !!i && i.status === 'ready'; } },
          { id: 'border', label: 'Compute (71%) and storage (76%) are borderline', test: (c, h) => { const j = h.json(c); if (!j) return false; return ['comput', 'storage'].every((k) => { const d = j.domains.find((x) => new RegExp(k, 'i').test(x.domain)); return !!d && d.status === 'borderline'; }); } },
          { id: 'decision', label: 'Decision is targeted revision, then sit (73% overall, one weak domain)', test: (c, h) => { const j = h.json(c); return !!j && j.decision === 'targeted_revision_then_sit'; } },
          { id: 'cli', label: 'The networking drill uses a real az network command', test: (c, h) => { const j = h.json(c); const n = j && j.domains.find((d) => /network/i.test(d.domain)); return !!n && /^az network /.test(n.cli_command.trim()); } },
          { id: 'plan', label: 'Networking gets the most revision days', test: (c, h) => { const j = h.json(c); if (!j) return false; const cnt = {}; j.revision_plan.forEach((p) => { cnt[p.domain] = (cnt[p.domain] || 0) + 1; }); const net = Object.keys(cnt).filter((k) => /network/i.test(k)).reduce((a, k) => a + cnt[k], 0); return net >= 2 && Object.keys(cnt).every((k) => /network/i.test(k) || cnt[k] <= net); } },
          { id: 'rules', label: 'The exam-day checklist forbids AI assistants and notes during the exam', test: (c, h) => { const j = h.json(c); return !!j && j.exam_day_checklist.some((x) => /no (phone|notes|ai)|ai assistant|unauthori/i.test(x)); } },
        ],
        sim: [jsonTurn(READINESS, { input_tokens: 640, output_tokens: 760 })],
      },
      {
        id: 'w19-t2-s3', kind: 'guide', title: 'Exam day, then record the result (EV-RE-08)', minutes: 150, source: SRC.examExp,
        scenario: 'Sit AZ-104 in your exam window. Claude helps you prepare the logistics beforehand and debrief afterwards, never during the exam.',
        task: ['The day before: run prompt 1 and do everything on the checklist, including the OnVUE system test if you sit online.', 'Sit the exam. No Claude, notes or other help: it is proctored.', 'Afterwards: record the result in your credential record the same day. If you failed, run prompt 2 and set the retake date.'],
        prompts: [
          { label: '1 · Logistics checklist', where: 'claude.ai', text: 'I am sitting AZ-104 on [date] at [time, time zone], [online proctored / test centre]. Build a checklist for the day before and the morning: system test, ID, room rules, what to have open and closed, timing for 100 minutes of exam time, and how breaks work (the clock keeps running and I cannot go back to questions I have seen). Keep it to one screen.' },
          { label: '2 · Debrief (after the exam only)', where: 'claude.ai', text: 'I just sat AZ-104. Result: [pass/fail], score [N] (700 to pass). From memory, the topics that felt hardest were: [list, no exam questions reproduced]. Help me: 1) write a 3-line honest result note for my evidence record, 2) if I failed, pick a retake date that respects the retake policy (24 hours after a first attempt) and leaves 2-3 weeks of focused study, 3) list the domains to target first.' },
        ],
        expected: ['Exam sat inside the window', 'Result recorded the same day, pass or fail', 'If failed: a retake date and a target list of domains'],
        verify: 'Check the retake date against the Microsoft exam retake policy page. Do not paste or reconstruct exam questions: that breaks the exam agreement.',
        atWork: 'Recording a failure honestly and planning the fix is the same blameless habit you use for incidents.',
        checks: [
          { id: 'sat', label: 'I sat AZ-104 (EV-RE-08)', manual: true },
          { id: 'recorded', label: 'The result is recorded in my Microsoft credential record and my evidence log', manual: true },
          { id: 'retake', label: 'If I failed: a retake date is set (not hidden)', manual: true },
        ],
      },
    ],
  };

  /* =====================================================================
     Topic 3 — Apply: hand the agent to another pod
     ===================================================================== */
  const HANDOVER = L(
    '# aks-triage-agent · handover pack for Pod Orion',
    '',
    '## Overview',
    'aks-triage-agent triages Azure Monitor alerts for AKS. It runs as the GitHub Actions workflow `agent-run.yml`, triggered by an alert webhook, and writes a summary to the workflow run and to the Log Analytics table `AgentRuns_CL`. Built by Platform Pod Atlas; adopted by Pod Orion for `aks-orion-prod`.',
    '',
    '## Allowed actions',
    '| Tool | Type | What it may do |',
    '|---|---|---|',
    '| `kubectl_get` | read | read pods, deployments, events |',
    '| `get_metrics` | read | read CPU, memory, latency metrics |',
    '| `scale_deployment` | write | scale a deployment up to **10 replicas**, only after human approval |',
    '',
    'Everything else (restart, delete, edit, node actions) is **not allowed**: the agent escalates instead.',
    '',
    '## Human approval',
    '`scale_deployment` posts an approval card in **#ops-approvals**. Nothing changes until a human clicks **Approve**. Approvers for Orion: the Orion on-call engineer.',
    '',
    '## Runbook',
    '1. Alert fires → workflow run starts. Check the run summary in GitHub Actions or query `AgentRuns_CL`.',
    '2. If the agent proposes a scale-up, check the metrics it quotes before approving.',
    '3. If the run fails, rerun once; if it fails again, handle the alert manually and log an issue for Atlas.',
    '',
    '## Escalation',
    '1. PagerDuty rotation **platform-primary**.',
    '2. If no acknowledgement in **15 minutes**: the Atlas Service Lead.',
    '3. Multi-cluster or node-level incidents: escalate straight away (known limits).',
    '',
    '## Kill switch',
    'Set the repository variable `AGENT_ENABLED=false`, or disable the `agent-run` workflow. Both stop new runs immediately.',
    '',
    '## Secrets',
    'The API key is stored in Key Vault `kv-agents-prod`, secret `anthropic-api-key`, and read by the workflow at runtime. A key value was found pasted in the source notes: it has been left out of this pack and **must be rotated** now.',
    '',
    '## Support plan (first two weeks)',
    '- Daily 15-minute check-in with Orion; shared feedback log of wrong or unhelpful runs.',
    '- Atlas fixes prompt or tool issues within 2 working days.',
    '- At the end: agree the before/after numbers (triage time, pages to on-call) for the written confirmation.'
  );

  const t3 = {
    id: 'w19-t3',
    title: 'Apply: hand the agent to another pod and support them',
    programmeItem: 'Apply task · Hand the agent to another pod. Support them using it.',
    blurb: 'An agent is only adopted when another team can run it without you. Package it with Claude: README, allowed actions, human gate, runbook, escalation, kill switch, and a support plan.',
    outcomes: [
      'Produce a handover pack another pod can run the agent from',
      'Make the allowed actions, the human gate and the escalation path explicit and testable',
      'Support the adopting pod through the first weeks and collect before/after numbers',
    ],
    concepts: [
      { t: 'Operable by others', d: 'The test of a handover is whether the other pod can run, pause and escalate the agent with only the pack, without calling you.', ex: 'Orion runs it with only the README' },
      { t: 'Allowed actions table', d: 'List every tool, whether it reads or writes, and its limits. Anything not listed is not allowed.', ex: 'scale_deployment · write · ≤10 · approval' },
      { t: 'Human gate', d: 'Say exactly how a write is approved, where, and by whom in the adopting pod.', ex: 'approval card in #ops-approvals' },
      { t: 'Kill switch', d: 'One documented step that stops the agent at once, which the adopting pod has tested themselves.', ex: 'AGENT_ENABLED=false' },
      { t: 'Secrets by reference', d: 'The pack names where the secret lives (Key Vault and secret name), never its value. A pasted key found in the notes is a key to rotate.', ex: 'kv-agents-prod / anthropic-api-key' },
      { t: 'Support window', d: 'Agree a short period of check-ins and a feedback log, with a fix time, and the numbers you will compare at the end.', ex: '2 weeks · daily check-in · feedback log' },
    ],
    leverage: [
      { t: 'Draft the pack from your notes', d: 'Give Claude your go-live notes, workflow file and tool definitions, and ask for the pack in a fixed template, with secrets left out.' },
      { t: 'Test the pack with Claude', d: 'Ask Claude to act as a new on-call engineer from the other pod and try to answer five "what do I do if…" questions using only the pack. Every gap it finds is a missing section.' },
      { t: 'Triage the feedback log', d: 'During the support window, have Claude group the feedback log into prompt fixes, tool fixes and "working as designed", with a count for each.' },
    ],
    sources: [SRC.agents, SRC.promptBest, SRC.projects],
    quiz: [
      { q: 'The go-live notes contain a pasted API key. What goes in the handover pack?', options: ['The key, so they can test', 'The Key Vault and secret name only, plus a note that the pasted key must be rotated', 'Nothing about secrets'], a: 1, why: 'Refer to secrets by location, never value, and rotate anything that leaked.' },
      { q: 'What proves the handover worked?', options: ['You sent the README', 'The adopting pod runs, pauses and escalates the agent without you', 'The agent has many tools'], a: 1, why: 'Operability by the other team is the test.' },
    ],
    steps: [
      {
        id: 'w19-t3-s1', title: 'Generate the handover pack from your go-live notes', minutes: 12, source: SRC.agents, files: ['W19_AGENT_NOTES'],
        scenario: 'Your notes from the Week 18 go-live are messy and contain a pasted API key. Ask Claude for a handover pack with fixed sections, and make sure the key does not travel with it.',
        task: ['Read <code>agent-handover-notes.txt</code> and spot the pasted key.', 'Click <b>Run</b>.', 'Check the sections, the approval rule for <code>scale_deployment</code>, and that the key value is absent.'],
        atWork: 'Use the same template for every automation you hand over (agents, scripts, pipelines). Reviewers can check the sections quickly, and nothing depends on your memory.',
        hint: 'The system prompt lists the required section headings.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' },
          system: L('You write operational handover packs for SRE teams.', 'Use exactly these Markdown H2 sections: Overview, Allowed actions, Human approval, Runbook, Escalation, Kill switch, Secrets, Support plan (first two weeks).', 'Refer to secrets only by their location. Never copy a secret value; if one appears in the input, say it must be rotated.'),
          messages: user(L('<notes>', '{{W19_AGENT_NOTES}}', '</notes>', 'Write the handover pack for the adopting pod.')),
        },
        checks: [
          { id: 'sections', label: 'Has the Overview, Allowed actions, Human approval, Runbook, Escalation and Kill switch sections', test: (c, h) => ['Overview', 'Allowed actions', 'Human approval', 'Runbook', 'Escalation', 'Kill switch'].every((s) => h.section(c, s)) },
          { id: 'gate', label: 'scale_deployment is a write that needs human approval, with the 10-replica limit', test: (c, h) => /scale_deployment/.test(h.text(c)) && /approv/i.test(h.text(c)) && /\b10\b/.test(h.text(c)) },
          { id: 'escalate', label: 'Escalation names the platform-primary rotation and the 15-minute timeout', test: (c, h) => /platform-primary/.test(h.text(c)) && /15/.test(h.text(c)) },
          { id: 'kill', label: 'The kill switch is documented (AGENT_ENABLED=false or disable the workflow)', test: (c, h) => /AGENT_ENABLED\s*=\s*false|disable the .*workflow/i.test(h.text(c)) },
          { id: 'nosecret', label: 'The pasted key is absent and flagged for rotation', test: (c, h) => !/sk-ant-/.test(h.text(c)) && /rotat/i.test(h.text(c)) && /kv-agents-prod/.test(h.text(c)) },
        ],
        sim: [textTurn(HANDOVER, { input_tokens: 560, output_tokens: 760 })],
      },
      {
        id: 'w19-t3-s2', kind: 'guide', title: 'Hand over, test the pack, and support the adopting pod', minutes: 90, source: SRC.agents,
        scenario: 'Give the agent and its pack to another pod. Test the pack with Claude as a newcomer, walk them through a kill-switch test, and run a two-week support window.',
        task: ['Run prompt 1 in a Claude Project that contains only the handover pack, and fix every gap Claude finds.', 'Hold a 30-minute walkthrough with the adopting pod; they run the kill switch and one approved scale-up in their non-production cluster.', 'During the support window, keep a feedback log and use prompt 2 at the end of each week.'],
        prompts: [
          { label: '1 · Newcomer test of the pack', where: 'claude.ai', text: 'You are an on-call engineer in another pod who has never seen this agent. Using ONLY the handover pack in this Project, answer: 1) The agent proposes scaling payments-api to 14 replicas. What do you do? 2) The workflow fails twice. What now? 3) It is 03:00 and nobody acknowledges the page. Who is next? 4) How do you stop the agent right now? 5) Where is the API key? For each answer, quote the section you used, or say "NOT IN PACK".' },
          { label: '2 · Weekly feedback triage', where: 'claude.ai', text: 'Here is this week\'s feedback log from the adopting pod (redacted):\n[paste]\nGroup the items into: prompt fix, tool fix, documentation fix, working as designed. Count each group, propose the top 3 fixes with an owner, and draft a 5-line update for the adopting pod lead.' },
        ],
        expected: ['Every "NOT IN PACK" answer fixed in the pack', 'Kill switch and one approved action tested by the adopting pod themselves', 'A weekly feedback summary, with fixes owned and dated'],
        verify: 'Watch the adopting pod run the kill switch themselves; do not do it for them. Compare the pack against the workflow file to confirm the tools and limits match.',
        atWork: 'This is how an internal tool becomes a platform capability: another team can run it, and there is a feedback loop.',
        checks: [
          { id: 'test', label: 'The newcomer test found no remaining "NOT IN PACK" answers', manual: true },
          { id: 'walk', label: 'The adopting pod ran the kill switch and one approved action themselves', manual: true },
          { id: 'support', label: 'I ran the support window with a feedback log and weekly summaries', manual: true },
        ],
      },
    ],
  };

  /* =====================================================================
     Topic 4 — Apply: publish the prompt pack
     ===================================================================== */
  const SKILL_MD = L(
    '```markdown',
    '---',
    'name: sre-incident-summary',
    'description: Summarize an incident for the incident channel or a postmortem from pasted logs, alerts and notes. Use when someone asks to summarize an incident, write an incident update, or draft the timeline for a postmortem.',
    '---',
    '',
    '# SRE incident summary',
    '',
    '## Before you start',
    '- Check the input for secrets, keys, connection strings, customer data and internal IPs. If you find any, tell the user and replace them with <REDACTED> before continuing.',
    '',
    '## Steps',
    '1. Put the pasted logs and notes in <documents> and quote the lines you rely on first.',
    '2. Write the summary in the format below. Mark anything you inferred as [INFERRED].',
    '3. Classify severity with our policy: SEV1 customer-facing outage, SEV2 degraded but serving, SEV3 no user impact.',
    '4. Suggest only read-only next checks; any change goes to a human for approval.',
    '',
    '## Output format',
    '**Impact** · **Severity** · **Likely cause** · **Evidence (quotes)** · **Next checks** · **Owner**',
    '',
    '## Example',
    'Input: AKS alert, 1 of 3 payments-api pods OOMKilled, p95 +40%, no user errors.',
    'Output: Impact: slower payments, no failures · Severity: SEV2 · Likely cause: memory limit too low [INFERRED] · …',
    '```',
    '',
    'Package it as `sre-incident-summary/SKILL.md` (the folder name matches `name`), zip the folder itself, and upload it under Customize > Skills.'
  );

  const t4 = {
    id: 'w19-t4',
    title: 'Apply: publish your prompt pack so another team can adopt it',
    programmeItem: 'Apply task · Publish your prompt pack so another team can adopt it.',
    blurb: 'Your prompt pack is only reusable when others can install it. Package it as a Claude Skill (or a plugin of several skills), or as a shared Project, then share or publish it to your organization.',
    outcomes: [
      'Choose between a Skill, a plugin and a Project for your prompt pack',
      'Write a valid SKILL.md with a description that triggers reliably',
      'Share or publish it, and test it with someone from another team',
    ],
    concepts: [
      { t: 'Skill', d: 'A folder with a SKILL.md (YAML frontmatter with name and description, then instructions) and optional references, assets and scripts. Claude loads it when a request matches the description.', ex: 'sre-incident-summary/SKILL.md' },
      { t: 'The description decides', d: 'Claude sees only the name and description before it decides to load a skill, so include the words people will actually use.', ex: '"Use when someone asks to summarize an incident…"' },
      { t: 'Name rules', d: 'The name uses lowercase letters, numbers and hyphens (up to 64 characters) and must match the folder name. Upload a ZIP whose top level is that folder.', ex: 'zip -r sre-incident-summary.zip sre-incident-summary/' },
      { t: 'Plugin', d: 'A package of several skills, plus connectors, commands and agents, installed as one unit. Good for a whole team pack.', ex: 'sre-pack plugin: 5 skills' },
      { t: 'Share or publish', d: 'On Team and Enterprise plans you can share a skill or plugin with specific people, or publish it to your organization library, where an Owner may need to review it.', ex: 'Share → Publish to org' },
      { t: 'Project instead', d: 'A Project gives always-loaded background knowledge and instructions for chats in it, which is better for reference material than for task procedures.', ex: 'Project: "Platform runbooks"' },
    ],
    leverage: [
      { t: 'Let Claude package it', d: 'Turn on the skill-creator skill and ask Claude to turn each prompt in your pack into a skill with a good description and an example.' },
      { t: 'Measure, don\'t assume', d: 'Use skill-creator (in Cowork or Claude Code) to run test prompts with and without your skill and compare the results before you publish.' },
      { t: 'One pack, every surface', d: 'Skills follow an open specification and also work in Claude Code (~/.claude/skills or a project\'s .claude/skills), so the same pack helps in chat and in the terminal.' },
    ],
    sources: [SRC.skills, SRC.skillHow, SRC.pluginShare, SRC.plugins, SRC.ccSkills, SRC.projects],
    quiz: [
      { q: 'What does Claude read before deciding to load a skill?', options: ['The whole SKILL.md', 'Only the skill\'s name and description', 'Every script in the folder'], a: 1, why: 'The description is the only part seen before loading, so it must describe when to use the skill.' },
      { q: 'Which name is valid for a skill?', options: ['SRE Incident Summary', 'sre-incident-summary', 'sre_incident_summary!'], a: 1, why: 'Lowercase letters, numbers and hyphens only, matching the folder name.' },
    ],
    steps: [
      {
        id: 'w19-t4-s1', title: 'Turn a pack prompt into a valid SKILL.md', minutes: 8, source: SRC.skillHow,
        scenario: 'Turn your team\'s incident-summary prompt into a skill another team can install. Claude writes the SKILL.md; the checks confirm the frontmatter is valid and the safety steps are included.',
        task: ['Click <b>Run</b>.', 'Check the frontmatter: <code>name</code> matches the folder and <code>description</code> says when to use it.', 'Save it as <code>sre-incident-summary/SKILL.md</code> for the next step.'],
        atWork: 'Every prompt your team reuses more than weekly is a candidate skill: it gives consistent output for everyone, and the redaction step travels with it.',
        hint: 'The frontmatter needs both name and description between two --- lines.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'low' },
          system: 'You write Claude Skills that follow the Agent Skills specification: YAML frontmatter with name (lowercase letters, numbers, hyphens) and description, then Markdown instructions under 500 lines.',
          messages: user(L('Turn this team prompt into a skill named sre-incident-summary:', '"Summarize these logs for an incident channel: impact, severity (SEV1 outage, SEV2 degraded, SEV3 no user impact), likely cause, evidence, next step. Remove secrets first."', 'The description must say when to use it. Include a redaction step, a quotes-first step, an output format and one short example. Return the SKILL.md in a code block and one line on how to package it.')),
        },
        checks: [
          { id: 'front', label: 'Valid frontmatter: name sre-incident-summary and a description', test: (c, h) => /(^|\n)---\s*\nname:\s*sre-incident-summary\s*\ndescription:\s*\S.{20,}\n---/.test(h.text(c)) },
          { id: 'when', label: 'The description says when to use the skill', test: (c, h) => { const m = h.text(c).match(/\ndescription:\s*(.+)\n/); return !!m && /use when|when (someone|the user|asked)/i.test(m[1]); } },
          { id: 'redact', label: 'Includes a redaction step for secrets', test: (c, h) => /redact/i.test(h.text(c)) && /secret/i.test(h.text(c)) },
          { id: 'sev', label: 'Keeps the team\'s severity definitions', test: (c, h) => /SEV1/.test(h.text(c)) && /SEV2/.test(h.text(c)) && /SEV3/.test(h.text(c)) },
          { id: 'zip', label: 'Explains packaging: the folder name matches, and you zip the folder', test: (c, h) => /zip/i.test(h.text(c)) && /folder/i.test(h.text(c)) },
        ],
        sim: [textTurn(SKILL_MD, { input_tokens: 220, output_tokens: 480 })],
      },
      {
        id: 'w19-t4-s2', kind: 'guide', title: 'Package, test and publish the pack', minutes: 60, source: SRC.pluginShare,
        scenario: 'Package your Week 3 prompt pack as skills (bundled into a plugin if there are several), test it, and get it to another team through sharing or your organization library.',
        task: ['Turn on skill-creator under Customize > Skills and run prompt 1 with your prompt pack.', 'Test each skill with prompt 2 in Cowork (or Claude Code) and fix the descriptions that do not trigger.', 'Share the skill or plugin with the other team\'s lead, or use Publish to org; then have them run prompt 3.'],
        prompts: [
          { label: '1 · Build the skills', where: 'claude.ai', text: 'Use the skill-creator skill. Here is my team\'s prompt pack (redacted):\n[paste the 5-8 prompts]\nTurn each into a separate skill with a name in lowercase-hyphen form, a description that says when to use it in words an SRE would type, a redaction step, and one example. If there are several, propose a plugin called sre-prompt-pack that bundles them.' },
          { label: '2 · Evaluate with and without the skill', where: 'Cowork', text: 'Use skill-creator to evaluate the sre-incident-summary skill: run these 3 test prompts with and without the skill, compare the results, and tell me whether the skill improves the output and whether it triggered each time.\n[paste 3 realistic, redacted test inputs]' },
          { label: '3 · Adopting team try-out', where: 'claude.ai', text: 'I have just installed the sre-prompt-pack from another team. Summarize this incident for our channel:\n[paste a redacted alert and logs from your own service]\nThen tell me which skill you used.' },
        ],
        expected: ['Valid skills (and optionally a plugin) that pass validation', 'Evidence that each skill triggers and improves the output', 'The other team has installed it and used it on their own incident'],
        verify: 'Validate the skill folder (for example with claude plugin validate for a plugin) and check the name and description rules against the Create custom skills docs before sharing.',
        atWork: 'A published pack spreads your best prompts beyond your pod, and the adopting team\'s usage is evidence for the AI ladder.',
        checks: [
          { id: 'package', label: 'My prompt pack is packaged as skills or a plugin (or a shared Project)', manual: true },
          { id: 'eval', label: 'I evaluated at least one skill with and without it', manual: true },
          { id: 'adopted', label: 'Another team installed it and used it on real work', manual: true },
        ],
      },
    ],
  };

  /* =====================================================================
     Topic 5 — Apply: Support → Advisory insight
     ===================================================================== */
  const INSIGHT = {
    title: 'Manual TLS certificates are Contoso Retail\'s main reliability risk, and it grows with next quarter\'s 12 new apps',
    what_we_saw: 'In the last 90 days, 9 of 14 P2 incidents (64%) came from TLS certificate expiry or custom-domain binding failures on App Service. Certificates are bought, stored and uploaded by hand, with no expiry alerting.',
    evidence: [
      { metric: 'P2 incidents caused by certificate expiry or binding', value: '9 of 14 (64%)', source: 'Support incident records, last 90 days' },
      { metric: 'Customer-visible outage time from certificate issues', value: '2 outages, 47 minutes total, checkout unavailable', source: 'Support incident records' },
      { metric: 'Engineer toil on manual renewal and rebinding', value: '31 hours', source: 'Support time tracking' },
      { metric: 'Planned growth', value: '12 more App Service apps with custom domains next quarter', source: 'Last QBR notes' },
    ],
    what_it_means: 'Checkout outages are a direct revenue and customer-trust risk. With 12 more apps planned, the same manual process will likely produce more expiry incidents and more toil unless certificate management is automated before the new apps go live. This is a platform decision for the client, not something Support can fix alone.',
    recommended_conversation: {
      audience: 'Client platform owner and delivery lead, with our Advisory lead',
      opening_question: 'Before the 12 new apps go live, how do you want certificates to be issued, renewed and monitored?',
      options: [
        'Automate: managed certificates or certificates held in Key Vault with automatic renewal, plus expiry alerts',
        'Minimum step: expiry alerting and an owner for every certificate now, automation before the new apps launch',
        'Keep manual renewal, and accept the risk and the toil explicitly in writing',
      ],
    },
    confidence: 'high',
  };

  const t5 = {
    id: 'w19-t5',
    title: 'Apply: Support → Advisory, package one operational insight',
    programmeItem: 'Cross-pillar · SUPPORT → ADVISORY. Package one platform or operational insight for Advisory: what we saw, and what it means for the client conversation.',
    blurb: 'Support sees patterns that Advisory can turn into a better client conversation. Package one: what we saw, the evidence, what it means for the client, and the conversation to have.',
    outcomes: [
      'Pick one recurring operational pattern worth a client conversation',
      'Express it as evidence and business meaning, not raw technical detail',
      'Hand Advisory a structured insight and a proposed conversation',
    ],
    concepts: [
      { t: 'Pattern, not incident', d: 'One incident is a story; a repeated cause across many is an insight. Count it.', ex: '9 of 14 P2s from certificates' },
      { t: 'Evidence with sources', d: 'Every claim has a number and where it came from, so Advisory can use it with confidence in front of the client.', ex: '31 h toil · time tracking' },
      { t: 'What it means', d: 'Translate into the client\'s terms: revenue, customer trust, delivery risk, cost, especially against their roadmap.', ex: 'checkout down 47 min' },
      { t: 'A conversation, not a sales pitch', d: 'Offer an opening question and 2–3 options, including accepting the risk. Advisory owns the conversation.', ex: '"How do you want certificates handled?"' },
      { t: 'Client data hygiene', d: 'Keep contact details and anything confidential out of the insight. Use the client name only where the audience is allowed to see it.', ex: 'no emails in the pack' },
    ],
    leverage: [
      { t: 'Find the pattern', d: 'Export 90 days of incidents from your tracker (redacted) and ask Claude to group them by root cause with counts and toil hours.' },
      { t: 'Translate for the client', d: 'Ask Claude to rewrite the finding for a non-technical audience against the client\'s own roadmap, and check it still matches the numbers.' },
      { t: 'A reusable insight format', d: 'Use the same JSON structure every time, so Advisory can collect insights across clients and spot themes.' },
    ],
    sources: [SRC.sloWorkbook, SRC.structured, SRC.promptBest],
    quiz: [
      { q: 'Which is an Advisory insight rather than an incident report?', options: ['"Cert expired on app-orders at 02:00"', '"9 of 14 P2s in 90 days came from manual certificates, and 12 new apps are planned"', '"We restarted the app"'], a: 1, why: 'A counted pattern linked to the client\'s plans is what Advisory can act on.' },
      { q: 'The source data includes the client contact\'s email. Where does it go?', options: ['In the evidence', 'Nowhere in the insight', 'In the title'], a: 1, why: 'Keep personal data out: the insight needs evidence, not contacts.' },
    ],
    steps: [
      {
        id: 'w19-t5-s1', title: 'Structure the insight for Advisory', minutes: 10, source: SRC.structured, files: ['W19_OPS_SIGNALS'],
        scenario: 'Support has 90 days of signals for a client. Ask Claude for a structured insight Advisory can take into the next client conversation.',
        task: ['Read <code>client-ops-signals.txt</code>. Note the contact email that must not travel.', 'Click <b>Run</b>. The output is JSON.', 'Check that the evidence numbers match the source and that "what it means" is in business terms.'],
        atWork: 'This is how Support earns a seat in client conversations: counted patterns with evidence and a proposed conversation, delivered in a format Advisory can reuse.',
        hint: 'Count the certificate incidents out of the total, and link them to the roadmap.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: {
            effort: 'medium',
            format: jsonFormat(obj({
              title: S,
              what_we_saw: S,
              evidence: arr(obj({ metric: S, value: S, source: S })),
              what_it_means: S,
              recommended_conversation: obj({ audience: S, opening_question: S, options: arr(S) }),
              confidence: en('high', 'medium', 'low'),
            })),
          },
          system: 'You help a Support team package operational insights for Advisory colleagues. Use only the data given, give a source for every number, explain the meaning in business terms for the client, and never include personal contact details.',
          messages: user(L('<signals>', '{{W19_OPS_SIGNALS}}', '</signals>', 'Package the single most important insight for Advisory.')),
        },
        checks: [
          { id: 'pattern', label: 'Identifies the certificate pattern: 9 of 14 P2s (64%)', test: (c, h) => { const j = h.json(c); if (!j) return false; const s = JSON.stringify(j); return /certificate|tls/i.test(j.what_we_saw) && (/9 of 14/.test(s) || /64\s*%/.test(s)); } },
          { id: 'evidence', label: 'Evidence includes the 31 hours of toil and the 47 minutes of outage, each with a source', test: (c, h) => { const j = h.json(c); if (!j) return false; const e = JSON.stringify(j.evidence); return /31/.test(e) && /47/.test(e) && j.evidence.every((x) => x.source && x.source.trim().length > 3); } },
          { id: 'meaning', label: '"What it means" links to the client roadmap (12 new apps) and business impact', test: (c, h) => { const j = h.json(c); return !!j && /12/.test(j.what_it_means) && /revenue|customer|trust|risk|cost/i.test(j.what_it_means); } },
          { id: 'conv', label: 'The recommended conversation has an opening question and at least 2 options', test: (c, h) => { const j = h.json(c); return !!j && /\?/.test(j.recommended_conversation.opening_question) && j.recommended_conversation.options.length >= 2; } },
          { id: 'pii', label: 'The client contact\'s email and name are left out', test: (c, h) => !/jane\.doe|@contoso\.example|Jane Doe/i.test(h.text(c)) },
        ],
        sim: [jsonTurn(INSIGHT, { input_tokens: 480, output_tokens: 620 })],
      },
      {
        id: 'w19-t5-s2', kind: 'guide', title: 'Package a real insight and hand it to Advisory', minutes: 45, source: SRC.sloWorkbook,
        scenario: 'Do the same with your own client or platform: find one pattern in 90 days of Support data, structure it, and hand it to Advisory as a one-page brief.',
        task: ['Export 90 days of incidents and time logs, and redact contacts, secrets and customer data.', 'Run prompt 1 to find the pattern, then prompt 2 to write the brief in Word.', 'Walk the Advisory lead through it and record their response.'],
        prompts: [
          { label: '1 · Find the pattern', where: 'claude.ai', text: 'Here are 90 days of redacted incident records and toil logs for [client/platform]:\n[paste CSV or table]\nGroup incidents by root cause. For each group give count, share of total, customer-visible minutes and toil hours. Which one pattern matters most given this roadmap: [paste roadmap points]? Show your working as a table.' },
          { label: '2 · One-page brief', where: 'Claude for Word', text: 'Write a one-page brief for our Advisory lead with these headings: What we saw · Evidence (table with source per number) · What it means for the client · Recommended conversation (opening question, 2-3 options including accepting the risk) · Confidence. Business language, no jargon, no personal contact details.' },
        ],
        expected: ['One counted pattern with sources', 'A one-page brief in the insight structure', 'Advisory\'s response recorded'],
        verify: 'Recalculate every number in the brief from the source export before sending; Advisory will repeat them to the client.',
        atWork: 'Do this once a quarter per client and Support becomes a source of Advisory work, not only a cost centre.',
        checks: [
          { id: 'pattern', label: 'I found one counted pattern in real, redacted Support data', manual: true },
          { id: 'brief', label: 'I wrote the one-page brief and checked every number', manual: true },
          { id: 'handed', label: 'I handed it to Advisory and recorded their response', manual: true },
        ],
      },
    ],
  };

  PL.addWeek({
    week: 19,
    title: 'Advanced prompting, the AZ-104 exam, and handing over what you built',
    stream: 'adoption',
    hours: 9,
    focus: 'Advanced prompt engineering (long context, chaining, structured outputs, evaluation), sit AZ-104 in the exam window, hand the agent to another pod, publish the prompt pack, and give Advisory one operational insight.',
    apply: 'Hand the agent to another pod. Support them using it. Publish your prompt pack so another team can adopt it. SUPPORT → ADVISORY: package one platform or operational insight for Advisory: what we saw, and what it means for the client conversation.',
    milestone: { id: 'EV-RE-08', title: 'AZ-104 exam sat', reviewer: 'Microsoft credential record', passes: 'AZ-104 sat and the result recorded. A fail is recorded, not hidden, and a retake date set.' },
    topics: [t1, t2, t3, t4, t5],
  });
})();
