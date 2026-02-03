
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'waku/router/client';

type SearchResult = {
  file: string;
  snippet: string;
  score: number;
};

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-parchment-300/60 text-ink rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

export default function Search() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
    setActiveIndex(0);
  }, []);

  // Global Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Fetch results
  useEffect(() => {
    if (!open) return;
    if (query.length < 3) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          setResults(data.results || []);
          setActiveIndex(0);
          setLoading(false);
        })
        .catch((err) => {
          if (err.name !== 'AbortError') console.error('Search failed:', err);
          setLoading(false);
        });
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, open]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i < results.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : results.length - 1));
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      const result = results[activeIndex];
      if (result) {
        const slug = result.file.replace(/\.md$/, '');
        close();
        window.location.href = `/c/${slug}`;
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:text-ink border border-parchment-200 hover:border-parchment-300 rounded transition-colors cursor-pointer"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="hidden sm:inline">Search…</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-parchment-100 border border-parchment-200 rounded text-ink-faint">
          ⌘K
        </kbd>
      </button>

      {open && createPortal(
        <div className="search-backdrop" onClick={close} onKeyDown={handleKeyDown}>
          <div
            className="search-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Search conversations"
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-parchment-200">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-ink-faint shrink-0"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations…"
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
              />
              {loading && (
                <span className="text-xs text-ink-faint animate-pulse">…</span>
              )}
            </div>

            {/* Results or empty state */}
            {results.length === 0 ? (
              <div className="px-4 py-6 text-center">
                {query.length >= 3 && !loading ? (
                  <p className="text-xs text-ink-faint">No results found</p>
                ) : (
                  <div className="flex items-center justify-center gap-4 text-[10px] text-ink-faint">
                    <span><kbd className="font-medium">↑↓</kbd> navigate</span>
                    <span><kbd className="font-medium">↵</kbd> open</span>
                    <span><kbd className="font-medium">esc</kbd> close</span>
                  </div>
                )}
              </div>
            ) : (
              <ul ref={listRef} className="max-h-72 overflow-y-auto overscroll-contain">
                {results.map((result, i) => {
                  const slug = result.file.replace(/\.md$/, '');
                  const title = slug.replace(/_/g, ' ');
                  return (
                    <li key={result.file}>
                      <Link
                        to={`/c/${slug}`}
                        onClick={close}
                        className={`flex flex-col gap-0.5 px-4 py-2.5 text-left transition-colors ${
                          i === activeIndex
                            ? 'bg-parchment-200/60'
                            : 'hover:bg-parchment-100'
                        }`}
                      >
                        <span className="text-xs font-medium text-ink-light truncate">
                          <HighlightedText text={title} query={query} />
                        </span>
                        <span className="text-xs text-ink-faint line-clamp-2">
                          <HighlightedText text={result.snippet} query={query} />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
