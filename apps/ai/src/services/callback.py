import logging
from typing import Any

import httpx

from src.models.schemas import AIProcessingResult

logger = logging.getLogger(__name__)

TIMEOUT = httpx.Timeout(30.0, connect=10.0)
MAX_RETRIES = 1


class CallbackService:
    def __init__(self) -> None:
        self.client = httpx.AsyncClient(timeout=TIMEOUT)

    async def _post(self, url: str, payload: dict[str, Any]) -> bool:
        for attempt in range(MAX_RETRIES + 1):
            try:
                response = await self.client.post(url, json=payload)
                response.raise_for_status()
                return True
            except httpx.HTTPError:
                if attempt < MAX_RETRIES:
                    logger.warning(
                        "Callback to %s failed (attempt %d), retrying...",
                        url,
                        attempt + 1,
                    )
                else:
                    logger.exception(
                        "Callback to %s failed after %d attempts",
                        url,
                        MAX_RETRIES + 1,
                    )
        return False

    async def send_ai_results(
        self,
        callback_url: str,
        result: AIProcessingResult,
    ) -> bool:
        # Convert Pydantic model to camelCase payload for the web callback
        payload = {
            "pageId": result.page_id,
            "noteType": result.note_type,
            "tags": [{"name": t.name, "score": t.score} for t in result.tags],
            "summary": result.summary,
            "embedding": result.embedding,
            "clusterId": result.cluster_id,
            "entities": [
                {"type": e.type, "value": e.value, "metadata": e.metadata}
                for e in result.entities
            ],
            "todos": [
                {
                    "title": t.title,
                    "priority": t.priority,
                    "dueDate": t.due_date,
                    "assignee": t.assignee,
                }
                for t in result.todos
            ],
            "confidence": result.confidence,
            "statusSignals": [
                {
                    "signal": s.signal,
                    "keyword": s.keyword,
                    "context": s.context,
                }
                for s in result.status_signals
            ],
        }
        return await self._post(callback_url, payload)

    async def send_cluster_results(
        self,
        callback_url: str,
        clusters: dict,
    ) -> bool:
        payload = {
            "clusters": clusters.get("clusters", []),
            "noise": clusters.get("noise", []),
        }
        return await self._post(callback_url, payload)

    async def send_report(
        self,
        callback_url: str,
        report_data: dict,
    ) -> bool:
        return await self._post(callback_url, report_data)

    async def close(self) -> None:
        await self.client.aclose()
