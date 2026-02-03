# Waku Reference (from https://waku.gg/llms.txt)

## Getting started

```sh
npm create waku@latest
```

Commands: `waku dev`, `waku build`, `waku start`

Node.js: `^24.0.0` or `^22.12.0` or `^20.19.0`

## File-based routing

Directory: `./src/pages`

Each file exports:
- `default` — React component
- `getConfig` — returns `{ render: 'static' | 'dynamic' }`

### Pages

Single routes: `about.tsx` → `/about`, `blog/index.tsx` → `/blog`

Segment routes: `[slug].tsx` — receives slug as prop. Static requires `staticPaths`.

```tsx
import type { PageProps } from 'waku/router';

export default async function Page({ slug }: PageProps<'/blog/[slug]'>) {
  return <>{/* ... */}</>;
}

export const getConfig = async () => ({
  render: 'dynamic',
} as const);
```

Catch-all: `[...catchAll].tsx` — receives array prop.

### Layouts

`_layout.tsx` — wraps route and descendants. Must accept `children: ReactNode`.

```tsx
export default async function RootLayout({ children }) {
  return <>{children}</>;
}
export const getConfig = async () => ({ render: 'static' } as const);
```

### Root element

`_root.tsx` — customize html/head/body:

```tsx
export default async function RootElement({ children }) {
  return (
    <html lang="en">
      <head></head>
      <body>{children}</body>
    </html>
  );
}
export const getConfig = async () => ({ render: 'static' } as const);
```

## Navigation

```tsx
import { Link } from 'waku';
<Link to="/about">About</Link>
```

`useRouter()` — `{ path, query, push, replace, back, forward, reload, prefetch }`

## Metadata

Just add `<title>`, `<meta>`, `<link>` in any component — auto-hoisted to head.

## Styling (Tailwind)

```tsx
// waku.config.ts
import { defineConfig } from 'waku/config';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ vite: { plugins: [tailwindcss()] } });
```

```css
/* styles.css */
@import 'tailwindcss';
```

Import in root layout: `import '../styles.css';`

## Static assets

`./public/` folder served at `/`.

## Private files (server-only)

`./private/` folder accessible in server components via `readFileSync('./private/...')`.

## API endpoints

`./src/pages/_api/search.ts`:

```ts
export const GET = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  // ...
  return Response.json({ results });
};

export const getConfig = async () => ({ render: 'dynamic' } as const);
```

Routes strip `_api` prefix: `_api/search.ts` → `/search`.

## Server actions

`'use server'` directive on function or file. NOT on server components.

## Client components

`'use client'` at top of file. Has state, effects, event handlers.

## Environment variables

Private: accessible via `getEnv('KEY')` in server components.
Public: prefix with `WAKU_PUBLIC_`, access via `import.meta.env.WAKU_PUBLIC_KEY`.
