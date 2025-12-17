'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScanHistory } from '@/components/accreditation/scan-history';
import { ArrowLeft } from 'lucide-react';

export default function AccreditationScansPage() {
  const router = useRouter();
  const [validityFilter, setValidityFilter] = useState<string>('all');

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Scan Logs</h1>
          <p className="text-gray-600 mt-1">
            View all QR code scans across all accreditations
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <Select value={validityFilter} onValueChange={setValidityFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by validity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scans</SelectItem>
              <SelectItem value="true">Valid Only</SelectItem>
              <SelectItem value="false">Invalid Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Scan History Component */}
        <ScanHistory
          title="All Scan Logs"
          showAccreditation={true}
        />
      </div>
    </div>
  );
}
