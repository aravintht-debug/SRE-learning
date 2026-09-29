#!/usr/bin/env python3
"""Mask personal data and secrets in text before sending it to any LLM.

Usage:
    python redact_pii.py < app.log > app.redacted.log

Built on: Module 4 (data minimization). Regex catches structured values (emails, cards, phones,
IPs, key-like tokens) but NOT names. Use an NER tool such as Microsoft Presidio for names.
"""
import re
import sys

PATTERNS = [
    ("SECRET", re.compile(r"\b(?:sk-ant-[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{12,}|ghp_[A-Za-z0-9]{20,}|xox[bap]-[A-Za-z0-9-]{10,})")),
    ("EMAIL", re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)),
    ("CARD", re.compile(r"\b\d(?:[ -]?\d){12,15}\b")),
    ("PHONE", re.compile(r"(?<![\w.])(?:\+\d{1,3}[ .-]?)?\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b")),
    ("SSN", re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    ("IPV4", re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")),
]


def redact(text: str) -> str:
    """Replace each distinct sensitive value with a stable placeholder like [EMAIL_1]."""
    for label, pattern in PATTERNS:
        seen: dict[str, str] = {}

        def repl(match: re.Match, label=label, seen=seen) -> str:
            value = match.group(0)
            if value not in seen:
                seen[value] = f"[{label}_{len(seen) + 1}]"
            return seen[value]

        text = pattern.sub(repl, text)
    return text


if __name__ == "__main__":
    sys.stdout.write(redact(sys.stdin.read()))
