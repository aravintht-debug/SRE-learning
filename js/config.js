/* SRE Learning · site config. */
window.PL = window.PL || {};
window.PL.SITE = {
  owner: 'SRE-Learning', // GitHub organization
  repo: 'sre-learning.github.io', // an <org>.github.io repo is served from the root of that domain
  siteUrl: 'https://sre-learning.github.io/',
  /* Optional login + progress sync (see SETUP-LOGIN.md). Leave empty to disable.
     The anon key is public by design; the database is protected by row-level security. */
  allowedEmailDomain: 'swiftant.com', // only this domain can sign up (also enforced in the database)
  supabase: {
    url: 'https://izxrorgvdwrljfsopiza.supabase.co',
    anonKey: 'sb_publishable_EjbxpMT-3gdSWfRMwf4g-A_l46Wa8H2', // publishable key: safe in a browser (RLS protects the data)
  },
};
