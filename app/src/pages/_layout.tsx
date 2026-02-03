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
      <header className="border-b border-parchment-200 sticky top-0 z-10 header-surface">
        <nav className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-8">
          <Link
            to="/"
            className="text-sm font-medium tracking-widest text-ink-light hover:text-ink transition-colors"
          >
            palimpsest
          </Link>
          <div className="flex items-center gap-6 text-xs tracking-wide">
            <Link
              to="/distilled"
              className="text-ink-muted hover:text-ink transition-colors"
            >
              Distilled
            </Link>
          </div>
          <div className="flex-1" />
          <Search />
        </nav>
      </header>
      <main className="flex-1 animate-in">
        {children}
      </main>
      <footer className="border-t border-parchment-200 py-4 mt-16">
        <div className="max-w-3xl mx-auto px-6 flex items-center gap-6 text-xs text-ink-faint">
          <Link to="/" className="hover:text-ink-muted transition-colors">Archive</Link>
          <Link to="/distilled" className="hover:text-ink-muted transition-colors">Distilled</Link>
          <span className="flex-1" />
          <kbd className="text-[10px] tracking-wide">&#8984;K search</kbd>
        </div>
      </footer>
    </div>
  );
}

export const getConfig = async () => ({ render: 'static' }) as const;
