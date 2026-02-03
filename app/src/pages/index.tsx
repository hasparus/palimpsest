import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { Link } from 'waku';

interface Conversation {
  slug: string;
  title: string;
  source: string;
  date: string;
  tags: string[];
}

async function getConversations(): Promise<Conversation[]> {
  const vaultPath = './private/vault';
  const files = await readdir(vaultPath);
  const mdFiles = files.filter((f) => f.endsWith('.md'));

  const conversations: Conversation[] = [];

  for (const file of mdFiles) {
    const content = await readFile(join(vaultPath, file), 'utf-8');
    const { data, content: body } = matter(content);

    const h1Match = body.match(/^#\s+(.+)$/m);
    const title = h1Match?.[1] ?? file.replace('.md', '');

    conversations.push({
      slug: file.replace('.md', ''),
      title: title.slice(0, 80) + (title.length > 80 ? '\u2026' : ''),
      source: data.source ?? 'unknown',
      date: data.date ?? '',
      tags: Array.isArray(data.tags) ? data.tags : [],
    });
  }

  return conversations.sort((a, b) => b.date.localeCompare(a.date));
}

function groupByMonth(convos: Conversation[]): Map<string, Conversation[]> {
  const groups = new Map<string, Conversation[]>();
  for (const c of convos) {
    const month = c.date.slice(0, 7) || 'Unknown';
    const arr = groups.get(month) ?? [];
    arr.push(c);
    groups.set(month, arr);
  }
  return groups;
}

function formatMonth(ym: string): string {
  if (ym === 'Unknown') return ym;
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [year, month] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const idx = parseInt(month!, 10) - 1;
  return months[idx] ? `${months[idx]} ${year}` : ym;
}

function formatDay(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  return d.getDate().toString();
}

const sourceLabel: Record<string, string> = {
  chatgpt: 'gpt',
  claude: 'claude',
  'claude-web': 'claude.ai',
  'claude-code': 'claude-code',
  codex: 'codex',
};

const sourceColor: Record<string, string> = {
  chatgpt: 'text-accent-chatgpt',
  claude: 'text-accent-claude',
  'claude-web': 'text-accent-claude',
  'claude-code': 'text-accent-code',
  codex: 'text-accent-codex',
};

export default async function HomePage() {
  const conversations = await getConversations();
  const grouped = groupByMonth(conversations);

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <div className="mb-6 flex items-baseline gap-3">
        <h1 className="text-lg font-medium tracking-tight">Archive</h1>
        <span className="text-xs text-ink-faint">{conversations.length}</span>
      </div>

      {[...grouped.entries()].map(([month, convos]) => (
        <section key={month} className="mb-6">
          <h2 className="text-xs font-medium text-ink-muted uppercase tracking-widest mb-3 pb-2 border-b border-parchment-200">
            {formatMonth(month)}
          </h2>
          <div className="space-y-0">
            {convos.map((c) => (
              <Link
                key={c.slug}
                to={`/c/${c.slug}`}
                className="group flex items-baseline gap-4 py-2 border-b border-parchment-100 hover:bg-parchment-100/50 transition-colors -mx-3 px-3"
              >
                <span className="text-xs text-ink-faint tabular-nums w-5 shrink-0 text-right">
                  {formatDay(c.date)}
                </span>
                <span className={`hidden sm:inline text-xs w-[11ch] shrink-0 ${sourceColor[c.source] ?? 'text-ink-faint'}`}>
                  {sourceLabel[c.source] ?? c.source}
                </span>
                <span className={`sm:hidden w-1.5 h-1.5 rounded-full shrink-0 ${sourceColor[c.source]?.replace('text-', 'bg-') ?? 'bg-ink-faint'}`} />
                <span className="text-sm text-ink-light group-hover:text-ink transition-colors truncate">
                  {c.title}
                </span>
                {c.tags.length > 0 && (
                  <span className="hidden md:inline text-xs text-ink-faint ml-auto shrink-0">
                    {c.tags.slice(0, 2).join(', ')}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export const getConfig = async () => ({ render: 'dynamic' }) as const;
