import * as fs from "node:fs";
import type { Conversation, Message } from "../types.js";
import { writeConversation } from "../normalize.js";

interface ContentBlock {
  type: "text" | "thinking" | "tool_use" | "tool_result";
  text?: string;
  thinking?: string;
  name?: string;
  input?: object;
}

interface ClaudeWebMessage {
  uuid: string;
  text: string;
  sender: "human" | "assistant";
  created_at: string;
  updated_at?: string;
  content?: ContentBlock[];
  files?: { file_name: string; file_type: string; file_size: number }[];
}

interface ClaudeWebConversation {
  uuid: string;
  name: string;
  created_at: string;
  updated_at?: string;
  chat_messages: ClaudeWebMessage[];
  model?: string;
  project_uuid?: string;
}

function extractContentFromBlocks(blocks?: ContentBlock[]): string {
  if (!blocks || blocks.length === 0) return "";

  const parts: string[] = [];

  for (const block of blocks) {
    if (block.type === "text" && block.text) {
      parts.push(block.text);
    } else if (block.type === "thinking" && block.thinking) {
      parts.push(`> *thinking:* ${block.thinking}`);
    }
  }

  return parts.join("\n\n");
}

function parseClaudeWebMessage(msg: ClaudeWebMessage): Message {
  let content: string;

  if (msg.content && msg.content.length > 0) {
    content = extractContentFromBlocks(msg.content);
  } else {
    content = msg.text || "";
  }

  return {
    role: msg.sender === "human" ? "user" : "assistant",
    content,
    timestamp: new Date(msg.created_at),
  };
}

function parseClaudeWebConversation(raw: ClaudeWebConversation): Conversation {
  const messages: Message[] = raw.chat_messages
    .map(parseClaudeWebMessage)
    .filter((msg) => msg.content.trim().length > 0);

  return {
    id: raw.uuid,
    title: raw.name || "Untitled",
    source: "claude-web",
    model: raw.model,
    date: new Date(raw.created_at),
    messages,
  };
}

function parseExportData(jsonContent: string): ClaudeWebConversation[] {
  const data = JSON.parse(jsonContent);

  if (Array.isArray(data)) {
    return data;
  }

  if (data.conversations && Array.isArray(data.conversations)) {
    return data.conversations;
  }

  throw new Error(
    "Invalid Claude Web export format: expected array or { conversations: [...] }"
  );
}

export async function ingestClaudeWeb(
  inputPath: string,
  vaultPath: string
): Promise<void> {
  const jsonContent = fs.readFileSync(inputPath, "utf-8");
  const rawConversations = parseExportData(jsonContent);

  console.log(`Found ${rawConversations.length} conversations`);

  fs.mkdirSync(vaultPath, { recursive: true });

  let count = 0;
  for (const raw of rawConversations) {
    try {
      const conversation = parseClaudeWebConversation(raw);
      if (conversation.messages.length > 0) {
        await writeConversation(conversation, vaultPath);
        count++;
      }
    } catch (err) {
      console.error(`Failed to parse conversation ${raw.uuid}:`, err);
    }
  }

  console.log(`Wrote ${count} conversations to ${vaultPath}`);
}
