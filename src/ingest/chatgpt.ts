import * as fs from "node:fs";
import JSZip from "jszip";
import type { Conversation, Message } from "../types.js";
import { writeConversation } from "../normalize.js";

interface ChatGPTMessage {
  id: string;
  author: { role: "user" | "assistant" | "system" | "tool" };
  content: {
    content_type: string;
    parts?: (string | object)[];
  };
  create_time?: number;
}

interface ChatGPTMappingNode {
  id: string;
  message?: ChatGPTMessage | null;
  parent?: string | null;
  children?: string[];
}

interface ChatGPTConversation {
  id: string;
  title: string;
  create_time: number;
  update_time?: number;
  mapping: Record<string, ChatGPTMappingNode>;
  current_node?: string;
  default_model_slug?: string;
}

function extractTextFromParts(parts?: (string | object)[]): string {
  if (!parts) return "";
  return parts
    .filter((part): part is string => typeof part === "string")
    .filter((part) => part.trim().length > 0)
    .join("\n");
}

function shouldIncludeMessage(msg: ChatGPTMessage, role: string): boolean {
  if (role === "system" || role === "tool") {
    return false;
  }

  if (role === "assistant" && msg.content.content_type !== "text") {
    return false;
  }

  const text = extractTextFromParts(msg.content.parts);
  return text.trim().length > 0;
}

function extractMessages(
  mapping: Record<string, ChatGPTMappingNode>,
  currentNode?: string
): Message[] {
  const path: string[] = [];

  if (currentNode && mapping[currentNode]) {
    let nodeId: string | null | undefined = currentNode;
    while (nodeId && mapping[nodeId]) {
      path.unshift(nodeId);
      nodeId = mapping[nodeId].parent;
    }
  } else {
    let rootId: string | null = null;
    for (const [id, node] of Object.entries(mapping)) {
      if (!node.parent) {
        rootId = id;
        break;
      }
    }

    if (rootId) {
      let nodeId: string | null = rootId;
      while (nodeId && mapping[nodeId]) {
        path.push(nodeId);
        const children = mapping[nodeId].children;
        nodeId = children && children.length > 0 ? children[0] : null;
      }
    }
  }

  const messages: Message[] = [];

  for (const nodeId of path) {
    const node = mapping[nodeId];
    if (!node?.message) continue;

    const msg = node.message;
    const role = msg.author.role;

    if (!shouldIncludeMessage(msg, role)) continue;

    if (role === "user" || role === "assistant") {
      const text = extractTextFromParts(msg.content.parts);
      messages.push({
        role,
        content: text,
        timestamp: msg.create_time
          ? new Date(msg.create_time * 1000)
          : undefined,
      });
    }
  }

  return messages;
}

function parseChatGPTConversation(raw: ChatGPTConversation): Conversation {
  const messages = extractMessages(raw.mapping, raw.current_node);

  return {
    id: raw.id,
    title: raw.title || "Untitled",
    source: "chatgpt",
    model: raw.default_model_slug,
    date: new Date(raw.create_time * 1000),
    messages,
  };
}

export async function ingestChatGPT(
  inputPath: string,
  vaultPath: string
): Promise<number> {
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
  return count;
}
