"use client";

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

export function PageEditorClient({
  pageId,
  initialTitle,
  initialContent,
  initialSummary,
  initialTags,
  initialCategory,
}: PageEditorClientProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header pageTitle={initialTitle} pageId={pageId} />
      <div className="flex flex-1 overflow-hidden">
        <BlockEditor pageId={pageId} initialContent={initialContent} />
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
