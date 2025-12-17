'use client';

import { AppShell } from '@/components/layout/app-shell';
import { adminSidebarConfig, type BadgeCounts } from '@/components/layout/sidebar-config';

interface AdminLayoutClientProps {
  children: React.ReactNode;
  badgeCounts: BadgeCounts;
}

export function AdminLayoutClient({ children, badgeCounts }: AdminLayoutClientProps) {
  return (
    <AppShell sidebarConfig={adminSidebarConfig} badgeCounts={badgeCounts}>
      {children}
    </AppShell>
  );
}
