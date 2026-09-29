# Implementation kit: Claude for DevOps & Cloud

Small, production-style scripts that apply the course patterns in real pipelines. They use the official `anthropic` Python SDK with `claude-opus-5-5`, adaptive thinking, and structured outputs. Server-side refusal fallback (`fallbacks: "default"`) is turned on.

| File | What it does | Built on |
|---|---|---|
| `ci_failure_triage.py` | Failed CI log → JSON triage (failing step, root cause, fix, whether a retry will help) | M1 structured outputs, M4 redaction |
| `ai-ci-triage.example.yml` | GitHub Actions job that runs the triage on failure and writes it to the job summary | M6-5 |
| `azure_cost_report.py` | Azure Cost Management CSV → validated JSON report. It fails if Claude's total drifts more than 0.5% from the computed total | M2 4D framework |
| `redact_pii.py` | Masks emails, cards, phones, IPs, and key-like tokens before text leaves your systems | M4-4 |

## Setup

```bash
pip install -U anthropic
# Load the key from your secret manager, never from code:
export ANTHROPIC_API_KEY="$(az keyvault secret show --vault-name <vault> --name anthropic-api-key --query value -o tsv)"
```

## Run

```bash
python redact_pii.py < app.log > app.redacted.log
python ci_failure_triage.py build.log
python azure_cost_report.py azure-billing-2026-06.csv > report.json
```

Check syntax without calling the API: `python -m py_compile *.py`

## Guardrails

- Use one API key per app and environment, each in its own Claude Console workspace with a spend limit.
- Logs are untrusted input: the prompts tell Claude never to follow instructions found inside them.
- Treat AI output as advice. Pipelines act on it only within safe limits (for example, auto-retry only when `retry_will_help` is true), and humans approve changes.
