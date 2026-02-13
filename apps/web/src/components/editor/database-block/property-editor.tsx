"use client";

import { useState } from "react";
import type {
  DatabaseProperty,
  PropertyType,
  SelectOption,
  SelectConfig,
  NumberConfig,
  DateConfig,
  RelationConfig,
  FormulaConfig,
} from "./types";
import {
  PROPERTY_TYPE_LABELS,
  SELECT_COLORS,
  COLOR_CLASSES,
} from "./types";

const PROPERTY_TYPES = Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[];

interface PropertyEditorProps {
  property?: DatabaseProperty | null;
  onSave: (params: { name: string; type: PropertyType; config?: Record<string, unknown> }) => void;
  onDelete?: (propertyId: string) => void;
  onClose: () => void;
}

export function PropertyEditor({ property, onSave, onDelete, onClose }: PropertyEditorProps) {
  const isEditing = !!property;

  const [name, setName] = useState(property?.name ?? "");
  const [type, setType] = useState<PropertyType>(property?.type ?? "text");

  // Select/Multi-select options
  const existingOptions = property?.config && "options" in property.config
    ? (property.config as SelectConfig).options
    : [];
  const [options, setOptions] = useState<SelectOption[]>(existingOptions);
  const [newOptionName, setNewOptionName] = useState("");

  // Number config
  const existingNumberFormat = property?.config && "format" in property.config
    ? (property.config as NumberConfig).format
    : "number";
  const [numberFormat, setNumberFormat] = useState<"number" | "currency" | "percent">(existingNumberFormat ?? "number");

  // Date config
  const existingIncludeTime = property?.config && "includeTime" in property.config
    ? (property.config as DateConfig).includeTime
    : false;
  const [includeTime, setIncludeTime] = useState(existingIncludeTime ?? false);

  // Relation config
  const existingTargetDb = property?.config && "targetDatabaseId" in property.config
    ? (property.config as RelationConfig).targetDatabaseId
    : "";
  const [targetDatabaseId, setTargetDatabaseId] = useState(existingTargetDb);

  // Formula config
  const existingExpression = property?.config && "expression" in property.config
    ? (property.config as FormulaConfig).expression
    : "";
  const [expression, setExpression] = useState(existingExpression);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const buildConfig = (): Record<string, unknown> | undefined => {
    if (type === "select" || type === "multi_select") {
      return { options };
    }
    if (type === "number") {
      return { format: numberFormat };
    }
    if (type === "date") {
      return { includeTime };
    }
    if (type === "relation") {
      return { targetDatabaseId };
    }
    if (type === "formula") {
      return { expression };
    }
    return undefined;
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), type, config: buildConfig() });
  };

  const addOption = () => {
    if (!newOptionName.trim()) return;
    const color = SELECT_COLORS[options.length % SELECT_COLORS.length];
    setOptions([...options, { id: crypto.randomUUID(), name: newOptionName.trim(), color }]);
    setNewOptionName("");
  };

  const removeOption = (id: string) => {
    setOptions(options.filter((o) => o.id !== id));
  };

  const updateOptionColor = (id: string, color: string) => {
    setOptions(options.map((o) => (o.id === id ? { ...o, color } : o)));
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-sm text-gray-900">
            {isEditing ? "속성 편집" : "속성 추가"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            &times;
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Property name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="속성 이름"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400"
            />
          </div>

          {/* Property type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">유형</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PropertyType)}
              disabled={isEditing && property?.isTitle === 1}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white disabled:bg-gray-100"
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PROPERTY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Select / Multi-select options */}
          {(type === "select" || type === "multi_select") && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">옵션</label>
              <div className="space-y-1.5 mb-2">
                {options.map((opt) => {
                  const colorKey = opt.color as keyof typeof COLOR_CLASSES;
                  const cc = COLOR_CLASSES[colorKey] ?? COLOR_CLASSES.gray;
                  return (
                    <div key={opt.id} className="flex items-center gap-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs ${cc.bg} ${cc.text}`}>
                        {opt.name}
                      </span>
                      {/* Color picker */}
                      <select
                        value={opt.color}
                        onChange={(e) => updateOptionColor(opt.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded px-1 py-0.5"
                      >
                        {SELECT_COLORS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeOption(opt.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        삭제
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input
                  value={newOptionName}
                  onChange={(e) => setNewOptionName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addOption()}
                  placeholder="옵션 이름"
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-400"
                />
                <button
                  onClick={addOption}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-sm rounded transition-colors"
                >
                  추가
                </button>
              </div>
            </div>
          )}

          {/* Number format */}
          {type === "number" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">형식</label>
              <select
                value={numberFormat}
                onChange={(e) => setNumberFormat(e.target.value as "number" | "currency" | "percent")}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white"
              >
                <option value="number">숫자</option>
                <option value="currency">통화</option>
                <option value="percent">퍼센트</option>
              </select>
            </div>
          )}

          {/* Date include time */}
          {type === "date" && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeTime}
                onChange={(e) => setIncludeTime(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">시간 포함</span>
            </label>
          )}

          {/* Relation target */}
          {type === "relation" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">대상 데이터베이스 ID</label>
              <input
                value={targetDatabaseId}
                onChange={(e) => setTargetDatabaseId(e.target.value)}
                placeholder="데이터베이스 ID"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400"
              />
            </div>
          )}

          {/* Formula expression */}
          {type === "formula" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">수식</label>
              <input
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="예: price * quantity"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm font-mono outline-none focus:border-blue-400"
              />
              <p className="text-xs text-gray-400 mt-1">속성 이름을 변수로 사용합니다 (공백은 _로 치환)</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div>
            {isEditing && onDelete && property && property.isTitle !== 1 && (
              <>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600">정말 삭제하시겠습니까?</span>
                    <button
                      onClick={() => onDelete(property.id)}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      삭제
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-2 py-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    삭제
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isEditing ? "저장" : "추가"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
