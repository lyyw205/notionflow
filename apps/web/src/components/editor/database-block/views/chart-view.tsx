"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Database, DatabaseView, ChartViewConfig } from "../types";

interface ChartViewProps {
  database: Database;
  activeView: DatabaseView;
}

const PIE_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

export function ChartView({ database, activeView }: ChartViewProps) {
  const config = (activeView.config ?? {}) as ChartViewConfig;
  const chartType = config.chartType ?? "bar";
  const aggregation = config.aggregation ?? "count";

  const xProperty = useMemo(
    () => database.properties.find((p) => p.id === config.xAxis),
    [database.properties, config.xAxis]
  );

  const yProperty = useMemo(
    () => database.properties.find((p) => p.id === config.yAxis),
    [database.properties, config.yAxis]
  );

  const chartData = useMemo(() => {
    if (!xProperty) return [];

    const groups = new Map<string, number[]>();

    for (const record of database.records) {
      const xVal = String(record.values[xProperty.id] ?? "");
      if (!xVal) continue;

      let label = xVal;
      if (xProperty.type === "select" && xProperty.config) {
        const opts = (xProperty.config as { options: { id: string; name: string }[] }).options;
        const opt = opts.find((o) => o.id === xVal);
        if (opt) label = opt.name;
      }

      if (!groups.has(label)) groups.set(label, []);

      if (yProperty) {
        const yVal = Number(record.values[yProperty.id] ?? 0);
        if (!Number.isNaN(yVal)) {
          groups.get(label)!.push(yVal);
        }
      } else {
        groups.get(label)!.push(1);
      }
    }

    return Array.from(groups.entries()).map(([name, values]) => {
      let value: number;
      if (aggregation === "count") {
        value = values.length;
      } else if (aggregation === "sum") {
        value = values.reduce((a, b) => a + b, 0);
      } else {
        const sum = values.reduce((a, b) => a + b, 0);
        value = values.length > 0 ? Math.round((sum / values.length) * 100) / 100 : 0;
      }
      return { name, value };
    });
  }, [database.records, xProperty, yProperty, aggregation]);

  if (!config.xAxis) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        차트 속성을 설정해주세요
      </div>
    );
  }

  if (database.records.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="w-full p-4">
      <ResponsiveContainer width="100%" height={400}>
        {chartType === "pie" ? (
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={150}
              label={({ name, value }) => `${name}: ${value}`}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        ) : chartType === "line" ? (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        ) : (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
