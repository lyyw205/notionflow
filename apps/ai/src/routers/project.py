import logging
import os

from fastapi import APIRouter, BackgroundTasks, Request
from pydantic import BaseModel

from src.services.callback import CallbackService
from src.services.summarizer import SummarizerService

logger = logging.getLogger(__name__)

router = APIRouter()

WEB_CALLBACK_URL = os.environ.get("WEB_CALLBACK_URL", "http://localhost:3000/api")


class MilestoneInput(BaseModel):
    id: str
    title: str
    status: str


class PageInput(BaseModel):
    id: str
    title: str
    content: str  # summary or truncated plain_text
    milestone_id: str | None = None


class ProjectAnalyzeRequest(BaseModel):
    project_id: str
    project_name: str
    callback_url: str
    milestones: list[MilestoneInput]
    pages: list[PageInput]


class ProjectAnalyzeResponse(BaseModel):
    status: str
    project_id: str


class MilestoneUpdate(BaseModel):
    milestoneId: str
    aiProgress: int
    aiSummary: str


async def analyze_project(
    project_id: str,
    project_name: str,
    callback_url: str,
    milestones_data: list[MilestoneInput],
    pages_data: list[PageInput],
    summarizer_service: SummarizerService,
    callback_service: CallbackService,
) -> None:
    try:
        milestone_updates = []

        for ms in milestones_data:
            ms_pages = [p for p in pages_data if p.milestone_id == ms.id]

            # Calculate progress
            if ms.status == "completed":
                ai_progress = 100
            elif len(ms_pages) == 0:
                ai_progress = 0
            else:
                pages_with_content = sum(1 for p in ms_pages if p.content.strip())
                ratio = pages_with_content / len(ms_pages) if ms_pages else 0
                ai_progress = min(int(ratio * 80), 95)

            # Summarize milestone pages
            ms_text = " ".join(p.content for p in ms_pages if p.content.strip())
            ai_summary = ""
            if ms_text.strip():
                ai_summary = summarizer_service.summarize(ms_text, max_length=128)

            milestone_updates.append(MilestoneUpdate(
                milestoneId=ms.id,
                aiProgress=ai_progress,
                aiSummary=ai_summary,
            ))

        # Overall progress: average of milestone progresses
        if milestone_updates:
            overall_progress = sum(m.aiProgress for m in milestone_updates) // len(milestone_updates)
        else:
            overall_progress = 0

        # Overall summary
        all_text = f"{project_name}. " + " ".join(p.content for p in pages_data if p.content.strip())
        overall_summary = ""
        if all_text.strip():
            overall_summary = summarizer_service.summarize(all_text, max_length=256)

        payload = {
            "projectId": project_id,
            "overallProgress": overall_progress,
            "aiSummary": overall_summary,
            "milestoneUpdates": [m.model_dump() for m in milestone_updates],
        }

        await callback_service._post(callback_url, payload)
        logger.info("Project analysis complete for %s", project_id)
    except Exception:
        logger.exception("Failed to analyze project %s", project_id)


@router.post("/project/analyze", response_model=ProjectAnalyzeResponse, status_code=202)
async def project_analyze_endpoint(
    body: ProjectAnalyzeRequest,
    background_tasks: BackgroundTasks,
    request: Request,
) -> ProjectAnalyzeResponse:
    state = request.app.state

    summarizer_service = SummarizerService(state.kobart_tokenizer, state.kobart_model)
    callback_service = state.callback_service

    background_tasks.add_task(
        analyze_project,
        project_id=body.project_id,
        project_name=body.project_name,
        callback_url=body.callback_url,
        milestones_data=body.milestones,
        pages_data=body.pages,
        summarizer_service=summarizer_service,
        callback_service=callback_service,
    )

    return ProjectAnalyzeResponse(status="accepted", project_id=body.project_id)
