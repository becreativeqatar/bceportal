'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, CheckCircle, Plus, Users, BarChart3, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectStats {
  totalAccreditations: number;
  draftAccreditations: number;
  pendingAccreditations: number;
  approvedAccreditations: number;
  rejectedAccreditations: number;
  totalScans: number;
}

interface ProjectOverviewProps {
  params: Promise<{ id: string }>;
}

export default function ProjectOverviewPage({ params }: ProjectOverviewProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string>('');
  const [stats, setStats] = useState<ProjectStats>({
    totalAccreditations: 0,
    draftAccreditations: 0,
    pendingAccreditations: 0,
    approvedAccreditations: 0,
    rejectedAccreditations: 0,
    totalScans: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    params.then(({ id }) => {
      setProjectId(id);
      fetchStats(id);
    });
  }, [params]);

  const fetchStats = async (id: string) => {
    try {
      const response = await fetch(`/api/accreditation/projects/${id}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching project stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!projectId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/accreditation/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Project deleted successfully');
        router.push('/admin/accreditation/projects');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete project', { duration: 10000 });
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project', { duration: 10000 });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading project overview...</p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]" onClick={() => router.push(`/admin/accreditation/projects/${projectId}/records`)}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">All Records</CardTitle>
                    <CardDescription>View accreditations</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-purple-600">{stats.totalAccreditations}</div>
                <div className="mt-3 flex gap-3 text-sm text-gray-600">
                  <span><span className="font-semibold text-green-600">{stats.approvedAccreditations}</span> approved</span>
                  <span>•</span>
                  <span><span className="font-semibold text-gray-700">{stats.draftAccreditations}</span> drafts</span>
                </div>
              </CardContent>
            </Card>

            <Card className={stats.pendingAccreditations > 0 ? "cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-yellow-200 bg-yellow-50" : "cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"} onClick={() => router.push(`/admin/accreditation/projects/${projectId}/approvals`)}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Approvals</CardTitle>
                    <CardDescription>Review pending</CardDescription>
                  </div>
                  {stats.pendingAccreditations > 0 && (
                    <Badge className="bg-red-500 text-white">
                      {stats.pendingAccreditations}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-yellow-600">{stats.pendingAccreditations}</div>
                <p className="text-sm text-gray-600 mt-2">
                  {stats.pendingAccreditations > 0 ? 'Needs review' : 'All caught up'}
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]" onClick={() => router.push(`/admin/accreditation/projects/${projectId}/reports`)}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Reports</CardTitle>
                    <CardDescription>View analytics</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-indigo-600">{stats.totalScans}</div>
                <p className="text-sm text-gray-600 mt-2">QR scan events</p>
              </CardContent>
            </Card>
          </div>

          {/* Primary Actions */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Create New</h3>
                    <p className="text-sm text-gray-600">Add personnel accreditation</p>
                  </div>
                  <Button
                    onClick={() => router.push(`/admin/accreditation/projects/${projectId}/records/new`)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Import CSV</h3>
                    <p className="text-sm text-gray-600">Bulk import accreditations</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/admin/accreditation/projects/${projectId}/records/import`)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Delete Project Button - Only show if no records exist */}
          {stats.totalAccreditations === 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-red-900 mb-1">Delete Project</h3>
                    <p className="text-sm text-red-700">Permanently remove this project (no records exist)</p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
