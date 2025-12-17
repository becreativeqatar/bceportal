'use client';

import { AppShell } from '@/components/layout/app-shell';
import { employeeSidebarConfig } from '@/components/layout/sidebar-config';

interface EmployeeLayoutClientProps {
  children: React.ReactNode;
}

export function EmployeeLayoutClient({ children }: EmployeeLayoutClientProps) {
  return (
    <AppShell sidebarConfig={employeeSidebarConfig}>
      {children}
    </AppShell>
  );
}
