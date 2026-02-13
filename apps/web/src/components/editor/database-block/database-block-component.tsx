"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { DatabaseContainer } from "./database-container";

export const DatabaseBlockComponent = createReactBlockSpec(
  {
    type: "database" as const,
    propSchema: {
      databaseId: {
        default: "",
      },
    },
    content: "none" as const,
  },
  {
    render: (props) => {
      const databaseId = props.block.props.databaseId;

      if (!databaseId) {
        return (
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 text-sm text-gray-400">
            데이터베이스를 불러오는 중...
          </div>
        );
      }

      return (
        <div className="my-2 w-full" contentEditable={false}>
          <DatabaseContainer databaseId={databaseId} />
        </div>
      );
    },
  }
);
