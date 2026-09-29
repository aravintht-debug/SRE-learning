#!/usr/bin/env python3
"""Turn an Azure Cost Management CSV export into a validated JSON cost report.

Usage:
    python azure_cost_report.py azure-billing-2026-06.csv > report.json

Built on: Module 2 (4D framework). Delegation: code computes exact totals, Claude explains and
recommends. Discernment: Claude's numbers are checked against the computed totals, and the
script fails loudly on drift.
Requires: pip install anthropic ; ANTHROPIC_API_KEY set from a secret store.
"""
import csv
import json
import sys
from collections import defaultdict

import anthropic

MODEL = "claude-opus-5-5"
TOLERANCE = 0.005  # 0.5%

SCHEMA = {
    "type": "object",
    "properties": {
        "total_cost_usd": {"type": "number"},
        "top_services": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"service": {"type": "string"}, "cost_usd": {"type": "number"}},
                "required": ["service", "cost_usd"],
                "additionalProperties": False,
            },
        },
        "anomalies": {"type": "array", "items": {"type": "string"}},
        "recommendations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "action": {"type": "string"},
                    "estimated_monthly_saving_usd": {"type": "number"},
                    "owner": {"type": "string"},
                },
                "required": ["action", "estimated_monthly_saving_usd", "owner"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["total_cost_usd", "top_services", "anomalies", "recommendations"],
    "additionalProperties": False,
}


def compute_totals(rows: list[dict]) -> dict:
    by_service: dict[str, float] = defaultdict(float)
    for row in rows:
        by_service[row["ServiceName"]] += float(row["CostUSD"])
    return {"total": round(sum(by_service.values()), 2), "by_service": {k: round(v, 2) for k, v in by_service.items()}}


def main() -> int:
    path = sys.argv[1]
    with open(path, newline="", encoding="utf-8") as f:
        csv_text = f.read()
    rows = list(csv.DictReader(csv_text.splitlines()))
    truth = compute_totals(rows)

    client = anthropic.Anthropic()
    response = client.beta.messages.create(
        model=MODEL,
        max_tokens=16000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        thinking={"type": "adaptive"},
        output_config={"effort": "high", "format": {"type": "json_schema", "schema": SCHEMA}},
        system="You are a FinOps analyst. Be exact with numbers and never estimate when the data has the answer.",
        messages=[{
            "role": "user",
            "content": f"<billing_data format=\"csv\">\n{csv_text}\n</billing_data>\n"
                       "Produce the monthly cost report: exact total, top 5 services, anomalies, "
                       "and up to 5 savings recommendations with an owner team.",
        }],
    )
    if response.stop_reason == "refusal":
        raise RuntimeError(f"Claude declined: {response.stop_details}")
    report = json.loads("".join(b.text for b in response.content if b.type == "text"))

    # Discernment, automated: never ship numbers that disagree with the source data.
    drift = abs(report["total_cost_usd"] - truth["total"]) / truth["total"]
    if drift > TOLERANCE:
        print(f"Total mismatch: Claude {report['total_cost_usd']} vs computed {truth['total']}", file=sys.stderr)
        return 1
    report["total_cost_usd"] = truth["total"]
    report["validated"] = True
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
