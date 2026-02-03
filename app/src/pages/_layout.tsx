import type { ReactNode } from 'react';
import { Link } from 'waku';
import '../styles.css';

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm sticky top-0 z-10">
        <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
          <Link to="/" className="text-lg font-bold tracking-tight hover:text-neutral-300 transition-colors">
            Palimpsest
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-neutral-400 hover:text-neutral-100 transition-colors">
              Home
            </Link>
            <Link to="/distilled" className="text-neutral-400 hover:text-neutral-100 transition-colors">
              Distilled
            </Link>
          </div>
          <div className="flex-1" />
          <div className="text-neutral-500 text-sm">
            {/* Search placeholder - will be replaced with client component */}
            <span className="px-3 py-1.5 bg-neutral-800 rounded border border-neutral-700 text-neutral-500">
              Search...
            </span>
          </div>
        </nav>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

export const getConfig = async () => ({ render: 'static' }) as const;
