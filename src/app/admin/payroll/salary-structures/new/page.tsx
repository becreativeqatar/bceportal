'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/payroll/utils';

interface Employee {
  id: string;
  name: string | null;
  email: string;
  hrProfile?: {
    employeeId: string | null;
    designation: string | null;
  };
  salaryStructure?: {
    id: string;
  } | null;
}

export default function NewSalaryStructurePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const [userId, setUserId] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [housingAllowance, setHousingAllowance] = useState('');
  const [transportAllowance, setTransportAllowance] = useState('');
  const [foodAllowance, setFoodAllowance] = useState('');
  const [phoneAllowance, setPhoneAllowance] = useState('');
  const [otherAllowances, setOtherAllowances] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    fetch('/api/users?includeAll=true')
      .then((res) => res.json())
      .then((data) => {
        // Filter out employees who already have salary structures
        const availableEmployees = (data.users || []).filter(
          (emp: Employee) => !emp.salaryStructure
        );
        setEmployees(availableEmployees);
      })
      .catch(() => toast.error('Failed to load employees'))
      .finally(() => setLoadingEmployees(false));
  }, []);

  // Calculate totals
  const basic = parseFloat(basicSalary) || 0;
  const housing = parseFloat(housingAllowance) || 0;
  const transport = parseFloat(transportAllowance) || 0;
  const food = parseFloat(foodAllowance) || 0;
  const phone = parseFloat(phoneAllowance) || 0;
  const other = parseFloat(otherAllowances) || 0;
  const totalAllowances = housing + transport + food + phone + other;
  const grossSalary = basic + totalAllowances;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      toast.error('Please select an employee');
      return;
    }

    if (basic <= 0) {
      toast.error('Basic salary must be greater than 0');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/payroll/salary-structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          basicSalary: basic,
          housingAllowance: housing,
          transportAllowance: transport,
          foodAllowance: food,
          phoneAllowance: phone,
          otherAllowances: other,
          effectiveFrom,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create salary structure');
      }

      toast.success('Salary structure created successfully');
      router.push('/admin/payroll/salary-structures');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create salary structure');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedEmployee = employees.find((emp) => emp.id === userId);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/payroll/salary-structures">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Salary Structure</h1>
            <p className="text-muted-foreground">
              Set up salary components for an employee
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Employee Selection */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Employee</CardTitle>
                <CardDescription>
                  Select the employee to set up salary for
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="employee">Select Employee</Label>
                    <Select value={userId} onValueChange={setUserId} disabled={loadingEmployees}>
                      <SelectTrigger id="employee">
                        <SelectValue placeholder={loadingEmployees ? 'Loading...' : 'Select an employee'} />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No employees without salary structure
                          </SelectItem>
                        ) : (
                          employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name || emp.email}
                              {emp.hrProfile?.employeeId && ` (${emp.hrProfile.employeeId})`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="effectiveFrom">Effective From</Label>
                    <Input
                      id="effectiveFrom"
                      type="date"
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {selectedEmployee && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="grid gap-2 md:grid-cols-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>{' '}
                        <span className="font-medium">{selectedEmployee.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email:</span>{' '}
                        <span className="font-medium">{selectedEmployee.email}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Designation:</span>{' '}
                        <span className="font-medium">
                          {selectedEmployee.hrProfile?.designation || 'Not set'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Salary Components */}
            <Card>
              <CardHeader>
                <CardTitle>Salary Components</CardTitle>
                <CardDescription>
                  Enter monthly salary amounts in QAR
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="basicSalary">Basic Salary *</Label>
                  <Input
                    id="basicSalary"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="housingAllowance">Housing Allowance</Label>
                  <Input
                    id="housingAllowance"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={housingAllowance}
                    onChange={(e) => setHousingAllowance(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transportAllowance">Transport Allowance</Label>
                  <Input
                    id="transportAllowance"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={transportAllowance}
                    onChange={(e) => setTransportAllowance(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="foodAllowance">Food Allowance</Label>
                  <Input
                    id="foodAllowance"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={foodAllowance}
                    onChange={(e) => setFoodAllowance(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneAllowance">Phone Allowance</Label>
                  <Input
                    id="phoneAllowance"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={phoneAllowance}
                    onChange={(e) => setPhoneAllowance(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otherAllowances">Other Allowances</Label>
                  <Input
                    id="otherAllowances"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={otherAllowances}
                    onChange={(e) => setOtherAllowances(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Salary Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Salary Summary
                </CardTitle>
                <CardDescription>
                  Monthly breakdown preview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Basic Salary</span>
                    <span className="font-medium">{formatCurrency(basic)}</span>
                  </div>

                  {housing > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Housing</span>
                      <span className="font-medium">{formatCurrency(housing)}</span>
                    </div>
                  )}

                  {transport > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Transport</span>
                      <span className="font-medium">{formatCurrency(transport)}</span>
                    </div>
                  )}

                  {food > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Food</span>
                      <span className="font-medium">{formatCurrency(food)}</span>
                    </div>
                  )}

                  {phone > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-medium">{formatCurrency(phone)}</span>
                    </div>
                  )}

                  {other > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Other</span>
                      <span className="font-medium">{formatCurrency(other)}</span>
                    </div>
                  )}

                  <div className="flex justify-between py-2 border-b font-medium">
                    <span>Total Allowances</span>
                    <span>{formatCurrency(totalAllowances)}</span>
                  </div>

                  <div className="flex justify-between py-3 text-lg font-semibold">
                    <span>Gross Salary</span>
                    <span className="text-green-600">{formatCurrency(grossSalary)}</span>
                  </div>
                </div>

                <div className="pt-4">
                  <Button type="submit" className="w-full" disabled={isLoading || !userId}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Salary Structure
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}
