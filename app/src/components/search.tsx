
'use client';

import { useState, useEffect } from 'react';
import { Link } from 'waku/router/client';

type SearchResult = {
  file: string;
  snippet: string;
  score: number;
};

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const debounceTimeout = setTimeout(() => {
      setLoading(true);
      fetch(`/search?q=${query}`, { signal })
        .then((res) => res.json())
        .then((data) => {
          setResults(data.results || []);
          setLoading(false);
        })
        .catch((error) => {
          if (error.name !== 'AbortError') {
            console.error('Search failed:', error);
          }
          setLoading(false);
        });
    }, 300);

    return () => {
      clearTimeout(debounceTimeout);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search conversations..."
        className="w-full px-4 py-2 text-white bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {loading && <div className="absolute top-full mt-2 w-full p-4 bg-gray-800 border border-gray-700 rounded-md">Loading...</div>}
      {results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10">
          <ul>
            {results.map((result) => (
              <li key={result.file}>
                <Link
                  to={`/c/${result.file.replace('.md', '')}`}
                  className="block p-4 hover:bg-gray-700"
                  onClick={() => setQuery('')}
                >
                  <div className="font-bold">{result.file.replace('.md', '').replace(/_/g, ' ')}</div>
                  <div className="text-sm text-gray-400" dangerouslySetInnerHTML={{ __html: result.snippet }} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
