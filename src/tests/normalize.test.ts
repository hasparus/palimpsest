import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { conversationToMarkdown, writeConversation } from "../normalize.js";
import type { Conversation } from "../types.js";

const TEST_VAULT = path.join(import.meta.dir, "../../.test-vault-normalize");

describe("normalize", () => {
  beforeEach(() => {
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
    fs.mkdirSync(TEST_VAULT, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
  });

  const baseConversation: Conversation = {
    id: "test-123",
    source: "test",
    title: "Test Conversation",
    date: new Date("2025-03-15T10:00:00Z"),
    messages: [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
    ],
  };

  test("generates valid frontmatter", () => {
    const md = conversationToMarkdown(baseConversation);
    expect(md).toContain("---");
    expect(md).toContain("source: test");
    expect(md).toContain("date: '2025-03-15'");
    expect(md).toContain("id: test-123");
  });

  test("includes model when present", () => {
    const convo = { ...baseConversation, model: "gpt-4o" };
    const md = conversationToMarkdown(convo);
    expect(md).toContain("model: gpt-4o");
  });

  test("includes tags when present", () => {
    const convo = { ...baseConversation, tags: ["typescript", "coding"] };
    const md = conversationToMarkdown(convo);
    expect(md).toContain("tags:");
  });

  test("generates title heading", () => {
    const md = conversationToMarkdown(baseConversation);
    expect(md).toContain("# Test Conversation");
  });

  test("generates message sections", () => {
    const md = conversationToMarkdown(baseConversation);
    expect(md).toContain("## User");
    expect(md).toContain("Hello");
    expect(md).toContain("## Assistant");
    expect(md).toContain("Hi there!");
  });

  test("includes Related section", () => {
    const md = conversationToMarkdown(baseConversation);
    expect(md).toContain("## Related");
  });

  test("writeConversation deduplicates by id", async () => {
    await writeConversation(baseConversation, TEST_VAULT);
    await writeConversation(baseConversation, TEST_VAULT);
    const files = fs.readdirSync(TEST_VAULT);
    expect(files.length).toBe(1);
  });

  test("writeConversation writes different conversations", async () => {
    await writeConversation(baseConversation, TEST_VAULT);
    await writeConversation({ ...baseConversation, id: "test-456" }, TEST_VAULT);
    const files = fs.readdirSync(TEST_VAULT);
    expect(files.length).toBe(2);
  });

  test("filename includes hash to prevent collisions", async () => {
    await writeConversation(baseConversation, TEST_VAULT);
    const files = fs.readdirSync(TEST_VAULT);
    expect(files[0]).toMatch(/^\d{4}-\d{2}-\d{2}_test_[a-f0-9]{8}_/);
  });
});
