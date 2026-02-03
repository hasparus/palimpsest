
import { spawn } from 'node:child_process';
import type { NextApiRequest, NextApiResponse } from 'next';

export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  if (!q) {
    return new Response(JSON.stringify({ error: 'Query parameter "q" is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const qmd = spawn('qmd', ['search', q, '--json']);

  let stdout = '';
  let stderr = '';

  qmd.stdout.on('data', (data) => {
    stdout += data;
  });

  qmd.stderr.on('data', (data) => {
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
        return resolve(new Response(JSON.stringify({ results }), {
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
