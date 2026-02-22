"""Note type classifier using rule-based keyword matching + embedding similarity."""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

NoteType = str  # one of the 6 types

# Keyword patterns for each note type (Korean + English)
KEYWORD_PATTERNS: dict[str, list[re.Pattern[str]]] = {
    "meeting_note": [
        re.compile(r"회의록|회의\s*내용|미팅\s*노트|참석자|meeting\s*note", re.I),
        re.compile(r"회의\s*일시|안건|논의\s*사항|회의\s*결과", re.I),
    ],
    "todo": [
        re.compile(r"TODO|할\s*일|체크리스트|해야\s*할|작업\s*목록", re.I),
        re.compile(r"\[\s*\]|\[x\]|☐|☑|✅|⬜", re.I),
        re.compile(r"~해야\s*함|~필요|~할\s*것", re.I),
    ],
    "decision": [
        re.compile(r"결정\s*사항|의사\s*결정|결론|합의|decision", re.I),
        re.compile(r"결정:|확정:|승인:|최종\s*결정", re.I),
    ],
    "idea": [
        re.compile(r"아이디어|브레인스토밍|제안|발상|idea|proposal", re.I),
        re.compile(r"생각해\s*보면|어떨까|해보면|시도해", re.I),
    ],
    "reference": [
        re.compile(r"참고\s*자료|레퍼런스|reference|문서|가이드|매뉴얼", re.I),
        re.compile(r"https?://|참조|출처|인용", re.I),
    ],
    "log": [
        re.compile(r"일지|로그|기록|일기|작업\s*일지|개발\s*일지|log|journal", re.I),
        re.compile(r"\d{4}[-/]\d{2}[-/]\d{2}.*기록|진행\s*상황", re.I),
    ],
}

# Prototype sentences for embedding-based classification
PROTOTYPE_SENTENCES: dict[str, str] = {
    "meeting_note": "회의록 참석자 안건 논의사항 결정사항 다음 회의 일정",
    "todo": "할 일 목록 체크리스트 작업 완료 미완료 우선순위 마감일",
    "decision": "결정사항 합의 내용 최종 결론 승인 확정 방향 선택",
    "idea": "아이디어 제안 브레인스토밍 새로운 시도 가능성 개선",
    "reference": "참고자료 문서 가이드 링크 출처 레퍼런스 설명",
    "log": "작업 일지 진행 상황 기록 날짜별 개발 로그 변경사항",
}

NOTE_TYPES = list(KEYWORD_PATTERNS.keys())


class ClassifierService:
    """Classifies notes into 6 types using keywords + embedding similarity."""

    def __init__(self, sbert_model: SentenceTransformer | None = None) -> None:
        self._prototype_vectors: dict[str, np.ndarray] | None = None
        if sbert_model is not None:
            self._build_prototypes(sbert_model)

    def _build_prototypes(self, model: SentenceTransformer) -> None:
        """Pre-compute prototype vectors for each note type."""
        self._prototype_vectors = {}
        for note_type, sentence in PROTOTYPE_SENTENCES.items():
            vec = model.encode(sentence, normalize_embeddings=True)
            self._prototype_vectors[note_type] = np.array(vec)
        logger.info("Built %d note type prototype vectors", len(self._prototype_vectors))

    def classify(
        self,
        text: str,
        embedding: list[float] | None = None,
        keyword_weight: float = 0.4,
        embedding_weight: float = 0.6,
    ) -> tuple[NoteType, float]:
        """
        Classify text into a note type.

        Returns (note_type, confidence) where confidence is 0.0-1.0.
        """
        if not text.strip():
            return "log", 0.0

        # 1. Rule-based keyword scoring
        keyword_scores: dict[str, float] = {}
        for note_type, patterns in KEYWORD_PATTERNS.items():
            score = 0.0
            for pattern in patterns:
                matches = pattern.findall(text)
                score += len(matches) * 0.3
            keyword_scores[note_type] = min(score, 1.0)

        # 2. Embedding similarity scoring
        embedding_scores: dict[str, float] = {}
        if embedding is not None and self._prototype_vectors is not None:
            vec = np.array(embedding)
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            for note_type, proto in self._prototype_vectors.items():
                sim = float(np.dot(vec, proto))
                # Normalize similarity from [-1,1] to [0,1]
                embedding_scores[note_type] = (sim + 1.0) / 2.0

        # 3. Combine scores
        final_scores: dict[str, float] = {}
        for note_type in NOTE_TYPES:
            k_score = keyword_scores.get(note_type, 0.0)
            e_score = embedding_scores.get(note_type, 0.0)

            if embedding_scores:
                final_scores[note_type] = (
                    keyword_weight * k_score + embedding_weight * e_score
                )
            else:
                # No embedding available, use only keywords
                final_scores[note_type] = k_score

        best_type = max(final_scores, key=lambda k: final_scores[k])
        confidence = final_scores[best_type]

        # If no strong signal, default to "log"
        if confidence < 0.15:
            return "log", confidence

        return best_type, round(confidence, 4)
