from sentence_transformers import SentenceTransformer


class EmbeddingService:
    def __init__(self, model: SentenceTransformer) -> None:
        self.model = model

    def encode(self, text: str) -> list[float]:
        vector = self.model.encode(text, normalize_embeddings=True)
        return vector.tolist()

    def encode_batch(self, texts: list[str]) -> list[list[float]]:
        vectors = self.model.encode(texts, normalize_embeddings=True)
        return vectors.tolist()
