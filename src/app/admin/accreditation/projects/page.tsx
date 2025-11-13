'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Plus, Edit, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

interface AccreditationProject {
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
  isActive: boolean;
  _count: {
    accreditations: number;
  };
}

export default function AccreditationProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<AccreditationProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    bumpInStart: '',
    bumpInEnd: '',
    liveStart: '',
    liveEnd: '',
    bumpOutStart: '',
    bumpOutEnd: '',
    accessGroups: ['VIP', 'VVIP', 'Organiser', 'Contractor', 'Medical', 'Security', 'Media'],
    newAccessGroup: '',
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/accreditation/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects', { duration: 10000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate date sequences
      const bumpInEndDate = new Date(formData.bumpInEnd);
      const liveStartDate = new Date(formData.liveStart);
      const liveEndDate = new Date(formData.liveEnd);
      const bumpOutStartDate = new Date(formData.bumpOutStart);

      if (bumpInEndDate >= liveStartDate) {
        toast.error('Bump-In End must be before Live Start date', { duration: 10000 });
        setIsSubmitting(false);
        return;
      }

      if (liveEndDate >= bumpOutStartDate) {
        toast.error('Live End must be before Bump-Out Start date', { duration: 10000 });
        setIsSubmitting(false);
        return;
      }

      const url = isEditMode
        ? `/api/accreditation/projects/${editingProjectId}`
        : '/api/accreditation/projects';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code,
          bumpInStart: new Date(formData.bumpInStart),
          bumpInEnd: new Date(formData.bumpInEnd),
          liveStart: new Date(formData.liveStart),
          liveEnd: new Date(formData.liveEnd),
          bumpOutStart: new Date(formData.bumpOutStart),
          bumpOutEnd: new Date(formData.bumpOutEnd),
          accessGroups: formData.accessGroups,
          isActive: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} accreditation project`);
      }

      toast.success(`Accreditation project ${isEditMode ? 'updated' : 'created'} successfully`);
      setIsDialogOpen(false);
      fetchProjects();
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'create'} accreditation project`, { duration: 10000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      bumpInStart: '',
      bumpInEnd: '',
      liveStart: '',
      liveEnd: '',
      bumpOutStart: '',
      bumpOutEnd: '',
      accessGroups: ['VIP', 'VVIP', 'Organiser', 'Contractor', 'Medical', 'Security', 'Media'],
      newAccessGroup: '',
    });
    setIsEditMode(false);
    setEditingProjectId(null);
  };

  const handleEditProject = (project: AccreditationProject) => {
    setIsEditMode(true);
    setEditingProjectId(project.id);
    setFormData({
      name: project.name,
      code: project.code || '',
      bumpInStart: new Date(project.bumpInStart).toISOString().slice(0, 10),
      bumpInEnd: new Date(project.bumpInEnd).toISOString().slice(0, 10),
      liveStart: new Date(project.liveStart).toISOString().slice(0, 10),
      liveEnd: new Date(project.liveEnd).toISOString().slice(0, 10),
      bumpOutStart: new Date(project.bumpOutStart).toISOString().slice(0, 10),
      bumpOutEnd: new Date(project.bumpOutEnd).toISOString().slice(0, 10),
      accessGroups: Array.isArray(project.accessGroups) ? project.accessGroups : [],
      newAccessGroup: '',
    });
    setIsDialogOpen(true);
  };

  const addAccessGroup = () => {
    if (formData.newAccessGroup && !formData.accessGroups.includes(formData.newAccessGroup)) {
      setFormData({
        ...formData,
        accessGroups: [...formData.accessGroups, formData.newAccessGroup],
        newAccessGroup: '',
      });
    }
  };

  const removeAccessGroup = (group: string) => {
    setFormData({
      ...formData,
      accessGroups: formData.accessGroups.filter((g) => g !== group),
    });
  };

  const isProjectCompleted = (bumpOutEnd: string) => {
    const endDate = new Date(bumpOutEnd);
    const now = new Date();
    return now > endDate;
  };

  const getProjectStatus = (bumpOutEnd: string) => {
    return isProjectCompleted(bumpOutEnd) ? 'Completed' : 'Active';
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
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Accreditation Projects</h1>
              <p className="text-gray-600 mt-1">View and manage event accreditation projects</p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No accreditation projects</h3>
                <p className="text-gray-600 mb-4">Get started by creating your first accreditation project</p>
                <Button onClick={() => setIsDialogOpen(true)} className="bg-slate-700 hover:bg-slate-800 text-white shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map((project) => {
                const isCompleted = isProjectCompleted(project.bumpOutEnd);
                const status = getProjectStatus(project.bumpOutEnd);

                return (
                  <Card key={project.id} className={`bg-white border-gray-200 shadow-sm hover:shadow-md transition-all ${isCompleted ? 'opacity-75' : ''}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className={`text-lg ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>
                            {project.name}
                          </CardTitle>
                          <CardDescription className="text-sm text-gray-600">Code: {project.code}</CardDescription>
                        </div>
                        <Badge
                          variant="outline"
                          className={isCompleted ? 'bg-gray-100 text-gray-600 border-gray-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}
                        >
                          {status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bump-In:</span>
                          <span className="font-medium text-gray-900">
                            {formatDate(project.bumpInStart)} - {formatDate(project.bumpInEnd)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Live:</span>
                          <span className="font-medium text-gray-900">
                            {formatDate(project.liveStart)} - {formatDate(project.liveEnd)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bump-Out:</span>
                          <span className="font-medium text-gray-900">
                            {formatDate(project.bumpOutStart)} - {formatDate(project.bumpOutEnd)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 mb-2">Access Groups:</p>
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(project.accessGroups) && project.accessGroups.map((group) => (
                            <Badge key={group} variant="outline" className="text-xs text-gray-700 border-gray-300">
                              {group}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-gray-600">
                            {project._count.accreditations} accreditation record{project._count.accreditations !== 1 ? 's' : ''}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProject(project)}
                            className="text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                        <Button
                          onClick={() => router.push(`/admin/accreditation/projects/${project.id}`)}
                          className="w-full bg-slate-700 hover:bg-slate-800 text-white shadow-sm"
                        >
                          Open Project
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Create/Edit Project Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              resetForm();
            }
          }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit Accreditation Project' : 'Create Accreditation Project'}</DialogTitle>
              <DialogDescription>
                {isEditMode ? 'Update phase dates and access groups for event accreditation' : 'Set up phase dates and access groups for event accreditation'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Qatar World Cup 2025"
                    required
                    disabled={isEditMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Project Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., QWC2025"
                    required
                    maxLength={20}
                    disabled={isEditMode}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Phase Dates</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bumpInStart">Bump-In Start *</Label>
                    <Input
                      id="bumpInStart"
                      type="date"
                      value={formData.bumpInStart}
                      onChange={(e) => setFormData({ ...formData, bumpInStart: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bumpInEnd">Bump-In End *</Label>
                    <Input
                      id="bumpInEnd"
                      type="date"
                      value={formData.bumpInEnd}
                      onChange={(e) => setFormData({ ...formData, bumpInEnd: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="liveStart">Live Start *</Label>
                    <Input
                      id="liveStart"
                      type="date"
                      value={formData.liveStart}
                      onChange={(e) => setFormData({ ...formData, liveStart: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="liveEnd">Live End *</Label>
                    <Input
                      id="liveEnd"
                      type="date"
                      value={formData.liveEnd}
                      onChange={(e) => setFormData({ ...formData, liveEnd: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bumpOutStart">Bump-Out Start *</Label>
                    <Input
                      id="bumpOutStart"
                      type="date"
                      value={formData.bumpOutStart}
                      onChange={(e) => setFormData({ ...formData, bumpOutStart: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bumpOutEnd">Bump-Out End *</Label>
                    <Input
                      id="bumpOutEnd"
                      type="date"
                      value={formData.bumpOutEnd}
                      onChange={(e) => setFormData({ ...formData, bumpOutEnd: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Access Groups</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.accessGroups.map((group) => (
                    <Badge
                      key={group}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeAccessGroup(group)}
                    >
                      {group} ×
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add access group"
                    value={formData.newAccessGroup}
                    onChange={(e) => setFormData({ ...formData, newAccessGroup: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addAccessGroup();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addAccessGroup}>
                    Add
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? (isEditMode ? 'Updating...' : 'Creating...')
                    : (isEditMode ? 'Update Project' : 'Create Project')
                  }
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
