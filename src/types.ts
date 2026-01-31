export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

export interface Conversation {
  id: string;
  title: string;
  source: "chatgpt" | "claude-web" | "claude-code" | "codex";
  model?: string;
  date: Date;
  messages: Message[];
  tags?: string[];
}
