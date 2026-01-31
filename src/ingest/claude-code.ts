import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { Conversation, Message } from "../types.js";
import { writeConversation } from "../normalize.js";

interface ClaudeCodeEntry {
  type: "user" | "assistant" | "file-history-snapshot";
  uuid?: string;
  parentUuid?: string;
  sessionId?: string;
  timestamp?: string;
  cwd?: string;
  message?: {
    role: "user" | "assistant";
    content: string | { type: string; text?: string; thinking?: string }[];
  };
}

function extractContent(content: string | { type: string; text?: string }[]): string {
  if (typeof content === "string") {
    return content;
  }
  return content
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text!)
    .join("\n");
}

function parseConversationFile(filepath: string): Conversation | null {
  const content = fs.readFileSync(filepath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());

  const messages: Message[] = [];
  let sessionId: string | undefined;
  let firstTimestamp: Date | undefined;
  let cwd: string | undefined;

  for (const line of lines) {
    try {
      const entry: ClaudeCodeEntry = JSON.parse(line);

      if (entry.type === "file-history-snapshot") continue;

      if (!sessionId && entry.sessionId) sessionId = entry.sessionId;
      if (!cwd && entry.cwd) cwd = entry.cwd;
      if (!firstTimestamp && entry.timestamp) {
        firstTimestamp = new Date(entry.timestamp);
      }

      if (entry.message && (entry.type === "user" || entry.type === "assistant")) {
        const text = extractContent(entry.message.content);
        if (text.trim() && text !== "(no content)") {
          messages.push({
            role: entry.type === "user" ? "user" : "assistant",
            content: text,
            timestamp: entry.timestamp ? new Date(entry.timestamp) : undefined,
          });
        }
      }
    } catch {
      continue;
    }
  }

  if (messages.length === 0) return null;

  const title =
    messages[0].content.slice(0, 60).replace(/\n/g, " ") +
    (messages[0].content.length > 60 ? "..." : "");

  return {
    id: sessionId || path.basename(filepath, ".jsonl"),
    title,
    source: "claude-code",
    date: firstTimestamp || new Date(),
    messages,
  };
}

export async function ingestClaudeCode(vaultPath: string): Promise<void> {
  const claudeDir = path.join(os.homedir(), ".claude");
  const projectsDir = path.join(claudeDir, "projects");

  if (!fs.existsSync(projectsDir)) {
    console.log("No Claude Code projects found at ~/.claude/projects");
    return;
  }

  fs.mkdirSync(vaultPath, { recursive: true });

  const projectDirs = fs.readdirSync(projectsDir);
  let count = 0;

  for (const projectDir of projectDirs) {
    const projectPath = path.join(projectsDir, projectDir);
    if (!fs.statSync(projectPath).isDirectory()) continue;

    const jsonlFiles = fs.readdirSync(projectPath).filter((f) => f.endsWith(".jsonl"));

    for (const jsonlFile of jsonlFiles) {
      const filepath = path.join(projectPath, jsonlFile);
      try {
        const conversation = parseConversationFile(filepath);
        if (conversation) {
          await writeConversation(conversation, vaultPath);
          count++;
        }
      } catch (err) {
        console.error(`Failed to parse ${filepath}:`, err);
      }
    }
  }

  console.log(`Wrote ${count} Claude Code conversations to ${vaultPath}`);
}
