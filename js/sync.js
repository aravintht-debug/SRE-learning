/* SRE Learning · login (email + password, company domain only) and progress sync, using Supabase.
   Enabled when PL.SITE.supabase.url and .anonKey are set in js/config.js. The publishable key is public by design:
   access is enforced in the database (row-level security + a trigger that only allows the company email domain).
   Claude API keys are never synced. */
(function () {
  'use strict';
  const PL = window.PL;
  const { store } = PL.util;
  const cfg = (PL.SITE && PL.SITE.supabase) || {};
  const domain = ((PL.SITE && PL.SITE.allowedEmailDomain) || '').toLowerCase();
  const enabled = !!(cfg.url && cfg.anonKey && window.supabase && window.supabase.createClient);
  let client = null, user = null, pushTimer = null, onUser = () => {}, getLocal = () => ({}), apply = () => {};

  const union = (a, b) => Object.assign({}, b || {}, a || {});
  function merge(local, remote) {
    local = local || {}; remote = remote || {};
    const steps = union(remote.steps, local.steps);
    Object.keys(steps).forEach((k) => { if (remote.steps && local.steps && remote.steps[k] && local.steps[k]) steps[k] = Math.min(remote.steps[k], local.steps[k]); });
    return { steps, manual: union(remote.manual, local.manual), quiz: union(remote.quiz, local.quiz), seen: union(remote.seen, local.seen) };
  }

  async function pull() {
    if (!client || !user) return;
    // Progress saved in this browser belongs to whoever last signed in here: never merge it into a different account.
    const owner = store.get('pl.owner', null);
    const local = !owner || owner === user.id ? getLocal() : {};
    store.set('pl.owner', user.id);
    const { data, error } = await client.from('progress').select('data').eq('user_id', user.id).maybeSingle();
    if (error) { console.warn('progress pull failed', error.message); return; }
    const merged = merge(local, data && data.data);
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

  async function init(localGetter, applyMerged, userChanged) {
    getLocal = localGetter; apply = applyMerged; onUser = userChanged || onUser;
    if (!enabled) return;
    client = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    const { data } = await client.auth.getSession();
    user = data.session ? data.session.user : null;
    onUser(user);
    client.auth.onAuthStateChange((event, session) => {
      const was = user && user.id;
      user = session ? session.user : null;
      if ((user && user.id) !== was) { onUser(user); if (user) pull(); }
    });
    if (user) await pull();
  }

  const checkEmail = (email) => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Enter a valid email address.');
    if (domain && !email.toLowerCase().endsWith('@' + domain)) throw new Error('Use your @' + domain + ' email address.');
  };
  const friendly = (msg) => {
    if (/invalid login credentials/i.test(msg)) return 'Wrong email or password.';
    if (/already registered|already been registered|already exists/i.test(msg)) return 'An account with this email already exists. Use Sign in.';
    if (/database error saving new user|only @/i.test(msg)) return 'Only @' + (domain || 'company') + ' email addresses can sign up.';
    if (/signups not allowed|signup is disabled/i.test(msg)) return 'Sign-up is currently closed. Ask the site owner.';
    if (/password should be|weak password|at least/i.test(msg)) return 'Choose a stronger password: at least 8 characters with letters and numbers.';
    return msg;
  };

  async function signIn(email, password) {
    checkEmail(email);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendly(error.message));
  }
  async function signUp(email, password) {
    checkEmail(email);
    if ((password || '').length < 8) throw new Error('Password must be at least 8 characters.');
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw new Error(friendly(error.message));
    if (!data.session) throw new Error('Account created, but email confirmation is required. Ask the site owner to turn off "Confirm email" in Supabase, or confirm from your inbox.');
  }
  async function changePassword(password) {
    if ((password || '').length < 8) throw new Error('Password must be at least 8 characters.');
    const { error } = await client.auth.updateUser({ password });
    if (error) throw new Error(friendly(error.message));
  }
  async function signOut() {
    if (client) await client.auth.signOut();
    user = null;
    apply({ steps: {}, manual: {}, quiz: {}, seen: {} });
    onUser(null);
  }

  async function team() {
    if (!client || !user) return [];
    const { data, error } = await client.from('progress').select('email,data,updated_at').order('updated_at', { ascending: false });
    if (error) { console.warn('team fetch failed', error.message); return []; }
    return data || [];
  }

  PL.sync = { enabled, domain, init, push, signIn, signUp, signOut, changePassword, team, merge, user: () => user };
})();
