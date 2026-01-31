# Palimpsest — Unified Conversation Vault + Search

Pull all AI conversations into one flat Obsidian vault. Index them for full-text search.
Expose as MCP server so future AI conversations can search past ones without bloating context.

## Prior Art (see .context/)

- **nexus-ai-chat-importer**: Obsidian plugin. Excellent format handling (ChatGPT tree
  traversal, Claude content blocks, artifact versioning, DALL-E). Provider adapter pattern.
  No search capability.
- **qmd**: Local search engine for markdown. Hybrid BM25 + vector + LLM reranker.
  SQLite FTS5 + sqlite-vec. MCP server. Great architecture but heavy (3 GGUF models).

We take nexus's format knowledge + qmd's search-via-MCP idea, but keep it lean:
SQLite FTS5 only (no vector/LLM models). Fast, zero dependencies beyond better-sqlite3.

## Architecture

```
palimpsest/
├── src/
│   ├── ingest/                # one module per source
│   │   ├── chatgpt.ts         # ChatGPT ZIP/JSON (tree traversal via mapping)
│   │   ├── claude-web.ts      # Claude.ai export (content blocks: text/thinking/tool_use)
│   │   ├── claude-code.ts     # ~/.claude/ local JSONL
│   │   └── codex.ts           # ~/.codex/ sessions + archived_sessions
│   ├── types.ts               # Conversation, Message, ContentBlock types
│   ├── normalize.ts           # Conversation → Markdown with YAML frontmatter
│   ├── tagger.ts              # auto-tag: source, date, quarter, keyword topics
│   ├── backlinker.ts          # [[wikilinks]] by shared tags (≥2 overlap, top 5)
│   ├── search/
│   │   ├── index.ts           # SQLite FTS5 indexer — index vault .md files
│   │   └── search.ts          # search(query) → ranked results with snippets
│   ├── mcp.ts                 # MCP server: search, get, list tools
│   └── cli.ts                 # CLI entry point
├── vault/                     # output .md files (gitignored)
├── palimpsest.db              # SQLite FTS5 index (gitignored)
├── package.json
└── tsconfig.json
```

## Data Source Formats (from nexus-ai-chat-importer analysis)

### ChatGPT Export
ZIP contains `conversations.json`: array of Chat objects.
```typescript
interface Chat {
  id: string;
  title: string;
  create_time: number;           // unix seconds
  update_time: number;
  mapping: Record<string, {      // DAG — NOT a flat array
    id: string;
    message?: {
      id: string;
      author: { role: 'user' | 'assistant' | 'system' | 'tool' };
      content: { content_type: string; parts: (string | object)[] };
      create_time: number;
    };
    parent?: string;
    children?: string[];
  }>;
  current_node?: string;         // leaf of active branch
  default_model_slug?: string;
}
```
**Must filter:** system messages, tool messages (except DALL-E), hidden messages, empty parts.
**Must traverse:** Walk tree from root following children, not iterate mapping keys.

### Claude Web Export
JSON with `{ conversations: ClaudeConversation[] }` wrapper (NOT bare array).
```typescript
interface ClaudeConversation {
  uuid: string;
  name: string;
  created_at: string;            // ISO 8601
  updated_at: string;
  chat_messages: {
    uuid: string;
    text: string;
    sender: 'human' | 'assistant';
    created_at: string;
    content: {                    // content blocks array
      type: 'text' | 'thinking' | 'tool_use' | 'tool_result';
      text?: string;
      thinking?: string;
      name?: string;             // for tool_use: 'artifacts', 'create_file'
      input?: object;
    }[];
    files: { file_name: string; file_type: string; file_size: number }[];
  }[];
  model?: string;
  project_uuid?: string;
}
```
**Must handle:** content blocks (text + thinking), skip tool_use/tool_result noise, extract text from blocks not just `.text` field.

### Claude Code (local)
JSONL in `~/.claude/projects/*/`. Each line:
```typescript
{ type: 'user'|'assistant', sessionId: string, timestamp: string,
  message: { role: string, content: string | { type: 'text'|'thinking', text?: string }[] } }
```
Skip `file-history-snapshot` entries. Handle both string and block-array content.

### Codex CLI (local)
JSONL in `~/.codex/sessions/` and `~/.codex/archived_sessions/`.
`session_meta` entry has id, timestamp, cwd. `response_item` entries have messages.
Filter `<environment_context>` content.

## Markdown Output Format

```markdown
---
source: chatgpt | claude-web | claude-code | codex
date: 2025-03-15
model: gpt-4o | claude-3.5-sonnet | ...
tags: [coding, debugging, typescript]
id: <original-conversation-id>
title: <conversation title>
---

# <title>

## User
<message>

## Assistant
<message>

## Related
- [[other-conversation-title]]
```

## Stories (ordered by priority)

### 1. Project scaffold ✅
- [x] `package.json` with typescript, tsx, commander
- [x] `tsconfig.json`
- [x] Basic CLI entry point with commander

### 2. Fix ChatGPT ingester ✅
- [x] Traverse mapping as DAG using parent/children pointers (not Object.entries iteration)
- [x] Follow `current_node` to find active branch when there are forks
- [x] Filter: skip system role, tool role, empty parts, `content_type !== 'text'` non-user messages
- [x] Extract text parts only (skip image/object parts)
- [x] Use real `Chat` types from nexus analysis (see format docs above)
- [x] Test with: `npx tsx src/cli.ts ingest --source chatgpt --input test-fixtures/chatgpt-export.json --vault ./vault` (create a small fixture file for smoke test)

### 3. Fix Claude Web ingester
- [ ] Handle `{ conversations: [...] }` wrapper (not bare array)
- [ ] Also handle bare array for compatibility
- [ ] Parse content blocks: extract `.text` from text blocks, `.thinking` from thinking blocks
- [ ] Skip tool_use and tool_result blocks (artifact noise)
- [ ] Include thinking in output as blockquote (`> *thinking:* ...`)
- [ ] Test with fixture

### 4. Fix Claude Code ingester
- [ ] Handle content as `{type, text}[]` blocks — extract text blocks, format thinking blocks
- [ ] More robust JSONL parsing (skip malformed lines gracefully)
- [ ] Use cwd from first entry as title context if no better title

### 5. Fix Codex ingester
- [ ] Filter `<environment_context>` XML content from messages
- [ ] Handle both `input_text` and `output_text` content types
- [ ] Walk `~/.codex/sessions/` and `~/.codex/archived_sessions/` recursively

### 6. Add better-sqlite3 and FTS5 search index
- [ ] Add `better-sqlite3` dependency (+ `@types/better-sqlite3`)
- [ ] `src/search/index.ts`: Create `palimpsest.db` with FTS5 virtual table
  ```sql
  CREATE VIRTUAL TABLE IF NOT EXISTS conversations_fts USING fts5(
    id, title, source, date, model, tags, content,
    tokenize='porter unicode61'
  );
  ```
- [ ] `indexVault(vaultPath, dbPath)`: Read all .md files, parse frontmatter, insert into FTS5
- [ ] Handle incremental updates: delete + re-insert by id
- [ ] CLI command: `palimpsest index --vault ./vault`

### 7. Add search command
- [ ] `src/search/search.ts`: `search(dbPath, query, opts)` → results with snippets
- [ ] Use FTS5 `snippet()` function for context around matches
- [ ] Use FTS5 `rank` for relevance scoring (BM25 built-in)
- [ ] Return: `{ id, title, source, date, score, snippet }[]`
- [ ] CLI command: `palimpsest search "query" --vault ./vault`
- [ ] Options: `-n` limit (default 10), `--source` filter, `--json` output

### 8. MCP server
- [ ] `src/mcp.ts`: MCP server using `@modelcontextprotocol/sdk`
- [ ] Tool: `palimpsest_search` — search conversations by query, return ranked snippets
- [ ] Tool: `palimpsest_get` — get full conversation by id or filename
- [ ] Tool: `palimpsest_list` — list conversations, optionally filtered by source/date
- [ ] Resource: expose vault files as `palimpsest://` URIs
- [ ] CLI command: `palimpsest mcp` (starts stdio MCP server)
- [ ] Include usage instructions in tool descriptions so LLMs know when/how to search

### 9. Tagger improvements
- [ ] Run tagger after ingest automatically (no separate step needed)
- [ ] Add model-family tags (gpt-4, claude-3, etc.)
- [ ] Improve keyword extraction: also check message pairs for programming language detection

### 10. Update sync command
- [ ] `palimpsest sync` should: ingest all → tag → backlink → index
- [ ] After sync, print stats: X conversations, Y new, Z updated
- [ ] Auto-create vault dir if missing

## .gitignore additions needed
```
vault/
*.db
*.db-wal
*.db-shm
```

## Progress

_Updated by ralph loop — check git log for details._
