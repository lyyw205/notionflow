import logging
from datetime import datetime, timedelta, timezone

import httpx

from src.services.callback import CallbackService
from src.services.summarizer import SummarizerService

logger = logging.getLogger(__name__)

KST = timezone(timedelta(hours=9))
TIMEOUT = httpx.Timeout(60.0, connect=10.0)


async def _fetch_changes(
    callback_url: str,
    period_start: str,
    period_end: str,
) -> list[dict]:
    url = f"{callback_url}/ai/changes"
    params = {"period_start": period_start, "period_end": period_end}
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()
    return data.get("changes", [])


def _generate_summary(
    changes: list[dict],
    summarizer_service: SummarizerService,
) -> str:
    if not changes:
        return "변경 사항이 없습니다."

    lines = []
    for change in changes:
        title = change.get("title", "")
        summary = change.get("summary", "")
        action = change.get("action", "")
        lines.append(f"[{action}] {title}: {summary}")

    combined = "\n".join(lines)
    return summarizer_service.summarize(combined, max_length=256)


async def daily_report_job(app_state: object, callback_url: str) -> None:
    logger.info("Starting daily report job")

    try:
        now = datetime.now(tz=KST)
        period_end = now.isoformat()
        period_start = (now - timedelta(hours=24)).isoformat()

        changes = await _fetch_changes(callback_url, period_start, period_end)

        summarizer_service = SummarizerService(
            app_state.kobart_tokenizer,
            app_state.kobart_model,
        )
        report_summary = _generate_summary(changes, summarizer_service)

        report_data = {
            "type": "daily",
            "period_start": period_start,
            "period_end": period_end,
            "summary": report_summary,
            "total_changes": len(changes),
            "changes": changes,
        }

        callback_service: CallbackService = app_state.callback_service
        report_url = f"{callback_url}/ai/report"
        await callback_service.send_report(report_url, report_data)

        logger.info("Daily report sent with %d changes", len(changes))
    except Exception:
        logger.exception("Daily report job failed")


async def weekly_report_job(app_state: object, callback_url: str) -> None:
    logger.info("Starting weekly report job")

    try:
        now = datetime.now(tz=KST)
        period_end = now.isoformat()
        period_start = (now - timedelta(days=7)).isoformat()

        changes = await _fetch_changes(callback_url, period_start, period_end)

        summarizer_service = SummarizerService(
            app_state.kobart_tokenizer,
            app_state.kobart_model,
        )
        report_summary = _generate_summary(changes, summarizer_service)

        report_data = {
            "type": "weekly",
            "period_start": period_start,
            "period_end": period_end,
            "summary": report_summary,
            "total_changes": len(changes),
            "changes": changes,
        }

        callback_service: CallbackService = app_state.callback_service
        report_url = f"{callback_url}/ai/report"
        await callback_service.send_report(report_url, report_data)

        logger.info("Weekly report sent with %d changes", len(changes))
    except Exception:
        logger.exception("Weekly report job failed")
