/* SRE Learning · site config. */
window.PL = window.PL || {};
window.PL.SITE = {
  owner: 'aravintht-debug',
  repo: 'claude-learning',
  /* Optional login + progress sync (see SETUP-LOGIN.md). Leave empty to disable.
     The anon key is public by design; the database is protected by row-level security. */
  allowedEmailDomain: 'swiftant.com', // only this domain can sign up (also enforced in the database)
  supabase: {
    url: 'https://izxrorgvdwrljfsopiza.supabase.co',
    anonKey: 'sb_publishable_EjbxpMT-3gdSWfRMwf4g-A_l46Wa8H2', // publishable key: safe in a browser (RLS protects the data)
  },
};
