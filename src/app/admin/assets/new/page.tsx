'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { toInputDateString } from '@/lib/date-format';
import { createAssetSchema, type CreateAssetRequest } from '@/lib/validations/assets';
import { AssetStatus, AcquisitionType } from '@prisma/client';

// USD to QAR exchange rate (typically around 3.64)
const USD_TO_QAR_RATE = 3.64;

export default function NewAssetPage() {
  const router = useRouter();
  const [assetTypeSuggestions, setAssetTypeSuggestions] = useState<string[]>([]);
  const [showTypeSuggestions, setShowTypeSuggestions] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    getValues,
  } = useForm({
    resolver: zodResolver(createAssetSchema),
    defaultValues: {
      assetTag: '',
      type: '',
      category: '',
      brand: '',
      model: '',
      serial: '',
      configuration: '',
      purchaseDate: '',
      warrantyExpiry: '',
      supplier: '',
      invoiceNumber: '',
      price: null,
      priceCurrency: 'QAR',
      priceQAR: null,
      status: AssetStatus.IN_USE,
      acquisitionType: AcquisitionType.NEW_PURCHASE,
      transferNotes: '',
      assignedUserId: '',
      assignmentDate: '',
      notes: '',
      location: '',
    },
    mode: 'onChange',
  });

  // Watch critical fields for side effects
  const watchedType = watch('type');
  const watchedLocation = watch('location');
  const watchedPrice = watch('price');
  const watchedCurrency = watch('priceCurrency');
  const watchedPurchaseDate = watch('purchaseDate');
  const watchedWarrantyExpiry = watch('warrantyExpiry');
  const watchedStatus = watch('status');
  const watchedAcquisitionType = watch('acquisitionType');
  const watchedAssignedUserId = watch('assignedUserId');

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch asset type suggestions
  useEffect(() => {
    if (watchedType && watchedType.length > 0) {
      fetchAssetTypes(watchedType);
    } else {
      setAssetTypeSuggestions([]);
    }
  }, [watchedType]);

  // Fetch location suggestions
  useEffect(() => {
    if (watchedLocation && watchedLocation.length > 0) {
      fetchLocations(watchedLocation);
    } else {
      setLocationSuggestions([]);
    }
  }, [watchedLocation]);

  // Auto-calculate currency conversion
  useEffect(() => {
    if (watchedPrice && watchedCurrency) {
      if (watchedCurrency === 'QAR') {
        // QAR is base currency, no conversion needed
        setValue('priceQAR', null);
      } else if (watchedCurrency === 'USD') {
        // Convert USD to QAR
        const qarValue = watchedPrice * USD_TO_QAR_RATE;
        setValue('priceQAR', qarValue);
      }
    }
  }, [watchedPrice, watchedCurrency, setValue]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAssetTypes = async (query: string) => {
    try {
      const response = await fetch(`/api/assets/types?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setAssetTypeSuggestions(data.types || []);
      }
    } catch (error) {
      console.error('Error fetching asset types:', error);
    }
  };

  const fetchLocations = async (query: string) => {
    try {
      const response = await fetch(`/api/assets/locations?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setLocationSuggestions(data.locations || []);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  // Auto-fill warranty expiry when purchase date changes
  useEffect(() => {
    if (watchedPurchaseDate && !watchedWarrantyExpiry) {
      const purchaseDate = new Date(watchedPurchaseDate);
      const warrantyDate = new Date(purchaseDate);
      warrantyDate.setFullYear(warrantyDate.getFullYear() + 1);
      setValue('warrantyExpiry', toInputDateString(warrantyDate));
    }
  }, [watchedPurchaseDate, watchedWarrantyExpiry, setValue]);

  // Clear assignment when status is SPARE
  useEffect(() => {
    if (watchedStatus === AssetStatus.SPARE && watchedAssignedUserId) {
      setValue('assignedUserId', '');
      setValue('assignmentDate', '');
    }
  }, [watchedStatus, watchedAssignedUserId, setValue]);

  const onSubmit = async (data: CreateAssetRequest) => {
    try {
      // Calculate price in QAR based on currency
      let price = data.price;
      let priceInQAR = null;

      if (price) {
        if (data.priceCurrency === 'QAR') {
          priceInQAR = price;
        } else if (data.priceCurrency === 'USD') {
          priceInQAR = price * USD_TO_QAR_RATE;
        }
      }

      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          price: price,
          priceQAR: priceInQAR,
          assetTag: data.assetTag || null,
          assignmentDate: data.assignedUserId ? data.assignmentDate : null,
        }),
      });

      if (response.ok) {
        router.push('/admin/assets');
      } else {
        const errorData = await response.json();
        toast.error(`Failed to create asset: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating asset:', error);
      toast.error('Error creating asset. Please try again.');
    }
  };

  const handleUserAssignment = (userId: string) => {
    if (userId) {
      // When assigning to a user, set assignment date to today and status to IN_USE
      setValue('assignedUserId', userId);
      setValue('assignmentDate', toInputDateString(new Date()));
      setValue('status', AssetStatus.IN_USE);
    } else {
      // When unassigning, clear both user and assignment date, set status to SPARE
      setValue('assignedUserId', '');
      setValue('assignmentDate', '');
      setValue('status', AssetStatus.SPARE);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Add New Asset</h1>
          <p className="text-gray-600">
            Create a new digital asset or hardware item
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Asset Details</CardTitle>
            <CardDescription>
              Enter the details for the new asset
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">1. Basic Information</h3>
                <p className="text-xs text-gray-600">What is this asset?</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 relative">
                    <Label htmlFor="type">Asset Type *</Label>
                    <Input
                      id="type"
                      {...register('type')}
                      onFocus={() => setShowTypeSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowTypeSuggestions(false), 200)}
                      placeholder="Laptop, Mouse, Monitor, etc."
                      autoComplete="off"
                      className={errors.type ? 'border-red-500' : ''}
                    />
                    {errors.type && (
                      <p className="text-sm text-red-500">{errors.type.message}</p>
                    )}
                    {showTypeSuggestions && assetTypeSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto">
                        {assetTypeSuggestions.map((type, index) => (
                          <div
                            key={index}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              setValue('type', type);
                              setShowTypeSuggestions(false);
                            }}
                          >
                            {type}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category / Department</Label>
                    <Input
                      id="category"
                      {...register('category')}
                      placeholder="IT, Marketing, Engineering, etc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand / Manufacturer</Label>
                    <Input
                      id="brand"
                      {...register('brand')}
                      placeholder="Apple, Dell, HP, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model / Version *</Label>
                    <Input
                      id="model"
                      {...register('model')}
                      placeholder="MacBook Pro 16, Dell XPS 15, etc."
                      className={errors.model ? 'border-red-500' : ''}
                    />
                    {errors.model && (
                      <p className="text-sm text-red-500">{errors.model.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serial">Serial Number</Label>
                  <Input
                    id="serial"
                    {...register('serial')}
                    placeholder="Manufacturer's serial number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="configuration">Configuration / Specs</Label>
                  <Input
                    id="configuration"
                    {...register('configuration')}
                    placeholder="16GB RAM, 512GB SSD, Intel i7, etc."
                  />
                </div>
              </div>

              {/* Acquisition Details Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">2. Acquisition Details</h3>
                <p className="text-xs text-gray-600">How did we acquire this asset?</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="acquisitionType">Acquisition Type *</Label>
                    <Select
                      value={watchedAcquisitionType || ''}
                      onValueChange={(value) => setValue('acquisitionType', value as AcquisitionType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW_PURCHASE">New Purchase</SelectItem>
                        <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assetTag">Asset ID / Tag</Label>
                    <Input
                      id="assetTag"
                      {...register('assetTag')}
                      placeholder="Auto-generated if empty"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to auto-generate (e.g., LAP-2024-001)
                    </p>
                  </div>
                </div>

                {watchedAcquisitionType === 'TRANSFERRED' && (
                  <div className="space-y-2">
                    <Label htmlFor="transferNotes">Transfer Notes *</Label>
                    <textarea
                      id="transferNotes"
                      {...register('transferNotes')}
                      placeholder="E.g., From previous company, Personal laptop donated by boss, etc."
                      className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500">
                      Provide details about where this asset came from
                    </p>
                  </div>
                )}
              </div>

              {/* Financial Information Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">3. Financial Information</h3>
                <p className="text-xs text-gray-600">Procurement and cost details</p>

                {watchedAcquisitionType !== 'TRANSFERRED' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="purchaseDate">Purchase Date</Label>
                      <DatePicker
                        id="purchaseDate"
                        value={watchedPurchaseDate || ''}
                        onChange={(value) => setValue('purchaseDate', value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Cost / Value</Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            {...register('price', { valueAsNumber: true })}
                            placeholder="0.00"
                          />
                        </div>
                        <Select
                          value={watchedCurrency || 'QAR'}
                          onValueChange={(value) => setValue('priceCurrency', value)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="QAR">QAR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {watchedPrice && watchedCurrency === 'USD' && (
                        <p className="text-xs text-muted-foreground">
                          ≈ QAR {(watchedPrice * USD_TO_QAR_RATE).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier / Vendor</Label>
                    <Input
                      id="supplier"
                      {...register('supplier')}
                      placeholder="Where purchased from"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Invoice / PO Number</Label>
                    <Input
                      id="invoiceNumber"
                      {...register('invoiceNumber')}
                      placeholder="Invoice or purchase order reference"
                    />
                  </div>
                </div>

                {watchedAcquisitionType !== 'TRANSFERRED' && (
                  <div className="space-y-2">
                    <Label htmlFor="warrantyExpiry">Warranty Expiry</Label>
                    <DatePicker
                      id="warrantyExpiry"
                      value={watchedWarrantyExpiry || ''}
                      onChange={(value) => setValue('warrantyExpiry', value)}
                    />
                  </div>
                )}
              </div>

              {/* Current Status Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">4. Current Status</h3>
                <p className="text-xs text-gray-600">Current state and usage information</p>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={watchedStatus || ''}
                    onValueChange={(value) => setValue('status', value as AssetStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN_USE">In Use</SelectItem>
                      <SelectItem value="SPARE">Spare</SelectItem>
                      <SelectItem value="REPAIR">In Repair</SelectItem>
                      <SelectItem value="DISPOSED">Disposed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assignment Section - Hidden when status is SPARE */}
              {watchedStatus !== AssetStatus.SPARE && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">5. Assignment</h3>
                  <p className="text-xs text-gray-600">Who is using this asset?</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assignedUserId">Assign to User (optional)</Label>
                      <Select
                        value={watchedAssignedUserId || "__none__"}
                        onValueChange={(value) => handleUserAssignment(value === "__none__" ? '' : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select user..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None (Unassigned)</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Location Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">6. Location</h3>
                <div className="space-y-2 relative">
                  <Label htmlFor="location">Physical Location (optional)</Label>
                  <Input
                    id="location"
                    {...register('location')}
                    onFocus={() => setShowLocationSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                    placeholder="E.g., Office 3rd Floor, Building A, Storage Room 201"
                    autoComplete="off"
                  />
                  {showLocationSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto">
                      {locationSuggestions.map((location, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                          onClick={() => {
                            setValue('location', location);
                            setShowLocationSuggestions(false);
                          }}
                        >
                          {location}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Where is this asset physically located?
                  </p>
                </div>
              </div>

              {/* Notes Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">7. Notes / Remarks</h3>
                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes (optional)</Label>
                  <textarea
                    id="notes"
                    {...register('notes')}
                    placeholder="Any additional information about this asset..."
                    className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Asset'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}