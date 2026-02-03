
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

  const files = await readdir('./private/distilled');
  const periodSummaries = files.filter(file => file.match(/^[0-9]{4}-Q[1-4]\.md$/));

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="prose prose-invert">
        {summary && (
          <div className="mb-8 p-6 bg-gray-800 rounded-lg">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {themes && (
            <details className="p-6 bg-gray-800 rounded-lg">
              <summary className="font-bold text-xl cursor-pointer">Themes</summary>
              <div className="mt-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{themes}</ReactMarkdown>
              </div>
            </details>
          )}

          {knowledge && (
            <details className="p-6 bg-gray-800 rounded-lg">
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
              {periodSummaries.map(summaryFile => (
                <details key={summaryFile} className="p-6 bg-gray-800 rounded-lg">
                  <summary className="font-bold text-lg cursor-pointer">{summaryFile.replace('.md', '')}</summary>
                  <div className="mt-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {await getDistilledFile(summaryFile) || ''}
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
