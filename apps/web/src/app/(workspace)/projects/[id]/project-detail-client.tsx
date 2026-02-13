"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { MilestoneTimeline } from "@/components/projects/milestone-timeline";
import { MilestoneFormModal } from "@/components/projects/milestone-form-modal";
import { PageLinkerModal } from "@/components/projects/page-linker-modal";
import { useSSE } from "@/hooks/use-sse";

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startDate: number | null;
  endDate: number | null;
  sortOrder: number;
  aiProgress: number;
  aiSummary: string | null;
}

interface PageRef {
  id: string;
  title: string;
  summary: string | null;
  milestoneId: string | null;
  updatedAt: number;
}

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  ownerId: string;
  startDate: number | null;
  endDate: number | null;
  aiSummary: string | null;
  progress: number;
  createdAt: number;
  updatedAt: number;
  milestones: Milestone[];
  pages: PageRef[];
}

interface ProjectDetailClientProps {
  projectId: string;
  initialProject: ProjectData | null;
}

const statusOptions = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
];

const statusColors: Record<string, string> = {
  planned: "bg-gray-100 text-gray-700",
  active: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  on_hold: "bg-yellow-100 text-yellow-700",
};

function formatDate(ts: number | null) {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ProjectDetailClient({
  projectId,
  initialProject,
}: ProjectDetailClientProps) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectData | null>(initialProject);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(initialProject?.name || "");
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(
    null
  );
  const [showPageLinker, setShowPageLinker] = useState(false);
  const sseEvent = useSSE(["project-updated"]);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        setName(data.name);
      }
    } catch {
      // Ignore
    }
  }, [projectId]);

  useEffect(() => {
    if (sseEvent && sseEvent.data) {
      const eventData = sseEvent.data as { projectId?: string };
      if (eventData.projectId === projectId) {
        fetchProject();
      }
    }
  }, [sseEvent, projectId, fetchProject]);

  async function handleNameSave() {
    if (!name.trim() || name === project?.name) {
      setEditingName(false);
      return;
    }
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      setProject((prev) => (prev ? { ...prev, name: name.trim() } : prev));
    } catch {
      // Ignore
    }
    setEditingName(false);
  }

  async function handleStatusChange(status: string) {
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setProject((prev) => (prev ? { ...prev, status } : prev));
    } catch {
      // Ignore
    }
  }

  async function handleMilestoneSubmit(data: {
    id?: string;
    title: string;
    description: string;
    status: string;
    startDate: number | null;
    endDate: number | null;
  }) {
    try {
      if (data.id) {
        await fetch(`/api/projects/${projectId}/milestones/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title,
            description: data.description || undefined,
            status: data.status,
            startDate: data.startDate,
            endDate: data.endDate,
          }),
        });
      } else {
        await fetch(`/api/projects/${projectId}/milestones`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title,
            description: data.description || undefined,
            status: data.status,
            startDate: data.startDate,
            endDate: data.endDate,
          }),
        });
      }
      fetchProject();
    } catch {
      // Ignore
    }
  }

  async function handleDeleteMilestone(milestoneId: string) {
    if (!confirm("Delete this milestone?")) return;
    try {
      await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
        method: "DELETE",
      });
      fetchProject();
    } catch {
      // Ignore
    }
  }

  async function handleLinkPage(pageId: string, milestoneId?: string) {
    try {
      await fetch(`/api/projects/${projectId}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, milestoneId }),
      });
      fetchProject();
    } catch {
      // Ignore
    }
  }

  async function handleUnlinkPage(pageId: string) {
    try {
      await fetch(`/api/projects/${projectId}/pages/${pageId}`, {
        method: "DELETE",
      });
      fetchProject();
    } catch {
      // Ignore
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this project? Pages will be unlinked but not deleted."))
      return;
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/projects");
      }
    } catch {
      // Ignore
    }
  }

  if (!project) {
    return (
      <>
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-400">Project not found</p>
        </div>
      </>
    );
  }

  const unlinkedPages = project.pages.filter((p) => !p.milestoneId);

  return (
    <>
      <Header />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl">
          {/* Project header */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {editingName ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleNameSave}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleNameSave();
                      if (e.key === "Escape") {
                        setName(project.name);
                        setEditingName(false);
                      }
                    }}
                    className="w-full border-none bg-transparent text-2xl font-bold text-gray-900 outline-none"
                    autoFocus
                  />
                ) : (
                  <h1
                    onClick={() => setEditingName(true)}
                    className="cursor-pointer text-2xl font-bold text-gray-900 hover:text-brand-700"
                  >
                    {project.name}
                  </h1>
                )}
                {project.description && (
                  <p className="mt-1 text-sm text-gray-500">
                    {project.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={project.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`rounded-full border-0 px-3 py-1 text-xs font-medium outline-none ${statusColors[project.status] || statusColors.planned}`}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleDelete}
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  title="Delete project"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {(project.startDate || project.endDate) && (
              <p className="mt-2 text-xs text-gray-400">
                {formatDate(project.startDate)}
                {project.startDate && project.endDate ? " - " : ""}
                {formatDate(project.endDate)}
              </p>
            )}
          </div>

          {/* AI Summary + Progress */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Overall Progress
              </span>
              <span className="text-lg font-bold text-gray-900">
                {project.progress}%
              </span>
            </div>
            <div className="mt-2 h-3 w-full rounded-full bg-gray-100">
              <div
                className="h-3 rounded-full bg-brand-500 transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>
            {project.aiSummary && (
              <p className="mt-3 text-sm text-gray-600 italic">
                {project.aiSummary}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="mb-4 flex items-center gap-2">
            <button
              onClick={() => {
                setEditingMilestone(null);
                setShowMilestoneForm(true);
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              + Add Milestone
            </button>
            <button
              onClick={() => setShowPageLinker(true)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              + Link Page
            </button>
          </div>

          {/* Milestone Timeline */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Milestones
            </h3>
            <MilestoneTimeline
              milestones={project.milestones}
              pages={project.pages}
              onEditMilestone={(ms) => {
                setEditingMilestone(ms);
                setShowMilestoneForm(true);
              }}
              onDeleteMilestone={handleDeleteMilestone}
              onPageClick={(pageId) => router.push(`/pages/${pageId}`)}
            />
          </div>

          {/* Unlinked pages */}
          {unlinkedPages.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                Unassigned Pages
              </h3>
              <div className="space-y-1 rounded-lg border border-gray-200 bg-white p-3">
                {unlinkedPages.map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-gray-50"
                  >
                    <button
                      onClick={() => router.push(`/pages/${page.id}`)}
                      className="min-w-0 flex-1 truncate text-left text-sm text-gray-700"
                    >
                      {page.title || "Untitled"}
                    </button>
                    <button
                      onClick={() => handleUnlinkPage(page.id)}
                      className="ml-2 text-xs text-gray-400 hover:text-red-500"
                    >
                      Unlink
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <MilestoneFormModal
        isOpen={showMilestoneForm}
        onClose={() => {
          setShowMilestoneForm(false);
          setEditingMilestone(null);
        }}
        onSubmit={handleMilestoneSubmit}
        initial={
          editingMilestone
            ? {
                id: editingMilestone.id,
                title: editingMilestone.title,
                description: editingMilestone.description || "",
                status: editingMilestone.status,
                startDate: editingMilestone.startDate,
                endDate: editingMilestone.endDate,
              }
            : null
        }
      />

      <PageLinkerModal
        isOpen={showPageLinker}
        onClose={() => setShowPageLinker(false)}
        onLink={handleLinkPage}
        milestones={project.milestones.map((ms) => ({
          id: ms.id,
          title: ms.title,
        }))}
      />
    </>
  );
}
