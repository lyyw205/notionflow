"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useDebounceSave } from "@/hooks/use-debounce-save";

interface BlockEditorInnerProps {
  pageId: string;
  initialContent: string;
}

function parseInitialContent(content: string) {
  if (!content) return undefined;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Not valid JSON, return undefined for default empty doc
  }
  return undefined;
}

export default function BlockEditorInner({
  pageId,
  initialContent,
}: BlockEditorInnerProps) {
  const debounceSave = useDebounceSave(pageId);

  const editor = useCreateBlockNote({
    initialContent: parseInitialContent(initialContent),
  });

  function handleChange() {
    const blocks = editor.document;
    const content = JSON.stringify(blocks);
    debounceSave(content);
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-4">
        <BlockNoteView editor={editor} onChange={handleChange} theme="light" />
      </div>
    </div>
  );
}
