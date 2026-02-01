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

function extractContent(content: string | { type: string; text?: string; thinking?: string }[]): string {
  if (typeof content === "string") {
    return content;
  }
  
  const parts: string[] = [];
  for (const block of content) {
    if (block.type === "text" && block.text) {
      parts.push(block.text);
    } else if (block.type === "thinking" && block.thinking) {
      parts.push(`> *thinking:* ${block.thinking}`);
    }
  }
  return parts.join("\n\n");
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

  const firstMessageText = messages[0].content.replace(/^>\s*\*thinking:\*.*\n*/gm, "").trim();
  let title = firstMessageText.slice(0, 60).replace(/\n/g, " ");
  if (firstMessageText.length > 60) title += "...";
  
  if (cwd) {
    const projectName = path.basename(cwd);
    title = `[${projectName}] ${title}`;
  }

  return {
    id: sessionId || path.basename(filepath, ".jsonl"),
    title,
    source: "claude-code",
    date: firstTimestamp || new Date(),
    messages,
  };
}

export async function ingestClaudeCode(vaultPath: string, inputPath?: string): Promise<number> {
  fs.mkdirSync(vaultPath, { recursive: true });
  let count = 0;

  if (inputPath) {
    const conversation = parseConversationFile(inputPath);
    if (conversation) {
      const result = await writeConversation(conversation, vaultPath);
      if (result) count++;
    }
    console.log(`Found ${conversation ? 1 : 0}, wrote ${count} Claude Code conversations to ${vaultPath}`);
    return count;
  }

  const claudeDir = path.join(os.homedir(), ".claude");
  const projectsDir = path.join(claudeDir, "projects");

  if (!fs.existsSync(projectsDir)) {
    console.log("No Claude Code projects found at ~/.claude/projects");
    return 0;
  }

  let found = 0;
  const projectDirs = fs.readdirSync(projectsDir);

  for (const projectDir of projectDirs) {
    const projectPath = path.join(projectsDir, projectDir);
    if (!fs.statSync(projectPath).isDirectory()) continue;

    const jsonlFiles = fs.readdirSync(projectPath).filter((f) => f.endsWith(".jsonl"));

    for (const jsonlFile of jsonlFiles) {
      const filepath = path.join(projectPath, jsonlFile);
      try {
        const conversation = parseConversationFile(filepath);
        if (conversation) {
          found++;
          const result = await writeConversation(conversation, vaultPath);
          if (result) count++;
        }
      } catch (err) {
        console.error(`Failed to parse ${filepath}:`, err);
      }
    }
  }

  console.log(`Found ${found}, wrote ${count} Claude Code conversations to ${vaultPath}`);
  return count;
}
