/* SRE Learning · check helpers shared by the browser app and tests/validate.js.
   Every auto check is `test(ctx, h)` where ctx = {requestBody, sentBody, turns, toolCalls, final}. */
(function () {
  'use strict';
  const PL = (window.PL = window.PL || {});

  const textOf = (m) => ((m && m.content) || []).filter((b) => b.type === 'text').map((b) => b.text || '').join('');

  PL.makeHelpers = function (memory) {
    const H = {
      text: (c) => textOf(c.final),
      all: (c) => c.turns.map(textOf).join('\n'),
      json(c) {
        if (c._json !== undefined) return c._json;
        const t = textOf(c.final).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
        try { c._json = JSON.parse(t); } catch (e) { c._json = null; }
        return c._json;
      },
      nums: (s) => (String(s).match(/-?\d[\d,]*\.?\d*/g) || []).map((x) => parseFloat(x.replace(/,/g, ''))).filter((n) => !isNaN(n)),
      near: (s, target, tol) => H.nums(s).some((n) => Math.abs(n - target) <= tol),
      has: (c, re) => re.test(textOf(c.final)),
      calls: (c, name) => c.toolCalls.filter((x) => x.name === name),
      thinking: (c) => c.turns.some((t) => t.content.some((b) => b.type === 'thinking' || b.type === 'redacted_thinking')),
      cited: (c) => c.turns.some((t) => t.content.some((b) => b.type === 'text' && Array.isArray(b.citations) && b.citations.length)),
      sentTool: (c, name) => (c.sentBody.tools || []).find((t) => t.name === name),
      memory: (id) => memory[id],
      sev(c, id) { const j = H.json(c); const x = j && (j.classifications || []).find((k) => k.id === id); return x && x.severity; },
      piiSent: (c, type) => PL.pii.detect(JSON.stringify(c.sentBody.messages)).some((p) => p.type === type),
      route(c, id) { const j = H.json(c); const x = j && (j.routes || []).find((k) => k.id === id); return x && x.category; },
      label(c, id) { const j = H.json(c); const x = j && (j.results || []).find((k) => k.id === id); return x && x.sentiment; },
      findingMatches(c, re) { const j = H.json(c); return !!j && (j.findings || []).some((f) => re.test([f.command, f.risk, f.safer_alternative].join(' '))); },
      /* Markdown section present, e.g. h.section(c, 'Rollback') matches "## Rollback" */
      section: (c, name) => new RegExp('^#{1,4}\\s*' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'im').test(textOf(c.final)),
    };
    return H;
  };

  /* Build a finished ctx from simulated turns, running local tools exactly like the browser loop. */
  PL.simulateCtx = function (step, body, opts) {
    const prep = PL.prepare(body, { redact: !!(opts && opts.redact) });
    const ctx = { requestBody: body, sentBody: prep.body, notes: prep.notes, turns: [], toolCalls: [], timeline: [], mode: 'sim' };
    const H = PL.makeHelpers((opts && opts.memory) || {});
    const turns = (typeof step.sim === 'function' ? step.sim(ctx, H) : step.sim) || [];
    for (const t of turns) {
      const msg = JSON.parse(JSON.stringify(t));
      ctx.turns.push(msg);
      if (msg.stop_reason === 'tool_use') {
        msg.content.filter((b) => b.type === 'tool_use').forEach((u) => {
          const r = PL.runTool(u.name, u.input);
          ctx.toolCalls.push({ id: u.id, name: u.name, input: u.input || {}, output: r.content, is_error: !!r.is_error });
        });
      }
    }
    ctx.final = ctx.turns[ctx.turns.length - 1];
    return { ctx, H };
  };
})();
