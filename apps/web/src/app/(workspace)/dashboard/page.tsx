"use client";

import { useEffect, useState } from "react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { CategoryTree } from "@/components/dashboard/category-tree";
import { TagCloud } from "@/components/dashboard/tag-cloud";
import { Header } from "@/components/layout/header";
import { useSSE } from "@/hooks/use-sse";

interface PageFromAPI {
  id: string;
  title: string;
  summary: string | null;
  category: { id: string; name: string } | null;
  tags: { id: string; name: string; confidence: number; source: string }[];
  updatedAt: number;
  authorId?: string;
}

interface DashboardData {
  stats: {
    totalPages: number;
    totalTags: number;
    totalCategories: number;
    todayEdits: number;
    activeProjects: number;
  };
  recentPages: {
    id: string;
    title: string;
    authorName: string;
    updatedAt: number;
    tags: string[];
  }[];
  categories: {
    id: string;
    name: string;
    pages: { id: string; title: string }[];
  }[];
  uncategorizedPages: { id: string; title: string }[];
  tags: { name: string; count: number }[];
}

const defaultData: DashboardData = {
  stats: { totalPages: 0, totalTags: 0, totalCategories: 0, todayEdits: 0, activeProjects: 0 },
  recentPages: [],
  categories: [],
  uncategorizedPages: [],
  tags: [],
};

function buildDashboard(apiPages: PageFromAPI[]): DashboardData {
  const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);

  // Tag counts
  const tagCountMap = new Map<string, number>();
  for (const page of apiPages) {
    for (const tag of page.tags) {
      tagCountMap.set(tag.name, (tagCountMap.get(tag.name) || 0) + 1);
    }
  }

  // Categories
  const categoryMap = new Map<
    string,
    { id: string; name: string; pages: { id: string; title: string }[] }
  >();
  const uncategorized: { id: string; title: string }[] = [];

  for (const page of apiPages) {
    if (page.category) {
      if (!categoryMap.has(page.category.id)) {
        categoryMap.set(page.category.id, {
          id: page.category.id,
          name: page.category.name,
          pages: [],
        });
      }
      categoryMap
        .get(page.category.id)!
        .pages.push({ id: page.id, title: page.title });
    } else {
      uncategorized.push({ id: page.id, title: page.title });
    }
  }

  return {
    stats: {
      totalPages: apiPages.length,
      totalTags: tagCountMap.size,
      totalCategories: categoryMap.size,
      todayEdits: apiPages.filter((p) => p.updatedAt >= todayStart).length,
      activeProjects: 0,
    },
    recentPages: apiPages.slice(0, 10).map((p) => ({
      id: p.id,
      title: p.title,
      authorName: "User",
      updatedAt: p.updatedAt,
      tags: p.tags.map((t) => t.name),
    })),
    categories: Array.from(categoryMap.values()),
    uncategorizedPages: uncategorized,
    tags: Array.from(tagCountMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(defaultData);
  const [loading, setLoading] = useState(true);
  const sseEvent = useSSE(["page-updated", "page-created", "page-deleted"]);

  async function fetchDashboard() {
    try {
      const res = await fetch("/api/pages");
      if (res.ok) {
        const json = await res.json();
        const pages: PageFromAPI[] = Array.isArray(json) ? json : json.pages ?? [];
        const dashboardData = buildDashboard(pages);

        const projRes = await fetch("/api/projects");
        if (projRes.ok) {
          const projData = await projRes.json();
          const projList = Array.isArray(projData) ? projData : projData.projects ?? [];
          const activeCount = projList.filter((p: any) => p.status === "active").length;
          dashboardData.stats.activeProjects = activeCount;
        }

        setData(dashboardData);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (sseEvent) {
      fetchDashboard();
    }
  }, [sseEvent]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-400">Loading dashboard...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="flex-1 overflow-y-auto p-6">
        <StatsCards stats={data.stats} />

        <div className="mt-6 grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <RecentActivity pages={data.recentPages} />
          </div>
          <div className="space-y-6">
            <TagCloud tags={data.tags} />
            <CategoryTree
              categories={data.categories}
              uncategorizedPages={data.uncategorizedPages}
            />
          </div>
        </div>
      </div>
    </>
  );
}
