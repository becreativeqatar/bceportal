import { Suspense } from 'react';
import ProjectRecordsClient from './client';

export default async function ProjectRecordsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;

  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="p-8 text-gray-500">Loading records...</div>}>
        <ProjectRecordsClient projectId={projectId} />
      </Suspense>
    </div>
  );
}
