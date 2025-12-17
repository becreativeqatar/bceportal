import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
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
import { ArrowLeft, Download, Eye, Users, Wallet, FileText, Clock } from 'lucide-react';
import { formatCurrency, getMonthName, getPayrollStatusColor, getPayrollStatusText } from '@/lib/payroll/utils';
import { PayrollWorkflowActions } from '@/components/payroll/payroll-workflow-actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PayrollRunDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) {
    redirect('/');
  }

  const { id } = await params;

  const payrollRun = await prisma.payrollRun.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      submittedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      processedBy: { select: { id: true, name: true } },
      paidBy: { select: { id: true, name: true } },
      payslips: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              hrProfile: {
                select: {
                  employeeId: true,
                  designation: true,
                },
              },
            },
          },
          deductions: true,
        },
        orderBy: {
          user: { name: 'asc' },
        },
      },
      history: {
        orderBy: { createdAt: 'desc' },
        include: {
          performedBy: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!payrollRun) {
    notFound();
  }

  const totalGross = Number(payrollRun.totalGross);
  const totalDeductions = Number(payrollRun.totalDeductions);
  const totalNet = Number(payrollRun.totalNet);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link href="/admin/payroll/runs">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {getMonthName(payrollRun.month)} {payrollRun.year} Payroll
              </h1>
              <Badge
                style={{ backgroundColor: getPayrollStatusColor(payrollRun.status) }}
                className="text-white"
              >
                {getPayrollStatusText(payrollRun.status)}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Reference: {payrollRun.referenceNumber}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {payrollRun.wpsFileGenerated && payrollRun.wpsFileUrl && (
            <Button asChild variant="outline">
              <a href={payrollRun.wpsFileUrl} download>
                <Download className="mr-2 h-4 w-4" />
                Download WPS
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Workflow Actions */}
      <PayrollWorkflowActions
        payrollRunId={payrollRun.id}
        currentStatus={payrollRun.status}
        hasPayslips={payrollRun.payslips.length > 0}
        wpsGenerated={payrollRun.wpsFileGenerated}
      />

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payrollRun.employeeCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gross</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalGross)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{formatCurrency(totalDeductions)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Net Pay</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalNet)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payslips Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payslips ({payrollRun.payslips.length})</CardTitle>
          <CardDescription>
            Individual employee payslips for this payroll run
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Payslip No.</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollRun.payslips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No payslips generated yet. Process the payroll to generate payslips.
                  </TableCell>
                </TableRow>
              ) : (
                payrollRun.payslips.map((payslip) => (
                  <TableRow key={payslip.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payslip.user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {payslip.user.hrProfile?.employeeId || payslip.user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {payslip.payslipNumber}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(payslip.grossSalary))}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      -{formatCurrency(Number(payslip.totalDeductions))}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(Number(payslip.netSalary))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={payslip.isPaid ? 'default' : 'secondary'}>
                        {payslip.isPaid ? 'Paid' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/admin/payroll/payslips/${payslip.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>Workflow and change history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payrollRun.history.map((entry) => (
              <div key={entry.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                <div className="p-2 bg-muted rounded-full">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{entry.action.replace(/_/g, ' ')}</div>
                  {entry.notes && (
                    <p className="text-sm text-muted-foreground">{entry.notes}</p>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {entry.performedBy?.name || 'System'} •{' '}
                    {new Date(entry.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-start gap-4">
              <div className="p-2 bg-muted rounded-full">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Created</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {payrollRun.createdBy?.name || 'System'} •{' '}
                  {new Date(payrollRun.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
