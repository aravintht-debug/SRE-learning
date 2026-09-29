/* SRE Learning · site config. */
window.PL = window.PL || {};
window.PL.SITE = {
  owner: 'aravintht-debug',
  repo: 'claude-learning',
  /* Optional login + progress sync (see SETUP-LOGIN.md). Leave empty to disable.
     The anon key is public by design; the database is protected by row-level security. */
  supabase: {
    url: '',      // e.g. https://abcdefghijkl.supabase.co
    anonKey: '',  // Project Settings → API → anon public key
  },
};
