# Login + synced progress (Supabase, free)

> **Status: live.** The site opens on a **Sign in / Sign up** screen. Accounts use an `@swiftant.com` email + password. Supabase project: `sre-learning` (ID `izxrorgvdwrljfsopiza`, Mumbai / ap-south-1, free plan).

## How it works
- **Sign up:** anyone with an `@swiftant.com` address chooses **Sign up** and sets a password. Other domains are rejected twice: in the browser and by a database trigger (`enforce_company_email` in [`supabase/schema.sql`](supabase/schema.sql)), so the rule holds even if someone bypasses the site.
- **No confirmation email.** Email confirmation is off, because Supabase's free email sender only reaches project members and sends at most 2 emails an hour. The trade-off: an address is not proven to belong to the person who signed up with it.
- **Progress sync:** on sign-in, the browser's local progress and the cloud copy are **merged** (nothing is lost), and every later change syncs automatically. Progress is one row per user in `public.progress`.
- **Team progress:** the dashboard shows every signed-in colleague's progress.
- **Row-level security:** signed-in `@swiftant.com` users can *read* the team's rows; each person can only *write* their own. Visitors who are not signed in can read nothing (the `anon` role has no access).
- **Claude API keys are never synced.** They stay in each person's browser.
- **Content is still public:** the repo is public, so the course files can be read on GitHub. Login protects progress data, not the content.

## Everyday tasks

### Add someone
Send them the site link. They choose **Sign up** with their `@swiftant.com` email and a password.

### Change a password
Signed-in users can change their own password from the account menu in the site header.

### Reset a forgotten password
There is no reset email (the free sender can't reach colleagues). In the Supabase dashboard: **Authentication → Users** → delete the user, and they sign up again. **Their progress is deleted with them.**

### Remove someone
**Authentication → Users** → delete the user. Their progress row is removed automatically (`on delete cascade`).

## Settings to keep in Supabase
| Where | Setting |
|---|---|
| Authentication → Sign In / Providers | **Allow new users to sign up: on** (the database trigger limits it to `@swiftant.com`) |
| Authentication → Sign In / Providers → Email | Enabled; **Confirm email: off** |
| Authentication → URL Configuration | **Site URL** and **Redirect URLs** = the site's live address (see below) |

**Live address:** `https://aravintht-debug.github.io/SRE-learning/` (repo `aravintht-debug/SRE-learning`). The path is case-sensitive, and the old `/claude-learning/` address no longer works. Add `http://localhost:8080/` to Redirect URLs if you test locally.

## Rebuilding from scratch
Only needed if the Supabase project is lost or you set up a copy.
1. At https://supabase.com, create a **New project** on the free plan. Keep the database password in a password manager; the site never uses it.
2. **SQL Editor → New query**: paste [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. It is safe to re-run.
3. Apply the settings in the table above.
4. **Project Settings → API Keys**: copy the **Project URL** and the **publishable** key (`sb_publishable_…`) into `js/config.js`:
   ```js
   supabase: {
     url: 'https://YOUR-PROJECT.supabase.co',
     anonKey: 'sb_publishable_...',
   },
   ```
   The publishable key is safe in a browser because row-level security protects the data. **Never** put a secret / `service_role` key in the site.
5. Commit and push. GitHub Pages redeploys in about a minute.

## Possible upgrade
To verify identities properly, switch to **Sign in with Microsoft** through SwiftAnt's Entra ID (Supabase's Azure provider). It needs an app registration from IT, and then email/password sign-up can be turned off.
