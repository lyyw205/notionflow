"""Detect status change keywords in text for auto-updating task status."""

from __future__ import annotations

import re

# Completion patterns
_DONE_PATTERNS = re.compile(
    r"완료|끝남|끝냄|마무리|done|closed|finished|resolved|해결",
    re.IGNORECASE,
)

# Start patterns
_START_PATTERNS = re.compile(
    r"시작|착수|started|진행\s*중|작업\s*중|in\s*progress",
    re.IGNORECASE,
)

# Block patterns
_BLOCK_PATTERNS = re.compile(
    r"보류|대기|blocked|on\s*hold|중단|막힘",
    re.IGNORECASE,
)


class StatusDetector:
    """Detects status change signals from text."""

    def detect(self, text: str) -> list[dict]:
        """
        Returns list of detected status signals.
        Each dict: { "signal": "done"|"in_progress"|"blocked", "context": str }
        """
        if not text or not text.strip():
            return []

        signals: list[dict] = []

        for m in _DONE_PATTERNS.finditer(text):
            start = max(0, m.start() - 40)
            end = min(len(text), m.end() + 40)
            signals.append({
                "signal": "done",
                "keyword": m.group(0),
                "context": text[start:end].strip(),
            })

        for m in _START_PATTERNS.finditer(text):
            start = max(0, m.start() - 40)
            end = min(len(text), m.end() + 40)
            signals.append({
                "signal": "in_progress",
                "keyword": m.group(0),
                "context": text[start:end].strip(),
            })

        for m in _BLOCK_PATTERNS.finditer(text):
            start = max(0, m.start() - 40)
            end = min(len(text), m.end() + 40)
            signals.append({
                "signal": "blocked",
                "keyword": m.group(0),
                "context": text[start:end].strip(),
            })

        return signals
