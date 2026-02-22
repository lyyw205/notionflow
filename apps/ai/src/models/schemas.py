from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class TagResult(BaseModel):
    name: str
    score: float


class EntityResult(BaseModel):
    type: Literal["person", "date", "url", "project", "deadline"]
    value: str
    metadata: dict | None = None


class TodoResult(BaseModel):
    title: str
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    due_date: str | None = None
    assignee: str | None = None


NoteType = Literal[
    "meeting_note", "todo", "decision", "idea", "reference", "log"
]


class StatusSignal(BaseModel):
    signal: Literal["done", "in_progress", "blocked"]
    keyword: str
    context: str


class AIProcessingResult(BaseModel):
    page_id: str
    note_type: NoteType
    tags: list[TagResult]
    summary: str
    embedding: list[float]
    cluster_id: int | None = None
    entities: list[EntityResult] = []
    todos: list[TodoResult] = []
    confidence: float = 0.0
    status_signals: list[StatusSignal] = []
