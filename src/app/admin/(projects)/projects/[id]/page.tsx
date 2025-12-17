import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { redirect, notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { formatDate, formatDateTime } from '@/lib/date-format';
import { calculateProjectFinancials } from '@/lib/domains/projects/project/profitability';
import { ProjectBudgetSection } from '@/components/projects/project-budget-section';
import { ProjectRevenueSection } from '@/components/projects/project-revenue-section';
import { ProjectAllocationsSection } from '@/components/projects/project-allocations-section';
import { DeleteProjectButton } from '@/components/projects/delete-project-button';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      supplier: { select: { id: true, name: true } },
      budgetCategories: {
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: { select: { items: true } },
        },
      },
      _count: {
        select: {
          budgetItems: true,
          revenues: true,
          purchaseRequests: true,
          assetAllocations: true,
          subscriptionAllocations: true,
          taskBoards: true,
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // Get financial summary
  const financials = await calculateProjectFinancials(id);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default';
      case 'PLANNING':
        return 'secondary';
      case 'ON_HOLD':
        return 'outline';
      case 'COMPLETED':
        return 'default';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getClientTypeLabel = (type: string) => {
    switch (type) {
      case 'INTERNAL':
        return 'Internal Project';
      case 'EXTERNAL':
        return 'External Client';
      case 'SUPPLIER':
        return 'Supplier Project';
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                  <Badge variant={getStatusBadgeVariant(project.status)}>
                    {project.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-gray-600 font-mono">{project.code}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/projects/${project.id}/edit`}>
                  <Button>Edit Project</Button>
                </Link>
                <DeleteProjectButton projectId={project.id} projectName={project.name} />
                <Link href="/admin/projects">
                  <Button variant="outline">Back to Projects</Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Financial Overview Cards */}
          {financials && (
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-gray-600">Contract Value</CardTitle>
                </CardHeader>
                <CardContent className="pb-3 px-4">
                  <div className="text-xl font-bold text-gray-900">
                    QAR {financials.revenue.contractValueQAR?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || '0'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-gray-600">Total Costs</CardTitle>
                </CardHeader>
                <CardContent className="pb-3 px-4">
                  <div className="text-xl font-bold text-gray-900">
                    QAR {financials.totalCostQAR?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || '0'}
                  </div>
                  <p className="text-xs text-gray-500">
                    Budget: QAR {financials.budgetedCostQAR?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || '0'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-gray-600">Revenue</CardTitle>
                </CardHeader>
                <CardContent className="pb-3 px-4">
                  <div className="text-xl font-bold text-gray-900">
                    QAR {financials.revenue.invoicedQAR?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || '0'}
                  </div>
                  <p className="text-xs text-gray-500">
                    Collected: QAR {financials.revenue.paidQAR?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || '0'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-gray-600">Profit/Loss</CardTitle>
                </CardHeader>
                <CardContent className="pb-3 px-4">
                  <div className={`text-xl font-bold ${(financials.grossProfitQAR || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    QAR {financials.grossProfitQAR?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || '0'}
                  </div>
                  <p className="text-xs text-gray-500">
                    Margin: {financials.grossMarginPercent?.toFixed(1) || '0'}%
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="budget">Budget ({project._count.budgetItems})</TabsTrigger>
              <TabsTrigger value="revenue">Revenue ({project._count.revenues})</TabsTrigger>
              <TabsTrigger value="allocations">Allocations</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Project Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Details</CardTitle>
                  <CardDescription>Core project information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label>Project Code</Label>
                        <div className="font-mono text-lg font-semibold">{project.code}</div>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <div>
                          <Badge variant={getStatusBadgeVariant(project.status)}>
                            {project.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label>Project Manager</Label>
                        <div>{project.manager?.name || project.manager?.email || 'Not assigned'}</div>
                      </div>
                      {project.documentHandler && (
                        <div>
                          <Label>Document Handler</Label>
                          <div>{project.documentHandler}</div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label>Client Type</Label>
                        <div>{getClientTypeLabel(project.clientType)}</div>
                      </div>
                      {project.clientType === 'SUPPLIER' && project.supplier && (
                        <div>
                          <Label>Supplier</Label>
                          <div>{project.supplier.name}</div>
                        </div>
                      )}
                      {project.clientType === 'EXTERNAL' && (
                        <>
                          <div>
                            <Label>Client Name</Label>
                            <div>{project.clientName || 'Not specified'}</div>
                          </div>
                          {project.clientContact && (
                            <div>
                              <Label>Client Contact</Label>
                              <div>{project.clientContact}</div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {project.description && (
                    <div className="mt-6 pt-6 border-t">
                      <Label>Description</Label>
                      <div className="whitespace-pre-wrap mt-2">{project.description}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Timeline</CardTitle>
                  <CardDescription>Project schedule</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label>Start Date</Label>
                      <div>{formatDate(project.startDate, 'Not set')}</div>
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <div>{formatDate(project.endDate, 'Not set')}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                  <CardDescription>Contract and budget details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label>Contract Value</Label>
                        <div className="text-lg font-semibold">
                          {project.contractValue ? (
                            <>
                              {project.contractCurrency} {Number(project.contractValue).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                              {project.contractCurrency !== 'QAR' && project.contractValueQAR && (
                                <div className="text-sm text-gray-500 font-normal">
                                  ≈ QAR {Number(project.contractValueQAR).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                </div>
                              )}
                            </>
                          ) : (
                            'Not specified'
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label>Budget Amount</Label>
                        <div className="text-lg font-semibold">
                          {project.budgetAmount ? (
                            <>
                              {project.budgetCurrency} {Number(project.budgetAmount).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                              {project.budgetCurrency !== 'QAR' && project.budgetAmountQAR && (
                                <div className="text-sm text-gray-500 font-normal">
                                  ≈ QAR {Number(project.budgetAmountQAR).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                </div>
                              )}
                            </>
                          ) : (
                            'Not specified'
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Related Items Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Related Items</CardTitle>
                  <CardDescription>Connected resources and requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold">{project._count.purchaseRequests}</div>
                      <div className="text-sm text-gray-500">Purchase Requests</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold">{project._count.assetAllocations}</div>
                      <div className="text-sm text-gray-500">Assets Allocated</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold">{project._count.subscriptionAllocations}</div>
                      <div className="text-sm text-gray-500">Subscriptions</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold">{project._count.taskBoards}</div>
                      <div className="text-sm text-gray-500">Task Boards</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Information */}
              <Card>
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                  <CardDescription>Tracking and audit details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label>Created By</Label>
                      <div>{project.createdBy?.name || project.createdBy?.email || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{formatDateTime(project.createdAt)}</div>
                    </div>
                    <div>
                      <Label>Last Updated</Label>
                      <div>{formatDateTime(project.updatedAt)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Budget Tab */}
            <TabsContent value="budget">
              <ProjectBudgetSection projectId={project.id} />
            </TabsContent>

            {/* Revenue Tab */}
            <TabsContent value="revenue">
              <ProjectRevenueSection projectId={project.id} />
            </TabsContent>

            {/* Allocations Tab */}
            <TabsContent value="allocations">
              <ProjectAllocationsSection projectId={project.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
