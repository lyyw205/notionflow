"use client";

import { useState, useEffect } from "react";

interface ProjectInfo {
  id: string;
  name: string;
}

interface MilestoneInfo {
  id: string;
  title: string;
}

interface ProjectSelectorProps {
  pageId: string;
  initialProject: ProjectInfo | null;
  initialMilestone: MilestoneInfo | null;
}

export function ProjectSelector({
  pageId,
  initialProject,
  initialMilestone,
}: ProjectSelectorProps) {
  const [project, setProject] = useState<ProjectInfo | null>(initialProject);
  const [milestone, setMilestone] = useState<MilestoneInfo | null>(
    initialMilestone
  );
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [milestones, setMilestones] = useState<MilestoneInfo[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showSelector && projects.length === 0) {
      fetchProjects();
    }
  }, [showSelector]);

  useEffect(() => {
    if (project) {
      fetchMilestones(project.id);
    } else {
      setMilestones([]);
    }
  }, [project?.id]);

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setProjects(list.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
      }
    } catch {
      // Ignore
    }
  }

  async function fetchMilestones(projectId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setMilestones(
          (data.milestones || []).map((m: { id: string; title: string }) => ({
            id: m.id,
            title: m.title,
          }))
        );
      }
    } catch {
      // Ignore
    }
  }

  async function handleLinkProject(projectId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      });
      if (res.ok) {
        const proj = projects.find((p) => p.id === projectId);
        setProject(proj || null);
        setMilestone(null);
        setShowSelector(false);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleLinkMilestone(milestoneId: string) {
    if (!project) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, milestoneId: milestoneId || undefined }),
      });
      if (res.ok) {
        const ms = milestones.find((m) => m.id === milestoneId);
        setMilestone(ms || null);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlink() {
    if (!project) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/pages/${pageId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProject(null);
        setMilestone(null);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-6 py-1.5 text-sm">
      {project ? (
        <>
          <span className="text-gray-400">Project:</span>
          <span className="font-medium text-brand-700">{project.name}</span>

          {milestone && (
            <>
              <span className="text-gray-300">/</span>
              <span className="text-gray-600">{milestone.title}</span>
            </>
          )}

          {!milestone && milestones.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) handleLinkMilestone(e.target.value);
              }}
              className="ml-1 rounded border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-500 outline-none"
              disabled={loading}
            >
              <option value="">+ Milestone</option>
              {milestones.map((ms) => (
                <option key={ms.id} value={ms.id}>
                  {ms.title}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleUnlink}
            disabled={loading}
            className="ml-auto text-xs text-gray-400 hover:text-red-500"
          >
            Unlink
          </button>
        </>
      ) : showSelector ? (
        <>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) handleLinkProject(e.target.value);
            }}
            className="rounded border border-gray-200 bg-white px-2 py-1 text-sm outline-none focus:border-brand-400"
            disabled={loading}
            autoFocus
          >
            <option value="">Select project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowSelector(false)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          onClick={() => setShowSelector(true)}
          className="text-gray-400 hover:text-brand-600"
        >
          + Link to Project
        </button>
      )}
    </div>
  );
}
