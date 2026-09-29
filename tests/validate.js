#!/usr/bin/env node
/* SRE Learning · content validator.
   Loads the site's scripts in a sandbox (no browser), then checks every week/topic/step:
   schema, official-source links, strict JSON schemas, and that each API step's simulated
   run passes its own auto checks (running local tools exactly like the browser).
   Usage: node tests/validate.js [--week N] [--allow-missing] */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const onlyWeek = args.includes('--week') ? parseInt(args[args.indexOf('--week') + 1], 10) : null;
const allowMissing = args.includes('--allow-missing');

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(where + ': ' + msg);
const warn = (where, msg) => warnings.push(where + ': ' + msg);

/* ---- load scripts in index.html order (skip browser-only files) ---- */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map((m) => m[1])
  .filter((s) => !/tailwind\.config|deploy\.js|app\.js/.test(s));
const memStore = () => { const d = {}; return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } }; };
const sandbox = { console, location: { search: '' }, localStorage: memStore(), sessionStorage: memStore(), setTimeout, clearTimeout, TextDecoder, URL, Blob: function () {} };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const s of scripts) {
  const file = path.join(ROOT, s);
  if (!fs.existsSync(file)) { (allowMissing ? warn : err)(s, 'file missing'); continue; }
  try { vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: s }); }
  catch (e) { err(s, 'failed to load: ' + e.message); }
}
const PL = sandbox.PL;
if (!PL || !PL.PROGRAM) { console.error(errors.join('\n')); process.exit(1); }

/* ---- helpers ---- */
const isUrl = (u) => typeof u === 'string' && /^https:\/\/[^\s]+$/.test(u);
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;
function checkSchema(where, sch) {
  if (!sch || typeof sch !== 'object') return;
  if (sch.type === 'object') {
    if (sch.additionalProperties !== false) err(where, 'JSON schema object missing additionalProperties:false');
    const props = Object.keys(sch.properties || {});
    const req = sch.required || [];
    props.forEach((p) => { if (!req.includes(p)) err(where, 'JSON schema property "' + p + '" not in required'); });
    props.forEach((p) => checkSchema(where + '.' + p, sch.properties[p]));
  }
  if (sch.type === 'array') checkSchema(where + '[]', sch.items);
}
function placeholdersIn(obj) { const s = JSON.stringify(obj || {}); return [...s.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((m) => m[1]); }

/* ---- validate ---- */
const weeks = PL.PROGRAM.weeks;
const seenTopic = new Set(), seenStep = new Set(), weekNums = new Set();
const memory = {};
let apiSteps = 0, guideSteps = 0, topicsN = 0;
for (let n = 1; n <= 20; n++) if (!weeks.find((w) => w.week === n)) (allowMissing ? warn : err)('week ' + n, 'not registered');

for (const w of weeks) {
  const W = 'week ' + w.week;
  if (weekNums.has(w.week)) err(W, 'duplicate week'); weekNums.add(w.week);
  if (onlyWeek && w.week !== onlyWeek) continue;
  if (!nonEmpty(w.title)) err(W, 'missing title');
  if (!PL.STREAMS[w.stream]) err(W, 'unknown stream "' + w.stream + '"');
  if (typeof w.hours !== 'number') err(W, 'hours must be a number');
  if (!nonEmpty(w.focus)) err(W, 'missing focus');
  if (!w.topics || !w.topics.length) err(W, 'no topics');
  if (w.milestone) ['id', 'title', 'reviewer', 'passes'].forEach((k) => { if (!nonEmpty(w.milestone[k])) err(W, 'milestone.' + k + ' missing'); });

  for (const t of w.topics || []) {
    topicsN++;
    const T = W + ' › ' + t.id;
    const isNew = /^w\d\d/.test(t.id);
    if (seenTopic.has(t.id)) err(T, 'duplicate topic id'); seenTopic.add(t.id);
    if (isNew && !new RegExp('^w' + String(w.week).padStart(2, '0') + '-').test(t.id)) err(T, 'topic id must start with w' + String(w.week).padStart(2, '0') + '-');
    ['title', 'blurb'].forEach((k) => { if (!nonEmpty(t[k])) err(T, k + ' missing'); });
    if (!Array.isArray(t.outcomes) || t.outcomes.length < 2) err(T, 'needs >= 2 outcomes');
    if (!Array.isArray(t.concepts) || t.concepts.length < 4) err(T, 'needs >= 4 concept cards');
    (t.concepts || []).forEach((c, i) => { if (!nonEmpty(c.t) || !nonEmpty(c.d) || !nonEmpty(c.ex)) err(T, 'concept ' + i + ' needs t/d/ex'); });
    if (!Array.isArray(t.sources) || t.sources.length < 2) err(T, 'needs >= 2 sources');
    (t.sources || []).forEach((s, i) => { if (!nonEmpty(s.label) || !isUrl(s.url)) err(T, 'source ' + i + ' needs label + https url'); });
    if (isNew && (!Array.isArray(t.leverage) || t.leverage.length < 3)) err(T, 'needs >= 3 leverage items (how to use Claude for this as DevOps/Cloud)');
    (t.leverage || []).forEach((x, i) => { if (!nonEmpty(x.t) || !nonEmpty(x.d)) err(T, 'leverage ' + i + ' needs t/d'); });
    if (!Array.isArray(t.quiz) || t.quiz.length < 2) err(T, 'needs >= 2 quiz questions');
    (t.quiz || []).forEach((q, i) => { if (!nonEmpty(q.q) || !Array.isArray(q.options) || q.options.length < 2 || !(q.a >= 0 && q.a < q.options.length) || !nonEmpty(q.why)) err(T, 'quiz ' + i + ' malformed'); });
    if (!Array.isArray(t.steps) || !t.steps.length) { err(T, 'no steps'); continue; }
    if (isNew && !t.steps.some((s) => s.kind === 'guide')) err(T, 'needs at least one "Do it in Claude" guide step');

    for (const s of t.steps) {
      const P = T + ' › ' + s.id;
      if (seenStep.has(s.id)) err(P, 'duplicate step id'); seenStep.add(s.id);
      ['title', 'scenario', 'atWork'].forEach((k) => { if (!nonEmpty(s[k])) err(P, k + ' missing'); });
      if (typeof s.minutes !== 'number') err(P, 'minutes must be a number');
      if (!s.source || !nonEmpty(s.source.label) || !isUrl(s.source.url)) err(P, 'source needs label + https url');
      if (!Array.isArray(s.task) || !s.task.length) err(P, 'task list missing');
      if (!Array.isArray(s.checks) || !s.checks.length) { err(P, 'no checks'); continue; }
      s.checks.forEach((c) => { if (!nonEmpty(c.id) || !nonEmpty(c.label)) err(P, 'check needs id + label'); if (!c.manual && typeof c.test !== 'function') err(P, 'check ' + c.id + ' needs test() or manual:true'); });

      if (s.kind === 'guide') {
        guideSteps++;
        if (!Array.isArray(s.prompts) || !s.prompts.length) err(P, 'guide step needs prompts');
        (s.prompts || []).forEach((p, i) => { if (!nonEmpty(p.label) || !nonEmpty(p.where) || !nonEmpty(p.text)) err(P, 'prompt ' + i + ' needs label/where/text'); });
        if (s.checks.some((c) => !c.manual)) err(P, 'guide steps may only have manual checks');
        continue;
      }

      apiSteps++;
      if (!s.body || !Array.isArray(s.body.messages)) { err(P, 'API step needs body.messages'); continue; }
      if (typeof s.body.max_tokens !== 'number') err(P, 'body.max_tokens missing');
      if (!s.checks.some((c) => !c.manual)) err(P, 'API step needs >= 1 auto check');
      if (!s.sim) { err(P, 'API step needs sim'); continue; }
      placeholdersIn(s.body).concat(placeholdersIn(s.solution)).forEach((ph) => { if (!(ph in PL.PLACEHOLDERS)) err(P, 'unknown placeholder {{' + ph + '}}'); });
      (s.files || []).forEach((f) => { if (!(f in PL.PLACEHOLDERS)) err(P, 'files[] references unknown placeholder ' + f); });
      if (s.body.output_config && s.body.output_config.format) checkSchema(P + ' schema', s.body.output_config.format.schema);
      if (s.body.thinking && s.body.thinking.type === 'enabled') err(P, 'use adaptive thinking, not budget_tokens');
      if (s.body.tool_choice && /any|tool/.test(s.body.tool_choice.type)) err(P, 'forced tool_choice is rejected by current models; use auto');

      const runChecks = (body, opts) => {
        const { ctx, H } = PL.simulateCtx(s, Object.assign({ model: 'claude-opus-5-5' }, JSON.parse(JSON.stringify(body))), Object.assign({ memory }, opts));
        const failed = s.checks.filter((c) => !c.manual).filter((c) => { try { return !c.test(ctx, H); } catch (e) { return true; } }).map((c) => c.id);
        ctx.toolCalls.filter((x) => x.is_error && /Unknown tool/.test(x.output)).forEach((x) => err(P, 'sim calls unknown tool ' + x.name));
        return { ctx, failed };
      };
      let { ctx, failed } = runChecks(s.body, {});
      if (failed.length && (s.solution || s.redact)) ({ ctx, failed } = runChecks(s.solution || s.body, { redact: !!s.redact }));
      failed = failed.filter((id) => !(s.allowFail || []).includes(id));
      if (failed.length) err(P, 'simulated run fails its own checks: ' + failed.join(', '));
      if (ctx.final) memory[s.id] = { output_tokens: ctx.turns.reduce((a, x) => a + ((x.usage && x.usage.output_tokens) || 0), 0), ms: 1000, mode: 'sim' };
    }
  }
}

/* ---- programme-level rules ---- */
const everything = JSON.stringify(weeks.filter((w) => !onlyWeek || w.week === onlyWeek));
if (/\bITIL\b/i.test(everything)) err('content', 'ITIL is out of scope for this programme: remove every mention');
if (/AZ-?400/i.test(everything)) err('content', 'The Azure track is AZ-104: remove AZ-400 mentions');

console.log('Weeks: ' + weeks.length + ' · topics: ' + topicsN + ' · API steps: ' + apiSteps + ' · guide steps: ' + guideSteps);
if (warnings.length) console.log('\nWarnings:\n  ' + warnings.join('\n  '));
if (errors.length) { console.log('\nErrors (' + errors.length + '):\n  ' + errors.join('\n  ')); process.exit(1); }
console.log('\nAll checks passed ✓');
