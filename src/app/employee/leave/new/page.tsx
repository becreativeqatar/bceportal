'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { LeaveRequestForm } from '@/components/leave/leave-request-form';

interface LeaveType {
  id: string;
  name: string;
  color: string;
  requiresDocument: boolean;
  minNoticeDays: number;
  maxConsecutiveDays?: number | null;
}

export default function EmployeeNewLeavePage() {
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaveTypes = async () => {
      try {
        const response = await fetch('/api/leave/types');
        if (response.ok) {
          const data = await response.json();
          setLeaveTypes(data.leaveTypes || []);
        }
      } catch (error) {
        console.error('Failed to fetch leave types:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveTypes();
  }, []);

  const handleSuccess = () => {
    router.push('/employee/leave');
    router.refresh();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/employee/leave">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Leave
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Leave</h1>
          <p className="text-gray-600">
            Submit a new leave request for approval
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Leave Request Form</CardTitle>
            <CardDescription>
              Fill in the details below. Your request will be sent to your manager for approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : leaveTypes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No leave types available. Please contact HR.
              </div>
            ) : (
              <LeaveRequestForm
                leaveTypes={leaveTypes}
                onSuccess={handleSuccess}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
