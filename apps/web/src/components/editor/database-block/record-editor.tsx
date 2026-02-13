"use client";

import { useState } from "react";
import type {
  DatabaseProperty,
  DatabaseRecord,
  SelectConfig,
  NumberConfig,
  DateConfig,
  FormulaConfig,
  SelectOption,
} from "./types";
import { COLOR_CLASSES, PROPERTY_TYPE_LABELS } from "./types";
import { evaluateFormula, buildFormulaContext } from "./formula-engine";

interface RecordEditorProps {
  record: DatabaseRecord;
  properties: DatabaseProperty[];
  onUpdate: (recordId: string, values: Record<string, unknown>) => void;
  onDelete: (recordId: string) => void;
  onClose: () => void;
}

export function RecordEditor({ record, properties, onUpdate, onDelete, onClose }: RecordEditorProps) {
  const [values, setValues] = useState<Record<string, unknown>>({ ...record.values });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const sortedProperties = [...properties].sort((a, b) => {
    if (a.isTitle && !b.isTitle) return -1;
    if (!a.isTitle && b.isTitle) return 1;
    return a.sortOrder - b.sortOrder;
  });

  const handleValueChange = (propertyId: string, value: unknown) => {
    const next = { ...values, [propertyId]: value };
    setValues(next);
    onUpdate(record.id, next);
  };

  const handleDelete = () => {
    onDelete(record.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <h3 className="font-semibold text-sm text-gray-900">레코드 편집</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            &times;
          </button>
        </div>

        {/* Properties form */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {sortedProperties.map((prop) => (
            <div key={prop.id} className="flex gap-3">
              <div className="w-28 flex-shrink-0 pt-1.5">
                <span className="text-xs font-medium text-gray-500">{prop.name}</span>
                <span className="text-[10px] text-gray-400 ml-1">
                  {PROPERTY_TYPE_LABELS[prop.type]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <CellEditorInline
                  property={prop}
                  value={values[prop.id]}
                  record={record}
                  properties={properties}
                  values={values}
                  onChange={(val) => handleValueChange(prop.id, val)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 flex-shrink-0">
          <div>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">정말 삭제하시겠습니까?</span>
                <button
                  onClick={handleDelete}
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
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline cell editor for the record editor form
function CellEditorInline({
  property,
  value,
  record,
  properties,
  values,
  onChange,
}: {
  property: DatabaseProperty;
  value: unknown;
  record: DatabaseRecord;
  properties: DatabaseProperty[];
  values: Record<string, unknown>;
  onChange: (value: unknown) => void;
}) {
  const inputClass = "w-full border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-400";

  switch (property.type) {
    case "text": {
      const textVal = typeof value === "string" ? value : "";
      return (
        <input
          type="text"
          value={textVal}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder="텍스트 입력..."
        />
      );
    }

    case "number": {
      const numVal = typeof value === "number" ? value : "";
      const config = property.config as NumberConfig | null;
      return (
        <div className="flex items-center gap-1">
          {config?.format === "currency" && <span className="text-sm text-gray-400">₩</span>}
          <input
            type="number"
            value={numVal}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            className={inputClass}
            placeholder="0"
          />
          {config?.format === "percent" && <span className="text-sm text-gray-400">%</span>}
        </div>
      );
    }

    case "select": {
      const config = property.config as SelectConfig | null;
      const options = config?.options ?? [];
      const selectVal = typeof value === "string" ? value : "";
      return (
        <select
          value={selectVal}
          onChange={(e) => onChange(e.target.value || null)}
          className={`${inputClass} bg-white`}
        >
          <option value="">선택...</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      );
    }

    case "multi_select": {
      const config = property.config as SelectConfig | null;
      const options = config?.options ?? [];
      const selectedIds = Array.isArray(value) ? (value as string[]) : [];
      const toggleOption = (optId: string) => {
        if (selectedIds.includes(optId)) {
          onChange(selectedIds.filter((id) => id !== optId));
        } else {
          onChange([...selectedIds, optId]);
        }
      };
      return (
        <div className="flex flex-wrap gap-1">
          {options.map((opt) => {
            const selected = selectedIds.includes(opt.id);
            const colorKey = opt.color as keyof typeof COLOR_CLASSES;
            const cc = COLOR_CLASSES[colorKey] ?? COLOR_CLASSES.gray;
            return (
              <button
                key={opt.id}
                onClick={() => toggleOption(opt.id)}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  selected ? `${cc.bg} ${cc.text} ring-1 ring-current` : "bg-gray-100 text-gray-500"
                }`}
              >
                {opt.name}
              </button>
            );
          })}
          {options.length === 0 && (
            <span className="text-xs text-gray-400">옵션이 없습니다</span>
          )}
        </div>
      );
    }

    case "date": {
      const config = property.config as DateConfig | null;
      const dateVal = typeof value === "string" ? value : "";
      return (
        <input
          type={config?.includeTime ? "datetime-local" : "date"}
          value={dateVal}
          onChange={(e) => onChange(e.target.value || null)}
          className={inputClass}
        />
      );
    }

    case "checkbox": {
      const checked = value === true || value === 1;
      return (
        <label className="flex items-center gap-2 py-1">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-500">{checked ? "완료" : "미완료"}</span>
        </label>
      );
    }

    case "url": {
      const urlVal = typeof value === "string" ? value : "";
      return (
        <input
          type="url"
          value={urlVal}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder="https://..."
        />
      );
    }

    case "email": {
      const emailVal = typeof value === "string" ? value : "";
      return (
        <input
          type="email"
          value={emailVal}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder="email@example.com"
        />
      );
    }

    case "phone": {
      const phoneVal = typeof value === "string" ? value : "";
      return (
        <input
          type="tel"
          value={phoneVal}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder="010-0000-0000"
        />
      );
    }

    case "person": {
      const personVal = typeof value === "string" ? value : "";
      return (
        <input
          type="text"
          value={personVal}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder="이름"
        />
      );
    }

    case "relation": {
      const relVal = typeof value === "string" ? value : "";
      return (
        <input
          type="text"
          value={relVal}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder="관계 레코드 ID"
        />
      );
    }

    case "formula": {
      const config = property.config as FormulaConfig | null;
      const formulaRecord = { ...record, values };
      const context = buildFormulaContext(formulaRecord, properties);
      const result = config?.expression ? evaluateFormula(config.expression, context) : null;
      return (
        <div className="px-2 py-1 text-sm text-gray-600 bg-gray-50 rounded border border-gray-200">
          {result !== null && result !== undefined ? String(result) : "-"}
        </div>
      );
    }

    default:
      return <span className="text-xs text-gray-400">지원되지 않는 유형</span>;
  }
}
