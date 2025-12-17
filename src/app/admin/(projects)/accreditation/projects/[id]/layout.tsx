'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

interface ProjectData {
  name: string;
  code: string;
  bumpInStart: string | null;
  bumpInEnd: string | null;
  liveStart: string | null;
  liveEnd: string | null;
  bumpOutStart: string | null;
  bumpOutEnd: string | null;
  isActive: boolean;
}

export default function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [projectId, setProjectId] = useState<string>('');
  const [project, setProject] = useState<ProjectData | null>(null);

  useEffect(() => {
    params.then(({ id }) => {
      setProjectId(id);
      fetchProject(id);
    });
  }, [params]);

  const fetchProject = async (id: string) => {
    try {
      const response = await fetch(`/api/accreditation/projects/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.accreditationProject);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Determine back button label and destination based on current path
  const getBackButton = () => {
    if (!pathname || !projectId) return null;

    // From project overview → Back to Projects (listing)
    if (pathname === `/admin/accreditation/projects/${projectId}`) {
      return {
        label: 'Back to Projects',
        href: '/admin/accreditation/projects',
      };
    }

    // From records/new or records/import → Back to Records
    if (pathname.includes('/records/new') || pathname.includes('/records/import')) {
      return {
        label: 'Back to Records',
        href: `/admin/accreditation/projects/${projectId}/records`,
      };
    }

    // From records listing, approvals, or reports → Back to Project
    if (pathname.includes('/records') || pathname.includes('/approvals') || pathname.includes('/reports')) {
      return {
        label: 'Back to Project',
        href: `/admin/accreditation/projects/${projectId}`,
      };
    }

    // Default fallback
    return {
      label: 'Back to Projects',
      href: '/admin/accreditation/projects',
    };
  };

  const backButton = getBackButton();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {!projectId ? (
            <div className="p-8">Loading...</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-semibold text-gray-900">
                    {project?.name || 'Loading...'}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Code: {project?.code || 'N/A'} • {formatDate(project?.liveStart || null)} - {formatDate(project?.liveEnd || null)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {pathname?.endsWith('/records') && projectId && (
                    <Link href={`/admin/accreditation/projects/${projectId}/records/new`}>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        New Record
                      </Button>
                    </Link>
                  )}
                  {backButton && (
                    <Link href={backButton.href}>
                      <Button variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {backButton.label}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {children}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
