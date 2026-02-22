"""Entity extraction using regex and pattern matching (no LLM)."""

from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)


# Korean name pattern: 2-4 Korean chars
_KOREAN_NAME = re.compile(r"@([가-힣]{2,4})\b")

# Date patterns
_DATE_ISO = re.compile(r"\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b")
_DATE_SLASH = re.compile(r"\b(\d{1,2}/\d{1,2})\b")
_DATE_KOREAN = re.compile(r"(\d{1,2}월\s*\d{1,2}일)")

# Deadline patterns
_DEADLINE = re.compile(
    r"(?:마감|기한|~까지|deadline|due)\s*[:\s]*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}월\s*\d{1,2}일|\d{1,2}/\d{1,2})",
    re.I,
)

# URL pattern
_URL = re.compile(r"https?://[^\s<>\"')\]]+")


class EntityExtractor:
    """Extracts entities from plain text using regex patterns."""

    def __init__(self, known_projects: list[str] | None = None) -> None:
        self._known_projects = known_projects or []

    def set_known_projects(self, projects: list[str]) -> None:
        self._known_projects = projects

    def extract(self, text: str) -> list[dict]:
        if not text or not text.strip():
            return []

        entities: list[dict] = []
        seen: set[tuple[str, str]] = set()

        def _add(entity_type: str, value: str, metadata: dict | None = None) -> None:
            key = (entity_type, value)
            if key not in seen:
                seen.add(key)
                entities.append({
                    "type": entity_type,
                    "value": value,
                    "metadata": metadata,
                })

        # People (@name)
        for m in _KOREAN_NAME.finditer(text):
            _add("person", m.group(1))

        # Deadlines (must check before general dates to avoid duplication)
        deadline_positions: set[int] = set()
        for m in _DEADLINE.finditer(text):
            _add("deadline", m.group(1).strip())
            deadline_positions.add(m.start())

        # Dates (ISO)
        for m in _DATE_ISO.finditer(text):
            if m.start() not in deadline_positions:
                _add("date", m.group(1))

        # Dates (Korean)
        for m in _DATE_KOREAN.finditer(text):
            _add("date", m.group(1))

        # Dates (slash)
        for m in _DATE_SLASH.finditer(text):
            val = m.group(1)
            parts = val.split("/")
            if len(parts) == 2:
                month, day = int(parts[0]), int(parts[1])
                if 1 <= month <= 12 and 1 <= day <= 31:
                    _add("date", val)

        # URLs
        for m in _URL.finditer(text):
            _add("url", m.group(0))

        # Project name matching
        for project_name in self._known_projects:
            if project_name and project_name in text:
                _add("project", project_name)

        return entities
