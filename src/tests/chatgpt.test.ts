import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { ingestChatGPT } from "../ingest/chatgpt.js";

const FIXTURE_PATH = path.join(import.meta.dir, "../../test-fixtures/chatgpt-export.json");
const TEST_VAULT = path.join(import.meta.dir, "../../.test-vault-chatgpt");

describe("ChatGPT ingester", () => {
  beforeEach(() => {
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
    fs.mkdirSync(TEST_VAULT, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
  });

  test("ingests conversations from JSON file", async () => {
    const count = await ingestChatGPT(FIXTURE_PATH, TEST_VAULT);
    expect(count).toBe(2);
    const files = fs.readdirSync(TEST_VAULT);
    expect(files.length).toBe(2);
  });

  test("follows correct branch from tree (not forks)", async () => {
    await ingestChatGPT(FIXTURE_PATH, TEST_VAULT);
    const files = fs.readdirSync(TEST_VAULT);
    const forkedFile = files.find((f) => f.includes("test-conversation-with-forks"));
    expect(forkedFile).toBeDefined();
    const content = fs.readFileSync(path.join(TEST_VAULT, forkedFile!), "utf-8");
    expect(content).toContain("I'm doing great!");
    expect(content).not.toContain("forked response that should NOT appear");
  });

  test("filters system and tool messages", async () => {
    await ingestChatGPT(FIXTURE_PATH, TEST_VAULT);
    const files = fs.readdirSync(TEST_VAULT);
    const systemFile = files.find((f) => f.includes("conversation-with-system"));
    expect(systemFile).toBeDefined();
    const content = fs.readFileSync(path.join(TEST_VAULT, systemFile!), "utf-8");
    expect(content).not.toContain("You are a helpful assistant");
    expect(content).not.toContain("calculator result");
    expect(content).toContain("What's 2+2?");
    expect(content).toContain("2 + 2 equals 4");
  });

  test("extracts model from conversation", async () => {
    await ingestChatGPT(FIXTURE_PATH, TEST_VAULT);
    const files = fs.readdirSync(TEST_VAULT);
    const forkedFile = files.find((f) => f.includes("test-conversation-with-forks"));
    const content = fs.readFileSync(path.join(TEST_VAULT, forkedFile!), "utf-8");
    expect(content).toContain("model: gpt-4o");
  });
});
