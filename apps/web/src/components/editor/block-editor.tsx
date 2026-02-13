"use client";

import dynamic from "next/dynamic";

interface BlockEditorProps {
  pageId: string;
  userId?: string;
  initialContent: string;
  onNavigate?: (targetPageId: string) => void;
}

const EditorInner = dynamic(() => import("./block-editor-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-gray-400">Loading editor...</p>
    </div>
  ),
});

export function BlockEditor({ pageId, userId, initialContent, onNavigate }: BlockEditorProps) {
  return <EditorInner pageId={pageId} userId={userId} initialContent={initialContent} onNavigate={onNavigate} />;
}
