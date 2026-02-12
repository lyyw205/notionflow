from fastapi import APIRouter, Request
from pydantic import BaseModel

from src.services.embedding import EmbeddingService

router = APIRouter()


class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    vector: list[float]


@router.post("/embed", response_model=EmbedResponse)
async def embed_endpoint(body: EmbedRequest, request: Request) -> EmbedResponse:
    service = EmbeddingService(request.app.state.sbert_model)
    vector = service.encode(body.text)
    return EmbedResponse(vector=vector)
