import logging

from transformers import PreTrainedModel, PreTrainedTokenizerBase

logger = logging.getLogger(__name__)


class SummarizerService:
    def __init__(
        self,
        tokenizer: PreTrainedTokenizerBase,
        model: PreTrainedModel,
    ) -> None:
        self.tokenizer = tokenizer
        self.model = model

    def summarize(self, text: str, max_length: int = 128) -> str:
        if not text or not text.strip():
            return ""

        stripped = text.strip()
        if len(stripped) < 30:
            return stripped

        inputs = self.tokenizer(
            stripped,
            return_tensors="pt",
            max_length=1024,
            truncation=True,
        )
        inputs = {k: v.to(self.model.device) for k, v in inputs.items()}

        summary_ids = self.model.generate(
            **inputs,
            max_length=max_length,
            min_length=12,
            num_beams=4,
            length_penalty=1.0,
            no_repeat_ngram_size=3,
            early_stopping=True,
        )

        summary = self.tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        return summary
