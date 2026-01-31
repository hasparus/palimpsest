import * as fs from "node:fs";
import * as path from "node:path";

const TOPIC_KEYWORDS: Record<string, string[]> = {
  typescript: ["typescript", "ts", "tsx", ".ts", "tsc"],
  javascript: ["javascript", "js", "node", "npm", "pnpm", "yarn"],
  react: ["react", "jsx", "hooks", "usestate", "useeffect", "component"],
  python: ["python", "pip", "django", "flask", "pandas", "numpy"],
  rust: ["rust", "cargo", "rustc", "crate"],
  go: ["golang", "go mod", "goroutine"],
  git: ["git", "commit", "branch", "merge", "rebase", "pull request", "pr"],
  css: ["css", "tailwind", "scss", "sass", "styled", "flexbox", "grid"],
  html: ["html", "dom", "element", "tag"],
  api: ["api", "rest", "graphql", "endpoint", "fetch", "axios"],
  database: ["database", "sql", "postgres", "mysql", "mongodb", "prisma"],
  testing: ["test", "jest", "vitest", "playwright", "cypress", "mock"],
  debugging: ["debug", "error", "fix", "bug", "issue", "problem"],
  devops: ["docker", "kubernetes", "ci/cd", "deploy", "aws", "gcp", "azure"],
  coding: ["code", "function", "class", "refactor", "implement"],
};

function extractQuarter(date: Date): string {
  const month = date.getMonth();
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter}`;
}

function extractTopics(text: string): string[] {
  const lowerText = text.toLowerCase();
  const topics: string[] = [];

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        topics.push(topic);
        break;
      }
    }
  }

  return topics;
}

interface FrontMatter {
  source: string;
  date: string;
  model?: string;
  tags?: string[];
  id: string;
}

function parseFrontMatter(content: string): { frontMatter: FrontMatter; body: string } | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const yamlStr = match[1];
  const body = match[2];

  const frontMatter: Partial<FrontMatter> = {};
  for (const line of yamlStr.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();

    if (key === "tags") {
      const tagsMatch = value.match(/^\[(.*)\]$/);
      if (tagsMatch) {
        frontMatter.tags = tagsMatch[1].split(",").map((t) => t.trim()).filter(Boolean);
      }
    } else {
      frontMatter[key as keyof FrontMatter] = value as never;
    }
  }

  return { frontMatter: frontMatter as FrontMatter, body };
}

function serializeFrontMatter(fm: FrontMatter): string {
  const lines = ["---"];
  lines.push(`source: ${fm.source}`);
  lines.push(`date: ${fm.date}`);
  if (fm.model) lines.push(`model: ${fm.model}`);
  if (fm.tags && fm.tags.length > 0) {
    lines.push(`tags: [${fm.tags.join(", ")}]`);
  }
  lines.push(`id: ${fm.id}`);
  lines.push("---");
  return lines.join("\n");
}

export async function tagVault(vaultPath: string): Promise<void> {
  if (!fs.existsSync(vaultPath)) {
    console.log(`Vault not found at ${vaultPath}`);
    return;
  }

  const files = fs.readdirSync(vaultPath).filter((f) => f.endsWith(".md"));
  console.log(`Tagging ${files.length} files...`);

  let updated = 0;
  for (const file of files) {
    const filepath = path.join(vaultPath, file);
    const content = fs.readFileSync(filepath, "utf-8");

    const parsed = parseFrontMatter(content);
    if (!parsed) continue;

    const { frontMatter, body } = parsed;
    const existingTags = new Set(frontMatter.tags || []);

    existingTags.add(frontMatter.source);

    if (frontMatter.date) {
      const date = new Date(frontMatter.date);
      existingTags.add(date.getFullYear().toString());
      existingTags.add(extractQuarter(date));
    }

    const topics = extractTopics(body);
    for (const topic of topics) {
      existingTags.add(topic);
    }

    const newTags = Array.from(existingTags).sort();
    if (JSON.stringify(newTags) !== JSON.stringify(frontMatter.tags || [])) {
      frontMatter.tags = newTags;
      const newContent = serializeFrontMatter(frontMatter) + "\n" + body;
      fs.writeFileSync(filepath, newContent, "utf-8");
      updated++;
    }
  }

  console.log(`Updated tags in ${updated} files`);
}
