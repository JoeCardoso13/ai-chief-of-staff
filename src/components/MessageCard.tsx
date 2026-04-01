import { useState } from "react";
import type { Message, TriagedMessage } from "../types.ts";

interface Props {
  message: Message;
  triage: TriagedMessage;
}

const categoryConfig = {
  decide: {
    label: "Decide",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
  },
  delegate: {
    label: "Delegate",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  ignore: {
    label: "Ignore",
    bg: "bg-gray-50",
    text: "text-gray-600",
    border: "border-gray-200",
    dot: "bg-gray-400",
  },
};

const urgencyConfig = {
  critical: { label: "Critical", color: "text-red-600 bg-red-50 ring-red-200" },
  high: { label: "High", color: "text-orange-600 bg-orange-50 ring-orange-200" },
  medium: { label: "Medium", color: "text-yellow-600 bg-yellow-50 ring-yellow-200" },
  low: { label: "Low", color: "text-gray-500 bg-gray-50 ring-gray-200" },
};

const channelIcons: Record<string, string> = {
  email: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75",
  slack: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z",
  whatsapp: "M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3",
};

export function MessageCard({ message, triage }: Props) {
  const [expanded, setExpanded] = useState(false);
  const cat = categoryConfig[triage.category];
  const urg = urgencyConfig[triage.urgency];
  const time = new Date(message.timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      className={`card overflow-hidden transition-all ${
        triage.category === "decide" ? "ring-2 ring-red-200" : ""
      }`}
    >
      {/* Header */}
      <div
        className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Category indicator */}
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <div className={`w-3 h-3 rounded-full ${cat.dot}`} />
          <span className={`text-[10px] font-semibold uppercase ${cat.text}`}>
            {cat.label}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <svg
              className="w-4 h-4 text-gray-400 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={channelIcons[message.channel] || channelIcons.email}
              />
            </svg>
            <span className="text-sm font-semibold text-gray-900 truncate">
              {message.from}
            </span>
            {message.channel_name && (
              <span className="text-xs text-gray-400">
                {message.channel_name}
              </span>
            )}
            <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
              {time}
            </span>
          </div>
          {message.subject && (
            <p className="text-sm font-medium text-gray-700 mb-1">
              {message.subject}
            </p>
          )}
          <p className="text-sm text-gray-500 line-clamp-2">{triage.reason}</p>
        </div>

        {/* Badges */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span
            className={`badge ring-1 ${urg.color}`}
          >
            {urg.label}
          </span>
          {triage.delegateTo && (
            <span className="badge bg-blue-50 text-blue-700 ring-1 ring-blue-200">
              &rarr; {triage.delegateTo}
            </span>
          )}
        </div>

        {/* Expand chevron */}
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100">
          {/* Original message */}
          <div className="px-4 py-3 bg-gray-50/50">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Original Message
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {message.body}
            </p>
          </div>

          {/* Draft response */}
          {triage.draftResponse && (
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-brand-600 uppercase tracking-wider mb-2">
                {triage.category === "delegate"
                  ? `Draft Handoff to ${triage.delegateTo}`
                  : "Draft Response"}
              </p>
              <div className="bg-brand-50/50 rounded-lg p-3 border border-brand-100">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {triage.draftResponse}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
