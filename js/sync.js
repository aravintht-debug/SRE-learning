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

  /* Email links (confirm sign-up, reset password) come back as <siteUrl>?confirmed=1&code=… or ?reset=1&code=… (PKCE).
     The query string never clashes with the #/ router. */
  const home = () => (PL.SITE && PL.SITE.siteUrl) || (location.origin + location.pathname);
  const readLink = () => {
    const q = new URLSearchParams(location.search), h = new URLSearchParams(location.hash.replace(/^#/, ''));
    const error = q.get('error_description') || h.get('error_description');
    return { code: q.has('code'), confirmed: q.has('confirmed'), reset: q.has('reset'), error: error ? error.replace(/\+/g, ' ') : '' };
  };
  const cleanUrl = () => { if (location.search || /error_description|access_token/.test(location.hash)) history.replaceState(null, '', location.pathname + (/^#\//.test(location.hash) ? location.hash : '')); };

  async function init(localGetter, applyMerged, userChanged) {
    getLocal = localGetter; apply = applyMerged; onUser = userChanged || onUser;
    if (!enabled) return;
    const linkState = readLink(); // before the client consumes ?code=
    client = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
    let recovery = false;
    client.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') recovery = true; }); // registered before the URL is processed
    const { data } = await client.auth.getSession();
    user = data.session ? data.session.user : null;
    /* tell the UI what the email link did */
    if (linkState.error) PL.sync.notice = { kind: 'error', text: 'That email link did not work: ' + linkState.error + '. Request a new one below.' };
    else if (user && (recovery || linkState.reset)) PL.sync.notice = { kind: 'reset' };
    else if (user && linkState.confirmed) PL.sync.notice = { kind: 'ok', text: 'Email confirmed. Welcome to SRE Learning.' };
    else if (!user && linkState.code) PL.sync.notice = { kind: 'info', text: linkState.reset ? 'Open the reset link in the same browser where you asked for it, or request a new one.' : 'Your email is confirmed. Sign in with your password.' };
    cleanUrl();
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
    if (/database error saving new user|only @|allowlist/i.test(msg)) return 'This email cannot sign up yet. Use your @' + (domain || 'company') + ' address, and ask the site owner to add you to the SRE Learning allowlist.';
    if (/signups not allowed|signup is disabled/i.test(msg)) return 'Sign-up is currently closed. Ask the site owner.';
    if (/password should be|weak password|at least/i.test(msg)) return 'Choose a stronger password: at least 8 characters with letters and numbers.';
    if (/email not confirmed/i.test(msg)) return 'Confirm your email first: click the link we sent to your inbox (check Junk too). Use "Resend email" if it has not arrived.';
    if (/rate limit|too many/i.test(msg)) return 'Too many emails were requested. Wait a few minutes and try again.';
    if (/error sending|not authorized|smtp/i.test(msg)) return 'The site could not send the email right now. Ask the site owner.';
    return msg;
  };

  async function signIn(email, password) {
    checkEmail(email);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) { const e = new Error(friendly(error.message)); e.unconfirmed = /email not confirmed/i.test(error.message); throw e; }
  }
  /* Returns 'signed-in' (email confirmation off) or 'check-inbox' (confirmation on: the account works after the link is clicked). */
  async function signUp(email, password) {
    checkEmail(email);
    if ((password || '').length < 8) throw new Error('Password must be at least 8 characters.');
    const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: home() + '?confirmed=1' } });
    if (error) throw new Error(friendly(error.message));
    if (data.session) return 'signed-in';
    // With confirmation on, Supabase hides whether the address is taken: an existing account comes back with no identities.
    if (data.user && Array.isArray(data.user.identities) && !data.user.identities.length) throw new Error('An account with this email already exists. Use Sign in, or Forgot password.');
    return 'check-inbox';
  }
  async function resendConfirmation(email) {
    checkEmail(email);
    const { error } = await client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: home() + '?confirmed=1' } });
    if (error) throw new Error(friendly(error.message));
  }
  async function resetPassword(email) {
    checkEmail(email);
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: home() + '?reset=1' });
    if (error) throw new Error(friendly(error.message));
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

  PL.sync = { enabled, domain, init, push, signIn, signUp, resendConfirmation, resetPassword, signOut, changePassword, team, merge, user: () => user, notice: null };
})();
