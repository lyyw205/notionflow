"""Project auto-matching service using keyword + embedding + recency."""

from __future__ import annotations

import logging
import time

import numpy as np

logger = logging.getLogger(__name__)


class ProjectMatcher:
    """Matches a page to candidate projects using 3-stage weighted scoring."""

    def match(
        self,
        page_text: str,
        page_embedding: list[float],
        projects: list[dict],
        recent_project_ids: list[str] | None = None,
        top_k: int = 3,
    ) -> list[dict]:
        """
        Returns top-k project suggestions with confidence scores.

        Each project dict should have:
          - id: str
          - name: str
          - milestone_names: list[str]
          - centroid: list[float] | None  (average embedding of project pages)
        """
        if not projects:
            return []

        recent_set = set(recent_project_ids or [])
        page_vec = np.array(page_embedding)
        page_norm = np.linalg.norm(page_vec)
        if page_norm > 0:
            page_vec = page_vec / page_norm

        scored: list[dict] = []

        for proj in projects:
            # 1. Keyword matching (0.3)
            keyword_score = 0.0
            text_lower = page_text.lower()
            if proj["name"].lower() in text_lower:
                keyword_score = 1.0
            else:
                for ms_name in proj.get("milestone_names", []):
                    if ms_name.lower() in text_lower:
                        keyword_score = max(keyword_score, 0.6)

            # 2. Embedding similarity (0.5)
            embedding_score = 0.0
            centroid = proj.get("centroid")
            if centroid is not None and len(centroid) > 0:
                c_vec = np.array(centroid)
                c_norm = np.linalg.norm(c_vec)
                if c_norm > 0:
                    c_vec = c_vec / c_norm
                    embedding_score = float(np.dot(page_vec, c_vec))
                    embedding_score = max(0, (embedding_score + 1) / 2)

            # 3. Recency context (0.2)
            recency_score = 1.0 if proj["id"] in recent_set else 0.0

            final = 0.3 * keyword_score + 0.5 * embedding_score + 0.2 * recency_score

            if final > 0.1:
                scored.append({
                    "project_id": proj["id"],
                    "project_name": proj["name"],
                    "confidence": round(final, 4),
                })

        scored.sort(key=lambda x: x["confidence"], reverse=True)
        return scored[:top_k]
