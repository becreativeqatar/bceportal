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
import { formatDate } from '@/lib/date-format';

interface BudgetCategory {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  totalBudgeted: number;
  totalActual: number;
  variance: number;
  _count: { items: number };
}

interface BudgetItem {
  id: string;
  costCode: string;
  description: string;
  budgetedAmount: number | null;
  budgetedAmountQAR: number | null;
  actualAmount: number | null;
  actualAmountQAR: number | null;
  currency: string;
  paymentStatus: string;
  status: string;
  category: { id: string; code: string; name: string } | null;
  supplier: { id: string; name: string } | null;
  payments: Array<{
    id: string;
    tranche: number;
    amount: number;
    amountQAR: number | null;
    status: string;
    dueDate: string | null;
    paidDate: string | null;
  }>;
}

interface ProjectBudgetSectionProps {
  projectId: string;
}

export function ProjectBudgetSection({ projectId }: ProjectBudgetSectionProps) {
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);

  // Form state for new category
  const [newCategory, setNewCategory] = useState({ code: '', name: '', description: '' });
  // Form state for new item
  const [newItem, setNewItem] = useState({
    costCode: '',
    description: '',
    categoryId: '__none__',
    budgetedAmount: '',
    actualAmount: '',
    currency: 'QAR',
  });

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [categoriesRes, itemsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/budget-categories`),
        fetch(`/api/projects/${projectId}/budget-items`),
      ]);

      if (categoriesRes.ok) {
        const result = await categoriesRes.json();
        setCategories(result.data || []);
      }

      if (itemsRes.ok) {
        const result = await itemsRes.json();
        setItems(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/budget-categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory),
      });

      if (response.ok) {
        toast.success('Category added');
        setShowAddCategory(false);
        setNewCategory({ code: '', name: '', description: '' });
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add category');
      }
    } catch (error) {
      toast.error('Error adding category');
    }
  };

  const handleAddItem = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/budget-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newItem,
          categoryId: newItem.categoryId === '__none__' ? null : (newItem.categoryId || null),
          budgetedAmount: newItem.budgetedAmount ? parseFloat(newItem.budgetedAmount) : null,
          actualAmount: newItem.actualAmount ? parseFloat(newItem.actualAmount) : null,
        }),
      });

      if (response.ok) {
        toast.success('Budget item added');
        setShowAddItem(false);
        setNewItem({ costCode: '', description: '', categoryId: '__none__', budgetedAmount: '', actualAmount: '', currency: 'QAR' });
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add item');
      }
    } catch (error) {
      toast.error('Error adding item');
    }
  };

  const getPaymentStatusVariant = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'default';
      case 'PARTIAL':
        return 'secondary';
      case 'PENDING':
        return 'outline';
      case 'DUE':
      case 'OVERDUE':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Calculate totals
  const totals = items.reduce(
    (acc, item) => {
      acc.budgeted += item.budgetedAmountQAR || 0;
      acc.actual += item.actualAmountQAR || 0;
      return acc;
    },
    { budgeted: 0, actual: 0 }
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">Loading budget data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Categories Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Budget Categories</CardTitle>
            <CardDescription>Organize budget items by category</CardDescription>
          </div>
          <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
            <DialogTrigger asChild>
              <Button size="sm">+ Add Category</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Budget Category</DialogTitle>
                <DialogDescription>Create a new category to organize budget items</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input
                    value={newCategory.code}
                    onChange={(e) => setNewCategory({ ...newCategory, code: e.target.value })}
                    placeholder="e.g., LABOR, EQUIPMENT"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    placeholder="Category name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    placeholder="Category description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddCategory(false)}>Cancel</Button>
                <Button onClick={handleAddCategory}>Add Category</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No categories defined</div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div key={cat.id} className="p-4 border rounded-lg">
                  <div className="font-medium">{cat.name}</div>
                  <div className="text-sm text-gray-500 font-mono">{cat.code}</div>
                  <div className="mt-2 text-sm">
                    <div className="flex justify-between">
                      <span>Budgeted:</span>
                      <span>QAR {cat.totalBudgeted.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Actual:</span>
                      <span>QAR {cat.totalActual.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Variance:</span>
                      <span className={cat.variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                        QAR {cat.variance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Budget Line Items</CardTitle>
            <CardDescription>Individual cost items and expenses</CardDescription>
          </div>
          <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
            <DialogTrigger asChild>
              <Button size="sm">+ Add Item</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Budget Item</DialogTitle>
                <DialogDescription>Add a new budget line item</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cost Code</Label>
                    <Input
                      value={newItem.costCode}
                      onChange={(e) => setNewItem({ ...newItem, costCode: e.target.value })}
                      placeholder="e.g., LAB-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={newItem.categoryId}
                      onValueChange={(v) => setNewItem({ ...newItem, categoryId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No Category</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Item description"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Budgeted Amount</Label>
                    <Input
                      type="number"
                      value={newItem.budgetedAmount}
                      onChange={(e) => setNewItem({ ...newItem, budgetedAmount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Actual Amount</Label>
                    <Input
                      type="number"
                      value={newItem.actualAmount}
                      onChange={(e) => setNewItem({ ...newItem, actualAmount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={newItem.currency}
                      onValueChange={(v) => setNewItem({ ...newItem, currency: v })}
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddItem(false)}>Cancel</Button>
                <Button onClick={handleAddItem}>Add Item</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No budget items added yet</div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Budgeted</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead>Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const budgeted = item.budgetedAmountQAR || 0;
                      const actual = item.actualAmountQAR || 0;
                      const variance = budgeted - actual;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.costCode}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.category?.name || '-'}</TableCell>
                          <TableCell className="text-right">
                            QAR {budgeted.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            QAR {actual.toLocaleString()}
                          </TableCell>
                          <TableCell className={`text-right ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            QAR {variance.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPaymentStatusVariant(item.paymentStatus)}>
                              {item.paymentStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Totals row */}
                    <TableRow className="bg-gray-50 font-medium">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right">QAR {totals.budgeted.toLocaleString()}</TableCell>
                      <TableCell className="text-right">QAR {totals.actual.toLocaleString()}</TableCell>
                      <TableCell className={`text-right ${(totals.budgeted - totals.actual) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        QAR {(totals.budgeted - totals.actual).toLocaleString()}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
