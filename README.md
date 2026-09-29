# Claude Learning · Week 4: Prompting

KodeKloud-style, hands-on labs for learning Claude, followed by labs that apply what you learned to **DevOps & Cloud** work.
The whole site is plain static files (HTML + Tailwind CDN + vanilla JS) with no build step, so it can be hosted for free on GitHub Pages or Vercel.

Each lab step uses a split-pane workspace:

- **Left pane:** the scenario, your task, live ✓/✗ checks, and an "Implement it" box.
- **Right pane:** an editable Claude API request, cURL / Python / TypeScript snippets with copy, and streamed output with the tool loop.

## Curriculum

| # | Module | Hands-on labs | Free sources |
|---|---|---|---|
| 1 | Claude Advanced Features | Extended thinking, effort, tool use, writing a tool, documents + citations, structured outputs, Projects in the Claude apps | Claude Help Center; Anthropic docs (tool use, files, extended thinking) |
| 2 | Claude Practical Applications | The 4D framework (Delegation, Description, Discernment, Diligence) on the **June 2026 Azure billing dataset**, plus the ticket routing and grounded support assistant use cases | Anthropic Academy *AI Fluency*; docs use case guides |
| 3 | Claude Advanced Prompting & Ethical Considerations | Hallucination, knowledge cutoff, working memory, few-shot steering, prompt injection, scope limits, the Usage Policy high-risk requirements, red-teaming | Academy *AI Capabilities and Limitations*; Anthropic Usage Policy |
| 4 | First Look: Claude Security | Trust Center vendor review, app privacy controls, API key security, PII redaction, data privacy review | Anthropic Trust Center; Help Center / Privacy Center |
| 5 | AI Fluency: Explore Responsible AI | Bias checks, honesty (refusing deception), human-in-the-loop design, transparency | AI Fluency courses; Usage Policy |
| 6 | **Apply it: Claude for DevOps & Cloud** | K8s incident RCA, a ChatOps tool loop, a guarded scale tool, Terraform plan review, CI triage, runbooks, log injection, PR secret scan, IAM least-privilege review, AI script review, change requests | Builds on Modules 1–5 |

In total there are 42 steps. There is also a **DevOps & Cloud setup guide** in the app, and an implementation kit in [`work-kit/`](work-kit/README.md).

## Two modes

- **Simulated (default, no key):** pre-recorded responses stream in, while the local tools, redaction, and checks run for real.
- **Live:** open ⚙ Settings and paste your own Anthropic API key. Calls go **directly from your browser to `api.anthropic.com`**, and a Content-Security-Policy blocks every other destination. The key is kept in `sessionStorage` (or in `localStorage` only if you tick "remember"). Use a key with a spend limit. This pattern is for personal learning only: team or production apps should call Claude from a backend.

The default model is `claude-opus-5-5`, and Sonnet 5.5 and Haiku 4.5 can be selected. Requests use adaptive thinking, `output_config.effort`, structured outputs, and strict tools. The server-side refusal fallback can be turned off in Settings.

## Run locally

```bash
npx serve .            # or: python -m http.server 8080
```

## Deploy for free

- **GitHub Pages:** push to `main`, then set **Settings → Pages → Source** to **GitHub Actions**. The included workflow deploys the site to `https://<user>.github.io/claude-learning/`.
- **Vercel:** import the repo with preset **Other**, no build command, and output directory `.`. You can also run `npx vercel --prod`.
- **Custom subdomain:** add the DNS record `CNAME learn → <user>.github.io` (or the value Vercel shows), then set the domain in Pages or Vercel settings and turn on HTTPS. See `CNAME.example`.

Full steps are on the in-app **Deployment Hub** page. After forking, set your GitHub username in `js/config.js`.

## Project structure

```
index.html              app shell, settings modal, CSP
css/styles.css          component styles
js/config.js            your GitHub owner/repo
js/util.js              escaping, safe storage, markdown renderer
js/data.js              Module 1-5 datasets (incl. June 2026 Azure billing CSV)
js/data-devops.js       Module 6 datasets (K8s, Terraform, CI, IAM…)
js/tools.js             local tools (calculator, FX, orders, mock kubectl) + PII redactor
js/claude.js            Messages API client (SSE streaming, simulation, model normalization)
js/labs.js              Modules 1-5
js/labs-devops.js       Module 6
js/deploy.js            Deployment Hub + DevOps & Cloud setup guide
js/app.js               router, views, playground, checks, progress
work-kit/               Python scripts + GitHub Actions example for real pipelines
```

All datasets are synthetic. The lesson text is original and links to Anthropic's free resources; no course content is copied.

## License

MIT (see `LICENSE`).
