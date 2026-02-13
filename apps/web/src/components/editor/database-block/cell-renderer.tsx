"use client";

import { format } from "date-fns";
import type {
  DatabaseProperty,
  NumberConfig,
  DateConfig,
  SelectConfig,
  SelectColor,
  FormulaConfig,
  DatabaseRecord,
} from "./types";
import { COLOR_CLASSES } from "./types";
import { evaluateFormula, buildFormulaContext } from "./formula-engine";

interface CellRendererProps {
  value: unknown;
  property: DatabaseProperty;
  record?: DatabaseRecord;
  properties?: DatabaseProperty[];
}

function renderText(value: unknown) {
  return <span className="truncate">{String(value ?? "")}</span>;
}

function renderNumber(value: unknown, property: DatabaseProperty) {
  if (value == null || value === "") return <span />;
  const num = Number(value);
  if (Number.isNaN(num)) return <span>{String(value)}</span>;

  const config = property.config as NumberConfig | null;
  const fmt = config?.format ?? "number";

  let display: string;
  if (fmt === "currency") {
    display = num.toLocaleString("ko-KR", { style: "currency", currency: "KRW" });
  } else if (fmt === "percent") {
    display = num.toLocaleString("ko-KR", { style: "percent", minimumFractionDigits: 0 });
  } else {
    display = num.toLocaleString("ko-KR");
  }

  return <span className="tabular-nums">{display}</span>;
}

function renderSelect(value: unknown, property: DatabaseProperty) {
  if (!value) return <span />;
  const config = property.config as SelectConfig | null;
  const option = config?.options.find((o) => o.id === value);
  if (!option) return <span>{String(value)}</span>;

  const colors = COLOR_CLASSES[option.color as SelectColor] ?? COLOR_CLASSES.gray;
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
      {option.name}
    </span>
  );
}

function renderMultiSelect(value: unknown, property: DatabaseProperty) {
  if (!Array.isArray(value) || value.length === 0) return <span />;
  const config = property.config as SelectConfig | null;

  return (
    <div className="flex flex-wrap gap-1">
      {value.map((id) => {
        const option = config?.options.find((o) => o.id === id);
        if (!option) return null;
        const colors = COLOR_CLASSES[option.color as SelectColor] ?? COLOR_CLASSES.gray;
        return (
          <span
            key={option.id}
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
          >
            {option.name}
          </span>
        );
      })}
    </div>
  );
}

function renderDate(value: unknown, property: DatabaseProperty) {
  if (!value) return <span />;
  const config = property.config as DateConfig | null;

  try {
    const date = new Date(value as string | number);
    const pattern = config?.includeTime ? "yyyy-MM-dd HH:mm" : "yyyy-MM-dd";
    return <span>{format(date, pattern)}</span>;
  } catch {
    return <span>{String(value)}</span>;
  }
}

function renderCheckbox(value: unknown) {
  return (
    <span className="flex items-center justify-center">
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
    </span>
  );
}

function renderUrl(value: unknown) {
  if (!value) return <span />;
  const url = String(value);
  const display = url.replace(/^https?:\/\//, "").slice(0, 30);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="truncate text-blue-600 underline hover:text-blue-800"
    >
      {display}
    </a>
  );
}

function renderEmail(value: unknown) {
  if (!value) return <span />;
  const email = String(value);
  return (
    <a href={`mailto:${email}`} className="truncate text-blue-600 underline hover:text-blue-800">
      {email}
    </a>
  );
}

function renderPhone(value: unknown) {
  if (!value) return <span />;
  const phone = String(value);
  return (
    <a href={`tel:${phone}`} className="truncate text-blue-600 underline hover:text-blue-800">
      {phone}
    </a>
  );
}

function renderPerson(value: unknown) {
  if (!value) return <span />;
  const name = String(value);
  const initial = name.charAt(0).toUpperCase();
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-600">
        {initial}
      </span>
      <span className="truncate text-sm">{name}</span>
    </span>
  );
}

function renderRelation(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return <span />;
  return (
    <div className="flex flex-wrap gap-1">
      {value.map((id, i) => (
        <span key={String(id)} className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
          Record #{i + 1}
        </span>
      ))}
    </div>
  );
}

function renderFormula(
  property: DatabaseProperty,
  record?: DatabaseRecord,
  properties?: DatabaseProperty[]
) {
  if (!record || !properties) return <span />;
  const config = property.config as FormulaConfig | null;
  if (!config?.expression) return <span />;

  const context = buildFormulaContext(record, properties);
  const result = evaluateFormula(config.expression, context);
  if (result == null) return <span className="text-gray-400">Error</span>;
  return <span>{String(result)}</span>;
}

export function CellRenderer({ value, property, record, properties }: CellRendererProps) {
  switch (property.type) {
    case "text":
      return renderText(value);
    case "number":
      return renderNumber(value, property);
    case "select":
      return renderSelect(value, property);
    case "multi_select":
      return renderMultiSelect(value, property);
    case "date":
      return renderDate(value, property);
    case "checkbox":
      return renderCheckbox(value);
    case "url":
      return renderUrl(value);
    case "email":
      return renderEmail(value);
    case "phone":
      return renderPhone(value);
    case "person":
      return renderPerson(value);
    case "relation":
      return renderRelation(value);
    case "formula":
      return renderFormula(property, record, properties);
    default:
      return <span>{String(value ?? "")}</span>;
  }
}
