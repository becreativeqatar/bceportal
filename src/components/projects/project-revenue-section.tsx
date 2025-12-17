'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { formatDate } from '@/lib/date-format';

interface Revenue {
  id: string;
  description: string;
  invoiceNumber: string | null;
  amount: number;
  amountQAR: number | null;
  currency: string;
  invoiceDate: string | null;
  dueDate: string | null;
  paidDate: string | null;
  status: string;
  notes: string | null;
}

interface Totals {
  total: number;
  paid: number;
  pending: number;
}

interface ProjectRevenueSectionProps {
  projectId: string;
}

const REVENUE_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'INVOICED', label: 'Invoiced' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'WRITTEN_OFF', label: 'Written Off' },
];

export function ProjectRevenueSection({ projectId }: ProjectRevenueSectionProps) {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [totals, setTotals] = useState<Totals>({ total: 0, paid: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddRevenue, setShowAddRevenue] = useState(false);

  // Form state
  const [newRevenue, setNewRevenue] = useState({
    description: '',
    invoiceNumber: '',
    amount: '',
    currency: 'QAR',
    invoiceDate: '',
    dueDate: '',
    status: 'DRAFT',
    notes: '',
  });

  useEffect(() => {
    fetchRevenues();
  }, [projectId]);

  const fetchRevenues = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/revenues`);
      if (response.ok) {
        const result = await response.json();
        setRevenues(result.data || []);
        setTotals(result.totals || { total: 0, paid: 0, pending: 0 });
      }
    } catch (error) {
      console.error('Error fetching revenues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRevenue = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/revenues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRevenue,
          amount: parseFloat(newRevenue.amount),
          invoiceNumber: newRevenue.invoiceNumber || null,
          invoiceDate: newRevenue.invoiceDate || null,
          dueDate: newRevenue.dueDate || null,
          notes: newRevenue.notes || null,
        }),
      });

      if (response.ok) {
        toast.success('Revenue added');
        setShowAddRevenue(false);
        setNewRevenue({
          description: '',
          invoiceNumber: '',
          amount: '',
          currency: 'QAR',
          invoiceDate: '',
          dueDate: '',
          status: 'DRAFT',
          notes: '',
        });
        fetchRevenues();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add revenue');
      }
    } catch (error) {
      toast.error('Error adding revenue');
    }
  };

  const handleDeleteRevenue = async (revenueId: string) => {
    if (!confirm('Are you sure you want to delete this revenue entry?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/revenues/${revenueId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Revenue deleted');
        fetchRevenues();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete revenue');
      }
    } catch (error) {
      toast.error('Error deleting revenue');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'default';
      case 'INVOICED':
        return 'secondary';
      case 'PARTIALLY_PAID':
        return 'secondary';
      case 'OVERDUE':
        return 'destructive';
      case 'CANCELLED':
      case 'WRITTEN_OFF':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">Loading revenue data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revenue Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-xl font-bold">QAR {totals.total.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-gray-600">Collected</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-xl font-bold text-green-600">QAR {totals.paid.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-gray-600">Outstanding</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-xl font-bold text-orange-600">QAR {totals.pending.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Revenue Entries</CardTitle>
            <CardDescription>Income and invoices for this project</CardDescription>
          </div>
          <Dialog open={showAddRevenue} onOpenChange={setShowAddRevenue}>
            <DialogTrigger asChild>
              <Button size="sm">+ Add Revenue</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Revenue Entry</DialogTitle>
                <DialogDescription>Record income or invoice for this project</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Input
                    value={newRevenue.description}
                    onChange={(e) => setNewRevenue({ ...newRevenue, description: e.target.value })}
                    placeholder="Description of the revenue"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Invoice Number</Label>
                    <Input
                      value={newRevenue.invoiceNumber}
                      onChange={(e) => setNewRevenue({ ...newRevenue, invoiceNumber: e.target.value })}
                      placeholder="INV-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={newRevenue.status}
                      onValueChange={(v) => setNewRevenue({ ...newRevenue, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REVENUE_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      value={newRevenue.amount}
                      onChange={(e) => setNewRevenue({ ...newRevenue, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={newRevenue.currency}
                      onValueChange={(v) => setNewRevenue({ ...newRevenue, currency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QAR">QAR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Invoice Date</Label>
                    <DatePicker
                      value={newRevenue.invoiceDate}
                      onChange={(v) => setNewRevenue({ ...newRevenue, invoiceDate: v })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <DatePicker
                      value={newRevenue.dueDate}
                      onChange={(v) => setNewRevenue({ ...newRevenue, dueDate: v })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <textarea
                    value={newRevenue.notes}
                    onChange={(e) => setNewRevenue({ ...newRevenue, notes: e.target.value })}
                    className="w-full min-h-[60px] px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddRevenue(false)}>Cancel</Button>
                <Button onClick={handleAddRevenue}>Add Revenue</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {revenues.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No revenue entries yet</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenues.map((revenue) => (
                    <TableRow key={revenue.id}>
                      <TableCell>{revenue.description}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {revenue.invoiceNumber || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {revenue.currency} {Number(revenue.amount).toLocaleString()}
                        {revenue.currency !== 'QAR' && revenue.amountQAR && (
                          <div className="text-xs text-gray-500">
                            ≈ QAR {Number(revenue.amountQAR).toLocaleString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(revenue.invoiceDate, '-')}</TableCell>
                      <TableCell>{formatDate(revenue.dueDate, '-')}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(revenue.status)}>
                          {revenue.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteRevenue(revenue.id)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
