# palimpsest

Pull AI conversations from ChatGPT, Claude, Claude Code, and Codex into a flat Obsidian vault.

Pairs with [qmd](https://github.com/tobil/qmd) for search — so future AI sessions can query past ones without bloating context.

## Install

```sh
bun install  # or npm install
```

## Usage

```sh
# Local sources (reads ~/.claude/ and ~/.codex/ directly)
bun src/cli.ts ingest --source claude-code --vault ./vault
bun src/cli.ts ingest --source codex --vault ./vault

# Export-based sources (download your data first)
bun src/cli.ts ingest --source chatgpt --input ~/Downloads/chatgpt-export.zip --vault ./vault
bun src/cli.ts ingest --source claude-web --input ~/Downloads/claude-export.json --vault ./vault

# Auto-tag and add [[backlinks]]
bun src/cli.ts tag --vault ./vault
bun src/cli.ts backlink --vault ./vault

# Or do everything at once
bun src/cli.ts sync --vault ./vault \
  --chatgpt ~/Downloads/chatgpt-export.zip \
  --claude-web ~/Downloads/claude-export.json
```

## Search with qmd

```sh
./setup-qmd.sh ./vault

qmd query "how did I handle rate limiting?"
```

Or add qmd as an MCP server so Claude/Amp search your history automatically:

```json
{
  "mcpServers": {
    "qmd": { "command": "qmd", "args": ["mcp"] }
  }
}
```

## Output

Flat `.md` files with YAML frontmatter, one per conversation:

```
vault/
  2025-06-15_chatgpt_debugging-cors-issue.md
  2025-07-01_claude-code_refactor-auth-middleware.md
  2025-07-02_codex_fix-ci-pipeline.md
```

Each file:

```markdown
---
source: claude-code
date: 2025-07-01
model: claude-3.5-sonnet
tags: [typescript, debugging, 2025, Q3]
id: abc123
---

# Refactor auth middleware

## User
...

## Assistant
...

## Related
- [[debugging-cors-issue]]
```

## Sources

| Source | Input | How to get it |
|--------|-------|---------------|
| ChatGPT | ZIP or JSON | [Settings → Data controls → Export](https://chatgpt.com/#settings/DataControls) |
| Claude Web | JSON | [claude.ai account settings → Export](https://claude.ai/settings) |
| Claude Code | auto | Reads `~/.claude/projects/` directly |
| Codex | auto | Reads `~/.codex/sessions/` directly |
