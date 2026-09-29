# Turn on login + synced progress (Supabase, free)

The site works without login: progress is saved per browser. Follow these steps (about 15 minutes) to give invited users a sign-in link and progress that syncs across devices, with a **Team progress** panel on the dashboard.

- Sign-in uses an email one-time link, so there are no passwords.
- Only people you **invite** can sign in.
- Claude API keys are never synced; they stay in each person's browser.

## 1. Create the project (you)
1. Go to https://supabase.com and sign in (for example with GitHub). Create a **New project** on the free plan, and pick a region near you. Supabase asks for a database password: keep it in your password manager. The site never uses it.
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.

## 2. Configure sign-in
1. **Authentication → URL Configuration**
   - Site URL: `https://aravintht-debug.github.io/claude-learning/`
   - Redirect URLs: add `https://aravintht-debug.github.io/claude-learning/` (and `http://localhost:8080/` if you test locally)
2. **Authentication → Sign In / Providers → Email**: keep it enabled.
3. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up". Only invited users can then get in.
4. **Authentication → Users → Invite user**: invite yourself and your colleague by email.

Note: the free plan's built-in email sender is rate-limited and intended for small teams. For more users, add your own SMTP under Authentication → Emails.

## 3. Connect the site
1. Go to **Project Settings → API** and copy the **Project URL** and the **anon public** key. Never use the `service_role` key in the site.
2. Put them in `js/config.js`:
   ```js
   supabase: {
     url: 'https://YOUR-PROJECT.supabase.co',
     anonKey: 'eyJhbGciOi...',
   },
   ```
3. Commit and push. GitHub Pages redeploys in about a minute.

## How it works
- A **Sign in** button appears in the header. The user enters their email, clicks the link in their inbox (in the same browser), and is signed in.
- On sign-in, local and cloud progress are **merged** (nothing is lost), and every later change syncs automatically.
- The table has row-level security: every signed-in member can *read* the team's progress, but each person can only *write* their own row.
- To remove someone, delete them under Authentication → Users. Their progress row is deleted with them.
