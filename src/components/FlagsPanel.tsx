import type { Flag, Message } from "../types.ts";

interface Props {
  flags: Flag[];
  messages: Message[];
  onMessageClick?: (messageId: number) => void;
}

const severityConfig = {
  critical: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "text-red-500",
    label: "Critical",
    labelBg: "bg-red-100 text-red-700",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "text-amber-500",
    label: "Warning",
    labelBg: "bg-amber-100 text-amber-700",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "text-blue-500",
    label: "Info",
    labelBg: "bg-blue-100 text-blue-700",
  },
};

export function FlagsPanel({ flags, messages, onMessageClick }: Props) {
  if (flags.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No flags raised. All clear.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 max-w-3xl">
      {flags.map((flag, i) => {
        const sev = severityConfig[flag.severity];
        const relatedMsgs = messages.filter((m) =>
          flag.relatedMessageIds.includes(m.id)
        );

        return (
          <div
            key={i}
            className={`card ${sev.bg} ${sev.border} p-5`}
          >
            <div className="flex items-start gap-3">
              <svg
                className={`w-5 h-5 ${sev.icon} flex-shrink-0 mt-0.5`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"
                />
              </svg>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900">{flag.title}</h4>
                  <span className={`badge ${sev.labelBg}`}>{sev.label}</span>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  {flag.description}
                </p>
                {relatedMsgs.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Related Messages
                    </p>
                    {relatedMsgs.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onMessageClick?.(m.id)}
                        className="text-xs text-gray-600 flex items-center gap-1.5 text-left hover:text-gray-900 transition-colors cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                        <span className="font-medium">{m.from}</span>
                        {m.subject && (
                          <span className="text-gray-400">
                            &mdash; {m.subject}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
