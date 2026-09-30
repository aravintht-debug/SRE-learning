# SRE Learning · Site Reliability Engineer programme (20 weeks)

KodeKloud-style, hands-on learning for SwiftAnt's 20-week SRE programme. Every topic:

1. **Teaches the topic from the official docs.** Short concept cards link straight to Anthropic, Microsoft Learn, HashiCorp, Elastic, Wazuh, Grafana, Google SRE, and other official pages.
2. **Is hands-on in Claude.** You get copy-ready prompts for claude.ai, Claude Code, Cowork, and Claude for Excel/Word/PowerPoint, plus an in-site API playground whose checks validate Claude's output automatically.
3. **Shows how to leverage Claude for it in a DevOps / Cloud role.** Every topic has "leverage" cards and every step ends with how to use the pattern at work.

The Azure certification track is **AZ-104** (Microsoft Azure Administrator), mapped onto the programme's certification slots. The whole site is plain static files (HTML, Tailwind CDN, vanilla JS) with no build step.

**New here? Read the [Handbook](https://aravintht-debug.github.io/SRE-learning/#/handbook)**. It explains how the course works, what the labs' JSON and Python are for, how the site is built and deployed, and why login uses Supabase, with flow diagrams.

## The 20 weeks

| Weeks | Stream | Focus |
|---|---|---|
| 1–4 | Prompting | Claude foundations, prompting, Cowork, Claude for Microsoft 365, AI Fluency, Projects, advanced features, practical applications, ethics and the Usage Policy, Claude security, responsible AI · AZ-104: orientation, identities, governance, storage |
| 5–6 | Root cause | 5 Whys, fishbone and causal chains, blameless postmortems, SLOs, error budgets and burn-rate alerting |
| 7–12 | Role-critical | Terraform on Azure and Proxmox with drift detection, Entra ID governance (PIM, access reviews, JML), Claude Code, backup and restore (Azure Backup, Proxmox Backup Server, Percona Backup for MongoDB), Claude Code governance, Key Vault, SLO dashboards, Elastic Security, compromise recovery · AZ-104: compute, containers, App Service, networking, monitoring |
| 13–18 | Agentification | Managed Agents, computer use, the Microsoft agent ecosystem, bounded ops agents, multi-agent systems, advanced Claude Code (hooks, subagents, headless), Skills, Claude Code in GitHub Actions, Grafana/OTel/Sloth, Wazuh, the Agent SDK, FinOps · AZ-104: backup and Site Recovery, reviews, final cram |
| 19–20 | Adoption | Advanced prompt engineering, the AZ-104 exam window, handing your agent and prompt pack to another pod, the evidence portfolio, your Claude operating model |

Every week shows its applied task, its milestone (evidence ID, reviewer, pass criterion), and any internal SwiftAnt Academy sessions.

## Two modes

- **Simulated (default, no key):** pre-recorded expert responses stream in. Local tools, redaction, and checks all run for real.
- **Live:** paste your own Anthropic API key in ⚙ Settings. Calls go directly from your browser to `api.anthropic.com` only, and the Content-Security-Policy blocks every other destination. The key stays in session storage unless you tick "remember". Use a key with a spend limit. This pattern is for personal learning; team apps should call Claude from a backend.

## Run locally

```bash
npx serve .            # or: python -m http.server 8080
node tests/validate.js # validates every week, topic and step (also runs in CI before deploy)
```

## Content validation

`tests/validate.js` loads the site headlessly and fails if any of these rules are broken:
- a topic lacks concept cards, official sources, leverage items, a quiz, or a "Do it in Claude" step
- an API step's simulated run doesn't pass its own checks (tools run exactly as in the browser)
- a structured-output schema isn't strict
- content mentions frameworks or certifications that are out of scope for this programme (see the rule list in `tests/validate.js`)

## Project structure

```
index.html              app shell, settings modal, CSP
js/program.js           week registry + shared request builders
js/checks.js            check helpers shared by the app and the validator
js/weeks/weekNN.js      one file per week (topics, briefings, hands-on steps)
js/labs.js, labs-devops.js   week 4 modules (Claude in depth + DevOps application)
js/claude.js            Messages API client (SSE streaming, simulation, model normalization)
js/tools.js             local tools for tool-use labs + PII redactor
js/app.js               router, roadmap, week/topic/step views, playground, progress
tests/validate.js       content validator
work-kit/               Python scripts + GitHub Actions example for real pipelines
```

All datasets are synthetic. Lesson text is original and links to official, free documentation. No course content is copied.

## License

MIT (see `LICENSE`).
