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
│   ├── types.ts               # Conversation, Message types
│   ├── normalize.ts           # Conversation → Markdown with YAML frontmatter
│   ├── frontmatter.ts         # shared YAML frontmatter parse/serialize (TODO: extract)
│   ├── tagger.ts              # auto-tag: source, date, quarter, keyword topics
│   ├── backlinker.ts          # [[wikilinks]] by shared tags (≥2 overlap, top 5)
│   └── cli.ts                 # CLI entry point
├── tests/                     # bun test — fixture-based
│   └── fixtures/              # small representative exports per source
├── vault/                     # output .md files (gitignored)
├── setup-qmd.sh               # wire up qmd collection after sync
├── package.json
└── tsconfig.json
```

## Search: use qmd

After syncing, run `./setup-qmd.sh ./vault` or manually:
```sh
qmd collection add ./vault --name conversations
qmd context add qmd://conversations "AI conversation history from ChatGPT, Claude, Codex"
qmd embed
qmd query "how did I solve that auth bug?"
```
Add qmd as MCP server in Claude/Amp settings for automatic search in future conversations.

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

## Completed Stories

### 1. Project scaffold ✅
### 2. Fix ChatGPT ingester ✅
### 3. Fix Claude Web ingester ✅
### 4. Fix Claude Code ingester ✅
### 5. Fix Codex ingester ✅
### 6. Tagger improvements ✅
### 7. Update sync command ✅

## Next: Harden & Polish

### 8. Migrate to Bun
- [x] Replace `package.json` scripts to use `bun`
- [x] Remove tsx dependency (bun runs .ts natively)
- [x] Use `bun test` for test runner
- [x] Update shebang in cli.ts if needed
- [x] Verify all ingesters still work

### 9. Fix filename collisions
- [x] Include short id hash in filename: `{date}_{source}_{hash8}_{slug}.md`
- [x] This prevents collisions when same-day, same-source convos have similar titles
- [x] Slug truncation at 50 chars makes this likely with real data

### 10. Use gray-matter for frontmatter
- [x] Add `gray-matter` dependency
- [x] Replace hand-rolled YAML parsing in tagger.ts and backlinker.ts with `matter(content)` / `matter.stringify(content, data)`
- [x] Replace manual frontmatter generation in normalize.ts with `matter.stringify`
- [x] Delete dead `escapeYamlString` function from normalize.ts
- [x] Delete duplicated `parseFrontMatter` / `serializeFrontMatter` from tagger.ts and backlinker.ts

### 11. Fix deduplication bug
- [x] `resetDeduplication()` exists but is never called between ingesters in sync
- [x] Move dedup to file-existence check instead of in-memory Set
- [x] Check if `{vault}/{filename}` already exists with same id in frontmatter

### 12. Add error handling to CLI
- [ ] Wrap all async ingest calls in try/catch
- [ ] Log errors per-conversation but continue (don't abort whole ingest)
- [ ] Report: "X succeeded, Y failed" at end

### 13. Unit tests with fixtures
- [ ] `tests/ingest/chatgpt.test.ts` — small fixture with branching mapping, system msgs
- [ ] `tests/ingest/claude-web.test.ts` — wrapper + bare array, content blocks, thinking
- [ ] `tests/ingest/claude-code.test.ts` — JSONL with mixed content types
- [ ] `tests/ingest/codex.test.ts` — session_meta + response_items, env context filtering
- [ ] `tests/normalize.test.ts` — frontmatter escaping, slug collisions, dedup
- [ ] `tests/tagger.test.ts` — keyword extraction, model-family tags, invalid dates
- [ ] Fixtures: small hand-crafted JSON/JSONL representing edge cases from real formats

### 14. qmd setup script
- [x] `setup-qmd.sh` — one-liner to create collection + context + embed

## Not Doing

- **EffectTS**: Overkill. This is a file-in → file-out CLI. Simple try/catch is fine.
- **Custom search/MCP**: qmd already does this better than we could.
- **Vector embeddings**: Deferred to qmd.
