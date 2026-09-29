/* SRE Learning · the 20-week Site Reliability Engineer programme registry.
   Week files call PL.addWeek({...}); topics can be appended to a week with PL.addTopic(week, topic). */
(function () {
  'use strict';
  const PL = (window.PL = window.PL || {});

  PL.STREAMS = {
    prompting: { label: 'Prompting', color: '#4b76ff' },
    rootcause: { label: 'Root cause', color: '#f59e0b' },
    role: { label: 'Role-critical', color: '#10b981' },
    agent: { label: 'Agentification', color: '#a78bfa' },
    adoption: { label: 'Adoption', color: '#f472b6' },
  };

  PL.PROGRAM = { weeks: [] };
  const pending = {};

  PL.addWeek = function (w) {
    w.topics = (w.topics || []).concat(pending[w.week] || []);
    delete pending[w.week];
    PL.PROGRAM.weeks.push(w);
    PL.PROGRAM.weeks.sort((a, b) => a.week - b.week);
  };
  PL.addTopic = function (week, topic) {
    const w = PL.PROGRAM.weeks.find((x) => x.week === week);
    if (w) w.topics.push(topic); else (pending[week] = pending[week] || []).push(topic);
  };

  /* Shared request/schema builders for week files. */
  PL.B = {
    ADAPTIVE: { type: 'adaptive', display: 'summarized' },
    user: (content) => [{ role: 'user', content }],
    L: (...a) => a.join('\n'),
    obj: (properties, required) => ({ type: 'object', properties, required: required || Object.keys(properties), additionalProperties: false }),
    arr: (items) => ({ type: 'array', items }),
    en: (...v) => ({ type: 'string', enum: v }),
    S: { type: 'string' }, N: { type: 'number' }, B: { type: 'boolean' }, I: { type: 'integer' },
    jsonFormat: (schema) => ({ type: 'json_schema', schema }),
    textTurn: (text, usage) => ({ content: [{ type: 'text', text }], stop_reason: 'end_turn', usage: usage || { input_tokens: 500, output_tokens: 400 } }),
    jsonTurn: (o, usage) => ({ content: [{ type: 'text', text: JSON.stringify(o, null, 2) }], stop_reason: 'end_turn', usage: usage || { input_tokens: 500, output_tokens: 400 } }),
    think: (t) => ({ type: 'thinking', thinking: t, signature: 'sim' }),
  };
})();
