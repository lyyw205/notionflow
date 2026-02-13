"use client";

import React, { useState, Suspense, lazy } from "react";
import { useDatabase } from "./hooks/use-database";
import { DatabaseToolbar } from "./database-toolbar";
import type {
  Database,
  DatabaseProperty,
  DatabaseRecord,
  DatabaseView,
  ViewType,
  PropertyType,
} from "./types";

const TableView = lazy(() => import("./views/table-view").then((m) => ({ default: m.TableView })));
const BoardView = lazy(() => import("./views/board-view").then((m) => ({ default: m.BoardView })));
const ListView = lazy(() => import("./views/list-view").then((m) => ({ default: m.ListView })));
const CalendarView = lazy(() => import("./views/calendar-view").then((m) => ({ default: m.CalendarView })));
const TimelineView = lazy(() => import("./views/timeline-view").then((m) => ({ default: m.TimelineView })));
const GalleryView = lazy(() => import("./views/gallery-view").then((m) => ({ default: m.GalleryView })));
const ChartView = lazy(() => import("./views/chart-view").then((m) => ({ default: m.ChartView })));
const FeedView = lazy(() => import("./views/feed-view").then((m) => ({ default: m.FeedView })));
const MapView = lazy(() => import("./views/map-view").then((m) => ({ default: m.MapView })));

const VIEW_COMPONENTS: Record<ViewType, React.LazyExoticComponent<React.ComponentType<ViewProps>>> = {
  table: TableView,
  board: BoardView,
  list: ListView,
  calendar: CalendarView,
  timeline: TimelineView,
  gallery: GalleryView,
  chart: ChartView,
  feed: FeedView,
  map: MapView,
};

export interface ViewProps {
  database: Database;
  properties: DatabaseProperty[];
  records: DatabaseRecord[];
  views: DatabaseView[];
  activeView: DatabaseView;
  onAddRecord: (values?: Record<string, unknown>) => Promise<DatabaseRecord | null>;
  onUpdateRecord: (recordId: string, params: { values?: Record<string, unknown>; sortOrder?: number }) => Promise<DatabaseRecord | null>;
  onDeleteRecord: (recordId: string) => Promise<void>;
  onAddProperty: (name: string, type: PropertyType, config?: Record<string, unknown>) => Promise<DatabaseProperty | null>;
  onUpdateProperty: (propertyId: string, params: { name?: string; type?: string; config?: Record<string, unknown>; sortOrder?: number }) => Promise<DatabaseProperty | null>;
  onDeleteProperty: (propertyId: string) => Promise<void>;
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-4">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="h-6 bg-gray-100 rounded w-full" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-50 rounded w-full" />
        ))}
      </div>
    </div>
  );
}

function ViewFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full" />
    </div>
  );
}

interface DatabaseContainerProps {
  databaseId: string;
}

export function DatabaseContainer({ databaseId }: DatabaseContainerProps) {
  const {
    database,
    loading,
    error,
    updateDatabaseName,
    addProperty,
    updateProperty,
    removeProperty,
    addRecord,
    updateRecord,
    removeRecord,
    addView,
    removeView,
  } = useDatabase(databaseId);

  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-sm text-red-700">
        데이터베이스를 불러올 수 없습니다: {error}
      </div>
    );
  }

  if (!database) {
    return (
      <div className="border border-gray-200 bg-gray-50 rounded-lg p-4 text-sm text-gray-500">
        데이터베이스를 찾을 수 없습니다.
      </div>
    );
  }

  const views = database.views;
  const currentViewId = activeViewId ?? views[0]?.id ?? null;
  const activeView = views.find((v) => v.id === currentViewId) ?? views[0];

  if (!activeView) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-500">
        뷰가 없습니다. 뷰를 추가해주세요.
      </div>
    );
  }

  const ViewComponent = VIEW_COMPONENTS[activeView.type];

  const handleAddView = async (name: string, type: ViewType) => {
    const view = await addView(name, type);
    if (view) {
      setActiveViewId(view.id);
    }
  };

  const handleDeleteView = async (viewId: string) => {
    await removeView(viewId);
    if (currentViewId === viewId) {
      const remaining = views.filter((v) => v.id !== viewId);
      setActiveViewId(remaining[0]?.id ?? null);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden my-2">
      <DatabaseToolbar
        database={database}
        views={views}
        activeViewId={currentViewId}
        onViewChange={setActiveViewId}
        onAddView={handleAddView}
        onDeleteView={handleDeleteView}
        onDatabaseNameChange={updateDatabaseName}
      />
      <Suspense fallback={<ViewFallback />}>
        <ViewComponent
          database={database}
          properties={database.properties}
          records={database.records}
          views={views}
          activeView={activeView}
          onAddRecord={addRecord}
          onUpdateRecord={updateRecord}
          onDeleteRecord={removeRecord}
          onAddProperty={addProperty}
          onUpdateProperty={updateProperty}
          onDeleteProperty={removeProperty}
        />
      </Suspense>
    </div>
  );
}
