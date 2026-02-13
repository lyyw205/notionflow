import { Parser } from "expr-eval";
import type { DatabaseProperty, DatabaseRecord } from "./types";

const parser = new Parser();

export function evaluateFormula(
  expression: string,
  context: Record<string, unknown>
): unknown {
  try {
    const parsed = parser.parse(expression);
    const numericContext: Record<string, number> = {};
    for (const [key, val] of Object.entries(context)) {
      if (typeof val === "number") {
        numericContext[key] = val;
      } else if (typeof val === "string") {
        const n = Number(val);
        if (!Number.isNaN(n)) {
          numericContext[key] = n;
        }
      }
    }
    return parsed.evaluate(numericContext);
  } catch {
    return null;
  }
}

export function buildFormulaContext(
  record: DatabaseRecord,
  properties: DatabaseProperty[]
): Record<string, unknown> {
  const context: Record<string, unknown> = {};
  for (const prop of properties) {
    if (prop.type === "formula") continue;
    const name = prop.name.replace(/\s+/g, "_");
    context[name] = record.values[prop.id] ?? null;
  }
  return context;
}
