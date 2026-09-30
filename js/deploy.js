/* SRE Learning · Deployment Hub + DevOps & Cloud setup guide pages */
(function () {
  'use strict';
  const PL = window.PL;
  const { esc } = PL.util;

  const code = (text, lang) => '<div class="codeblock"><div class="codeblock-bar"><span>' + esc(lang || 'bash') + '</span><button class="btn-copy" data-action="copy-pre">Copy</button></div><pre>' + esc(text) + '</pre></div>';
  const step = (n, title, body) => '<div class="dep-step"><div class="dep-num">' + n + '</div><div class="min-w-0 flex-1"><div class="font-semibold text-white">' + title + '</div><div class="text-sm text-slate-300 mt-1 grid gap-2">' + body + '</div></div></div>';
  const ext = (href, label) => '<a class="text-brand-300 underline" href="' + href + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';

  PL.deployView = function () {
    const o = PL.SITE.owner, r = PL.SITE.repo;
    const rootSite = r.toLowerCase() === o.toLowerCase() + '.github.io'; // <owner>.github.io repos are served at the domain root
    const vercelName = r.replace(/.github.io$/i, '').toLowerCase();
    const pagesUrl = 'https://' + o.toLowerCase() + '.github.io/' + (rootSite ? '' : r + '/');
    return '<div class="max-w-4xl mx-auto px-4 sm:px-8 py-8">' +
      '<nav class="text-xs text-slate-500 mb-3"><a href="#/" class="hover:text-slate-300">Dashboard</a> › Deployment Hub</nav>' +
      '<h1 class="text-2xl sm:text-3xl font-extrabold text-white">Deployment Hub</h1>' +
      '<p class="text-slate-400 mt-2">This site is plain static files (HTML, Tailwind CDN, vanilla JS) with no build step, so it can be hosted for free anywhere.</p>' +
      '<div class="grid sm:grid-cols-3 gap-3 my-6">' +
      [['GitHub Pages', 'Free · <code>' + esc(pagesUrl.replace('https://', '')) + '</code>', '#gh'], ['Vercel', 'Free · <code>' + esc(vercelName) + '.vercel.app</code>', '#vercel'], ['Custom subdomain', 'e.g. <code>learn.yourdomain.com</code>', '#domain']]
        .map((x) => '<a href="' + x[2] + '" data-scroll class="card card-hover p-4"><div class="font-semibold text-white">' + x[0] + '</div><div class="text-xs text-slate-400 mt-1">' + x[1] + '</div></a>').join('') + '</div>' +

      '<h2 id="gh" class="section-title">A · GitHub Pages (recommended)</h2><div class="card p-5 grid gap-5 mb-8">' +
      step(1, 'Create an empty public repo', '<p>On github.com, go to <b>New repository</b>. Name it <code>' + esc(r) + '</code>, set visibility to <b>Public</b>, and do <b>not</b> add a README.</p>') +
      step(2, 'Push the code', code('cd ' + r + '\ngit init -b main\ngit add .\ngit commit -m "SRE Learning: Week 4 labs"\ngit remote add origin https://github.com/' + o + '/' + r + '.git\ngit push -u origin main')) +
      step(3, 'Turn on Pages with GitHub Actions', '<p>In the repo, go to <b>Settings → Pages → Build and deployment</b> and set <b>Source</b> to <b>GitHub Actions</b>. The included <code>.github/workflows/deploy-pages.yml</code> deploys every push to <code>main</code>.</p><p>Alternative: choose <b>Deploy from a branch</b> → <code>main</code> / <code>(root)</code>. <code>.nojekyll</code> is already included.</p>') +
      step(4, 'Open your site', '<p>It goes live in about a minute at ' + ext(esc(pagesUrl), esc(pagesUrl)) + '. Watch the progress in the repo\'s <b>Actions</b> tab.</p>') +
      '</div>' +

      '<h2 id="vercel" class="section-title">B · Vercel</h2><div class="card p-5 grid gap-5 mb-8">' +
      step(1, 'Import the repo', '<p>' + ext('https://vercel.com/new', 'vercel.com/new') + ' → import your GitHub repo → set Framework Preset to <b>Other</b>, leave Build Command <b>empty</b>, set Output Directory to <code>.</code> → Deploy.</p>') +
      step(2, 'Or use the CLI', code('npx vercel@latest          # first run: log in + link (preview URL)\nnpx vercel@latest --prod   # production: https://' + vercelName + '.vercel.app')) +
      step(3, 'Security headers', '<p><code>vercel.json</code> sets a strict Content-Security-Policy (the only API this page can call is <code>api.anthropic.com</code>), <code>X-Frame-Options: DENY</code>, and <code>Referrer-Policy: no-referrer</code>.</p>') +
      '</div>' +

      '<h2 id="domain" class="section-title">C · Custom subdomain (e.g. learn.yourdomain.com)</h2><div class="card p-5 grid gap-5 mb-8">' +
      '<p class="text-sm text-slate-400">You need a domain you already own. Add <b>one CNAME record</b> at your DNS provider:</p>' +
      '<div class="overflow-x-auto"><table class="data-table w-full"><thead><tr><th>Host</th><th>Type</th><th>GitHub Pages value</th><th>Vercel value</th></tr></thead><tbody><tr><td><code>learn</code></td><td>CNAME</td><td><code>' + esc(o.toLowerCase()) + '.github.io</code></td><td><code>cname.vercel-dns.com</code> (or the value Vercel shows)</td></tr></tbody></table></div>' +
      step('GH', 'GitHub Pages', '<p>In the repo, go to <b>Settings → Pages → Custom domain</b>, enter <code>learn.yourdomain.com</code>, and save. Once the DNS check passes, tick <b>Enforce HTTPS</b>. Also verify the domain under your account at <b>Settings → Pages → Verified domains</b> to prevent subdomain takeover.</p>' + code('nslookup learn.yourdomain.com')) +
      step('V', 'Vercel', '<p>Go to <b>Project → Settings → Domains</b>, add <code>learn.yourdomain.com</code>, then create the CNAME record it shows. HTTPS is automatic.</p>') +
      step('!', 'Cloudflare', '<p>Keep the record set to <b>DNS only</b> (grey cloud) until the certificate is issued.</p>') +
      '</div>' +

      '<h2 class="section-title">Before you share it</h2><div class="card p-5 text-sm text-slate-300 grid gap-2 mb-10">' +
      '<div>✓ Set the GitHub owner, repo and site address in <code>js/config.js</code>.</div>' +
      '<div>✓ Visitors enter their own API key, and it stays in their browser. No key is ever stored in the repo.</div>' +
      '<div>✓ For a team deployment without personal keys, add a small backend proxy (an Azure Function, Lambda, or Cloudflare Worker) that holds the key in a secret store and enforces auth and rate limits.</div>' +
      '<div>✓ The license is MIT. Course links point to Anthropic\'s free resources, and no course content is copied.</div></div></div>';
  };

  PL.kitView = function () {
    const map = [
      ['Incident root-cause analysis', 'Extended thinking + effort', 'M1-1, M1-2 → M6-1'],
      ['ChatOps bot for Kubernetes', 'Tool use (read-only tools)', 'M1-3, M1-4 → M6-2, M6-3'],
      ['Terraform plan review in PRs', 'Documents + citations', 'M1-5 → M6-4'],
      ['CI failure triage in pipelines', 'Structured outputs', 'M1-6, M2-3 → M6-5'],
      ['FinOps / cloud cost reports', '4D framework + structured data', 'M2-1 … M2-7'],
      ['Runbooks and alert routing', 'Steerability, few-shot, routing', 'M2-5, M3-4 → M6-6'],
      ['Log analysis without being hijacked', 'Prompt-injection defense', 'M3-5 → M6-7'],
      ['Secret scanning and IAM reviews', 'Security + data privacy', 'M4-1 … M4-5 → M6-8, M6-9'],
      ['Safe automation and change control', 'Discernment + human-in-the-loop', 'M5-1 … M5-4 → M6-10, M6-11'],
    ];
    return '<div class="max-w-4xl mx-auto px-4 sm:px-8 py-8">' +
      '<nav class="text-xs text-slate-500 mb-3"><a href="#/" class="hover:text-slate-300">Dashboard</a> › DevOps &amp; Cloud setup guide</nav>' +
      '<h1 class="text-2xl sm:text-3xl font-extrabold text-white">DevOps &amp; Cloud setup guide</h1>' +
      '<p class="text-slate-400 mt-2">How to take what you learned into your environment, from getting access and storing keys to your first pipeline integration and the guardrails you need.</p>' +

      '<h2 class="section-title mt-8">What you learned → where you use it</h2><div class="card overflow-x-auto mb-8"><table class="data-table w-full"><thead><tr><th>DevOps / Cloud use</th><th>Claude topic</th><th>Labs</th></tr></thead><tbody>' +
      map.map((x) => '<tr><td class="text-slate-100">' + x[0] + '</td><td>' + x[1] + '</td><td class="text-slate-400">' + x[2] + '</td></tr>').join('') + '</tbody></table></div>' +

      '<h2 class="section-title">Setup steps</h2><div class="card p-5 grid gap-6 mb-8">' +
      step(1, 'Get access the right way', '<p><b>Engineers (chat):</b> use a Claude <b>Team or Enterprise</b> workspace, which is covered by commercial terms (see the Privacy Center), not personal accounts. <b>Automation (API):</b> in the ' + ext('https://platform.claude.com/', 'Claude Console') + ', create one <b>workspace per environment</b> (dev, prod) and one API key per app, and set <b>spend limits</b>.</p>') +
      step(2, 'Store the key in your secret manager', '<p>Keep the key out of code, prompts, and shell history. These commands prompt for the value or read it from a file:</p>' +
        code('# GitHub Actions (prompts for the value)\ngh secret set ANTHROPIC_API_KEY\n\n# Azure Key Vault (read from a file, then delete the file)\naz keyvault secret set --vault-name kv-contoso-prod --name anthropic-api-key --file ./key.txt\n\n# AWS Secrets Manager\naws secretsmanager create-secret --name anthropic-api-key --secret-string file://key.txt')) +
      step(3, 'Install the official SDK', code('pip install -U anthropic            # Python\nnpm install @anthropic-ai/sdk        # Node / TypeScript')) +
      step(4, 'Your first pipeline integration: CI failure triage', '<p>Copy <code>work-kit/ci_failure_triage.py</code> and <code>work-kit/ai-ci-triage.example.yml</code> into your repo. When a job fails, the workflow redacts the log, sends it to Claude with a JSON schema, and writes the triage to the job summary.</p>' +
        code('mkdir -p .github/workflows scripts\ncp work-kit/ci_failure_triage.py work-kit/redact_pii.py scripts/\ncp work-kit/ai-ci-triage.example.yml .github/workflows/ai-ci-triage.yml\ngit add . && git commit -m "Add AI CI failure triage" && git push')) +
      step(5, 'Other scripts in the kit', '<p><code>work-kit/azure_cost_report.py</code> turns an Azure Cost Management CSV into a validated JSON report (Module 2). <code>work-kit/redact_pii.py</code> masks emails, cards, phones, IPs, and key-like tokens before anything is sent (Module 4).</p>' +
        code('python work-kit/redact_pii.py < app.log > app.redacted.log\npython work-kit/azure_cost_report.py azure-billing-2026-06.csv')) +
      step(6, 'Claude Code for infrastructure repos', '<p>Claude Code is Anthropic\'s agentic coding tool for the terminal and IDE. Use it in Terraform, Helm, and pipeline repos to explain modules, write tests, and draft changes. Changes still go through PR review. Docs: ' + ext('https://code.claude.com/docs', 'code.claude.com/docs') + '.</p>' +
        code('npm install -g @anthropic-ai/claude-code\ncd infra-terraform\nclaude')) +
      '</div>' +

      '<h2 class="section-title">Guardrails checklist (from Modules 3–5)</h2><div class="card p-5 text-sm text-slate-300 grid gap-2 mb-10">' +
      ['Tools are <b>read-only by default</b>; write tools enforce limits in code (M1-4, M6-3)', 'Logs and tickets are treated as <b>untrusted input</b>, and prompts contain no secrets (M3-5, M6-7)', '<b>Redact</b> personal data and secrets before any API call (M4-4)', 'Keys live in a <b>secret manager</b>, with one per app and environment, spend limits, and rotation (M4-3)', 'AI proposes, <b>humans approve</b> production changes, enforced by the pipeline (M5-3, M6-11)', 'Never auto-run AI-generated scripts; review them and run shellcheck and policy checks first (M6-10)', 'Keep a small <b>labeled test set</b> and re-run it when you change a prompt or model (M3-8)', 'Complete the <b>vendor review</b> with the Trust Center before rollout (M4-1)']
        .map((x) => '<div>✓ ' + x + '</div>').join('') + '</div></div>';
  };

  // In-page anchors on the deploy page (hash routing owns location.hash).
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-scroll]');
    if (!a) return;
    e.preventDefault();
    const el = document.getElementById(a.getAttribute('href').slice(1));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
