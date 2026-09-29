/* SRE Learning · optional login + progress sync (Supabase Auth + one table with row-level security).
   Disabled until PL.SITE.supabase.url and .anonKey are set in js/config.js. The anon key is public by design:
   access is enforced by the RLS policies in supabase/schema.sql. Claude API keys are never synced. */
(function () {
  'use strict';
  const PL = window.PL;
  const cfg = (PL.SITE && PL.SITE.supabase) || {};
  const enabled = !!(cfg.url && cfg.anonKey && window.supabase && window.supabase.createClient);
  let client = null, user = null, pushTimer = null, onUser = () => {};

  const union = (a, b) => Object.assign({}, b || {}, a || {});
  function merge(local, remote) {
    local = local || {}; remote = remote || {};
    const steps = union(remote.steps, local.steps);
    Object.keys(steps).forEach((k) => { if (remote.steps && local.steps && remote.steps[k] && local.steps[k]) steps[k] = Math.min(remote.steps[k], local.steps[k]); });
    return { steps, manual: union(remote.manual, local.manual), quiz: union(remote.quiz, local.quiz), seen: union(remote.seen, local.seen) };
  }

  async function pull(getLocal, apply) {
    if (!client || !user) return;
    const { data, error } = await client.from('progress').select('data').eq('user_id', user.id).maybeSingle();
    if (error) { console.warn('progress pull failed', error.message); return; }
    const merged = merge(getLocal(), data && data.data);
    apply(merged);
    push(merged, true);
  }

  function push(progress, now) {
    if (!client || !user) return;
    clearTimeout(pushTimer);
    const send = async () => {
      const { error } = await client.from('progress').upsert({ user_id: user.id, email: user.email, data: progress, updated_at: new Date().toISOString() });
      if (error) console.warn('progress push failed', error.message);
    };
    if (now) send(); else pushTimer = setTimeout(send, 800);
  }

  async function init(getLocal, apply, userChanged) {
    onUser = userChanged || onUser;
    if (!enabled) return;
    client = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } });
    // Invite / confirmation links arrive as #access_token=…&refresh_token=… (implicit flow); adopt them, then clean the URL.
    const hp = new URLSearchParams(location.hash.replace(/^#\/?/, ''));
    if (hp.get('access_token') && hp.get('refresh_token')) {
      await client.auth.setSession({ access_token: hp.get('access_token'), refresh_token: hp.get('refresh_token') });
      history.replaceState(null, '', location.pathname + '#/');
    }
    const { data } = await client.auth.getSession();
    user = data.session ? data.session.user : null;
    if (/[?&]code=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);
    onUser(user);
    client.auth.onAuthStateChange((event, session) => {
      const was = user && user.id;
      user = session ? session.user : null;
      onUser(user);
      if (user && user.id !== was) pull(getLocal, apply);
    });
    if (user) await pull(getLocal, apply);
  }

  async function signIn(email) {
    if (!client) throw new Error('Login is not configured on this site.');
    const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: false } });
    if (error) throw new Error(/signups not allowed|not found|Signups/i.test(error.message) ? 'This email has not been invited. Ask the site owner to invite you.' : error.message);
  }
  async function signOut() { if (client) await client.auth.signOut(); user = null; onUser(null); }

  async function team() {
    if (!client || !user) return [];
    const { data, error } = await client.from('progress').select('email,data,updated_at').order('updated_at', { ascending: false });
    if (error) { console.warn('team fetch failed', error.message); return []; }
    return data || [];
  }

  PL.sync = { enabled, init, push, signIn, signOut, team, merge, user: () => user };
})();
