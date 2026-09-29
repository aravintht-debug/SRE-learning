/* Claude Learning · local tool implementations (run in the browser, live or simulated) + PII redactor */
(function () {
  'use strict';
  const PL = (window.PL = window.PL || {});

  /* Safe arithmetic: recursive-descent parser, no eval. Supports + - * / % ^ and parentheses. */
  function evaluate(src) {
    const s = String(src).replace(/,/g, '').replace(/\s+/g, '');
    let i = 0;
    const peek = () => s[i];
    function num() {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
      if (!m) throw new Error('Unexpected token at position ' + i + (s[i] ? ' ("' + s[i] + '")' : ''));
      i += m[0].length;
      return parseFloat(m[0]);
    }
    function factor() {
      const c = peek();
      if (c === '(') { i++; const v = expr(); if (peek() !== ')') throw new Error('Missing closing parenthesis'); i++; return v; }
      if (c === '-') { i++; return -factor(); }
      if (c === '+') { i++; return factor(); }
      return num();
    }
    function power() { const b = factor(); if (peek() === '^') { i++; return Math.pow(b, power()); } return b; }
    function term() {
      let v = power();
      for (;;) {
        const c = peek();
        if (c === '*') { i++; v *= power(); }
        else if (c === '/') { i++; const d = power(); if (d === 0) throw new Error('Division by zero'); v /= d; }
        else if (c === '%') { i++; v %= power(); }
        else return v;
      }
    }
    function expr() {
      let v = term();
      for (;;) {
        const c = peek();
        if (c === '+') { i++; v += term(); } else if (c === '-') { i++; v -= term(); } else return v;
      }
    }
    const v = expr();
    if (i < s.length) throw new Error('Unexpected "' + s[i] + '" at position ' + i);
    if (!isFinite(v)) throw new Error('Result is not a finite number');
    return v;
  }

  // Fixed demo FX table: units of each currency per 1 USD (not live rates).
  const RATES = { USD: 1, EUR: 0.86, GBP: 0.74, INR: 88.0, JPY: 147.0, AUD: 1.52 };
  const r2 = (n) => Math.round(n * 100) / 100;

  PL.tools = {
    calculator({ expression, round_to }) {
      if (typeof expression !== 'string' || !expression.trim()) throw new Error('expression must be a non-empty string');
      let result = evaluate(expression);
      if (Number.isInteger(round_to)) result = Number(result.toFixed(Math.max(0, Math.min(10, round_to))));
      return { expression, result };
    },
    convert_currency({ amount, from, to }) {
      if (typeof amount !== 'number' || !isFinite(amount)) throw new Error('amount must be a number');
      if (!RATES[from] || !RATES[to]) throw new Error('Supported currencies: ' + Object.keys(RATES).join(', '));
      const rate = RATES[to] / RATES[from];
      return { amount, from, to, rate: Number(rate.toFixed(6)), converted: r2(amount * rate), note: 'Fixed lab rates, not live FX data' };
    },
    get_order_status({ order_id }) {
      const o = PL.ORDERS[String(order_id || '').toUpperCase()];
      if (!o) throw new Error('No order found with id "' + order_id + '". Order ids look like A-1001.');
      return o;
    },
    /* Module 6: read-only mock AKS cluster + a guarded write tool */
    kubectl_get({ resource, namespace }) {
      const C = PL.CLUSTER, ns = namespace || C.namespace;
      if (ns !== C.namespace) return { namespace: ns, items: [], note: 'No resources found. Known namespace: ' + C.namespace };
      const map = { deployments: C.deployments, pods: C.pods, nodes: C.nodes, events: C.events };
      if (!map[resource]) throw new Error('Unsupported resource "' + resource + '". Use one of: ' + Object.keys(map).join(', '));
      return { resource, namespace: ns, items: map[resource] };
    },
    get_metrics({ target }) {
      const m = PL.CLUSTER.metrics[target];
      if (!m) return { target, error: 'No metrics for "' + target + '". Available: ' + Object.keys(PL.CLUSTER.metrics).join(', ') };
      return Object.assign({ target, window: '5m avg' }, m);
    },
    scale_deployment({ deployment, namespace, replicas }) {
      const d = PL.CLUSTER.deployments.find((x) => x.name === deployment);
      if (!d) throw new Error('deployment "' + deployment + '" not found');
      if (!Number.isInteger(replicas) || replicas < 1) throw new Error('replicas must be a positive integer');
      if (replicas > 10) throw new Error('GUARDRAIL: more than 10 replicas requires a change request. Request denied.');
      return { deployment, namespace: namespace || 'shop', previous_replicas: d.replicas, replicas, status: 'scaled (simulated; no real cluster touched)' };
    },
  };

  PL.runTool = function (name, input) {
    const fn = PL.tools[name];
    if (!fn) return { is_error: true, content: 'Unknown tool "' + name + '". This lab implements: ' + Object.keys(PL.tools).join(', ') };
    try {
      return { content: JSON.stringify(fn(input || {})) };
    } catch (e) {
      return { is_error: true, content: 'Error: ' + e.message };
    }
  };

  /* PII detection/redaction — regex catches structured identifiers, NOT names (that needs NER). */
  const PII = [
    { type: 'EMAIL', re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
    { type: 'CARD', re: /\b\d(?:[ -]?\d){12,15}\b/g },
    { type: 'PHONE', re: /(?<![\w.])(?:\+\d{1,3}[ .-]?)?\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b/g },
    { type: 'SSN', re: /\b\d{3}-\d{2}-\d{4}\b/g },
    { type: 'IPV4', re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
  ];
  PL.pii = {
    detect(text) {
      const found = [];
      PII.forEach((p) => { (String(text).match(p.re) || []).forEach((m) => found.push({ type: p.type, match: m })); });
      return found;
    },
    redact(text) {
      let out = String(text), count = 0;
      const seen = {};
      PII.forEach((p) => {
        out = out.replace(p.re, (m) => {
          count++;
          const key = p.type + ':' + m;
          if (!seen[key]) seen[key] = '[' + p.type + '_' + (Object.keys(seen).filter((k) => k.startsWith(p.type + ':')).length + 1) + ']';
          return seen[key];
        });
      });
      return { text: out, count };
    },
  };

  PL.evaluateExpression = evaluate;
})();
