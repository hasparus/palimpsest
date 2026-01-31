import * as fs from "node:fs";
import type { Conversation, Message } from "../types.js";
import { writeConversation } from "../normalize.js";

interface ClaudeWebMessage {
  uuid: string;
  text: string;
  sender: "human" | "assistant";
  created_at: string;
  updated_at: string;
}

interface ClaudeWebConversation {
  uuid: string;
  name: string;
  created_at: string;
  updated_at: string;
  chat_messages: ClaudeWebMessage[];
}

function parseClaudeWebConversation(raw: ClaudeWebConversation): Conversation {
  const messages: Message[] = raw.chat_messages.map((msg) => ({
    role: msg.sender === "human" ? "user" : "assistant",
    content: msg.text,
    timestamp: new Date(msg.created_at),
  }));

  return {
    id: raw.uuid,
    title: raw.name || "Untitled",
    source: "claude-web",
    date: new Date(raw.created_at),
    messages,
  };
}

export async function ingestClaudeWeb(inputPath: string, vaultPath: string): Promise<void> {
  const jsonContent = fs.readFileSync(inputPath, "utf-8");
  const rawConversations: ClaudeWebConversation[] = JSON.parse(jsonContent);

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
