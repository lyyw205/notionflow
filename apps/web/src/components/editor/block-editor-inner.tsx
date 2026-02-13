"use client";

import { useState, useCallback, useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import {
  BlockNoteSchema,
  defaultBlockSpecs,
} from "@blocknote/core";
import {
  getDefaultSlashMenuItems,
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core/extensions";
import { SuggestionMenuController } from "@blocknote/react";
import "@blocknote/mantine/style.css";
import { useDebounceSave } from "@/hooks/use-debounce-save";
import { PageLinkModal } from "./page-link-modal";
import { DatabaseBlockComponent } from "./database-block/database-block-component";

const databaseBlockSpec = DatabaseBlockComponent();

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    database: databaseBlockSpec,
  },
});

interface BlockEditorInnerProps {
  pageId: string;
  userId?: string;
  initialContent: string;
  onNavigate?: (targetPageId: string) => void;
}

function parseInitialContent(content: string) {
  if (!content) return undefined;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Not valid JSON
  }
  return undefined;
}

export default function BlockEditorInner({
  pageId,
  userId,
  initialContent,
  onNavigate,
}: BlockEditorInnerProps) {
  const debounceSave = useDebounceSave(pageId);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;

  const editor = useCreateBlockNote({
    schema,
    initialContent: parseInitialContent(initialContent),
    resolveFileUrl: async (url) => url,
    _tiptapOptions: {
      editorProps: {
        handleClick: (_view: any, _pos: number, event: MouseEvent) => {
          const target = event.target as HTMLElement;
          const anchor = target.closest("a");
          if (!anchor) return false;

          const href = anchor.getAttribute("href");
          if (href && href.startsWith("/pages/")) {
            event.preventDefault();
            const targetId = href.replace("/pages/", "").split("?")[0];
            onNavigateRef.current?.(targetId);
            return true;
          }
          return false;
        },
      },
    },
  });

  function handleChange() {
    const blocks = editor.document;
    const content = JSON.stringify(blocks);
    debounceSave(content);
  }

  const handlePageSelect = useCallback(
    (page: { id: string; title: string }) => {
      setLinkModalOpen(false);

      const currentBlock = editor.getTextCursorPosition().block;
      editor.updateBlock(currentBlock, {
        content: [
          ...((currentBlock.content as any[]) || []),
          {
            type: "link",
            href: `/pages/${page.id}`,
            content: [{ type: "text", text: page.title || "Untitled", styles: {} }],
          },
          { type: "text", text: " ", styles: {} },
        ],
      });
    },
    [editor]
  );

  const getSlashMenuItems = useCallback(
    (query: string) => {
      const defaultItems = getDefaultSlashMenuItems(editor);

      const pageLinkItem = {
        key: "page_link",
        title: "Page Link",
        subtext: "Link to another page",
        group: "Other",
        onItemClick: () => {
          setLinkModalOpen(true);
        },
        aliases: ["page", "link", "페이지", "링크"],
        badge: undefined,
      } as any;

      const databaseItem = {
        key: "database",
        title: "Database",
        subtext: "Insert an inline database",
        group: "Other",
        onItemClick: async () => {
          try {
            const res = await fetch("/api/databases", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pageId,
                createdBy: userId || "unknown",
              }),
            });
            if (!res.ok) throw new Error("Failed to create database");
            const db = await res.json();

            insertOrUpdateBlockForSlashMenu(editor, {
              type: "database",
              props: { databaseId: db.id },
            } as any);
          } catch (err) {
            console.error("Failed to create database:", err);
          }
        },
        aliases: ["database", "db", "table", "데이터베이스", "표"],
        badge: undefined,
      } as any;

      return filterSuggestionItems(
        [...defaultItems, pageLinkItem, databaseItem],
        query
      );
    },
    [editor, pageId, userId]
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-4">
        <BlockNoteView
          editor={editor}
          onChange={handleChange}
          theme="light"
          slashMenu={false}
        >
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) => getSlashMenuItems(query)}
          />
        </BlockNoteView>
      </div>

      <PageLinkModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onSelect={handlePageSelect}
        currentPageId={pageId}
      />
    </div>
  );
}
