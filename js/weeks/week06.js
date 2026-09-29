/* Week 6 · Root cause: alerting on SLOs (burn rates), then the blameless postmortem milestone (EV-RE-02).
   Follows the week01.js template: briefing (official sources) + leverage (Claude for DevOps/Cloud) + steps. */
(function () {
  'use strict';
  const PL = window.PL;
  const { ADAPTIVE, user, L, obj, arr, en, S, N, jsonFormat, textTurn, jsonTurn, think } = PL.B;

  const SRC = {
    alerting: { label: 'Google SRE Workbook · Ch. 5 Alerting on SLOs (free)', url: 'https://sre.google/workbook/alerting-on-slos/' },
    workbookSlo: { label: 'Google SRE Workbook · Ch. 2 Implementing SLOs (free)', url: 'https://sre.google/workbook/implementing-slos/' },
    sreBook: { label: 'Google SRE Book · Ch. 15 Postmortem Culture: Learning from Failure (free)', url: 'https://sre.google/sre-book/postmortem-culture/' },
    pdHome: { label: 'PagerDuty Postmortem Documentation (free, Apache-2.0)', url: 'https://postmortems.pagerduty.com/' },
    pdBlameless: { label: 'PagerDuty · The blameless postmortem', url: 'https://postmortems.pagerduty.com/culture/blameless/' },
    pdTemplate: { label: 'PagerDuty · Postmortem template', url: 'https://postmortems.pagerduty.com/resources/post_mortem_template/' },
    prometheus: { label: 'Prometheus docs · Alerting rules', url: 'https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/' },
    structured: { label: 'Claude docs · Structured outputs', url: 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs' },
    claudeCode: { label: 'Claude Code docs · Overview', url: 'https://code.claude.com/docs' },
  };

  /* ---- lab files (synthetic) ---- */
  PL.PLACEHOLDERS.W06_ALERTS = L(
    'Alert inventory, last 30 days (synthetic lab data). actionable = a human had to do something.',
    'id,alert,rule,fires_30d,actionable_30d,median_duration,routing,notes',
    'A1,HighCPU-web,avg CPU > 80% for 5m on vmss-web,142,3,6m,page,autoscale handles it; no user impact in 139 fires',
    'A2,DiskUsage85-elastic,disk used > 85% on es-data-*,58,4,3m (flaps around ILM rollover),page,4 real cases needed a shard move',
    'A3,CheckoutErrorBudgetBurn,multiwindow burn rate 14.4x (1h/5m) and 6x (6h/30m),2,2,38m,page,both matched real user-facing incidents',
    'A4,PodRestart-any,increase(kube_pod_container_status_restarts_total[5m]) > 0,311,5,n/a,Slack,mostly CronJob completions and deploy rollouts',
    'A5,BackupJobFailed-PBS,Proxmox Backup Server job status != OK,6,6,n/a,page,each needed a rerun before the next window',
    'A6,HighCPU-web-copy,Grafana copy of A1 on the same metric and threshold,139,3,6m,page,created during the Grafana migration',
    'A7,TLSCertExpiry-14d,probe_ssl_earliest_cert_expiry < 14 days (blackbox exporter),0,0,n/a,ticket,new after INC-2291',
    'A8,WazuhAgentDisconnected,agent last keepalive > 10m,47,9,12m,page,38 of 47 during the monthly patch-window reboots'
  );
  PL.FILE_LABELS.W06_ALERTS = 'alert-inventory-30d.csv';

  /* =====================================================================
     Topic 1 — Alerting on SLOs: burn rates, multiwindow multi-burn-rate
     ===================================================================== */
  const BURN_ASK = L(
    'Service: checkout-api. SLO: 99.9% of requests succeed (non-5xx) over 30 days.',
    'Metric: http_requests_total{job="checkout-api", code="..."} in Prometheus.',
    'Write Prometheus rules following the Google SRE Workbook multiwindow, multi-burn-rate approach:',
    '- recording rules for the error ratio over 5m, 30m, 1h, 6h and 3d',
    '- a page for fast burn (14.4x over 1h with a 5m short window, and 6x over 6h with a 30m short window)',
    '- a ticket for slow burn (1x over 3d with a 6h short window)',
    'Return one YAML file, then explain in a short table what budget each alert represents.'
  );
  const BURN_ANSWER = L(
    '```yaml',
    'groups:',
    '  - name: checkout-api-slo-recording',
    '    rules:',
    '      - record: job:slo_errors_per_request:ratio_rate5m',
    '        expr: sum by (job) (rate(http_requests_total{job="checkout-api",code=~"5.."}[5m])) / sum by (job) (rate(http_requests_total{job="checkout-api"}[5m]))',
    '      - record: job:slo_errors_per_request:ratio_rate30m',
    '        expr: sum by (job) (rate(http_requests_total{job="checkout-api",code=~"5.."}[30m])) / sum by (job) (rate(http_requests_total{job="checkout-api"}[30m]))',
    '      - record: job:slo_errors_per_request:ratio_rate1h',
    '        expr: sum by (job) (rate(http_requests_total{job="checkout-api",code=~"5.."}[1h])) / sum by (job) (rate(http_requests_total{job="checkout-api"}[1h]))',
    '      - record: job:slo_errors_per_request:ratio_rate6h',
    '        expr: sum by (job) (rate(http_requests_total{job="checkout-api",code=~"5.."}[6h])) / sum by (job) (rate(http_requests_total{job="checkout-api"}[6h]))',
    '      - record: job:slo_errors_per_request:ratio_rate3d',
    '        expr: sum by (job) (rate(http_requests_total{job="checkout-api",code=~"5.."}[3d])) / sum by (job) (rate(http_requests_total{job="checkout-api"}[3d]))',
    '',
    '  - name: checkout-api-slo-alerts',
    '    rules:',
    '      - alert: CheckoutApiErrorBudgetFastBurn',
    '        expr: |',
    '          (',
    '            job:slo_errors_per_request:ratio_rate1h{job="checkout-api"} > (14.4 * 0.001)',
    '            and',
    '            job:slo_errors_per_request:ratio_rate5m{job="checkout-api"} > (14.4 * 0.001)',
    '          )',
    '          or',
    '          (',
    '            job:slo_errors_per_request:ratio_rate6h{job="checkout-api"} > (6 * 0.001)',
    '            and',
    '            job:slo_errors_per_request:ratio_rate30m{job="checkout-api"} > (6 * 0.001)',
    '          )',
    '        labels:',
    '          severity: page',
    '        annotations:',
    '          summary: "checkout-api is burning its 30-day error budget fast"',
    '          runbook_url: "https://runbooks.example.internal/checkout-api/error-budget"',
    '',
    '      - alert: CheckoutApiErrorBudgetSlowBurn',
    '        expr: |',
    '          job:slo_errors_per_request:ratio_rate3d{job="checkout-api"} > (1 * 0.001)',
    '          and',
    '          job:slo_errors_per_request:ratio_rate6h{job="checkout-api"} > (1 * 0.001)',
    '        labels:',
    '          severity: ticket',
    '```',
    '',
    '| Alert | Long / short window | Burn rate | Error ratio threshold | Budget spent when it fires |',
    '|---|---|---|---|---|',
    '| Fast burn (page) | 1h / 5m | 14.4x | 1.44% | 2% of the 30-day budget |',
    '| Fast burn (page) | 6h / 30m | 6x | 0.6% | 5% |',
    '| Slow burn (ticket) | 3d / 6h | 1x | 0.1% | 10% |',
    '',
    'The long window makes the alert significant; the short window makes it stop firing soon after the problem is fixed. Validate the file with `promtool check rules` before loading it, and test it with `promtool test rules` against a synthetic series.'
  );

  const t1 = {
    id: 'w06-t1',
    title: 'SRE Workbook: alerting on SLOs with burn rates',
    programmeItem: 'SRE Workbook · SLOs and error budgets, continued: alerting on SLOs (free: Google SRE Workbook, Alerting on SLOs) · 3h',
    blurb: 'Page on what threatens the SLO, not on every symptom. Burn-rate alerts measure how fast the error budget is being spent, and multiwindow rules make them both fast and quiet.',
    outcomes: [
      'Explain precision, recall, detection time and reset time for an alert',
      'Compute burn-rate thresholds for an SLO and the budget each alert represents',
      'Write multiwindow, multi-burn-rate alert rules for Prometheus or Grafana',
    ],
    concepts: [
      { t: 'Judging an alert', d: 'Precision: how many alerts were real. Recall: how many real problems alerted. Detection time: how fast it fires. Reset time: how long it keeps firing after the fix.', ex: 'A1: 3 actionable of 142 → low precision' },
      { t: 'Burn rate', d: 'How fast the service spends its error budget relative to the SLO. A burn rate of 1 spends exactly the whole budget over the window; 14.4 would spend a 30-day budget in about two days.', ex: 'error ratio 1.44% at SLO 99.9% = 14.4x' },
      { t: 'The recommended thresholds', d: 'The Workbook suggests paging at 14.4x over 1 hour (2% of budget) and 6x over 6 hours (5%), and a ticket at 1x over 3 days (10%).', ex: '> (14.4 * 0.001)' },
      { t: 'Multiwindow', d: 'Each alert also needs a short window (about 1/12 of the long one: 5m, 30m, 6h) to be above the threshold. This keeps detection fast but stops the alert firing long after recovery.', ex: 'rate1h > x and rate5m > x' },
      { t: 'Low-traffic services', d: 'With few requests, one failure is a big ratio. Options include synthetic traffic, combining services, or accepting a lower SLO.', ex: 'blackbox probes add steady traffic' },
      { t: 'Symptoms, not causes', d: 'SLO alerts page on user impact. Cause-based alerts (CPU, disk) become tickets or dashboards unless they predict imminent user impact.', ex: 'CPU 80% → dashboard, not page' },
    ],
    leverage: [
      { t: 'SLO to rules in one prompt', d: 'Give Claude the SLO, the metric names and the Workbook thresholds; get recording rules and alert rules for Prometheus, or the Grafana alerting equivalent, and check them with promtool.' },
      { t: 'Claude Code in the monitoring repo', d: 'Let Claude Code add the rules to your alerting repo, run `promtool check rules` and `promtool test rules`, and open a PR for review.' },
      { t: 'Explain burn rate to stakeholders', d: 'Ask Claude for a one-paragraph explanation and a table of what each alert means in budget terms for the service owner.' },
    ],
    sources: [SRC.alerting, SRC.workbookSlo, SRC.prometheus, SRC.claudeCode],
    quiz: [
      { q: 'For a 99.9% SLO, what error ratio triggers the 14.4x burn-rate page?', options: ['0.1%', '1.44%', '14.4%'], a: 1, why: '14.4 × 0.001 = 0.0144, which is 1.44%.' },
      { q: 'Why add a short window (for example 5m) to a 1h burn-rate alert?', options: ['To page more often', 'So the alert stops firing soon after the problem is fixed', 'Because Prometheus requires it'], a: 1, why: 'The short window cuts reset time while the long window keeps the alert significant.' },
      { q: 'How much of a 30-day budget has been spent when the 6x / 6h alert fires?', options: ['2%', '5%', '10%'], a: 1, why: '6 × 6h / 720h = 5% of the budget.' },
    ],
    steps: [
      {
        id: 'w06-t1-s1', kind: 'guide', title: 'Add burn-rate alerts to your monitoring repo with Claude Code', minutes: 60, source: SRC.alerting,
        scenario: 'Take the SLO you drafted in Week 5 and turn it into burn-rate alerts in your real alerting-as-code repository (Prometheus rules or Grafana alerting), using Claude Code on a branch.',
        task: [
          'Open the monitoring repo in Claude Code on a new branch. Make sure no secrets are in the working tree.',
          'Run prompt 1, review the diff, then prompt 2 for tests.',
          'Run prompt 3 to write the PR description, and ask a teammate to review before merging.',
        ],
        prompts: [
          { label: 'Write the rules', where: 'Claude Code', text: 'Read our existing Prometheus rule files under rules/ to learn the naming and label conventions. Then add a new file rules/[service]-slo.yaml for this SLO: [SLI definition and target from Week 5]. Use the Google SRE Workbook multiwindow, multi-burn-rate approach: recording rules for 5m, 30m, 1h, 6h and 3d error ratios; page on 14.4x (1h and 5m) or 6x (6h and 30m); ticket on 1x (3d and 6h). Run promtool check rules on the file and fix any error. Do not modify other rule files.' },
          { label: 'Test the rules', where: 'Claude Code', text: 'Write a promtool unit test (tests/[service]-slo.test.yaml) with a synthetic series that has a 2% error ratio for 1 hour and check that the page alert fires, then a 0.05% error ratio for 3 days and check that nothing fires. Run promtool test rules and show me the output.' },
          { label: 'PR description', where: 'Claude Code', text: 'Write the PR description: the SLO, a table of each alert with window, burn rate, threshold and budget spent when it fires, the test results, and which old cause-based alerts this could replace.' },
        ],
        expected: ['A new rules file that passes promtool check rules', 'A unit test that shows the page firing at a 2% error ratio and staying quiet at 0.05%', 'A PR with a clear budget table for reviewers'],
        verify: 'Compare every threshold with the table in the Workbook "Alerting on SLOs" chapter. Run promtool yourself, and check the expressions against your real metric names in the Prometheus UI before merging.',
        atWork: 'This replaces guesswork thresholds with alerts tied to user impact. Keep the PR small and reviewed: an alerting change is a production change.',
        checks: [
          { id: 'rules', label: 'Claude Code added the rules on a branch and promtool check rules passes', manual: true },
          { id: 'tests', label: 'The promtool unit tests pass', manual: true },
          { id: 'review', label: 'The PR was reviewed by a teammate before merge', manual: true },
        ],
      },
      {
        id: 'w06-t1-s2', title: 'Convert an SLO into multiwindow burn-rate alert rules', minutes: 8, source: SRC.alerting,
        scenario: 'checkout-api has a 99.9% availability SLO over 30 days. Ask Claude for Prometheus recording and alerting rules that follow the Workbook recommendation. The checks look for the exact thresholds and the multiwindow logic.',
        task: ['Click <b>Run</b>.', 'Find the 14.4x and 6x conditions: is each paired with its short window?', 'Read the budget table. Could you explain it to the service owner?'],
        atWork: 'Generate the rules with Claude, then validate with promtool and a unit test. Never paste rules straight into production alerting without a test.',
        hint: 'Look for > (14.4 * 0.001) on rate1h AND rate5m, and > (6 * 0.001) on rate6h AND rate30m.',
        body: { max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' }, system: 'You are an SRE writing Prometheus alerting rules. Follow the Google SRE Workbook guidance on alerting on SLOs exactly, and return valid Prometheus rule YAML.', messages: user(BURN_ASK) },
        checks: [
          { id: 'recording', label: 'Recording rules for 5m, 30m, 1h, 6h and 3d error ratios', test: (c, h) => ['5m', '30m', '1h', '6h', '3d'].every((w) => new RegExp('ratio_rate' + w + '\\b').test(h.text(c))) },
          { id: 'fast', label: 'Page at 14.4x on the 1h window AND the 5m window', test: (c, h) => /14\.4\s*\*\s*0\.001|0\.0144/.test(h.text(c)) && /ratio_rate1h[\s\S]{0,120}\band\b[\s\S]{0,120}ratio_rate5m/.test(h.text(c)) },
          { id: 'medium', label: 'Page at 6x on the 6h window AND the 30m window', test: (c, h) => /\(\s*6\s*\*\s*0\.001\s*\)|0\.006\b/.test(h.text(c)) && /ratio_rate6h[\s\S]{0,120}\band\b[\s\S]{0,120}ratio_rate30m/.test(h.text(c)) },
          { id: 'slow', label: 'Ticket at 1x on the 3d and 6h windows', test: (c, h) => /ratio_rate3d[\s\S]{0,120}\band\b[\s\S]{0,120}ratio_rate6h/.test(h.text(c)) && /severity:\s*ticket/.test(h.text(c)) },
          { id: 'page', label: 'Fast-burn alerts are labelled severity: page', test: (c, h) => /severity:\s*page/.test(h.text(c)) },
          { id: 'budget', label: 'Explains the budget each alert represents (2%, 5%, 10%)', test: (c, h) => /\b2%/.test(h.text(c)) && /\b5%/.test(h.text(c)) && /\b10%/.test(h.text(c)) },
        ],
        sim: [{ content: [think('SLO 99.9% so the budget ratio is 0.001. Page thresholds 14.4x and 6x with short windows 5m and 30m; ticket at 1x over 3d with 6h. sum by (job) keeps the job label on the recorded series.'), { type: 'text', text: BURN_ANSWER }], stop_reason: 'end_turn', usage: { input_tokens: 420, output_tokens: 1150 } }],
      },
    ],
  };

  /* =====================================================================
     Topic 2 — Apply: blameless postmortem on a real incident (EV-RE-02)
     ===================================================================== */
  const ALERT_SCHEMA = obj({
    alerts: arr(obj({ id: S, decision: en('keep', 'retune', 'remove', 'convert_to_ticket'), precision_pct: N, evidence: S, change: S })),
    postmortem_pick: obj({ id: S, why: S }),
    summary: S,
  });
  const ALERT_SIM = {
    alerts: [
      { id: 'A1', decision: 'remove', precision_pct: 2.1, evidence: '3 of 142 fires actionable; autoscale handled 139 with no user impact.', change: 'Remove the page. Keep CPU on the capacity dashboard; user impact is covered by the checkout burn-rate alert (A3).' },
      { id: 'A2', decision: 'retune', precision_pct: 6.9, evidence: '4 of 58 actionable; median 3m, flapping around ILM rollover.', change: 'Alert on predicted exhaustion instead: predict_linear on free disk over 6h < 0, for: 30m, routed as a ticket; keep a page only at > 95% for 15m.' },
      { id: 'A3', decision: 'keep', precision_pct: 100, evidence: '2 of 2 fires matched real user-facing incidents.', change: 'No change.' },
      { id: 'A4', decision: 'retune', precision_pct: 1.6, evidence: '5 of 311 actionable; mostly CronJob completions and rollouts.', change: 'Exclude Job-owned pods and alert on crash loops only (restarts > 3 in 15m, for: 10m).' },
      { id: 'A5', decision: 'keep', precision_pct: 100, evidence: '6 of 6 needed a rerun before the next backup window.', change: 'No change; add the runbook link.' },
      { id: 'A6', decision: 'remove', precision_pct: 2.2, evidence: 'Duplicate of A1 on the same metric and threshold; 139 fires, 3 actionable.', change: 'Delete the Grafana copy created during migration.' },
      { id: 'A7', decision: 'keep', precision_pct: 0, evidence: '0 fires in 30 days; it is new after INC-2291 and guards a known failure mode.', change: 'Keep as a ticket; review after 90 days.' },
      { id: 'A8', decision: 'retune', precision_pct: 19.1, evidence: '9 of 47 actionable; 38 fires during patch-window reboots.', change: 'Mute during the scheduled patch window with a mute timing, and raise the delay to for: 20m.' },
    ],
    postmortem_pick: { id: 'A1', why: 'It paged 142 times for 3 actionable cases and never indicated user impact; removing it (and its copy A6) is supported by 30 days of evidence and the SLO alert covers the user-facing risk.' },
    summary: 'Remove 2 (A1, A6), retune 3 (A2, A4, A8), keep 3 (A3, A5, A7). Pages drop from about 394 to under 20 a month on this data, without losing any alert that caught user impact.',
  };
  const dec = (c, h, id) => { const j = h.json(c); const a = j && (j.alerts || []).find((x) => x.id === id); return a && a.decision; };

  const t2 = {
    id: 'w06-t2',
    title: 'Apply: run a blameless postmortem on a real incident, publish it, and fix one alert',
    programmeItem: 'Apply task · Run a blameless postmortem on a real incident. Publish it. Include the alert you removed or retuned. (Milestone EV-RE-02)',
    blurb: 'The milestone for the root-cause stream: take a real incident to root cause, publish a blameless postmortem, and show one alert removed or retuned on the evidence.',
    outcomes: [
      'Run a full postmortem on a real incident, from timeline to published document',
      'Use alert data to remove or retune at least one noisy alert, with before and after numbers',
      'Assemble the evidence the CTO reviews for EV-RE-02',
    ],
    concepts: [
      { t: 'Pick the right incident', d: 'A real incident with user impact or on-call effort, ideally the recurring one from your Week 5 causal chain. Small is fine; real is required.', ex: 'the monthly disk-full page' },
      { t: 'The sequence', d: 'Timeline → 5 Whys and fishbone → draft → blameless review → action items → review meeting → publish. Claude helps at every stage; people decide.', ex: 'draft in Word, review in the meeting' },
      { t: 'Alerts as evidence', d: 'Judge alerts by precision (actionable fires divided by all fires), duplication and whether they indicate user impact. Remove or retune the worst, and record the numbers.', ex: 'A1: 3 of 142 actionable → remove' },
      { t: 'Before and after', d: 'Record fires per month and actionable rate before the change, and check again after two to four weeks. This also feeds EV-RE-06 later.', ex: '142 pages/month → 0' },
      { t: 'Publish', d: 'The postmortem goes where the team finds it (wiki, repo, Confluence), announced in the team channel, with action items tracked in the backlog.', ex: 'link + 3-line summary in #platform' },
    ],
    leverage: [
      { t: 'A prompt sequence, not one prompt', d: 'Use Claude for each stage separately: timeline from the redacted channel export, facilitation, drafting, blameless review, and the channel announcement.' },
      { t: 'Alert review from data', d: 'Export 30 days of alert history and let Claude compute precision, find duplicates and recommend keep, retune or remove, as structured JSON you can check.' },
      { t: 'Claude Code for the alert change', d: 'Make the alert removal or retune as a reviewed PR in your alerting repo, with the evidence in the PR description.' },
    ],
    sources: [SRC.sreBook, SRC.pdHome, SRC.pdBlameless, SRC.pdTemplate, SRC.alerting],
    quiz: [
      { q: 'An alert fired 142 times in 30 days and 3 needed action. What is its precision?', options: ['About 2%', 'About 50%', 'About 98%'], a: 0, why: '3 / 142 ≈ 2.1%.' },
      { q: 'What does EV-RE-02 require?', options: ['A postmortem template', 'A real incident taken to root cause, published, and one alert removed or retuned on the evidence', 'An AZ-104 practice score'], a: 1, why: 'Those three parts are the milestone passing criteria.' },
    ],
    steps: [
      {
        id: 'w06-t2-s1', kind: 'guide', title: 'The postmortem prompt sequence on a real incident', minutes: 150, source: SRC.pdHome,
        scenario: 'Run the whole postmortem on a <b>real</b> incident from your team, using Claude at each stage. Redact names, secrets, customer data and hostnames before anything goes into Claude.',
        task: [
          'Choose the incident (your Week 5 causal chain is a good start) and export the incident channel, alerts and relevant logs. Redact them.',
          'Run prompts 1 to 6 in order. Each output is reviewed by you before the next step.',
          'Hold the postmortem review meeting with the people involved, update the document, then continue to the next steps.',
        ],
        prompts: [
          { label: '1 · Timeline', where: 'claude.ai', text: 'Build an incident timeline in UTC from these redacted sources: channel export, alert history and log excerpts. Columns: time, event, source. Mark detection, escalation, mitigation and resolution. Flag gaps where nothing is recorded for more than 15 minutes. Use roles, not names.\n[paste redacted sources]' },
          { label: '2 · 5 Whys and fishbone', where: 'claude.ai', text: 'Facilitate a blameless 5 Whys on this timeline, one question at a time, asking me for evidence for each answer. Then build a fishbone (Process, Technology, Monitoring, People and skills, Environment, Dependencies) as a Mermaid Artifact.' },
          { label: '3 · Draft', where: 'Claude for Word', text: 'Draft the postmortem in this template from the reviewed timeline and RCA: Summary, Impact (with numbers), Timeline, Root cause, Contributing factors, What went well, Action items (Action, Type, Owner team, Due), Lessons learned, and a section "Alert change" for the alert we removed or retuned.' },
          { label: '4 · Blameless review', where: 'claude.ai', text: 'Review this draft for blameless language: flag names, "human error", "should have", "failed to" and any sentence that judges a person, with a systems-focused rewrite for each. List any section that is missing or has no evidence.\n[paste draft]' },
          { label: '5 · Alert evidence', where: 'claude.ai', text: 'From this 30-day alert history export [paste redacted CSV], compute precision (actionable / fires) for each alert, find duplicates, and recommend keep, retune, remove or convert to ticket, with the evidence and the exact rule change. Pick the one change to include in the postmortem.' },
          { label: '6 · Publish', where: 'claude.ai', text: 'Write a 5-line announcement for the team channel: what happened, impact, root cause in one sentence, the top action items with owners, the alert we changed with before/after numbers, and the link placeholder [LINK].' },
        ],
        expected: ['A reviewed timeline and RCA with evidence', 'A postmortem draft in your template with an "Alert change" section', 'A blameless review applied before the review meeting'],
        verify: 'Check every timestamp and number against the source systems. Ask one person involved in the incident to confirm that the document is accurate and does not read as blame.',
        atWork: 'This sequence is reusable for every incident. Save the prompts in a Project or package them as a postmortem Skill for the team.',
        checks: [
          { id: 'real', label: 'I used a real incident with user impact or on-call effort, redacted before use', manual: true },
          { id: 'sequence', label: 'I ran the six prompts and reviewed each output', manual: true },
          { id: 'meeting', label: 'I held the postmortem review with the people involved', manual: true },
        ],
      },
      {
        id: 'w06-t2-s2', title: 'Alert review: which alerts to remove or retune', minutes: 8, source: SRC.alerting, files: ['W06_ALERTS'],
        scenario: 'Thirty days of alert data for the platform are in <code>alert-inventory-30d.csv</code>. Ask Claude for a structured recommendation per alert, backed by the numbers, and pick the change to put in the postmortem.',
        task: ['Read the inventory: fires, actionable fires, routing and notes.', 'Click <b>Run</b>.', 'Check the decisions against the evidence. Would you remove the ones Claude removes?'],
        atWork: 'Run this every month on your alert history. The JSON output is easy to diff over time and gives you the before and after numbers for milestone evidence.',
        hint: 'Precision is actionable / fires. Look for duplicates, and keep alerts that caught real user impact or protect a known failure.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: { effort: 'medium', format: jsonFormat(ALERT_SCHEMA) },
          system: 'You are an SRE reviewing alert quality with the Google SRE Workbook principles: page on user-facing symptoms, keep precision high, remove duplicates, and route non-urgent signals to tickets or dashboards. Base every decision on the numbers provided, and compute precision_pct as actionable / fires × 100 (use 0 when there were no fires).',
          messages: user(L('<alerts>', '{{W06_ALERTS}}', '</alerts>', 'Recommend keep, retune, remove or convert_to_ticket for every alert, with evidence and the exact change. Then pick the one alert change to include in our postmortem.')),
        },
        checks: [
          { id: 'all', label: 'A decision for all 8 alerts, each with numeric evidence', test: (c, h) => { const j = h.json(c); return !!j && j.alerts.length === 8 && j.alerts.every((a) => /\d/.test(a.evidence)); } },
          { id: 'keepslo', label: 'Keeps the SLO burn-rate alert (A3) and the backup failure alert (A5)', test: (c, h) => dec(c, h, 'A3') === 'keep' && dec(c, h, 'A5') === 'keep' },
          { id: 'dup', label: 'Removes the duplicate CPU alert (A6)', test: (c, h) => dec(c, h, 'A6') === 'remove' },
          { id: 'cpu', label: 'Does not keep the noisy CPU page (A1) as it is', test: (c, h) => ['remove', 'retune', 'convert_to_ticket'].includes(dec(c, h, 'A1')) },
          { id: 'retune', label: 'Retunes or demotes the flapping disk (A2) and pod-restart (A4) alerts', test: (c, h) => ['retune', 'convert_to_ticket'].includes(dec(c, h, 'A2')) && ['retune', 'convert_to_ticket', 'remove'].includes(dec(c, h, 'A4')) },
          { id: 'precision', label: 'Computes precision for A1 as about 2.1%', test: (c, h) => { const j = h.json(c); const a = j && j.alerts.find((x) => x.id === 'A1'); return !!a && Math.abs(a.precision_pct - 2.1) <= 0.2; } },
          { id: 'pick', label: 'Picks a noisy alert (not A3, A5 or A7) for the postmortem', test: (c, h) => { const j = h.json(c); return !!j && /^A[1246]$/.test(j.postmortem_pick.id); } },
        ],
        sim: [{ content: [think('Precision per alert: A1 3/142, A2 4/58, A4 5/311, A6 duplicate of A1, A8 9/47. A3 and A5 are fully actionable; A7 is new and guards a known failure.'), { type: 'text', text: JSON.stringify(ALERT_SIM, null, 2) }], stop_reason: 'end_turn', usage: { input_tokens: 950, output_tokens: 980 } }],
      },
      {
        id: 'w06-t2-s3', kind: 'guide', title: 'Make the alert change, publish, and assemble the EV-RE-02 evidence', minutes: 60, source: SRC.sreBook,
        scenario: 'Finish the milestone: ship the alert change as a reviewed PR, publish the postmortem, and put together the evidence pack for the CTO.',
        task: [
          'Use prompt 1 in Claude Code to make the alert change on a branch and open a PR.',
          'Publish the postmortem where the team finds it and post the announcement from the previous step.',
          'Run prompt 2 to assemble the evidence pack, then tick the checklist below and submit it for review.',
        ],
        prompts: [
          { label: 'Alert change as a PR', where: 'Claude Code', text: 'In our alerting repo, [remove / retune] the alert [name] as agreed in the postmortem: [exact change]. Run promtool check rules (or the Grafana provisioning validation) and any existing tests. In the PR description, include the 30-day evidence (fires, actionable fires, precision), the link placeholder to the postmortem, and how we will check the effect in 2 weeks. Do not change other alerts.' },
          { label: 'Evidence pack', where: 'claude.ai', text: 'Assemble an EV-RE-02 evidence summary for the CTO from these items: postmortem link, incident ID, root cause statement, action items with owners and status, the alert change PR link, and before/after numbers for the alert. Format: one page, with a checklist at the top showing each passing criterion ("real incident taken to root cause", "published", "one alert removed or retuned on the evidence") and where the evidence is.\n[paste links and numbers]' },
        ],
        expected: ['A merged or approved PR that removes or retunes one alert, with evidence in the description', 'A published postmortem announced in the team channel', 'A one-page evidence summary mapped to the EV-RE-02 criteria'],
        verify: 'Open every link in the evidence pack yourself. Check that the before numbers come from the alert history export and that the PR shows the exact rule change.',
        atWork: 'The CTO reviews EV-RE-02. The same pack (postmortem, alert PR, before/after numbers) is what good incident follow-up looks like in any team.',
        checks: [
          { id: 'rootcause', label: 'EV-RE-02: a real incident was taken to root cause, with evidence for each link', manual: true },
          { id: 'blameless', label: 'The postmortem passed a blameless review and names no individuals', manual: true },
          { id: 'actions', label: 'Every action item has a type, owner team and due date, tracked in the backlog', manual: true },
          { id: 'published', label: 'EV-RE-02: the postmortem is published and announced to the team', manual: true },
          { id: 'alert', label: 'EV-RE-02: one alert was removed or retuned on the evidence, via a reviewed PR, with before numbers', manual: true },
          { id: 'submitted', label: 'I submitted the evidence pack for CTO review', manual: true },
        ],
      },
    ],
  };

  PL.addWeek({
    week: 6,
    title: 'Alerting on SLOs and the blameless postmortem milestone',
    stream: 'rootcause',
    hours: 9,
    focus: 'Turn SLOs into multiwindow burn-rate alerts, then run a blameless postmortem on a real incident, publish it, and remove or retune one alert on the evidence.',
    apply: 'Run a blameless postmortem on a real incident. Publish it. Include the alert you removed or retuned.',
    milestone: { id: 'EV-RE-02', title: 'Blameless postmortem published', reviewer: 'CTO', passes: 'A real incident taken to root cause, published, and one alert removed or retuned on the evidence.' },
    internal: ['RCA clinic — 5 Whys, fishbone, causal chain on our own incidents · 2h'],
    topics: [t1, t2],
  });
})();
