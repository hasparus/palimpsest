import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { ingestCodex } from "../ingest/codex.js";
import { resetDeduplicationCache } from "../normalize.js";

const FIXTURE_PATH = path.join(import.meta.dir, "../../test-fixtures/codex-session.jsonl");
const TEST_VAULT = path.join(import.meta.dir, "../../.test-vault-codex");

describe("Codex ingester", () => {
  beforeEach(() => {
    resetDeduplicationCache();
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
    fs.mkdirSync(TEST_VAULT, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
  });

  test("ingests JSONL session file", async () => {
    const count = await ingestCodex(TEST_VAULT, FIXTURE_PATH);
    expect(count).toBe(1);
    const files = fs.readdirSync(TEST_VAULT);
    expect(files.length).toBe(1);
  });

  test("filters environment_context content", async () => {
    await ingestCodex(TEST_VAULT, FIXTURE_PATH);
    const files = fs.readdirSync(TEST_VAULT);
    const content = fs.readFileSync(path.join(TEST_VAULT, files[0]), "utf-8");
    expect(content).not.toContain("<environment_context>");
    expect(content).not.toContain("Darwin 23.0.0");
    expect(content).toContain("How do I create a React component?");
  });

  test("extracts response text from output_text", async () => {
    await ingestCodex(TEST_VAULT, FIXTURE_PATH);
    const files = fs.readdirSync(TEST_VAULT);
    const content = fs.readFileSync(path.join(TEST_VAULT, files[0]), "utf-8");
    expect(content).toContain("Here's how to create a React component");
  });

  test("uses session_meta id as conversation id", async () => {
    await ingestCodex(TEST_VAULT, FIXTURE_PATH);
    const files = fs.readdirSync(TEST_VAULT);
    const content = fs.readFileSync(path.join(TEST_VAULT, files[0]), "utf-8");
    expect(content).toContain("id: codex-001");
  });

  test("extracts model from session_meta", async () => {
    await ingestCodex(TEST_VAULT, FIXTURE_PATH);
    const files = fs.readdirSync(TEST_VAULT);
    const content = fs.readFileSync(path.join(TEST_VAULT, files[0]), "utf-8");
    expect(content).toContain("model: o3");
  });
});
