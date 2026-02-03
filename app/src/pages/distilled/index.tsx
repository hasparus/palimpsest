
import { readFile, readdir } from 'node:fs/promises';
import { Link } from 'waku/router';
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
  for (const file of summariesDir.filter(f => f.endsWith('.md')).sort()) {
    const content = await getDistilledFile(`summaries/${file}`);
    if (content) periodSummaries.push({ name: file.replace('.md', ''), content });
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="prose prose-invert">
        {summary && (
          <div className="mb-8 p-6 bg-neutral-900 rounded-lg">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {themes && (
            <details className="p-6 bg-neutral-900 rounded-lg">
              <summary className="font-bold text-xl cursor-pointer">Themes</summary>
              <div className="mt-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{themes}</ReactMarkdown>
              </div>
            </details>
          )}

          {knowledge && (
            <details className="p-6 bg-neutral-900 rounded-lg">
              <summary className="font-bold text-xl cursor-pointer">Knowledge</summary>
              <div className="mt-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{knowledge}</ReactMarkdown>
              </div>
            </details>
          )}
        </div>

        {periodSummaries.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Period Summaries</h2>
            <div className="space-y-4">
              {periodSummaries.map(({ name, content }) => (
                <details key={name} className="p-6 bg-neutral-900 rounded-lg">
                  <summary className="font-bold text-lg cursor-pointer">{name}</summary>
                  <div className="mt-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {content}
                    </ReactMarkdown>
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  }
}
