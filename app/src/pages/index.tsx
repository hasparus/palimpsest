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
      title: title.slice(0, 80) + (title.length > 80 ? '…' : ''),
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

const sourceColors: Record<string, string> = {
  chatgpt: 'bg-emerald-900 text-emerald-300',
  claude: 'bg-orange-900 text-orange-300',
  'claude-code': 'bg-violet-900 text-violet-300',
  codex: 'bg-blue-900 text-blue-300',
};

export default async function HomePage() {
  const conversations = await getConversations();
  const grouped = groupByMonth(conversations);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Conversations</h1>
      <p className="text-neutral-500 text-sm mb-8">
        {conversations.length} conversations in vault
      </p>

      {[...grouped.entries()].map(([month, convos]) => (
        <section key={month} className="mb-8">
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3 sticky top-14 bg-neutral-950 py-2">
            {month}
          </h2>
          <div className="space-y-2">
            {convos.map((c) => (
              <Link
                key={c.slug}
                to={`/c/${c.slug}`}
                className="block p-3 rounded border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${sourceColors[c.source] ?? 'bg-neutral-800 text-neutral-400'}`}
                  >
                    {c.source}
                  </span>
                  <span className="text-xs text-neutral-500">{c.date}</span>
                </div>
                <h3 className="mt-2 text-sm text-neutral-200 line-clamp-2">
                  {c.title}
                </h3>
                {c.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.tags.slice(0, 5).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-1.5 py-0.5 bg-neutral-800 text-neutral-400 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {c.tags.length > 5 && (
                      <span className="text-xs text-neutral-500">
                        +{c.tags.length - 5}
                      </span>
                    )}
                  </div>
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
