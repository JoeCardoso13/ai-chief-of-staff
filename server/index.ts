import Anthropic from "@anthropic-ai/sdk";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Walk up from __dirname until we find package.json — this works whether
// running from source (server/) or compiled output (dist-server/server/).
function findProjectRoot(dir: string): string {
  if (existsSync(path.join(dir, "package.json"))) return dir;
  const parent = path.dirname(dir);
  if (parent === dir) return dir; // filesystem root, shouldn't happen
  return findProjectRoot(parent);
}
const ROOT = findProjectRoot(__dirname);
const envLoader = (process as typeof process & {
  loadEnvFile?: (path?: string) => void;
}).loadEnvFile;

if (envLoader && existsSync(path.join(ROOT, ".env"))) {
  envLoader(path.join(ROOT, ".env"));
}

if (envLoader && existsSync(path.join(ROOT, ".env.local"))) {
  envLoader(path.join(ROOT, ".env.local"));
}

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
