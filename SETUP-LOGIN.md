# Login + synced progress (Supabase, free)

> **Status: live.** The site opens on a **Sign in / Sign up** screen. Accounts use an `@swiftant.com` email + password. Supabase project: `sre-learning` (ID `izxrorgvdwrljfsopiza`, Mumbai / ap-south-1, free plan).
> **Email confirmation: ready in the site, waiting for IT.** It switches on once IT provides a mail sender (see [Turning on email confirmation](#turning-on-email-confirmation)). Until then, sign-up works without confirmation.

## How it works
- **Sign up:** anyone with an `@swiftant.com` address chooses **Sign up** and sets a password. Other domains are rejected twice: in the browser and by a database trigger (`enforce_company_email` in [`supabase/schema.sql`](supabase/schema.sql)), so the rule holds even if someone bypasses the site.
- **Email confirmation:** when **Confirm email** is on in Supabase, a new account only works after its owner clicks the link sent to that inbox, so made-up addresses can't get in. The site shows "check your inbox", offers **Resend confirmation email**, and explains if a link has expired. While it is off (today), the account works immediately, and an address is not proven to belong to the person who used it.
- **Forgot password:** the sign-in screen emails a reset link; opening it (in the same browser) signs the user in and asks for a new password. This needs the same mail sender as confirmation.
- **Progress sync:** on sign-in, the browser's local progress and the cloud copy are **merged** (nothing is lost), and every later change syncs automatically. Progress is one row per user in `public.progress`.
- **Team progress:** the dashboard shows every signed-in colleague's progress.
- **Row-level security:** signed-in `@swiftant.com` users can *read* the team's rows; each person can only *write* their own. Visitors who are not signed in can read nothing (the `anon` role has no access).
- **Claude API keys are never synced.** They stay in each person's browser.
- **Content is still public:** the repo is public, so the course files can be read on GitHub. Login protects progress data, not the content.

## Everyday tasks

### Add someone
Send them the site link. They choose **Sign up** with their `@swiftant.com` email and a password (and, once confirmation is on, click the link in their inbox).

### Change a password
Signed-in users can change their own password from the account menu in the site header.

### Reset a forgotten password
- **Once email sending is set up:** the user clicks **Forgot password?** on the sign-in screen.
- **Until then:** in the Supabase dashboard, **Authentication → Users** → delete the user, and they sign up again. **Their progress is deleted with them.**

### Remove someone
**Authentication → Users** → delete the user. Their progress row is removed automatically (`on delete cascade`).

## Settings to keep in Supabase
| Where | Setting |
|---|---|
| Authentication → Sign In / Providers | **Allow new users to sign up: on** (the database trigger limits it to `@swiftant.com`) |
| Authentication → Sign In / Providers → Email | Enabled; **Confirm email: off today, on after IT's mail sender is in place** |
| Authentication → URL Configuration | **Site URL:** the live address. **Redirect URLs:** the live address followed by `**` (below), so confirmation and reset links can return to it |
| Authentication → Emails → SMTP Settings | Custom SMTP from IT (needed for confirmation and reset emails) |

**Live address:** `https://aravintht-debug.github.io/SRE-learning/` (repo `aravintht-debug/SRE-learning`). The path is case-sensitive, and the old `/claude-learning/` address no longer works.
**Redirect URL to allow:** `https://aravintht-debug.github.io/SRE-learning/**` (the links come back as `…/SRE-learning/?confirmed=1&code=…` and `…/?reset=1&code=…`). Add `http://localhost:8080/**` too if you test locally.

## Turning on email confirmation
Do this after IT has set up the sender and given you the SMTP details (IT verifies a sending domain such as `learn.swiftant.com` with a mail provider and adds its DNS records).

1. **Authentication → Emails → SMTP Settings** → enable **Custom SMTP** and enter what IT provides:
   | Field | Example (Resend) |
   |---|---|
   | Sender email | `noreply@learn.swiftant.com` |
   | Sender name | `SRE Learning` |
   | Host | `smtp.resend.com` |
   | Port | `465` (or `587`) |
   | Username | `resend` |
   | Password | the provider's API key (IT can type it in directly; never email or commit it) |
2. **Authentication → Emails → Templates**: optionally reword **Confirm signup** and **Reset password** (e.g. subject "Confirm your SRE Learning account"). Keep the `{{ .ConfirmationURL }}` link in the body.
3. **Authentication → URL Configuration**: add the Redirect URL with `**` shown above.
4. **Authentication → Rate Limits**: the default emails-per-hour limit is fine for a small team; raise it if a whole cohort signs up at once.
5. **Authentication → Sign In / Providers → Email**: turn **Confirm email on**.
6. **Test** with your own address: Sign up on the live site → "check your inbox" → click the link → you land signed in with "Email confirmed". Then test **Forgot password?**. If the mail lands in Junk, ask IT to add the sender to the tenant allow list.
7. **Review Authentication → Users** and delete any account you don't recognise: accounts created before confirmation was on were never verified.

Existing accounts keep working; only new sign-ups need to confirm.

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
To verify identities with company MFA and remove leavers automatically, switch to **Sign in with Microsoft** through SwiftAnt's Entra ID (Supabase's Azure provider). It needs an app registration from IT, and then email/password sign-up can be turned off.
