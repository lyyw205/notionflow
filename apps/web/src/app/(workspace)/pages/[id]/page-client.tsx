"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { BlockEditor } from "@/components/editor/block-editor";
import { AISidebar } from "@/components/editor/ai-sidebar";

interface PageEditorClientProps {
  pageId: string;
  initialTitle: string;
  initialContent: string;
  initialSummary: string;
  initialTags: { id: string; name: string; confidence: number }[];
  initialCategory: { id: string; name: string } | null;
}

function parseTrail(raw: string | null): { id: string; title: string }[] {
  if (!raw) return [];
  try {
    return raw.split(",").map((entry) => {
      const colonIdx = entry.indexOf(":");
      return {
        id: entry.slice(0, colonIdx),
        title: entry.slice(colonIdx + 1),
      };
    });
  } catch {
    return [];
  }
}

function buildTrailParam(
  breadcrumbs: { id: string; title: string }[],
  currentId: string,
  currentTitle: string
): string {
  const entries = [...breadcrumbs, { id: currentId, title: currentTitle }];
  return entries.map((e) => `${e.id}:${e.title}`).join(",");
}

export function PageEditorClient({
  pageId,
  initialTitle,
  initialContent,
  initialSummary,
  initialTags,
  initialCategory,
}: PageEditorClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const breadcrumbs = useMemo(
    () => parseTrail(searchParams.get("trail")),
    [searchParams]
  );

  const handleEditorClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (href && href.startsWith("/pages/")) {
        e.preventDefault();
        e.stopPropagation();
        const targetId = href.replace("/pages/", "").split("?")[0];
        const trail = buildTrailParam(breadcrumbs, pageId, initialTitle);
        router.push(`/pages/${targetId}?trail=${encodeURIComponent(trail)}`);
      }
    },
    [router, breadcrumbs, pageId, initialTitle]
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header
        pageTitle={initialTitle}
        pageId={pageId}
        breadcrumbs={breadcrumbs}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden" onClick={handleEditorClick}>
          <BlockEditor pageId={pageId} initialContent={initialContent} />
        </div>
        <AISidebar
          pageId={pageId}
          initialSummary={initialSummary}
          initialTags={initialTags}
          initialCategory={initialCategory}
        />
      </div>
    </div>
  );
}
