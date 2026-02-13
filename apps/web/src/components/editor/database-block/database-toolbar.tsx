"use client";

import { useState, useRef, useEffect } from "react";
import type { Database, DatabaseView, ViewType } from "./types";
import { VIEW_TYPE_LABELS } from "./types";

interface DatabaseToolbarProps {
  database: Database;
  views: DatabaseView[];
  activeViewId: string;
  onViewChange: (viewId: string) => void;
  onAddView: (name: string, type: ViewType) => void;
  onDeleteView: (viewId: string) => void;
  onDatabaseNameChange: (name: string) => void;
}

const VIEW_TYPES = Object.keys(VIEW_TYPE_LABELS) as ViewType[];

export function DatabaseToolbar({
  database,
  views,
  activeViewId,
  onViewChange,
  onAddView,
  onDeleteView,
  onDatabaseNameChange,
}: DatabaseToolbarProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(database.name);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ viewId: string; x: number; y: number } | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNameValue(database.name);
  }, [database.name]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setShowViewMenu(false);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleNameBlur = () => {
    setEditingName(false);
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== database.name) {
      onDatabaseNameChange(trimmed);
    } else {
      setNameValue(database.name);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      setNameValue(database.name);
      setEditingName(false);
    }
  };

  const handleAddView = (type: ViewType) => {
    const label = VIEW_TYPE_LABELS[type];
    const count = views.filter((v) => v.type === type).length;
    const name = count > 0 ? `${label} ${count + 1}` : label;
    onAddView(name, type);
    setShowViewMenu(false);
  };

  const handleViewContextMenu = (e: React.MouseEvent, viewId: string) => {
    e.preventDefault();
    if (views.length <= 1) return;
    setContextMenu({ viewId, x: e.clientX, y: e.clientY });
  };

  return (
    <div className="border-b border-gray-200 bg-white">
      {/* Database name */}
      <div className="px-4 pt-3 pb-1">
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            className="text-lg font-semibold bg-transparent outline-none border-b-2 border-blue-400 w-full"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-lg font-semibold text-gray-900 hover:bg-gray-100 rounded px-1 -ml-1 transition-colors"
          >
            {database.name || "제목 없음"}
          </button>
        )}
      </div>

      {/* View tabs and actions */}
      <div className="flex items-center gap-1 px-3 pb-0 overflow-x-auto">
        {/* View tabs */}
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            onContextMenu={(e) => handleViewContextMenu(e, view.id)}
            className={`
              flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-t transition-colors
              ${
                view.id === activeViewId
                  ? "bg-white text-blue-600 border border-gray-200 border-b-white -mb-px"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }
            `}
          >
            {view.name}
          </button>
        ))}

        {/* Add view button */}
        <div className="relative flex-shrink-0" ref={viewMenuRef}>
          <button
            onClick={() => setShowViewMenu((p) => !p)}
            className="px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
          >
            + 뷰 추가
          </button>
          {showViewMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[140px]">
              {VIEW_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => handleAddView(type)}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {VIEW_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Filter / Sort placeholders */}
        <button className="flex-shrink-0 px-2 py-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors">
          필터
        </button>
        <button className="flex-shrink-0 px-2 py-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors">
          정렬
        </button>
      </div>

      {/* View context menu (right-click to delete) */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              onDeleteView(contextMenu.viewId);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            뷰 삭제
          </button>
        </div>
      )}
    </div>
  );
}
