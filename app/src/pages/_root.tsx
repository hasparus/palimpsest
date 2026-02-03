import type { ReactNode } from 'react';

export default async function RootElement({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Palimpsest</title>
        <meta name="description" content="AI conversation vault viewer" />
      </head>
      <body className="min-h-screen bg-neutral-950 text-neutral-100 font-mono antialiased">
        {children}
      </body>
    </html>
  );
}

export const getConfig = async () => ({ render: 'static' }) as const;
