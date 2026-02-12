"use client";

interface StatsCardsProps {
  stats: {
    totalPages: number;
    totalTags: number;
    totalCategories: number;
    todayEdits: number;
  };
}

const cards = [
  { key: "totalPages" as const, label: "Total Pages", icon: "\uD83D\uDCC4" },
  { key: "totalTags" as const, label: "Total Tags", icon: "\uD83C\uDFF7\uFE0F" },
  { key: "totalCategories" as const, label: "Categories", icon: "\uD83D\uDCC1" },
  { key: "todayEdits" as const, label: "Today's Edits", icon: "\u270F\uFE0F" },
];

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{card.icon}</span>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats[card.key]}
              </p>
              <p className="text-sm text-gray-500">{card.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
