'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FileText } from 'lucide-react';

interface UserActionsProps {
  userId: string;
  userName: string;
  userEmail: string;
  currentUserId: string;
  isSystemAccount?: boolean;
  isDeleted?: boolean;
  deletionNotes?: string | null;
}

export function UserActions({
  userId,
  userName,
  userEmail,
  currentUserId,
  isSystemAccount = false,
  isDeleted = false,
  deletionNotes = null,
}: UserActionsProps) {
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  return (
    <div className="flex gap-2">
      <Link href={`/admin/users/${userId}`}>
        <Button variant="outline" size="sm">
          View {isDeleted ? 'History' : 'Details'}
        </Button>
      </Link>
      {isDeleted && deletionNotes && (
        <Dialog open={isNotesOpen} onOpenChange={setIsNotesOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1">
              <FileText className="h-4 w-4" />
              Deletion Notes
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Deletion Notes</DialogTitle>
              <DialogDescription>
                Notes recorded when this user was deleted
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded border">
                {deletionNotes}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
