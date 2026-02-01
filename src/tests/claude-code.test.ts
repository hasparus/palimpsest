import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { ingestClaudeCode } from "../ingest/claude-code.js";

const FIXTURE_PATH = path.join(import.meta.dir, "../../test-fixtures/claude-code-session.jsonl");
const TEST_VAULT = path.join(import.meta.dir, "../../.test-vault-claude-code");

describe("Claude Code ingester", () => {
  beforeEach(() => {
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
    fs.mkdirSync(TEST_VAULT, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
  });

  test("ingests JSONL file with specific input", async () => {
    const count = await ingestClaudeCode(TEST_VAULT, FIXTURE_PATH);
    expect(count).toBe(1);
    const files = fs.readdirSync(TEST_VAULT);
    expect(files.length).toBe(1);
  });

  test("skips file-history-snapshot entries", async () => {
    await ingestClaudeCode(TEST_VAULT, FIXTURE_PATH);
    const files = fs.readdirSync(TEST_VAULT);
    const content = fs.readFileSync(path.join(TEST_VAULT, files[0]), "utf-8");
    expect(content).not.toContain("file-history-snapshot");
  });

  test("handles string content", async () => {
    await ingestClaudeCode(TEST_VAULT, FIXTURE_PATH);
    const files = fs.readdirSync(TEST_VAULT);
    const content = fs.readFileSync(path.join(TEST_VAULT, files[0]), "utf-8");
    expect(content).toContain("You're welcome!");
  });

  test("handles content block array with thinking", async () => {
    await ingestClaudeCode(TEST_VAULT, FIXTURE_PATH);
    const files = fs.readdirSync(TEST_VAULT);
    const content = fs.readFileSync(path.join(TEST_VAULT, files[0]), "utf-8");
    expect(content).toContain("type mismatch");
  });

  test("extracts session ID as conversation ID", async () => {
    await ingestClaudeCode(TEST_VAULT, FIXTURE_PATH);
    const files = fs.readdirSync(TEST_VAULT);
    const content = fs.readFileSync(path.join(TEST_VAULT, files[0]), "utf-8");
    expect(content).toContain("id: session-001");
  });
});
