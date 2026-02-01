import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";

const CLI = path.join(import.meta.dir, "../cli.ts");
const TEST_VAULT = path.join(import.meta.dir, "../../.test-vault-cli");
const FIXTURES = path.join(import.meta.dir, "../../test-fixtures");

async function run(
  ...args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", CLI, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}

function vaultFiles() {
  return fs.readdirSync(TEST_VAULT).filter((f) => f.endsWith(".md"));
}

describe("CLI subprocess", () => {
  beforeEach(() => {
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
    fs.mkdirSync(TEST_VAULT, { recursive: true });
  });
  afterEach(() => fs.rmSync(TEST_VAULT, { recursive: true, force: true }));

  test("ingest chatgpt", async () => {
    const { stdout, exitCode } = await run(
      "ingest",
      "--source",
      "chatgpt",
      "--input",
      path.join(FIXTURES, "chatgpt-export.json"),
      "--vault",
      TEST_VAULT
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("wrote 2");
    expect(vaultFiles().length).toBe(2);
  });

  test("ingest claude-web", async () => {
    const { stdout, exitCode } = await run(
      "ingest",
      "--source",
      "claude-web",
      "--input",
      path.join(FIXTURES, "claude-web-export.json"),
      "--vault",
      TEST_VAULT
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("wrote 2");
    expect(vaultFiles().length).toBe(2);
  });

  test("ingest chatgpt missing --input exits with error", async () => {
    const { stderr, exitCode } = await run(
      "ingest",
      "--source",
      "chatgpt",
      "--vault",
      TEST_VAULT
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("--input is required");
  });

  test("sync with all 4 sources", async () => {
    const { stdout, exitCode } = await run(
      "sync",
      "--vault",
      TEST_VAULT,
      "--chatgpt",
      path.join(FIXTURES, "chatgpt-export.json"),
      "--claude-web",
      path.join(FIXTURES, "claude-web-export.json"),
      "--claude-code",
      path.join(FIXTURES, "claude-code-session.jsonl"),
      "--codex",
      path.join(FIXTURES, "codex-session.jsonl")
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Sync complete!");
    const files = vaultFiles();
    expect(files.length).toBe(6); // 2 + 2 + 1 + 1

    // verify tagging ran
    expect(stdout).toContain("Tagging");

    // verify backlinking ran
    expect(stdout).toContain("backlinks");

    // spot-check frontmatter
    for (const f of files) {
      const { data } = matter(
        fs.readFileSync(path.join(TEST_VAULT, f), "utf-8")
      );
      expect(data.tags).toBeArray();
      expect(data.tags.length).toBeGreaterThanOrEqual(3);
    }
  });

  test("tag command", async () => {
    await run(
      "ingest",
      "--source",
      "chatgpt",
      "--input",
      path.join(FIXTURES, "chatgpt-export.json"),
      "--vault",
      TEST_VAULT
    );
    const { stdout, exitCode } = await run("tag", "--vault", TEST_VAULT);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Tagging");
  });

  test("backlink command", async () => {
    // ingest enough files for overlap
    await run(
      "ingest",
      "--source",
      "chatgpt",
      "--input",
      path.join(FIXTURES, "chatgpt-export.json"),
      "--vault",
      TEST_VAULT
    );
    await run(
      "ingest",
      "--source",
      "claude-web",
      "--input",
      path.join(FIXTURES, "claude-web-export.json"),
      "--vault",
      TEST_VAULT
    );
    const { stdout, exitCode } = await run("backlink", "--vault", TEST_VAULT);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("backlinks");
  });
});
