import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";
import { resetDeduplicationCache } from "../normalize.js";

const TEST_VAULT = path.join(import.meta.dir, "../../.test-vault-e2e");
const FIXTURES = path.join(import.meta.dir, "../../test-fixtures");

function readVaultFiles() {
  return fs.readdirSync(TEST_VAULT).filter((f) => f.endsWith(".md"));
}

function readVaultFile(filename: string) {
  const content = fs.readFileSync(path.join(TEST_VAULT, filename), "utf-8");
  return matter(content);
}

function allFrontmatter() {
  return readVaultFiles().map((f) => readVaultFile(f).data);
}

describe("e2e: ChatGPT → vault", () => {
  beforeEach(() => {
    resetDeduplicationCache();
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
    fs.mkdirSync(TEST_VAULT, { recursive: true });
  });
  afterEach(() => fs.rmSync(TEST_VAULT, { recursive: true, force: true }));

  test("ingests conversations, applies tags, correct frontmatter", async () => {
    const { ingestChatGPT } = await import("../ingest/chatgpt.js");
    const count = await ingestChatGPT(path.join(FIXTURES, "chatgpt-export.json"), TEST_VAULT);

    expect(count).toBe(2);
    const files = readVaultFiles();
    expect(files.length).toBe(2);

    const fms = allFrontmatter();
    for (const fm of fms) {
      expect(fm.source).toBe("chatgpt");
      expect(fm.id).toBeTruthy();
      expect(fm.date).toBeTruthy();
      expect(fm.tags).toBeArray();
      expect(fm.tags).toContain("chatgpt");
    }
  });

  test("filters forks — only current_node path appears", async () => {
    const { ingestChatGPT } = await import("../ingest/chatgpt.js");
    await ingestChatGPT(path.join(FIXTURES, "chatgpt-export.json"), TEST_VAULT);

    const files = readVaultFiles();
    const convo1File = files.find((f) => f.includes("test-conversation-with-forks"));
    expect(convo1File).toBeTruthy();

    const { content } = readVaultFile(convo1File!);
    expect(content).toContain("Hello, how are you?");
    expect(content).toContain("Can you help me with TypeScript?");
    expect(content).not.toContain("forked response that should NOT appear");
  });

  test("filters system and tool messages", async () => {
    const { ingestChatGPT } = await import("../ingest/chatgpt.js");
    await ingestChatGPT(path.join(FIXTURES, "chatgpt-export.json"), TEST_VAULT);

    const files = readVaultFiles();
    const convo2File = files.find((f) => f.includes("conversation-with-system-and-tool"));
    expect(convo2File).toBeTruthy();

    const { content } = readVaultFile(convo2File!);
    expect(content).not.toContain("You are a helpful assistant");
    expect(content).not.toContain("calculator result");
    expect(content).toContain("2 + 2 equals 4");
  });

  test("assigns model family tag", async () => {
    const { ingestChatGPT } = await import("../ingest/chatgpt.js");
    await ingestChatGPT(path.join(FIXTURES, "chatgpt-export.json"), TEST_VAULT);

    const fms = allFrontmatter();
    const gpt4o = fms.find((fm) => fm.model === "gpt-4o");
    expect(gpt4o).toBeTruthy();
    expect(gpt4o!.tags).toContain("gpt-4o");
  });
});

describe("e2e: Claude Web → vault", () => {
  beforeEach(() => {
    resetDeduplicationCache();
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
    fs.mkdirSync(TEST_VAULT, { recursive: true });
  });
  afterEach(() => fs.rmSync(TEST_VAULT, { recursive: true, force: true }));

  test("ingests wrapped format with content blocks", async () => {
    const { ingestClaudeWeb } = await import("../ingest/claude-web.js");
    const count = await ingestClaudeWeb(path.join(FIXTURES, "claude-web-export.json"), TEST_VAULT);

    expect(count).toBe(2);
    const files = readVaultFiles();
    expect(files.length).toBe(2);

    const fms = allFrontmatter();
    for (const fm of fms) {
      expect(fm.source).toBe("claude-web");
      expect(fm.tags).toContain("claude-web");
    }
  });

  test("extracts thinking blocks as blockquotes", async () => {
    const { ingestClaudeWeb } = await import("../ingest/claude-web.js");
    await ingestClaudeWeb(path.join(FIXTURES, "claude-web-export.json"), TEST_VAULT);

    const files = readVaultFiles();
    const tsFile = files.find((f) => f.includes("typescript-question"));
    expect(tsFile).toBeTruthy();

    const { content } = readVaultFile(tsFile!);
    expect(content).toContain("*thinking:*");
    expect(content).toContain("Generics allow you");
  });

  test("filters tool_use messages — no artifact content leaks", async () => {
    const { ingestClaudeWeb } = await import("../ingest/claude-web.js");
    await ingestClaudeWeb(path.join(FIXTURES, "claude-web-export.json"), TEST_VAULT);

    const files = readVaultFiles();
    for (const f of files) {
      const { content } = readVaultFile(f);
      expect(content).not.toContain("Created artifact");
    }
  });

  test("ingests bare array format", async () => {
    const { ingestClaudeWeb } = await import("../ingest/claude-web.js");
    const count = await ingestClaudeWeb(path.join(FIXTURES, "claude-web-bare-array.json"), TEST_VAULT);

    expect(count).toBe(1);
    const { content } = readVaultFile(readVaultFiles()[0]);
    expect(content).toContain("bare array format");
  });

  test("assigns claude model family tags", async () => {
    const { ingestClaudeWeb } = await import("../ingest/claude-web.js");
    await ingestClaudeWeb(path.join(FIXTURES, "claude-web-export.json"), TEST_VAULT);

    const fms = allFrontmatter();
    const sonnet = fms.find((fm) => fm.model === "claude-3.5-sonnet");
    expect(sonnet).toBeTruthy();
    expect(sonnet!.tags).toContain("claude-3.5");
  });
});

describe("e2e: Claude Code → vault", () => {
  beforeEach(() => {
    resetDeduplicationCache();
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
    fs.mkdirSync(TEST_VAULT, { recursive: true });
  });
  afterEach(() => fs.rmSync(TEST_VAULT, { recursive: true, force: true }));

  test("ingests JSONL with thinking blocks and file-history-snapshot filtering", async () => {
    const { ingestClaudeCode } = await import("../ingest/claude-code.js");
    const count = await ingestClaudeCode(TEST_VAULT, path.join(FIXTURES, "claude-code-session.jsonl"));

    expect(count).toBe(1);
    const file = readVaultFiles()[0];
    const { data, content } = readVaultFile(file);

    expect(data.source).toBe("claude-code");
    expect(data.id).toBe("session-001");
    expect(content).toContain("TypeScript error");
    expect(content).toContain("*thinking:*");
    expect(content).toContain("type guard");
  });

  test("title includes project name from cwd", async () => {
    const { ingestClaudeCode } = await import("../ingest/claude-code.js");
    await ingestClaudeCode(TEST_VAULT, path.join(FIXTURES, "claude-code-session.jsonl"));

    const { content } = readVaultFile(readVaultFiles()[0]);
    expect(content).toContain("[my-project]");
  });
});

describe("e2e: Codex → vault", () => {
  beforeEach(() => {
    resetDeduplicationCache();
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
    fs.mkdirSync(TEST_VAULT, { recursive: true });
  });
  afterEach(() => fs.rmSync(TEST_VAULT, { recursive: true, force: true }));

  test("ingests JSONL, strips environment_context", async () => {
    const { ingestCodex } = await import("../ingest/codex.js");
    const count = await ingestCodex(TEST_VAULT, path.join(FIXTURES, "codex-session.jsonl"));

    expect(count).toBe(1);
    const { data, content } = readVaultFile(readVaultFiles()[0]);

    expect(data.source).toBe("codex");
    expect(data.id).toBe("codex-001");
    expect(content).toContain("React component");
    expect(content).not.toContain("<environment_context>");
    expect(content).not.toContain("Darwin 23.0.0");
  });

  test("extracts model from session_meta", async () => {
    const { ingestCodex } = await import("../ingest/codex.js");
    await ingestCodex(TEST_VAULT, path.join(FIXTURES, "codex-session.jsonl"));

    const { data } = readVaultFile(readVaultFiles()[0]);
    expect(data.model).toBe("o3");
    expect(data.tags).toContain("o-series");
  });
});

describe("e2e: tagger", () => {
  beforeEach(() => {
    resetDeduplicationCache();
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
    fs.mkdirSync(TEST_VAULT, { recursive: true });
  });
  afterEach(() => fs.rmSync(TEST_VAULT, { recursive: true, force: true }));

  test("adds topic tags based on body content", async () => {
    const { ingestChatGPT } = await import("../ingest/chatgpt.js");
    await ingestChatGPT(path.join(FIXTURES, "chatgpt-export.json"), TEST_VAULT);

    const files = readVaultFiles();
    const tsConvo = files.find((f) => f.includes("test-conversation-with-forks"));
    const { data } = readVaultFile(tsConvo!);

    // body mentions TypeScript
    expect(data.tags).toContain("typescript");
  });

  test("tagVault is idempotent", async () => {
    const { ingestClaudeWeb } = await import("../ingest/claude-web.js");
    const { tagVault } = await import("../tagger.js");

    await ingestClaudeWeb(path.join(FIXTURES, "claude-web-export.json"), TEST_VAULT);

    await tagVault(TEST_VAULT);
    const tagsAfterFirst = allFrontmatter().map((fm) => fm.tags);

    await tagVault(TEST_VAULT);
    const tagsAfterSecond = allFrontmatter().map((fm) => fm.tags);

    expect(tagsAfterSecond).toEqual(tagsAfterFirst);
  });

  test("tags include year and quarter", async () => {
    const { ingestChatGPT } = await import("../ingest/chatgpt.js");
    await ingestChatGPT(path.join(FIXTURES, "chatgpt-export.json"), TEST_VAULT);

    const fms = allFrontmatter();
    for (const fm of fms) {
      expect(fm.tags!.some((t: string) => /^\d{4}$/.test(t))).toBe(true);
      expect(fm.tags!.some((t: string) => /^Q[1-4]$/.test(t))).toBe(true);
    }
  });
});

describe("e2e: backlinker", () => {
  beforeEach(() => {
    resetDeduplicationCache();
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
    fs.mkdirSync(TEST_VAULT, { recursive: true });
  });
  afterEach(() => fs.rmSync(TEST_VAULT, { recursive: true, force: true }));

  test("adds [[wikilinks]] between files with overlapping tags", async () => {
    const { ingestChatGPT } = await import("../ingest/chatgpt.js");
    const { ingestClaudeWeb } = await import("../ingest/claude-web.js");
    const { ingestClaudeCode } = await import("../ingest/claude-code.js");
    const { ingestCodex } = await import("../ingest/codex.js");
    const { backlinkVault } = await import("../backlinker.js");

    // need enough files for multi-way tag overlap
    await ingestChatGPT(path.join(FIXTURES, "chatgpt-export.json"), TEST_VAULT);
    await ingestClaudeWeb(path.join(FIXTURES, "claude-web-export.json"), TEST_VAULT);
    await ingestClaudeCode(TEST_VAULT, path.join(FIXTURES, "claude-code-session.jsonl"));
    await ingestCodex(TEST_VAULT, path.join(FIXTURES, "codex-session.jsonl"));

    await backlinkVault(TEST_VAULT);

    const files = readVaultFiles();
    let anyBacklinks = false;
    for (const f of files) {
      const raw = fs.readFileSync(path.join(TEST_VAULT, f), "utf-8");
      if (raw.includes("[[")) {
        anyBacklinks = true;
        // wikilinks should be in ## Related section
        const relatedIdx = raw.lastIndexOf("## Related");
        const wikilinkIdx = raw.indexOf("[[");
        expect(wikilinkIdx).toBeGreaterThan(relatedIdx);
      }
    }
    expect(anyBacklinks).toBe(true);
  });
});

describe("e2e: deduplication", () => {
  beforeEach(() => {
    resetDeduplicationCache();
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
    fs.mkdirSync(TEST_VAULT, { recursive: true });
  });
  afterEach(() => fs.rmSync(TEST_VAULT, { recursive: true, force: true }));

  test("re-ingesting same source does not duplicate files", async () => {
    const { ingestChatGPT } = await import("../ingest/chatgpt.js");

    const count1 = await ingestChatGPT(path.join(FIXTURES, "chatgpt-export.json"), TEST_VAULT);
    expect(count1).toBe(2);

    // reset cache to simulate separate CLI run
    resetDeduplicationCache();

    const count2 = await ingestChatGPT(path.join(FIXTURES, "chatgpt-export.json"), TEST_VAULT);
    expect(count2).toBe(0); // dedup: all already exist on disk

    const files = readVaultFiles();
    expect(files.length).toBe(2); // still only 2 files on disk
  });

  test("different sources with distinct IDs create separate files", async () => {
    const { ingestChatGPT } = await import("../ingest/chatgpt.js");
    const { ingestClaudeWeb } = await import("../ingest/claude-web.js");
    const { ingestCodex } = await import("../ingest/codex.js");

    await ingestChatGPT(path.join(FIXTURES, "chatgpt-export.json"), TEST_VAULT);
    await ingestClaudeWeb(path.join(FIXTURES, "claude-web-export.json"), TEST_VAULT);
    await ingestCodex(TEST_VAULT, path.join(FIXTURES, "codex-session.jsonl"));

    const files = readVaultFiles();
    expect(files.length).toBe(5); // 2 chatgpt + 2 claude-web + 1 codex

    const sources = new Set(allFrontmatter().map((fm) => fm.source));
    expect(sources).toEqual(new Set(["chatgpt", "claude-web", "codex"]));
  });
});

describe("e2e: full pipeline (ingest → tag → backlink)", () => {
  beforeEach(() => {
    resetDeduplicationCache();
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
    fs.mkdirSync(TEST_VAULT, { recursive: true });
  });
  afterEach(() => fs.rmSync(TEST_VAULT, { recursive: true, force: true }));

  test("multi-source ingest then tag then backlink", async () => {
    const { ingestChatGPT } = await import("../ingest/chatgpt.js");
    const { ingestClaudeWeb } = await import("../ingest/claude-web.js");
    const { ingestClaudeCode } = await import("../ingest/claude-code.js");
    const { ingestCodex } = await import("../ingest/codex.js");
    const { tagVault } = await import("../tagger.js");
    const { backlinkVault } = await import("../backlinker.js");

    // 1. Ingest all sources
    await ingestChatGPT(path.join(FIXTURES, "chatgpt-export.json"), TEST_VAULT);
    await ingestClaudeWeb(path.join(FIXTURES, "claude-web-export.json"), TEST_VAULT);
    await ingestClaudeCode(TEST_VAULT, path.join(FIXTURES, "claude-code-session.jsonl"));
    await ingestCodex(TEST_VAULT, path.join(FIXTURES, "codex-session.jsonl"));

    const files = readVaultFiles();
    expect(files.length).toBe(6); // 2 + 2 + 1 + 1

    // 2. Re-tag (should be additive, not destructive)
    await tagVault(TEST_VAULT);

    // 3. Backlink
    await backlinkVault(TEST_VAULT);

    // Verify every file has valid structure
    for (const f of files) {
      const { data, content } = readVaultFile(f);
      expect(data.source).toBeTruthy();
      expect(data.date).toBeTruthy();
      expect(data.id).toBeTruthy();
      expect(data.tags).toBeArray();
      expect(data.tags.length).toBeGreaterThanOrEqual(3); // at least source + year + quarter
      expect(content).toContain("# "); // title heading
      expect(content).toContain("## Related"); // related section exists
    }

    // Verify markdown filenames follow convention
    for (const f of files) {
      expect(f).toMatch(/^\d{4}-\d{2}-\d{2}_(chatgpt|claude-web|claude-code|codex)_[a-f0-9]{8}_.+\.md$/);
    }
  });

  test("pipeline produces valid Obsidian vault — no broken frontmatter", async () => {
    const { ingestChatGPT } = await import("../ingest/chatgpt.js");
    const { ingestClaudeWeb } = await import("../ingest/claude-web.js");
    const { tagVault } = await import("../tagger.js");
    const { backlinkVault } = await import("../backlinker.js");

    await ingestChatGPT(path.join(FIXTURES, "chatgpt-export.json"), TEST_VAULT);
    await ingestClaudeWeb(path.join(FIXTURES, "claude-web-export.json"), TEST_VAULT);
    await tagVault(TEST_VAULT);
    await backlinkVault(TEST_VAULT);

    for (const f of readVaultFiles()) {
      const raw = fs.readFileSync(path.join(TEST_VAULT, f), "utf-8");

      // starts with frontmatter delimiter
      expect(raw.startsWith("---\n")).toBe(true);

      // frontmatter closes
      const secondDelim = raw.indexOf("---", 4);
      expect(secondDelim).toBeGreaterThan(4);

      // gray-matter can round-trip it without error
      const parsed = matter(raw);
      const reserialized = matter.stringify(parsed.content, parsed.data);
      const reparsed = matter(reserialized);
      expect(reparsed.data.id).toBe(parsed.data.id);
      expect(reparsed.data.source).toBe(parsed.data.source);
    }
  });
});
