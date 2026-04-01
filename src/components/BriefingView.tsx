import type { DailyBriefing } from "../types.ts";

interface Props {
  briefing: DailyBriefing;
}

export function BriefingView({ briefing }: Props) {
  return (
    <div className="max-w-3xl">
      {/* Top Priority banner */}
      <div className="card bg-brand-600 text-white p-5 mb-6">
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
            />
          </svg>
          <div>
            <p className="text-xs font-medium text-brand-200 uppercase tracking-wider mb-1">
              Top Priority
            </p>
            <p className="text-lg font-semibold">{briefing.topPriority}</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="card p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-brand-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          Morning Briefing
        </h3>
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {briefing.summary}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Key Decisions */}
        <div className="card p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-red-500"
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
            Decisions Needed
          </h4>
          <ul className="space-y-2">
            {briefing.keyDecisions.map((decision, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-gray-700">{decision}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Schedule Conflicts */}
        <div className="card p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
            Schedule Conflicts
          </h4>
          {briefing.scheduleConflicts.length === 0 ? (
            <p className="text-sm text-gray-500">No conflicts detected</p>
          ) : (
            <ul className="space-y-2">
              {briefing.scheduleConflicts.map((conflict, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <svg
                    className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {conflict}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
