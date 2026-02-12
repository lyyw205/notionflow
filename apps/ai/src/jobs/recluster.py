import logging

import httpx

from src.services.callback import CallbackService
from src.services.clustering import ClusteringService

logger = logging.getLogger(__name__)

TIMEOUT = httpx.Timeout(60.0, connect=10.0)


async def recluster_job(app_state: object, callback_url: str) -> None:
    logger.info("Starting recluster job")

    try:
        trigger_url = f"{callback_url}/ai/trigger-recluster"
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(trigger_url)
            response.raise_for_status()
            data = response.json()

        raw_embeddings = data.get("embeddings", [])
        if not raw_embeddings:
            logger.info("No embeddings returned, skipping recluster")
            return

        items = [
            (entry["page_id"], entry["vector"])
            for entry in raw_embeddings
        ]

        clustering_service: ClusteringService = app_state.clustering_service
        result = clustering_service.cluster(items)

        clusterer = result.pop("_clusterer", None)
        if clusterer is not None:
            clustering_service._last_clusterer = clusterer

        callback_service: CallbackService = app_state.callback_service
        cluster_result_url = f"{callback_url}/ai/cluster-results"
        await callback_service.send_cluster_results(cluster_result_url, result)

        logger.info(
            "Recluster complete: %d clusters, %d noise",
            len(result["clusters"]),
            len(result["noise"]),
        )
    except Exception:
        logger.exception("Recluster job failed")
