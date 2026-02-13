"use client";

import { useState, useCallback } from "react";
import type {
  Database,
  DatabaseProperty,
  DatabaseRecord,
  PropertyType,
} from "../types";
import { PROPERTY_TYPE_LABELS } from "../types";
import { CellRenderer } from "../cell-renderer";
import { CellEditor } from "../cell-editor";
import { PropertyEditor } from "../property-editor";

interface TableViewProps {
  database: Database;
  onAddRecord: (values?: Record<string, unknown>) => Promise<any>;
  onUpdateRecord: (
    recordId: string,
    params: { values?: Record<string, unknown> }
  ) => Promise<any>;
  onDeleteRecord: (recordId: string) => Promise<void>;
  onAddProperty: (
    name: string,
    type: PropertyType,
    config?: Record<string, unknown>
  ) => Promise<any>;
  onUpdateProperty: (propertyId: string, params: any) => Promise<any>;
  onDeleteProperty: (propertyId: string) => Promise<void>;
}

interface EditingCell {
  recordId: string;
  propertyId: string;
}

const TYPE_ICONS: Record<PropertyType, string> = {
  text: "Aa",
  number: "#",
  select: "v",
  multi_select: "##",
  date: "D",
  checkbox: "\u2611",
  url: "\u26d3",
  email: "@",
  phone: "\u260e",
  person: "\ud83d\udc64",
  relation: "\u2194",
  formula: "fx",
};

export function TableView({
  database,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
}: TableViewProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(
    null
  );
  const [menuRecordId, setMenuRecordId] = useState<string | null>(null);

  const sortedProperties = [...database.properties].sort(
    (a, b) => (b.isTitle ? 1 : 0) - (a.isTitle ? 1 : 0) || a.sortOrder - b.sortOrder
  );

  const sortedRecords = [...database.records].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  const handleCellClick = useCallback(
    (recordId: string, propertyId: string) => {
      setEditingCell({ recordId, propertyId });
    },
    []
  );

  const handleCellSave = useCallback(
    async (recordId: string, propertyId: string, value: unknown) => {
      const record = database.records.find((r) => r.id === recordId);
      if (!record) return;
      await onUpdateRecord(recordId, {
        values: { ...record.values, [propertyId]: value },
      });
      setEditingCell(null);
    },
    [database.records, onUpdateRecord]
  );

  const handleCellCancel = useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleAddRecord = useCallback(async () => {
    await onAddRecord();
  }, [onAddRecord]);

  const handleDeleteRecord = useCallback(
    async (recordId: string) => {
      setMenuRecordId(null);
      await onDeleteRecord(recordId);
    },
    [onDeleteRecord]
  );

  const handleAddProperty = useCallback(async () => {
    await onAddProperty("새 속성", "text");
  }, [onAddProperty]);

  const editingProperty = editingPropertyId
    ? database.properties.find((p) => p.id === editingPropertyId) ?? null
    : null;

  return (
    <div className="relative overflow-auto">
      {/* Property Editor Modal */}
      {editingProperty && (
        <PropertyEditor
          property={editingProperty}
          onSave={async (params) => {
            await onUpdateProperty(editingProperty.id, params);
            setEditingPropertyId(null);
          }}
          onDelete={async (propertyId) => {
            await onDeleteProperty(propertyId);
            setEditingPropertyId(null);
          }}
          onClose={() => setEditingPropertyId(null)}
        />
      )}

      <table className="w-full border-collapse text-sm">
        {/* Header */}
        <thead className="sticky top-0 z-10">
          <tr className="bg-gray-50">
            {/* Row actions spacer */}
            <th className="w-8 border-b border-r border-gray-200 bg-gray-50" />
            {sortedProperties.map((property) => (
              <th
                key={property.id}
                className="cursor-pointer border-b border-r border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600 hover:bg-gray-100"
                style={{
                  minWidth: property.isTitle ? 250 : 150,
                }}
                onClick={() => setEditingPropertyId(property.id)}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">
                    {TYPE_ICONS[property.type]}
                  </span>
                  <span className="truncate">{property.name}</span>
                </div>
              </th>
            ))}
            {/* Add property column */}
            <th className="w-10 border-b border-gray-200 bg-gray-50">
              <button
                className="flex h-full w-full items-center justify-center text-gray-400 hover:text-gray-600"
                onClick={handleAddProperty}
                title="속성 추가"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </th>
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {sortedRecords.map((record) => (
            <tr
              key={record.id}
              className="group hover:bg-blue-50/30"
            >
              {/* Row actions */}
              <td className="relative w-8 border-b border-r border-gray-200">
                <button
                  className="flex h-full w-full items-center justify-center text-gray-300 opacity-0 group-hover:opacity-100"
                  onClick={() =>
                    setMenuRecordId(
                      menuRecordId === record.id ? null : record.id
                    )
                  }
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {menuRecordId === record.id && (
                  <div className="absolute left-0 top-full z-20 mt-1 w-32 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                    <button
                      className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteRecord(record.id)}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </td>

              {sortedProperties.map((property) => {
                const isEditing =
                  editingCell?.recordId === record.id &&
                  editingCell?.propertyId === property.id;
                const value = record.values[property.id];

                return (
                  <td
                    key={property.id}
                    className="border-b border-r border-gray-200 px-3 py-1.5"
                    style={{
                      minWidth: property.isTitle ? 250 : 150,
                    }}
                    onClick={() => {
                      if (!isEditing) handleCellClick(record.id, property.id);
                    }}
                  >
                    {isEditing ? (
                      <CellEditor
                        value={value}
                        property={property}
                        onChange={(newValue) =>
                          handleCellSave(record.id, property.id, newValue)
                        }
                        onBlur={handleCellCancel}
                      />
                    ) : (
                      <div className="min-h-[24px] cursor-text">
                        <CellRenderer
                          value={value}
                          property={property}
                          record={record}
                          properties={database.properties}
                        />
                      </div>
                    )}
                  </td>
                );
              })}

              {/* Empty cell for add-property column */}
              <td className="w-10 border-b border-gray-200" />
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add record button */}
      <button
        className="flex w-full items-center gap-2 border-b border-gray-200 px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600"
        onClick={handleAddRecord}
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
        새 레코드
      </button>
    </div>
  );
}
