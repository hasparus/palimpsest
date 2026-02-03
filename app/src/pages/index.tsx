export default async function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 font-mono p-8">
      <h1 className="text-2xl font-bold mb-4">Palimpsest</h1>
      <p className="text-neutral-400">Vault viewer coming soon.</p>
    </main>
  );
}

export const getConfig = async () => ({ render: 'dynamic' }) as const;
