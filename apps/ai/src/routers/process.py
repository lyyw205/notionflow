import logging

from fastapi import APIRouter, BackgroundTasks, Request
from pydantic import BaseModel

from src.services.callback import CallbackService
from src.services.clustering import ClusteringService
from src.services.embedding import EmbeddingService
from src.services.keyword import KeywordService
from src.services.summarizer import SummarizerService

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
    callback_service: CallbackService,
) -> None:
    try:
        vector = embedding_service.encode(plain_text)
        tags = keyword_service.extract(plain_text)
        summary = summarizer_service.summarize(plain_text)

        cluster_id: int | None = None
        clusterer = getattr(clustering_service, "_last_clusterer", None)
        if clusterer is not None:
            cluster_id = clustering_service.approximate_predict(clusterer, vector)
            if cluster_id == -1:
                cluster_id = None

        await callback_service.send_ai_results(
            callback_url=callback_url,
            page_id=page_id,
            tags=tags,
            summary=summary,
            embedding=vector,
            cluster_id=cluster_id,
        )
        logger.info("Processed page %s successfully", page_id)
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
        callback_service=callback_service,
    )

    return ProcessResponse(status="accepted", page_id=body.page_id)
