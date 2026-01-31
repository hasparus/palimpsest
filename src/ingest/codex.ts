import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { Conversation, Message } from "../types.js";
import { writeConversation } from "../normalize.js";

interface CodexSessionMeta {
  type: "session_meta";
  timestamp: string;
  payload: {
    id: string;
    timestamp: string;
    cwd: string;
    model_provider?: string;
    git?: {
      branch?: string;
      repository_url?: string;
    };
  };
}

interface CodexResponseItem {
  type: "response_item";
  timestamp: string;
  payload: {
    type: "message";
    role: "user" | "assistant";
    content: { type: string; text?: string }[];
  };
}

type CodexEntry = CodexSessionMeta | CodexResponseItem | { type: string };

function extractText(content: { type: string; text?: string }[]): string {
  return content
    .filter((c) => c.type === "input_text" || c.type === "output_text" || c.type === "text")
    .map((c) => c.text || "")
    .filter((t) => !t.startsWith("<environment_context>"))
    .join("\n")
    .trim();
}

function parseCodexSession(filepath: string): Conversation | null {
  const content = fs.readFileSync(filepath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());

  let sessionMeta: CodexSessionMeta["payload"] | undefined;
  const messages: Message[] = [];

  for (const line of lines) {
    try {
      const entry: CodexEntry = JSON.parse(line);

      if (entry.type === "session_meta") {
        sessionMeta = (entry as CodexSessionMeta).payload;
      } else if (entry.type === "response_item") {
        const item = entry as CodexResponseItem;
        if (item.payload.type === "message") {
          const text = extractText(item.payload.content);
          if (text) {
            messages.push({
              role: item.payload.role,
              content: text,
              timestamp: new Date(item.timestamp),
            });
          }
        }
      }
    } catch {
      continue;
    }
  }

  if (messages.length === 0) return null;

  const firstUserMsg = messages.find((m) => m.role === "user");
  const title = firstUserMsg
    ? firstUserMsg.content.slice(0, 60).replace(/\n/g, " ") +
      (firstUserMsg.content.length > 60 ? "..." : "")
    : "Codex Session";

  return {
    id: sessionMeta?.id || path.basename(filepath, ".jsonl"),
    title,
    source: "codex",
    model: sessionMeta?.model_provider,
    date: sessionMeta ? new Date(sessionMeta.timestamp) : new Date(),
    messages,
  };
}

function findJsonlFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".jsonl")) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

export async function ingestCodex(vaultPath: string): Promise<void> {
  const codexDir = path.join(os.homedir(), ".codex");

  if (!fs.existsSync(codexDir)) {
    console.log("No Codex directory found at ~/.codex");
    return;
  }

  fs.mkdirSync(vaultPath, { recursive: true });

  const sessionsDir = path.join(codexDir, "sessions");
  const archivedDir = path.join(codexDir, "archived_sessions");

  const allFiles = [
    ...findJsonlFiles(sessionsDir),
    ...findJsonlFiles(archivedDir),
  ];

  console.log(`Found ${allFiles.length} Codex session files`);

  let count = 0;
  for (const filepath of allFiles) {
    try {
      const conversation = parseCodexSession(filepath);
      if (conversation && conversation.messages.length > 0) {
        await writeConversation(conversation, vaultPath);
        count++;
      }
    } catch (err) {
      console.error(`Failed to parse ${filepath}:`, err);
    }
  }

  console.log(`Wrote ${count} Codex conversations to ${vaultPath}`);
}
