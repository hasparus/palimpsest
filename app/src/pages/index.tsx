export default async function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Conversations</h1>
      <p className="text-neutral-400">Vault viewer coming soon.</p>
    </div>
  );
}

export const getConfig = async () => ({ render: 'dynamic' }) as const;
