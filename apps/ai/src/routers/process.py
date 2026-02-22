import logging

from fastapi import APIRouter, BackgroundTasks, Request
from pydantic import BaseModel

from src.models.schemas import AIProcessingResult
from src.services.callback import CallbackService
from src.services.classifier import ClassifierService
from src.services.clustering import ClusteringService
from src.services.embedding import EmbeddingService
from src.services.entity_extractor import EntityExtractor
from src.services.keyword import KeywordService
from src.services.project_matcher import ProjectMatcher
from src.services.status_detector import StatusDetector
from src.services.summarizer import SummarizerService
from src.services.todo_extractor import TodoExtractor

logger = logging.getLogger(__name__)

router = APIRouter()


class ProcessRequest(BaseModel):
    page_id: str
    plain_text: str
    callback_url: str


class ProcessResponse(BaseModel):
    status: str
    page_id: str


async def process_page(
    page_id: str,
    plain_text: str,
    callback_url: str,
    embedding_service: EmbeddingService,
    keyword_service: KeywordService,
    summarizer_service: SummarizerService,
    clustering_service: ClusteringService,
    classifier_service: ClassifierService,
    entity_extractor: EntityExtractor,
    todo_extractor: TodoExtractor,
    project_matcher: ProjectMatcher,
    status_detector: StatusDetector,
    callback_service: CallbackService,
) -> None:
    try:
        # Core processing
        vector = embedding_service.encode(plain_text)
        tags = keyword_service.extract(plain_text)
        summary = summarizer_service.summarize(plain_text)

        # Cluster assignment
        cluster_id: int | None = None
        clusterer = getattr(clustering_service, "_last_clusterer", None)
        if clusterer is not None:
            cluster_id = clustering_service.approximate_predict(clusterer, vector)
            if cluster_id == -1:
                cluster_id = None

        # Phase 2: Note type classification
        note_type, confidence = classifier_service.classify(
            plain_text, embedding=vector
        )

        # Phase 2: Entity extraction
        entities = entity_extractor.extract(plain_text)

        # Phase 2: Todo extraction
        todos = todo_extractor.extract(plain_text)

        # Phase 4: Status detection
        status_signals = status_detector.detect(plain_text)

        # Validate with Pydantic schema
        result = AIProcessingResult(
            page_id=page_id,
            note_type=note_type,
            tags=[{"name": t["name"], "score": t["score"]} for t in tags],
            summary=summary,
            embedding=vector,
            cluster_id=cluster_id,
            entities=entities,
            todos=todos,
            confidence=confidence,
            status_signals=status_signals,
        )

        await callback_service.send_ai_results(
            callback_url=callback_url,
            result=result,
        )
        logger.info(
            "Processed page %s: type=%s, entities=%d, todos=%d, signals=%d",
            page_id,
            note_type,
            len(entities),
            len(todos),
            len(status_signals),
        )
    except Exception:
        logger.exception("Failed to process page %s", page_id)


@router.post("/process", response_model=ProcessResponse, status_code=202)
async def process_endpoint(
    body: ProcessRequest,
    background_tasks: BackgroundTasks,
    request: Request,
) -> ProcessResponse:
    state = request.app.state

    embedding_service = EmbeddingService(state.sbert_model)
    keyword_service = KeywordService()
    summarizer_service = SummarizerService(state.kobart_tokenizer, state.kobart_model)
    clustering_service = state.clustering_service
    classifier_service = state.classifier_service
    entity_extractor = state.entity_extractor
    todo_extractor = state.todo_extractor
    project_matcher = state.project_matcher
    status_detector = state.status_detector
    callback_service = state.callback_service

    background_tasks.add_task(
        process_page,
        page_id=body.page_id,
        plain_text=body.plain_text,
        callback_url=body.callback_url,
        embedding_service=embedding_service,
        keyword_service=keyword_service,
        summarizer_service=summarizer_service,
        clustering_service=clustering_service,
        classifier_service=classifier_service,
        entity_extractor=entity_extractor,
        todo_extractor=todo_extractor,
        project_matcher=project_matcher,
        status_detector=status_detector,
        callback_service=callback_service,
    )

    return ProcessResponse(status="accepted", page_id=body.page_id)
