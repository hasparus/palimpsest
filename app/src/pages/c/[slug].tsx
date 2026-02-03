
import { Link } from 'waku/router/client';
import { readFile } from 'node:fs/promises';
import matter from 'gray-matter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
export default async function ConversationPage({ slug }: { slug: string }) {
  const fileContent = await readFile(`./private/vault/${slug}.md`, 'utf8');
  const { data, content } = matter(fileContent);

  const related = content.includes('## Related')
    ? content.split('## Related')[1].trim().split('\n')
    : [];

  const conversationContent = content.split('## Related')[0];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <Link to="/" className="text-blue-500 hover:underline">
          &larr; Back to Home
        </Link>
      </div>
      <div className="prose prose-invert">
        <div className="mb-4">
          <h1 className="text-3xl font-bold">{data.title}</h1>
          <div className="text-gray-400">
            <span>{new Date(data.date).toLocaleDateString()}</span>
            <span className="mx-2">&bull;</span>
            <span>{data.source}</span>
            {data.model && (
              <>
                <span className="mx-2">&bull;</span>
                <span>{data.model}</span>
              </>
            )}
          </div>
          {data.tags && (
            <div className="mt-2">
              {data.tags.map((tag: string) => (
                <span key={tag} className="inline-block bg-gray-700 text-gray-300 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {conversationContent.split('---').map((message, index) => {
            const trimmedMessage = message.trim();
            if (!trimmedMessage) return null;

            const isUser = trimmedMessage.startsWith('**User:**');
            const isAssistant = trimmedMessage.startsWith('**Assistant:**');

            let content = trimmedMessage;
            if (isUser) {
              content = content.substring('**User:**'.length).trim();
            } else if (isAssistant) {
              content = content.substring('**Assistant:**'.length).trim();
            }

            return (
              <div
                key={index}
                className={`p-4 rounded-lg ${isUser ? 'bg-gray-800' : 'bg-gray-900'}`}
              >
                <div className="font-bold mb-2">{isUser ? 'User' : 'Assistant'}</div>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            );
          })}
        </div>

        {related.length > 0 && (
            <div>
                <h2 className="text-2xl font-bold mt-8 mb-4">Related Conversations</h2>
                <ul>
                    {related
                        .filter(line => line.startsWith('- [['))
                        .map(line => {
                            const match = line.match(/- \[\[(.*?)\]\]/);
                            if (!match) return null;
                            const slug = match[1];
                            return (
                                <li key={slug}>
                                    <Link to={`/c/${slug}`} className="text-blue-500 hover:underline">
                                        {slug.replace(/_/g, ' ')}
                                    </Link>
                                </li>
                            );
                        })}
                </ul>
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
