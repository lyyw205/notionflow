"""Todo extraction from plain text and BlockNote JSON."""

from __future__ import annotations

import json
import logging
import re

logger = logging.getLogger(__name__)

# Patterns for todo items in plain text
_TODO_PATTERNS = [
    re.compile(r"^[\s]*[-*]\s*\[\s*\]\s*(.+)", re.MULTILINE),  # - [ ] item
    re.compile(r"^[\s]*TODO[:\s]+(.+)", re.MULTILINE | re.IGNORECASE),  # TODO: item
    re.compile(r"^[\s]*[-*]\s*(.+(?:해야\s*함|필요|할\s*것|하기))", re.MULTILINE),  # Korean patterns
]

# Priority keywords
_PRIORITY_KEYWORDS = {
    "urgent": re.compile(r"긴급|urgent|ASAP|즉시|바로", re.I),
    "high": re.compile(r"중요|높음|high|important|critical", re.I),
    "low": re.compile(r"낮음|나중에|low|later|eventually", re.I),
}

# Due date extraction within a todo line
_DUE_DATE_IN_LINE = re.compile(
    r"(?:~까지|마감|by|due|기한)\s*[:\s]*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}월\s*\d{1,2}일)",
    re.I,
)

# Assignee pattern within a todo line
_ASSIGNEE_IN_LINE = re.compile(r"@([가-힣]{2,4})\b")


class TodoExtractor:
    """Extracts todo items from text."""

    def extract(self, plain_text: str) -> list[dict]:
        if not plain_text or not plain_text.strip():
            return []

        todos: list[dict] = []
        seen_titles: set[str] = set()

        for pattern in _TODO_PATTERNS:
            for m in pattern.finditer(plain_text):
                raw_title = m.group(1).strip()
                title = self._clean_title(raw_title)

                if not title or title in seen_titles or len(title) < 2:
                    continue

                seen_titles.add(title)

                priority = self._detect_priority(raw_title)
                due_date = self._extract_due_date(raw_title)
                assignee = self._extract_assignee(raw_title)

                todos.append({
                    "title": title,
                    "priority": priority,
                    "due_date": due_date,
                    "assignee": assignee,
                })

        return todos

    def extract_from_blocknote(self, content_json: str) -> list[dict]:
        """Extract todos from BlockNote JSON (checkListItem blocks)."""
        try:
            blocks = json.loads(content_json)
        except (json.JSONDecodeError, TypeError):
            return []

        todos: list[dict] = []
        self._walk_blocks(blocks, todos)
        return todos

    def _walk_blocks(self, blocks: list, todos: list[dict]) -> None:
        for block in blocks:
            if not isinstance(block, dict):
                continue

            if block.get("type") == "checkListItem":
                checked = block.get("props", {}).get("checked", False)
                if not checked:
                    text = self._extract_block_text(block)
                    if text and len(text) >= 2:
                        todos.append({
                            "title": text,
                            "priority": self._detect_priority(text),
                            "due_date": self._extract_due_date(text),
                            "assignee": self._extract_assignee(text),
                        })

            children = block.get("children", [])
            if children:
                self._walk_blocks(children, todos)

    def _extract_block_text(self, block: dict) -> str:
        parts: list[str] = []
        for inline in block.get("content", []):
            if isinstance(inline, dict) and inline.get("text"):
                parts.append(inline["text"])
        return "".join(parts).strip()

    def _clean_title(self, title: str) -> str:
        # Remove due date patterns from title
        title = _DUE_DATE_IN_LINE.sub("", title).strip()
        # Remove assignee patterns
        title = _ASSIGNEE_IN_LINE.sub("", title).strip()
        # Remove trailing punctuation clutter
        title = title.rstrip("- :,;")
        return title

    def _detect_priority(self, text: str) -> str:
        for priority, pattern in _PRIORITY_KEYWORDS.items():
            if pattern.search(text):
                return priority
        return "medium"

    def _extract_due_date(self, text: str) -> str | None:
        m = _DUE_DATE_IN_LINE.search(text)
        return m.group(1).strip() if m else None

    def _extract_assignee(self, text: str) -> str | None:
        m = _ASSIGNEE_IN_LINE.search(text)
        return m.group(1) if m else None
