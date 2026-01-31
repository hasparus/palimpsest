# Palimpsest — Unified Conversation Vault

Pull all AI conversations into one flat Obsidian vault with tags and backlinks.
Search is handled by **qmd** (separate tool) — palimpsest just produces the markdown.

## Prior Art (see .context/)

- **nexus-ai-chat-importer**: Obsidian plugin. Excellent format handling (ChatGPT tree
  traversal, Claude content blocks, artifact versioning, DALL-E). Provider adapter pattern.
- **qmd**: Local markdown search engine. BM25 + vector + LLM reranker. MCP server.
  We use qmd to index the vault palimpsest produces — no need to reimplement search.

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
│   └── cli.ts                 # CLI entry point
├── vault/                     # output .md files (gitignored)
├── package.json
└── tsconfig.json
```

## Search: use qmd

After syncing, point qmd at the vault:
```sh
qmd collection add ./vault --name conversations
qmd context add qmd://conversations "AI conversation history from ChatGPT, Claude, Codex"
qmd embed
qmd query "how did I solve that auth bug?"
```
Or add qmd as MCP server in Claude/Amp settings for automatic search.

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

### 3. Fix Claude Web ingester ✅
- [x] Handle `{ conversations: [...] }` wrapper (not bare array)
- [x] Also handle bare array for compatibility
- [x] Parse content blocks: extract `.text` from text blocks, `.thinking` from thinking blocks
- [x] Skip tool_use and tool_result blocks (artifact noise)
- [x] Include thinking in output as blockquote (`> *thinking:* ...`)
- [x] Test with fixture

### 4. Fix Claude Code ingester ✅
- [x] Handle content as `{type, text}[]` blocks — extract text blocks, format thinking blocks
- [x] More robust JSONL parsing (skip malformed lines gracefully)
- [x] Use cwd from first entry as title context if no better title

### 5. Fix Codex ingester ✅
- [x] Filter `<environment_context>` XML content from messages
- [x] Handle both `input_text` and `output_text` content types
- [x] Walk `~/.codex/sessions/` and `~/.codex/archived_sessions/` recursively

### 6. Tagger improvements
- [ ] Run tagger after ingest automatically (no separate step needed)
- [ ] Add model-family tags (gpt-4, claude-3, etc.)
- [ ] Improve keyword extraction: also check message pairs for programming language detection

### 7. Update sync command
- [ ] `palimpsest sync` should: ingest all → tag → backlink
- [ ] After sync, print stats: X conversations, Y new, Z updated
- [ ] Auto-create vault dir if missing
- [ ] Print hint: "Run `qmd collection add ./vault --name conversations && qmd embed` to enable search"

## Progress

_Updated by ralph loop — check git log for details._
