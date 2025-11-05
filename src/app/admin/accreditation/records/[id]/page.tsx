'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, CheckCircle, XCircle, Eye, Edit, Ban, Undo, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { ScanHistory } from '@/components/accreditation/scan-history';
import { RevokeDialog } from '@/components/accreditation/revoke-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

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
  passportCountry: string | null;
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
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'ISSUED';
  qrCodeToken: string | null;
  approvedAt: string | null;
  approvedBy: {
    name: string;
    email: string;
  } | null;
  project: {
    id: string;
    name: string;
    code: string;
  };
  history: Array<{
    id: string;
    action: string;
    notes: string | null;
    createdAt: string;
    performedBy: {
      name: string;
      email: string;
    };
  }>;
}

export default function AccreditationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [accreditation, setAccreditation] = useState<Accreditation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unwrappedParams, setUnwrappedParams] = useState<{ id: string } | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PER_PAGE = 5;

  // Approval/Rejection state
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    params.then(setUnwrappedParams);
  }, [params]);

  useEffect(() => {
    if (unwrappedParams) {
      fetchAccreditation();
    }
  }, [unwrappedParams]);

  const fetchAccreditation = async () => {
    if (!unwrappedParams) return;

    try {
      const response = await fetch(`/api/accreditation/records/${unwrappedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setAccreditation(data.accreditation);
      } else {
        toast.error('Failed to load accreditation');
        router.push('/admin/accreditation');
      }
    } catch (error) {
      console.error('Error fetching accreditation:', error);
      toast.error('Failed to load accreditation');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadQR = () => {
    if (!accreditation || !accreditation.qrCodeToken) return;
    window.open(`/api/accreditation/records/${accreditation.id}/qr`, '_blank');
  };

  const openVerificationPage = () => {
    if (!accreditation || !accreditation.qrCodeToken) return;
    window.open(`/verify/${accreditation.qrCodeToken}`, '_blank');
  };

  const handleApprove = async () => {
    if (!accreditation) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/accreditation/records/${accreditation.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: approvalNotes }),
      });

      if (response.ok) {
        toast.success('Accreditation approved successfully');
        setIsApproveDialogOpen(false);
        setApprovalNotes('');
        fetchAccreditation(); // Refresh data
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to approve accreditation');
      }
    } catch (error) {
      console.error('Error approving accreditation:', error);
      toast.error('Failed to approve accreditation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!accreditation) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/accreditation/records/${accreditation.id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: rejectionNotes }),
      });

      if (response.ok) {
        toast.success('Accreditation rejected');
        setIsRejectDialogOpen(false);
        setRejectionNotes('');
        fetchAccreditation(); // Refresh data
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to reject accreditation');
      }
    } catch (error) {
      console.error('Error rejecting accreditation:', error);
      toast.error('Failed to reject accreditation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnToDraft = async () => {
    if (!accreditation) return;

    // Confirm action
    if (!confirm('Are you sure you want to return this accreditation to draft? This will allow editing before resubmission.')) {
      return;
    }

    try {
      toast.loading('Returning to draft...', { id: 'return-to-draft' });

      const response = await fetch(`/api/accreditation/records/${accreditation.id}/return-to-draft`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        toast.success('Accreditation returned to draft', { id: 'return-to-draft' });
        fetchAccreditation(); // Refresh data
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to return to draft', { id: 'return-to-draft' });
      }
    } catch (error) {
      console.error('Error returning to draft:', error);
      toast.error('Failed to return to draft', { id: 'return-to-draft' });
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      DRAFT: 'bg-gray-100 text-gray-800 border-gray-300',
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      APPROVED: 'bg-green-100 text-green-800 border-green-300',
      REJECTED: 'bg-red-100 text-red-800 border-red-300',
      REVOKED: 'bg-gray-100 text-gray-800 border-gray-300',
      ISSUED: 'bg-green-100 text-green-800 border-green-300',
    };

    return (
      <Badge className={styles[status as keyof typeof styles] || styles.DRAFT} variant="outline">
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getExpiredIds = (accreditation: Accreditation): string[] => {
    const now = new Date();
    const expired: string[] = [];

    if (accreditation.qidExpiry && new Date(accreditation.qidExpiry) < now) {
      expired.push('QID');
    }

    if (accreditation.passportExpiry && new Date(accreditation.passportExpiry) < now) {
      expired.push('Passport');
    }

    if (accreditation.hayyaVisaExpiry && new Date(accreditation.hayyaVisaExpiry) < now) {
      expired.push('Hayya Visa');
    }

    return expired;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        {isLoading ? (
          <div className="max-w-5xl mx-auto text-center py-12">
            <p className="text-gray-500">Loading accreditation...</p>
          </div>
        ) : !accreditation ? (
          <div className="max-w-5xl mx-auto text-center py-12">
            <p className="text-gray-500">Accreditation not found</p>
          </div>
        ) : (
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              if (accreditation?.project?.id) {
                router.push(`/admin/accreditation/projects/${accreditation.project.id}/records`);
              } else {
                router.back();
              }
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Records
          </Button>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {accreditation.firstName} {accreditation.lastName}
            </h1>
            <p className="text-gray-600 mt-1">Accreditation #{accreditation.accreditationNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(accreditation.status)}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/admin/accreditation/records/${accreditation.id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            {accreditation.status === 'PENDING' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReturnToDraft}
                  className="border-gray-500 text-gray-700 hover:bg-gray-50"
                >
                  <Undo className="h-4 w-4 mr-2" />
                  Return to Draft
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsApproveDialogOpen(true)}
                  className="border-green-500 text-green-700 hover:bg-green-50"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRejectDialogOpen(true)}
                  className="border-red-500 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            {accreditation.status === 'APPROVED' && (
              <>
                <Button variant="outline" size="sm" onClick={downloadQR}>
                  <Download className="h-4 w-4 mr-2" />
                  QR Code
                </Button>
                <Button variant="outline" size="sm" onClick={openVerificationPage}>
                  <Eye className="h-4 w-4 mr-2" />
                  Verify
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRevokeDialogOpen(true)}
                  className="border-red-500 text-red-700 hover:bg-red-50"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Revoke
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Expired ID Warning Banner */}
        {getExpiredIds(accreditation).length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-red-900 font-semibold mb-1">Expired Identification Documents</h3>
                <p className="text-red-700 text-sm">
                  The following identification document(s) have expired: <strong>{getExpiredIds(accreditation).join(', ')}</strong>
                </p>
                <p className="text-red-600 text-xs mt-1">
                  Please update the identification information before approving this accreditation.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-6">
                  {accreditation.profilePhotoUrl && (accreditation.profilePhotoUrl.startsWith('http://') || accreditation.profilePhotoUrl.startsWith('https://')) ? (
                    <Image
                      src={accreditation.profilePhotoUrl}
                      alt={`${accreditation.firstName} ${accreditation.lastName}`}
                      width={150}
                      height={150}
                      className="rounded-lg object-cover border-2 border-gray-200 shadow-sm"
                    />
                  ) : (
                    <div className="w-[150px] h-[150px] rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-gray-200 shadow-sm">
                      <span className="text-4xl font-semibold text-gray-400">
                        {accreditation.firstName?.[0] || ''}
                        {accreditation.lastName?.[0] || ''}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Organization</p>
                      <p className="font-medium">{accreditation.organization}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Job Title</p>
                      <p className="font-medium">{accreditation.jobTitle}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Access Group</p>
                      <Badge variant="outline">{accreditation.accessGroup}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Identification */}
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle>Identification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {accreditation.qidNumber ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">QID Number</p>
                      <p className="font-medium">{accreditation.qidNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">QID Expiry</p>
                      <p className="font-medium">{formatDate(accreditation.qidExpiry)}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Passport Number</p>
                        <p className="font-medium">{accreditation.passportNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Passport Country</p>
                        <p className="font-medium">{accreditation.passportCountry || 'Not specified'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Passport Expiry</p>
                        <p className="font-medium">{formatDate(accreditation.passportExpiry)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Hayya Visa Number</p>
                        <p className="font-medium">{accreditation.hayyaVisaNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Hayya Visa Expiry</p>
                        <p className="font-medium">{formatDate(accreditation.hayyaVisaExpiry)}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Access Validity */}
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle>Access Validity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {accreditation.hasBumpInAccess && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Bump-In Phase</p>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(accreditation.bumpInStart)} - {formatDateTime(accreditation.bumpInEnd)}
                    </p>
                  </div>
                )}
                {accreditation.hasLiveAccess && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Live Phase</p>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(accreditation.liveStart)} - {formatDateTime(accreditation.liveEnd)}
                    </p>
                  </div>
                )}
                {accreditation.hasBumpOutAccess && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Bump-Out Phase</p>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(accreditation.bumpOutStart)} - {formatDateTime(accreditation.bumpOutEnd)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scan Logs */}
            {accreditation.status === 'APPROVED' && (
              <ScanHistory
                accreditationId={accreditation.id}
                title="QR Code Scan History"
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* QR Code */}
            {(accreditation.status === 'APPROVED' || accreditation.status === 'ISSUED') && accreditation.qrCodeToken && (
              <Card className="bg-white shadow-sm border border-gray-200">
                <CardHeader>
                  <CardTitle>QR Code</CardTitle>
                  <CardDescription>Scan to verify accreditation</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <img
                    src={`/api/accreditation/records/${accreditation.id}/qr?t=${Date.now()}`}
                    alt="QR Code"
                    width={200}
                    height={200}
                    className="rounded-lg"
                  />
                </CardContent>
              </Card>
            )}

            {/* Approval/Rejection Info */}
            {(accreditation.status === 'APPROVED' || accreditation.status === 'ISSUED') && accreditation.approvedBy && (
              <Card className="bg-green-50 shadow-sm border-2 border-green-200">
                <CardHeader>
                  <CardTitle className="text-green-900">Approval Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-green-700">Approved By</p>
                    <p className="font-medium text-green-900">{accreditation.approvedBy.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700">Approved On</p>
                    <p className="font-medium text-green-900">{formatDateTime(accreditation.approvedAt)}</p>
                  </div>
                  {(() => {
                    const approvalEntry = accreditation.history.find(h => h.action === 'APPROVED');
                    return approvalEntry?.notes && (
                      <div>
                        <p className="text-sm text-green-700">Notes</p>
                        <p className="font-medium text-green-900 bg-white p-3 rounded-md border border-green-200 mt-1">
                          {approvalEntry.notes}
                        </p>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {accreditation.status === 'REJECTED' && (
              <Card className="bg-red-50 shadow-sm border-2 border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-900">Rejection Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(() => {
                    const rejectionEntry = accreditation.history.find(h => h.action === 'REJECTED');
                    return rejectionEntry && (
                      <>
                        <div>
                          <p className="text-sm text-red-700">Rejected By</p>
                          <p className="font-medium text-red-900">{rejectionEntry.performedBy.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-red-700">Rejected On</p>
                          <p className="font-medium text-red-900">{formatDateTime(rejectionEntry.createdAt)}</p>
                        </div>
                        {rejectionEntry.notes && (
                          <div>
                            <p className="text-sm text-red-700">Reason</p>
                            <p className="font-medium text-red-900 bg-white p-3 rounded-md border border-red-200 mt-1">
                              {rejectionEntry.notes}
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* History */}
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle>History</CardTitle>
                {accreditation.history.length > HISTORY_PER_PAGE && (
                  <p className="text-sm text-gray-500">
                    Showing {Math.min(historyPage * HISTORY_PER_PAGE, accreditation.history.length)} of {accreditation.history.length} records
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {accreditation.history.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No history yet</p>
                ) : (
                  <>
                    <div className="space-y-4">
                      {accreditation.history.slice(0, historyPage * HISTORY_PER_PAGE).map((entry) => (
                        <div key={entry.id} className="border-l-2 border-blue-500 pl-4 py-2">
                          <p className="text-sm font-medium">{entry.action}</p>
                          <p className="text-xs text-gray-600">{formatDateTime(entry.createdAt)}</p>
                          <p className="text-xs text-gray-500">By {entry.performedBy.name}</p>
                          {entry.notes && <p className="text-sm text-gray-700 mt-1">{entry.notes}</p>}
                        </div>
                      ))}
                    </div>
                    {accreditation.history.length > historyPage * HISTORY_PER_PAGE && (
                      <div className="mt-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryPage((prev) => prev + 1)}
                        >
                          Show More
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Approval Dialog */}
        <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Accreditation</DialogTitle>
              <DialogDescription>
                Approve {accreditation.firstName} {accreditation.lastName}&apos;s accreditation request.
                This will generate a QR code for verification.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="approval-notes">Notes (Optional)</Label>
                <Textarea
                  id="approval-notes"
                  placeholder="Add any notes or comments..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={isSubmitting}>
                {isSubmitting ? 'Approving...' : 'Approve'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Accreditation</DialogTitle>
              <DialogDescription>
                Reject {accreditation.firstName} {accreditation.lastName}&apos;s accreditation request.
                Please provide a reason for rejection.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rejection-notes">Reason for Rejection *</Label>
                <Textarea
                  id="rejection-notes"
                  placeholder="Please explain why this accreditation is being rejected..."
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  rows={4}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isSubmitting || !rejectionNotes.trim()}
              >
                {isSubmitting ? 'Rejecting...' : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Revoke Dialog */}
        <RevokeDialog
          accreditationId={accreditation.id}
          accreditationNumber={accreditation.accreditationNumber}
          open={isRevokeDialogOpen}
          onOpenChange={setIsRevokeDialogOpen}
        />
        </div>
        )}
      </div>
    </div>
  );
}
