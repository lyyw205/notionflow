"use client";

import { useState, useEffect } from "react";

interface MilestoneData {
  id?: string;
  title: string;
  description: string;
  status: string;
  startDate: number | null;
  endDate: number | null;
}

interface MilestoneFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MilestoneData) => void;
  initial?: MilestoneData | null;
}

function tsToDateStr(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

function dateStrToTs(str: string): number | null {
  if (!str) return null;
  return Math.floor(new Date(str).getTime() / 1000);
}

export function MilestoneFormModal({
  isOpen,
  onClose,
  onSubmit,
  initial,
}: MilestoneFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("pending");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (initial) {
      setTitle(initial.title);
      setDescription(initial.description || "");
      setStatus(initial.status);
      setStartDate(tsToDateStr(initial.startDate));
      setEndDate(tsToDateStr(initial.endDate));
    } else {
      setTitle("");
      setDescription("");
      setStatus("pending");
      setStartDate("");
      setEndDate("");
    }
  }, [initial, isOpen]);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      id: initial?.id,
      title: title.trim(),
      description: description.trim(),
      status,
      startDate: dateStrToTs(startDate),
      endDate: dateStrToTs(endDate),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          {initial?.id ? "Edit Milestone" : "New Milestone"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
              placeholder="Milestone title"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
              placeholder="Optional description"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-400"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {initial?.id ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
