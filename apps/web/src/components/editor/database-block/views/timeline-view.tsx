"use client";

import { useState, useMemo } from "react";
import {
  format,
  differenceInDays,
  addDays,
  startOfDay,
  eachDayOfInterval,
  eachWeekOfInterval,
  startOfWeek,
  isSameDay,
} from "date-fns";
import { ko } from "date-fns/locale";
import type {
  Database,
  DatabaseView,
  DatabaseRecord,
  TimelineViewConfig,
} from "../types";

type ZoomLevel = "day" | "week" | "month";

interface TimelineViewProps {
  database: Database;
  activeView: DatabaseView;
  onUpdateRecord: (
    recordId: string,
    params: { values?: Record<string, unknown> }
  ) => Promise<any>;
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  try {
    const date = new Date(value as string | number);
    if (isNaN(date.getTime())) return null;
    return startOfDay(date);
  } catch {
    return null;
  }
}

const ZOOM_LABELS: Record<ZoomLevel, string> = {
  day: "일",
  week: "주",
  month: "월",
};

const COLUMN_WIDTHS: Record<ZoomLevel, number> = {
  day: 40,
  week: 60,
  month: 120,
};

export function TimelineView({
  database,
  activeView,
  onUpdateRecord,
}: TimelineViewProps) {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("week");

  const config = activeView.config as TimelineViewConfig | null;
  const startDatePropertyId = config?.startDateProperty;
  const endDatePropertyId = config?.endDateProperty;

  const titleProperty = database.properties.find((p) => p.isTitle === 1);

  const recordsWithDates = useMemo(() => {
    if (!startDatePropertyId || !endDatePropertyId) return [];
    return database.records
      .map((record) => {
        const startDate = parseDate(record.values[startDatePropertyId]);
        const endDate = parseDate(record.values[endDatePropertyId]);
        return { record, startDate, endDate };
      })
      .filter(
        (r): r is typeof r & { startDate: Date; endDate: Date } =>
          r.startDate !== null && r.endDate !== null
      );
  }, [database.records, startDatePropertyId, endDatePropertyId]);

  const timeRange = useMemo(() => {
    if (recordsWithDates.length === 0) {
      const today = new Date();
      return {
        start: addDays(today, -14),
        end: addDays(today, 14),
      };
    }
    let earliest = recordsWithDates[0].startDate;
    let latest = recordsWithDates[0].endDate;
    for (const r of recordsWithDates) {
      if (r.startDate < earliest) earliest = r.startDate;
      if (r.endDate > latest) latest = r.endDate;
    }
    return {
      start: addDays(earliest, -7),
      end: addDays(latest, 7),
    };
  }, [recordsWithDates]);

  const timeColumns = useMemo(() => {
    if (zoomLevel === "day") {
      return eachDayOfInterval({ start: timeRange.start, end: timeRange.end });
    } else if (zoomLevel === "week") {
      return eachWeekOfInterval(
        { start: timeRange.start, end: timeRange.end },
        { weekStartsOn: 1 }
      );
    } else {
      // month: generate first day of each month
      const months: Date[] = [];
      let current = new Date(
        timeRange.start.getFullYear(),
        timeRange.start.getMonth(),
        1
      );
      while (current <= timeRange.end) {
        months.push(new Date(current));
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }
      return months;
    }
  }, [timeRange, zoomLevel]);

  const totalWidth = timeColumns.length * COLUMN_WIDTHS[zoomLevel];
  const today = startOfDay(new Date());

  function getBarPosition(startDate: Date, endDate: Date) {
    const totalDays = differenceInDays(timeRange.end, timeRange.start) || 1;
    const startOffset = differenceInDays(startDate, timeRange.start);
    const duration = differenceInDays(endDate, startDate) + 1;

    const left = (startOffset / totalDays) * totalWidth;
    const width = Math.max((duration / totalDays) * totalWidth, 20);
    return { left, width };
  }

  function getTodayPosition() {
    const totalDays = differenceInDays(timeRange.end, timeRange.start) || 1;
    const offset = differenceInDays(today, timeRange.start);
    return (offset / totalDays) * totalWidth;
  }

  function formatColumnLabel(date: Date) {
    if (zoomLevel === "day") {
      return format(date, "M/d", { locale: ko });
    } else if (zoomLevel === "week") {
      return format(date, "M/d", { locale: ko });
    } else {
      return format(date, "yyyy.M", { locale: ko });
    }
  }

  if (!startDatePropertyId || !endDatePropertyId) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500">
        시작일/종료일 속성을 설정해주세요
      </div>
    );
  }

  const todayPos = getTodayPosition();

  return (
    <div className="p-4">
      {/* Zoom controls */}
      <div className="flex items-center gap-1 mb-4">
        {(["day", "week", "month"] as ZoomLevel[]).map((level) => (
          <button
            key={level}
            onClick={() => setZoomLevel(level)}
            className={`px-3 py-1 text-xs rounded ${
              zoomLevel === level
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {ZOOM_LABELS[level]}
          </button>
        ))}
      </div>

      <div className="flex border rounded overflow-hidden">
        {/* Left panel: record titles */}
        <div className="w-[200px] flex-shrink-0 bg-white border-r z-10">
          <div className="h-10 border-b bg-gray-50 flex items-center px-3 text-xs font-medium text-gray-500">
            이름
          </div>
          {recordsWithDates.map(({ record }) => {
            const title = titleProperty
              ? String(record.values[titleProperty.id] ?? "")
              : "레코드";
            return (
              <div
                key={record.id}
                className="h-10 border-b flex items-center px-3 text-sm truncate"
              >
                {title || "제목 없음"}
              </div>
            );
          })}
          {recordsWithDates.length === 0 && (
            <div className="h-10 flex items-center px-3 text-sm text-gray-400">
              레코드가 없습니다
            </div>
          )}
        </div>

        {/* Right panel: timeline */}
        <div className="flex-1 overflow-x-auto">
          <div className="relative" style={{ minWidth: `${totalWidth}px` }}>
            {/* Timeline header */}
            <div className="h-10 border-b bg-gray-50 flex">
              {timeColumns.map((date, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 flex items-center justify-center text-xs text-gray-500 border-r"
                  style={{ width: `${COLUMN_WIDTHS[zoomLevel]}px` }}
                >
                  {formatColumnLabel(date)}
                </div>
              ))}
            </div>

            {/* Grid lines */}
            <div className="absolute top-10 left-0 right-0 bottom-0 pointer-events-none">
              {timeColumns.map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-r border-dashed border-gray-100"
                  style={{
                    left: `${i * COLUMN_WIDTHS[zoomLevel]}px`,
                  }}
                />
              ))}
            </div>

            {/* Today marker */}
            {todayPos >= 0 && todayPos <= totalWidth && (
              <div
                className="absolute top-0 bottom-0 w-px bg-red-500 z-10"
                style={{ left: `${todayPos}px` }}
              />
            )}

            {/* Record bars */}
            {recordsWithDates.map(({ record, startDate, endDate }, index) => {
              const { left, width } = getBarPosition(startDate, endDate);
              const title = titleProperty
                ? String(record.values[titleProperty.id] ?? "")
                : "레코드";
              return (
                <div
                  key={record.id}
                  className="relative h-10 border-b"
                >
                  <div
                    className="absolute top-2 h-6 rounded bg-blue-400 text-white text-xs flex items-center px-2 truncate cursor-default"
                    style={{ left: `${left}px`, width: `${width}px` }}
                    title={`${title}: ${format(startDate, "M/d")} ~ ${format(endDate, "M/d")}`}
                  >
                    {width > 60 ? title || "제목 없음" : ""}
                  </div>
                </div>
              );
            })}

            {recordsWithDates.length === 0 && (
              <div className="h-10" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
