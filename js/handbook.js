/* SRE Learning · Handbook page: everything about the course, how it works and how it was built, in one place. */
(function () {
  'use strict';
  const PL = window.PL;
  const { esc } = PL.util;

  /* ---------- small SVG helpers (dark theme) ---------- */
  const C = { box: '#18223f', line: '#2d3d6b', text: '#e2e8f0', sub: '#94a3b8', blue: '#4b76ff', green: '#10b981', amber: '#f59e0b', purple: '#a78bfa', pink: '#f472b6' };
  const box = (x, y, w, h, title, sub, color) =>
    '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="12" fill="' + C.box + '" stroke="' + (color || C.line) + '" stroke-width="1.5"/>' +
    '<text x="' + (x + w / 2) + '" y="' + (y + (sub ? h / 2 - 4 : h / 2 + 5)) + '" text-anchor="middle" fill="' + C.text + '" font-size="14" font-weight="700">' + esc(title) + '</text>' +
    (sub ? '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 15) + '" text-anchor="middle" fill="' + C.sub + '" font-size="11.5">' + esc(sub) + '</text>' : '');
  const arrow = (x1, y1, x2, y2, label, dashed) =>
    '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + C.sub + '" stroke-width="1.6" marker-end="url(#ah)"' + (dashed ? ' stroke-dasharray="5 4"' : '') + '/>' +
    (label ? '<text x="' + ((x1 + x2) / 2) + '" y="' + ((y1 + y2) / 2 - 7) + '" text-anchor="middle" fill="' + C.sub + '" font-size="11">' + esc(label) + '</text>' : '');
  const svg = (w, h, body, title) => '<figure class="hb-fig"><svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(title) + '" class="w-full h-auto">' +
    '<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="' + C.sub + '"/></marker></defs>' + body + '</svg><figcaption>' + esc(title) + '</figcaption></figure>';

  const flowLearning = () => svg(980, 150,
    box(10, 35, 170, 80, '1 · Briefing', 'from official docs', C.blue) + arrow(180, 75, 205, 75) +
    box(205, 35, 175, 80, '2 · Do it in Claude', 'claude.ai · Claude Code', C.purple) + arrow(380, 75, 405, 75) +
    box(405, 35, 175, 80, '3 · API playground', 'real request, auto-checked', C.amber) + arrow(580, 75, 605, 75) +
    box(605, 35, 170, 80, '4 · Checks ✓', 'progress saved', C.green) + arrow(775, 75, 800, 75) +
    box(800, 35, 170, 80, '5 · Leverage at work', 'pipelines · runbooks', C.pink),
    'Figure 1 · How every topic works');

  const flowLab = () => svg(980, 330,
    box(10, 20, 190, 70, 'Request JSON', 'what you edit on the right', C.blue) + arrow(200, 55, 230, 55) +
    box(230, 20, 200, 70, 'Prepare', 'fill files · redact · adapt model') + arrow(430, 55, 510, 32, 'key set') + arrow(430, 55, 510, 102, 'no key', true) +
    box(510, 5, 220, 55, 'Live: api.anthropic.com', 'your key, direct from browser', C.green) +
    box(510, 75, 220, 55, 'Simulated', 'pre-recorded expert answer', C.amber) +
    arrow(730, 32, 770, 55) + arrow(730, 102, 770, 55) +
    box(770, 20, 200, 70, 'Streamed response', 'text · thinking · tool calls') +
    arrow(870, 90, 870, 150, 'stop_reason = tool_use?') +
    box(770, 150, 200, 70, 'Your browser runs the tool', 'calculator · kubectl_get …', C.purple) +
    arrow(770, 185, 730, 185) + box(510, 150, 220, 70, 'tool_result sent back', 'loop until final answer') + arrow(620, 150, 620, 132, '', true) +
    arrow(510, 185, 470, 185) + box(250, 150, 220, 70, 'Final answer', 'rendered + raw JSON') +
    arrow(360, 220, 360, 255) + box(250, 255, 220, 60, 'Checks run', 'pass → step complete', C.green) +
    arrow(250, 285, 210, 285) + box(10, 255, 200, 60, 'Progress saved', 'browser · or cloud if signed in'),
    'Figure 2 · What happens when you press Run in the API playground');

  const flowArch = () => svg(980, 300,
    box(10, 20, 180, 70, 'GitHub repo', 'site code + week content', C.blue) + arrow(190, 55, 280, 55, 'git push') +
    box(280, 20, 190, 70, 'GitHub Actions', 'validate.js → deploy', C.amber) + arrow(470, 55, 560, 55, 'if checks pass') +
    box(560, 20, 180, 70, 'GitHub Pages', 'static files, free hosting', C.green) + arrow(650, 90, 650, 125, '') +
    '<text x="662" y="112" fill="' + C.sub + '" font-size="11">loads site</text>' +
    box(530, 125, 240, 70, 'Your browser', 'runs the whole app (no server)', C.purple) +
    arrow(770, 145, 810, 118) + box(810, 85, 160, 62, 'api.anthropic.com', 'optional · your API key', C.green) +
    arrow(770, 175, 810, 205, '', true) + box(810, 180, 160, 62, 'Supabase', 'optional · login + sync', C.pink) +
    arrow(530, 160, 460, 160) + box(250, 125, 210, 70, 'Browser storage', 'progress · API key (session)') +
    '<text x="490" y="275" text-anchor="middle" fill="' + C.sub + '" font-size="11.5">Nothing else is contacted: the page\x27s security policy blocks every other destination.</text>',
    'Figure 3 · How the site is built, deployed and connected');

  const flowWork = () => svg(980, 170,
    box(10, 45, 145, 80, 'Alert / toil', 'the trigger', C.amber) + arrow(155, 85, 180, 85) +
    box(180, 45, 160, 80, 'Claude drafts', 'RCA · IaC · KQL · runbook', C.purple) + arrow(340, 85, 365, 85) +
    box(365, 45, 160, 80, 'Automated checks', 'plan · validate · tests', C.blue) + arrow(525, 85, 550, 85) +
    box(550, 45, 160, 80, 'Human gate', 'review · approve', C.pink) + arrow(710, 85, 735, 85) +
    box(735, 45, 110, 80, 'Pipeline', 'applies it', C.green) + arrow(845, 85, 870, 85) +
    box(870, 45, 100, 80, 'Measure', 'toil · alerts', C.green) +
    '<path d="M920 125 Q920 160 490 160 Q82 160 82 125" fill="none" stroke="' + C.sub + '" stroke-width="1.4" stroke-dasharray="5 4" marker-end="url(#ah)"/>' +
    '<text x="490" y="152" text-anchor="middle" fill="' + C.sub + '" font-size="11">learn from the numbers → improve the prompt, skill or agent</text>',
    'Figure 4 · The pattern every week teaches: Claude drafts, checks and humans decide, the pipeline acts');

  const flowLogin = () => svg(980, 150,
    box(10, 40, 170, 70, 'Open the site', 'sign-in screen first', C.blue) + arrow(180, 75, 210, 75) +
    box(210, 40, 180, 70, 'Sign in / Sign up', '@swiftant.com + password', C.purple) + arrow(390, 75, 420, 75) +
    box(420, 40, 180, 70, 'Supabase Auth', 'confirms who you are', C.pink) + arrow(600, 75, 630, 75) +
    box(630, 40, 170, 70, 'Merge progress', 'browser + cloud', C.amber) + arrow(800, 75, 830, 75) +
    box(830, 40, 140, 70, 'Team view', 'see each other', C.green),
    'Figure 5 · Login and progress sync');

  const flowWorkspace = () => svg(980, 150,
    box(10, 40, 180, 70, 'Week 1 · Step 0', 'set up once', C.blue) + arrow(190, 75, 215, 75) +
    box(215, 40, 185, 70, 'Every guide step', 'Project chat or week folder', C.purple) + arrow(400, 75, 425, 75) +
    box(425, 40, 175, 70, 'Notes + evidence', 'week-NN/notes.md', C.amber) + arrow(600, 75, 625, 75) +
    box(625, 40, 170, 70, 'Week wrap-up', 'summary → Project files', C.green) + arrow(795, 75, 820, 75) +
    box(820, 40, 150, 70, 'Next week', 'Claude knows it all', C.pink) +
    '<path d="M895 110 Q895 140 490 140 Q307 140 307 112" fill="none" stroke="' + C.sub + '" stroke-width="1.4" stroke-dasharray="5 4" marker-end="url(#ah)"/>',
    'Figure 3a · Your SRE Learning workspace grows every week');

  const flowRoutine = () => svg(980, 150,
    [['Week page', 'focus · task · milestone', C.blue], ['Briefing + quiz', 'concepts from the docs', C.blue], ['API playground', 'see the pattern work', C.amber],
      ['Do it in Claude', 'in your workspace', C.purple], ['Apply + milestone', 'real task · evidence', C.pink], ['Wrap-up', 'summary → Project', C.green]]
      .map((b, i) => box(10 + i * 163, 40, 145, 70, b[0], b[1], b[2]) + (i < 5 ? arrow(155 + i * 163, 75, 173 + i * 163, 75) : '')).join(''),
    'Figure 3b · Your routine every week, from Week 1 to Week 20');

  /* Section 4: how to actually complete the programme with Claude, built from the live content so it never drifts. */
  function howSection(W) {
    const WS = PL.WS;
    const surfaces = ['claude.ai', 'Claude Code', 'Cowork', 'Claude for Excel', 'Claude for Word', 'Claude for PowerPoint'];
    const find = (id) => { for (const w of W) for (const t of w.topics) { const i = t.steps.findIndex((s) => s.id === id); if (i >= 0) return { w, t, s: t.steps[i], i }; } return null; };
    const ex = find('w07-t1-s1') || find('w01-t1-s1');
    const exHtml = ex && WS ? '<div class="card p-4 my-3"><div class="font-semibold text-white">Example: <a class="src-link" href="#/m/' + ex.t.id + '/lab/' + (ex.i + 1) + '">Week ' + ex.w.week + ' · ' + esc(ex.s.title) + '</a></div>' +
      '<ol class="hb-list list-decimal pl-5 text-sm mt-2">' +
      '<li>Open the lab and read the <b>Scenario</b> and <b>Your task</b> on the left.</li>' +
      WS.runSteps(ex.s, ex.w.week).map((b) => '<li><b>' + esc(b.title) + '</b><ul class="list-disc pl-5 mt-1">' + b.items.map((x) => '<li>' + x + '</li>').join('') + '</ul></li>').join('') +
      '<li>The prompts, in order: ' + ex.s.prompts.map((p, i) => '<b>' + (i + 1) + '. ' + esc(p.label) + '</b> <span class="text-slate-500">(' + esc(p.where) + ')</span>').join(', ') + '. Copy each one with <b>Copy</b>, replace any [brackets] with your details, and read the answer before you move on.</li>' +
      '<li>Compare the result with <b>"What a good result looks like"</b>, then do <b>"Verify before you trust it"</b> against the linked doc.</li>' +
      '<li>Copy the <b>"Save it to your notes"</b> template into <code>' + esc(WS.notesFile(ex.w.week)) + '</code> and fill it in.</li>' +
      '<li>Tick the checks: ' + ex.s.checks.map((c) => '<i>' + esc(c.label) + '</i>').join('; ') + '. When all of them are ticked, the step is complete.</li></ol></div>' : '';
    const weekRows = W.map((w) => {
      const n = {}; let g = 0;
      w.topics.forEach((t) => t.steps.forEach((s) => { if (s.kind === 'guide') g++; (s.prompts || []).forEach((p) => { n[p.where] = (n[p.where] || 0) + 1; }); }));
      const where = surfaces.filter((s) => n[s]).sort((a, b) => n[b] - n[a]).map((s) => esc(s.replace('Claude for ', '')) + ' <span class="text-slate-500">×' + n[s] + '</span>').join(' · ');
      return '<tr><td><a class="src-link text-sm" href="#/w/' + w.week + '">' + w.week + '</a></td><td class="whitespace-normal">' + esc(w.title) + '</td><td class="whitespace-normal">' + where + '</td><td>' + g + '</td>' +
        '<td class="whitespace-normal">' + (w.milestone ? '◆ ' + esc(w.milestone.id) + ': ' + esc(w.milestone.title) : '<span class="text-slate-500">wrap-up only</span>') + '</td></tr>';
    }).join('');

    return '<p>This section is the practical "how": what to set up, what to do every week, and how one step is done from start to finish. The rule for the whole programme: <b>you do each task yourself, with Claude, in your own SRE Learning workspace</b>, and keep the evidence.</p>' +

      '<h3 class="font-semibold text-white mt-5">Before Week 1: what you need</h3>' +
      '<ul class="hb-list"><li><b>A site account:</b> Sign up with your @swiftant.com email (section 9).</li>' +
      '<li><b>claude.ai</b> with Projects, on the plan SwiftAnt gives you. Every claude.ai step happens inside one Project.</li>' +
      '<li><b>Claude Code</b> installed on your laptop (<a class="src-link text-sm" href="https://code.claude.com/docs" target="_blank" rel="noopener noreferrer">install guide ↗</a>), plus <b>git</b>. From Week 7 on, most hands-on runs here.</li>' +
      '<li><b>The Claude desktop app</b> for Cowork steps, and the <b>Claude add-in</b> for Excel, Word and PowerPoint steps (ask IT if the add-in isn\'t available).</li>' +
      '<li><b>An Azure sandbox subscription</b> (or the free Microsoft Learn sandboxes) for anything that creates resources. <b>Never practise in production.</b> Install the Azure CLI, Terraform and kubectl when a week first asks for them.</li>' +
      '<li><b>No API key needed.</b> The API playground works in simulated mode; a key with a spend limit is optional (section 10).</li></ul>' +

      '<h3 class="font-semibold text-white mt-5">Once: set up your workspace (Week 1 › Step 0)</h3>' +
      '<p>Open <a class="src-link text-sm" href="#/m/' + W[0].topics[0].id + '/lab/1">Week 1 › Step 0</a> and follow it. In about 25 minutes you will have: the <b>SRE Learning</b> Project in claude.ai with your instructions and <code>my-environment.md</code>; and the <code>~/sre-learning-workspace</code> git repo that <b>Claude Code builds for you</b>, with <code>week-01</code> … <code>week-20</code>, a <code>CLAUDE.md</code> of rules and a <code>.gitignore</code> for secrets. In Week 1 › AZ-104 you also add the exam outline to the same Project, so it becomes your study coach too.</p>' +

      '<h3 class="font-semibold text-white mt-5">Every week: the routine</h3>' + flowRoutine() +
      '<ol class="hb-list list-decimal pl-5">' +
      '<li><b>Open the week page</b> from the dashboard. Read the <b>focus</b>, the <b>applied task</b> (the real piece of work the week builds to) and the <b>milestone</b>, if the week has one: its evidence ID, reviewer and pass criteria. That is what you will hand in.</li>' +
      '<li><b>For each topic, read the briefing and take the quiz.</b> The concept cards come from the official docs; the "leverage Claude" cards show how the topic applies to your job.</li>' +
      '<li><b>Do the API playground steps</b> (if the topic has them): press <b>Run</b> and read why each check passes. This shows you the pattern before you use it yourself.</li>' +
      '<li><b>Do the "Do it in Claude" steps in your workspace.</b> On the right, follow <b>"Run it in your SRE Learning workspace"</b>, run the prompts in order, verify, add a notes entry and tick the checks. The example below walks through one step.</li>' +
      '<li><b>Do the applied task on real (sandbox) work</b> with the same prompts. If the week has a milestone, collect the evidence the pass criteria ask for (chat names, Artifacts, commits, notes) and send it to the named reviewer.</li>' +
      '<li><b>Finish with the week\'s wrap-up step</b> (the last step of the last topic). Claude Code checks your notes are complete, Claude writes the week summary, you add it to the Project knowledge and commit the week. Next week, every chat in the Project already knows what you have done.</li></ol>' +
      '<p class="text-sm text-slate-400">Pace: each week page shows its hours. Doing a little every day works better than one long session, and your progress syncs, so you can switch between devices.</p>' +

      '<h3 class="font-semibold text-white mt-5">One step from start to finish</h3>' + exHtml +

      '<h3 class="font-semibold text-white mt-5">Week 1 to Week 20: where you work in Claude</h3>' +
      '<p>How your Claude use grows over the programme: <b>weeks 1–4</b> are mostly claude.ai (Projects, Artifacts, prompting) with a first look at Cowork, Microsoft 365 and Claude Code. <b>Weeks 5–6</b> use Claude for root cause analysis, SLOs and postmortems. <b>Weeks 7–12</b> move the hands-on into <b>Claude Code</b> for infrastructure as code, networking, Key Vault and monitoring. <b>Weeks 13–18</b> build agents, skills and Claude in CI, with evaluation and human gates. <b>Weeks 19–20</b> are the AZ-104 exam and handing over what you built. The counts below are the prompts in each week, by where they run.</p>' +
      '<div class="overflow-x-auto my-3"><table class="data-table w-full"><thead><tr><th>Week</th><th>Title</th><th>Where you work (prompts)</th><th>Guide steps</th><th>Milestone</th></tr></thead><tbody>' + weekRows + '</tbody></table></div>' +

      '<h3 class="font-semibold text-white mt-5">At the end of Week 20 you have</h3>' +
      '<ul class="hb-list"><li>An <b>SRE Learning Project</b> whose knowledge holds your environment, the AZ-104 outline and 20 weekly summaries, and a chat for every step, named by step ID.</li>' +
      '<li>A <b>workspace repo</b> with 20 week folders, notes for every step, and a commit history of everything you built with Claude Code. Push it to a private repo if you want to keep it.</li>' +
      '<li>The <b>milestone evidence</b> (EV-RE-01 … EV-RE-09) your reviewers signed off, and a completed progress bar on the Team progress panel.</li></ul>' +

      '<h3 class="font-semibold text-white mt-5">Rules that apply to every step</h3>' +
      '<div class="grid sm:grid-cols-2 gap-3 my-3">' +
      card('Always', 'Work in the Project or the week folder, never a random chat. Read every command and edit before you approve it. Verify facts and flags against the linked docs. Write down what Claude got wrong: spotting it is the skill.') +
      card('Never', 'Paste secrets, keys, customer data or production hostnames. Run anything against production. Tick a check you haven\'t done. If you paste a secret by mistake, rotate it and delete the chat.') + '</div>' +

      '<h3 class="font-semibold text-white mt-5">If you get stuck</h3>' +
      '<ul class="hb-list"><li><b>Claude\'s answer looks wrong:</b> say so in the same chat, with the doc that disagrees, and ask it to correct itself. Note it under "What Claude got wrong".</li>' +
      '<li><b>A command fails:</b> paste the command and the full error back into the same chat (or Claude Code session) and ask what to check first.</li>' +
      '<li><b>You can\'t find an earlier step\'s work:</b> search the Project chats for the step ID (e.g. <code>W07-T1-S1</code>), or <code>git log</code> in the workspace.</li>' +
      '<li><b>A playground check is red:</b> open the <b>Hint</b>, then <b>Load solution</b>.</li></ul>';
  }

  /* ---------- page ---------- */
  const sec = (id, title, body) => '<section id="hb-' + id + '" class="hb-sec"><h2>' + title + '</h2>' + body + '</section>';
  const card = (t, d) => '<div class="card p-4"><div class="font-semibold text-white">' + t + '</div><div class="text-sm text-slate-300 mt-1 leading-relaxed">' + d + '</div></div>';
  const faq = (q, a) => '<details class="card p-4"><summary class="font-semibold text-white cursor-pointer">' + q + '</summary><div class="text-sm text-slate-300 mt-2 leading-relaxed">' + a + '</div></details>';

  PL.handbookView = function () {
    const W = PL.PROGRAM.weeks;
    const topics = W.reduce((a, w) => a + w.topics.length, 0);
    const steps = W.reduce((a, w) => a + w.topics.reduce((b, t) => b + t.steps.length, 0), 0);
    const guide = W.reduce((a, w) => a + w.topics.reduce((b, t) => b + t.steps.filter((s) => s.kind === 'guide').length, 0), 0);
    const loginOn = PL.sync && PL.sync.enabled;
    const toc = [['what', 'What this course is'], ['flow', 'How a week and a topic work'], ['handson', 'The two kinds of hands-on'], ['how', 'How to complete it with Claude: Week 1 to 20'], ['json', 'Why there is JSON in the labs'], ['python', 'What the Python scripts are for'], ['weeks', 'The 20 weeks at a glance'], ['arch', 'How the site was built and set up'], ['login', 'Login and why Supabase'], ['safety', 'Your API key, costs and data'], ['maintain', 'Updating the course'], ['faq', 'FAQ'], ['glossary', 'Glossary']];

    return '<div class="max-w-5xl mx-auto px-4 sm:px-8 py-8 handbook">' +
      '<nav class="text-xs text-slate-500 mb-3 no-print"><a href="#/" class="hover:text-slate-300">Dashboard</a> › Handbook</nav>' +
      '<div class="flex flex-col sm:flex-row sm:items-end gap-4 mb-6"><div class="flex-1"><div class="text-[11px] font-semibold text-brand-300 uppercase tracking-wider">SRE Learning · Handbook</div>' +
      '<h1 class="text-2xl sm:text-3xl font-extrabold text-white mt-1">Everything about the course, in one place</h1>' +
      '<p class="text-slate-400 mt-2">What the course is, how each lab works, why you see JSON and Python, how the site was built and deployed, and why login uses Supabase.</p></div>' +
      '<button class="btn-ghost btn-sm shrink-0 no-print" data-action="print">Print / save as PDF</button></div>' +
      '<div class="card p-4 mb-8 no-print"><div class="card-title">Contents</div><ol class="grid sm:grid-cols-2 gap-x-6 gap-y-1 mt-2 text-sm list-decimal pl-5">' + toc.map((t) => '<li><a class="src-link text-sm" href="#hb-' + t[0] + '" data-scroll>' + t[1] + '</a></li>').join('') + '</ol></div>' +

      sec('what', '1. What this course is',
        '<p><b>SRE Learning</b> turns SwiftAnt\'s 20-week <b>Site Reliability Engineer programme</b> into KodeKloud-style hands-on labs. It has three goals for every topic in the programme:</p>' +
        '<div class="grid sm:grid-cols-3 gap-3 my-4">' + card('Learn it from the official docs', 'Each topic starts with short concept cards summarised from the official documentation (Anthropic, Microsoft Learn, HashiCorp, Elastic, Wazuh, Grafana, Google SRE and others), with links to the exact pages.') +
        card('Do it in Claude', 'You practise by doing the task <i>with Claude</i>: in claude.ai, Claude Code, Cowork, Claude for Excel/Word/PowerPoint, or the API playground inside this site.') +
        card('Leverage it at work', 'Every topic ends with how a DevOps / Cloud engineer uses Claude for that topic day to day: in pipelines, runbooks, reviews and on-call.') + '</div>' +
        '<p>Every week teaches the same working pattern, which is how you leverage Claude safely in an SRE role:</p>' + flowWork() +
        '<p>Today the site has <b>' + W.length + ' weeks</b>, <b>' + topics + ' topics</b> and <b>' + steps + ' hands-on steps</b> (' + guide + ' "Do it in Claude" steps and ' + (steps - guide) + ' API playground steps). The Azure certification track is <b>AZ-104</b>, mapped onto the programme\'s certification slots using Microsoft\'s official skills outline. Paid courses in the programme are replaced by their free official equivalents, and internal SwiftAnt Academy sessions are listed on each week page but not taught here.</p>') +

      sec('flow', '2. How a week and a topic work',
        '<p>The <b>dashboard</b> shows the 20-week roadmap, colour-coded by stream: Prompting (weeks 1–4), Root cause (5–6), Role-critical (7–12), Agentification (13–18) and Adoption (19–20). Each <b>week page</b> lists its topics, the week\'s <b>applied task</b>, its <b>milestone</b> (evidence ID, reviewer and pass criteria) and any internal sessions.</p>' +
        flowLearning() +
        '<p>Inside a topic, the <b>briefing</b> gives you outcomes, concept cards, the "leverage Claude" cards, official links and a short quiz. <b>Start hands-on</b> opens the lab: instructions and checks on the left, the Claude workspace on the right. A step is complete when all its checks are green, and your progress bar moves.</p>') +

      sec('handson', '3. The two kinds of hands-on',
        '<div class="grid sm:grid-cols-2 gap-3 my-3">' +
        card('"Do it in Claude" steps (guided)', 'The right pane shows <b>copy-ready prompts</b> and says where to run each one (claude.ai, Claude Code, Cowork, Claude for Excel…). You do the work in <b>your own Claude</b>, on your own tasks, then tick the manual checks. Each step also shows what a good result looks like and how to verify it against the docs. This is how you build the real skill.') +
        card('API playground steps (auto-checked)', 'The right pane shows the <b>actual request</b> sent to Claude. Press <b>Run</b>: Claude answers, tools run, and the checks on the left verify the answer automatically, for example "uses <code>--sku Standard</code>", "no hard-coded secret" or "flags the prompt injection". Without an API key you see a pre-recorded expert answer, so every lab still works.') + '</div>' +
        flowLab() +
        '<p>Most topics have both kinds: first you see the pattern work and get checked in the playground, then you apply it to your own work in Claude.</p>' +
        '<h3 class="font-semibold text-white mt-6">Where you do it: your SRE Learning workspace</h3>' +
        '<p>Every "Do it in Claude" step runs in the <b>same place</b>, so you can see and reuse everything you did across the 20 weeks. <b>Week 1 › Step 0</b> sets it up once:</p>' +
        '<div class="grid sm:grid-cols-3 gap-3 my-3">' +
        card('claude.ai Project "SRE Learning"', 'Project instructions describe you, the programme and the safety rules; <code>my-environment.md</code> in its knowledge describes your stack. Each step is a new chat <b>inside the Project</b>, named with the step ID (e.g. <code>W07-T2-S1 · …</code>).') +
        card('Folder ~/sre-learning-workspace', 'A git repo built by Claude Code, with <code>week-01</code> … <code>week-20</code>, a <code>CLAUDE.md</code> of rules and a <code>.gitignore</code> for secrets. Claude Code and Cowork steps run in that week\'s folder, and you commit when a step works.') +
        card('Notes, then wrap-up', 'After each step, add an entry to <code>week-NN/notes.md</code>: what you did, what you verified, and the evidence. The last step of each week turns the notes into a summary that you add to the Project knowledge.') + '</div>' +
        flowWorkspace() +
        '<p>Each guide step\'s right pane starts with <b>"Run it in your SRE Learning workspace"</b>: the exact steps for claude.ai, Claude Code, Cowork or Claude for Microsoft 365, depending on where its prompts run. Each step also has two checks, <i>ran it in the workspace</i> and <i>added it to my notes</i>.</p>') +

      sec('how', '4. How to complete the programme with Claude: Week 1 to Week 20', howSection(W)) +

      sec('json', '5. Why there is JSON in the labs',
        '<p>You see JSON in two places, and both matter for DevOps work:</p>' +
        '<div class="grid gap-3 my-3">' +
        card('① The request JSON (the right-hand editor)', 'This is exactly what gets sent to the <b>Claude API</b>: the model, the prompt (<code>system</code>, <code>messages</code>), settings such as <code>thinking</code> and <code>effort</code>, and sometimes <code>tools</code>. It is the same thing your scripts, pipelines and bots send when they call Claude. Editing it teaches you how Claude is driven <i>programmatically</i>, which is what you need to automate anything. The <b>cURL / Python / TypeScript</b> tabs show the same request as code you can copy into a script.') +
        card('② JSON answers (structured outputs)', 'Many labs ask Claude to answer in JSON that follows a schema. A human reads prose; a <b>pipeline acts on JSON</b>. Examples: <code>{"retry_will_help": false}</code> decides whether CI retries, <code>{"block_merge": true}</code> blocks a pull request, and a list of findings becomes tickets. Structured output is also what lets the checks verify Claude\'s answer precisely.') +
        card('③ Tool definitions (JSON schemas)', 'In tool-use labs, <code>tools</code> describes functions such as <code>kubectl_get</code> with a JSON schema. Claude asks to call them, <b>your code runs them</b>, and the results go back. This is how Claude connects to real systems, with guardrails in your code. In this site the tools are safe mocks that run in your browser.') + '</div>' +
        '<p><b>Do you need to write JSON?</b> Only lightly: some challenge steps ask you to add a field or a tool, and the <b>Load solution</b> button shows the answer. For day-to-day Claude use (claude.ai, Claude Code) you just write prompts.</p>') +

      sec('python', '6. What the Python scripts are for',
        '<p>The labs teach patterns; the <b>Implementation kit</b> (<code>work-kit/</code> in the repo, and the <a class="src-link text-sm" href="#/kit">DevOps &amp; Cloud setup guide</a>) gives you ready-made scripts that apply those patterns in real pipelines. <b>You don\'t need to run them to complete the course.</b> They are there for when you want to automate a pattern at work.</p>' +
        '<div class="overflow-x-auto my-3"><table class="data-table w-full"><thead><tr><th>Script</th><th>What it does</th><th>When you\'d use it</th></tr></thead><tbody>' +
        '<tr><td><code>ci_failure_triage.py</code></td><td>Sends a failed CI log (redacted) to Claude and gets JSON back: failing step, root cause, fix, whether a retry will help</td><td>In GitHub Actions on every failed job (see <code>ai-ci-triage.example.yml</code>)</td></tr>' +
        '<tr><td><code>azure_cost_report.py</code></td><td>Turns an Azure Cost Management CSV into a JSON report; code computes the totals and fails if Claude\'s numbers drift</td><td>A monthly FinOps job</td></tr>' +
        '<tr><td><code>redact_pii.py</code></td><td>Masks emails, card numbers, phones, IPs and key-like tokens</td><td>Before sending any logs to an AI</td></tr></tbody></table></div>' +
        '<p>They use the official <code>anthropic</code> Python SDK and read the API key from an environment variable, which should come from a secret store (Key Vault or GitHub secrets), never from code.</p>') +

      sec('weeks', '7. The 20 weeks at a glance',
        '<div class="overflow-x-auto"><table class="data-table w-full"><thead><tr><th>Week</th><th>Stream</th><th>Title</th><th>Topics</th><th>Milestone</th></tr></thead><tbody>' +
        W.map((w) => '<tr><td><a class="src-link text-sm" href="#/w/' + w.week + '">' + w.week + '</a></td><td>' + esc((PL.STREAMS[w.stream] || {}).label || w.stream) + '</td><td class="whitespace-normal">' + esc(w.title) + '</td><td>' + w.topics.length + '</td><td>' + (w.milestone ? '◆ ' + esc(w.milestone.id) : '') + '</td></tr>').join('') + '</tbody></table></div>') +

      sec('arch', '8. How the site was built and set up',
        flowArch() +
        '<div class="grid sm:grid-cols-2 gap-3 my-3">' +
        card('Plain static files', 'HTML, Tailwind CSS (CDN) and plain JavaScript, with no framework and no build step. All the logic runs in your browser, so it can be hosted free on GitHub Pages or Vercel.') +
        card('Content as data', 'Each week is one file (<code>js/weeks/weekNN.js</code>) holding its topics, briefings, prompts, lab requests, pre-recorded answers and checks. The app reads these and draws every page.') +
        card('Checked before every deploy', '<code>tests/validate.js</code> loads all the content, runs every simulated lab through its own checks, and verifies links, schemas and programme rules (for example AZ-104 only, and no out-of-scope frameworks). GitHub Actions runs it on every push and only deploys if it passes.') +
        card('Secure by design', 'A Content-Security-Policy lets the page talk only to <code>api.anthropic.com</code> (and Supabase, if login is on). There are no inline scripts, all lab data is synthetic, and fake keys are assembled at runtime so secret scanners don\'t fire.') + '</div>' +
        '<p><b>How it was deployed:</b> the code is in the public repo <code>' + esc(PL.SITE.owner + '/' + PL.SITE.repo) + '</code>, GitHub Pages deploys it through GitHub Actions, and each push validates and publishes to <code>' + esc(PL.SITE.siteUrl || '') + '</code> in about a minute. The <a class="src-link text-sm" href="#/deploy">Deployment Hub</a> covers Vercel and custom subdomains.</p>') +

      sec('login', '9. Login and why Supabase',
        '<p><b>Why a service is needed at all:</b> GitHub Pages only serves files. It has no server, no database and no user accounts. Without login, each person\'s progress is saved <i>in their own browser</i>: that works, but it doesn\'t follow you to another device and nobody else can see it. To <b>sign in</b> and <b>sync progress</b>, you need something that (1) confirms who you are and (2) stores each person\'s progress safely. The site opens on a <b>Sign in / Sign up</b> screen, and the course appears only after you sign in.</p>' +
        '<p><b>Why Supabase:</b> its free tier gives both, without running any server of our own: <b>Supabase Auth</b> (company email + password accounts) and a small <b>Postgres database</b> with <b>row-level security</b>. The browser talks to it directly, which fits a static site.</p>' +
        flowLogin() +
        '<div class="grid sm:grid-cols-2 gap-3 my-3">' +
        card('What is stored', 'One row per person: email, completed steps, ticked checks, quiz answers and last-updated time. <b>Your Claude API key is never stored or synced</b>; it stays in your browser.') +
        card('Who can see what', 'Only <b>@swiftant.com</b> addresses can sign up. A rule inside the database rejects any other domain, so it can\'t be bypassed from the browser. Signed-in team members can <i>read</i> the team\'s progress, but each person can only <i>write</i> their own row. The database enforces this, not the page.') +
        card('Is the key in the code safe?', 'The site uses Supabase\'s <b>anon public key</b>, which is designed to be public. Access is controlled by the row-level security rules in <code>supabase/schema.sql</code>. The powerful <code>service_role</code> key is never used in the site.') +
        card('Status on this site', loginOn ? '<span class="text-emerald-300">Login is switched on.</span> New users choose <b>Sign up</b> on the first screen with their @swiftant.com email and a password (8+ characters). When email sending is set up, new accounts are confirmed by a link in the inbox and <b>Forgot password?</b> emails a reset link; until then the site owner resets passwords in the Supabase dashboard.' : '<span class="text-amber-300">Built but not switched on yet.</span> The site owner creates a free Supabase project, runs the SQL, invites users, and adds the project URL and anon key to <code>js/config.js</code>. Step-by-step instructions are in <code>SETUP-LOGIN.md</code> in the repo.') + '</div>' +
        '<p><b>Alternatives considered:</b> Firebase has the same role but is heavier; Cloudflare Access can restrict <i>who opens the site</i> but can\'t sync progress; a custom backend would mean running a server. Supabase is the smallest option that gives both login and sync for free.</p>') +

      sec('safety', '10. Your API key, costs and data',
        '<ul class="hb-list"><li><b>No key needed to learn.</b> Simulated mode runs every lab with pre-recorded answers; the tools and checks still run for real.</li>' +
        '<li><b>With your own key (⚙ Settings)</b>, calls go straight from your browser to <code>api.anthropic.com</code>. The key is kept in session storage (cleared when the tab closes) unless you tick "remember". Create a separate key for learning, with a <b>spend limit</b>, in its own Console workspace.</li>' +
        '<li><b>Cost:</b> each Run is one or a few API calls, billed to your key. Lower <i>effort</i> in Settings to spend less.</li>' +
        '<li><b>Never paste secrets, customer data or production credentials</b> into prompts. The labs use synthetic data, and Week 4 teaches redaction.</li>' +
        '<li>Browser keys are fine for personal learning; <b>team or production apps should call Claude from a backend</b> that holds the key in a secret store.</li></ul>') +

      sec('maintain', '11. Updating the course',
        '<ol class="hb-list list-decimal pl-5"><li>Edit or add content in <code>js/weeks/weekNN.js</code>, copying the structure of an existing topic.</li>' +
        '<li>Run <code>node tests/validate.js</code> locally. It tells you exactly what\'s missing or failing.</li>' +
        '<li>Commit and push to <code>main</code>. GitHub Actions validates and redeploys automatically.</li>' +
        '<li>Keep facts current: the official docs change, so re-check links and commands each cycle. Every topic links to its sources.</li></ol>' +
        '<p>You can also use <b>Claude Code</b> for this: open the repo and ask it to add a topic or update a lab, then review the diff and run the validator.</p>') +

      sec('faq', '12. FAQ', '<div class="grid gap-2">' +
        faq('Do I need an API key?', 'No. Every lab works in simulated mode. A key only makes the playground call the real Claude.') +
        faq('What does "simulated" mean?', 'The playground plays back a pre-recorded, correct expert answer instead of calling Claude. The local tools, redaction and checks still run exactly as they would live, so you see the full flow.') +
        faq('A check is red. What now?', 'Read the hint, then change the request (for challenge steps) and Run again. <b>Load solution</b> shows a working answer. With a live key, Claude\'s wording varies, so re-run or tighten the prompt if needed. That is part of learning prompting.') +
        faq('Do I have to run the Python scripts?', 'No. They are optional, for automating the patterns at work after you have learned them.') +
        faq('Where is my progress saved?', 'In your browser (local storage). When login is on and you sign in, it is also synced to the cloud and merged across devices.') +
        faq('Is my data sent anywhere else?', 'No. The page\'s security policy allows only api.anthropic.com (with your key) and Supabase (if you sign in).') +
        faq('Why AZ-104?', 'It is the Azure certification track for this programme cycle. The AZ-104 topics follow Microsoft\'s official skills outline, with your SRE Learning Project as your study coach.') +
        faq('Can someone else use it?', 'Yes. Send them the link: they choose <b>Sign up</b> with their @swiftant.com email and a password, and they appear in Team progress.') +
        faq('Why password sign-in instead of an email link?', 'The free Supabase email sender only delivers to project members, at most 2 emails an hour, so sign-in links would not reach colleagues. Password accounts work without email. With a company mail sender (requested from IT) the site also <b>confirms each new account by email</b> and offers <b>Forgot password</b>; Microsoft (SwiftAnt) single sign-on is a further option with an Entra ID app registration.') + '</div>') +

      sec('glossary', '13. Glossary', '<div class="grid sm:grid-cols-2 gap-2 text-sm">' +
        [['Adaptive thinking', 'Claude reasons before answering and decides how much; you set the depth with <i>effort</i>.'], ['Effort', 'How much work Claude puts in: low, medium, high, xhigh or max. Higher costs more.'], ['Tool use', 'Claude asks your code to run a function (tool) and uses the result.'], ['Structured outputs', 'Claude\'s reply is guaranteed to match a JSON schema.'], ['Guide step', 'A "Do it in Claude" task with prompts, checked manually.'], ['API step', 'A playground task whose answer is checked automatically.'], ['Simulated mode', 'Labs play back pre-recorded answers when no API key is set.'], ['Claude Code', 'Anthropic\'s agentic coding tool for the terminal and IDE.'], ['Project (Claude)', 'A workspace with instructions and knowledge files shared by its chats.'], ['Skill', 'Packaged instructions and files Claude loads when a task matches.'], ['Supabase', 'A hosted Postgres database plus authentication, used here for optional login and sync.'], ['Row-level security', 'Database rules that decide which rows each signed-in user can read or write.']]
          .map((g) => '<div class="card p-3"><b class="text-white">' + g[0] + '</b><div class="text-slate-300 mt-0.5">' + g[1] + '</div></div>').join('') + '</div>') +
      '</div>';
  };
})();
