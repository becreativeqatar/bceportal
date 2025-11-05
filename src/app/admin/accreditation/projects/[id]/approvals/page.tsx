'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { CheckCircle, XCircle, Eye, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface Accreditation {
  id: string;
  accreditationNumber: string;
  firstName: string;
  lastName: string;
  organization: string;
  jobTitle: string;
  accessGroup: string;
  profilePhotoUrl: string | null;
  qidNumber: string | null;
  qidExpiry: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  hayyaVisaNumber: string | null;
  hayyaVisaExpiry: string | null;
  hasBumpInAccess: boolean;
  bumpInStart: string | null;
  bumpInEnd: string | null;
  hasLiveAccess: boolean;
  liveStart: string | null;
  liveEnd: string | null;
  hasBumpOutAccess: boolean;
  bumpOutStart: string | null;
  bumpOutEnd: string | null;
}

interface ProjectApprovalsPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectApprovalsPage({ params }: ProjectApprovalsPageProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string>('');
  const [accreditations, setAccreditations] = useState<Accreditation[]>([]);
  const [filteredAccreditations, setFilteredAccreditations] = useState<Accreditation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [accessGroupFilter, setAccessGroupFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject' | null;
    accreditation: Accreditation | null;
    notes: string;
    isSubmitting: boolean;
  }>({
    open: false,
    type: null,
    accreditation: null,
    notes: '',
    isSubmitting: false,
  });

  useEffect(() => {
    params.then(({ id }) => {
      setProjectId(id);
      fetchPendingAccreditations(id);
    });
  }, [params]);

  // Debounced filtering effect
  useEffect(() => {
    const timer = setTimeout(() => {
      let filtered = [...accreditations];

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter((acc) =>
          acc.firstName.toLowerCase().includes(query) ||
          acc.lastName.toLowerCase().includes(query) ||
          acc.organization.toLowerCase().includes(query) ||
          acc.accreditationNumber.toLowerCase().includes(query)
        );
      }

      if (accessGroupFilter !== 'all') {
        filtered = filtered.filter((acc) => acc.accessGroup === accessGroupFilter);
      }

      filtered.sort((a, b) => {
        const comparison = a.accreditationNumber.localeCompare(b.accreditationNumber);
        return sortOrder === 'asc' ? comparison : -comparison;
      });

      setFilteredAccreditations(filtered);
    }, 300);

    return () => clearTimeout(timer);
  }, [accreditations, searchQuery, accessGroupFilter, sortOrder]);

  const fetchPendingAccreditations = async (id: string) => {
    try {
      const response = await fetch(`/api/accreditation/records?status=PENDING&projectId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setAccreditations(data.accreditations);
      }
    } catch (error) {
      console.error('Error fetching pending accreditations:', error);
      toast.error('Failed to load pending accreditations');
    } finally {
      setIsLoading(false);
    }
  };

  const checkExpiryValidity = (accreditation: Accreditation): {
    isValid: boolean;
    message: string | null;
  } => {
    const now = new Date();

    const accessEndDates = [
      accreditation.hasBumpInAccess && accreditation.bumpInEnd ? new Date(accreditation.bumpInEnd) : null,
      accreditation.hasLiveAccess && accreditation.liveEnd ? new Date(accreditation.liveEnd) : null,
      accreditation.hasBumpOutAccess && accreditation.bumpOutEnd ? new Date(accreditation.bumpOutEnd) : null,
    ].filter(Boolean) as Date[];

    if (accessEndDates.length === 0) {
      return { isValid: false, message: 'No access periods defined' };
    }

    const lastAccessDate = new Date(Math.max(...accessEndDates.map((d) => d.getTime())));

    if (accreditation.qidNumber && accreditation.qidExpiry) {
      const qidExpiry = new Date(accreditation.qidExpiry);
      if (qidExpiry < lastAccessDate) {
        return { isValid: false, message: 'QID expires before last access date' };
      }
    } else if (accreditation.passportNumber) {
      if (accreditation.passportExpiry) {
        const passportExpiry = new Date(accreditation.passportExpiry);
        if (passportExpiry < lastAccessDate) {
          return { isValid: false, message: 'Passport expires before last access date' };
        }
      }
      if (accreditation.hayyaVisaExpiry) {
        const hayyaExpiry = new Date(accreditation.hayyaVisaExpiry);
        if (hayyaExpiry < lastAccessDate) {
          return { isValid: false, message: 'Hayya Visa expires before last access date' };
        }
      }
    }

    return { isValid: true, message: null };
  };

  const handleApprove = async () => {
    if (!actionDialog.accreditation) return;

    setActionDialog((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const response = await fetch(`/api/accreditation/records/${actionDialog.accreditation.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: actionDialog.notes || null }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve accreditation');
      }

      toast.success('Accreditation approved successfully');
      setActionDialog({ open: false, type: null, accreditation: null, notes: '', isSubmitting: false });
      fetchPendingAccreditations(projectId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve accreditation');
    } finally {
      setActionDialog((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleReject = async () => {
    if (!actionDialog.accreditation) return;

    if (!actionDialog.notes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setActionDialog((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const response = await fetch(`/api/accreditation/records/${actionDialog.accreditation.id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: actionDialog.notes }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject accreditation');
      }

      toast.success('Accreditation rejected');
      setActionDialog({ open: false, type: null, accreditation: null, notes: '', isSubmitting: false });
      fetchPendingAccreditations(projectId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject accreditation');
    } finally {
      setActionDialog((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <>
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-15 h-15 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2 pt-4">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 flex-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Header */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Approval Queue</h2>
            <p className="text-gray-600 mt-1">
              {filteredAccreditations.length} of {accreditations.length} pending accreditation{accreditations.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search name, org, or number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={accessGroupFilter} onValueChange={setAccessGroupFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Access Groups" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Access Groups</SelectItem>
                    {Array.from(new Set(accreditations.map((a) => a.accessGroup))).map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest First</SelectItem>
                    <SelectItem value="asc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {filteredAccreditations.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={CheckCircle2}
                  title="All caught up!"
                  description={
                    accreditations.length === 0
                      ? 'No pending accreditations to review'
                      : 'No results match your current filters'
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAccreditations.map((accreditation) => {
                const validation = checkExpiryValidity(accreditation);

                return (
                  <Card key={accreditation.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        {accreditation.profilePhotoUrl ? (
                          <Image
                            src={accreditation.profilePhotoUrl}
                            alt={`${accreditation.firstName} ${accreditation.lastName}`}
                            width={60}
                            height={60}
                            className="rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-15 h-15 rounded-lg bg-gray-200 flex items-center justify-center">
                            <span className="text-xl text-gray-500">
                              {accreditation.firstName[0]}
                              {accreditation.lastName[0]}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {accreditation.firstName} {accreditation.lastName}
                          </CardTitle>
                          <CardDescription>#{accreditation.accreditationNumber}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-gray-500">Organization</p>
                          <p className="font-medium">{accreditation.organization}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Job Title</p>
                          <p className="font-medium">{accreditation.jobTitle}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Access Group</p>
                          <Badge variant="outline">{accreditation.accessGroup}</Badge>
                        </div>
                      </div>

                      <div className="pt-4 border-t space-y-2">
                        <p className="text-xs font-semibold text-gray-700">Access Phases:</p>
                        {accreditation.hasBumpInAccess && (
                          <div className="text-xs text-gray-600">
                            <p className="font-medium">✓ Bump-In</p>
                            <p className="text-gray-500 ml-4">
                              {formatDate(accreditation.bumpInStart)} - {formatDate(accreditation.bumpInEnd)}
                            </p>
                          </div>
                        )}
                        {accreditation.hasLiveAccess && (
                          <div className="text-xs text-gray-600">
                            <p className="font-medium">✓ Live</p>
                            <p className="text-gray-500 ml-4">
                              {formatDate(accreditation.liveStart)} - {formatDate(accreditation.liveEnd)}
                            </p>
                          </div>
                        )}
                        {accreditation.hasBumpOutAccess && (
                          <div className="text-xs text-gray-600">
                            <p className="font-medium">✓ Bump-Out</p>
                            <p className="text-gray-500 ml-4">
                              {formatDate(accreditation.bumpOutStart)} - {formatDate(accreditation.bumpOutEnd)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Validation Status */}
                      <div className="pt-4 border-t">
                        {validation.isValid ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">All validations passed</span>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 text-red-600">
                            <AlertTriangle className="h-4 w-4 mt-0.5" />
                            <span className="text-sm">{validation.message}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="pt-4 border-t flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => router.push(`/admin/accreditation/records/${accreditation.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() =>
                            setActionDialog({
                              open: true,
                              type: 'approve',
                              accreditation,
                              notes: '',
                              isSubmitting: false,
                            })
                          }
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() =>
                            setActionDialog({
                              open: true,
                              type: 'reject',
                              accreditation,
                              notes: '',
                              isSubmitting: false,
                            })
                          }
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Action Dialog */}
          <Dialog
            open={actionDialog.open}
            onOpenChange={(open) =>
              !actionDialog.isSubmitting &&
              setActionDialog({ open, type: null, accreditation: null, notes: '', isSubmitting: false })
            }
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {actionDialog.type === 'approve' ? 'Approve Accreditation' : 'Reject Accreditation'}
                </DialogTitle>
                <DialogDescription>
                  {actionDialog.accreditation &&
                    `${actionDialog.accreditation.firstName} ${actionDialog.accreditation.lastName} (${actionDialog.accreditation.accreditationNumber})`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">
                    Notes {actionDialog.type === 'reject' && '*'}
                  </Label>
                  <Textarea
                    id="notes"
                    value={actionDialog.notes}
                    onChange={(e) => setActionDialog({ ...actionDialog, notes: e.target.value })}
                    placeholder={
                      actionDialog.type === 'approve'
                        ? 'Add any notes (optional)...'
                        : 'Provide a reason for rejection...'
                    }
                    rows={4}
                    required={actionDialog.type === 'reject'}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() =>
                    setActionDialog({ open: false, type: null, accreditation: null, notes: '', isSubmitting: false })
                  }
                  disabled={actionDialog.isSubmitting}
                >
                  Cancel
                </Button>
                {actionDialog.type === 'approve' ? (
                  <Button
                    onClick={handleApprove}
                    disabled={actionDialog.isSubmitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {actionDialog.isSubmitting ? 'Approving...' : 'Approve'}
                  </Button>
                ) : (
                  <Button onClick={handleReject} disabled={actionDialog.isSubmitting} variant="destructive">
                    {actionDialog.isSubmitting ? 'Rejecting...' : 'Reject'}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
