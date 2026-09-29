/* SRE Learning · shared utilities (no dependencies) */
(function () {
  'use strict';
  const PL = (window.PL = window.PL || {});

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);

  // Storage can throw (private mode, blocked site data) — never let it break the app.
  const area = (name) => (name === 'session' ? window.sessionStorage : window.localStorage);
  const store = {
    get(key, fallback, where) {
      try {
        const v = area(where).getItem(key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(key, val, where) {
      try { area(where).setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ }
    },
    del(key, where) {
      try { area(where).removeItem(key); } catch (e) { /* ignore */ }
    },
  };

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  let toastTimer = null;
  function toast(msg, kind) {
    const el = document.getElementById('toast');
    if (!el) return;
    const color = kind === 'error' ? 'border-red-500/60 text-red-200' : kind === 'ok' ? 'border-emerald-500/60 text-emerald-200' : 'border-brand-500/60 text-slate-100';
    el.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-lg bg-ink-800 border shadow-2xl text-sm max-w-[90vw] ' + color;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
  }

  /* Minimal, safe Markdown renderer for model output: input is escaped first,
     then a small subset (headings, lists, code, tables, bold/italic) is re-enabled. */
  function inline(s) {
    return s
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>');
  }
  function md(src) {
    const lines = esc(src || '').split('\n');
    const out = [];
    let para = [], list = null, table = null, code = null;
    const flushPara = () => { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } };
    const flushList = () => {
      if (list) { out.push('<' + list.t + '>' + list.items.map((i) => '<li>' + inline(i) + '</li>').join('') + '</' + list.t + '>'); list = null; }
    };
    const flushTable = () => {
      if (!table) return;
      const rows = table.filter((r) => !/^\|?\s*:?-{2,}/.test(r));
      const cells = (r) => r.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((c) => inline(c.trim()));
      const [head, ...body] = rows;
      out.push('<div class="overflow-x-auto"><table><thead><tr>' + cells(head).map((c) => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' +
        body.map((r) => '<tr>' + cells(r).map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
      table = null;
    };
    const flushAll = () => { flushPara(); flushList(); flushTable(); };
    for (const line of lines) {
      if (/^\s*```/.test(line)) {
        if (code) { out.push('<pre><code>' + code.join('\n') + '</code></pre>'); code = null; } else { flushAll(); code = []; }
        continue;
      }
      if (code) { code.push(line); continue; }
      let m;
      if (!line.trim()) { flushAll(); continue; }
      if (/^\s*\|/.test(line)) { flushPara(); flushList(); (table = table || []).push(line.trim()); continue; }
      flushTable();
      if ((m = line.match(/^(#{1,4})\s+(.*)/))) { flushPara(); flushList(); const n = Math.min(m[1].length + 2, 6); out.push('<h' + n + '>' + inline(m[2]) + '</h' + n + '>'); continue; }
      if ((m = line.match(/^\s*[-*]\s+(.*)/))) { flushPara(); if (!list || list.t !== 'ul') { flushList(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); continue; }
      if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) { flushPara(); if (!list || list.t !== 'ol') { flushList(); list = { t: 'ol', items: [] }; } list.items.push(m[1]); continue; }
      flushList();
      para.push(line.trim());
    }
    if (code) out.push('<pre><code>' + code.join('\n') + '</code></pre>');
    flushAll();
    return out.join('');
  }

  const fmtNum = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : String(n));

  PL.util = {
    esc, store, copyText, toast, md, fmtNum,
    $: (s, r) => (r || document).querySelector(s),
    $$: (s, r) => Array.from((r || document).querySelectorAll(s)),
    clone: (o) => JSON.parse(JSON.stringify(o)),
  };
})();
