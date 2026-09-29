/* Claude Learning · Claude Messages API client for the browser (raw fetch + SSE; no build step) */
(function () {
  'use strict';
  const PL = (window.PL = window.PL || {});
  const { store, clone } = PL.util;

  const API = 'https://api.anthropic.com/v1';
  const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
  // Models that accept server-side `fallbacks: "default"` on the Claude API.
  const FALLBACK_MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-fable-5-1', 'claude-opus-5'];

  PL.MODELS = [
    { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (default)' },
    { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  ];

  /* ---------- settings (key in sessionStorage unless the user opts into "remember") ---------- */
  const defaults = { model: 'claude-opus-5-5', effortOverride: '', fallback: true, remember: false };
  const settings = Object.assign({}, defaults, store.get('pl.settings', {}));
  settings.apiKey = store.get('pl.apiKey', '', 'session') || store.get('pl.apiKey', '') || '';

  PL.settings = {
    get: () => settings,
    save(patch) {
      Object.assign(settings, patch);
      const { apiKey, ...rest } = settings;
      store.set('pl.settings', rest);
      store.del('pl.apiKey');
      store.del('pl.apiKey', 'session');
      if (apiKey) store.set('pl.apiKey', apiKey, settings.remember ? undefined : 'session');
    },
    forgetKey() { settings.apiKey = ''; store.del('pl.apiKey'); store.del('pl.apiKey', 'session'); },
    isLive: () => /^sk-ant-/.test(settings.apiKey || ''),
  };

  /* ---------- request preparation ---------- */
  function walkStrings(obj, fn) {
    if (typeof obj === 'string') return fn(obj);
    if (Array.isArray(obj)) return obj.map((v) => walkStrings(v, fn));
    if (obj && typeof obj === 'object') {
      const out = {};
      for (const k of Object.keys(obj)) out[k] = walkStrings(obj[k], fn);
      return out;
    }
    return obj;
  }

  /**
   * prepare(body, {substitute, redact}) -> {body, headers, notes, redactions}
   * - fills {{PLACEHOLDERS}} with lab datasets
   * - optionally redacts PII from message content (never from system/tools)
   * - adapts the request to the selected model's API surface
   */
  PL.prepare = function (input, opts) {
    opts = opts || {};
    let body = clone(input);
    const notes = [];
    const betas = [];
    let redactions = 0;

    if (opts.substitute !== false) {
      const subs = PL.PLACEHOLDERS || {};
      body = walkStrings(body, (s) => s.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => (k in subs ? subs[k] : m)));
    }
    if (opts.redact && Array.isArray(body.messages)) {
      body.messages = walkStrings(body.messages, (s) => { const r = PL.pii.redact(s); redactions += r.count; return r.text; });
      notes.push('PII redaction applied locally before sending: ' + redactions + ' value(s) masked.');
    }

    if (!body.model) body.model = settings.model;
    const model = body.model;

    if (/haiku-4-5/.test(model)) {
      if (body.thinking && body.thinking.type === 'adaptive') {
        const budget = Math.max(1024, Math.min(4096, (body.max_tokens || 8000) - 1024));
        body.thinking = { type: 'enabled', budget_tokens: budget };
        if ((body.max_tokens || 0) <= budget) body.max_tokens = budget + 2048;
        notes.push('Haiku 4.5 uses fixed thinking budgets: converted adaptive thinking to budget_tokens=' + budget + '.');
      }
      if (body.output_config && body.output_config.effort) {
        delete body.output_config.effort;
        if (!Object.keys(body.output_config).length) delete body.output_config;
        notes.push('Haiku 4.5 does not support effort: removed output_config.effort.');
      }
    } else if (body.thinking && body.thinking.type === 'enabled') {
      body.thinking = { type: 'adaptive', display: 'summarized' };
      notes.push('budget_tokens is rejected on current models: switched to adaptive thinking.');
    }

    if (settings.fallback && FALLBACK_MODELS.includes(model) && body.fallbacks === undefined) {
      body.fallbacks = 'default';
      betas.push(FALLBACK_BETA);
      notes.push('Server-side refusal fallback enabled (fallbacks: "default"). Turn off in Settings.');
    } else if (body.fallbacks !== undefined) {
      betas.push(FALLBACK_BETA);
    }

    const headers = {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
    if (betas.length) headers['anthropic-beta'] = betas.join(',');
    return { body, headers, betas, notes, redactions };
  };

  /* Echo assistant content back exactly as the API shapes it (thinking blocks must be unchanged). */
  PL.sanitizeContent = function (content) {
    return (content || []).map((b) => {
      if (b.type === 'text') return b.citations && b.citations.length ? { type: 'text', text: b.text, citations: b.citations } : { type: 'text', text: b.text };
      if (b.type === 'thinking') return { type: 'thinking', thinking: b.thinking || '', signature: b.signature || '' };
      if (b.type === 'redacted_thinking') return { type: 'redacted_thinking', data: b.data };
      if (b.type === 'tool_use') return { type: 'tool_use', id: b.id, name: b.name, input: b.input || {} };
      const { _partial, ...rest } = b;
      return rest;
    });
  };

  /* ---------- errors ---------- */
  class ApiError extends Error {
    constructor(status, message, raw) { super(message); this.status = status; this.raw = raw; }
  }
  function explain(status, msg) {
    const hints = {
      400: 'Bad request: check the JSON body against the docs. ',
      401: 'Invalid API key: re-enter it in Settings. ',
      403: 'This key lacks permission for the request (workspace or model access). ',
      404: 'Model or endpoint not found: check the model id. ',
      413: 'Request too large. ',
      429: 'Rate limited: wait a moment and retry. ',
      500: 'Anthropic API error: retry shortly. ',
      529: 'API temporarily overloaded: retry shortly. ',
    };
    let h = hints[status] || '';
    if (status === 400 && /fallback/i.test(msg || '')) h += 'Tip: disable the refusal fallback in Settings. ';
    return h + (msg || '');
  }
  async function toApiError(res) {
    let raw = null;
    try { raw = await res.json(); } catch (e) { /* not json */ }
    const msg = raw && raw.error ? raw.error.message : res.statusText;
    return new ApiError(res.status, explain(res.status, msg), raw);
  }
  PL.ApiError = ApiError;

  /* ---------- streaming ---------- */
  PL.streamMessage = async function (body, headers, onUpdate, signal) {
    let res;
    try {
      res = await fetch(API + '/messages', {
        method: 'POST',
        headers: Object.assign({ 'x-api-key': settings.apiKey }, headers),
        body: JSON.stringify(Object.assign({}, body, { stream: true })),
        signal,
      });
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      throw new ApiError(0, 'Network error: could not reach api.anthropic.com (offline, blocked by a proxy/extension, or CSP).');
    }
    if (!res.ok) throw await toApiError(res);

    const msg = { content: [] };
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    const handle = (raw) => {
      let data = '';
      raw.split('\n').forEach((line) => { if (line.startsWith('data:')) data += line.slice(5).trim(); });
      if (!data) return;
      const ev = JSON.parse(data);
      const blk = msg.content[ev.index];
      switch (ev.type) {
        case 'message_start':
          Object.assign(msg, ev.message, { content: [] });
          break;
        case 'content_block_start':
          msg.content[ev.index] = Object.assign({}, ev.content_block);
          if (/tool_use$/.test(ev.content_block.type)) { msg.content[ev.index]._partial = ''; }
          break;
        case 'content_block_delta': {
          const d = ev.delta;
          if (d.type === 'text_delta') blk.text = (blk.text || '') + d.text;
          else if (d.type === 'thinking_delta') blk.thinking = (blk.thinking || '') + d.thinking;
          else if (d.type === 'signature_delta') blk.signature = (blk.signature || '') + d.signature;
          else if (d.type === 'input_json_delta') blk._partial += d.partial_json;
          else if (d.type === 'citations_delta') (blk.citations = blk.citations || []).push(d.citation);
          break;
        }
        case 'content_block_stop':
          if (blk && blk._partial !== undefined) {
            try { blk.input = blk._partial ? JSON.parse(blk._partial) : {}; } catch (e) { blk.input = {}; blk._invalid = true; }
            delete blk._partial;
          }
          break;
        case 'message_delta':
          Object.assign(msg, ev.delta);
          msg.usage = Object.assign({}, msg.usage, ev.usage);
          break;
        case 'error':
          throw new ApiError(529, explain(529, ev.error && ev.error.message));
        default:
          break;
      }
      onUpdate(msg);
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      let idx;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const raw = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        handle(raw);
      }
    }
    if (buf.trim()) handle(buf);
    return msg;
  };

  /* Replays a canned message with a streaming effect (simulated mode). */
  PL.simulateMessage = async function (turn, onUpdate, signal) {
    const fast = PL.simFast || /[?&]fast\b/.test(location.search);
    const sleep = (ms) => fast ? Promise.resolve() : new Promise((r, j) => {
      const t = setTimeout(r, ms);
      if (signal) signal.addEventListener('abort', () => { clearTimeout(t); j(new DOMException('Aborted', 'AbortError')); }, { once: true });
    });
    const msg = { id: 'msg_sim_' + Math.random().toString(36).slice(2, 10), type: 'message', role: 'assistant', model: settings.model, simulated: true, content: [], stop_reason: null, usage: { input_tokens: 0, output_tokens: 0 } };
    await sleep(250);
    for (const src of turn.content) {
      if (src.type === 'text' || src.type === 'thinking') {
        const key = src.type === 'text' ? 'text' : 'thinking';
        const blk = Object.assign({}, src, { [key]: '' });
        msg.content.push(blk);
        const words = src[key].split(/(\s+)/);
        const step = Math.max(2, Math.ceil(words.length / 60));
        for (let i = 0; i < words.length; i += step) {
          blk[key] += words.slice(i, i + step).join('');
          onUpdate(msg);
          await sleep(18);
        }
      } else {
        msg.content.push(clone(src));
        onUpdate(msg);
        await sleep(180);
      }
    }
    msg.stop_reason = turn.stop_reason || 'end_turn';
    if (turn.stop_details) msg.stop_details = turn.stop_details;
    msg.usage = Object.assign({ input_tokens: 0, output_tokens: 0 }, turn.usage);
    onUpdate(msg);
    return msg;
  };

  /* Free, fast key check: retrieve the selected model. */
  PL.testConnection = async function () {
    let res;
    try {
      res = await fetch(API + '/models/' + encodeURIComponent(settings.model), {
        headers: { 'x-api-key': settings.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      });
    } catch (e) {
      throw new ApiError(0, 'Network error: could not reach api.anthropic.com.');
    }
    if (!res.ok) throw await toApiError(res);
    return res.json();
  };

  /* ---------- code snippets for the Code tabs ---------- */
  PL.snippets = function (prep) {
    const json = JSON.stringify(prep.body, null, 2);
    const beta = prep.betas.length ? prep.betas : null;
    const curl = [
      'curl https://api.anthropic.com/v1/messages \\',
      '  -H "x-api-key: $ANTHROPIC_API_KEY" \\',
      '  -H "anthropic-version: 2023-06-01" \\',
      beta ? '  -H "anthropic-beta: ' + beta.join(',') + '" \\' : null,
      '  -H "content-type: application/json" \\',
      "  -d @- <<'EOF'",
      json,
      'EOF',
    ].filter((l) => l !== null).join('\n');
    const py = [
      'import json',
      'import anthropic',
      '',
      'client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from the environment',
      '',
      "body = json.loads(r'''" + json + "''')",
      '',
      beta
        ? 'with client.beta.messages.stream(betas=' + JSON.stringify(beta) + ', **body) as stream:'
        : 'with client.messages.stream(**body) as stream:',
      '    message = stream.get_final_message()',
      '',
      'if message.stop_reason == "refusal":',
      '    print("Refused:", message.stop_details)',
      'for block in message.content:',
      '    if block.type == "text":',
      '        print(block.text)',
      '    elif block.type == "tool_use":',
      '        print("tool call:", block.name, block.input)',
    ].join('\n');
    const ts = [
      'import Anthropic from "@anthropic-ai/sdk";',
      '',
      'const client = new Anthropic(); // reads ANTHROPIC_API_KEY',
      '',
      'const body = ' + json + ';',
      '',
      beta
        ? 'const stream = client.beta.messages.stream({ ...body, betas: ' + JSON.stringify(beta) + ' });'
        : 'const stream = client.messages.stream(body);',
      'const message = await stream.finalMessage();',
      '',
      'if (message.stop_reason === "refusal") console.warn("Refused:", message.stop_details);',
      'for (const block of message.content) {',
      '  if (block.type === "text") console.log(block.text);',
      '  if (block.type === "tool_use") console.log("tool call:", block.name, block.input);',
      '}',
    ].join('\n');
    return { curl, python: py, typescript: ts };
  };
})();
