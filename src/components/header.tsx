'use client';

import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { theme } from '@/lib/theme';

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Hide header on verification and login pages
  if (pathname?.startsWith('/verify') || pathname === '/login') {
    return null;
  }

  return (
    <header className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-12 w-auto"
            />
          </Link>

          <div className="flex items-center gap-4" suppressHydrationWarning>
            {status === "loading" ? (
              <div className="h-8 w-20"></div>
            ) : session ? (
              <>
                <span className="text-sm text-slate-100">
                  Welcome, <span className="font-medium text-white">{session.user.name || session.user.email}</span>
                  {session.user.role && (
                    <span className="ml-1 text-xs text-slate-300">
                      ({session.user.role})
                    </span>
                  )}
                </span>
                <Link href="/profile">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border border-slate-400 bg-white/10 text-white hover:bg-white/20 hover:border-slate-300 transition-colors"
                  >
                    Profile
                  </Button>
                </Link>
                <Button
                  size="sm"
                  onClick={() => signOut()}
                  className="border border-slate-400 bg-white/10 text-white hover:bg-white/20 hover:border-slate-300 transition-colors"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button size="sm" className="border border-slate-400 bg-white/10 text-white hover:bg-white/20 hover:border-slate-300 transition-colors">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}