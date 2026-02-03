import type { ReactNode } from 'react';
import { Link } from 'waku';
import '../styles.css';

import Search from '../components/search.js';

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
          <div className="w-64">
            <Search />
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
