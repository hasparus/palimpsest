import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { ingestClaudeWeb } from "../ingest/claude-web.js";
import { resetDeduplicationCache } from "../normalize.js";

const WRAPPED_FIXTURE = path.join(import.meta.dir, "../../test-fixtures/claude-web-export.json");
const BARE_ARRAY_FIXTURE = path.join(import.meta.dir, "../../test-fixtures/claude-web-bare-array.json");
const TEST_VAULT = path.join(import.meta.dir, "../../.test-vault-claude-web");

describe("Claude Web ingester", () => {
  beforeEach(() => {
    resetDeduplicationCache();
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
    fs.mkdirSync(TEST_VAULT, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
  });

  test("ingests wrapped format with conversations key", async () => {
    const count = await ingestClaudeWeb(WRAPPED_FIXTURE, TEST_VAULT);
    expect(count).toBe(2);
  });

  test("ingests bare array format", async () => {
    const count = await ingestClaudeWeb(BARE_ARRAY_FIXTURE, TEST_VAULT);
    expect(count).toBe(1);
    const files = fs.readdirSync(TEST_VAULT);
    expect(files.length).toBe(1);
  });

  test("extracts text from content blocks", async () => {
    await ingestClaudeWeb(WRAPPED_FIXTURE, TEST_VAULT);
    const files = fs.readdirSync(TEST_VAULT);
    const tsFile = files.find((f) => f.includes("typescript-question"));
    expect(tsFile).toBeDefined();
    const content = fs.readFileSync(path.join(TEST_VAULT, tsFile!), "utf-8");
    expect(content).toContain("Generics allow you to write reusable code");
  });

  test("skips tool_use and tool_result blocks", async () => {
    await ingestClaudeWeb(WRAPPED_FIXTURE, TEST_VAULT);
    const files = fs.readdirSync(TEST_VAULT);
    const tsFile = files.find((f) => f.includes("typescript-question"));
    const content = fs.readFileSync(path.join(TEST_VAULT, tsFile!), "utf-8");
    expect(content).not.toContain("Created artifact");
    expect(content).not.toContain("artifacts");
  });

  test("includes thinking block content", async () => {
    await ingestClaudeWeb(WRAPPED_FIXTURE, TEST_VAULT);
    const files = fs.readdirSync(TEST_VAULT);
    const tsFile = files.find((f) => f.includes("typescript-question"));
    const content = fs.readFileSync(path.join(TEST_VAULT, tsFile!), "utf-8");
    expect(content).toContain("User wants to learn about TypeScript generics");
  });

  test("extracts model family tag", async () => {
    await ingestClaudeWeb(WRAPPED_FIXTURE, TEST_VAULT);
    const files = fs.readdirSync(TEST_VAULT);
    const tsFile = files.find((f) => f.includes("typescript-question"));
    const content = fs.readFileSync(path.join(TEST_VAULT, tsFile!), "utf-8");
    expect(content).toContain("model: claude-3.5-sonnet");
  });
});
