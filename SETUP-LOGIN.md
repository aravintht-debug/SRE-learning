# Login + synced progress (Supabase, free)

> **Status: live.** The site opens on a **Sign in / Sign up** screen. Accounts use an `@swiftant.com` email + password. Supabase project: `sre-learning` (ID `izxrorgvdwrljfsopiza`, Mumbai / ap-south-1, free plan).
> **Protection being switched on (all free, no IT, no swiftant.com DNS):** an **allowlist** of approved addresses, and **email confirmation + password reset** sent through a dedicated Gmail account. Follow [Switching on the protection](#switching-on-the-protection).

## How it works
- **Sign up:** only `@swiftant.com` addresses **that are on the allowlist** can create an account. Both rules are enforced by a database trigger (`enforce_company_email` in [`supabase/schema.sql`](supabase/schema.sql)), so they hold even if someone bypasses the site.
- **Email confirmation:** with **Confirm email** on, a new account works only after its owner clicks the link sent to their `@swiftant.com` **Outlook** inbox, so a made-up address can never finish signing up. The site shows "check your inbox", offers **Resend confirmation email**, and explains expired links.
- **Where the emails come from:** a dedicated Gmail account (e.g. `sre.learning.noreply@gmail.com`) through Gmail's SMTP server. The **From** address can't be `@swiftant.com` without IT, because swiftant.com's SPF record (`… -all`) only lets Microsoft 365 send as swiftant.com. The **To** address is always the colleague's `@swiftant.com` mailbox.
- **Forgot password:** the sign-in screen emails a reset link; opening it (in the same browser) signs the user in and asks for a new password.
- **Progress sync:** on sign-in, the browser's local progress and the cloud copy are **merged** (nothing is lost), and every later change syncs automatically. Progress is one row per user in `public.progress`.
- **Team progress:** the dashboard shows every signed-in colleague's progress.
- **Row-level security:** signed-in `@swiftant.com` users can *read* the team's rows; each person can only *write* their own. Visitors who are not signed in can read nothing. The allowlist table can't be read or changed from the site at all.
- **Claude API keys are never synced.** They stay in each person's browser.
- **Content is still public:** the repo is public, so the course files can be read on GitHub. Login protects progress data, not the content.

## Switching on the protection
All free. Steps 2–4 need a password, so only you can do them. Existing accounts keep working throughout.

### 1. Turn on the allowlist (2 minutes)
1. Supabase dashboard → **SQL Editor → New query**.
2. Paste all of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. It is safe to re-run. It creates `allowed_emails`, adds `aravinth.t@swiftant.com`, and makes sign-up check the list.
3. Add each colleague before they sign up (see [Add someone](#add-someone)).

### 2. Create the Gmail sender (10 minutes)
1. Create a new Gmail account used only for this, e.g. `sre.learning.noreply@gmail.com`. Don't use your personal Gmail.
2. At https://myaccount.google.com → **Security**, turn on **2-Step Verification**.
3. Then open **App passwords** (search "App passwords" in the Google Account page), create one named `Supabase SMTP`, and copy the 16-character password. Keep it in a password manager; never email it or put it in the repo.

### 3. Connect it to Supabase (5 minutes)
**Authentication → Emails → SMTP Settings** → enable **Custom SMTP**:
| Field | Value |
|---|---|
| Sender email | the Gmail address, e.g. `sre.learning.noreply@gmail.com` |
| Sender name | `SRE Learning` |
| Host | `smtp.gmail.com` |
| Port | `587` (or `465`) |
| Username | the full Gmail address |
| Password | the app password from step 2 |

Then:
1. **Authentication → Emails → Templates** (optional): reword **Confirm signup** and **Reset password**, e.g. subject "Confirm your SRE Learning account". Keep the `{{ .ConfirmationURL }}` link.
2. **Authentication → URL Configuration**: **Site URL** `https://aravintht-debug.github.io/SRE-learning/`, and add the **Redirect URL** `https://aravintht-debug.github.io/SRE-learning/**`.
3. **Authentication → Sign In / Providers → Email**: turn **Confirm email on**.

Supabase starts custom SMTP at 30 emails an hour; Gmail allows about 500 a day. Both are plenty for a team.

### 4. Test with your own address
1. On the live site, click **Forgot password?** with `aravinth.t@swiftant.com`. The reset email should reach your **Outlook** inbox from "SRE Learning".
2. If it is in **Junk**, click **Not junk**, and tell colleagues to check Junk for their first email. If it doesn't arrive at all, Outlook may be quarantining outside senders: check the quarantine, or use Cloudflare Access (its PIN email comes from `notify.cloudflare.com`) as the fallback.
3. Open the link: the site signs you in and asks for a new password.
4. Tell Claude, and it will re-check the public settings to confirm "Confirm email" is on.

### 5. Clean up
**Authentication → Users**: delete any account you don't recognise. Accounts created before this were never verified.

## Everyday tasks

### Add someone
1. Supabase → **Table Editor → allowed_emails → Insert row**, and enter their address in lower case, e.g. `firstname.l@swiftant.com`. Or in the SQL Editor:
   ```sql
   insert into public.allowed_emails (email) values ('firstname.l@swiftant.com');
   ```
2. Send them the site link. They choose **Sign up**, set a password, and click the confirmation link in their Outlook inbox.

### Change a password
Signed-in users can change their own password from the account menu in the site header.

### Reset a forgotten password
The user clicks **Forgot password?** on the sign-in screen. (Before step 3 above is done: delete the user in **Authentication → Users** and they sign up again, which deletes their progress.)

### Remove someone
**Authentication → Users** → delete the user (their progress row is removed automatically), and delete their row in **allowed_emails** so they can't sign up again.

## Settings to keep in Supabase
| Where | Setting |
|---|---|
| Authentication → Sign In / Providers | **Allow new users to sign up: on** (the trigger limits it to allowlisted `@swiftant.com` addresses) |
| Authentication → Sign In / Providers → Email | Enabled; **Confirm email: on** |
| Authentication → Emails → SMTP Settings | Custom SMTP: `smtp.gmail.com`, the Gmail sender and its app password |
| Authentication → URL Configuration | **Site URL** = the live address; **Redirect URLs** include the live address followed by `**` |

**Live address:** `https://aravintht-debug.github.io/SRE-learning/` (repo `aravintht-debug/SRE-learning`). The path is case-sensitive. Email links come back as `…/SRE-learning/?confirmed=1&code=…` and `…/?reset=1&code=…`. Add `http://localhost:8080/**` to Redirect URLs if you test locally.

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

## Possible upgrades
- **Your own sender domain:** buy a cheap domain (e.g. `sre-learning.dev`), verify it with Resend or Brevo, and replace the Gmail SMTP details. Same flow, more professional sender.
- **Company sign-in:** to use SwiftAnt MFA and remove leavers automatically, switch to **Sign in with Microsoft** through SwiftAnt's Entra ID (Supabase's Azure provider). It needs an app registration from IT, and then email/password sign-up can be turned off.
