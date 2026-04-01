import type { TriageResponse } from "../types.ts";

interface Props {
  result: TriageResponse;
}

export function StatsBar({ result }: Props) {
  const decide = result.triagedMessages.filter(
    (m) => m.category === "decide"
  ).length;
  const delegate = result.triagedMessages.filter(
    (m) => m.category === "delegate"
  ).length;
  const ignore = result.triagedMessages.filter(
    (m) => m.category === "ignore"
  ).length;
  const critical = result.triagedMessages.filter(
    (m) => m.urgency === "critical"
  ).length;

  const stats = [
    {
      label: "Needs Your Decision",
      value: decide,
      color: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200",
      icon: (
        <svg
          className="w-5 h-5 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      ),
    },
    {
      label: "Delegated",
      value: delegate,
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: (
        <svg
          className="w-5 h-5 text-amber-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
          />
        </svg>
      ),
    },
    {
      label: "Filtered Out",
      value: ignore,
      color: "text-green-700",
      bg: "bg-green-50",
      border: "border-green-200",
      icon: (
        <svg
          className="w-5 h-5 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: "Critical",
      value: critical,
      color: critical > 0 ? "text-red-700" : "text-gray-700",
      bg: critical > 0 ? "bg-red-50" : "bg-gray-50",
      border: critical > 0 ? "border-red-200" : "border-gray-200",
      icon: (
        <svg
          className="w-5 h-5"
          style={{ color: critical > 0 ? "#ef4444" : "#6b7280" }}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`card p-4 ${stat.bg} ${stat.border}`}
        >
          <div className="flex items-center gap-3">
            {stat.icon}
            <div>
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
