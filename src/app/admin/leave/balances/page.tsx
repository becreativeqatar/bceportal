'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdjustBalanceDialog } from '@/components/leave/adjust-balance-dialog';
import { Search, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
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
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  leaveType: {
    id: string;
    name: string;
    color: string;
    isPaid?: boolean;
  };
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface LeaveType {
  id: string;
  name: string;
  color: string;
  defaultDays: number;
}

export default function AdminLeaveBalancesPage() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const currentYear = new Date().getFullYear();
  const [yearFilter, setYearFilter] = useState(currentYear.toString());
  const [userFilter, setUserFilter] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');

  // Initialize dialog state
  const [initDialogOpen, setInitDialogOpen] = useState(false);
  const [initUserId, setInitUserId] = useState('');
  const [initLeaveTypeId, setInitLeaveTypeId] = useState('');
  const [initEntitlement, setInitEntitlement] = useState('');
  const [initSubmitting, setInitSubmitting] = useState(false);

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('p', pagination.page.toString());
      params.set('ps', pagination.pageSize.toString());
      params.set('year', yearFilter);

      if (userFilter) params.set('userId', userFilter);
      if (leaveTypeFilter) params.set('leaveTypeId', leaveTypeFilter);

      const response = await fetch(`/api/leave/balances?${params}`);
      if (response.ok) {
        const data = await response.json();
        setBalances(data.balances);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, yearFilter, userFilter, leaveTypeFilter]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?ps=1000');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const response = await fetch('/api/leave/types');
      if (response.ok) {
        const data = await response.json();
        setLeaveTypes(data.leaveTypes || []);
      }
    } catch (error) {
      console.error('Failed to fetch leave types:', error);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  useEffect(() => {
    fetchUsers();
    fetchLeaveTypes();
  }, []);

  const handleInitializeBalance = async () => {
    if (!initUserId || !initLeaveTypeId) {
      alert('Please select a user and leave type');
      return;
    }

    setInitSubmitting(true);
    try {
      const response = await fetch('/api/leave/balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: initUserId,
          leaveTypeId: initLeaveTypeId,
          year: parseInt(yearFilter),
          entitlement: initEntitlement ? parseFloat(initEntitlement) : undefined,
        }),
      });

      if (response.ok) {
        setInitDialogOpen(false);
        setInitUserId('');
        setInitLeaveTypeId('');
        setInitEntitlement('');
        fetchBalances();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to initialize balance');
      }
    } catch (error) {
      console.error('Failed to initialize balance:', error);
      alert('An error occurred');
    } finally {
      setInitSubmitting(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Leave Balances</h1>
              <p className="text-gray-600">
                View and manage employee leave balances
              </p>
            </div>
            <Button onClick={() => setInitDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Initialize Balance
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Balances</CardTitle>
            <CardDescription>
              Filter and manage leave balances for all employees
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v); setPagination(p => ({ ...p, page: 1 })); }}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={userFilter} onValueChange={(v) => { setUserFilter(v === 'all' ? '' : v); setPagination(p => ({ ...p, page: 1 })); }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={leaveTypeFilter} onValueChange={(v) => { setLeaveTypeFilter(v === 'all' ? '' : v); setPagination(p => ({ ...p, page: 1 })); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Leave Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leave Types</SelectItem>
                  {leaveTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: type.color }} />
                        {type.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead className="text-right">Entitlement</TableHead>
                    <TableHead className="text-right">Carried Forward</TableHead>
                    <TableHead className="text-right">Adjustment</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : balances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        No balances found
                      </TableCell>
                    </TableRow>
                  ) : (
                    balances.map((balance) => {
                      const remaining = calculateRemainingBalance(
                        balance.entitlement,
                        balance.used,
                        balance.pending,
                        balance.carriedForward,
                        balance.adjustment
                      );

                      return (
                        <TableRow key={balance.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{balance.user.name || 'N/A'}</div>
                              <div className="text-xs text-gray-500">{balance.user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: balance.leaveType.color }}
                              />
                              {balance.leaveType.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{Number(balance.entitlement)}</TableCell>
                          <TableCell className="text-right text-blue-600">
                            {Number(balance.carriedForward) > 0 ? `+${Number(balance.carriedForward)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {Number(balance.adjustment) !== 0 ? (
                              <span className={Number(balance.adjustment) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {Number(balance.adjustment) >= 0 ? '+' : ''}{Number(balance.adjustment)}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-red-600">{Number(balance.used)}</TableCell>
                          <TableCell className="text-right text-amber-600">{Number(balance.pending)}</TableCell>
                          <TableCell className="text-right font-semibold">{remaining.toFixed(1)}</TableCell>
                          <TableCell className="text-right">
                            <AdjustBalanceDialog
                              balanceId={balance.id}
                              userName={balance.user.name || balance.user.email}
                              leaveTypeName={balance.leaveType.name}
                              currentBalance={remaining}
                              onAdjusted={fetchBalances}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
                  {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Initialize Balance Dialog */}
        {initDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Initialize Leave Balance</CardTitle>
                <CardDescription>Create a new balance for an employee</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Employee *</label>
                  <Select value={initUserId} onValueChange={setInitUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Leave Type *</label>
                  <Select value={initLeaveTypeId} onValueChange={setInitLeaveTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: type.color }} />
                            {type.name} ({type.defaultDays} days default)
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Year</label>
                  <Input value={yearFilter} disabled />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Entitlement (Optional)</label>
                  <Input
                    type="number"
                    placeholder="Leave blank to use default"
                    value={initEntitlement}
                    onChange={(e) => setInitEntitlement(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    If not specified, the default entitlement for the leave type will be used.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setInitDialogOpen(false)}
                    disabled={initSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleInitializeBalance}
                    disabled={initSubmitting}
                  >
                    {initSubmitting ? 'Creating...' : 'Create Balance'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
