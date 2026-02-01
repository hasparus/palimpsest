import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";

interface FileData {
  filename: string;
  filepath: string;
  title: string;
  tags: string[];
  content: string;
}

function calculateSimilarity(tagsA: string[], tagsB: string[]): number {
  const setA = new Set(tagsA);
  const setB = new Set(tagsB);
  let overlap = 0;
  for (const tag of setA) {
    if (setB.has(tag)) overlap++;
  }
  return overlap;
}

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function backlinkVault(vaultPath: string): Promise<void> {
  if (!fs.existsSync(vaultPath)) {
    console.log(`Vault not found at ${vaultPath}`);
    return;
  }

  const mdFiles = fs.readdirSync(vaultPath).filter((f) => f.endsWith(".md"));
  console.log(`Processing ${mdFiles.length} files for backlinks...`);

  const filesData: FileData[] = [];

  for (const file of mdFiles) {
    const filepath = path.join(vaultPath, file);
    const content = fs.readFileSync(filepath, "utf-8");
    const parsed = matter(content);
    const tags = Array.isArray(parsed.data.tags) ? parsed.data.tags : [];
    const titleMatch = parsed.content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : file.replace(".md", "");
    filesData.push({
      filename: file,
      filepath,
      title,
      tags,
      content,
    });
  }

  let updated = 0;

  for (const fileData of filesData) {
    const related: { file: FileData; score: number }[] = [];

    for (const other of filesData) {
      if (other.filename === fileData.filename) continue;

      const score = calculateSimilarity(fileData.tags, other.tags);
      if (score >= 2) {
        related.push({ file: other, score });
      }
    }

    related.sort((a, b) => b.score - a.score);
    const topRelated = related.slice(0, 5);

    if (topRelated.length === 0) continue;

    const relatedSection = topRelated
      .map((r) => `- [[${r.file.title}]]`)
      .join("\n");

    if (!relatedSection) continue;

    const relatedMarker = "## Related";
    const relatedIdx = fileData.content.lastIndexOf(relatedMarker);

    let newContent: string;
    if (relatedIdx !== -1) {
      const beforeRelated = fileData.content.slice(0, relatedIdx + relatedMarker.length);
      newContent = beforeRelated + "\n\n" + relatedSection + "\n";
    } else {
      newContent = fileData.content.trimEnd() + "\n\n## Related\n\n" + relatedSection + "\n";
    }

    if (newContent !== fileData.content) {
      fs.writeFileSync(fileData.filepath, newContent, "utf-8");
      updated++;
    }
  }

  console.log(`Added backlinks to ${updated} files`);
}
