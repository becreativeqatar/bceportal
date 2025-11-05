'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { createUserSchema, type CreateUserInput } from '@/lib/validations/users';

export default function NewUserPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema) as any,
    defaultValues: {
      name: '',
      email: '',
      role: 'EMPLOYEE',
      isTemporaryStaff: false,
    },
    mode: 'onChange', // Enable real-time validation
  });

  const isTemporaryStaff = watch('isTemporaryStaff');

  const onSubmit = async (data: CreateUserInput) => {
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.details ? `${result.error}: ${result.details}` : result.error;
        throw new Error(errorMessage || 'Failed to create user');
      }

      // Redirect to users list immediately
      router.push('/admin/users');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New User</h1>
          <p className="text-gray-600">
            Add a new user to the system. They will authenticate using Azure AD or the configured provider.
          </p>
        </div>

        {error && (
          <Alert variant="error" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>
              Enter the user&apos;s details below. All fields are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  {...register('name')}
                  placeholder="John Doe"
                  maxLength={100}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
                <p className="text-sm text-gray-500">
                  The user&apos;s full name as it should appear in the system
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="john.doe@company.com"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
                <p className="text-sm text-gray-500">
                  This email must match their Azure AD or OAuth provider email
                </p>
              </div>

              {/* Temporary Staff Checkbox */}
              <div className="space-y-3 p-4 border rounded-lg bg-blue-50 border-blue-200">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="isTemporaryStaff"
                    checked={isTemporaryStaff}
                    onCheckedChange={(checked) => setValue('isTemporaryStaff', checked === true)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="isTemporaryStaff" className="cursor-pointer font-semibold text-blue-900">
                      Temporary Staff Member
                    </Label>
                    <p className="text-sm text-blue-800">
                      Check this box if this person is a temporary staff member who doesn&apos;t need login access.
                      They will only appear in assignment dropdowns for assets and subscriptions.
                    </p>
                  </div>
                </div>
              </div>

              {/* Role - Only show if not temporary staff */}
              {!isTemporaryStaff && (
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={watch('role') || ''}
                    onValueChange={(value) => setValue('role', value as 'ADMIN' | 'EMPLOYEE' | 'VALIDATOR')}
                  >
                    <SelectTrigger id="role" className={errors.role ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      <SelectItem value="VALIDATOR">Validator</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-sm text-red-500">{errors.role.message}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    <strong>Employee:</strong> Can view and manage their own assigned assets/subscriptions<br />
                    <strong>Validator:</strong> Can verify accreditation QR codes only<br />
                    <strong>Admin:</strong> Full access to all features and user management
                  </p>
                </div>
              )}

              {/* Info Alert */}
              {!isTemporaryStaff && (
                <Alert>
                  <AlertDescription>
                    <strong>Note:</strong> Users will authenticate using Azure AD or the configured OAuth provider.
                    No password is set here. On first login, their account will be activated.
                  </AlertDescription>
                </Alert>
              )}

              {isTemporaryStaff && (
                <Alert>
                  <AlertDescription>
                    <strong>Temporary Staff:</strong> This user will appear in assignment dropdowns but will not be able to log in to the system.
                    Use a placeholder email (e.g., temp.name@company.local) if they don&apos;t have an actual company email.
                  </AlertDescription>
                </Alert>
              )}

              {/* Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/admin/users')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
