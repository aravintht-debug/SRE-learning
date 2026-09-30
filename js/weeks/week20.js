/* Week 20 · Adoption: AZ-104 retake prep or next-cycle planning, the evidence portfolio for the Support Capability Board,
   written confirmation from the adopting team (level 4), and your Claude operating model as an SRE.
   Structure follows week01.js. Run `node tests/validate.js --week 20 --allow-missing` after editing. */
(function () {
  'use strict';
  const PL = window.PL;
  const { ADAPTIVE, user, L, obj, arr, en, S, I, B, jsonFormat, textTurn, jsonTurn, think } = PL.B;

  const SRC = {
    az104cert: { label: 'Microsoft Learn · Azure Administrator Associate (practice assessment, renewal)', url: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/' },
    az104: { label: 'Microsoft Learn · AZ-104 study guide (skills measured)', url: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104' },
    retake: { label: 'Microsoft Learn · Exam retake policy', url: 'https://learn.microsoft.com/en-us/credentials/support/retake-policy' },
    ipFlow: { label: 'Microsoft Learn · Network Watcher IP flow verify', url: 'https://learn.microsoft.com/en-us/azure/network-watcher/ip-flow-verify-overview' },
    browse: { label: 'Microsoft Learn · Browse credentials', url: 'https://learn.microsoft.com/en-us/credentials/browse/' },
    projects: { label: 'Claude Help Center · What are Projects?', url: 'https://support.claude.com/en/articles/9517075-what-are-projects' },
    cowork: { label: 'Claude docs · Cowork overview', url: 'https://claude.com/docs/cowork/overview' },
    structured: { label: 'Docs · Structured outputs', url: 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs' },
    promptBest: { label: 'Docs · Prompting best practices', url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices' },
    word: { label: 'Claude docs · Use Claude for Word', url: 'https://claude.com/docs/office-agents/word' },
    skills: { label: 'Claude docs · Skills overview', url: 'https://claude.com/docs/skills/overview' },
    ccOverview: { label: 'Claude Code docs · Overview', url: 'https://code.claude.com/docs/en/overview' },
    agents: { label: 'Anthropic engineering · Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents' },
    sreToil: { label: 'Google SRE Book · Eliminating toil', url: 'https://sre.google/sre-book/eliminating-toil/' },
    help: { label: 'Claude Help Center', url: 'https://support.claude.com/' },
  };

  /* ---- lab files ---- */
  PL.PLACEHOLDERS.W20_SCORE_REPORT = L(
    'AZ-104 score report (summary, typed from the report)',
    'Exam date: 2026-10-06 · first attempt · Result: FAIL · Score: 648 (passing score 700)',
    '',
    'Performance by skill area (my reading of the bars):',
    '  Manage Azure identities and governance ........ strong',
    '  Implement and manage storage .................. medium',
    '  Deploy and manage Azure compute resources ..... weak',
    '  Implement and manage virtual networking ....... weakest',
    '  Monitor and maintain Azure resources .......... medium',
    '',
    'Topics that felt hard (from memory, no exam content): effective routes with UDRs, private endpoint DNS, load balancer probes, VMSS scaling, moving VMs between resource groups.',
    'Time available: 6 hours per week. Today: 2026-10-07.'
  );
  PL.FILE_LABELS.W20_SCORE_REPORT = 'az104-score-report.txt';

  PL.PLACEHOLDERS.W20_PORTFOLIO_INDEX = JSON.stringify({
    learner: 'SRE, Platform Pod Atlas',
    board: 'Support Capability Board · AI ladder L4',
    items: [
      { id: 'EV-RE-01', title: 'AI ladder L2 — whole team', artefacts: ['course completion records: 7 L1 + 3 L2 courses, all team members'] },
      { id: 'EV-RE-02', title: 'Blameless postmortem published', artefacts: ['postmortem PM-0612 (published)', 'PR #481: disk alert retuned on the evidence'] },
      { id: 'EV-RE-03', title: 'Projects → Support handover gate exercised', artefacts: ['handover assessment for shop-v2: IaC reproducible, rollback proven, monitoring before hypercare end'] },
      { id: 'EV-RE-04', title: 'Support → Product capability input', artefacts: ['platform input PI-77: recurring App Service certificate failures'], written_disposition: null },
      { id: 'EV-RE-05', title: 'Production SLO, recovery and security evidence validated', artefacts: ['W12 restore from simulated compromise: report', 'W8 privileged access review + one JML removal', 'W11 SLO live, tied to checkout success', 'W16 Elastic detection rule live', 'W16 Wazuh alert route live', 'W16 tabletop record'], wazuh_iso27001_check_output: null },
      { id: 'EV-RE-06', title: 'Support → Data Intelligence outcome record', artefacts: [] },
      { id: 'EV-RE-07', title: 'Agent in production', artefacts: ['enumerated action set', 'human gate on scale_deployment', 'escalation path tested 2026-09-18'] },
      { id: 'EV-RE-08', title: 'AZ-104 exam sat', artefacts: ['exam sat 2026-10-06, result FAIL 648 recorded', 'retake booked 2026-10-27'] },
    ],
  }, null, 2);
  PL.FILE_LABELS.W20_PORTFOLIO_INDEX = 'portfolio-index.json';

  PL.PLACEHOLDERS.W20_ADOPTION_DATA = L(
    'Adoption of aks-triage-agent by Pod Orion (lead: Marco D.) · built by Platform Pod Atlas',
    'Live on aks-orion-prod since 2026-09-30. Measured over 4 weeks before and 4 weeks after.',
    '',
    'metric                                   before   after',
    'median alert triage time (minutes)       38       11',
    'pages to on-call per week (average)      23       9',
    'escalations routed correctly             n/a      12 of 12',
    'agent write actions without approval     n/a      0',
    '',
    'Issues raised by Orion during the support window: 2 (both fixed within 2 working days)',
    'Kill switch tested by Orion themselves on 2026-10-01.'
  );
  PL.FILE_LABELS.W20_ADOPTION_DATA = 'adoption-before-after.txt';

  /* =====================================================================
     Topic 1 — AZ-104 retake prep or next-cycle planning
     ===================================================================== */
  const RETAKE_PLAN = {
    result: 'fail',
    score: 648,
    earliest_retake: '2026-10-07',
    planned_retake: '2026-10-28',
    weak_domains: [
      {
        domain: 'Implement and manage virtual networking',
        why: 'Weakest bar on the report and 15-20% of the exam; UDRs, private endpoint DNS and probes felt hard.',
        labs: [
          { title: 'Check effective routes after adding a UDR', command: 'az network nic show-effective-route-table --resource-group rg-lab --name vm-lab-nic --output table' },
          { title: 'Verify whether an NSG allows a flow', command: 'az network watcher test-ip-flow --resource-group rg-lab --vm vm-lab --direction Inbound --protocol TCP --local 10.0.1.4:443 --remote 203.0.113.10:50000' },
        ],
      },
      {
        domain: 'Deploy and manage Azure compute resources',
        why: 'Weak bar on a 20-25% domain; VMSS scaling and moving VMs felt hard.',
        labs: [
          { title: 'Scale a VM Scale Set', command: 'az vmss scale --resource-group rg-lab --name vmss-lab --new-capacity 3' },
          { title: 'Move a VM and its resources to another resource group', command: 'az resource move --destination-group rg-lab-target --ids <vm-id> <nic-id> <disk-id>' },
        ],
      },
    ],
    weekly_hours: 6,
    study_plan: [
      'Week 1: networking labs daily (effective routes, IP flow verify, private endpoint DNS), redo the practice assessment networking questions',
      'Week 2: compute labs (VMSS, disks, availability zones, moving resources), then the full practice assessment',
      'Week 3: mixed review; sit the retake only if the practice assessment is 80%+ with no weak domain',
    ],
    next_cycle_note: 'After passing, plan your next certification cycle with your Service Lead, and put the AZ-104 renewal (every 12 months, free online assessment) in the calendar.',
  };

  const t1 = {
    id: 'w20-t1',
    title: 'AZ-104 · Retake prep or next-cycle planning',
    programmeItem: 'AZ-104 retake prep or next-cycle planning (free: Microsoft Learn practice assessments)',
    blurb: 'If you did not pass, use the score report to target the weak domains with a Claude study coach and set a retake date. If you passed, plan your next certification cycle and the renewal.',
    outcomes: [
      'Turn a score report into a targeted retake plan with a date that respects the retake policy',
      'Practise the weak domains hands-on in a sandbox, with CLI you understand',
      'If you passed: plan your next certification cycle and the yearly renewal',
    ],
    concepts: [
      { t: 'Read the report by skill area', d: 'The report shows how you did in each skill area. Target the weakest areas with the most weight, not everything again.', ex: 'networking weakest · compute weak' },
      { t: 'Retake timing', d: 'After a first fail you can retake after 24 hours; later attempts need 14 days between them, and at most five attempts in 12 months. You pay for retakes where applicable.', ex: 'fail 10-06 → earliest 10-07' },
      { t: 'Earliest is not best', d: 'Pick a date that leaves time for focused practice and a new practice-assessment result, usually 2–3 weeks.', ex: 'book 3 weeks out' },
      { t: 'Hands-on over re-reading', d: 'The weak areas are usually applied ones (routes, DNS, scaling). Break-and-fix labs in a sandbox fix them faster than notes.', ex: 'az network nic show-effective-route-table' },
      { t: 'Renewal', d: 'The certification is valid for 12 months and renewed with a free online assessment on Microsoft Learn.', ex: 'calendar: renewal window' },
      { t: 'Next cycle', d: 'If you passed, agree the next certification cycle with your Service Lead and reuse the same study-coach Project pattern.', ex: 'same Project, new outline' },
    ],
    leverage: [
      { t: 'Score report → plan', d: 'Paste the skill-area results and your available hours into Claude and get a dated plan that targets the weak areas, with a sandbox lab for each.' },
      { t: 'Study coach on the gaps', d: 'In your SRE Learning Project, ask for questions only on the weak areas, and for an explanation of every wrong answer against Microsoft Learn.' },
      { t: 'Labs that match your work', d: 'Ask Claude to set the labs in your own estate\'s patterns (hub-spoke, private endpoints, VMSS) so revision also improves your day job.' },
    ],
    sources: [SRC.az104cert, SRC.az104, SRC.retake, SRC.ipFlow, SRC.browse],
    quiz: [
      { q: 'You failed your first attempt on 6 October. When is the earliest retake?', options: ['Immediately', '24 hours later', '12 months later'], a: 1, why: 'The retake policy asks for a 24-hour wait after a first attempt.' },
      { q: 'You fail a second time. How long before the third attempt?', options: ['24 hours', '14 days', 'No wait'], a: 1, why: 'Subsequent attempts need 14 days between them.' },
      { q: 'Best retake plan?', options: ['Re-read everything and book tomorrow', 'Target the weakest heavy areas hands-on, confirm with a practice assessment, then book', 'Skip the practice assessment'], a: 1, why: 'Targeted practice plus a fresh practice result is the evidence you are ready.' },
    ],
    steps: [
      {
        id: 'w20-t1-s1', title: 'From score report to a dated retake plan', minutes: 10, source: SRC.retake, files: ['W20_SCORE_REPORT'],
        scenario: 'You sat AZ-104 and scored 648. Give Claude the report summary and get a structured retake plan that respects the retake policy, with sandbox labs for the weak areas.',
        task: ['Read <code>az104-score-report.txt</code>.', 'Click <b>Run</b>. The output is JSON.', 'Check the dates against the retake policy and run one lab command in your sandbox.'],
        atWork: 'Same pattern as an incident follow-up: what failed, the evidence, a targeted fix plan with dates, and a check before you call it done.',
        hint: 'A first retake needs 24 hours; the planned date should leave 2–4 weeks of practice.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: {
            effort: 'medium',
            format: jsonFormat(obj({
              result: en('pass', 'fail'),
              score: I,
              earliest_retake: S,
              planned_retake: S,
              weak_domains: arr(obj({ domain: S, why: S, labs: arr(obj({ title: S, command: S })) })),
              weekly_hours: I,
              study_plan: arr(S),
              next_cycle_note: S,
            })),
          },
          system: L('You are an AZ-104 study coach.', 'Retake policy: after a first failed attempt the candidate waits 24 hours; later attempts need 14 days between them.', 'Dates are ISO (YYYY-MM-DD). Plan a retake 2-4 weeks after the exam unless the candidate asks otherwise.', 'For each weak domain give two sandbox labs with an exact Azure CLI command using resource group rg-lab.'),
          messages: user(L('<score_report>', '{{W20_SCORE_REPORT}}', '</score_report>', 'Build my retake plan.')),
        },
        checks: [
          { id: 'result', label: 'Records the result honestly: fail, 648', test: (c, h) => { const j = h.json(c); return !!j && j.result === 'fail' && j.score === 648; } },
          { id: 'earliest', label: 'Earliest retake is 2026-10-07 (24 hours after the first attempt)', test: (c, h) => { const j = h.json(c); return !!j && j.earliest_retake === '2026-10-07'; } },
          { id: 'planned', label: 'The planned retake is 2–4 weeks after the exam', test: (c, h) => { const j = h.json(c); if (!j) return false; const d = (Date.parse(j.planned_retake) - Date.parse('2026-10-06')) / 86400000; return d >= 14 && d <= 31; } },
          { id: 'weak', label: 'Targets networking and compute', test: (c, h) => { const j = h.json(c); return !!j && j.weak_domains.some((d) => /network/i.test(d.domain)) && j.weak_domains.some((d) => /comput/i.test(d.domain)); } },
          { id: 'cli', label: 'The networking labs use real az network commands on rg-lab', test: (c, h) => { const j = h.json(c); const n = j && j.weak_domains.find((d) => /network/i.test(d.domain)); return !!n && n.labs.length >= 2 && n.labs.every((l) => /^az network /.test(l.command.trim()) && /rg-lab/.test(l.command)); } },
        ],
        sim: [jsonTurn(RETAKE_PLAN, { input_tokens: 520, output_tokens: 700 })],
      },
      {
        id: 'w20-t1-s2', kind: 'guide', title: 'Study coach for the retake, or plan your next certification cycle', minutes: 60, source: SRC.az104cert,
        scenario: 'Follow the branch that applies to you. Failed: use your SRE Learning Project to drill only the weak areas and confirm readiness with the practice assessment. Passed: plan your next certification cycle and the renewal.',
        task: ['<b>If you failed:</b> run prompts 1 and 2 in your SRE Learning Project, do the labs in a sandbox, then retake the free practice assessment.', '<b>If you passed:</b> run prompt 3, agree the plan with your Service Lead, and put the renewal in your calendar.', 'Either way, update your evidence log for EV-RE-08.'],
        prompts: [
          { label: '1 · Drill the weak areas', where: 'claude.ai', text: 'My AZ-104 score report shows virtual networking weakest and compute weak. Quiz me with 10 AZ-104-style questions on only those areas, one at a time. After each answer, explain why each option is right or wrong and name the Microsoft Learn page to confirm. Keep a running score, and at the end list the concepts I still miss.' },
          { label: '2 · Break-and-fix lab', where: 'claude.ai', text: 'Build a 30-minute sandbox lab in resource group rg-lab: a hub-spoke VNet pair with peering, a UDR that sends spoke traffic to a non-existent next hop, and a private endpoint whose DNS zone is not linked. Give az CLI to build it, the symptoms I should see, the diagnostic commands (effective routes, IP flow verify, nslookup from a VM), the fixes, and az group delete --name rg-lab to clean up.' },
          { label: '3 · Next certification cycle (if passed)', where: 'claude.ai', text: 'I passed AZ-104. Help me plan my next certification cycle as an SRE working on Azure, Terraform, Elastic and Wazuh. Give 2-3 options that build on AZ-104, with the skills each adds to my role, a realistic 12-week study plan for the one I choose with my Service Lead, and a reminder for the AZ-104 renewal assessment before it expires in 12 months. Point me to the official Microsoft Learn or vendor pages to confirm each option.' },
        ],
        expected: ['Failed: 10 drilled questions, one lab done, and a new practice-assessment result', 'Passed: a next-cycle plan agreed with your Service Lead and a renewal reminder', 'EV-RE-08 evidence updated'],
        verify: 'Confirm every explanation, and any certification Claude suggests, on Microsoft Learn or the vendor\'s official page. Do not paste or reconstruct real exam questions.',
        atWork: 'A study-coach Project and sandbox labs is the pattern for learning any new platform your team adopts, not only for exams.',
        checks: [
          { id: 'branch', label: 'I followed the branch that applies to me (retake prep or next cycle)', manual: true },
          { id: 'practice', label: 'Failed: I retook the practice assessment. Passed: I agreed the next-cycle plan', manual: true },
          { id: 'evidence', label: 'I updated the EV-RE-08 evidence log', manual: true },
        ],
      },
    ],
  };

  /* =====================================================================
     Topic 2 — Build your evidence portfolio with Claude
     ===================================================================== */
  const GAPS = {
    items: [
      { id: 'EV-RE-01', status: 'complete', gap: 'None: completion records for all seven L1 and three L2 courses.', owner_to_chase: 'none' },
      { id: 'EV-RE-02', status: 'complete', gap: 'None: postmortem published and an alert retuned (PR #481).', owner_to_chase: 'none' },
      { id: 'EV-RE-03', status: 'complete', gap: 'None: handover assessed for reproducibility, rollback and monitoring.', owner_to_chase: 'none' },
      { id: 'EV-RE-04', status: 'partial', gap: 'Platform input PI-77 raised, but no written disposition from the Product Lead.', owner_to_chase: 'Product Lead' },
      { id: 'EV-RE-05', status: 'partial', gap: 'All W8/W11/W12/W16 items present except the Wazuh ISO 27001 check output for ISMS evidence.', owner_to_chase: 'Quality & Release Steward' },
      { id: 'EV-RE-06', status: 'missing', gap: 'No outcome record: needs one reliability issue as expected-before and actual-after (toil hours or alert volume).', owner_to_chase: 'Data Intelligence Engineer' },
      { id: 'EV-RE-07', status: 'complete', gap: 'None: action set, human gate and tested escalation path.', owner_to_chase: 'none' },
      { id: 'EV-RE-08', status: 'complete', gap: 'None: exam sat, fail recorded, retake date set. That is what the milestone asks for.', owner_to_chase: 'none' },
    ],
    ready_for_board: false,
    next_actions: [
      'Ask the Product Lead for a written disposition on PI-77 (EV-RE-04)',
      'Run the Wazuh ISO 27001 check and attach the output (EV-RE-05)',
      'Write the EV-RE-06 outcome record with the Data Intelligence Engineer: pages per week before and after',
      'Get the adopting pod lead\'s written confirmation for EV-RE-09',
    ],
  };

  const t2 = {
    id: 'w20-t2',
    title: 'Build your evidence portfolio with Claude',
    programmeItem: 'Evidence portfolio · assemble EV-RE-01 to EV-RE-08 for the Support Capability Board',
    blurb: 'The Board examines EV-RE-01 to EV-RE-08. Use Claude to index your evidence, find the gaps early, and assemble a portfolio a reviewer can check quickly.',
    outcomes: [
      'Build a portfolio index that maps every milestone to its artefacts',
      'Use Claude to find missing and partial evidence against each milestone\'s pass criteria',
      'Assemble the portfolio so the Board can verify each item quickly',
    ],
    concepts: [
      { t: 'Pass criteria drive it', d: 'Check each item against the exact words of its milestone. "Published", "written disposition" and "tested" each need their own artefact.', ex: 'EV-RE-04 needs a written disposition' },
      { t: 'Index first', d: 'A single index (id, title, artefacts, links) is what the Board reads first, and what Claude can check.', ex: 'portfolio-index.json' },
      { t: 'Complete, partial, missing', d: 'Mark each item honestly. A partial item with a named owner to chase is better than a vague "done".', ex: 'EV-RE-05 partial: Wazuh output' },
      { t: 'A fail can be complete', d: 'EV-RE-08 asks for the exam to be sat and the result recorded, with a retake date if it failed. A recorded fail meets it.', ex: 'FAIL 648 recorded + retake date' },
      { t: 'Evidence, not narrative', d: 'Link the artefact itself (PR, published postmortem, alert rule, record). The narrative is one line per item.', ex: 'PR #481, not "I tuned alerts"' },
    ],
    leverage: [
      { t: 'Gap check against criteria', d: 'Give Claude the milestone table and your index, and get complete/partial/missing per item with the exact missing artefact.' },
      { t: 'Assemble in Cowork', d: 'Point Cowork at a copy of your evidence folder to build the index, rename files consistently and produce a cover sheet.' },
      { t: 'Chase list', d: 'Have Claude draft short, specific requests to each owner for the missing artefacts. You review and send them yourself.' },
    ],
    sources: [SRC.structured, SRC.cowork, SRC.promptBest],
    quiz: [
      { q: 'EV-RE-08: you failed AZ-104, recorded it and set a retake date. Status?', options: ['Missing', 'Complete: the milestone asks for the result recorded and a retake date', 'Partial'], a: 1, why: 'The pass criterion is sitting the exam and recording the result, not passing.' },
      { q: 'EV-RE-04 has the platform input but no reply from the Product Lead. Status?', options: ['Complete', 'Partial: the written disposition is missing', 'Not needed'], a: 1, why: 'The milestone requires a written disposition received.' },
    ],
    steps: [
      {
        id: 'w20-t2-s1', title: 'Gap-check your portfolio index', minutes: 10, source: SRC.structured, files: ['W20_PORTFOLIO_INDEX'],
        scenario: 'Your portfolio index lists the artefacts you have for EV-RE-01 to EV-RE-08. Ask Claude to check it against the milestone pass criteria and report the gaps.',
        task: ['Read <code>portfolio-index.json</code>. Some items are incomplete.', 'Click <b>Run</b>. The output is JSON.', 'Confirm each gap against the milestone wording in the system prompt.'],
        atWork: 'Checking evidence against explicit criteria is the same skill as an audit or change-readiness review: Claude does the cross-check, and you confirm and chase.',
        hint: 'Read the null fields and the empty artefact list.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE,
          output_config: {
            effort: 'medium',
            format: jsonFormat(obj({
              items: arr(obj({ id: S, status: en('complete', 'partial', 'missing'), gap: S, owner_to_chase: S })),
              ready_for_board: B,
              next_actions: arr(S),
            })),
          },
          system: L(
            'You check an SRE evidence portfolio against these milestone pass criteria. Mark an item complete only when every required artefact is present.',
            'EV-RE-01: all seven L1 Claude courses and the three L2 courses complete.',
            'EV-RE-02: a real incident taken to root cause, published, and one alert removed or retuned on the evidence.',
            'EV-RE-03: a real handover assessed for operability: environments reproducible from code, rollback proven, monitoring in place before hypercare ended.',
            'EV-RE-04: one recurring platform failure converted into a product or platform input, with a written disposition received (reviewer: Product Lead).',
            'EV-RE-05: restore from a simulated compromise; privileged access review and one JML removal; SLO live; one Elastic detection rule and one Wazuh alert route live with a tabletop record; Wazuh ISO 27001 check output attached as ISMS evidence (reviewers: CTO and Quality & Release Steward).',
            'EV-RE-06: one reliability issue as expected-before and actual-after, in toil hours or alert volume (reviewer: Data Intelligence Engineer).',
            'EV-RE-07: enumerated action set, human gate on anything irreversible, tested escalation path.',
            'EV-RE-08: AZ-104 sat and the result recorded; a fail is recorded, not hidden, and a retake date set.',
            'ready_for_board is true only if all eight items are complete.'
          ),
          messages: user(L('<portfolio_index>', '{{W20_PORTFOLIO_INDEX}}', '</portfolio_index>', 'Check every item and list the gaps.')),
        },
        checks: [
          { id: 'all', label: 'All eight items EV-RE-01 to EV-RE-08 are reported', test: (c, h) => { const j = h.json(c); return !!j && [1, 2, 3, 4, 5, 6, 7, 8].every((n) => j.items.some((x) => x.id === 'EV-RE-0' + n)); } },
          { id: 'missing6', label: 'EV-RE-06 is missing', test: (c, h) => { const j = h.json(c); const x = j && j.items.find((i) => i.id === 'EV-RE-06'); return !!x && x.status === 'missing'; } },
          { id: 'partial4', label: 'EV-RE-04 is partial because the written disposition is missing', test: (c, h) => { const j = h.json(c); const x = j && j.items.find((i) => i.id === 'EV-RE-04'); return !!x && x.status === 'partial' && /disposition/i.test(x.gap); } },
          { id: 'partial5', label: 'EV-RE-05 is partial because the Wazuh ISO 27001 output is missing', test: (c, h) => { const j = h.json(c); const x = j && j.items.find((i) => i.id === 'EV-RE-05'); return !!x && x.status === 'partial' && /wazuh/i.test(x.gap) && /iso/i.test(x.gap); } },
          { id: 'fail8', label: 'EV-RE-08 is complete (a recorded fail with a retake date meets it)', test: (c, h) => { const j = h.json(c); const x = j && j.items.find((i) => i.id === 'EV-RE-08'); return !!x && x.status === 'complete'; } },
          { id: 'ready', label: 'Not ready for the Board yet', test: (c, h) => { const j = h.json(c); return !!j && j.ready_for_board === false; } },
        ],
        sim: [jsonTurn(GAPS, { input_tokens: 980, output_tokens: 620 })],
      },
      {
        id: 'w20-t2-s2', kind: 'guide', title: 'Assemble the portfolio in Cowork', minutes: 90, source: SRC.cowork,
        scenario: 'Collect your real evidence into one folder, let Cowork build the index and cover sheet, run the gap check, and close the gaps before you meet your Service Lead.',
        task: ['Copy every artefact (or a link file for it) into a folder named <code>portfolio/EV-RE-0N/</code>, one folder per milestone. Redact secrets and customer data.', 'In Cowork, give access to that folder only and run prompt 1, then prompt 2.', 'Use prompt 3 for the chase list. Review each request and send it yourself.'],
        prompts: [
          { label: '1 · Build the index', where: 'Cowork', text: 'In this portfolio folder, build portfolio-index.json and portfolio-index.xlsx: one row per milestone EV-RE-01 to EV-RE-08, with title, each artefact (file name or link), its date, and who reviewed it. Do not edit or move the artefacts. Flag any file that looks like it contains a secret or customer data.' },
          { label: '2 · Gap check and cover sheet', where: 'Cowork', text: 'Check each milestone against its pass criteria (pasted below) and mark it complete, partial or missing, naming the exact missing artefact. Then write portfolio-cover.docx: one page, one line per milestone with status and link, for the Support Capability Board.\n[paste the EV-RE-01 to EV-RE-08 pass criteria]' },
          { label: '3 · Chase list', where: 'claude.ai', text: 'For each partial or missing item below, draft a two-sentence request to the owner: what I need, why (the milestone), and the date I need it by. Polite, specific, no jargon.\n[paste gap list]' },
        ],
        expected: ['A portfolio folder with an index and a one-page cover sheet', 'Every partial or missing item has a named owner and a date', 'No secrets or customer data in the portfolio'],
        verify: 'Open every link in the index yourself; a broken link counts as missing evidence at the Board.',
        atWork: 'The same folder + index + cover sheet pattern works for audits, ISMS evidence and change readiness reviews.',
        checks: [
          { id: 'folder', label: 'All my evidence is in one folder with an index', manual: true },
          { id: 'gaps', label: 'I ran the gap check and chased every gap myself', manual: true },
          { id: 'cover', label: 'The one-page cover sheet is ready for my Service Lead', manual: true },
        ],
      },
    ],
  };

  /* =====================================================================
     Topic 3 — Apply: written confirmation from the adopting team (EV-RE-09)
     ===================================================================== */
  const CONFIRM = L(
    '## Adoption summary',
    'Pod Orion has run **aks-triage-agent** (built by Platform Pod Atlas) on `aks-orion-prod` since 2026-09-30. Figures compare 4 weeks before with 4 weeks after go-live.',
    '',
    '## Before and after',
    '| Metric | Before | After | Change |',
    '|---|---|---|---|',
    '| Median alert triage time | 38 min | 11 min | -71% |',
    '| Pages to on-call per week | 23 | 9 | -61% |',
    '| Escalations routed correctly | n/a | 12 of 12 | |',
    '| Write actions without approval | n/a | 0 | |',
    '',
    'Orion tested the kill switch themselves on 2026-10-01. They raised 2 issues during the support window; both were fixed within 2 working days.',
    '',
    '## Confirmation request',
    'Hi Marco,',
    '',
    'Thanks for adopting aks-triage-agent. For my Support Capability Board review (milestone EV-RE-09), could you confirm **in writing**, by replying to this message, that Pod Orion uses the agent on real work and that the figures above are accurate? If any number looks wrong to you, please correct it rather than confirm it.',
    '',
    'Suggested wording, edit freely:',
    '> "Pod Orion has used aks-triage-agent on aks-orion-prod since 30 September 2026. The before/after figures in this summary are accurate to our knowledge. — Marco D., Pod Orion lead"',
    '',
    'Thanks,',
    '[your name]'
  );

  const t3 = {
    id: 'w20-t3',
    title: 'Apply: get written confirmation from the adopting team\'s lead',
    programmeItem: 'Apply task · Get written confirmation from the adopting team\'s lead. This is what awards level 4.',
    blurb: 'Level 4 means another pod adopts what you built and confirms it in writing. Claude drafts the adoption summary with before/after numbers and the confirmation request; you check the numbers and send it yourself.',
    outcomes: [
      'Write an adoption summary with correct before/after numbers',
      'Ask for a specific, written confirmation the Board can rely on',
      'Assemble EV-RE-09 with the portfolio for the Support Capability Board',
    ],
    concepts: [
      { t: 'Adoption is the evidence', d: 'The Board looks for another pod using what you built on real work, confirmed by their lead, not by you.', ex: 'Orion lead confirms in writing' },
      { t: 'Before and after', d: 'Use the same measure over comparable periods and show the change, so the claim can be checked.', ex: '38 → 11 min (-71%)' },
      { t: 'Ask for accuracy, not praise', d: 'Ask the lead to confirm the facts and correct anything wrong. A corrected number is still strong evidence; an inflated one is not.', ex: '"correct it rather than confirm it"' },
      { t: 'Suggested wording', d: 'Offer a short statement they can edit. It makes replying easy and keeps the confirmation specific.', ex: '"…figures accurate to our knowledge"' },
      { t: 'You send it', d: 'Claude drafts; you review the numbers and send it from your own account.', ex: 'draft → review → send' },
    ],
    leverage: [
      { t: 'Numbers you can defend', d: 'Give Claude the raw before/after data and ask it to compute changes and show its working, then recheck the arithmetic yourself.' },
      { t: 'Summary and request together', d: 'One prompt produces the adoption summary, the confirmation email and the suggested wording, which keeps them consistent.' },
      { t: 'Board-ready pack', d: 'Have Claude add the confirmation to the portfolio cover sheet with a link, so EV-RE-09 sits next to EV-RE-01 to EV-RE-08.' },
    ],
    sources: [SRC.word, SRC.promptBest, SRC.sreToil],
    quiz: [
      { q: 'Triage time went from 38 to 11 minutes. What is the reduction?', options: ['27%', 'About 71%', '11%'], a: 1, why: '(38 − 11) / 38 ≈ 0.71.' },
      { q: 'Who must confirm adoption for level 4?', options: ['You', 'The adopting team\'s lead, in writing', 'Claude'], a: 1, why: 'The milestone requires another pod to confirm it in writing.' },
    ],
    steps: [
      {
        id: 'w20-t3-s1', title: 'Draft the adoption summary and confirmation request', minutes: 10, source: SRC.promptBest, files: ['W20_ADOPTION_DATA'],
        scenario: 'Pod Orion has used your agent for four weeks. Ask Claude for the adoption summary with correct before/after changes and a confirmation request to their lead.',
        task: ['Read <code>adoption-before-after.txt</code>.', 'Click <b>Run</b>.', 'Recheck both percentages yourself before you would send anything.'],
        atWork: 'Any time you ship something for another team (a pipeline, a module, a dashboard), close the loop with numbers and a written confirmation. It is the strongest evidence of impact.',
        hint: 'Change = (before − after) / before.',
        body: {
          max_tokens: 16000, thinking: ADAPTIVE, output_config: { effort: 'medium' },
          system: 'You help an SRE close out an adoption. Use only the data given, compute percentage changes correctly (rounded to whole numbers), never overstate, and write in plain English. Use the Markdown H2 sections: Adoption summary, Before and after, Confirmation request.',
          messages: user(L('<adoption_data>', '{{W20_ADOPTION_DATA}}', '</adoption_data>', 'Write the adoption summary with a before/after table, then a short message to the adopting pod lead asking them to confirm in writing, for milestone EV-RE-09, with suggested wording they can edit.')),
        },
        checks: [
          { id: 'sections', label: 'Has the Adoption summary, Before and after, and Confirmation request sections', test: (c, h) => ['Adoption summary', 'Before and after', 'Confirmation request'].every((s) => h.section(c, s)) },
          { id: 'triage', label: 'Triage time 38 → 11 min, a reduction of about 71%', test: (c, h) => /38/.test(h.text(c)) && /\b11\b/.test(h.text(c)) && /71\s*%/.test(h.text(c)) },
          { id: 'pages', label: 'Pages per week 23 → 9, a reduction of about 61%', test: (c, h) => /23/.test(h.text(c)) && /\b9\b/.test(h.text(c)) && /61\s*%/.test(h.text(c)) },
          { id: 'written', label: 'Asks the lead to confirm in writing, for EV-RE-09', test: (c, h) => /in writing|written confirmation|reply/i.test(h.text(c)) && /EV-RE-09/.test(h.text(c)) },
          { id: 'honest', label: 'Invites corrections and does not overclaim', test: (c, h) => /correct/i.test(h.text(c)) && !/guarantee|100% (reduction|success)/i.test(h.text(c)) },
        ],
        sim: [{
          content: [think('Triage: (38-11)/38 = 0.7105 → 71%. Pages: (23-9)/23 = 0.6087 → 61%. Ask for accuracy and corrections.'), { type: 'text', text: CONFIRM }],
          stop_reason: 'end_turn', usage: { input_tokens: 420, output_tokens: 560 },
        }],
      },
      {
        id: 'w20-t3-s2', kind: 'guide', title: 'Get the confirmation and complete EV-RE-09', minutes: 45, source: SRC.word,
        scenario: 'Do it for real: agree the numbers with the adopting pod, send the request yourself, and file the confirmation with your portfolio for the Support Capability Board.',
        task: ['Pull the real before/after numbers with the adopting pod (same measure, comparable periods).', 'Run prompt 1 in Claude for Word to draft the summary and request, review every number, then send it yourself from your own account.', 'When the reply arrives, run prompt 2 to add it to the portfolio cover sheet.'],
        prompts: [
          { label: '1 · Summary and request', where: 'Claude for Word', text: 'Using the before/after data below, write a one-page adoption summary for [tool/agent] adopted by [pod], with a table (metric, before, after, change %) and your working for each percentage. Then draft a short message to [lead name] asking them to confirm in writing that their pod uses it on real work and the figures are accurate, inviting corrections, with suggested wording they can edit. Mention milestone EV-RE-09.\n[paste data, no customer data]' },
          { label: '2 · File it with the portfolio', where: 'Cowork', text: 'Add the confirmation reply (saved as portfolio/EV-RE-09/confirmation.pdf) to portfolio-index.json and to the cover sheet as EV-RE-09, with the date and the confirming lead\'s role. Then list anything still partial or missing across EV-RE-01 to EV-RE-09.' },
        ],
        expected: ['Numbers agreed with the adopting pod', 'A written confirmation from their lead', 'EV-RE-09 filed with EV-RE-01 to EV-RE-08 for the Board'],
        verify: 'Recalculate each percentage yourself, and have the adopting pod check the raw numbers before you send the request.',
        atWork: 'This is what level 4 means: what you built is used by others and they say so in writing.',
        checks: [
          { id: 'numbers', label: 'The before/after numbers are agreed with the adopting pod', manual: true },
          { id: 'confirm', label: 'I have the adopting lead\'s written confirmation (EV-RE-09)', manual: true },
          { id: 'filed', label: 'EV-RE-09 is filed with the portfolio for the Support Capability Board', manual: true },
        ],
      },
    ],
  };

  /* =====================================================================
     Topic 4 — Your Claude operating model as an SRE
     ===================================================================== */
  const t4 = {
    id: 'w20-t4',
    title: 'Your Claude operating model as an SRE',
    programmeItem: 'Programme close · your personal Claude operating model (daily and weekly habits, guardrails, what to automate next)',
    blurb: 'Twenty weeks of practice become a working model: which Claude surface you use for which job, the daily and weekly habits, the guardrails you keep, and what you automate next.',
    outcomes: [
      'Map your recurring SRE work to the right Claude surface',
      'Set daily and weekly habits, and the guardrails you never skip',
      'Pick the next two things to automate, with a measure for each',
    ],
    concepts: [
      { t: 'Right surface, right job', d: 'claude.ai and Projects for thinking and explaining; Claude Code for repos, IaC and scripts; Cowork for multi-file chores; Claude in Excel, Word and PowerPoint for reports; the API and agents for repeatable automation.', ex: 'IaC review → Claude Code' },
      { t: 'Daily habits', d: 'Explain alerts and errors in context, draft changes and commands for review, summarize handovers and incident channels.', ex: 'on-call handover summary' },
      { t: 'Weekly habits', d: 'Toil review, runbook hygiene, FinOps and SLO reviews, and updating the prompt pack and skills with what you learned.', ex: 'Friday toil review' },
      { t: 'Guardrails', d: 'Redact secrets and customer data, verify against official docs, human approval on anything irreversible, least-privilege tools for agents, and log what was automated.', ex: 'no auto-apply to prod' },
      { t: 'Automate next', d: 'Pick toil that is frequent, well understood and easy to check, and measure it before and after, as you did for EV-RE-06 and EV-RE-09.', ex: 'cert-expiry triage agent' },
      { t: 'Keep improving', d: 'Evaluate prompts and skills with test cases when they change, and review the operating model every quarter.', ex: 'quarterly review' },
    ],
    leverage: [
      { t: 'A personal plan in a Project', d: 'Keep your operating plan in a Claude Project with your prompt pack, so every chat follows your habits and guardrails.' },
      { t: 'Toil to automation pipeline', d: 'Each week, give Claude your toil log and ask which item is the best next candidate for a skill, a script or an agent, with the measure to use.' },
      { t: 'Share it', d: 'Turn your operating model into a one-page team standard and a skill, so new joiners start where you finished.' },
    ],
    sources: [SRC.projects, SRC.skills, SRC.ccOverview, SRC.cowork, SRC.agents, SRC.sreToil],
    quiz: [
      { q: 'Best surface for reviewing a Terraform change across a repo?', options: ['A spreadsheet', 'Claude Code in the repo', 'A PowerPoint deck'], a: 1, why: 'Claude Code works directly in the repo and the terminal.' },
      { q: 'Which toil is the best next automation candidate?', options: ['Rare and ambiguous', 'Frequent, well understood and easy to check', 'Anything irreversible'], a: 1, why: 'Frequent, well-understood, checkable work gives safe, measurable gains.' },
    ],
    steps: [
      {
        id: 'w20-t4-s1', kind: 'guide', title: 'Write your personal Claude operating plan', minutes: 45, source: SRC.projects,
        scenario: 'Turn what worked over the programme into a one-page operating plan you will actually follow, kept in a Claude Project with your prompt pack.',
        task: ['Collect your Week 1 task log, prompt pack, confidently-wrong clinic notes and toil logs (redacted).', 'Create a Project called "My SRE operating model", add them as knowledge, and run prompts 1 and 2.', 'Review the plan with your Service Lead and set a quarterly review date.'],
        prompts: [
          { label: '1 · Operating plan', where: 'claude.ai', text: 'From my logs and notes in this Project, write my one-page Claude operating plan as an SRE with these sections:\n1. Surfaces: which Claude surface I use for which recurring job (claude.ai/Projects, Claude Code, Cowork, Claude for Excel/Word/PowerPoint, API/agents), with one real example each from my logs.\n2. Daily habits (max 5) and weekly habits (max 5).\n3. Guardrails I never skip (redaction, verify against official docs, human approval on irreversible actions, least-privilege tools, logging).\n4. Where Claude was wrong before, and how I will catch it.\n5. Next two automations: the toil item, the approach (skill, script or agent), the before measure, and the target.\nKeep it to one page and use my own examples, not generic ones.' },
          { label: '2 · Challenge the plan', where: 'claude.ai', text: 'Now critique the plan as a sceptical Service Lead: which habit is unrealistic, which guardrail is missing for our estate (Azure, Terraform, Proxmox, Elastic, Wazuh, Key Vault, backups), and which automation is riskier than it looks? Then give me the revised plan.' },
          { label: '3 · Make it a skill (optional)', where: 'claude.ai', text: 'Use the skill-creator skill to turn my guardrails and weekly toil review into a skill named sre-operating-model, with a description that triggers when I ask for a weekly review or plan an automation.' },
        ],
        expected: ['A one-page operating plan with real examples from your own logs', 'Guardrails that match your estate', 'Two next automations, each with a before measure and a target'],
        verify: 'Check each surface-to-job mapping against what the product docs say it supports (Claude Code, Cowork, Claude for Microsoft 365), and have your Service Lead sign off the guardrails.',
        atWork: 'This plan is how you keep using Claude well after the programme ends: clear habits, firm guardrails, and a steady list of toil to automate.',
        checks: [
          { id: 'plan', label: 'I wrote my one-page operating plan with my own examples', manual: true },
          { id: 'challenge', label: 'I ran the critique and revised the plan', manual: true },
          { id: 'review', label: 'I reviewed it with my Service Lead and set a quarterly review date', manual: true },
        ],
      },
    ],
  };

  PL.addWeek({
    week: 20,
    title: 'Evidence, adoption and level 4',
    stream: 'adoption',
    hours: 9,
    focus: 'Close the programme: AZ-104 retake prep or next-cycle planning, assemble the EV-RE-01 to EV-RE-08 portfolio, get written confirmation from the adopting team for level 4, and set your Claude operating model as an SRE.',
    apply: 'Get written confirmation from the adopting team\'s lead. This is what awards level 4.',
    milestone: { id: 'EV-RE-09', title: 'AI ladder L4 · Support Capability Board', reviewer: 'Board: Service Lead + Product or Projects representative + Engine COO · CTO attends', passes: 'Another pod adopts what you built and confirms it in writing. The Board examines EV-RE-01 to EV-RE-08.' },
    internal: ['Evidence clinic — assemble your portfolio with your Service Lead · 3h'],
    topics: [t1, t2, t3, t4],
  });
})();
