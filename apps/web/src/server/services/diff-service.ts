import { diffLines, Change } from "diff";

export interface DiffResult {
  changes: Array<{
    type: "added" | "removed" | "unchanged";
    value: string;
    lineCount: number;
  }>;
  totalAdded: number;
  totalRemoved: number;
}

export function computeDiff(oldText: string, newText: string): DiffResult {
  const changes: Change[] = diffLines(oldText, newText);

  let totalAdded = 0;
  let totalRemoved = 0;

  const result = changes.map((change) => {
    const lineCount = change.count || 0;

    if (change.added) {
      totalAdded += lineCount;
      return { type: "added" as const, value: change.value, lineCount };
    }
    if (change.removed) {
      totalRemoved += lineCount;
      return { type: "removed" as const, value: change.value, lineCount };
    }
    return { type: "unchanged" as const, value: change.value, lineCount };
  });

  return { changes: result, totalAdded, totalRemoved };
}
