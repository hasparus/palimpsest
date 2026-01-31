import * as fs from "node:fs";
import * as path from "node:path";
import type { Conversation } from "./types.js";
import { generateTags } from "./tagger.js";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function generateFilename(conversation: Conversation): string {
  const dateStr = formatDate(conversation.date);
  const slug = slugify(conversation.title);
  return `${dateStr}_${conversation.source}_${slug}.md`;
}

function escapeYamlString(str: string): string {
  if (/[:\[\]{}#&*!|>'"%@`]/.test(str) || str.includes("\n")) {
    return `"${str.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
  }
  return str;
}

export function conversationToMarkdown(conversation: Conversation): string {
  const lines: string[] = [];

  lines.push("---");
  lines.push(`source: ${conversation.source}`);
  lines.push(`date: ${formatDate(conversation.date)}`);
  if (conversation.model) {
    lines.push(`model: ${conversation.model}`);
  }
  if (conversation.tags && conversation.tags.length > 0) {
    lines.push(`tags: [${conversation.tags.join(", ")}]`);
  }
  lines.push(`id: ${conversation.id}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${conversation.title}`);
  lines.push("");

  for (const message of conversation.messages) {
    const roleLabel = message.role === "user" ? "User" : "Assistant";
    lines.push(`## ${roleLabel}`);
    lines.push("");
    lines.push(message.content);
    lines.push("");
  }

  lines.push("## Related");
  lines.push("");

  return lines.join("\n");
}

const writtenIds = new Set<string>();

export async function writeConversation(
  conversation: Conversation,
  vaultPath: string
): Promise<string | null> {
  if (writtenIds.has(conversation.id)) {
    return null;
  }
  writtenIds.add(conversation.id);

  const body = conversation.messages.map((m) => m.content).join("\n\n");
  const tags = generateTags(conversation.source, conversation.date, conversation.model, body);
  const taggedConversation = { ...conversation, tags };

  const filename = generateFilename(taggedConversation);
  const filepath = path.join(vaultPath, filename);

  const markdown = conversationToMarkdown(taggedConversation);
  fs.writeFileSync(filepath, markdown, "utf-8");

  return filepath;
}

export function resetDeduplication(): void {
  writtenIds.clear();
}
