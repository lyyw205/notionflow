from fastapi import APIRouter, Request
from pydantic import BaseModel

from src.services.summarizer import SummarizerService

router = APIRouter()


class SummarizeRequest(BaseModel):
    text: str
    max_length: int = 128


class SummarizeResponse(BaseModel):
    summary: str


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_endpoint(
    body: SummarizeRequest,
    request: Request,
) -> SummarizeResponse:
    state = request.app.state
    service = SummarizerService(state.kobart_tokenizer, state.kobart_model)
    summary = service.summarize(body.text, max_length=body.max_length)
    return SummarizeResponse(summary=summary)
