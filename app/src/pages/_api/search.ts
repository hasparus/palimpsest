
import { spawn } from 'node:child_process';
import { basename } from 'node:path';

export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  let q = searchParams.get('q');

  if (!q) {
    return new Response(JSON.stringify({ error: 'Query parameter "q" is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Input validation
  q = q.slice(0, 200).replace(/\0/g, '');

  const qmd = spawn('qmd', ['search', '--json', '--', q]);

  let stdout = '';
  let stderr = '';

  qmd.stdout.on('data', (data: Buffer) => {
    stdout += data;
  });

  qmd.stderr.on('data', (data: Buffer) => {
    stderr += data;
  });

  return new Promise<Response>((resolve) => {
    qmd.on('close', (code) => {
      if (code !== 0) {
        console.error(`qmd process exited with code ${code}`);
        console.error(stderr);
        return resolve(new Response(JSON.stringify({ error: 'Failed to execute search' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }));
      }

      try {
        const results = JSON.parse(stdout);
        const normalized = Array.isArray(results)
          ? results.map((r: { file: string; snippet: string; score: number }) => ({
              ...r,
              file: basename(r.file),
            }))
          : results;
        return resolve(new Response(JSON.stringify({ results: normalized }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }));
      } catch (error) {
        console.error('Failed to parse qmd output:', error);
        return resolve(new Response(JSON.stringify({ error: 'Failed to parse search results' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }));
      }
    });
  });
};

export const getConfig = async () => ({
    render: 'dynamic',
} as const);
