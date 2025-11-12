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
    },
    mode: 'onChange', // Enable real-time validation
  });

  const role = watch('role');

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

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={watch('role') || ''}
                  onValueChange={(value) => setValue('role', value as any)}
                >
                  <SelectTrigger id="role" className={errors.role ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="VALIDATOR">Validator</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="TEMP_STAFF">Temporary Staff</SelectItem>
                    <SelectItem value="ACCREDITATION_ADDER">Accreditation Adder</SelectItem>
                    <SelectItem value="ACCREDITATION_APPROVER">Accreditation Approver</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-red-500">{errors.role.message}</p>
                )}
                <div className="text-sm text-gray-500 space-y-1">
                  <div><strong>Employee:</strong> Can view and manage their own assigned assets/subscriptions</div>
                  <div><strong>Validator:</strong> Can verify accreditation QR codes only</div>
                  <div><strong>Admin:</strong> Full access to all features and user management</div>
                  <div><strong>Temporary Staff:</strong> No login access, only appears in assignment dropdowns</div>
                  <div><strong>Accreditation Adder:</strong> Can create and manage accreditations (external freelancer)</div>
                  <div><strong>Accreditation Approver:</strong> Can approve/reject accreditations (external freelancer)</div>
                </div>
              </div>

              {/* Info Alert */}
              {role !== 'TEMP_STAFF' && role !== 'ACCREDITATION_ADDER' && role !== 'ACCREDITATION_APPROVER' && (
                <Alert>
                  <AlertDescription>
                    <strong>Note:</strong> Users will authenticate using Azure AD or the configured OAuth provider.
                    No password is set here. On first login, their account will be activated.
                  </AlertDescription>
                </Alert>
              )}

              {role === 'TEMP_STAFF' && (
                <Alert>
                  <AlertDescription>
                    <strong>Temporary Staff:</strong> This user will appear in assignment dropdowns but will not be able to log in to the system.
                    Use a placeholder email (e.g., temp.name@company.local) if they don&apos;t have an actual company email.
                  </AlertDescription>
                </Alert>
              )}

              {(role === 'ACCREDITATION_ADDER' || role === 'ACCREDITATION_APPROVER') && (
                <Alert>
                  <AlertDescription>
                    <strong>Accreditation Role:</strong> This user will only have access to the accreditation module.
                    They are treated as external freelancers and have no access to other system features like assets or subscriptions.
                    {role === 'ACCREDITATION_ADDER' && ' They cannot approve accreditations.'}
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
