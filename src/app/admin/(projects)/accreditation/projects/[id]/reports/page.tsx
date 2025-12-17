'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Users, CheckCircle2, XCircle, Clock, BarChart3, Activity, ScanLine } from 'lucide-react';
import { ScanHistory } from '@/components/accreditation/scan-history';
import { toast } from 'sonner';

interface ProjectReportData {
  project: {
    id: string;
    name: string;
    code: string;
    bumpInStart: string;
    bumpInEnd: string;
    liveStart: string;
    liveEnd: string;
    bumpOutStart: string;
    bumpOutEnd: string;
    accessGroups: string[];
  };
  stats: {
    total: number;
    byStatus: {
      PENDING: number;
      APPROVED: number;
      REJECTED: number;
      REVOKED: number;
    };
    byAccessGroup: Record<string, number>;
    byPhaseAccess: {
      bumpIn: number;
      live: number;
      bumpOut: number;
    };
    recentScans: {
      total: number;
      today: number;
      thisWeek: number;
    };
    idTypes: {
      qid: number;
      passport: number;
    };
  };
  recentActivity: Array<{
    id: string;
    accreditationNumber: string;
    firstName: string;
    lastName: string;
    action: string;
    createdAt: string;
  }>;
}

export default function ProjectReportsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [reportData, setReportData] = useState<ProjectReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [projectId]);

  const fetchReportData = async () => {
    try {
      const response = await fetch(`/api/accreditation/projects/${projectId}/reports`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        toast.error('Failed to load report data', { duration: 10000 });
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data', { duration: 10000 });
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    // TODO: Implement CSV export
    toast.info('CSV export coming soon');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading report data...</p>
          </div>
        ) : !reportData ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No report data available</p>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            {(() => {
              const { project, stats, recentActivity } = reportData;
              return (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h1 className="text-3xl font-semibold text-gray-900">{project.name} - Reports</h1>
                      <p className="text-gray-600 mt-1">Project Code: {project.code}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/admin/accreditation/scans')}
            >
              <ScanLine className="h-4 w-4 mr-2" />
              All Scan Logs
            </Button>
          </div>
        </div>

        {/* Project Timeline */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Project Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-semibold text-blue-900 mb-1">Bump-In Phase</p>
                <p className="text-blue-700">{formatDate(project.bumpInStart)} - {formatDate(project.bumpInEnd)}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="font-semibold text-green-900 mb-1">Live Phase</p>
                <p className="text-green-700">{formatDate(project.liveStart)} - {formatDate(project.liveEnd)}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="font-semibold text-purple-900 mb-1">Bump-Out Phase</p>
                <p className="text-purple-700">{formatDate(project.bumpOutStart)} - {formatDate(project.bumpOutEnd)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Accreditations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-8 w-8 text-blue-600" />
                <span className="text-3xl font-bold">{stats.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <span className="text-3xl font-bold">{stats.byStatus.APPROVED}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-8 w-8 text-yellow-600" />
                <span className="text-3xl font-bold">{stats.byStatus.PENDING}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="h-8 w-8 text-red-600" />
                <span className="text-3xl font-bold">{stats.byStatus.REJECTED}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Status Breakdown */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Pending Review</span>
                    <span className="text-sm text-gray-600">{stats.byStatus.PENDING}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ width: `${stats.total > 0 ? (stats.byStatus.PENDING / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Approved</span>
                    <span className="text-sm text-gray-600">{stats.byStatus.APPROVED}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${stats.total > 0 ? (stats.byStatus.APPROVED / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Revoked</span>
                    <span className="text-sm text-gray-600">{stats.byStatus.REVOKED}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gray-500 h-2 rounded-full"
                      style={{ width: `${stats.total > 0 ? (stats.byStatus.REVOKED / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Rejected</span>
                    <span className="text-sm text-gray-600">{stats.byStatus.REJECTED}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${stats.total > 0 ? (stats.byStatus.REJECTED / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Access Groups */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Access Groups Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.byAccessGroup)
                  .sort(([, a], [, b]) => b - a)
                  .map(([group, count]) => (
                    <div key={group}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{group}</span>
                        <span className="text-sm text-gray-600">{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Phase Access */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle>Phase Access Permissions</CardTitle>
              <CardDescription>Number of accreditations with access to each phase</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="font-medium text-blue-900">Bump-In Access</span>
                  <Badge className="bg-blue-600">{stats.byPhaseAccess.bumpIn}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="font-medium text-green-900">Live Access</span>
                  <Badge className="bg-green-600">{stats.byPhaseAccess.live}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="font-medium text-purple-900">Bump-Out Access</span>
                  <Badge className="bg-purple-600">{stats.byPhaseAccess.bumpOut}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scan Activity */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Scan Activity
              </CardTitle>
              <CardDescription>Badge scan statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Total Scans</span>
                  <Badge variant="outline">{stats.recentScans.total}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Today</span>
                  <Badge variant="outline">{stats.recentScans.today}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">This Week</span>
                  <Badge variant="outline">{stats.recentScans.thisWeek}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ID Types */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Identification Types</CardTitle>
            <CardDescription>Distribution of ID types used</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-900">{stats.idTypes.qid}</p>
                <p className="text-sm text-blue-700 mt-1">QID (Qatar ID)</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-purple-900">{stats.idTypes.passport}</p>
                <p className="text-sm text-purple-700 mt-1">Passport + Hayya</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest accreditation updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">
                        {activity.firstName} {activity.lastName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {activity.accreditationNumber} - {activity.action}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(activity.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

                  {/* Scan History */}
                  <ScanHistory
                    projectId={project.id}
                    title="Project Scan History"
                    showAccreditation={true}
                  />
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
