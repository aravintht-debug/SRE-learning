/* Week 5 · Root cause: 5 Whys, Pareto and Ishikawa, blameless postmortems, SLOs and error budgets.
   Follows the week01.js template: briefing (official sources) + leverage (Claude for DevOps/Cloud) + steps. */
(function () {
  'use strict';
  const PL = window.PL;
  const { ADAPTIVE, user, L, obj, arr, en, S, N, I, jsonFormat, textTurn, jsonTurn, think } = PL.B;

  const SRC = {
    sreBook: { label: 'Google SRE Book · Ch. 15 Postmortem Culture: Learning from Failure (free)', url: 'https://sre.google/sre-book/postmortem-culture/' },
    asq: { label: 'ASQ · What is root cause analysis?', url: 'https://asq.org/quality-resources/root-cause-analysis' },
    pdHome: { label: 'PagerDuty Postmortem Documentation (free, Apache-2.0)', url: 'https://postmortems.pagerduty.com/' },
    pdBlameless: { label: 'PagerDuty · The blameless postmortem', url: 'https://postmortems.pagerduty.com/culture/blameless/' },
    pdWriting: { label: 'PagerDuty · Writing a postmortem, step by step', url: 'https://postmortems.pagerduty.com/how_to_write/writing/' },
    pdTemplate: { label: 'PagerDuty · Postmortem template', url: 'https://postmortems.pagerduty.com/resources/post_mortem_template/' },
    workbookSlo: { label: 'Google SRE Workbook · Ch. 2 Implementing SLOs (free)', url: 'https://sre.google/workbook/implementing-slos/' },
    tools: { label: 'Claude docs · Tool use overview', url: 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview' },
    structured: { label: 'Claude docs · Structured outputs', url: 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs' },
  };

  /* ---- lab files (synthetic) ---- */
  PL.PLACEHOLDERS.W05_INCIDENT = L(
    'Incident INC-2291 · checkout.contoso.example · 2026-05-12 (synthetic lab data)',
    'Impact: 47 minutes (09:12-09:59 UTC) of TLS handshake failures for all browser clients. About 3,100 checkout attempts failed. The mobile app retried and partly succeeded.',
    'Architecture: Azure Application Gateway agw-shop-prod (WAF_v2) terminates TLS with a certificate from Key Vault kv-shop-prod (certificate "checkout-tls"). The Terraform module modules/appgw manages the gateway. Key Vault auto-renewal is on for the certificate.',
    '',
    'Timeline (UTC):',
    '  2026-04-11        Key Vault auto-renews checkout-tls and creates a new version. The near-expiry email for the old version goes to platform-alerts@contoso.example, a shared mailbox that is not routed to on-call.',
    '  2026-05-12 09:12  The old certificate version expires. Browsers show NET::ERR_CERT_DATE_INVALID.',
    '  09:19             Support tickets spike. No monitoring alert fires: the synthetic probe checks for HTTP 200 only and has TLS validation disabled.',
    '  09:24             Priya (on-call) is paged by the support lead and confirms the expired certificate with openssl s_client.',
    '  09:38             Marco finds the listener references a versioned secret ID (https://kv-shop-prod.vault.azure.net/secrets/checkout-tls/3f9c...). In chat he writes: "my module change last quarter pinned this, my bad".',
    '  09:51             Jonas points the listener at the versionless secret ID with az network application-gateway ssl-cert update.',
    '  09:59             TLS handshakes succeed and errors return to baseline.',
    '',
    'Facts:',
    '- modules/appgw uses azurerm_key_vault_certificate.checkout.secret_id (versioned) instead of versionless_secret_id.',
    '- The module pull-request checklist has no item for certificate references, and the module has no test for it.',
    '- There is no alert on the expiry date of the certificate actually served by the endpoint.',
    '- Two similar near-misses in 2025 (other hostnames) were fixed by hand, with no postmortem.'
  );
  PL.FILE_LABELS.W05_INCIDENT = 'inc-2291-notes.txt';

  const PARETO_CATS = [
    ['disk-full', 14, 'elastic-data'], ['backup-failure', 10, 'pbs-backup'], ['pod-oomkilled', 6, 'checkout-api'], ['cert-expiry', 4, 'agw-shop-prod'],
    ['terraform-drift', 3, 'platform-iac'], ['dns', 1, 'azure-dns'], ['nsg-change', 1, 'vnet-shop'], ['other', 1, 'misc'],
  ];
  const paretoRows = (() => {
    const left = PARETO_CATS.map((c) => c[1]);
    const rows = [];
    let i = 0;
    while (left.some((n) => n > 0)) {
      PARETO_CATS.forEach((c, k) => {
        if (left[k] <= 0) return;
        left[k]--;
        const off = Math.floor(i * 1.5);
        const date = off < 30 ? '2026-04-' + String(off + 1).padStart(2, '0') : '2026-05-' + String(off - 29).padStart(2, '0');
        rows.push(['INC-' + (4101 + i), date, c[2], c[0]].join(','));
        i++;
      });
    }
    return rows;
  })();
  PL.PLACEHOLDERS.W05_INCIDENT_LOG = L('id,date,service,category', ...paretoRows);
  PL.FILE_LABELS.W05_INCIDENT_LOG = 'incidents-apr-may-2026.csv';

  const NAMES = /Priya|Marco|Jonas/;
  const BLAME = /human error|careless|should have|negligen|his fault|her fault|their fault/i;

  const TOOL_CALC = {
    name: 'calculator',
    description: 'Evaluate an arithmetic expression exactly (+ - * / ^ and parentheses). Use it for every error budget number instead of mental arithmetic.',
    strict: true,
    input_schema: obj({ expression: { type: 'string', description: 'For example: 30 * 24 * 60 * (1 - 0.999)' } }),
  };

  /* =====================================================================
     Topic 1 — Solve root cause issues: 5 Whys, Pareto, Ishikawa
     ===================================================================== */
  const RCA_SCHEMA = obj({
    problem: S,
    whys: arr(obj({ n: I, question: S, answer: S, evidence: S })),
    root_cause: S,
    root_cause_type: en('process', 'technology', 'monitoring', 'skills', 'environment', 'dependency'),
    fishbone: arr(obj({ category: en('Process', 'Technology', 'Monitoring', 'People and skills', 'Environment', 'Dependencies'), causes: arr(S) })),
    actions: arr(obj({ action: S, owner_team: S, type: en('prevent', 'detect', 'mitigate'), addresses: S })),
    blame_check: S,
  });
  const RCA_SIM = {
    problem: 'Browser clients could not complete TLS handshakes with checkout.contoso.example for 47 minutes on 2026-05-12, failing about 3,100 checkouts.',
    whys: [
      { n: 1, question: 'Why did TLS handshakes fail?', answer: 'The Application Gateway listener served a certificate that had expired at 09:12 UTC.', evidence: 'openssl s_client output at 09:24; NET::ERR_CERT_DATE_INVALID in browsers' },
      { n: 2, question: 'Why was an expired certificate served when Key Vault had already renewed it?', answer: 'The listener referenced a specific (versioned) Key Vault secret ID, so the new version created on 2026-04-11 was never picked up.', evidence: 'Listener secret ID ends in /checkout-tls/3f9c...; renewal event on 2026-04-11' },
      { n: 3, question: 'Why did the listener use a versioned secret ID?', answer: 'The shared Terraform module modules/appgw passes azurerm_key_vault_certificate.secret_id instead of versionless_secret_id.', evidence: 'modules/appgw source' },
      { n: 4, question: 'Why did the module ship with a versioned reference?', answer: 'The module review checklist and tests have no check for how certificates are referenced, so the pattern passed review.', evidence: 'PR checklist; no module test for certificate references' },
      { n: 5, question: 'Why did nothing warn us before customers did?', answer: 'The near-expiry notice went to an unrouted shared mailbox, and the synthetic probe checks HTTP 200 with TLS validation off, so no signal reached on-call. Two earlier near-misses were fixed by hand without follow-up.', evidence: 'Mailbox routing; probe config; 2025 near-misses with no postmortem' },
    ],
    root_cause: 'Certificate rotation depended on a versioned Key Vault reference in the shared Terraform module, and no end-to-end check watched the certificate the endpoint actually serves, so an automatic renewal silently had no effect.',
    root_cause_type: 'process',
    fishbone: [
      { category: 'Technology', causes: ['Versioned secret ID in modules/appgw', 'Application Gateway does not follow new versions of a versioned reference'] },
      { category: 'Process', causes: ['Module review checklist has no certificate-reference item', 'Near-misses in 2025 fixed by hand without a postmortem'] },
      { category: 'Monitoring', causes: ['Synthetic probe ignores TLS validity', 'No alert on served certificate expiry', 'Near-expiry email routed to an unmonitored mailbox'] },
      { category: 'People and skills', causes: ['Versionless reference behaviour not covered in module onboarding'] },
      { category: 'Dependencies', causes: ['Customer-facing TLS depends on Key Vault renewal plus gateway sync'] },
    ],
    actions: [
      { action: 'Change modules/appgw to use versionless_secret_id and add a module test that fails on versioned certificate references', owner_team: 'Platform engineering', type: 'prevent', addresses: 'Why 3 and 4' },
      { action: 'Add a blackbox probe alert on the served certificate expiry (warn at 14 days, page at 3 days) for every public hostname', owner_team: 'SRE', type: 'detect', addresses: 'Why 5' },
      { action: 'Route Key Vault near-expiry events to the on-call alert pipeline instead of the shared mailbox', owner_team: 'SRE', type: 'detect', addresses: 'Why 5' },
      { action: 'Add "certificate references" to the module PR checklist and run a postmortem for every certificate near-miss', owner_team: 'Platform engineering', type: 'prevent', addresses: 'Why 4 and 5' },
    ],
    blame_check: 'No individual is named. The chat apology is treated as a signal that the module review process let a risky pattern through, not as the cause.',
  };

  const PARETO_SCHEMA = obj({
    total: I,
    categories: arr(obj({ category: S, count: I, percent: N, cumulative_percent: N })),
    vital_few: arr(S),
    first_target: S,
    reasoning: S,
  });
  const paretoSim = (() => {
    let cum = 0;
    const cats = PARETO_CATS.map((c) => { const pct = c[1] / 40 * 100; cum += pct; return { category: c[0], count: c[1], percent: pct, cumulative_percent: cum }; });
    return {
      total: 40,
      categories: cats,
      vital_few: ['disk-full', 'backup-failure', 'pod-oomkilled', 'cert-expiry'],
      first_target: 'disk-full',
      reasoning: 'Four of eight categories cause 85% of the 40 incidents. disk-full alone is 35% (14 incidents on elastic-data), so ILM and capacity alerting on the Elastic data nodes is the first root cause analysis to run; backup-failure (25%) is next.',
    };
  })();

  const t1 = {
    id: 'w05-t1',
    title: 'Solve root cause issues: 5 Whys, Pareto and Ishikawa',
    programmeItem: 'Solve Root Cause Issues · 5 Whys, Pareto, Ishikawa (free equivalent: Google SRE Book ch. 15 and ASQ root cause analysis resources)',
    blurb: 'Stop fixing symptoms. Use Pareto to choose which recurring problem to attack, a fishbone to map every contributing cause, and 5 Whys to follow one chain to a systemic cause you can fix.',
    outcomes: [
      'Run a 5 Whys that ends at a systemic, fixable cause instead of a person',
      'Build an Ishikawa (fishbone) diagram with IT-relevant categories',
      'Use a Pareto analysis of incident data to pick the problem worth solving first',
    ],
    concepts: [
      { t: 'Symptom, cause, root cause', d: 'The symptom is what users saw; a cause explains it; the root cause is the deepest cause you can change so the problem, and its cousins, stop happening.', ex: 'expired cert → versioned reference → no check' },
      { t: '5 Whys', d: 'Ask "why" repeatedly, each answer backed by evidence. Five is a guide, not a rule: stop when the answer is a process or design you can change. If an answer is "someone made a mistake", ask why the system allowed it.', ex: 'Why did review not catch it?' },
      { t: 'Ishikawa (fishbone)', d: 'A diagram with the problem at the head and cause categories as bones. For platform work, use categories such as Process, Technology, Monitoring, People and skills, Environment and Dependencies.', ex: 'Monitoring: probe ignores TLS validity' },
      { t: 'Pareto (80/20)', d: 'Count incidents by category, sort descending, and add a cumulative percentage. The few categories that cover about 80% are where root cause work pays back most.', ex: 'disk-full + backup-failure = 60%' },
      { t: 'Evidence over opinion', d: 'Every link in the chain needs evidence: a log line, a config, a timeline entry. Unproven links are hypotheses to test, not causes.', ex: 'evidence: modules/appgw source' },
      { t: 'Blameless by design', d: 'The SRE Book assumes people acted with good intentions on the information they had. RCA looks for the gaps that made the error possible or likely.', ex: '"any engineer could have merged this"' },
    ],
    leverage: [
      { t: 'Claude as the facilitator', d: 'Paste a redacted timeline and ask Claude to run the 5 Whys with you one question at a time, challenging answers that lack evidence or stop at a person.' },
      { t: 'A fishbone in seconds', d: 'Ask Claude to sort every contributing factor into fishbone categories and draw it as a Mermaid diagram or an Artifact you can put in the postmortem.' },
      { t: 'Pareto from raw exports', d: 'Export incidents from your ticketing tool or Grafana alert history, and have Claude (or Claude for Excel) build the counts, cumulative percentage and chart. Check the totals yourself.' },
      { t: 'Structured RCA records', d: 'Use structured outputs so every RCA is JSON with the same fields. That makes recurring causes searchable across incidents.' },
    ],
    sources: [SRC.sreBook, SRC.asq, SRC.pdHome, SRC.structured],
    quiz: [
      { q: 'Your 5 Whys ends with "the engineer forgot to update the certificate". What next?', options: ['Stop: that is the root cause', 'Ask why the system relied on someone remembering, and keep going', 'Name the engineer in the report'], a: 1, why: 'A person is never the root cause. Ask what made the mistake possible and fix that.' },
      { q: 'What is a Pareto analysis for in RCA?', options: ['Proving who caused an incident', 'Choosing which recurring problem categories to work on first', 'Replacing the timeline'], a: 1, why: 'Pareto shows the few categories that cause most incidents, so effort goes where it pays back.' },
      { q: 'Which is a good fishbone category for platform incidents?', options: ['Monitoring', 'Bad luck', 'The on-call engineer'], a: 0, why: 'Categories should describe parts of the system, such as Monitoring, Process or Technology, never individuals.' },
    ],
    steps: [
      {
        id: 'w05-t1-s1', kind: 'guide', title: 'Claude facilitates a 5 Whys and a fishbone', minutes: 30, source: SRC.sreBook,
        scenario: 'Practise on a <b>synthetic</b> incident first: a customer-facing certificate expired even though Key Vault renewed it. Let Claude facilitate the 5 Whys, then build the fishbone, then repeat on one of your own incidents (redacted).',
        task: [
          'Start a new chat in claude.ai (or your "Platform runbooks" Project) and paste prompt 1.',
          'Answer each "why" yourself before Claude suggests one. Push back at least once when an answer lacks evidence.',
          'Run prompt 2 for the fishbone, then prompt 3 on one of your own recent incidents with names, hostnames and secrets removed.',
        ],
        prompts: [
          { label: 'Facilitate the 5 Whys', where: 'claude.ai', text: 'Act as a blameless RCA facilitator. Ask me one "why" at a time and wait for my answer. Challenge any answer that has no evidence or that stops at a person. Stop when we reach a process or design cause we can change.\nIncident (synthetic): for 47 minutes, browsers failed TLS handshakes with our checkout site behind Azure Application Gateway. Key Vault had auto-renewed the certificate a month earlier, but the gateway listener referenced a versioned secret ID from our Terraform module. The near-expiry email went to an unmonitored shared mailbox and our synthetic probe ignores TLS validity. Two similar near-misses last year were fixed by hand.' },
          { label: 'Build the fishbone', where: 'claude.ai', text: 'Now build an Ishikawa diagram for this incident with the categories Process, Technology, Monitoring, People and skills, Environment and Dependencies. Put every contributing factor we found in a category, mark the ones on our causal chain, and render it as a Mermaid diagram in an Artifact. No individual names.' },
          { label: 'Repeat on your own incident', where: 'claude.ai', text: 'Same method on a real incident from my team. I have removed names, hostnames, IPs and secrets. Facilitate the 5 Whys, then the fishbone, and finish with 3 actions: one that prevents, one that detects earlier, one that reduces impact, each with an owning team.\n[paste redacted timeline and facts]' },
        ],
        expected: [
          'A 5-link causal chain ending at a changeable cause (the versioned reference plus the missing served-certificate check)',
          'A fishbone with at least four populated categories and no people as causes',
          'The same analysis on one of your own incidents, with prevent, detect and mitigate actions',
        ],
        verify: 'For each link in the chain, point to the evidence (log, config, timeline entry). Any link without evidence is a hypothesis: mark it as one. Compare your approach with the blameless guidance in SRE Book chapter 15.',
        atWork: 'Use Claude as a neutral facilitator in RCA sessions: it keeps asking why, catches answers that blame a person, and turns the result into a diagram for the postmortem.',
        checks: [
          { id: 'whys', label: 'I completed the 5 Whys on the synthetic incident and challenged at least one answer', manual: true },
          { id: 'fish', label: 'I produced a fishbone Artifact with four or more populated categories', manual: true },
          { id: 'own', label: 'I repeated it on one of my own incidents, redacted', manual: true },
        ],
      },
      {
        id: 'w05-t1-s2', title: 'Structured causal chain and fishbone (JSON)', minutes: 8, source: SRC.structured, files: ['W05_INCIDENT'],
        scenario: 'Turn the incident notes into a structured RCA record: the 5 Whys chain with evidence, the root cause, fishbone categories and owned actions. The notes contain names and an apology in chat; a blameless record leaves them out.',
        task: ['Read <code>inc-2291-notes.txt</code>.', 'Click <b>Run</b>. Claude returns JSON that matches the schema.', 'Check the chain: does each answer have evidence, and does it end at something you can change?'],
        atWork: 'Store RCA records as JSON next to the postmortem. After a few months you can ask Claude which root causes and fishbone categories keep recurring across incidents.',
        hint: 'The root cause is about the module and the missing check, not about who merged the change.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: { effort: 'medium', format: jsonFormat(RCA_SCHEMA) },
          system: 'You are a blameless root cause analysis facilitator for a platform team. Never name or blame individuals: describe roles and systems. Every "why" needs evidence from the notes. The root cause must be a process, design or monitoring gap the team can change.',
          messages: user(L('<incident_notes>', '{{W05_INCIDENT}}', '</incident_notes>', 'Produce the RCA record: at least 5 whys with evidence, the root cause, a fishbone with at least four categories, and actions with an owning team (not a person) that include at least one prevent and one detect action.')),
        },
        checks: [
          { id: 'chain', label: 'At least 5 whys, each with evidence', test: (c, h) => { const j = h.json(c); return !!j && Array.isArray(j.whys) && j.whys.length >= 5 && j.whys.every((w) => w.evidence && w.evidence.trim().length > 3); } },
          { id: 'depth', label: 'The chain reaches the versioned secret reference in the module', test: (c, h) => { const j = h.json(c); return !!j && j.whys.some((w) => /version/i.test(w.answer)) && j.whys.some((w) => /module|terraform/i.test(w.answer)); } },
          { id: 'root', label: 'Root cause is systemic (versioned reference / missing end-to-end check), not a person', test: (c, h) => { const j = h.json(c); return !!j && /version|check|monitor|probe|process/i.test(j.root_cause) && !NAMES.test(j.root_cause) && !/engineer (forgot|made)/i.test(j.root_cause); } },
          { id: 'fish', label: 'Fishbone has at least four categories with causes, including Monitoring', test: (c, h) => { const j = h.json(c); return !!j && j.fishbone.filter((f) => f.causes && f.causes.length).length >= 4 && j.fishbone.some((f) => f.category === 'Monitoring' && f.causes.length); } },
          { id: 'actions', label: 'Actions include a prevent (versionless reference) and a detect (certificate expiry) item, owned by teams', test: (c, h) => { const j = h.json(c); return !!j && j.actions.some((a) => a.type === 'prevent' && /versionless/i.test(a.action)) && j.actions.some((a) => a.type === 'detect' && /expir|probe|blackbox/i.test(a.action)) && j.actions.every((a) => a.owner_team && !NAMES.test(a.owner_team)); } },
          { id: 'blameless', label: 'No individual is named or blamed anywhere in the record', test: (c, h) => { const s = h.text(c); return !NAMES.test(s) && !BLAME.test(s); } },
        ],
        sim: [{ content: [think('Five links with evidence, ending at the module pattern and the missing served-certificate check. Leave out the names and treat the apology as a process signal.'), { type: 'text', text: JSON.stringify(RCA_SIM, null, 2) }], stop_reason: 'end_turn', usage: { input_tokens: 1100, output_tokens: 1250 } }],
      },
      {
        id: 'w05-t1-s3', title: 'Pareto: which recurring problem do we fix first?', minutes: 6, source: SRC.asq, files: ['W05_INCIDENT_LOG'],
        scenario: 'Sixty days of incidents are in <code>incidents-apr-may-2026.csv</code>. Before running more RCAs, find the few categories that cause most of the pain.',
        task: ['Look at the CSV: one row per incident.', 'Click <b>Run</b>. Claude counts, sorts and adds cumulative percentages.', 'Check the top two counts yourself: do they match the file?'],
        atWork: 'Run this monthly on your ticket or alert export (Claude for Excel works well for the chart). It turns "we are always firefighting" into a ranked list of RCAs to run.',
        hint: 'There are 40 rows. Sort descending; the vital few are the categories needed to pass about 80% cumulative.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: { effort: 'medium', format: jsonFormat(PARETO_SCHEMA) },
          system: 'You are an SRE doing a Pareto analysis. Count exactly, sort categories by count descending, give percent and cumulative percent to one decimal place, and choose the vital few as the smallest set of top categories that reaches at least 80% cumulative.',
          messages: user(L('<incidents>', '{{W05_INCIDENT_LOG}}', '</incidents>', 'Do the Pareto analysis by category and tell me which category to run a root cause analysis on first.')),
        },
        checks: [
          { id: 'total', label: 'Counts all 40 incidents', test: (c, h) => { const j = h.json(c); return !!j && j.total === 40 && j.categories.reduce((a, x) => a + x.count, 0) === 40; } },
          { id: 'sorted', label: 'Sorted descending, with disk-full (14) first', test: (c, h) => { const j = h.json(c); return !!j && /disk/i.test(j.categories[0].category) && j.categories[0].count === 14 && j.categories.every((x, i, a) => i === 0 || a[i - 1].count >= x.count); } },
          { id: 'cum', label: 'Cumulative percent after backup-failure is 60%', test: (c, h) => { const j = h.json(c); const b = j && j.categories.find((x) => /backup/i.test(x.category)); return !!b && Math.abs(b.cumulative_percent - 60) <= 0.6; } },
          { id: 'vital', label: 'Vital few are the four categories that reach 85%, and exclude the one-off categories', test: (c, h) => { const j = h.json(c); if (!j) return false; const v = j.vital_few.join(' '); return /disk/.test(v) && /backup/.test(v) && /oom/i.test(v) && /cert/.test(v) && !/dns|nsg|other/.test(v); } },
          { id: 'first', label: 'Picks disk-full as the first RCA target', test: (c, h) => { const j = h.json(c); return !!j && /disk/i.test(j.first_target); } },
        ],
        sim: [jsonTurn(paretoSim, { input_tokens: 900, output_tokens: 420 })],
      },
    ],
  };

  /* =====================================================================
     Topic 2 — Postmortem documentation: blameless postmortems
     ===================================================================== */
  const POSTMORTEM = L(
    '# Postmortem: TLS certificate expiry on checkout (INC-2291)',
    '',
    '**Status:** Draft for review · **Severity:** SEV-2 · **Date:** 2026-05-12 · **Authors:** Platform engineering and SRE',
    '',
    '## Summary',
    'For 47 minutes, browsers could not open a secure connection to checkout.contoso.example because Application Gateway served an expired certificate. Key Vault had renewed the certificate a month earlier, but the gateway listener pointed at the old version through a versioned secret reference in a shared Terraform module. No alert reached on-call before customers noticed.',
    '',
    '## Impact',
    '- **Duration:** 47 minutes (09:12 to 09:59 UTC).',
    '- **Users:** all browser checkouts failed; about 3,100 checkout attempts were lost. The mobile app retried and partly succeeded.',
    '- **Detection:** by customer support tickets at 09:19, not by monitoring.',
    '',
    '## Timeline (UTC)',
    '| Time | Event |',
    '|---|---|',
    '| 2026-04-11 | Key Vault auto-renews checkout-tls (new version). Near-expiry notice goes to a shared mailbox that is not routed to on-call. |',
    '| 2026-05-12 09:12 | The old certificate version expires; browsers report NET::ERR_CERT_DATE_INVALID. |',
    '| 09:19 | Support tickets spike. No alert fires: the synthetic probe checks HTTP 200 with TLS validation off. |',
    '| 09:24 | The on-call engineer is paged by the support lead and confirms the expired certificate with openssl. |',
    '| 09:38 | A platform engineer finds the listener references a versioned secret ID. |',
    '| 09:51 | The listener is updated to the versionless secret ID. |',
    '| 09:59 | Handshakes succeed; error rate back to baseline. Incident resolved. |',
    '',
    '## Root cause',
    'Certificate rotation depended on a versioned Key Vault reference in the shared `modules/appgw` Terraform module (`secret_id` instead of `versionless_secret_id`), so the automatic renewal never reached the gateway. Nothing checked the certificate the endpoint actually serves, so the failure was silent until expiry.',
    '',
    '## Contributing factors',
    '- The module review checklist and tests do not cover how certificates are referenced; any engineer could have merged this pattern.',
    '- Near-expiry notices go to an unmonitored mailbox.',
    '- The synthetic probe ignores TLS validity.',
    '- Two similar near-misses in 2025 were fixed by hand without a postmortem, so the pattern was never addressed.',
    '',
    '## What went well',
    '- The on-call engineer confirmed the cause within 14 minutes of the page.',
    '- The fix was a single, reversible listener change.',
    '',
    '## Action items',
    '| # | Action | Type | Owner | Due |',
    '|---|---|---|---|---|',
    '| 1 | Use `versionless_secret_id` in modules/appgw and add a module test that fails on versioned certificate references | Prevent | Platform engineering | 2026-05-26 |',
    '| 2 | Blackbox alert on served certificate expiry for all public hostnames (ticket at 14 days, page at 3 days) | Detect | SRE | 2026-05-22 |',
    '| 3 | Route Key Vault near-expiry events to the on-call alert pipeline | Detect | SRE | 2026-05-22 |',
    '| 4 | Enable TLS validation on the checkout synthetic probe | Detect | SRE | 2026-05-19 |',
    '| 5 | Add "certificate references" to the module PR checklist; postmortem every certificate near-miss | Prevent | Platform engineering | 2026-05-29 |',
    '',
    '## Lessons learned',
    'Automatic renewal is only as good as the path from the vault to the listener. We now test the served certificate end to end, not just the vault.'
  );

  const t2 = {
    id: 'w05-t2',
    title: 'Postmortem documentation: blameless postmortems',
    programmeItem: 'Postmortem Documentation · blameless postmortems (free equivalent: PagerDuty Postmortem Documentation, Apache-2.0, and Google SRE Book ch. 15)',
    blurb: 'A postmortem is a written record of an incident: impact, timeline, root cause and owned action items. Blameless means it looks at systems and decisions, never at who to punish.',
    outcomes: [
      'Write a postmortem with every standard section from a raw timeline',
      'Rewrite blaming language into blameless, systems-focused language',
      'Produce action items that each have a type, an owning team and a due date',
    ],
    concepts: [
      { t: 'When to write one', d: 'Agree the triggers in advance: user-visible downtime above a threshold, any data loss, on-call intervention such as a rollback, long resolution times, or monitoring that failed to detect the problem.', ex: 'detected by customers → postmortem' },
      { t: 'The sections', d: 'Summary, impact (with numbers), timeline, root cause, contributing factors, what went well, action items and lessons learned. PagerDuty publishes a free template.', ex: 'Impact: 47 min, ~3,100 failed checkouts' },
      { t: 'Blameless language', d: 'Describe roles, not names ("the on-call engineer"). Ask what and how, not why someone did something. Assume a reasonable person acted sensibly with the information they had.', ex: '"any engineer could have merged this"' },
      { t: 'No counterfactuals', d: '"Should have" and "failed to" judge people with hindsight. Replace them with what the system made easy or hard.', ex: 'not "should have checked" → "the checklist has no item"' },
      { t: 'Action items that land', d: 'Each item is specific, has a type (prevent, detect, mitigate), an owning team and a due date, and is tracked like any other work.', ex: '| Detect | SRE | 2026-05-22 |' },
      { t: 'Share it', d: 'A postmortem only helps if people read it. Publish it where the team finds it, and review it in a meeting.', ex: 'postmortem review, then wiki' },
    ],
    leverage: [
      { t: 'First draft from the timeline', d: 'Paste the redacted incident channel export and ask Claude for a draft in your template. You spend your time on accuracy and actions, not formatting.' },
      { t: 'A blameless reviewer', d: 'Ask Claude to flag names, "human error", "should have" and other blaming phrases, and suggest systems-focused rewrites before the document is shared.' },
      { t: 'A postmortem Skill', d: 'Package your template and blameless rules as a Claude Skill, so every postmortem across the team has the same sections and tone.' },
      { t: 'Claude for Word', d: 'Draft directly in the team\'s Word template with Claude for Word, then review as the owner.' },
    ],
    sources: [SRC.pdHome, SRC.pdBlameless, SRC.pdWriting, SRC.pdTemplate, SRC.sreBook],
    quiz: [
      { q: 'Which sentence is blameless?', options: ['"Marco should have used the versionless ID."', '"The module accepted a versioned reference and review had no check for it."', '"Human error caused the outage."'], a: 1, why: 'It describes the system gap, with no names and no hindsight judgement.' },
      { q: 'What must every action item have?', options: ['The name of the person at fault', 'A type, an owning team and a due date', 'A severity of SEV-1'], a: 1, why: 'Owned, dated, typed items are the ones that get done.' },
    ],
    steps: [
      {
        id: 'w05-t2-s1', title: 'Draft a blameless postmortem from a timeline', minutes: 8, source: SRC.pdBlameless, files: ['W05_INCIDENT'],
        scenario: 'Turn the INC-2291 notes into a postmortem ready for review. The notes name three people and include an apology in chat. The checks look for the standard sections, the impact numbers, owned action items, and blameless language.',
        task: ['Read <code>inc-2291-notes.txt</code>.', 'Click <b>Run</b>.', 'Read the draft as the reviewer: would anyone named in the notes feel blamed?'],
        atWork: 'Give Claude your template and the blameless rules in the system prompt (or a Skill), paste the redacted timeline, and review the draft for accuracy before publishing.',
        hint: 'Roles, not names; no "human error" or "should have"; every action has an owner team.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' },
          system: L('You write blameless postmortems for a platform team.', 'Rules: never name individuals (use roles such as "the on-call engineer"); never use "human error", "should have", "careless" or other blaming phrases; focus on systems, process and signals.', 'Use Markdown with these sections: ## Summary, ## Impact (with numbers), ## Timeline (table), ## Root cause, ## Contributing factors, ## What went well, ## Action items (table with Action, Type, Owner, Due), ## Lessons learned. Owners are teams.'),
          messages: user(L('<incident_notes>', '{{W05_INCIDENT}}', '</incident_notes>', 'Draft the postmortem for review.')),
        },
        checks: [
          { id: 'sections', label: 'Has Summary, Impact, Timeline, Root cause and Action items sections', test: (c, h) => ['Summary', 'Impact', 'Timeline', 'Root cause', 'Action items'].every((s) => h.section(c, s)) },
          { id: 'impact', label: 'Impact states the 47 minutes and about 3,100 failed checkouts', test: (c, h) => /47 minutes/.test(h.text(c)) && /3,?100/.test(h.text(c)) },
          { id: 'owners', label: 'Action items table has an Owner column with teams', test: (c, h) => /\|\s*Owner\s*\|/i.test(h.text(c)) && /\|\s*(SRE|Platform engineering)\s*\|/i.test(h.text(c)) },
          { id: 'noname', label: 'No individual from the notes is named', test: (c, h) => !NAMES.test(h.text(c)) },
          { id: 'noblame', label: 'No blaming phrases (human error, should have, careless)', test: (c, h) => !BLAME.test(h.text(c)) },
          { id: 'root', label: 'Root cause names the versioned reference, not a person', test: (c, h) => /versionless|versioned/i.test(h.text(c)) },
        ],
        sim: [textTurn(POSTMORTEM, { input_tokens: 1150, output_tokens: 1180 })],
      },
      {
        id: 'w05-t2-s2', kind: 'guide', title: 'Blameless review in claude.ai and the final draft in Word', minutes: 30, source: SRC.pdTemplate,
        scenario: 'Take a postmortem draft (the lab one, or a real one from your team) through a blameless review with Claude, then produce the final version in your Word template.',
        task: [
          'Paste a draft into claude.ai and run prompt 1. Accept or reject each suggested rewrite yourself.',
          'Run prompt 2 to tighten the action items.',
          'Open your team\'s postmortem template in Word and run prompt 3 with Claude for Word.',
        ],
        prompts: [
          { label: 'Blameless review', where: 'claude.ai', text: 'Review this postmortem draft for blameless language, following the PagerDuty blameless guidance: flag every personal name, "human error", "should have", "failed to", "why did X" phrasing and any sentence that judges a person. For each, give a systems-focused rewrite. Then list any section missing from: Summary, Impact, Timeline, Root cause, Contributing factors, What went well, Action items, Lessons learned.\n[paste draft with secrets and customer data removed]' },
          { label: 'Action items that land', where: 'claude.ai', text: 'Rewrite the action items so each one is specific and verifiable, has a type (prevent, detect or mitigate), an owning team (not a person) and a due date within 30 days. Flag any root cause or contributing factor that has no action.' },
          { label: 'Final draft in Word', where: 'Claude for Word', text: 'Fill this postmortem template from the reviewed draft in my clipboard [paste]. Keep the template headings, put the timeline and action items in tables, and do not add any personal names.' },
        ],
        expected: ['A list of flagged phrases with rewrites you accepted or rejected', 'Action items that each have a type, owner team and due date', 'A final postmortem in your Word template'],
        verify: 'Read the final document once as the person most involved in the incident: nothing should read as blame. Check every timestamp and number against the source timeline or monitoring data.',
        atWork: 'Make the blameless review a standard step before any postmortem is shared. Claude catches the phrases people miss when they are tired after an incident.',
        checks: [
          { id: 'review', label: 'I ran the blameless review and decided on each rewrite', manual: true },
          { id: 'actions', label: 'Every action item has a type, owner team and due date', manual: true },
          { id: 'word', label: 'I produced the final draft in the team template and checked the facts', manual: true },
        ],
      },
    ],
  };

  /* =====================================================================
     Topic 3 — SRE Workbook: SLOs and error budgets
     ===================================================================== */
  const SLO_ASK = L(
    'checkout-api has an availability SLO of 99.9% over a rolling 30-day window.',
    'Use the calculator for every number:',
    '1. How many minutes of full downtime does the error budget allow in 30 days?',
    '2. The window had 12,400,000 valid requests. How many failed requests does the budget allow?',
    '3. 8,060 requests have failed so far in this window. What percentage of the budget is spent, and how many failures remain?',
    '4. INC-2291 was a 47-minute full outage. As a percentage of the 30-day time budget, how big was it?',
    'Then say what our error budget policy should trigger now.'
  );
  const SLO_FINAL = L(
    '## Error budget for checkout-api (SLO 99.9%, 30 days)',
    '',
    '| Question | Calculation | Result |',
    '|---|---|---|',
    '| Time budget | 30 × 24 × 60 × (1 − 0.999) | **43.2 minutes** |',
    '| Request budget | 12,400,000 × 0.001 | **12,400 failed requests** |',
    '| Budget spent | 8,060 / 12,400 | **65%** spent, **4,340** failures left |',
    '| INC-2291 vs time budget | 47 / 43.2 | **108.8%** of the monthly time budget |',
    '',
    '## What this means',
    '- A single 47-minute outage is larger than the whole 30-day time budget, so in time terms the budget was already exhausted by INC-2291.',
    '- On the request-based SLI, 65% of the budget is spent with part of the window left.',
    '',
    '## Error budget policy trigger',
    'With the budget exhausted (or close to it on the request SLI), the policy should **freeze non-urgent feature releases** for checkout-api until the service is back within SLO, and move the team to reliability work: the INC-2291 action items first. Exceptions (security fixes, P0 bugs) need sign-off from the service owner, as the policy defines.'
  );

  const t3 = {
    id: 'w05-t3',
    title: 'SRE Workbook: SLOs and error budgets',
    programmeItem: 'SRE Workbook · SLOs and error budgets (free: Google SRE Workbook, Implementing SLOs)',
    blurb: 'Define reliability from the user\'s point of view with SLIs, set an SLO target, and use the error budget, which is 100% minus the SLO, to decide when to ship features and when to fix reliability.',
    outcomes: [
      'Write SLIs as good events divided by valid events for a real service',
      'Compute an error budget in minutes and in requests, and how much is spent',
      'Draft an error budget policy that says what happens when the budget runs out',
    ],
    concepts: [
      { t: 'SLI', d: 'A service level indicator is a ratio: good events divided by valid events, expressed as a percentage. Measure what users experience, such as successful requests or requests under a latency threshold.', ex: 'non-5xx requests / all requests' },
      { t: 'SLO', d: 'The target for an SLI over a window, for example 99.9% of requests succeed over 30 days. It is set below 100% on purpose.', ex: '99.9% availability, 30-day rolling' },
      { t: 'Error budget', d: '100% minus the SLO. At 99.9%, 0.1% of events may fail: 43.2 minutes of full downtime in 30 days, or 1 failed request in every 1,000.', ex: '3,000,000 requests → 3,000 errors' },
      { t: 'Error budget policy', d: 'A written agreement, made before any incident, on what happens when the budget is spent: for example, freeze feature releases and prioritize reliability work, with owners, escalation and a review date.', ex: 'budget exhausted → release freeze' },
      { t: 'Stakeholder agreement', d: 'Product, development and SRE must agree the SLO and the policy. Without that, the numbers do not change decisions.', ex: 'signed by service owner and product lead' },
      { t: 'Iterate', d: 'Start with a reasonable SLO, measure, and revisit it regularly. An SLO nobody can meet, or one never at risk, needs changing.', ex: 'quarterly SLO review' },
    ],
    leverage: [
      { t: 'SLIs from your telemetry', d: 'Show Claude the metrics you have (Prometheus, Azure Monitor, Elastic APM) and ask for SLI definitions and queries that measure user experience, not server health.' },
      { t: 'Exact budget math', d: 'Give Claude a calculator tool (or use Claude for Excel) for error budget numbers, so every figure in the review is computed, not estimated.' },
      { t: 'Policy drafts', d: 'Ask Claude to draft an error budget policy in the Workbook\'s structure (triggers, actions, exceptions, owners, review date) for stakeholders to edit and sign.' },
    ],
    sources: [SRC.workbookSlo, SRC.tools, SRC.sreBook],
    quiz: [
      { q: 'What is the error budget for a 99.95% SLO over 30 days, in minutes?', options: ['43.2', '21.6', '4.3'], a: 1, why: '30 × 24 × 60 × 0.0005 = 21.6 minutes.' },
      { q: 'Which is a good availability SLI?', options: ['CPU below 80%', 'Successful requests divided by valid requests', 'Number of pods running'], a: 1, why: 'SLIs measure what users experience, as good events over valid events.' },
      { q: 'When should the error budget policy be agreed?', options: ['During the incident', 'Before incidents happen, by product, development and SRE', 'Only after the budget is exhausted'], a: 1, why: 'Agreeing in advance avoids arguments under pressure.' },
    ],
    steps: [
      {
        id: 'w05-t3-s1', kind: 'guide', title: 'Define SLIs, an SLO and an error budget policy with Claude', minutes: 40, source: SRC.workbookSlo,
        scenario: 'Pick one user-facing service you support (for example an API behind Azure Application Gateway, with metrics in Prometheus or Azure Monitor). Define its SLIs and SLO, then draft the error budget policy for stakeholders.',
        task: [
          'Run prompt 1 in claude.ai with a description of the service and the metrics you have (no secrets or hostnames you would not share).',
          'Run prompt 2 to check the budget numbers with Claude\'s code execution or in Claude for Excel.',
          'Run prompt 3 for the policy draft, and share it with the service owner for comments.',
        ],
        prompts: [
          { label: 'SLIs and SLO', where: 'claude.ai', text: 'Help me define SLIs and an SLO for this service, following the Google SRE Workbook "Implementing SLOs" approach.\nService: [what it does, who uses it]\nArchitecture: [e.g. Azure Application Gateway → AKS → Azure SQL]\nMetrics available: [e.g. Prometheus http_requests_total by code, request duration histogram; Application Gateway access logs]\nGive me: 2 SLIs as good events / valid events with the exact PromQL or KQL, a proposed SLO and window for each with reasoning, and what is excluded from "valid" (health checks, synthetic traffic).' },
          { label: 'Budget numbers', where: 'Claude for Excel', text: 'Build a small error budget sheet: inputs for SLO %, window in days and total valid requests; outputs for allowed downtime minutes, allowed failed requests, failures so far (input) and % budget spent. Use formulas, not typed values, and show the 99.9% / 30 day / 12,400,000 request example.' },
          { label: 'Error budget policy', where: 'claude.ai', text: 'Draft an error budget policy for this service with sections: Service overview and SLOs, Goals, What happens when the budget is exhausted (release freeze rules and exceptions), Escalation and ownership, Review cadence, Approvers. Keep it to one page and mark every decision the stakeholders must make with [DECIDE].' },
        ],
        expected: ['Two SLIs with queries, an SLO and a window, with reasoning', 'A spreadsheet that computes the budget with formulas (43.2 minutes and 12,400 requests for the example)', 'A one-page policy draft sent to stakeholders'],
        verify: 'Run the SLI queries against real data and confirm the ratio makes sense. Recompute one budget number by hand. Compare the policy structure with the example policy in the SRE Workbook.',
        atWork: 'This is the start of the SLO you will make live in Week 11. Claude drafts, but the SLO and policy only work when the service owner and product lead agree to them.',
        checks: [
          { id: 'sli', label: 'I defined two SLIs with working queries and an SLO', manual: true },
          { id: 'math', label: 'I verified the budget numbers with formulas', manual: true },
          { id: 'policy', label: 'I drafted the error budget policy and shared it for comments', manual: true },
        ],
      },
      {
        id: 'w05-t3-s2', title: 'Compute the error budget with a calculator tool', minutes: 6, source: SRC.workbookSlo,
        scenario: 'Work out how much budget checkout-api has left and how big INC-2291 was in budget terms. Claude has a <code>calculator</code> tool and must use it for every number.',
        task: ['Keep <b>Auto-run tools</b> on and click <b>Run</b>.', 'Watch each calculator call and result.', 'Check the four numbers and the policy recommendation.'],
        atWork: 'For any number that goes into an SLO review or an incident report, have Claude compute it with a tool (or code execution) and show the calculation, so reviewers can check it.',
        hint: 'Budget = 1 − 0.999 = 0.001. 30 days = 43,200 minutes.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' },
          tools: [TOOL_CALC], tool_choice: { type: 'auto' },
          system: 'You are an SRE preparing an SLO review. Use the calculator tool for every calculation and show the expression you used.',
          messages: user(SLO_ASK),
        },
        checks: [
          { id: 'tool', label: 'Claude used the calculator tool', test: (c, h) => h.calls(c, 'calculator').length >= 2 },
          { id: 'minutes', label: 'Time budget: 43.2 minutes', test: (c, h) => h.near(h.text(c), 43.2, 0.05) },
          { id: 'requests', label: 'Request budget: 12,400 failed requests, 4,340 left', test: (c, h) => h.near(h.text(c), 12400, 1) && h.near(h.text(c), 4340, 1) },
          { id: 'spent', label: 'Budget spent: 65%', test: (c, h) => h.near(h.text(c), 65, 0.5) },
          { id: 'inc', label: 'INC-2291 was about 108.8% of the time budget', test: (c, h) => h.near(h.text(c), 108.8, 0.2) },
          { id: 'policy', label: 'Recommends the policy action (freeze or halt feature releases)', test: (c, h) => /freeze|halt|pause/i.test(h.text(c)) },
        ],
        sim: [
          { content: [think('Compute the time budget and the request budget first.'), { type: 'text', text: 'I will compute the two budgets first.' }, { type: 'tool_use', id: 'toolu_sim_w05_1', name: 'calculator', input: { expression: '30 * 24 * 60 * (1 - 0.999)' } }, { type: 'tool_use', id: 'toolu_sim_w05_2', name: 'calculator', input: { expression: '12400000 * (1 - 0.999)' } }], stop_reason: 'tool_use', usage: { input_tokens: 700, output_tokens: 140 } },
          { content: [{ type: 'tool_use', id: 'toolu_sim_w05_3', name: 'calculator', input: { expression: '8060 / 12400 * 100' } }, { type: 'tool_use', id: 'toolu_sim_w05_4', name: 'calculator', input: { expression: '12400 - 8060' } }, { type: 'tool_use', id: 'toolu_sim_w05_5', name: 'calculator', input: { expression: '47 / 43.2 * 100' } }], stop_reason: 'tool_use', usage: { input_tokens: 900, output_tokens: 120 } },
          textTurn(SLO_FINAL, { input_tokens: 1100, output_tokens: 380 }),
        ],
      },
    ],
  };

  /* =====================================================================
     Topic 4 — Apply: causal chain for one recurring platform incident
     ===================================================================== */
  const t4 = {
    id: 'w05-t4',
    title: 'Apply: write the causal chain for one recurring platform incident',
    programmeItem: 'Apply task · Write the causal chain for one recurring platform incident.',
    blurb: 'Pick an incident that keeps coming back in your estate and take it from symptom to a systemic cause, with evidence for every link and actions that stop it recurring.',
    outcomes: [
      'Choose a recurring incident using data, not memory',
      'Write an evidence-backed causal chain that ends at a changeable cause',
      'Propose owned actions that prevent recurrence and detect it earlier',
    ],
    concepts: [
      { t: 'Recurring beats dramatic', d: 'An incident that happens every month costs more than a one-off outage. Use your Pareto from this week to pick it.', ex: 'disk-full on Elastic data nodes, 14 times' },
      { t: 'Evidence per link', d: 'Each link in the chain cites a log, metric, config or ticket. Mark unproven links as hypotheses and say how to test them.', ex: 'evidence: ILM policy export' },
      { t: 'Stop at a changeable cause', d: 'The chain ends when the answer is a process, design or monitoring gap your team can change.', ex: 'no ILM rollover on the logs-* template' },
      { t: 'Redact first', d: 'Remove names, secrets, customer data and internal hostnames before pasting anything into Claude.', ex: '<HOST-1>, <REDACTED>' },
    ],
    leverage: [
      { t: 'Find the pattern', d: 'Give Claude a redacted export of the incident tickets for that category and ask what the occurrences have in common and what differs.' },
      { t: 'Challenge the chain', d: 'Ask Claude to attack your causal chain: which links lack evidence, and what alternative explanations fit the same facts.' },
      { t: 'Ready for Week 6', d: 'The chain and actions feed next week\'s blameless postmortem and the alert review.' },
    ],
    sources: [SRC.sreBook, SRC.asq, SRC.pdWriting],
    quiz: [
      { q: 'How do you choose the incident for this task?', options: ['The most recent one', 'A recurring one, chosen from incident data such as a Pareto', 'The one with the most people involved'], a: 1, why: 'Recurring incidents repay root cause work the most.' },
      { q: 'A link in your chain has no evidence. What do you do?', options: ['Keep it as fact', 'Mark it as a hypothesis and say how to test it', 'Delete the whole chain'], a: 1, why: 'Unproven links are hypotheses until evidence confirms them.' },
    ],
    steps: [
      {
        id: 'w05-t4-s1', kind: 'guide', title: 'Causal chain for a recurring incident', minutes: 120, source: SRC.sreBook,
        scenario: 'Use your own incident data. Pick the recurring incident, gather the evidence, build the chain with Claude as a critical partner, and write it up in one page.',
        task: [
          'Export 60–90 days of incidents or alerts (ticketing tool, Grafana, Azure Monitor), redact them, and run prompt 1 to pick the incident.',
          'Collect evidence for the chosen incident (logs, configs, tickets), then run prompt 2 to build the chain.',
          'Run prompt 3 to challenge it, fix the weak links, and run prompt 4 for the one-page write-up.',
        ],
        prompts: [
          { label: 'Pick the recurring incident', where: 'Claude for Excel', text: 'This sheet is a redacted export of our incidents for the last 90 days. Build a Pareto by category (count, percent, cumulative percent, chart) and list the top 3 recurring categories with the services they affect. Cite the cells.' },
          { label: 'Build the causal chain', where: 'claude.ai', text: 'Help me write the causal chain for this recurring incident. Facilitate a 5 Whys one step at a time; for each answer ask me for the evidence (log line, metric, config, ticket). Stop at a process, design or monitoring cause my team can change. No names.\nIncident pattern: [describe]\nOccurrences: [dates, redacted ticket summaries]\nEvidence I have: [paste redacted snippets]' },
          { label: 'Challenge it', where: 'claude.ai', text: 'Now attack this chain as a sceptical senior SRE: which links are not proven by the evidence, what alternative explanations fit the same facts, and what one test or query would confirm or rule out each?' },
          { label: 'One-page write-up', where: 'claude.ai', text: 'Write the final one-page causal chain: problem statement with the number of occurrences and impact, the chain (each link with its evidence or marked as a hypothesis), the root cause, a fishbone summary, and 3 actions (prevent, detect, mitigate) with owning teams. Make it an Artifact.' },
        ],
        expected: ['A recurring incident chosen from data', 'A causal chain where each link cites evidence or is marked as a hypothesis', 'A one-page Artifact with root cause and owned actions'],
        verify: 'Show the chain to one colleague who worked the incident and ask whether any link is wrong. Run at least one of the confirming queries Claude suggested.',
        atWork: 'This one-pager is the input for the Week 6 postmortem and the milestone EV-RE-02. Keep the evidence links: the CTO review will ask for them.',
        checks: [
          { id: 'pick', label: 'I chose the recurring incident from data', manual: true },
          { id: 'chain', label: 'Every link has evidence or is marked as a hypothesis', manual: true },
          { id: 'challenge', label: 'I ran the challenge prompt and fixed weak links', manual: true },
          { id: 'onepage', label: 'I have the one-page write-up with owned actions, redacted', manual: true },
        ],
      },
    ],
  };

  PL.addWeek({
    week: 5,
    title: 'Root cause analysis, blameless postmortems and SLOs',
    stream: 'rootcause',
    hours: 9,
    focus: 'Find real root causes with 5 Whys, Pareto and Ishikawa, document incidents in blameless postmortems, and measure reliability with SLOs and error budgets, using Claude as facilitator, drafter and calculator.',
    apply: 'Write the causal chain for one recurring platform incident.',
    topics: [t1, t2, t3, t4],
  });
})();
