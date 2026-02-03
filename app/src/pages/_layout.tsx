import type { ReactNode } from 'react';
import '../styles.css';

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}

export const getConfig = async () => ({ render: 'static' }) as const;
