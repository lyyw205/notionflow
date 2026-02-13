import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

from src.jobs.scheduler import start_scheduler
from src.routers import cluster, embed, process, project, report, summarize, tag
from src.services.callback import CallbackService
from src.services.clustering import ClusteringService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

SBERT_MODEL_NAME = "snunlp/KR-SBERT-V40K-klueNLI-augSTS"
KOBART_MODEL_NAME = "gogamza/kobart-summarization"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Loading KR-SBERT model: %s", SBERT_MODEL_NAME)
    app.state.sbert_model = SentenceTransformer(SBERT_MODEL_NAME)

    logger.info("Loading KoBART model: %s", KOBART_MODEL_NAME)
    app.state.kobart_tokenizer = AutoTokenizer.from_pretrained(KOBART_MODEL_NAME)
    app.state.kobart_model = AutoModelForSeq2SeqLM.from_pretrained(KOBART_MODEL_NAME)

    app.state.clustering_service = ClusteringService()
    app.state.callback_service = CallbackService()
    app.state.models_loaded = True

    logger.info("All models loaded successfully")

    app.state.scheduler = start_scheduler(app.state)

    yield

    app.state.scheduler.shutdown(wait=False)
    await app.state.callback_service.close()
    logger.info("Shutdown complete")


app = FastAPI(
    title="NotionFlow AI",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(process.router)
app.include_router(embed.router)
app.include_router(tag.router)
app.include_router(summarize.router)
app.include_router(cluster.router)
app.include_router(report.router)
app.include_router(project.router)


@app.get("/")
async def health_check() -> dict:
    models_loaded = getattr(app.state, "models_loaded", False)
    return {"status": "ok", "models_loaded": models_loaded}
