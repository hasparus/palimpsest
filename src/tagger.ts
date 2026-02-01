import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";

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

function extractModelFamily(model?: string): string | null {
  if (!model) return null;
  const lower = model.toLowerCase();
  
  if (lower.includes("gpt-4o")) return "gpt-4o";
  if (lower.includes("gpt-4")) return "gpt-4";
  if (lower.includes("gpt-3.5")) return "gpt-3.5";
  if (lower.includes("o1") || lower.includes("o3")) return "o-series";
  if (lower.includes("claude-3.5") || lower.includes("claude-3-5")) return "claude-3.5";
  if (lower.includes("claude-3")) return "claude-3";
  if (lower.includes("claude-2")) return "claude-2";
  if (lower.includes("gemini")) return "gemini";
  
  return null;
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

export function generateTags(source: string, date: Date, model?: string, body?: string): string[] {
  const tags = new Set<string>();
  
  tags.add(source);
  tags.add(date.getFullYear().toString());
  tags.add(extractQuarter(date));
  
  const modelFamily = extractModelFamily(model);
  if (modelFamily) {
    tags.add(modelFamily);
  }
  
  if (body) {
    const topics = extractTopics(body);
    for (const topic of topics) {
      tags.add(topic);
    }
  }
  
  return Array.from(tags).sort();
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

    const parsed = matter(content);
    const frontMatter = parsed.data as FrontMatter;
    if (!frontMatter.source) continue;

    const existingTags = new Set(frontMatter.tags || []);

    existingTags.add(frontMatter.source);

    if (frontMatter.date) {
      const date = new Date(frontMatter.date);
      existingTags.add(date.getFullYear().toString());
      existingTags.add(extractQuarter(date));
    }

    const modelFamily = extractModelFamily(frontMatter.model);
    if (modelFamily) {
      existingTags.add(modelFamily);
    }

    const topics = extractTopics(parsed.content);
    for (const topic of topics) {
      existingTags.add(topic);
    }

    const newTags = Array.from(existingTags).sort();
    if (JSON.stringify(newTags) !== JSON.stringify(frontMatter.tags || [])) {
      frontMatter.tags = newTags;
      const newContent = matter.stringify(parsed.content, frontMatter);
      fs.writeFileSync(filepath, newContent, "utf-8");
      updated++;
    }
  }

  console.log(`Updated tags in ${updated} files`);
}
