"use client";

import dynamic from "next/dynamic";

interface BlockEditorProps {
  pageId: string;
  initialContent: string;
}

const EditorInner = dynamic(() => import("./block-editor-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-gray-400">Loading editor...</p>
    </div>
  ),
});

export function BlockEditor({ pageId, initialContent }: BlockEditorProps) {
  return <EditorInner pageId={pageId} initialContent={initialContent} />;
}
