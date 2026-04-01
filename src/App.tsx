import { useCallback, useRef, useState } from "react";
import type { Message, TriageResponse, TriageCategory } from "./types.ts";
import { BriefingView } from "./components/BriefingView.tsx";
import { FlagsPanel } from "./components/FlagsPanel.tsx";
import { MessageCard } from "./components/MessageCard.tsx";
import { StatsBar } from "./components/StatsBar.tsx";

type Tab = "triage" | "briefing" | "flags";

export function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [result, setResult] = useState<TriageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("briefing");
  const [filter, setFilter] = useState<TriageCategory | "all">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runTriage = useCallback(async (msgs: Message[]) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to triage messages");
      }
      const data: TriageResponse = await res.json();
      setResult(data);
      setActiveTab("briefing");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error);
        }
        const data = await res.json();
        setMessages(data.messages);
        setResult(null);
      } catch (e: any) {
        setError(e.message);
      }
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    []
  );

  const filteredMessages =
    result && filter !== "all"
      ? result.triagedMessages.filter((t) => t.category === filter)
      : result?.triagedMessages ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
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
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  AI Chief of Staff
                </h1>
                <p className="text-xs text-gray-500">
                  {messages.length} messages loaded
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Upload JSON
              </button>
              <button
                onClick={() => runTriage(messages)}
                disabled={loading || messages.length === 0}
                className="px-4 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 cursor-pointer"
              >
                {loading && (
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                {loading ? "Analyzing..." : "Run Triage"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error banner */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
            <svg
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-medium">Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-brand-200 rounded-full" />
              <div className="absolute top-0 w-16 h-16 border-4 border-brand-600 rounded-full border-t-transparent animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900">
                Analyzing {messages.length} messages...
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Classifying, flagging risks, and drafting your briefing
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !result && (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="w-20 h-20 bg-brand-50 rounded-2xl flex items-center justify-center">
              <svg
                className="w-10 h-10 text-brand-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <div className="text-center max-w-md">
              <h2 className="text-xl font-semibold text-gray-900">
                Ready to triage
              </h2>
              <p className="text-gray-500 mt-2">
                {messages.length > 0
                  ? `${messages.length} messages loaded. Click "Run Triage" to analyze them with AI.`
                  : "Upload a messages JSON file to get started."}
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && result && (
          <>
            <StatsBar result={result} />

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-200/60 p-1 rounded-xl mb-6 w-fit">
              {(
                [
                  { id: "briefing" as Tab, label: "Daily Briefing" },
                  { id: "triage" as Tab, label: "Triage" },
                  {
                    id: "flags" as Tab,
                    label: `Flags (${result.flags.length})`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Briefing tab */}
            {activeTab === "briefing" && (
              <BriefingView briefing={result.briefing} />
            )}

            {/* Triage tab */}
            {activeTab === "triage" && (
              <>
                {/* Filter pills */}
                <div className="flex gap-2 mb-4">
                  {(
                    [
                      { id: "all" as const, label: "All" },
                      { id: "decide" as const, label: "Decide" },
                      { id: "delegate" as const, label: "Delegate" },
                      { id: "ignore" as const, label: "Ignore" },
                    ] as const
                  ).map((f) => {
                    const count =
                      f.id === "all"
                        ? result.triagedMessages.length
                        : result.triagedMessages.filter(
                            (m) => m.category === f.id
                          ).length;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-all cursor-pointer ${
                          filter === f.id
                            ? "bg-brand-600 text-white"
                            : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {f.label} ({count})
                      </button>
                    );
                  })}
                </div>
                <div className="grid gap-4">
                  {filteredMessages.map((triaged) => {
                    const msg = messages.find(
                      (m) => m.id === triaged.messageId
                    );
                    if (!msg) return null;
                    return (
                      <MessageCard
                        key={triaged.messageId}
                        message={msg}
                        triage={triaged}
                      />
                    );
                  })}
                </div>
              </>
            )}

            {/* Flags tab */}
            {activeTab === "flags" && (
              <FlagsPanel flags={result.flags} messages={messages} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
