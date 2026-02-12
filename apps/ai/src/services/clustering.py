import logging

import hdbscan
import numpy as np

logger = logging.getLogger(__name__)

MIN_ITEMS_FOR_CLUSTERING = 10


class ClusteringService:
    def cluster(
        self,
        embeddings: list[tuple[str, list[float]]],
    ) -> dict:
        page_ids = [item[0] for item in embeddings]
        vectors = [item[1] for item in embeddings]

        if len(embeddings) < MIN_ITEMS_FOR_CLUSTERING:
            return {
                "clusters": [],
                "noise": page_ids,
            }

        matrix = np.array(vectors, dtype=np.float32)

        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=3,
            min_samples=2,
            metric="euclidean",
            prediction_data=True,
        )
        labels = clusterer.fit_predict(matrix)

        cluster_map: dict[int, list[str]] = {}
        noise: list[str] = []

        for page_id, label in zip(page_ids, labels):
            if label == -1:
                noise.append(page_id)
            else:
                cluster_map.setdefault(label, []).append(page_id)

        clusters = [
            {"cluster_id": cid, "page_ids": pids}
            for cid, pids in sorted(cluster_map.items())
        ]

        return {
            "clusters": clusters,
            "noise": noise,
            "_clusterer": clusterer,
        }

    def approximate_predict(
        self,
        clusterer: hdbscan.HDBSCAN,
        vector: list[float],
    ) -> int:
        try:
            point = np.array([vector], dtype=np.float32)
            labels, _ = hdbscan.approximate_predict(clusterer, point)
            return int(labels[0])
        except Exception:
            logger.exception("approximate_predict failed")
            return -1
