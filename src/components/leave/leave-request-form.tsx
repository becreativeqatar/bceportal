'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createLeaveRequestSchema } from '@/lib/validations/leave';
import { useState, useEffect } from 'react';
import { calculateWorkingDays, formatLeaveDays } from '@/lib/leave-utils';
import { LeaveRequestType } from '@prisma/client';

// Define form data type that matches form structure
interface FormData {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  requestType: LeaveRequestType;
  reason?: string | null;
  documentUrl?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
}

interface LeaveType {
  id: string;
  name: string;
  color: string;
  requiresDocument: boolean;
  minNoticeDays: number;
  maxConsecutiveDays?: number | null;
}

interface LeaveRequestFormProps {
  leaveTypes: LeaveType[];
  onSuccess?: () => void;
}

export function LeaveRequestForm({ leaveTypes, onSuccess }: LeaveRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(createLeaveRequestSchema) as never,
    defaultValues: {
      leaveTypeId: '',
      startDate: '',
      endDate: '',
      requestType: 'FULL_DAY',
      reason: '',
      documentUrl: null,
      emergencyContact: '',
      emergencyPhone: '',
    },
  });

  const watchStartDate = form.watch('startDate');
  const watchEndDate = form.watch('endDate');
  const watchRequestType = form.watch('requestType');
  const watchLeaveTypeId = form.watch('leaveTypeId');

  // Update selected leave type when it changes
  useEffect(() => {
    const leaveType = leaveTypes.find((lt) => lt.id === watchLeaveTypeId);
    setSelectedLeaveType(leaveType || null);
  }, [watchLeaveTypeId, leaveTypes]);

  // Calculate working days when dates change
  useEffect(() => {
    if (watchStartDate && watchEndDate) {
      const start = new Date(watchStartDate);
      const end = new Date(watchEndDate);
      if (start <= end) {
        const days = calculateWorkingDays(start, end, watchRequestType as LeaveRequestType);
        setCalculatedDays(days);
      } else {
        setCalculatedDays(null);
      }
    } else {
      setCalculatedDays(null);
    }
  }, [watchStartDate, watchEndDate, watchRequestType]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/leave/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit leave request');
      }

      form.reset();
      setCalculatedDays(null);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="leaveTypeId">Leave Type *</Label>
        <Select
          value={form.watch('leaveTypeId')}
          onValueChange={(value) => form.setValue('leaveTypeId', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select leave type" />
          </SelectTrigger>
          <SelectContent>
            {leaveTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  {type.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.leaveTypeId && (
          <p className="text-sm text-red-500">{form.formState.errors.leaveTypeId.message}</p>
        )}
      </div>

      {selectedLeaveType && (
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md space-y-1">
          {selectedLeaveType.minNoticeDays > 0 && (
            <p>Requires at least {selectedLeaveType.minNoticeDays} days advance notice</p>
          )}
          {selectedLeaveType.maxConsecutiveDays && (
            <p>Maximum {selectedLeaveType.maxConsecutiveDays} consecutive days</p>
          )}
          {selectedLeaveType.requiresDocument && (
            <p className="text-amber-600">Supporting document required</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="requestType">Request Type</Label>
        <Select
          value={form.watch('requestType') || 'FULL_DAY'}
          onValueChange={(value) => form.setValue('requestType', value as LeaveRequestType)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select request type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FULL_DAY">Full Day</SelectItem>
            <SelectItem value="HALF_DAY_AM">Half Day (AM)</SelectItem>
            <SelectItem value="HALF_DAY_PM">Half Day (PM)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            type="date"
            {...form.register('startDate')}
          />
          {form.formState.errors.startDate && (
            <p className="text-sm text-red-500">{form.formState.errors.startDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date *</Label>
          <Input
            id="endDate"
            type="date"
            {...form.register('endDate')}
          />
          {form.formState.errors.endDate && (
            <p className="text-sm text-red-500">{form.formState.errors.endDate.message}</p>
          )}
        </div>
      </div>

      {calculatedDays !== null && (
        <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-center">
          <span className="font-semibold">Duration: {formatLeaveDays(calculatedDays)}</span>
          <span className="text-sm text-blue-600 ml-2">(excluding weekends)</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="reason">Reason</Label>
        <Textarea
          id="reason"
          placeholder="Optional reason for leave"
          {...form.register('reason')}
        />
      </div>

      {selectedLeaveType?.requiresDocument && (
        <div className="space-y-2">
          <Label htmlFor="documentUrl">Supporting Document URL *</Label>
          <Input
            id="documentUrl"
            type="url"
            placeholder="https://..."
            {...form.register('documentUrl')}
          />
          {form.formState.errors.documentUrl && (
            <p className="text-sm text-red-500">{form.formState.errors.documentUrl.message}</p>
          )}
        </div>
      )}

      <div className="border-t pt-4 mt-4">
        <h3 className="text-sm font-medium mb-3">Emergency Contact (Optional)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="emergencyContact">Contact Name</Label>
            <Input
              id="emergencyContact"
              placeholder="Name"
              {...form.register('emergencyContact')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyPhone">Phone Number</Label>
            <Input
              id="emergencyPhone"
              placeholder="+974..."
              {...form.register('emergencyPhone')}
            />
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
      </Button>
    </form>
  );
}
