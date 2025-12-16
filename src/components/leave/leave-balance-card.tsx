'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { calculateRemainingBalance } from '@/lib/leave-utils';

interface LeaveBalance {
  id: string;
  userId: string;
  leaveTypeId: string;
  year: number;
  entitlement: number | string;
  used: number | string;
  pending: number | string;
  carriedForward: number | string;
  adjustment: number | string;
  leaveType: {
    id: string;
    name: string;
    color: string;
    isPaid?: boolean;
  };
}

interface LeaveBalanceCardProps {
  balance: LeaveBalance;
  showDetails?: boolean;
}

export function LeaveBalanceCard({ balance, showDetails = true }: LeaveBalanceCardProps) {
  const entitlement = Number(balance.entitlement);
  const used = Number(balance.used);
  const pending = Number(balance.pending);
  const carriedForward = Number(balance.carriedForward);
  const adjustment = Number(balance.adjustment);

  const totalAvailable = entitlement + carriedForward + adjustment;
  const remaining = calculateRemainingBalance(entitlement, used, pending, carriedForward, adjustment);
  const usedPercentage = totalAvailable > 0 ? ((used + pending) / totalAvailable) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: balance.leaveType.color }}
          />
          <CardTitle className="text-base">{balance.leaveType.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-3xl font-bold">{remaining.toFixed(1)}</span>
              <span className="text-gray-500 text-sm ml-1">/ {totalAvailable}</span>
            </div>
            <span className="text-sm text-gray-500">days remaining</span>
          </div>

          <Progress value={usedPercentage} className="h-2" />

          {showDetails && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Entitlement</span>
                <span className="font-medium">{entitlement}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Used</span>
                <span className="font-medium text-red-600">{used}</span>
              </div>
              {carriedForward > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Carried Forward</span>
                  <span className="font-medium text-blue-600">+{carriedForward}</span>
                </div>
              )}
              {adjustment !== 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Adjustment</span>
                  <span className={`font-medium ${adjustment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {adjustment >= 0 ? '+' : ''}{adjustment}
                  </span>
                </div>
              )}
              {pending > 0 && (
                <div className="flex justify-between col-span-2">
                  <span className="text-gray-500">Pending</span>
                  <span className="font-medium text-amber-600">{pending}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
