"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/header";
import { useSSE } from "@/hooks/use-sse";

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  aiSummary: string | null;
  milestoneCount: number;
  pageCount: number;
  updatedAt: number;
}

const statusColors: Record<string, string> = {
  planned: "bg-gray-100 text-gray-700",
  active: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  on_hold: "bg-yellow-100 text-yellow-700",
};

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ProjectsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const sseEvent = useSSE([
    "project-created",
    "project-updated",
    "project-deleted",
  ]);

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (sseEvent) {
      fetchProjects();
    }
  }, [sseEvent]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          ownerId: session?.user?.id ?? "unknown",
          status: "planned",
        }),
      });
      if (res.ok) {
        const project = await res.json();
        setNewName("");
        setShowCreate(false);
        router.push(`/projects/${project.id}`);
      }
    } catch {
      // Ignore
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <Header />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              New Project
            </button>
          </div>

          {/* Create modal */}
          {showCreate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  New Project
                </h3>
                <form onSubmit={handleCreate}>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                    placeholder="Project name"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreate(false);
                        setNewName("");
                      }}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating || !newName.trim()}
                      className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      {creating ? "Creating..." : "Create"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {loading && (
            <p className="text-sm text-gray-400">Loading projects...</p>
          )}

          {!loading && projects.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-gray-500">
                No projects yet. Create one to start organizing your pages.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-gray-900">{project.name}</h3>
                  <span
                    className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[project.status] || statusColors.planned}`}
                  >
                    {project.status}
                  </span>
                </div>

                {project.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                    {project.description}
                  </p>
                )}

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Progress</span>
                    <span className="font-medium text-gray-600">
                      {project.progress}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-brand-500 transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                  <span>{project.milestoneCount} milestones</span>
                  <span>{project.pageCount} pages</span>
                  <span className="ml-auto">{formatDate(project.updatedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
