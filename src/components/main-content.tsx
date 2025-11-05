'use client';

import { usePathname } from 'next/navigation';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isVerifyPage = pathname?.startsWith('/verify');

  return (
    <main className={isVerifyPage ? '' : 'min-h-screen bg-gray-50'}>
      {children}
    </main>
  );
}
