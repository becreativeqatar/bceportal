'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ExportUserPDFButton } from './export-user-pdf-button';
import { DeleteUserButton } from './delete-user-button';

interface UserDetailActionsProps {
  userId: string;
  userName: string;
  userEmail: string;
  currentUserId: string;
  isSystemAccount?: boolean;
}

export function UserDetailActions({ userId, userName, userEmail, currentUserId, isSystemAccount = false }: UserDetailActionsProps) {
  const displayName = userName || userEmail;
  const isSelf = userId === currentUserId;

  return (
    <div className="flex gap-2 flex-wrap">
      <ExportUserPDFButton
        userId={userId}
        userName={displayName}
        userEmail={userEmail}
      />
      <Link href={`/admin/users/${userId}/edit`}>
        <Button>Edit User</Button>
      </Link>
      <Link href="/admin/users">
        <Button variant="outline">Back to Users</Button>
      </Link>
      {!isSelf && !isSystemAccount && (
        <DeleteUserButton
          userId={userId}
          userName={displayName}
        />
      )}
    </div>
  );
}
