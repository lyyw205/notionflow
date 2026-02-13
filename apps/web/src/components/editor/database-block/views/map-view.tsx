"use client";

import dynamic from "next/dynamic";
import type { Database, DatabaseView } from "../types";

const MapViewInner = dynamic(() => import("./map-view-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
      지도를 불러오는 중...
    </div>
  ),
});

interface MapViewProps {
  database: Database;
  activeView: DatabaseView;
}

export function MapView({ database, activeView }: MapViewProps) {
  return <MapViewInner database={database} activeView={activeView} />;
}
