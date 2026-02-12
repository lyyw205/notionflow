import logging

from fastapi import APIRouter, BackgroundTasks, Request
from pydantic import BaseModel

from src.services.callback import CallbackService
from src.services.summarizer import SummarizerService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/report")


class ChangeItem(BaseModel):
    page_id: str
    title: str
    summary: str
    action: str


class ReportRequest(BaseModel):
    type: str
    period_start: str
    period_end: str
    changes: list[ChangeItem]
    callback_url: str


class ReportResponse(BaseModel):
    status: str


async def generate_report(
    report_type: str,
    period_start: str,
    period_end: str,
    changes: list[ChangeItem],
    callback_url: str,
    summarizer_service: SummarizerService,
    callback_service: CallbackService,
) -> None:
    try:
        change_lines = []
        for change in changes:
            change_lines.append(
                f"[{change.action}] {change.title}: {change.summary}"
            )
        combined_text = "\n".join(change_lines)

        if combined_text.strip():
            report_summary = summarizer_service.summarize(
                combined_text, max_length=256
            )
        else:
            report_summary = "변경 사항이 없습니다."

        report_data = {
            "type": report_type,
            "period_start": period_start,
            "period_end": period_end,
            "summary": report_summary,
            "total_changes": len(changes),
            "changes": [c.model_dump() for c in changes],
        }

        await callback_service.send_report(callback_url, report_data)
        logger.info(
            "Generated %s report for %s ~ %s",
            report_type,
            period_start,
            period_end,
        )
    except Exception:
        logger.exception("Failed to generate %s report", report_type)


@router.post("/generate", response_model=ReportResponse, status_code=202)
async def generate_report_endpoint(
    body: ReportRequest,
    background_tasks: BackgroundTasks,
    request: Request,
) -> ReportResponse:
    state = request.app.state
    summarizer_service = SummarizerService(state.kobart_tokenizer, state.kobart_model)
    callback_service = state.callback_service

    background_tasks.add_task(
        generate_report,
        report_type=body.type,
        period_start=body.period_start,
        period_end=body.period_end,
        changes=body.changes,
        callback_url=body.callback_url,
        summarizer_service=summarizer_service,
        callback_service=callback_service,
    )

    return ReportResponse(status="accepted")
