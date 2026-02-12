import yake


class KeywordService:
    def __init__(self) -> None:
        self.extractor = yake.KeywordExtractor(
            lan="ko",
            n=2,
            dedupLim=0.3,
            top=20,
            features=None,
        )

    def extract(self, text: str, top_n: int = 10) -> list[dict]:
        if not text or not text.strip():
            return []

        keywords = self.extractor.extract_keywords(text)
        results = []
        for keyword, score in keywords[:top_n]:
            results.append({
                "name": keyword,
                "score": round(1.0 - score, 4),
            })
        return results
