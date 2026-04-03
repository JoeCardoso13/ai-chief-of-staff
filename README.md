# AI Chief of Staff

An AI-powered executive assistant that triages a CEO's morning communications across email, Slack, and WhatsApp. It classifies every message, delegates what it can, flags risks and conflicts, and produces a 2-minute daily briefing.

## How It Works

1. **Load messages** — The app uploads your JSON file
2. **Run triage** — Claude analyzes every message and classifies it as:
   - **Decide** — requires the CEO's personal attention, with a drafted response
   - **Delegate** — can be handled by someone else, with a drafted handoff
   - **Ignore** — no action needed (spam, newsletters, resolved items)
3. **Review results** — Three views:
   - **Daily Briefing** — a one-page summary readable in under 2 minutes
   - **Triage** — every message with its classification, urgency, reasoning, and draft response
   - **Flags** — risks, conflicts, and things the CEO should know about

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- An [Anthropic API key](https://console.anthropic.com/) — this app uses Claude as its LLM provider

## Quick Start

```bash
# Install dependencies
npm install

# Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run in development mode
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) and click **Run Triage**.

## Architecture

```
├── server/
│   └── index.ts          # Express API server with Claude integration
├── src/
│   ├── App.tsx            # Main app with state management
│   ├── types.ts           # Shared TypeScript types
│   └── components/
│       ├── BriefingView   # Daily briefing with top priority, decisions, schedule conflicts
│       ├── StatsBar       # Summary stats (decide/delegate/ignore/critical counts)
│       ├── MessageCard    # Expandable message card with triage details and draft response
│       └── FlagsPanel     # Risk flags with severity and related messages
└── package.json
```

**Stack:** React 19, Tailwind CSS v4, Vite, Express, Anthropic Claude API

## API Endpoints

| Method | Path           | Description                          |
|--------|----------------|--------------------------------------|
| POST   | `/api/triage`  | Sends messages to Claude for triage  |
| POST   | `/api/upload`  | Accepts a JSON file with new messages|

## Testing with New Data

The app accepts any JSON array of messages. Each message should have:

```json
{
  "id": 1,
  "channel": "email" | "slack" | "whatsapp",
  "from": "Sender Name",
  "subject": "Optional subject line",
  "timestamp": "2026-03-18T08:12:00Z",
  "body": "Message content..."
}
```

Click **Upload JSON** in the header to load new data, then **Run Triage**.

## Testing

```bash
# Unit + integration tests
npm run test:run

# Coverage report
npm run test:coverage

# Browser E2E with mocked API responses
npx playwright install chromium
# On Linux, you may also need:
# npx playwright install-deps chromium
npm run test:e2e

# Optional live browser smoke test against Anthropic
# Put ANTHROPIC_API_KEY=sk-ant-... in .env or .env.local, or export it
npm run test:e2e:live
```

## Design Decisions

- **Single LLM call**: All 20 messages are sent in one batch so the AI can spot cross-message patterns, conflicts, and dependencies (e.g., message #5 says Horizon is on track, message #6 contradicts it, message #17 resolves it)
- **Structured JSON output**: The prompt enforces a strict schema so the UI can render results reliably
- **Urgency levels**: Four tiers (critical/high/medium/low) beyond the three categories, so the CEO sees what to tackle first
- **Flags**: Separate from triage — even "ignore" or "delegate" messages can contain information the CEO should know about
- **Draft responses**: Every actionable message gets a ready-to-send draft, saving the CEO time
