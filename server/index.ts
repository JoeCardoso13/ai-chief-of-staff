import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const anthropic = new Anthropic();
const app = createApp(anthropic);

// In production, serve the built frontend
const distPath = path.join(ROOT, "dist");
try {
  await fs.access(distPath);
  app.use((await import("express")).default.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} catch {
  // dist doesn't exist yet — dev mode, Vite serves frontend
}

const PORT = parseInt(process.env.PORT ?? "3001", 10);
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
