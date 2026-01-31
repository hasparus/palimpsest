import * as fs from "node:fs";
import * as path from "node:path";
import JSZip from "jszip";
import type { Conversation, Message } from "../types.js";
import { writeConversation } from "../normalize.js";

interface ChatGPTMessage {
  id: string;
  author: { role: string };
  content: {
    content_type: string;
    parts?: (string | { content_type?: string })[];
  };
  create_time?: number;
}

interface ChatGPTMapping {
  [key: string]: {
    message: ChatGPTMessage | null;
    parent: string | null;
    children: string[];
  };
}

interface ChatGPTConversation {
  id: string;
  title: string;
  create_time: number;
  mapping: ChatGPTMapping;
  default_model_slug?: string;
}

function extractTextFromParts(parts?: (string | { content_type?: string })[]): string {
  if (!parts) return "";
  return parts
    .filter((part): part is string => typeof part === "string")
    .join("\n");
}

function extractMessages(mapping: ChatGPTMapping): Message[] {
  const messages: Message[] = [];
  const visited = new Set<string>();

  function findRoot(): string | null {
    for (const [id, node] of Object.entries(mapping)) {
      if (!node.parent) return id;
    }
    return null;
  }

  function traverse(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = mapping[nodeId];
    if (!node) return;

    if (node.message) {
      const { author, content, create_time } = node.message;
      const role = author.role as "user" | "assistant" | "system";

      if ((role === "user" || role === "assistant") && content.content_type === "text") {
        const text = extractTextFromParts(content.parts);
        if (text.trim()) {
          messages.push({
            role,
            content: text,
            timestamp: create_time ? new Date(create_time * 1000) : undefined,
          });
        }
      }
    }

    for (const childId of node.children) {
      traverse(childId);
    }
  }

  const root = findRoot();
  if (root) traverse(root);

  return messages;
}

function parseChatGPTConversation(raw: ChatGPTConversation): Conversation {
  const messages = extractMessages(raw.mapping);

  return {
    id: raw.id,
    title: raw.title || "Untitled",
    source: "chatgpt",
    model: raw.default_model_slug,
    date: new Date(raw.create_time * 1000),
    messages,
  };
}

export async function ingestChatGPT(inputPath: string, vaultPath: string): Promise<void> {
  let jsonContent: string;

  if (inputPath.endsWith(".zip")) {
    const zipData = fs.readFileSync(inputPath);
    const zip = await JSZip.loadAsync(zipData);
    const conversationsFile = zip.file("conversations.json");
    if (!conversationsFile) {
      throw new Error("No conversations.json found in ZIP");
    }
    jsonContent = await conversationsFile.async("string");
  } else if (inputPath.endsWith(".json")) {
    jsonContent = fs.readFileSync(inputPath, "utf-8");
  } else {
    throw new Error("Input must be a .zip or .json file");
  }

  const rawConversations: ChatGPTConversation[] = JSON.parse(jsonContent);
  console.log(`Found ${rawConversations.length} conversations`);

  fs.mkdirSync(vaultPath, { recursive: true });

  let count = 0;
  for (const raw of rawConversations) {
    try {
      const conversation = parseChatGPTConversation(raw);
      if (conversation.messages.length > 0) {
        await writeConversation(conversation, vaultPath);
        count++;
      }
    } catch (err) {
      console.error(`Failed to parse conversation ${raw.id}:`, err);
    }
  }

  console.log(`Wrote ${count} conversations to ${vaultPath}`);
}
