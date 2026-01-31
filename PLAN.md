# Palimpsest — Unified Conversation Vault

Pull all AI conversations into one flat Obsidian vault with tags and backlinks.

## Architecture

```
palimpsest/
├── PLAN.md
├── ralph.sh              # autonomous loop driver
├── src/
│   ├── ingest/           # one module per source
│   │   ├── chatgpt.ts    # parse ChatGPT export (conversations.json from ZIP)
│   │   ├── claude-web.ts # parse Claude.ai export JSON
│   │   ├── claude-code.ts# read ~/.claude local conversation history
│   │   └── codex.ts      # read Codex CLI local history
│   ├── normalize.ts      # common Conversation → Markdown converter
│   ├── tagger.ts         # auto-tag by source, date, topics, models used
│   ├── backlinker.ts     # find related conversations, insert [[wikilinks]]
│   └── cli.ts            # entry point: ingest → normalize → tag → backlink → write vault
├── vault/                # output: flat .md files (gitignored)
├── package.json
└── tsconfig.json
```

## Data Sources

### ChatGPT
- Input: ZIP export from OpenAI (Settings → Data controls → Export). Contains `conversations.json`.
- Each conversation → one `.md` file.

### Claude Web
- Input: JSON export from claude.ai account settings.
- Each conversation → one `.md` file.

### Claude Code
- Input: Local JSONL files from `~/.claude/projects/` and `~/.claude/todos/`.
- Each session → one `.md` file.

### Codex CLI (OpenAI)
- Input: Local history from `~/.codex/` or similar.
- Each session → one `.md` file.

## Markdown Output Format

Each file in `vault/` follows:

```markdown
---
source: chatgpt | claude-web | claude-code | codex
date: 2025-03-15
model: gpt-4o | claude-3.5-sonnet | ...
tags: [coding, debugging, typescript]
id: <original-conversation-id>
---

# <conversation title or first prompt summary>

## User
<message>

## Assistant
<message>

...

## Related
- [[other-conversation-title]]
```

## Stories (ordered by priority)

### 1. Project scaffold
- [x] `package.json` with typescript, tsx, commander
- [x] `tsconfig.json`
- [x] Basic CLI entry point with commander

### 2. ChatGPT ingester
- [x] Parse `conversations.json` from ChatGPT export ZIP
- [x] Handle multimodal messages (skip images, keep text)
- [x] Extract title, model, create_time

### 3. Claude Web ingester
- [x] Parse Claude.ai export JSON format
- [x] Extract conversation metadata

### 4. Claude Code ingester
- [ ] Read local `.jsonl` conversation files from `~/.claude/`
- [ ] Parse message format, extract session metadata

### 5. Codex CLI ingester
- [ ] Discover Codex local history location
- [ ] Parse conversation format

### 6. Normalizer
- [ ] Convert all sources to unified Markdown with YAML frontmatter
- [ ] Filename: `{date}_{source}_{slug}.md` (flat, no subdirs)
- [ ] Handle deduplication by conversation ID

### 7. Tagger
- [ ] Auto-tag by source
- [ ] Auto-tag by date (year, quarter)
- [ ] Extract topic tags from conversation content (keyword-based, no LLM needed)

### 8. Backlinker
- [ ] Find related conversations by overlapping tags/topics
- [ ] Insert `[[wikilinks]]` in Related section
- [ ] Avoid circular-only links (A↔B with nothing else)

### 9. CLI glue
- [ ] `palimpsest ingest --source chatgpt --input ./export.zip --vault ./vault`
- [ ] `palimpsest ingest --source claude-web --input ./export.json --vault ./vault`
- [ ] `palimpsest ingest --source claude-code --vault ./vault`
- [ ] `palimpsest ingest --source codex --vault ./vault`
- [ ] `palimpsest tag --vault ./vault`
- [ ] `palimpsest backlink --vault ./vault`
- [ ] `palimpsest sync --vault ./vault` (all sources + tag + backlink)

## Progress

_Updated by ralph loop — check git log for details._
