from fastapi import APIRouter, Request
from pydantic import BaseModel

from src.services.clustering import ClusteringService

router = APIRouter()


class EmbeddingItem(BaseModel):
    page_id: str
    vector: list[float]


class ClusterRequest(BaseModel):
    embeddings: list[EmbeddingItem]


class ClusterGroup(BaseModel):
    cluster_id: int
    page_ids: list[str]


class ClusterResponse(BaseModel):
    clusters: list[ClusterGroup]
    noise: list[str]


@router.post("/cluster", response_model=ClusterResponse)
async def cluster_endpoint(
    body: ClusterRequest,
    request: Request,
) -> ClusterResponse:
    service: ClusteringService = request.app.state.clustering_service

    items = [(e.page_id, e.vector) for e in body.embeddings]
    result = service.cluster(items)

    clusterer = result.pop("_clusterer", None)
    if clusterer is not None:
        service._last_clusterer = clusterer

    return ClusterResponse(
        clusters=[ClusterGroup(**c) for c in result["clusters"]],
        noise=result["noise"],
    )
