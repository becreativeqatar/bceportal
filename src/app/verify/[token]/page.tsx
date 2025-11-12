'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Calendar, Building2, Briefcase, Shield, ArrowRight } from 'lucide-react';
import Image from 'next/image';

interface AccreditationData {
  id: string;
  accreditationNumber: string;
  firstName: string;
  lastName: string;
  organization: string;
  jobTitle: string;
  accessGroup: string;
  profilePhotoUrl: string | null;
  qidNumber: string | null;
  project: {
    name: string;
    code: string;
  };
  phases: {
    bumpIn: {
      start: string;
      end: string;
    } | null;
    live: {
      start: string;
      end: string;
    } | null;
    bumpOut: {
      start: string;
      end: string;
    } | null;
  };
  status: string;
  isValidToday: boolean;
}

export default function VerifyAccreditationPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [accreditation, setAccreditation] = useState<AccreditationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{ name?: string; accreditationNumber?: string; phases?: any } | null>(null);
  const [unwrappedParams, setUnwrappedParams] = useState<{ token: string } | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

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
      const response = await fetch(`/api/accreditation/verify/${unwrappedParams.token}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 404) {
          setError(errorData.message || 'Invalid QR Code - This code does not exist in our system');
          setErrorType('NOT_FOUND');
        } else if (response.status === 403) {
          // Specific errors for revoked, rejected, pending, or not valid today
          setError(errorData.message || errorData.error || 'Access Denied');
          setErrorType(errorData.errorType || 'DENIED');

          // Store additional details (name, accreditation number, phases)
          if (errorData.name || errorData.accreditationNumber || errorData.phases) {
            setErrorDetails({
              name: errorData.name,
              accreditationNumber: errorData.accreditationNumber,
              phases: errorData.phases
            });
          }
        } else if (response.status === 401) {
          setError('Authentication Required - Please log in to verify accreditations');
          setErrorType('AUTH_REQUIRED');
        } else {
          setError(errorData.message || 'Verification Failed - Unable to process this accreditation');
          setErrorType('UNKNOWN');
        }
        return;
      }

      const data = await response.json();
      setAccreditation(data.accreditation);
    } catch (error) {
      console.error('Error fetching accreditation:', error);
      setError('Failed to verify accreditation');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateRange = (start: string, end: string) => {
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* Mobile-sized container - centered on desktop, full width on mobile */}
      <div className="w-full max-w-md mx-auto">
        {isLoading ? (
          <div className="min-h-[600px] flex items-center justify-center bg-white rounded-2xl shadow-xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-3 border-gray-300 border-t-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600 text-base font-medium">Verifying accreditation...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="shadow-xl border-0 rounded-2xl">
            <CardContent className="pt-12 pb-10 px-6 text-center">
              <div className="mb-6">
                <XCircle className={`h-14 w-14 mx-auto ${
                  errorType === 'REVOKED' ? 'text-red-500' : 'text-gray-400'
                }`} strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-3">
                {errorType === 'NOT_FOUND' ? 'Record Not Found' :
                 errorType === 'REVOKED' ? 'Access Revoked' :
                 errorType === 'REJECTED' ? 'Application Rejected' :
                 errorType === 'PENDING' ? 'Pending Approval' :
                 errorType === 'NOT_VALID_TODAY' ? 'Not Valid Today' :
                 errorType === 'NO_ACCESS_DATES' ? 'No Access Dates' :
                 'Verification Failed'}
              </h1>

              {/* Show name and number for specific error types */}
              {errorDetails && (errorDetails.name || errorDetails.accreditationNumber) && (
                <div className={`mb-4 p-4 rounded-lg border ${
                  errorType === 'REVOKED' ? 'bg-red-50 border-red-200' :
                  errorType === 'NOT_VALID_TODAY' ? 'bg-orange-50 border-orange-200' :
                  errorType === 'NO_ACCESS_DATES' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  {errorDetails.name && (
                    <p className={`text-lg font-bold mb-1 ${
                      errorType === 'REVOKED' ? 'text-red-900' :
                      errorType === 'NOT_VALID_TODAY' ? 'text-orange-900' :
                      errorType === 'NO_ACCESS_DATES' ? 'text-yellow-900' :
                      'text-gray-900'
                    }`}>{errorDetails.name}</p>
                  )}
                  {errorDetails.accreditationNumber && (
                    <p className={`text-sm font-mono ${
                      errorType === 'REVOKED' ? 'text-red-700' :
                      errorType === 'NOT_VALID_TODAY' ? 'text-orange-700' :
                      errorType === 'NO_ACCESS_DATES' ? 'text-yellow-700' :
                      'text-gray-700'
                    }`}>#{errorDetails.accreditationNumber}</p>
                  )}
                </div>
              )}

              <p className="text-gray-600 text-base leading-relaxed mb-4">{error}</p>

              {/* Show access periods for NOT_VALID_TODAY */}
              {errorType === 'NOT_VALID_TODAY' && errorDetails?.phases && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 text-left">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Valid Access Periods:</p>
                  <div className="space-y-1 text-sm text-blue-800">
                    {errorDetails.phases.bumpIn && (
                      <div>
                        <span className="font-semibold">Bump-In:</span>{' '}
                        {formatDate(errorDetails.phases.bumpIn.start)} - {formatDate(errorDetails.phases.bumpIn.end)}
                      </div>
                    )}
                    {errorDetails.phases.live && (
                      <div>
                        <span className="font-semibold">Live:</span>{' '}
                        {formatDate(errorDetails.phases.live.start)} - {formatDate(errorDetails.phases.live.end)}
                      </div>
                    )}
                    {errorDetails.phases.bumpOut && (
                      <div>
                        <span className="font-semibold">Bump-Out:</span>{' '}
                        {formatDate(errorDetails.phases.bumpOut.start)} - {formatDate(errorDetails.phases.bumpOut.end)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(errorType === 'REVOKED' || errorType === 'NO_ACCESS_DATES') && (
                <p className="text-sm text-red-600 font-medium mb-6">
                  Please contact administration for more information.
                </p>
              )}

              <Button
                onClick={() => router.push('/validator?autoScan=true')}
                className="bg-gray-900 hover:bg-gray-800 text-white font-medium"
              >
                Scan Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ) : !accreditation ? null : (
          <div className={`min-h-[600px] rounded-2xl shadow-xl overflow-hidden ${
            accreditation.isValidToday
              ? 'bg-gradient-to-br from-green-500 to-emerald-600'
              : 'bg-gradient-to-br from-red-500 to-pink-600'
          }`}>
            <div className="min-h-[600px] flex flex-col p-4 pt-6">
            {/* Status Icon */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center rounded-full w-16 h-16 bg-white mb-2 shadow-xl">
                {accreditation.isValidToday ? (
                  <CheckCircle className="h-10 w-10 text-green-600 stroke-[3]" />
                ) : (
                  <XCircle className="h-10 w-10 text-red-600 stroke-[3]" />
                )}
              </div>
              <h1 className="text-2xl font-black text-white mb-1">
                {accreditation.isValidToday ? 'VALID ACCESS' : 'ACCESS DENIED'}
              </h1>
            </div>

            {/* Main Card */}
            <Card className="flex-1 shadow-2xl border-0 overflow-auto mb-4">
              <CardContent className="p-4 bg-white">

                {/* Profile Section */}
                <div className="text-center mb-4">
                  {accreditation.profilePhotoUrl ? (
                    <div className="relative inline-block cursor-pointer" onClick={() => setShowPhotoModal(true)}>
                      <Image
                        src={accreditation.profilePhotoUrl}
                        alt={`${accreditation.firstName} ${accreditation.lastName}`}
                        width={100}
                        height={100}
                        className="rounded-xl object-cover border-3 border-gray-200 shadow-lg hover:opacity-90 transition-opacity"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 mx-auto rounded-xl flex items-center justify-center border-3 border-gray-200 bg-gray-100 shadow-lg">
                      <span className="text-3xl font-bold text-gray-600">
                        {accreditation.firstName[0]}{accreditation.lastName[0]}
                      </span>
                    </div>
                  )}

                  <h2 className="text-2xl font-bold text-gray-900 mt-3 mb-1">
                    {accreditation.firstName} {accreditation.lastName}
                  </h2>
                  <p className="text-xs text-gray-500 font-mono mb-1">#{accreditation.accreditationNumber}</p>
                  {accreditation.qidNumber && (
                    <p className="text-sm text-gray-700 font-semibold">QID: {accreditation.qidNumber}</p>
                  )}
                </div>

                {/* Key Information - Compact */}
                <div className="space-y-2">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 font-semibold uppercase">Organization</p>
                        <p className="text-base font-bold text-gray-900 truncate">{accreditation.organization}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 font-semibold uppercase">Access Group</p>
                        <p className="text-base font-bold text-gray-900 truncate">{accreditation.accessGroup}</p>
                      </div>
                    </div>
                  </div>

                  {/* Access Periods - Compact */}
                  {(accreditation.phases.bumpIn || accreditation.phases.live || accreditation.phases.bumpOut) && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-gray-600 flex-shrink-0" />
                        <span className="text-xs text-gray-500 font-semibold uppercase">Valid Periods</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        {accreditation.phases.bumpIn && (
                          <div>
                            <span className="font-semibold text-gray-700">Bump-In:</span>{' '}
                            <span className="text-gray-600">{formatDateRange(accreditation.phases.bumpIn.start, accreditation.phases.bumpIn.end)}</span>
                          </div>
                        )}
                        {accreditation.phases.live && (
                          <div>
                            <span className="font-semibold text-gray-700">Live:</span>{' '}
                            <span className="text-gray-600">{formatDateRange(accreditation.phases.live.start, accreditation.phases.live.end)}</span>
                          </div>
                        )}
                        {accreditation.phases.bumpOut && (
                          <div>
                            <span className="font-semibold text-gray-700">Bump-Out:</span>{' '}
                            <span className="text-gray-600">{formatDateRange(accreditation.phases.bumpOut.start, accreditation.phases.bumpOut.end)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>

            {/* Scan Next Button */}
            <div className="text-center">
              <Button
                onClick={() => router.push('/validator?autoScan=true')}
                className="bg-white text-gray-900 hover:bg-gray-100 shadow-lg font-semibold w-full max-w-xs"
              >
                Scan Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Full-Size Photo Modal */}
            {showPhotoModal && accreditation.profilePhotoUrl && (
              <div
                className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
                onClick={() => setShowPhotoModal(false)}
              >
                <div className="relative max-w-4xl max-h-full">
                  <button
                    onClick={() => setShowPhotoModal(false)}
                    className="absolute -top-12 right-0 text-white hover:text-gray-300 text-4xl font-bold"
                  >
                    ×
                  </button>
                  <Image
                    src={accreditation.profilePhotoUrl}
                    alt={`${accreditation.firstName} ${accreditation.lastName}`}
                    width={800}
                    height={800}
                    className="object-contain max-h-[80vh] rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <p className="text-white text-center mt-4 text-sm">
                    {accreditation.firstName} {accreditation.lastName} - {accreditation.accreditationNumber}
                  </p>
                </div>
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
