"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Database, DatabaseView, MapViewConfig } from "../types";
import { CellRenderer } from "../cell-renderer";

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapViewInnerProps {
  database: Database;
  activeView: DatabaseView;
}

type MarkerRecord = Database["records"][number];

export default function MapViewInner({
  database,
  activeView,
}: MapViewInnerProps) {
  const config = (activeView.config ?? {}) as MapViewConfig;

  const titleProperty = useMemo(
    () => database.properties.find((p) => p.isTitle),
    [database.properties]
  );

  const otherProperties = useMemo(
    () =>
      [...database.properties]
        .filter(
          (p) => !p.isTitle && p.id !== config.latProperty && p.id !== config.lngProperty
        )
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [database.properties, config.latProperty, config.lngProperty]
  );

  const markers = useMemo(() => {
    if (!config.latProperty || !config.lngProperty) return [];

    const result: {
      id: string;
      lat: number;
      lng: number;
      title: string;
      record: MarkerRecord;
    }[] = [];

    for (const record of database.records) {
      const lat = Number(record.values[config.latProperty]);
      const lng = Number(record.values[config.lngProperty]);

      if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;

      const title = titleProperty
        ? String(record.values[titleProperty.id] ?? "")
        : "";

      result.push({ id: record.id, lat, lng, title, record });
    }

    return result;
  }, [database.records, config.latProperty, config.lngProperty, titleProperty]);

  if (!config.latProperty || !config.lngProperty) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        위도/경도 속성을 설정해주세요
      </div>
    );
  }

  if (markers.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        좌표 데이터가 있는 레코드가 없습니다
      </div>
    );
  }

  const center: [number, number] =
    markers.length > 0
      ? [markers[0].lat, markers[0].lng]
      : [37.5665, 126.978];

  return (
    <div className="h-[500px] w-full overflow-hidden rounded-lg">
      <MapContainer
        center={center}
        zoom={13}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker) => (
          <Marker key={marker.id} position={[marker.lat, marker.lng]}>
            <Popup>
              <div className="min-w-[150px]">
                <div className="mb-1 font-medium text-sm">
                  {marker.title || "제목 없음"}
                </div>
                {otherProperties.length > 0 && (
                  <div className="space-y-1">
                    {otherProperties.map((property) => {
                      const value = marker.record.values[property.id];
                      if (value == null || value === "") return null;
                      return (
                        <div
                          key={property.id}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          <span className="text-gray-400">
                            {property.name}:
                          </span>
                          <span className="text-gray-600">
                            <CellRenderer
                              value={value}
                              property={property}
                              record={marker.record}
                              properties={database.properties}
                            />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
