'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ScanLine, CheckCircle, XCircle, Monitor, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface ScanLog {
  id: string;
  scannedAt: string;
  wasValid: boolean;
  validPhases: string[];
  device: string | null;
  ipAddress: string | null;
  location: string | null;
  notes: string | null;
  scannedBy: {
    id: string;
    name: string | null;
    email: string;
  };
  accreditation?: {
    id: string;
    accreditationNumber: string;
    firstName: string;
    lastName: string;
    organization: string;
    accessGroup: string;
    profilePhotoUrl: string | null;
    project: {
      name: string;
      code: string;
    };
  };
}

interface ScanHistoryProps {
  accreditationId?: string; // If provided, shows scans for a specific accreditation
  projectId?: string; // If provided, shows scans for a specific project
  title?: string;
  showAccreditation?: boolean; // Show accreditation details (for consolidated view)
}

export function ScanHistory({
  accreditationId,
  projectId,
  title = 'Scan History',
  showAccreditation = false
}: ScanHistoryProps) {
  const [scans, setScans] = useState<ScanLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchScans();
  }, [accreditationId, projectId, pagination.page]);

  const fetchScans = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(accreditationId && { accreditationId }),
        ...(projectId && { projectId }),
      });

      const response = await fetch(`/api/accreditation/scans?${params}`);
      if (response.ok) {
        const data = await response.json();
        setScans(data.scans);
        setPagination(data.pagination);
      } else {
        toast.error('Failed to load scan history');
      }
    } catch (error) {
      console.error('Error fetching scans:', error);
      toast.error('Failed to load scan history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPhases = (phases: string[]) => {
    if (!phases || phases.length === 0) return 'None';
    return phases
      .map((phase) => phase.replace('_', '-').toLowerCase())
      .map((phase) => phase.charAt(0).toUpperCase() + phase.slice(1))
      .join(', ');
  };

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanLine className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          {pagination.total} total scan{pagination.total !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {scans.length === 0 ? (
          <EmptyState
            icon={ScanLine}
            title="No scans yet"
            description="QR code scans will appear here"
          />
        ) : (
          <div className="space-y-4">
            {scans.map((scan) => (
              <div
                key={scan.id}
                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {scan.wasValid ? (
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                  )}
                </div>

                {/* Scan Details */}
                <div className="flex-1 min-w-0">
                  {/* Accreditation Info (if showing multiple accreditations) */}
                  {showAccreditation && scan.accreditation && (
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b">
                      {scan.accreditation.profilePhotoUrl ? (
                        <Image
                          src={scan.accreditation.profilePhotoUrl}
                          alt={`${scan.accreditation.firstName} ${scan.accreditation.lastName}`}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm text-gray-600">
                            {scan.accreditation.firstName?.[0] || ''}
                            {scan.accreditation.lastName?.[0] || ''}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">
                          {scan.accreditation.firstName} {scan.accreditation.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {scan.accreditation.accreditationNumber} • {scan.accreditation.organization}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Scan Status */}
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={scan.wasValid ? 'default' : 'destructive'}>
                      {scan.wasValid ? 'Valid' : 'Invalid'}
                    </Badge>
                    {scan.wasValid && scan.validPhases && scan.validPhases.length > 0 && (
                      <Badge variant="outline">{formatPhases(scan.validPhases)}</Badge>
                    )}
                  </div>

                  {/* Scanned By & Time */}
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(scan.scannedAt)}</span>
                    </div>
                    <div>
                      Scanned by: <span className="font-medium">{scan.scannedBy.name || scan.scannedBy.email}</span>
                    </div>
                    {scan.device && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Monitor className="h-3 w-3" />
                        <span className="truncate">{scan.device}</span>
                      </div>
                    )}
                    {scan.location && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" />
                        <span>{scan.location}</span>
                      </div>
                    )}
                  </div>

                  {scan.notes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                      {scan.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
