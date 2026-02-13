"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type {
  DatabaseProperty,
  SelectConfig,
  DateConfig,
  SelectColor,
} from "./types";
import { COLOR_CLASSES } from "./types";
import { CellRenderer } from "./cell-renderer";

interface CellEditorProps {
  value: unknown;
  property: DatabaseProperty;
  onChange: (value: unknown) => void;
  onBlur: () => void;
}

function TextEditor({ value, onChange, onBlur }: CellEditorProps) {
  return (
    <input
      type="text"
      className="h-full w-full border-none bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      autoFocus
    />
  );
}

function NumberEditor({ value, onChange, onBlur }: CellEditorProps) {
  return (
    <input
      type="number"
      className="h-full w-full border-none bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
      value={value != null ? String(value) : ""}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? null : Number(v));
      }}
      onBlur={onBlur}
      autoFocus
    />
  );
}

function SelectEditor({ value, property, onChange, onBlur }: CellEditorProps) {
  const [open, setOpen] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        onBlur();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onBlur]);

  const config = property.config as SelectConfig | null;
  const options = config?.options ?? [];

  return (
    <div ref={ref} className="relative">
      <div className="px-2 py-1 text-sm">{options.find((o) => o.id === value)?.name ?? "선택..."}</div>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {options.map((option) => {
            const colors = COLOR_CLASSES[option.color as SelectColor] ?? COLOR_CLASSES.gray;
            return (
              <button
                key={option.id}
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${
                  option.id === value ? "bg-gray-50" : ""
                }`}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                  onBlur();
                }}
              >
                <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                  {option.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MultiSelectEditor({ value, property, onChange, onBlur }: CellEditorProps) {
  const [open, setOpen] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const selected = Array.isArray(value) ? (value as string[]) : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        onBlur();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onBlur]);

  const config = property.config as SelectConfig | null;
  const options = config?.options ?? [];

  const toggle = useCallback(
    (id: string) => {
      const next = selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id];
      onChange(next);
    },
    [selected, onChange]
  );

  return (
    <div ref={ref} className="relative">
      <div className="flex flex-wrap gap-1 px-2 py-1">
        {selected.length === 0 && <span className="text-sm text-gray-400">선택...</span>}
        {selected.map((id) => {
          const option = options.find((o) => o.id === id);
          if (!option) return null;
          const colors = COLOR_CLASSES[option.color as SelectColor] ?? COLOR_CLASSES.gray;
          return (
            <span key={id} className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
              {option.name}
            </span>
          );
        })}
      </div>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {options.map((option) => {
            const isSelected = selected.includes(option.id);
            const colors = COLOR_CLASSES[option.color as SelectColor] ?? COLOR_CLASSES.gray;
            return (
              <button
                key={option.id}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                onClick={() => toggle(option.id)}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"
                  }`}
                >
                  {isSelected && (
                    <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </span>
                <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                  {option.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DateEditor({ value, property, onChange, onBlur }: CellEditorProps) {
  const config = property.config as DateConfig | null;
  const inputType = config?.includeTime ? "datetime-local" : "date";

  let inputValue = "";
  if (value) {
    try {
      const date = new Date(value as string | number);
      if (config?.includeTime) {
        inputValue = date.toISOString().slice(0, 16);
      } else {
        inputValue = date.toISOString().slice(0, 10);
      }
    } catch {
      inputValue = String(value);
    }
  }

  return (
    <input
      type={inputType}
      className="h-full w-full border-none bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
      value={inputValue}
      onChange={(e) => onChange(e.target.value || null)}
      onBlur={onBlur}
      autoFocus
    />
  );
}

function CheckboxEditor({ value, onChange }: CellEditorProps) {
  return (
    <button
      type="button"
      className="flex h-full w-full items-center justify-center"
      onClick={() => onChange(!value)}
    >
      {value ? (
        <svg className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg className="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <rect x="3" y="3" width="14" height="14" rx="2" />
        </svg>
      )}
    </button>
  );
}

function UrlEditor({ value, onChange, onBlur }: CellEditorProps) {
  return (
    <input
      type="url"
      className="h-full w-full border-none bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder="https://"
      autoFocus
    />
  );
}

function EmailEditor({ value, onChange, onBlur }: CellEditorProps) {
  return (
    <input
      type="email"
      className="h-full w-full border-none bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder="email@example.com"
      autoFocus
    />
  );
}

function PhoneEditor({ value, onChange, onBlur }: CellEditorProps) {
  return (
    <input
      type="tel"
      className="h-full w-full border-none bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder="010-0000-0000"
      autoFocus
    />
  );
}

function PersonEditor({ value, onChange, onBlur }: CellEditorProps) {
  return (
    <input
      type="text"
      className="h-full w-full border-none bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder="사용자 ID"
      autoFocus
    />
  );
}

function RelationEditor({ value, onChange, onBlur }: CellEditorProps) {
  const ids = Array.isArray(value) ? value.join(", ") : String(value ?? "");
  return (
    <input
      type="text"
      className="h-full w-full border-none bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
      value={ids}
      onChange={(e) => {
        const parts = e.target.value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        onChange(parts);
      }}
      onBlur={onBlur}
      placeholder="레코드 ID (쉼표 구분)"
      autoFocus
    />
  );
}

export function CellEditor({ value, property, onChange, onBlur }: CellEditorProps) {
  const props = { value, property, onChange, onBlur };

  switch (property.type) {
    case "text":
      return <TextEditor {...props} />;
    case "number":
      return <NumberEditor {...props} />;
    case "select":
      return <SelectEditor {...props} />;
    case "multi_select":
      return <MultiSelectEditor {...props} />;
    case "date":
      return <DateEditor {...props} />;
    case "checkbox":
      return <CheckboxEditor {...props} />;
    case "url":
      return <UrlEditor {...props} />;
    case "email":
      return <EmailEditor {...props} />;
    case "phone":
      return <PhoneEditor {...props} />;
    case "person":
      return <PersonEditor {...props} />;
    case "relation":
      return <RelationEditor {...props} />;
    case "formula":
      return <CellRenderer value={value} property={property} />;
    default:
      return <TextEditor {...props} />;
  }
}
