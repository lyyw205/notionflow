"use client";

import { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { ko } from "date-fns/locale";
import type {
  Database,
  DatabaseView,
  DatabaseRecord,
  DatabaseProperty,
  CalendarViewConfig,
} from "../types";
import { RecordEditor } from "../record-editor";

interface CalendarViewProps {
  database: Database;
  activeView: DatabaseView;
  onAddRecord: (values?: Record<string, unknown>) => Promise<any>;
  onUpdateRecord: (
    recordId: string,
    params: { values?: Record<string, unknown> }
  ) => Promise<any>;
  onDeleteRecord: (recordId: string) => Promise<void>;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function getRecordDate(
  record: DatabaseRecord,
  datePropertyId: string
): Date | null {
  const value = record.values[datePropertyId];
  if (!value) return null;
  try {
    const date = new Date(value as string | number);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

export function CalendarView({
  database,
  activeView,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingRecord, setEditingRecord] = useState<DatabaseRecord | null>(
    null
  );

  const config = activeView.config as CalendarViewConfig | null;
  const datePropertyId = config?.dateProperty;

  const titleProperty = database.properties.find((p) => p.isTitle === 1);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const recordsByDay = useMemo(() => {
    if (!datePropertyId) return new Map<string, DatabaseRecord[]>();
    const map = new Map<string, DatabaseRecord[]>();
    for (const record of database.records) {
      const date = getRecordDate(record, datePropertyId);
      if (!date) continue;
      const key = format(date, "yyyy-MM-dd");
      const existing = map.get(key) ?? [];
      existing.push(record);
      map.set(key, existing);
    }
    return map;
  }, [database.records, datePropertyId]);

  const handlePrevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const handleNextMonth = () => setCurrentMonth((m) => addMonths(m, 1));

  const handleDayClick = async (day: Date) => {
    if (!datePropertyId) return;
    const values: Record<string, unknown> = {
      [datePropertyId]: format(day, "yyyy-MM-dd"),
    };
    await onAddRecord(values);
  };

  const handleRecordClick = (record: DatabaseRecord) => {
    setEditingRecord(record);
  };

  if (!datePropertyId) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500">
        날짜 속성을 설정해주세요
      </div>
    );
  }

  const today = new Date();

  return (
    <div className="p-4">
      {/* Header navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
        >
          &lt; 이전
        </button>
        <h3 className="text-sm font-medium text-gray-900">
          {format(currentMonth, "yyyy년 M월", { locale: ko })}
        </h3>
        <button
          onClick={handleNextMonth}
          className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
        >
          다음 &gt;
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 py-2 border-b"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayRecords = recordsByDay.get(dayKey) ?? [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={dayKey}
              className={`min-h-[100px] border p-1 cursor-pointer hover:bg-gray-50 ${
                isToday ? "border-blue-500 border-2" : "border-gray-200"
              }`}
              onClick={() => handleDayClick(day)}
            >
              <div
                className={`text-xs font-medium mb-1 ${
                  isCurrentMonth ? "text-gray-900" : "text-gray-300"
                }`}
              >
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayRecords.map((record) => {
                  const title = titleProperty
                    ? String(record.values[titleProperty.id] ?? "")
                    : `레코드`;
                  return (
                    <div
                      key={record.id}
                      className="text-xs truncate bg-blue-100 rounded px-1 py-0.5 cursor-pointer hover:bg-blue-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRecordClick(record);
                      }}
                    >
                      {title || "제목 없음"}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Record editor modal */}
      {editingRecord && (
        <RecordEditor
          record={editingRecord}
          properties={database.properties}
          onUpdate={async (_recordId, values) => {
            await onUpdateRecord(editingRecord.id, { values });
          }}
          onDelete={async (recordId) => {
            await onDeleteRecord(recordId);
            setEditingRecord(null);
          }}
          onClose={() => setEditingRecord(null)}
        />
      )}
    </div>
  );
}
