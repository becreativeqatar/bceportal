'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';

interface RevokeDialogProps {
  accreditationId: string;
  accreditationNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RevokeDialog({
  accreditationId,
  accreditationNumber,
  open,
  onOpenChange,
}: RevokeDialogProps) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRevoke = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for revocation');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/accreditation/records/${accreditationId}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revoke accreditation');
      }

      toast.success('Accreditation revoked successfully');
      onOpenChange(false);
      setReason('');
      router.refresh();
    } catch (error) {
      console.error('Error revoking accreditation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to revoke accreditation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Revoke Accreditation
          </DialogTitle>
          <DialogDescription>
            You are about to revoke accreditation <strong>{accreditationNumber}</strong>.
            This will invalidate the badge and prevent access. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Revocation <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for revoking this accreditation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-gray-500">
              This reason will be recorded in the accreditation history.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setReason('');
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRevoke}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading ? 'Revoking...' : 'Revoke Accreditation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
