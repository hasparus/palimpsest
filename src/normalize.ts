import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";
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

function hashId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).slice(0, 8).padStart(8, '0');
}

function generateFilename(conversation: Conversation): string {
  const dateStr = formatDate(conversation.date);
  const hash8 = hashId(conversation.id);
  const slug = slugify(conversation.title);
  return `${dateStr}_${conversation.source}_${hash8}_${slug}.md`;
}

export function conversationToMarkdown(conversation: Conversation): string {
  const frontMatter: Record<string, unknown> = {
    source: conversation.source,
    date: formatDate(conversation.date),
  };
  if (conversation.model) {
    frontMatter.model = conversation.model;
  }
  if (conversation.tags && conversation.tags.length > 0) {
    frontMatter.tags = conversation.tags;
  }
  frontMatter.id = conversation.id;

  const bodyLines: string[] = [];
  bodyLines.push(`# ${conversation.title}`);
  bodyLines.push("");

  for (const message of conversation.messages) {
    const roleLabel = message.role === "user" ? "User" : "Assistant";
    bodyLines.push(`## ${roleLabel}`);
    bodyLines.push("");
    bodyLines.push(message.content);
    bodyLines.push("");
  }

  bodyLines.push("## Related");
  bodyLines.push("");

  return matter.stringify(bodyLines.join("\n"), frontMatter);
}

let cachedVaultPath: string | null = null;
let existingIds: Set<string> = new Set();

function loadExistingIds(vaultPath: string): Set<string> {
  if (cachedVaultPath === vaultPath) return existingIds;
  existingIds = new Set();
  cachedVaultPath = vaultPath;
  if (!fs.existsSync(vaultPath)) return existingIds;
  const files = fs.readdirSync(vaultPath).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const filepath = path.join(vaultPath, file);
    const content = fs.readFileSync(filepath, "utf-8");
    const parsed = matter(content);
    if (parsed.data.id) {
      existingIds.add(parsed.data.id);
    }
  }
  return existingIds;
}

export async function writeConversation(
  conversation: Conversation,
  vaultPath: string
): Promise<string | null> {
  const ids = loadExistingIds(vaultPath);
  if (ids.has(conversation.id)) {
    return null;
  }
  ids.add(conversation.id);

  const body = conversation.messages.map((m) => m.content).join("\n\n");
  const tags = generateTags(conversation.source, conversation.date, conversation.model, body);
  const taggedConversation = { ...conversation, tags };

  const filename = generateFilename(taggedConversation);
  const filepath = path.join(vaultPath, filename);

  const markdown = conversationToMarkdown(taggedConversation);
  fs.writeFileSync(filepath, markdown, "utf-8");

  return filepath;
}
