/* SRE Learning · app shell: routing, views, playground, checks, progress */
(function () {
  'use strict';
  const PL = window.PL;
  const { esc, store, copyText, toast, md, $, $$, fmtNum } = PL.util;
  const WEEKS = PL.PROGRAM.weeks;
  const MODS = [];
  WEEKS.forEach((w) => w.topics.forEach((t, i) => { t.week = w.week; t.tnum = i + 1; MODS.push(t); }));
  const STEP_INDEX = {};
  MODS.forEach((m) => m.steps.forEach((s, i) => { STEP_INDEX[s.id] = { step: s, mod: m, idx: i }; }));
  const TOTAL_STEPS = Object.keys(STEP_INDEX).length;
  const weekOf = (n) => WEEKS.find((w) => w.week === n);
  const topicLabel = (m) => 'Week ' + m.week + ' · Topic ' + m.tnum;
  const weekSteps = (w) => w.topics.reduce((a, t) => a + t.steps.length, 0);
  const weekDone = (w) => w.topics.reduce((a, t) => a + modDone(t), 0);
  const streamChip = (key) => { const s = PL.STREAMS[key] || { label: key, color: '#64748b' }; return '<span class="stream-chip" style="--c:' + s.color + '">' + esc(s.label) + '</span>'; };

  const S = {
    progress: Object.assign({ steps: {}, manual: {}, quiz: {}, seen: {} }, store.get('pl.progress', {})),
    memory: store.get('pl.memory', {}),
    editors: {},
    results: {},
    tab: 'request',
    outTab: 'rendered',
    autoTools: true,
    redact: {},
    run: null,
    leftPct: store.get('pl.leftPct', 44),
    route: null,
  };
  const saveProgress = () => { store.set('pl.progress', S.progress); if (PL.sync) PL.sync.push(S.progress); };

  /* ---------------- check helpers (passed to every check as `h`) ---------------- */
  const H = PL.makeHelpers(S.memory);

  function evalChecks(step) {
    const ctx = S.results[step.id];
    return step.checks.map((ch) => {
      if (ch.manual) return { id: ch.id, label: ch.label, manual: true, state: S.progress.manual[step.id + ':' + ch.id] ? 'pass' : 'todo' };
      if (!ctx || ctx.error || !ctx.final || S.run) return { id: ch.id, label: ch.label, state: 'pending' };
      let ok = false;
      try { ok = !!ch.test(ctx, H); } catch (e) { ok = false; }
      return { id: ch.id, label: ch.label, state: ok ? 'pass' : 'fail' };
    });
  }
  function updateCompletion(step) {
    const res = evalChecks(step);
    if (res.every((r) => r.state === 'pass') && !S.progress.steps[step.id]) {
      S.progress.steps[step.id] = Date.now();
      saveProgress();
      toast('Step complete ✓  ' + step.title, 'ok');
      renderSidebar();
      renderHeader();
    }
    return res;
  }
  const modDone = (m) => m.steps.filter((s) => S.progress.steps[s.id]).length;

  /* ---------------- routing ---------------- */
  function parseRoute() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (parts[0] === 'deploy') return { view: 'deploy' };
    if (parts[0] === 'kit') return { view: 'kit' };
    if (parts[0] === 'handbook') return { view: 'handbook' };
    if (parts[0] === 'w') { const w = weekOf(parseInt(parts[1], 10)); return w ? { view: 'week', wk: w } : { view: 'home' }; }
    if (parts[0] === 'm') {
      const mod = MODS.find((m) => m.id === parts[1]);
      if (!mod) return { view: 'home' };
      if (parts[2] === 'lab') {
        const idx = Math.max(0, Math.min(mod.steps.length - 1, (parseInt(parts[3] || '1', 10) || 1) - 1));
        return { view: 'lab', mod, idx, step: mod.steps[idx] };
      }
      return { view: 'brief', mod };
    }
    return { view: 'home' };
  }
  function onRoute() {
    if (S.run) { S.run.abort(); S.run = null; }
    S.route = parseRoute();
    document.body.classList.remove('sidebar-open');
    renderSidebar();
    renderView();
    const main = $('#view');
    if (main) main.scrollTop = 0;
  }

  /* ---------------- header + sidebar ---------------- */
  function renderHeader() {
    const done = Object.keys(S.progress.steps).filter((k) => STEP_INDEX[k]).length;
    const pct = Math.round((done / TOTAL_STEPS) * 100);
    $('#progress-bar').style.width = pct + '%';
    $('#progress-text').textContent = done + '/' + TOTAL_STEPS + ' steps';
    const site = PL.SITE || {};
    if (site.owner && !/YOUR-GITHUB/.test(site.owner)) $('#repo-link').href = 'https://github.com/' + site.owner + '/' + site.repo;
    const live = PL.settings.isLive();
    const pill = $('#mode-pill');
    pill.innerHTML = live
      ? '<span class="dot bg-emerald-400"></span><span>Live</span><span class="hidden sm:inline text-slate-400">· ' + esc(PL.settings.get().model) + '</span>'
      : '<span class="dot bg-amber-400"></span><span>Simulated</span><span class="hidden sm:inline text-slate-400">· add API key</span>';
  }

  function ring(done, total, size) {
    const r = 15, c = 2 * Math.PI * r, p = total ? done / total : 0;
    return '<svg width="' + (size || 36) + '" height="' + (size || 36) + '" viewBox="0 0 36 36" class="shrink-0" aria-hidden="true"><circle cx="18" cy="18" r="' + r + '" fill="none" stroke="rgb(var(--ring-track))" stroke-width="3.5"/>' +
      '<circle cx="18" cy="18" r="' + r + '" fill="none" stroke="' + (p === 1 ? '#34d399' : '#4b76ff') + '" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="' + (c * p).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 18 18)"/>' +
      '<text x="18" y="21.5" text-anchor="middle" font-size="9.5" font-weight="700" fill="currentColor">' + done + '/' + total + '</text></svg>';
  }

  function renderSidebar() {
    const r = S.route || {};
    const activeMod = r.mod && r.mod.id;
    const link = (href, label, active, extra) => '<a href="' + href + '" class="side-link ' + (active ? 'active' : '') + '">' + (extra || '') + '<span class="truncate">' + label + '</span></a>';
    let html = link('#/', 'Dashboard · 20-week roadmap', r.view === 'home', '<span class="ico">⌂</span>');
    html += link('#/handbook', 'Handbook: how this course works', r.view === 'handbook', '<span class="ico">?</span>');
    const activeWeek = r.wk ? r.wk.week : r.mod ? r.mod.week : null;
    let lastStream = null;
    WEEKS.forEach((w) => {
      if (w.stream !== lastStream) { html += '<div class="side-label">' + esc((PL.STREAMS[w.stream] || {}).label || w.stream) + '</div>'; lastStream = w.stream; }
      const open = w.week === activeWeek;
      const total = weekSteps(w), done = weekDone(w);
      html += '<details class="side-mod" ' + (open ? 'open' : '') + '><summary class="' + (open ? 'text-white' : '') + '">' +
        '<span class="num ' + (total && done === total ? 'num-done' : '') + '">' + (total && done === total ? '✓' : w.week) + '</span>' +
        '<span class="flex-1 min-w-0 leading-snug">' + esc(w.title) + '</span><span class="text-[11px] text-slate-500 shrink-0">' + done + '/' + total + '</span></summary><div class="side-steps">' +
        link('#/w/' + w.week, 'Week ' + w.week + ' overview', r.view === 'week' && open, '<span class="ico">▤</span>');
      w.topics.forEach((m) => {
        const mOpen = m.id === activeMod;
        const md = modDone(m);
        html += link('#/m/' + m.id, esc(m.title), r.view === 'brief' && mOpen, '<span class="ico ' + (md === m.steps.length ? 'text-emerald-400' : 'text-slate-500') + '">' + (md === m.steps.length ? '✓' : '•') + '</span>');
        if (mOpen) html += '<div class="side-sub">' + m.steps.map((s, i) => link('#/m/' + m.id + '/lab/' + (i + 1), esc(s.title), r.view === 'lab' && r.step && r.step.id === s.id,
          '<span class="ico ' + (S.progress.steps[s.id] ? 'text-emerald-400' : 'text-slate-500') + '">' + (S.progress.steps[s.id] ? '✓' : (i + 1)) + '</span>')).join('') + '</div>';
      });
      html += '</div></details>';
    });
    html += '<div class="side-label">Ship it</div>';
    html += link('#/kit', 'DevOps &amp; Cloud setup guide', r.view === 'kit','<span class="ico">⚒</span>');
    html += link('#/deploy', 'Deployment Hub', r.view === 'deploy', '<span class="ico">⇪</span>');
    $('#sidebar-nav').innerHTML = html;
  }

  /* ---------------- views ---------------- */
  function renderView() {
    const v = S.route.view;
    const main = $('#view');
    if (v === 'lab') { main.innerHTML = labView(S.route); afterLabRender(S.route.step); return; }
    main.innerHTML = '<div class="h-full overflow-y-auto" id="scroller">' +
      (v === 'brief' ? briefView(S.route.mod) : v === 'week' ? weekView(S.route.wk) : v === 'handbook' ? PL.handbookView() : v === 'deploy' ? PL.deployView() : v === 'kit' ? PL.kitView() : homeView()) + '</div>';
    if (v === 'brief') { S.progress.seen[S.route.mod.id] = true; saveProgress(); }
    if (v === 'home' && PL.renderTeam) PL.renderTeam();
    document.title = (v === 'brief' ? S.route.mod.title + ' · ' : v === 'week' ? 'Week ' + S.route.wk.week + ' · ' : v === 'handbook' ? 'Handbook · ' : v === 'deploy' ? 'Deployment Hub · ' : v === 'kit' ? 'DevOps & Cloud setup guide · ' : '') + 'SRE Learning · SRE Programme';
  }

  function homeView() {
    const done = Object.keys(S.progress.steps).filter((k) => STEP_INDEX[k]).length;
    const next = MODS.flatMap((m) => m.steps.map((s, i) => ({ m, s, i }))).find((x) => !S.progress.steps[x.s.id]);
    const live = PL.settings.isLive();
    return '<div class="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-10">' +
      '<section class="hero rounded-2xl p-6 sm:p-10 mb-8">' +
      '<div class="text-xs font-semibold tracking-widest text-accent-400 uppercase mb-3">Site Reliability Engineer programme · 20 weeks · hands-on with Claude</div>' +
      '<h1 class="text-3xl sm:text-4xl font-extrabold text-white leading-tight max-w-3xl">SRE Learning: learn every topic hands-on, and use Claude to do the work</h1>' +
      '<p class="mt-3 text-slate-300 max-w-2xl">Each week follows the programme. Each topic has a short briefing built from the official docs, hands-on tasks you do <b class="text-white">in Claude</b> (claude.ai, Claude Code, or the built-in API playground), and a clear answer to <b class="text-white">how you leverage Claude for it in a DevOps / Cloud role</b>. The Azure track is <b class="text-white">AZ-104</b>.</p>' +
      '<div class="mt-6 flex flex-wrap gap-3">' +
      (next ? '<a class="btn-primary" href="#/m/' + next.m.id + '/lab/' + (next.i + 1) + '">' + (done ? 'Continue: ' : 'Start: ') + esc(next.s.title) + ' →</a>' : '<a class="btn-primary" href="#/deploy">All labs done 🎉 · Deploy your own copy →</a>') +
      '<button class="btn-ghost" data-action="settings">' + (live ? 'Live mode · change settings' : 'Connect your Claude API key (optional)') + '</button><a class="btn-ghost" href="#/handbook">Read the handbook</a></div>' +
      '<div class="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl text-center">' +
      stat(WEEKS.length, 'weeks') + stat(MODS.length, 'topics') + stat(TOTAL_STEPS, 'hands-on steps') + stat(done, 'completed') + '</div></section>' +
      '<h2 class="section-title">20-week roadmap</h2><div class="flex flex-wrap gap-2 mb-3">' + Object.keys(PL.STREAMS).map(streamChip).join('') + '</div>' +
      '<div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">' +
      WEEKS.map((w) => '<a href="#/w/' + w.week + '" class="card card-hover p-4 flex gap-3 items-start">' + ring(weekDone(w), weekSteps(w), 40) +
        '<div class="min-w-0"><div class="flex items-center gap-2 flex-wrap"><span class="text-[11px] font-bold text-slate-300">WEEK ' + w.week + '</span>' + streamChip(w.stream) + (w.milestone ? '<span class="text-accent-400 text-xs" title="Milestone">◆</span>' : '') + '</div>' +
        '<div class="font-semibold text-white leading-snug mt-1 text-sm">' + esc(w.title) + '</div><div class="text-[11px] text-slate-500 mt-1">' + w.topics.length + ' topics · ' + weekSteps(w) + ' steps · ' + w.hours + 'h</div></div></a>').join('') + '</div>' +
      '<div id="team"></div>' +
      '<h2 class="section-title">How each topic works</h2><div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">' +
      [['1', 'Briefing from the official docs', 'Concept cards summarizing the official documentation, with direct links. No long theory.'], ['2', 'Do it in Claude', 'Copy-ready prompts for claude.ai and Claude Code, or run the real API request in the playground.'], ['3', 'Pass the checks', 'Auto-checks validate Claude\'s output; manual checks confirm you did it in your own environment.'], ['4', 'Leverage it at work', 'Every topic ends with how a DevOps / Cloud engineer uses Claude for it day to day.']]
        .map((x) => '<div class="card p-5"><div class="w-8 h-8 rounded-lg bg-brand-500/15 text-brand-300 font-bold grid place-items-center mb-3">' + x[0] + '</div><div class="font-semibold text-white">' + x[1] + '</div><p class="text-sm text-slate-400 mt-1">' + x[2] + '</p></div>').join('') + '</div>' +
      '<div class="card p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-center"><div class="flex-1"><div class="font-semibold text-white">' + (live ? 'Live mode is on' : 'You are in simulated mode') + '</div><p class="text-sm text-slate-400 mt-1">' +
      (live ? 'Requests go straight from this browser to api.anthropic.com with your key. The key is never sent anywhere else.' : 'Responses are pre-recorded, but tools, redaction, and checks run for real. Add your own Claude API key to make live calls. It stays in this browser (session storage by default).') +
      '</p></div><button class="btn-ghost shrink-0" data-action="settings">Settings</button></div>' +
      '</div>';
  }
  function weekView(w) {
    const ms = w.milestone;
    return '<div class="max-w-5xl mx-auto px-4 sm:px-8 py-8">' +
      '<nav class="text-xs text-slate-500 mb-3"><a href="#/" class="hover:text-slate-300">Dashboard</a> › Week ' + w.week + '</nav>' +
      '<div class="flex flex-wrap items-center gap-2 mb-1"><span class="text-[11px] font-semibold text-brand-300 uppercase tracking-wider">Week ' + w.week + ' · ' + w.hours + ' hours</span>' + streamChip(w.stream) + '</div>' +
      '<h1 class="text-2xl sm:text-3xl font-extrabold text-white">' + esc(w.title) + '</h1><p class="text-slate-400 mt-2">' + esc(w.focus || '') + '</p>' +
      (w.topics[0] ? '<a class="btn-primary mt-5" href="#/m/' + w.topics[0].id + '">Start week ' + w.week + ' →</a>' : '') +
      '<h2 class="section-title mt-8">Topics</h2><div class="card divide-y divide-white/5 mb-6">' +
      w.topics.map((t, i) => '<a href="#/m/' + t.id + '" class="flex items-center gap-3 px-4 py-3 hover:bg-white/[.03]">' + ring(modDone(t), t.steps.length, 34) +
        '<span class="flex-1 min-w-0"><span class="block text-slate-100 font-medium">' + (i + 1) + '. ' + esc(t.title) + '</span>' +
        (t.programmeItem ? '<span class="block text-xs text-slate-500 mt-0.5">Programme item: ' + esc(t.programmeItem) + '</span>' : '') + '</span>' +
        '<span class="text-xs text-slate-500 shrink-0">' + t.steps.length + ' steps · ~' + t.steps.reduce((a, s) => a + s.minutes, 0) + ' min</span></a>').join('') + '</div>' +
      (w.apply ? '<div class="card work-card p-5 mb-6"><div class="card-title text-accent-400">This week\'s applied task</div><p class="text-slate-200 mt-1.5">' + esc(w.apply) + '</p></div>' : '') +
      (ms ? '<div class="card p-5 mb-6 border-accent-500/30"><div class="card-title text-accent-400">◆ Milestone · ' + esc(ms.id) + '</div><div class="font-semibold text-white mt-1">' + esc(ms.title) + '</div>' +
        '<p class="text-sm text-slate-300 mt-1"><b>Passes when:</b> ' + esc(ms.passes) + '</p><p class="text-xs text-slate-500 mt-1">Reviewed by: ' + esc(ms.reviewer) + '</p></div>' : '') +
      (w.internal && w.internal.length ? '<div class="card p-5 mb-10"><div class="card-title">Internal SwiftAnt Academy sessions (scheduled separately)</div><ul class="mt-2 grid gap-1 text-sm text-slate-300">' +
        w.internal.map((x) => '<li>◌ ' + esc(x) + '</li>').join('') + '</ul><p class="text-xs text-slate-500 mt-2">Until these sessions are available, use the slot for the AZ-104 track and this week\'s applied task.</p></div>' : '') +
      '</div>';
  }

  const stat = (n, l) => '<div class="rounded-xl bg-ink-900/60 border border-white/5 py-3"><div class="text-2xl font-extrabold text-white">' + n + '</div><div class="text-[11px] text-slate-400 uppercase tracking-wider">' + l + '</div></div>';

  function briefView(m) {
    const q = m.quiz.map((item, qi) => {
      const ans = S.progress.quiz[m.id + ':' + qi];
      return '<div class="card p-4"><div class="font-medium text-white mb-2">' + (qi + 1) + '. ' + esc(item.q) + '</div><div class="grid gap-2">' +
        item.options.map((o, oi) => {
          const chosen = ans === oi, correct = oi === item.a;
          const cls = ans === undefined ? 'quiz-opt' : correct ? 'quiz-opt quiz-right' : chosen ? 'quiz-opt quiz-wrong' : 'quiz-opt opacity-60';
          return '<button class="' + cls + '" data-action="quiz" data-q="' + m.id + ':' + qi + '" data-o="' + oi + '">' + esc(o) + '</button>';
        }).join('') + '</div>' + (ans !== undefined ? '<p class="text-sm mt-2 ' + (ans === item.a ? 'text-emerald-300' : 'text-amber-300') + '">' + (ans === item.a ? 'Correct. ' : 'Not quite. ') + esc(item.why) + '</p>' : '') + '</div>';
    }).join('');
    return '<div class="max-w-5xl mx-auto px-4 sm:px-8 py-8">' +
      '<nav class="text-xs text-slate-500 mb-3"><a href="#/" class="hover:text-slate-300">Dashboard</a> › <a href="#/w/' + m.week + '" class="hover:text-slate-300">Week ' + m.week + '</a> › Topic ' + m.tnum + '</nav>' +
      '<div class="flex flex-col sm:flex-row sm:items-end gap-4 mb-6"><div class="flex-1"><div class="text-[11px] font-semibold text-brand-300 uppercase tracking-wider">' + topicLabel(m) + ' · Briefing</div>' +
      '<h1 class="text-2xl sm:text-3xl font-extrabold text-white mt-1">' + esc(m.title) + '</h1><p class="text-slate-400 mt-2">' + esc(m.blurb) + '</p>' +
      (m.programmeItem ? '<p class="text-xs text-slate-500 mt-2">Programme item: ' + esc(m.programmeItem) + '</p>' : '') + '</div>' +
      '<a class="btn-primary shrink-0" href="#/m/' + m.id + '/lab/1">Start hands-on →</a></div>' +
      '<div class="card p-5 mb-6"><div class="card-title">After this topic you can</div><ul class="grid gap-2 mt-2">' + m.outcomes.map((o) => '<li class="flex gap-2 text-slate-200"><span class="text-emerald-400">✓</span><span>' + esc(o) + '</span></li>').join('') + '</ul></div>' +
      '<h2 class="section-title">Concepts you will use</h2><div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">' +
      m.concepts.map((c) => '<div class="card p-4"><div class="font-semibold text-white">' + esc(c.t) + '</div><p class="text-sm text-slate-400 mt-1">' + esc(c.d) + '</p><code class="concept-ex">' + esc(c.ex) + '</code></div>').join('') + '</div>' +
      (m.leverage && m.leverage.length ? '<h2 class="section-title">Leverage Claude for this in your DevOps / Cloud role</h2><div class="grid sm:grid-cols-2 gap-3 mb-8">' +
        m.leverage.map((x) => '<div class="card work-card p-4"><div class="font-semibold text-white">' + esc(x.t) + '</div><p class="text-sm text-slate-300 mt-1">' + esc(x.d) + '</p></div>').join('') + '</div>' : '') +
      '<h2 class="section-title">Hands-on (in Claude)</h2><div class="card divide-y divide-white/5 mb-8">' +
      m.steps.map((s, i) => '<a href="#/m/' + m.id + '/lab/' + (i + 1) + '" class="flex items-center gap-3 px-4 py-3 hover:bg-white/[.03]">' +
        '<span class="step-dot ' + (S.progress.steps[s.id] ? 'step-done' : '') + '">' + (S.progress.steps[s.id] ? '✓' : i + 1) + '</span><span class="flex-1 min-w-0"><span class="text-slate-100">' + esc(s.title) + '</span>' +
        ' <span class="tag">' + (s.kind === 'guide' ? 'Do it in Claude' : 'API playground') + '</span>' + (s.tag ? ' <span class="tag">' + esc(s.tag) + '</span>' : '') + '</span><span class="text-xs text-slate-500 shrink-0">' + s.minutes + ' min</span></a>').join('') + '</div>' +
      '<div class="grid lg:grid-cols-2 gap-6 mb-10"><div><h2 class="section-title">Official docs &amp; free sources</h2><div class="card p-4 grid gap-2">' +
      m.sources.map((s) => '<a class="src-link" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">↗ ' + esc(s.label) + '</a>').join('') + '</div></div>' +
      '<div><h2 class="section-title">Quick check (optional)</h2><div class="grid gap-3">' + q + '</div></div></div></div>';
  }

  /* ---------------- lab view ---------------- */
  function templateText(step) {
    const s = PL.settings.get();
    const body = Object.assign({ model: s.model }, JSON.parse(JSON.stringify(step.body)));
    if (s.effortOverride && body.output_config) body.output_config.effort = s.effortOverride;
    return JSON.stringify(body, null, 2);
  }
  const editorText = (step) => (S.editors[step.id] != null ? S.editors[step.id] : templateText(step));

  function labView(r) {
    const { mod, step, idx } = r;
    document.title = step.title + ' · SRE Learning';
    const pills = mod.steps.map((s, i) => '<a href="#/m/' + mod.id + '/lab/' + (i + 1) + '" title="' + esc(s.title) + '" class="pill ' + (i === idx ? 'pill-active' : '') + ' ' + (S.progress.steps[s.id] ? 'pill-done' : '') + '">' + (S.progress.steps[s.id] && i !== idx ? '✓' : i + 1) + '</a>').join('');
    const files = (step.files || []).map((f) => '<details class="file"><summary><span class="text-accent-400">▸</span> ' + esc(PL.FILE_LABELS[f] || f) + ' <span class="text-slate-500 text-xs">(lab file · inserted as {{' + f + '}})</span></summary><pre>' + esc(PL.PLACEHOLDERS[f]) + '</pre></details>').join('');
    const guide = step.kind === 'guide';
    const hasTools = !guide && (!!(step.body.tools && step.body.tools.length) || !!(step.solution && step.solution.tools));
    const prev = idx > 0 ? '#/m/' + mod.id + '/lab/' + idx : '#/m/' + mod.id;
    const nextMod = MODS[MODS.indexOf(mod) + 1];
    const next = idx < mod.steps.length - 1 ? '#/m/' + mod.id + '/lab/' + (idx + 2) : nextMod ? '#/m/' + nextMod.id : '#/deploy';
    const nextLabel = idx < mod.steps.length - 1 ? 'Next step →' : nextMod ? (nextMod.week !== mod.week ? 'Next week →' : 'Next topic →') : 'Deployment Hub →';

    return '<div class="lab-grid" id="lab-grid" style="--left:' + S.leftPct + '%">' +
      '<section class="lab-left" aria-label="Instructions"><div class="p-4 sm:p-6">' +
      '<nav class="text-xs text-slate-500 mb-3 flex items-center gap-1 flex-wrap"><a href="#/" class="hover:text-slate-300">Dashboard</a> › <a href="#/w/' + mod.week + '" class="hover:text-slate-300">Week ' + mod.week + '</a> › <a href="#/m/' + mod.id + '" class="hover:text-slate-300">' + esc(mod.title) + '</a></nav>' +
      '<div class="flex gap-1.5 flex-wrap mb-4">' + pills + '</div>' +
      '<h1 class="text-xl sm:text-2xl font-extrabold text-white leading-tight">Step ' + (idx + 1) + ': ' + esc(step.title) + '</h1>' +
      '<div class="flex flex-wrap items-center gap-2 mt-2 text-xs"><span class="tag">⏱ ' + step.minutes + ' min</span><span class="tag">' + (guide ? 'Do it in Claude' : 'API playground') + '</span>' + (step.tag ? '<span class="tag tag-accent">' + esc(step.tag) + '</span>' : '') +
      '<a class="tag hover:text-white" href="' + esc(step.source.url) + '" target="_blank" rel="noopener noreferrer">Source ↗ ' + esc(step.source.label) + '</a></div>' +
      '<div class="card p-4 mt-5"><div class="card-title">Scenario</div><p class="text-slate-200 mt-1.5 leading-relaxed">' + step.scenario + '</p></div>' +
      '<div class="card p-4 mt-3"><div class="card-title">Your task</div><ol class="task-list mt-2">' + step.task.map((t) => '<li>' + t + '</li>').join('') + '</ol>' +
      (step.solution ? '<button class="btn-ghost btn-sm mt-3" data-action="solution">Load solution</button>' : '') + '</div>' +
      (files ? '<div class="mt-3 grid gap-2">' + files + '</div>' : '') +
      (step.panel === 'billing' ? billingPanel() : '') + (step.panel === 'vendor' ? vendorPanel() : '') +
      '<div class="card p-4 mt-3"><div class="flex items-center justify-between"><div class="card-title">Checks</div><span id="check-summary" class="text-xs text-slate-400"></span></div><ul id="checks" class="mt-2 grid gap-1.5"></ul></div>' +
      '<div class="card work-card p-4 mt-3"><div class="card-title text-accent-400">Leverage it at work (DevOps / Cloud)</div><p class="text-slate-300 mt-1.5 text-sm leading-relaxed">' + step.atWork + '</p></div>' +
      (step.hint ? '<details class="card p-4 mt-3 hint"><summary class="card-title cursor-pointer">Hint</summary><p class="text-sm text-slate-300 mt-2">' + esc(step.hint) + '</p></details>' : '') +
      '<div class="flex justify-between gap-3 mt-5 pb-6"><a class="btn-ghost btn-sm" href="' + prev + '">← Back</a><a class="btn-ghost btn-sm" href="' + next + '">' + nextLabel + '</a></div>' +
      '</div></section>' +
      '<div class="lab-handle" id="lab-handle" role="separator" aria-orientation="vertical" title="Drag to resize"></div>' +
      (guide ? guidePane(step, mod.week) + '</div>' : playgroundPane(step, hasTools));
  }

  /* "Run it in your SRE Learning workspace": where and how to do this step, generated from the step's prompts (js/workspace.js). */
  function workspaceCard(step, week) {
    const WS = PL.WS;
    if (!WS || step.workspace === 'setup') return '';
    const blocks = WS.runSteps(step, week).map((b) => '<div class="px-3 pt-3"><div class="text-xs font-semibold text-brand-300">' + esc(b.title) + '</div>' +
      '<ol class="task-list mt-1.5 text-sm">' + b.items.map((x) => '<li>' + x + '</li>').join('') + '</ol></div>').join('');
    return '<div class="guide-card"><div class="guide-hdr"><span>▶ Run it in your ' + esc(WS.project) + ' workspace</span>' +
      '<a class="text-[11px] text-brand-300 hover:underline" href="#/m/' + MODS[0].id + '/lab/1">First time? Set it up ↗</a></div>' + blocks + '<div class="pb-3"></div></div>';
  }
  function notesCard(step, week) {
    const WS = PL.WS;
    if (!WS || step.workspace !== 'step') return '';
    return '<div class="guide-card"><div class="guide-hdr"><span>✎ Save it to your notes</span></div>' +
      '<p class="text-xs text-slate-400 px-3 pt-2">Append this to <code>' + esc(WS.notesFile(week)) + '</code> and fill it in. The week wrap-up step turns these notes into your Project knowledge.</p>' +
      '<div class="codeblock m-3"><div class="codeblock-bar"><span>markdown</span><button class="btn-copy" data-action="copy-pre">Copy</button></div><pre class="whitespace-pre-wrap">' + esc(WS.noteTemplate(step)) + '</pre></div></div>';
  }

  function guidePane(step, week) {
    const where = { 'claude.ai': 'https://claude.ai/projects', 'Claude Code': 'https://code.claude.com/docs', 'Cowork': 'https://claude.com/docs/cowork/overview', 'Claude for Excel': 'https://claude.com/docs/office-agents/excel', 'Claude for Word': 'https://claude.com/docs/office-agents/word', 'Claude for PowerPoint': 'https://claude.com/docs/office-agents/powerpoint' };
    return '<section class="lab-right" aria-label="Do it in Claude">' +
      '<div class="pg-toolbar"><div class="font-semibold text-white text-sm px-1">Do it in Claude</div>' +
      '<a class="btn-run" href="https://claude.ai/projects" target="_blank" rel="noopener noreferrer">Open my Projects ↗</a></div>' +
      '<div class="guide-body">' + workspaceCard(step, week) +
      (step.prompts || []).map((p, i) => '<div class="guide-card"><div class="guide-hdr"><span><span class="guide-num">' + (i + 1) + '</span> ' + esc(p.label) + '</span>' +
        (where[p.where] ? '<a class="text-[11px] text-brand-300 hover:underline" href="' + where[p.where] + '" target="_blank" rel="noopener noreferrer">' + esc(p.where) + ' ↗</a>' : '<span class="text-[11px] text-slate-500">' + esc(p.where || '') + '</span>') + '</div>' +
        (p.note ? '<p class="text-xs text-slate-400 px-3 pt-2">' + p.note + '</p>' : '') +
        '<div class="codeblock m-3"><div class="codeblock-bar"><span>' + esc(p.lang || 'prompt') + '</span><button class="btn-copy" data-action="copy-pre">Copy</button></div><pre class="whitespace-pre-wrap">' + esc(p.text) + '</pre></div></div>').join('') +
      (step.expected && step.expected.length ? '<div class="guide-card"><div class="guide-hdr"><span>✓ What a good result looks like</span></div><ul class="grid gap-1.5 p-3 text-sm text-slate-300">' +
        step.expected.map((x) => '<li class="flex gap-2"><span class="text-emerald-400">•</span><span>' + esc(x) + '</span></li>').join('') + '</ul></div>' : '') +
      (step.verify ? '<div class="guide-card"><div class="guide-hdr"><span>⚠ Verify before you trust it</span></div><p class="p-3 text-sm text-slate-300">' + esc(step.verify) + '</p></div>' : '') +
      notesCard(step, week) +
      '<p class="text-xs text-slate-500 px-1 pb-6">Tick the checks on the left once you have done each part in Claude. Never paste secrets, customer data, or production credentials into a prompt.</p>' +
      '</div></section>';
  }

  function playgroundPane(step, hasTools) {
    return '<section class="lab-right" aria-label="Playground">' +
      '<div class="pg-toolbar"><div class="tabs" role="tablist">' +
      [['request', 'Request'], ['curl', 'cURL'], ['python', 'Python'], ['typescript', 'TypeScript']].map((t) => '<button class="tab ' + (S.tab === t[0] ? 'tab-active' : '') + '" data-action="tab" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') +
      '</div><div class="flex items-center gap-2"><span id="json-state" class="text-[11px]"></span>' +
      '<button class="btn-icon" data-action="reset" title="Reset request to the lab default">↺</button>' +
      '<button class="btn-icon" data-action="copy" title="Copy">⧉</button>' +
      '<button class="btn-run" id="run-btn" data-action="run" title="Run (Ctrl+Enter)">▶ Run</button></div></div>' +
      '<div class="pg-editor"><textarea id="editor" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Request JSON"></textarea><pre id="code" class="hidden"></pre></div>' +
      '<div class="pg-opts">' +
      (hasTools ? '<label class="opt"><input type="checkbox" id="opt-tools" ' + (S.autoTools ? 'checked' : '') + '> Auto-run tools</label>' : '') +
      (step.redact ? '<label class="opt opt-warn"><input type="checkbox" id="opt-redact" ' + (S.redact[step.id] ? 'checked' : '') + '> Redact PII before sending</label>' : '') +
      '<button class="opt-mode" data-action="settings">' + (PL.settings.isLive() ? '<span class="dot bg-emerald-400"></span>Live · ' + esc(PL.settings.get().model) : '<span class="dot bg-amber-400"></span>Simulated · no API key') + '</button></div>' +
      '<div class="pg-out"><div class="pg-out-bar"><div class="tabs">' +
      [['rendered', 'Output'], ['raw', 'Raw JSON']].map((t) => '<button class="tab ' + (S.outTab === t[0] ? 'tab-active' : '') + '" data-action="outtab" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') +
      '</div><span id="out-status" class="text-[11px] text-slate-400 truncate"></span></div><div id="out" class="out-body"></div></div>' +
      '</section></div>';
  }

  function billingPanel() {
    const st = PL.billingStats();
    return '<div class="card p-4 mt-3"><div class="flex items-center justify-between gap-2"><div class="card-title">Dataset · azure-billing-2026-06.csv</div>' +
      '<button class="btn-ghost btn-sm" data-action="download-csv">Download CSV</button></div>' +
      '<p class="text-xs text-slate-400 mt-1">Synthetic Contoso export: ' + st.rows.length + ' rows, ' + st.serviceCount + ' services. Rows with an empty Environment are untagged.</p>' +
      '<div class="overflow-x-auto mt-2"><table class="data-table"><thead><tr><th>Date</th><th>Resource</th><th>Service</th><th class="text-right">USD</th><th>Env</th></tr></thead><tbody>' +
      st.rows.map((r) => '<tr><td>' + esc(r.Date.slice(5)) + '</td><td>' + esc(r.ResourceName) + '</td><td>' + esc(r.ServiceName) + '</td><td class="text-right">' + r.CostUSD.toFixed(2) + '</td><td>' + (r.Environment ? esc(r.Environment) : '<span class="text-amber-400">—</span>') + '</td></tr>').join('') +
      '</tbody></table></div><details class="mt-3"><summary class="text-sm text-brand-300 cursor-pointer">Reveal ground truth (computed in your browser)</summary><div class="text-sm text-slate-300 mt-2 grid gap-1">' +
      '<div>Total: <b class="text-white">$' + fmtNum(st.total) + '</b> · Top RG: <b class="text-white">' + st.topRG + '</b> · Untagged: <b class="text-white">$' + fmtNum(st.untagged) + '</b></div>' +
      '<div class="text-xs text-slate-400">' + st.byService.map((s) => esc(s.name) + ' $' + fmtNum(s.cost)).join(' · ') + '</div></div></details></div>';
  }
  function vendorPanel() {
    return '<div class="card p-4 mt-3"><div class="card-title">Vendor review: where to look</div><ul class="grid gap-2 mt-2 text-sm">' +
      '<li><a class="src-link" href="https://trust.anthropic.com/" target="_blank" rel="noopener noreferrer">↗ Trust Center</a>: compliance reports and certifications (request access where needed), security overview, subprocessors.</li>' +
      '<li><a class="src-link" href="https://privacy.claude.com/" target="_blank" rel="noopener noreferrer">↗ Privacy Center → Commercial customers</a>: whether API data is used for training, retention and deletion, and zero-data-retention options.</li>' +
      '<li><a class="src-link" href="https://www.anthropic.com/legal/aup" target="_blank" rel="noopener noreferrer">↗ Usage Policy</a>: confirm your use case is permitted and note any high-risk requirements.</li>' +
      '</ul><p class="text-xs text-slate-500 mt-2">Policies change, so record the date you checked and link the live page in your review.</p></div>';
  }

  function afterLabRender(step) {
    if (step.kind === 'guide') { renderChecks(step); return; }
    const ed = $('#editor');
    ed.value = editorText(step);
    showTab(step);
    renderChecks(step);
    renderOutput();
    validateJSON();
  }

  function validateJSON() {
    const el = $('#json-state'), ed = $('#editor');
    if (!el || !ed) return null;
    try { const v = JSON.parse(ed.value); el.textContent = '● valid JSON'; el.className = 'text-[11px] text-emerald-400'; return v; } catch (e) {
      el.textContent = '● invalid JSON'; el.className = 'text-[11px] text-red-400'; return null;
    }
  }

  function showTab(step) {
    const ed = $('#editor'), code = $('#code');
    $$('.pg-toolbar .tab').forEach((b) => b.classList.toggle('tab-active', b.dataset.tab === S.tab));
    if (S.tab === 'request') { ed.classList.remove('hidden'); code.classList.add('hidden'); return; }
    ed.classList.add('hidden'); code.classList.remove('hidden');
    let body;
    try { body = JSON.parse(ed.value); } catch (e) { code.textContent = '// Fix the request JSON first: ' + e.message; return; }
    const prep = PL.prepare(body, { redact: step.redact && S.redact[step.id] });
    const snip = PL.snippets(prep)[S.tab];
    code.textContent = (prep.redactions ? '# PII redaction applied: ' + prep.redactions + ' value(s) masked in this payload\n' : '') + snip;
  }

  function renderChecks(step) {
    const ul = $('#checks');
    if (!ul) return;
    const res = updateCompletion(step);
    const icon = { pass: '<span class="ck ck-pass">✓</span>', fail: '<span class="ck ck-fail">✗</span>', pending: '<span class="ck ck-pend">○</span>', todo: '<span class="ck ck-pend">☐</span>' };
    ul.innerHTML = res.map((r) => r.manual
      ? '<li><label class="check-row cursor-pointer"><input type="checkbox" class="sr-only" data-manual="' + step.id + ':' + r.id + '" ' + (r.state === 'pass' ? 'checked' : '') + '>' + (r.state === 'pass' ? icon.pass : icon.todo) + '<span>' + esc(r.label) + ' <span class="text-[10px] uppercase tracking-wider text-slate-500">manual</span></span></label></li>'
      : '<li class="check-row">' + icon[r.state] + '<span class="' + (r.state === 'fail' ? 'text-red-200' : r.state === 'pass' ? 'text-slate-100' : 'text-slate-400') + '">' + esc(r.label) + '</span></li>').join('');
    const passed = res.filter((r) => r.state === 'pass').length;
    const sum = $('#check-summary');
    sum.innerHTML = S.progress.steps[step.id] ? '<span class="text-emerald-400 font-semibold">Step complete ✓</span>' : passed + '/' + res.length + ' passing';
  }

  /* ---------------- output rendering ---------------- */
  let rafPending = false;
  function scheduleRender() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; renderOutput(); });
  }

  function textRun(blocks) {
    let buf = '', cites = [];
    blocks.forEach((b) => {
      buf += b.text || '';
      (b.citations || []).forEach((c) => { cites.push(c); buf += '⟦' + cites.length + '⟧'; });
    });
    let html = md(buf).replace(/⟦(\d+)⟧/g, (m, n) => '<sup class="cite" title="' + esc((cites[n - 1] && cites[n - 1].cited_text) || '') + '">[' + n + ']</sup>');
    if (cites.length) html += '<div class="cite-list">' + cites.map((c, i) => '<div><span class="text-brand-300">[' + (i + 1) + ']</span> “' + esc((c.cited_text || '').trim()) + '” <span class="text-slate-500">· ' + esc(c.document_title || 'document') + '</span></div>').join('') + '</div>';
    return '<div class="md">' + html + '</div>';
  }

  function turnHTML(msg, n) {
    const u = msg.usage || {};
    let h = '<div class="turn"><div class="turn-hdr"><span>Turn ' + n + (msg.simulated ? ' · <span class="text-amber-300">simulated</span>' : '') + '</span><span>' +
      (msg.stop_reason ? 'stop_reason: <b class="' + (msg.stop_reason === 'refusal' ? 'text-red-300' : 'text-slate-200') + '">' + esc(msg.stop_reason) + '</b>' : '<span class="streaming">streaming…</span>') +
      (u.output_tokens ? ' · in ' + fmtNum(u.input_tokens || 0) + ' / out ' + fmtNum(u.output_tokens) + ' tok' : '') + '</span></div>';
    if (msg.stop_reason === 'refusal') {
      const d = msg.stop_details || {};
      h += '<div class="blk blk-err"><b>Claude declined this request.</b> ' + (d.category ? 'Category: <code>' + esc(d.category) + '</code>. ' : '') + esc(d.explanation || '') + '<div class="text-xs mt-1 text-slate-400">Always check stop_reason before reading content. With fallbacks enabled, the API can retry on another model automatically.</div></div>';
    }
    let run = [];
    const flush = () => { if (run.length) { h += textRun(run); run = []; } };
    (msg.content || []).forEach((b) => {
      if (!b) return;
      if (b.type === 'text') { run.push(b); return; }
      flush();
      if (b.type === 'thinking') {
        h += '<details class="blk blk-think"><summary>💭 Thinking' + (b.thinking ? ' · summarized' : ' · display omitted') + '</summary>' +
          (b.thinking ? '<div class="md text-sm">' + md(b.thinking) + '</div>' : '<p class="text-sm text-slate-400">Thinking ran, but its text is omitted. Set <code>thinking.display</code> to "summarized" to see a summary.</p>') + '</details>';
      } else if (b.type === 'redacted_thinking') {
        h += '<div class="blk blk-think text-sm">🔒 Redacted thinking block (encrypted; passed back unchanged)</div>';
      } else if (b.type === 'tool_use') {
        h += '<div class="blk blk-tool"><div class="blk-hdr">🛠 tool_use → <b>' + esc(b.name) + '</b> <span class="text-slate-500">' + esc(b.id || '') + '</span></div><pre>' + esc(JSON.stringify(b.input || {}, null, 2)) + '</pre></div>';
      } else {
        h += '<div class="blk"><div class="blk-hdr">' + esc(b.type) + '</div><pre>' + esc(JSON.stringify(b, null, 2)) + '</pre></div>';
      }
    });
    flush();
    return h + '</div>';
  }

  function pretty(s) { try { return JSON.stringify(JSON.parse(s), null, 2); } catch (e) { return s; } }

  function renderOutput() {
    const out = $('#out');
    const r = S.route;
    if (!out || !r || r.view !== 'lab' || r.step.kind === 'guide') return;
    const step = r.step;
    const ctx = S.results[step.id];
    const status = $('#out-status');
    const btn = $('#run-btn');
    if (btn) { btn.textContent = S.run ? '■ Stop' : '▶ Run'; btn.classList.toggle('btn-stop', !!S.run); }
    if (!ctx) {
      status.textContent = '';
      out.innerHTML = '<div class="empty"><div class="text-3xl mb-2">▶</div><div class="font-semibold text-slate-200">Press Run (Ctrl+Enter)</div><p class="text-sm text-slate-400 mt-1 max-w-sm mx-auto">' +
        (PL.settings.isLive() ? 'Live call with your key, streamed from api.anthropic.com.' : 'Simulated mode: a pre-recorded response streams in; tools, redaction, and checks run for real. Add an API key in Settings for live calls.') + '</p></div>';
      return;
    }
    const outTok = ctx.turns.reduce((a, t) => a + ((t.usage && t.usage.output_tokens) || 0), 0);
    status.textContent = (ctx.mode === 'live' ? 'live' : 'simulated') + ' · ' + ctx.turns.length + ' turn(s)' + (outTok ? ' · ' + fmtNum(outTok) + ' output tok' : '') + (ctx.ms ? ' · ' + (ctx.ms / 1000).toFixed(1) + 's' : '');
    if (S.outTab === 'raw') {
      out.innerHTML = '<pre class="raw">' + esc(JSON.stringify({ request: ctx.sentBody, notes: ctx.notes, responses: ctx.turns, tool_calls: ctx.toolCalls }, null, 2)) + '</pre>';
      return;
    }
    let h = ctx.notes.length ? '<div class="notes">' + ctx.notes.map((n) => '<div>ℹ ' + esc(n) + '</div>').join('') + '</div>' : '';
    let n = 0;
    ctx.timeline.forEach((item) => {
      if (item.kind === 'turn') h += turnHTML(item.msg, ++n);
      else if (item.kind === 'tools') {
        h += '<div class="turn turn-tools"><div class="turn-hdr"><span>Your code runs the tools locally</span><span>' + item.calls.length + ' tool_result(s) → sent back in one user message</span></div>' +
          item.calls.map((c) => '<div class="blk ' + (c.is_error ? 'blk-err' : 'blk-result') + '"><div class="blk-hdr">' + (c.is_error ? '⚠' : '↩') + ' tool_result ← <b>' + esc(c.name) + '</b>' + (c.is_error ? ' <span class="text-red-300">(is_error)</span>' : '') + '</div><pre>' + esc(pretty(c.output)) + '</pre></div>').join('') + '</div>';
      }
    });
    if (ctx.error) h += '<div class="blk blk-err"><b>Request failed' + (ctx.error.status ? ' (HTTP ' + ctx.error.status + ')' : '') + '.</b> ' + esc(ctx.error.message) + '</div>';
    if (ctx.aborted) h += '<div class="blk text-sm text-slate-400">Stopped.</div>';
    if (ctx.pausedForTools) h += '<div class="blk text-sm text-amber-200">Paused at tool_use. Turn on <b>Auto-run tools</b> and run again to execute the tools and continue the loop.</div>';
    if (step.compareWith && ctx.final && !S.run) h += compareTable(step);
    out.innerHTML = h;
    if (S.run) out.scrollTop = out.scrollHeight;
  }

  function compareTable(step) {
    const a = S.memory[step.compareWith], b = S.memory[step.id];
    if (!a || !b) return '<div class="blk text-sm text-slate-400">Run <a class="text-brand-300 underline" href="#/m/' + STEP_INDEX[step.compareWith].mod.id + '/lab/' + (STEP_INDEX[step.compareWith].idx + 1) + '">Step ' + (STEP_INDEX[step.compareWith].idx + 1) + '</a> to compare effort levels.</div>';
    const pct = a.output_tokens ? Math.round((1 - b.output_tokens / a.output_tokens) * 100) : 0;
    return '<div class="blk"><div class="blk-hdr">Effort comparison</div><table class="data-table w-full"><thead><tr><th></th><th class="text-right">Output tokens</th><th class="text-right">Time</th></tr></thead><tbody>' +
      '<tr><td>Step ' + (STEP_INDEX[step.compareWith].idx + 1) + ' (' + (a.mode) + ')</td><td class="text-right">' + fmtNum(a.output_tokens) + '</td><td class="text-right">' + (a.ms / 1000).toFixed(1) + 's</td></tr>' +
      '<tr><td>This step (' + b.mode + ')</td><td class="text-right">' + fmtNum(b.output_tokens) + '</td><td class="text-right">' + (b.ms / 1000).toFixed(1) + 's</td></tr></tbody></table>' +
      '<p class="text-sm mt-2 ' + (pct > 0 ? 'text-emerald-300' : 'text-slate-300') + '">' + (pct > 0 ? pct + '% fewer output tokens.' : 'No token saving on this run.') + ' Output tokens drive most of the cost.</p></div>';
  }

  /* ---------------- run loop ---------------- */
  async function run(step) {
    if (step.kind === 'guide') return;
    if (S.run) { S.run.abort(); return; }
    const body = validateJSON();
    if (!body) { toast('Request JSON is invalid: fix it before running.', 'error'); return; }
    if (!Array.isArray(body.messages)) { toast('The request needs a "messages" array.', 'error'); return; }
    const live = PL.settings.isLive();
    const prep = PL.prepare(body, { redact: step.redact && S.redact[step.id] });
    const ctx = { requestBody: body, sentBody: prep.body, notes: prep.notes, turns: [], toolCalls: [], timeline: [], mode: live ? 'live' : 'sim', started: performance.now() };
    S.results[step.id] = ctx;
    const ac = new AbortController();
    S.run = ac;
    renderChecks(step);
    renderOutput();
    let simTurns = null;
    if (!live) { try { simTurns = (typeof step.sim === 'function' ? step.sim(ctx, H) : step.sim) || []; } catch (e) { simTurns = []; } }
    let messages = prep.body.messages.slice();
    try {
      for (let i = 0; i < 8; i++) {
        const item = { kind: 'turn', msg: { content: [] } };
        let msg;
        const onUpdate = (m) => { item.msg = m; scheduleRender(); };
        if (live) {
          ctx.timeline.push(item);
          msg = await PL.streamMessage(Object.assign({}, prep.body, { messages }), prep.headers, onUpdate, ac.signal);
        } else {
          const t = simTurns[i];
          if (!t) break;
          ctx.timeline.push(item);
          msg = await PL.simulateMessage(t, onUpdate, ac.signal);
        }
        item.msg = msg;
        ctx.turns.push(msg);
        messages = messages.concat([{ role: 'assistant', content: PL.sanitizeContent(msg.content) }]);
        if (msg.stop_reason === 'tool_use') {
          if (!S.autoTools) { ctx.pausedForTools = true; break; }
          const calls = [], results = [];
          msg.content.filter((b) => b.type === 'tool_use').forEach((u) => {
            const r = PL.runTool(u.name, u.input);
            const call = { id: u.id, name: u.name, input: u.input || {}, output: r.content, is_error: !!r.is_error };
            calls.push(call);
            ctx.toolCalls.push(call);
            results.push(Object.assign({ type: 'tool_result', tool_use_id: u.id, content: r.content }, r.is_error ? { is_error: true } : {}));
          });
          ctx.timeline.push({ kind: 'tools', calls });
          messages = messages.concat([{ role: 'user', content: results }]);
          scheduleRender();
          continue;
        }
        if (msg.stop_reason === 'pause_turn') continue;
        break;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') ctx.aborted = true; else ctx.error = e;
    } finally {
      S.run = null;
      ctx.ms = Math.round(performance.now() - ctx.started);
      ctx.final = ctx.turns[ctx.turns.length - 1];
      if (ctx.final && !ctx.error) {
        S.memory[step.id] = { output_tokens: ctx.turns.reduce((a, t) => a + ((t.usage && t.usage.output_tokens) || 0), 0), ms: ctx.ms, mode: ctx.mode };
        store.set('pl.memory', S.memory);
      }
      if (S.route && S.route.step && S.route.step.id === step.id) { renderOutput(); renderChecks(step); }
    }
  }

  /* ---------------- settings modal ---------------- */
  function openSettings() {
    const s = PL.settings.get();
    $('#set-key').value = s.apiKey || '';
    $('#set-remember').checked = !!s.remember;
    $('#set-model').innerHTML = PL.MODELS.map((m) => '<option value="' + m.id + '"' + (m.id === s.model ? ' selected' : '') + '>' + m.label + '</option>').join('');
    $('#set-effort').value = s.effortOverride || '';
    $('#set-fallback').checked = !!s.fallback;
    $('#set-status').textContent = '';
    $('#settings').hidden = false;
    setTimeout(() => $('#set-key').focus(), 30);
  }
  function closeSettings() { $('#settings').hidden = true; }
  function saveSettings() {
    const key = $('#set-key').value.trim();
    if (key && !/^sk-ant-/.test(key)) { $('#set-status').innerHTML = '<span class="text-red-300">That does not look like an Anthropic API key (it should start with sk-ant-).</span>'; return false; }
    PL.settings.save({ apiKey: key, remember: $('#set-remember').checked, model: $('#set-model').value, effortOverride: $('#set-effort').value, fallback: $('#set-fallback').checked });
    renderHeader();
    renderView();
    return true;
  }

  /* ---------------- events ---------------- */
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-action]');
    if (!t) {
      if (e.target.id === 'settings') closeSettings();
      return;
    }
    const a = t.dataset.action;
    const step = S.route && S.route.step;
    if (a === 'settings') { openSettings(); return; }
    if (a === 'print') { window.print(); return; }
    if (a === 'auth') { $('#auth-status').textContent = ''; $('#auth-newpass').value = ''; $('#auth-reset').hidden = true; $('#auth').hidden = false; return; }
    if (a === 'close-auth') { $('#auth').hidden = true; return; }
    if (a === 'gate-tab') { setGateMode(t.dataset.tab); return; }
    if (a === 'gate-forgot' || a === 'gate-resend') {
      const email = $('#gate-email').value.trim();
      if (!email) { gateMsg('Enter your company email above first.', 'error'); $('#gate-email').focus(); return; }
      t.disabled = true;
      try {
        if (a === 'gate-forgot') { await PL.sync.resetPassword(email); gateMsg('If an account exists for ' + email + ', a password reset link is on its way. Check your inbox and Junk, and open the link in this browser.', 'ok'); }
        else { await PL.sync.resendConfirmation(email); gateMsg('Confirmation email sent again to ' + email + '. Check your inbox and Junk.', 'ok'); }
      } catch (err) { gateMsg(err.message, 'error'); }
      finally { t.disabled = false; }
      return;
    }
    if (a === 'auth-changepass') {
      try { await PL.sync.changePassword($('#auth-newpass').value); $('#auth-newpass').value = ''; $('#auth-reset').hidden = true; $('#auth-status').innerHTML = '<span class="text-emerald-300">Password updated.</span>'; }
      catch (err) { $('#auth-status').innerHTML = '<span class="text-red-300">' + esc(err.message) + '</span>'; }
      return;
    }
    if (a === 'auth-signout') { $('#auth').hidden = true; await PL.sync.signOut(); return; }
    if (a === 'toggle-sidebar') { document.body.classList.toggle('sidebar-open'); return; }
    if (a === 'close-settings') { closeSettings(); return; }
    if (a === 'save-settings') { if (saveSettings()) { closeSettings(); toast(PL.settings.isLive() ? 'Live mode on' : 'Settings saved · simulated mode', 'ok'); } return; }
    if (a === 'forget-key') { PL.settings.forgetKey(); $('#set-key').value = ''; renderHeader(); renderView(); $('#set-status').innerHTML = '<span class="text-emerald-300">Key removed from this browser.</span>'; return; }
    if (a === 'toggle-key') { const k = $('#set-key'); k.type = k.type === 'password' ? 'text' : 'password'; t.textContent = k.type === 'password' ? 'Show' : 'Hide'; return; }
    if (a === 'test-key') {
      if (!saveSettings()) return;
      if (!PL.settings.isLive()) { $('#set-status').innerHTML = '<span class="text-amber-300">Enter a key first.</span>'; return; }
      $('#set-status').textContent = 'Testing…';
      try { const m = await PL.testConnection(); $('#set-status').innerHTML = '<span class="text-emerald-300">✓ Connected. ' + esc(m.display_name || m.id) + ' is available to this key.</span>'; }
      catch (err) { $('#set-status').innerHTML = '<span class="text-red-300">' + esc(err.message) + '</span>'; }
      return;
    }
    if (a === 'quiz') {
      S.progress.quiz[t.dataset.q] = parseInt(t.dataset.o, 10);
      saveProgress();
      const sc = $('#scroller'), y = sc ? sc.scrollTop : 0;
      renderView();
      if ($('#scroller')) $('#scroller').scrollTop = y;
      return;
    }
    if (a === 'copy-pre') {
      const box = t.closest('.codeblock') || t.parentElement;
      const pre = box.querySelector('pre');
      if (pre && (await copyText(pre.textContent))) toast('Copied', 'ok');
      return;
    }
    if (!step) return;
    if (a === 'run') run(step);
    else if (a === 'tab') { S.tab = t.dataset.tab; showTab(step); }
    else if (a === 'outtab') { S.outTab = t.dataset.tab; $$('.pg-out-bar .tab').forEach((b) => b.classList.toggle('tab-active', b.dataset.tab === S.outTab)); renderOutput(); }
    else if (a === 'reset') { delete S.editors[step.id]; $('#editor').value = templateText(step); validateJSON(); showTab(step); toast('Request reset to the lab default'); }
    else if (a === 'copy') { const text = S.tab === 'request' ? $('#editor').value : $('#code').textContent; if (await copyText(text)) toast('Copied to clipboard', 'ok'); }
    else if (a === 'solution') {
      const s = PL.settings.get();
      S.editors[step.id] = JSON.stringify(Object.assign({ model: s.model }, step.solution), null, 2);
      $('#editor').value = S.editors[step.id]; S.tab = 'request'; showTab(step); validateJSON(); toast('Solution loaded: review it, then Run');
    } else if (a === 'download-csv') {
      const url = URL.createObjectURL(new Blob([PL.AZURE_CSV + '\n'], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'azure-billing-2026-06.csv';
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });

  document.addEventListener('change', (e) => {
    const step = S.route && S.route.step;
    if (e.target.id === 'opt-tools') S.autoTools = e.target.checked;
    else if (e.target.id === 'opt-redact' && step) { S.redact[step.id] = e.target.checked; showTab(step); }
    else if (e.target.dataset.manual && step) {
      if (e.target.checked) S.progress.manual[e.target.dataset.manual] = true; else delete S.progress.manual[e.target.dataset.manual];
      saveProgress();
      renderChecks(step);
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'editor' && S.route && S.route.step) { S.editors[S.route.step.id] = e.target.value; validateJSON(); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#settings').hidden) { closeSettings(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && S.route && S.route.view === 'lab') { e.preventDefault(); run(S.route.step); return; }
    if (e.key === 'Tab' && e.target.id === 'editor' && !e.shiftKey) {
      e.preventDefault();
      const ta = e.target, s = ta.selectionStart;
      ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(ta.selectionEnd);
      ta.selectionStart = ta.selectionEnd = s + 2;
      S.editors[S.route.step.id] = ta.value;
    }
  });

  // Resizable split pane
  document.addEventListener('pointerdown', (e) => {
    if (e.target.id !== 'lab-handle') return;
    const grid = $('#lab-grid');
    const rect = grid.getBoundingClientRect();
    e.target.setPointerCapture(e.pointerId);
    document.body.classList.add('resizing');
    const move = (ev) => {
      S.leftPct = Math.max(26, Math.min(66, ((ev.clientX - rect.left) / rect.width) * 100));
      grid.style.setProperty('--left', S.leftPct + '%');
    };
    const up = () => {
      document.body.classList.remove('resizing');
      store.set('pl.leftPct', Math.round(S.leftPct));
      e.target.removeEventListener('pointermove', move);
      e.target.removeEventListener('pointerup', up);
    };
    e.target.addEventListener('pointermove', move);
    e.target.addEventListener('pointerup', up);
  });

  window.addEventListener('hashchange', onRoute);
  renderHeader();
  onRoute();

  /* ---------------- login gate + progress sync ---------------- */
  let gateMode = 'signin';
  function setGateMode(mode) {
    gateMode = mode;
    $('#gate-tab-signin').classList.toggle('tab-active', mode === 'signin');
    $('#gate-tab-signup').classList.toggle('tab-active', mode === 'signup');
    $('#gate-confirm-wrap').hidden = mode !== 'signup';
    $('#gate-password').autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
    $('#gate-submit').textContent = mode === 'signup' ? 'Create account' : 'Sign in';
    $('#gate-status').textContent = '';
    $('#gate-resend').hidden = true;
  }
  function gateMsg(text, kind) {
    const cls = { error: 'text-red-300', ok: 'text-emerald-300', info: 'text-slate-300' }[kind] || 'text-slate-300';
    $('#gate-status').innerHTML = '<span class="' + cls + '">' + esc(text) + '</span>';
  }
  /* one-time message after an email link (confirm / reset / expired), set by PL.sync.init */
  function showNotice(user) {
    const n = PL.sync.notice;
    if (!n) return;
    PL.sync.notice = null;
    if (n.kind === 'reset' && user) { $('#auth-status').textContent = ''; $('#auth-newpass').value = ''; $('#auth-reset').hidden = false; $('#auth').hidden = false; setTimeout(() => $('#auth-newpass').focus(), 30); }
    else if (user) toast(n.text, n.kind === 'error' ? 'error' : 'ok');
    else gateMsg(n.text, n.kind === 'error' ? 'error' : 'info');
  }
  function renderAuth(user) {
    const btn = $('#auth-btn');
    if (!btn || !PL.sync || !PL.sync.enabled) return;
    $('#gate-loading').hidden = true;
    $('#gate-forms').hidden = false;
    $('#gate').hidden = !!user;
    document.body.classList.toggle('locked', !user);
    btn.classList.toggle('hidden', !user);
    if (user) {
      btn.innerHTML = '<span class="dot bg-emerald-400"></span><span class="hidden sm:inline">' + esc(user.email) + '</span><span class="sm:hidden">Account</span>';
      $('#auth-who').textContent = user.email;
      if (S.route && S.route.view === 'home') renderTeam();
    } else {
      $('#gate-password').value = ''; $('#gate-confirm').value = '';
      setTimeout(() => $('#gate-email').focus(), 30);
    }
    showNotice(user);
  }
  document.addEventListener('submit', async (e) => {
    if (e.target.id !== 'gate-form') return;
    e.preventDefault();
    const email = $('#gate-email').value.trim(), pass = $('#gate-password').value, status = $('#gate-status'), btn = $('#gate-submit');
    if (gateMode === 'signup' && pass !== $('#gate-confirm').value) { status.innerHTML = '<span class="text-red-300">Passwords do not match.</span>'; return; }
    btn.disabled = true; status.textContent = gateMode === 'signup' ? 'Creating your account…' : 'Signing in…';
    $('#gate-resend').hidden = true;
    try {
      if (gateMode === 'signup') {
        if ((await PL.sync.signUp(email, pass)) === 'check-inbox') {
          setGateMode('signin'); $('#gate-email').value = email;
          gateMsg('Almost done: we sent a confirmation link to ' + email + '. Open it (check Junk too), then sign in here with your password.', 'ok');
          $('#gate-resend').hidden = false;
          return;
        }
      } else await PL.sync.signIn(email, pass);
      status.textContent = '';
    }
    catch (err) { gateMsg(err.message, 'error'); if (err.unconfirmed) $('#gate-resend').hidden = false; }
    finally { btn.disabled = false; }
  });
  async function renderTeam() {
    const box = $('#team');
    if (!box || !PL.sync || !PL.sync.user()) return;
    const rows = await PL.sync.team();
    if (!rows.length) return;
    box.innerHTML = '<h2 class="section-title">Team progress</h2><div class="card divide-y divide-white/5 mb-10">' + rows.map((r) => {
      const n = Object.keys((r.data && r.data.steps) || {}).filter((k) => STEP_INDEX[k]).length;
      return '<div class="flex items-center gap-3 px-4 py-3">' + ring(n, TOTAL_STEPS, 34) + '<span class="flex-1 min-w-0 text-slate-100 truncate">' + esc(r.email || 'member') + '</span><span class="text-xs text-slate-500">' + n + '/' + TOTAL_STEPS + ' steps · updated ' + esc(new Date(r.updated_at).toLocaleDateString()) + '</span></div>';
    }).join('') + '</div>';
  }
  PL.renderTeam = renderTeam;
  if (PL.sync && PL.sync.enabled) {
    document.body.classList.add('locked');
    $('#gate').hidden = false;
    PL.sync.init(() => S.progress, (merged) => {
      S.progress = Object.assign({ steps: {}, manual: {}, quiz: {}, seen: {} }, merged);
      store.set('pl.progress', S.progress);
      renderHeader(); renderSidebar();
      if (!S.route || S.route.view !== 'lab') renderView(); else renderChecks(S.route.step);
    }, renderAuth).catch((e) => {
      console.warn('sync init failed', e);
      $('#gate-loading').textContent = 'Could not reach the sign-in service. Check your connection and refresh the page.';
    });
  }
})();
