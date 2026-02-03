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
- [x] Wrap all async ingest calls in try/catch
- [x] Log errors per-conversation but continue (don't abort whole ingest)
- [x] Report: "X succeeded, Y failed" at end

### 13. Unit tests with fixtures
- [x] `tests/ingest/chatgpt.test.ts` — small fixture with branching mapping, system msgs
- [x] `tests/ingest/claude-web.test.ts` — wrapper + bare array, content blocks, thinking
- [x] `tests/ingest/claude-code.test.ts` — JSONL with mixed content types
- [x] `tests/ingest/codex.test.ts` — session_meta + response_items, env context filtering
- [x] `tests/normalize.test.ts` — frontmatter escaping, slug collisions, dedup
- [x] `tests/tagger.test.ts` — keyword extraction, model-family tags, invalid dates
- [x] Fixtures: small hand-crafted JSON/JSONL representing edge cases from real formats

### 14. qmd setup script
- [x] `setup-qmd.sh` — one-liner to create collection + context + embed

## Vault Viewer — Waku App

A local web UI to browse the vault and search conversations. Lives in `app/` directory.
Uses **Waku** (minimal React framework, https://waku.gg) with server components.
Search is powered by **qmd** CLI (already installed, has vault indexed).

See `app/WAKU-REFERENCE.md` for Waku API reference (routing, layouts, pages, etc).

### Architecture

```
app/                           # Waku project (separate package.json)
├── src/
│   ├── pages/
│   │   ├── _root.tsx          # html/head/body
│   │   ├── _layout.tsx        # root layout: header with search, nav
│   │   ├── index.tsx           # home: conversation list with filters
│   │   ├── c/
│   │   │   └── [slug].tsx     # conversation detail (render markdown)
│   │   ├── distilled/
│   │   │   └── index.tsx      # distilled summaries, themes, knowledge
│   │   └── _api/
│   │       └── search.ts      # GET /search?q=... → calls `qmd search`
│   ├── components/
│   │   ├── search.tsx         # client: search input + results dropdown
│   │   ├── conversation-list.tsx  # server: list with date/source grouping
│   │   ├── markdown.tsx       # server: render conversation markdown
│   │   └── filters.tsx        # client: source/date/tag filters
│   └── styles.css             # tailwind
├── private/                   # symlink to ../vault
├── package.json
├── tsconfig.json
└── waku.config.ts
```

### Key decisions

- **Dynamic rendering** for all pages (reads from disk at request time)
- **Server components** for vault reading (fs access, no client bundle)
- **Client components** only for search input, filters, interactive bits
- **qmd CLI** for search (spawn `qmd search <query>` from API endpoint)
- **gray-matter** for parsing frontmatter from vault .md files (already a dependency in parent)
- **Tailwind v4** for styling (via `@tailwindcss/vite` plugin)
- **No database** — reads vault/ and distilled/ directories directly
- Symlink `app/private/vault` → `../vault` and `app/private/distilled` → `../distilled`

### 15. Scaffold Waku project
- [x] Run `npm create waku@latest` in `app/` directory (or set up manually)
- [x] Add dependencies: `gray-matter`, `@tailwindcss/vite`, `tailwindcss`
- [x] Create `waku.config.ts` with Tailwind plugin
- [x] Create symlinks: `app/private/vault` → `../vault`, `app/private/distilled` → `../distilled`
- [x] Verify `waku dev` starts without errors
- [x] Add `app/node_modules` and `app/dist` to root `.gitignore`

### 16. Root layout + styling
- [x] `_root.tsx` — html lang, head, body
- [x] `_layout.tsx` — header with app name "Palimpsest", nav links (Home, Distilled), search bar placeholder
- [x] `styles.css` — Tailwind import, dark theme, monospace body, minimal custom styles
- [x] Basic responsive layout (sidebar on desktop, hamburger on mobile is NOT needed — keep it simple)

### 17. Conversation list page
- [x] `index.tsx` — server component that reads `private/vault/*.md`
- [x] Parse frontmatter from each file (source, date, tags, title from H1)
- [x] Sort by date descending
- [x] Display as cards/rows: date, source badge, title, tag chips
- [x] Link each to `/c/{slug}` (slug = filename without .md)
- [x] Group by month with sticky headers

### 18. Conversation detail page
- [x] `c/[slug].tsx` — server component, reads `private/vault/{slug}.md`
- [x] Parse frontmatter + body
- [x] Render metadata header: date, source, model, tags
- [x] Render conversation body as HTML (use a simple markdown-to-HTML approach)
- [x] Style user/assistant messages differently (alternating backgrounds)
- [x] Back link to home
- [x] Show related conversations from ## Related section as links

### 19. Search API + UI
- [ ] `_api/search.ts` — GET endpoint, reads `q` from query string
- [ ] Spawns `qmd search <q>` subprocess, parses output
- [ ] Returns JSON: `{ results: { file: string, snippet: string, score: number }[] }`
- [ ] `components/search.tsx` — client component with debounced input
- [ ] Displays results as dropdown/list with links to `/c/{slug}`
- [ ] Integrate into layout header

### 20. Distilled view
- [ ] `distilled/index.tsx` — server component reads `private/distilled/`
- [ ] Renders SUMMARY.md as hero section
- [ ] Renders themes.md and knowledge.md as expandable sections
- [ ] Lists period summaries with links/accordions
- [ ] Simple markdown rendering (same approach as conversation detail)

## Not Doing

- **EffectTS**: Overkill. This is a file-in → file-out CLI. Simple try/catch is fine.
- **Custom search/MCP**: qmd already does this better than we could.
- **Vector embeddings**: Deferred to qmd.
