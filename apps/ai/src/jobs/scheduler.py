import logging
import os
from functools import partial

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from src.jobs.recluster import recluster_job
from src.jobs.report import daily_report_job, weekly_report_job

logger = logging.getLogger(__name__)


def setup_scheduler(app_state: object) -> AsyncIOScheduler:
    callback_url = os.getenv("WEB_CALLBACK_URL", "http://localhost:3000/api")
    scheduler = AsyncIOScheduler()

    scheduler.add_job(
        partial(recluster_job, app_state, callback_url),
        trigger=IntervalTrigger(hours=6),
        id="recluster",
        name="Recluster all embeddings",
        replace_existing=True,
    )

    scheduler.add_job(
        partial(daily_report_job, app_state, callback_url),
        trigger=CronTrigger(hour=9, minute=0, timezone="Asia/Seoul"),
        id="daily_report",
        name="Daily report generation",
        replace_existing=True,
    )

    scheduler.add_job(
        partial(weekly_report_job, app_state, callback_url),
        trigger=CronTrigger(
            day_of_week="mon", hour=9, minute=0, timezone="Asia/Seoul"
        ),
        id="weekly_report",
        name="Weekly report generation",
        replace_existing=True,
    )

    return scheduler


def start_scheduler(app_state: object) -> AsyncIOScheduler:
    scheduler = setup_scheduler(app_state)
    scheduler.start()
    logger.info("Scheduler started with %d jobs", len(scheduler.get_jobs()))
    return scheduler
