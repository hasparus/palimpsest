
import { readFile, readdir } from 'node:fs/promises';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

async function getDistilledFile(fileName: string) {
  try {
    return await readFile(`./private/distilled/${fileName}`, 'utf8');
  } catch (error) {
    return null;
  }
}

export default async function DistilledPage() {
  const summary = await getDistilledFile('SUMMARY.md');
  const themes = await getDistilledFile('themes.md');
  const knowledge = await getDistilledFile('knowledge.md');

  const summariesDir = await readdir('./private/distilled/summaries').catch(() => []);
  const periodSummaries: { name: string; content: string }[] = [];
  for (const file of summariesDir.filter(f => f.endsWith('.md')).sort().reverse()) {
    const content = await getDistilledFile(`summaries/${file}`);
    if (content) periodSummaries.push({ name: file.replace('.md', ''), content });
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-6">
      <div className="mb-6">
        <h1 className="text-lg font-medium tracking-tight">Distilled</h1>
      </div>

      {summary && (
        <section className="mb-8 pb-8 border-b border-parchment-200">
          <div className="prose-manuscript text-sm text-ink-light">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {summary.replace(/^Here['']s a thematic analysis[^:]*:\s*/i, '')}
            </ReactMarkdown>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {themes && (
          <section>
            <details open>
              <summary className="text-xs font-medium text-ink-muted uppercase tracking-widest mb-4 pb-2 border-b border-parchment-200">
                Themes
              </summary>
              <div className="prose-manuscript text-sm text-ink-light mt-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{themes}</ReactMarkdown>
              </div>
            </details>
          </section>
        )}

        {knowledge && (
          <section>
            <details open>
              <summary className="text-xs font-medium text-ink-muted uppercase tracking-widest mb-4 pb-2 border-b border-parchment-200">
                Knowledge
              </summary>
              <div className="prose-manuscript text-sm text-ink-light mt-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{knowledge}</ReactMarkdown>
              </div>
            </details>
          </section>
        )}
      </div>

      {periodSummaries.length > 0 && (
        <section>
          <h2 className="text-xs font-medium text-ink-muted uppercase tracking-widest mb-6 pb-2 border-b border-parchment-200">
            Period summaries
          </h2>
          <div className="space-y-6">
            {periodSummaries.map(({ name, content }) => (
              <details key={name}>
                <summary className="text-sm text-ink-light hover:text-ink transition-colors cursor-pointer py-1">
                  {name}
                </summary>
                <div className="prose-manuscript text-sm text-ink-light mt-3 pl-4 border-l border-parchment-200">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  }
}
