
import { Link } from 'waku/router/client';
import { readFile } from 'node:fs/promises';
import matter from 'gray-matter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function formatDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr || '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

type Message = { role: 'user' | 'assistant'; content: string };

function parseMessages(md: string): { messages: Message[]; related: string[] } {
  const relatedSplit = md.split('## Related');
  const body = relatedSplit[0]!;
  const related = relatedSplit[1]
    ? relatedSplit[1].trim().split('\n')
    : [];

  const messages: Message[] = [];
  // Split on ## User or ## Assistant headers
  const parts = body.split(/^## (User|Assistant)\s*$/m);
  // parts: [preamble, "User", content, "Assistant", content, ...]
  for (let i = 1; i < parts.length; i += 2) {
    const role = parts[i]!.toLowerCase() as 'user' | 'assistant';
    const content = (parts[i + 1] ?? '').trim();
    if (content) {
      messages.push({ role, content });
    }
  }

  return { messages, related };
}

export default async function ConversationPage({ slug }: { slug: string }) {
  const fileContent = await readFile(`./private/vault/${slug}.md`, 'utf8');
  const { data, content } = matter(fileContent);

  const title = data.title || content.match(/^# (.+)$/m)?.[1] || slug.replace(/_/g, ' ');
  const { messages, related } = parseMessages(content);
  const relatedLinks = related
    .map(line => line.match(/- \[\[(.*?)\]\]/)?.[1])
    .filter((s): s is string => !!s);

  const autoTags = new Set([
    data.source, 'claude', 'claude-web', 'claude-code', 'chatgpt', 'codex',
    ...(/^\d{4}/.test(data.date ?? '') ? [data.date.slice(0, 4)] : []),
  ]);
  const quarters = /^Q[1-4]$/;
  const meaningfulTags = (data.tags ?? []).filter(
    (t: string) => !autoTags.has(t) && !quarters.test(t),
  );

  return (
    <div className="max-w-5xl mx-auto py-6 px-6 xl:grid xl:grid-cols-[1fr_12rem] xl:gap-12">
      <div>
        <div className="mb-6">
          <Link
            to="/"
            className="text-xs text-ink-muted hover:text-ink transition-colors tracking-wide"
          >
            {'<-'} Archive
          </Link>
        </div>

        <header className="mb-8 pb-6 border-b border-parchment-200">
          <h1 className="text-lg font-medium tracking-tight mb-2 leading-relaxed">
            {title}
          </h1>
          <div className="flex items-center gap-3 text-xs text-ink-muted">
            <time>{data.date ? formatDate(data.date) : ''}</time>
            <span className="text-parchment-300">/</span>
            <span>{data.source}</span>
            {data.model && (
              <>
                <span className="text-parchment-300">/</span>
                <span className="text-ink-faint">{data.model}</span>
              </>
            )}
          </div>
          {meaningfulTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {meaningfulTags.map((tag: string) => (
                <span
                  key={tag}
                  className="text-xs text-ink-faint border border-parchment-200 px-2 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <div className="space-y-6 max-w-2xl">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div key={index} className="group">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs uppercase tracking-widest ${isUser ? 'text-ink-muted' : 'text-ink-faint'}`}>
                    {isUser ? 'Human' : 'Machine'}
                  </span>
                  <span className="flex-1 border-b border-parchment-100" />
                </div>
                <div className={`prose-manuscript text-sm ${isUser ? 'text-ink' : 'text-ink-light'} ${isUser ? 'pl-0' : 'pl-4 border-l border-parchment-200'}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            );
          })}
        </div>

        {/* Related: inline on small screens */}
        {relatedLinks.length > 0 && (
          <div className="mt-16 pt-8 border-t border-parchment-200 xl:hidden">
            <h2 className="text-xs font-medium text-ink-muted uppercase tracking-widest mb-4">
              Related
            </h2>
            <ul className="space-y-1.5">
              {relatedLinks.map(relSlug => (
                <li key={relSlug}>
                  <Link
                    to={`/c/${relSlug}`}
                    className="text-sm text-ink-light hover:text-ink transition-colors underline underline-offset-2 decoration-parchment-300 hover:decoration-ink-muted"
                  >
                    {relSlug.replace(/_/g, ' ')}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Related: sidebar on wide screens */}
      {relatedLinks.length > 0 && (
        <aside className="hidden xl:block sticky top-20 self-start pt-32">
          <h2 className="text-xs font-medium text-ink-muted uppercase tracking-widest mb-4">
            Related
          </h2>
          <ul className="space-y-1.5">
            {relatedLinks.map(relSlug => (
              <li key={relSlug}>
                <Link
                  to={`/c/${relSlug}`}
                  className="text-xs text-ink-light hover:text-ink transition-colors underline underline-offset-2 decoration-parchment-300 hover:decoration-ink-muted"
                >
                  {relSlug.replace(/_/g, ' ')}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  }
}
