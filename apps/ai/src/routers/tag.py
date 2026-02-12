from fastapi import APIRouter
from pydantic import BaseModel

from src.services.keyword import KeywordService

router = APIRouter()


class TagRequest(BaseModel):
    text: str
    top_n: int = 10


class TagItem(BaseModel):
    name: str
    score: float


class TagResponse(BaseModel):
    tags: list[TagItem]


@router.post("/tag", response_model=TagResponse)
async def tag_endpoint(body: TagRequest) -> TagResponse:
    service = KeywordService()
    tags = service.extract(body.text, top_n=body.top_n)
    return TagResponse(tags=[TagItem(**t) for t in tags])
