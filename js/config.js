/* SRE Learning · site config. */
window.PL = window.PL || {};
window.PL.SITE = {
  owner: 'aravintht-debug',
  repo: 'SRE-learning', // GitHub Pages paths are case-sensitive: /SRE-learning/
  siteUrl: 'https://aravintht-debug.github.io/SRE-learning/',
  /* Optional login + progress sync (see SETUP-LOGIN.md). Leave empty to disable.
     The anon key is public by design; the database is protected by row-level security. */
  allowedEmailDomain: 'swiftant.com', // only this domain can sign up (also enforced in the database)
  selfSignup: false, // invite-only: the site owner creates accounts in Supabase (turn "Allow new users to sign up" off there too)
  supabase: {
    url: 'https://izxrorgvdwrljfsopiza.supabase.co',
    anonKey: 'sb_publishable_EjbxpMT-3gdSWfRMwf4g-A_l46Wa8H2', // publishable key: safe in a browser (RLS protects the data)
  },
};
