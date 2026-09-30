# Login + synced progress (Supabase, free)

> **Status: live, invite-only.** The site opens on a **Sign in** screen. There is no self sign-up: the site owner creates each account for an `@swiftant.com` colleague and gives them a temporary password on Teams. Supabase project: `sre-learning` (ID `izxrorgvdwrljfsopiza`, Mumbai / ap-south-1, free plan). Free, no email service, no IT.

## How it works
- **Invite-only:** "Allow new users to sign up" is **off** in Supabase and the site shows **Sign in** only, so nobody can register themselves. A made-up `@swiftant.com` address can never get in.
- **Two more locks in the database:** even an account the owner creates must be an `@swiftant.com` address **on the allowlist** (`allowed_emails` + the `enforce_company_email` trigger in [`supabase/schema.sql`](supabase/schema.sql)). If sign-up were switched on by mistake, the allowlist still blocks strangers.
- **Identity:** you send the temporary password yourself, on Teams or Outlook, to the person you know. On first sign-in the site asks them to **choose their own password**, and the prompt keeps coming back until they do.
- **Forgotten passwords:** you set a new temporary password with one SQL command (below). Their progress is kept.
- **Progress sync:** on sign-in, the browser's local progress and the cloud copy are **merged** (nothing is lost), and every later change syncs automatically. Progress is one row per user in `public.progress`.
- **Team progress:** the dashboard shows every signed-in colleague's progress.
- **Row-level security:** signed-in `@swiftant.com` users can *read* the team's rows; each person can only *write* their own. Visitors who are not signed in can read nothing. The allowlist can't be read or changed from the site at all.
- **Claude API keys are never synced.** They stay in each person's browser.
- **Content is still public:** the repo is public, so the course files can be read on GitHub. Login protects progress data and who appears in the team view, not the course content.

## Switching on the protection (once, about 10 minutes)
1. **Run the schema.** Supabase → **SQL Editor → New query** → paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**. Safe to re-run. It creates the allowlist, adds `aravinth.t@swiftant.com`, and makes every new account check the list.
2. **Turn off self sign-up.** **Authentication → Sign In / Providers** → **Allow new users to sign up: off**. Save.
3. **Stronger passwords.** **Authentication → Sign In / Providers → Email**: set **Minimum password length** to `10` or more and require letters and digits (if your plan shows the option).
4. **Remove unknown accounts.** **Authentication → Users**: delete every account you don't recognise. Accounts made before today were never verified.
5. **Check it.** Tell Claude; it reads the public settings to confirm sign-up is off.

## Everyday tasks

### Add someone
1. **Allowlist them.** Supabase → **Table Editor → allowed_emails → Insert row** → their address in lower case, e.g. `firstname.l@swiftant.com`. Or in the SQL Editor:
   ```sql
   insert into public.allowed_emails (email) values ('firstname.l@swiftant.com');
   ```
2. **Create the account.** **Authentication → Users → Add user → Create new user** → their email, a temporary password (e.g. three random words and a number), and tick **Auto Confirm User**.
3. **Tell them yourself** on Teams (or Outlook): the site link `https://aravintht-debug.github.io/SRE-learning/`, their email, and the temporary password. They sign in and the site makes them choose their own.

If step 2 fails with "Database error creating new user", the address is not on the allowlist yet (step 1), or it isn't `@swiftant.com`.

### Reset a forgotten password (keeps their progress)
SQL Editor, with a new temporary password:
```sql
update auth.users
set encrypted_password = extensions.crypt('NEW-TEMP-PASSWORD', extensions.gen_salt('bf')),
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'password_changed',
    updated_at = now()
where email = 'firstname.l@swiftant.com';
```
Send them the temporary password on Teams. On next sign-in they are asked to choose their own again.

### Change a password
Signed-in users change their own password from the account menu in the site header.

### Remove someone
**Authentication → Users** → delete the user (their progress row is removed automatically), then delete their row in **allowed_emails**.

## Settings to keep in Supabase
| Where | Setting |
|---|---|
| Authentication → Sign In / Providers | **Allow new users to sign up: off** (invite-only) |
| Authentication → Sign In / Providers → Email | Enabled; minimum password length 10+ |
| Authentication → URL Configuration | **Site URL** = the live address |
| `js/config.js` | `selfSignup: false` (the site shows Sign in only) |

**Live address:** `https://aravintht-debug.github.io/SRE-learning/` (repo `aravintht-debug/SRE-learning`). The path is case-sensitive.

## Optional: self sign-up with email confirmation
The site also supports self sign-up with an email confirmation link and **Forgot password** by email. It needs a mail sender Supabase can use (custom SMTP): a company mail provider set up by IT, or a domain you own verified with Resend or Brevo. To use it: configure **Authentication → Emails → SMTP Settings**, add the Redirect URL `https://aravintht-debug.github.io/SRE-learning/**`, turn on **Confirm email** and **Allow new users to sign up**, and set `selfSignup: true` in `js/config.js`. Keep the allowlist on.

## Rebuilding from scratch
Only needed if the Supabase project is lost or you set up a copy.
1. At https://supabase.com, create a **New project** on the free plan. Keep the database password in a password manager; the site never uses it.
2. **SQL Editor → New query**: paste [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. It is safe to re-run.
3. Apply the settings in the table above, and add yourself as in [Add someone](#add-someone).
4. **Project Settings → API Keys**: copy the **Project URL** and the **publishable** key (`sb_publishable_…`) into `js/config.js`:
   ```js
   supabase: {
     url: 'https://YOUR-PROJECT.supabase.co',
     anonKey: 'sb_publishable_...',
   },
   ```
   The publishable key is safe in a browser because row-level security protects the data. **Never** put a secret / `service_role` key in the site.
5. Commit and push. GitHub Pages redeploys in about a minute.

## Possible upgrades
- **Self sign-up by email:** see [Optional: self sign-up with email confirmation](#optional-self-sign-up-with-email-confirmation).
- **Company sign-in:** to use SwiftAnt MFA and remove leavers automatically, switch to **Sign in with Microsoft** through SwiftAnt's Entra ID (Supabase's Azure provider). It needs an app registration from IT, and then email/password sign-up can be turned off.
