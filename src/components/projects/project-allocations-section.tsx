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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface AssetAllocation {
  id: string;
  costType: string;
  customAmount: number | null;
  asset: {
    id: string;
    name: string;
    assetTag: string;
    status: string;
    priceQAR: number | null;
    category: string | null;
  };
}

interface SubscriptionAllocation {
  id: string;
  allocationPercent: number | null;
  subscription: {
    id: string;
    name: string;
    status: string;
    costQAR: number | null;
    billingCycle: string;
  };
}

interface Asset {
  id: string;
  name: string;
  assetTag: string;
}

interface Subscription {
  id: string;
  name: string;
}

interface ProjectAllocationsSectionProps {
  projectId: string;
}

const COST_TYPES = [
  { value: 'FULL_VALUE', label: 'Full Value' },
  { value: 'DEPRECIATED', label: 'Depreciated Value' },
  { value: 'RENTAL_RATE', label: 'Rental Rate' },
  { value: 'CUSTOM', label: 'Custom Amount' },
  { value: 'NO_COST', label: 'No Cost' },
];

export function ProjectAllocationsSection({ projectId }: ProjectAllocationsSectionProps) {
  const [assetAllocations, setAssetAllocations] = useState<AssetAllocation[]>([]);
  const [subscriptionAllocations, setSubscriptionAllocations] = useState<SubscriptionAllocation[]>([]);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [availableSubscriptions, setAvailableSubscriptions] = useState<Subscription[]>([]);
  const [totalAssetCost, setTotalAssetCost] = useState(0);
  const [totalSubCost, setTotalSubCost] = useState(0);
  const [loading, setLoading] = useState(true);

  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);

  const [newAsset, setNewAsset] = useState({ assetId: '', costType: 'FULL_VALUE', customAmount: '' });
  const [newSub, setNewSub] = useState({ subscriptionId: '', allocationPercent: '100' });

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assetsRes, subsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/assets`),
        fetch(`/api/projects/${projectId}/subscriptions`),
      ]);

      if (assetsRes.ok) {
        const result = await assetsRes.json();
        setAssetAllocations(result.data || []);
        setTotalAssetCost(result.totalCost || 0);
      }

      if (subsRes.ok) {
        const result = await subsRes.json();
        setSubscriptionAllocations(result.data || []);
        setTotalSubCost(result.totalAllocatedCost || 0);
      }
    } catch (error) {
      console.error('Error fetching allocations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableAssets = async () => {
    try {
      const response = await fetch('/api/assets?status=IN_USE&pageSize=100');
      if (response.ok) {
        const result = await response.json();
        setAvailableAssets(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const fetchAvailableSubscriptions = async () => {
    try {
      const response = await fetch('/api/subscriptions?status=ACTIVE&pageSize=100');
      if (response.ok) {
        const result = await response.json();
        setAvailableSubscriptions(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  };

  const handleAddAsset = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: newAsset.assetId,
          costType: newAsset.costType,
          customAmount: newAsset.costType === 'CUSTOM' ? parseFloat(newAsset.customAmount) : null,
        }),
      });

      if (response.ok) {
        toast.success('Asset allocated');
        setShowAddAsset(false);
        setNewAsset({ assetId: '', costType: 'FULL_VALUE', customAmount: '' });
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to allocate asset');
      }
    } catch (error) {
      toast.error('Error allocating asset');
    }
  };

  const handleRemoveAsset = async (allocationId: string) => {
    if (!confirm('Remove this asset from the project?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/assets/${allocationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Asset removed');
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove asset');
      }
    } catch (error) {
      toast.error('Error removing asset');
    }
  };

  const handleAddSubscription = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: newSub.subscriptionId,
          allocationPercent: parseFloat(newSub.allocationPercent),
        }),
      });

      if (response.ok) {
        toast.success('Subscription allocated');
        setShowAddSub(false);
        setNewSub({ subscriptionId: '', allocationPercent: '100' });
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to allocate subscription');
      }
    } catch (error) {
      toast.error('Error allocating subscription');
    }
  };

  const handleRemoveSubscription = async (allocationId: string) => {
    if (!confirm('Remove this subscription from the project?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/subscriptions/${allocationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Subscription removed');
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove subscription');
      }
    } catch (error) {
      toast.error('Error removing subscription');
    }
  };

  const getAssetCost = (alloc: AssetAllocation) => {
    if (alloc.costType === 'NO_COST') return 0;
    if (alloc.costType === 'CUSTOM') return alloc.customAmount || 0;
    return alloc.asset.priceQAR || 0;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">Loading allocations...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-gray-600">Total Asset Cost</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-xl font-bold">QAR {totalAssetCost.toLocaleString()}</div>
            <p className="text-xs text-gray-500">{assetAllocations.length} assets allocated</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-gray-600">Subscription Cost</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-xl font-bold">QAR {totalSubCost.toLocaleString()}</div>
            <p className="text-xs text-gray-500">{subscriptionAllocations.length} subscriptions</p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Allocations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Allocated Assets</CardTitle>
            <CardDescription>Hardware and equipment assigned to this project</CardDescription>
          </div>
          <Dialog open={showAddAsset} onOpenChange={(open) => {
            setShowAddAsset(open);
            if (open) fetchAvailableAssets();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">+ Allocate Asset</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Allocate Asset</DialogTitle>
                <DialogDescription>Add an asset to this project</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Asset</Label>
                  <Select
                    value={newAsset.assetId}
                    onValueChange={(v) => setNewAsset({ ...newAsset, assetId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an asset..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAssets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.assetTag} - {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cost Type</Label>
                  <Select
                    value={newAsset.costType}
                    onValueChange={(v) => setNewAsset({ ...newAsset, costType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COST_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {newAsset.costType === 'CUSTOM' && (
                  <div className="space-y-2">
                    <Label>Custom Amount (QAR)</Label>
                    <Input
                      type="number"
                      value={newAsset.customAmount}
                      onChange={(e) => setNewAsset({ ...newAsset, customAmount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddAsset(false)}>Cancel</Button>
                <Button onClick={handleAddAsset}>Allocate</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {assetAllocations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No assets allocated</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Tag</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Cost Type</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assetAllocations.map((alloc) => (
                    <TableRow key={alloc.id}>
                      <TableCell className="font-mono">{alloc.asset.assetTag}</TableCell>
                      <TableCell>{alloc.asset.name}</TableCell>
                      <TableCell>{alloc.asset.category || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{alloc.costType.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        QAR {getAssetCost(alloc).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleRemoveAsset(alloc.id)}
                        >
                          Remove
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

      {/* Subscription Allocations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Allocated Subscriptions</CardTitle>
            <CardDescription>Software and services assigned to this project</CardDescription>
          </div>
          <Dialog open={showAddSub} onOpenChange={(open) => {
            setShowAddSub(open);
            if (open) fetchAvailableSubscriptions();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">+ Allocate Subscription</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Allocate Subscription</DialogTitle>
                <DialogDescription>Add a subscription to this project</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Subscription</Label>
                  <Select
                    value={newSub.subscriptionId}
                    onValueChange={(v) => setNewSub({ ...newSub, subscriptionId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a subscription..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubscriptions.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Allocation Percentage</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={newSub.allocationPercent}
                    onChange={(e) => setNewSub({ ...newSub, allocationPercent: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">
                    Percentage of subscription cost to allocate to this project
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddSub(false)}>Cancel</Button>
                <Button onClick={handleAddSubscription}>Allocate</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {subscriptionAllocations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No subscriptions allocated</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead className="text-right">Full Cost</TableHead>
                    <TableHead className="text-right">Allocation %</TableHead>
                    <TableHead className="text-right">Allocated Cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptionAllocations.map((alloc) => {
                    const fullCost = alloc.subscription.costQAR || 0;
                    const percent = alloc.allocationPercent || 100;
                    const allocatedCost = (fullCost * percent) / 100;
                    return (
                      <TableRow key={alloc.id}>
                        <TableCell>{alloc.subscription.name}</TableCell>
                        <TableCell>{alloc.subscription.billingCycle}</TableCell>
                        <TableCell className="text-right">
                          QAR {Number(fullCost).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">{percent}%</TableCell>
                        <TableCell className="text-right">
                          QAR {allocatedCost.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleRemoveSubscription(alloc.id)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
