'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, Database, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExportStatus {
  [key: string]: 'idle' | 'loading' | 'success' | 'error';
}

export function DataExportImport() {
  const [exportStatus, setExportStatus] = useState<ExportStatus>({});
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleExport = async (entityType: string, endpoint: string, filename: string) => {
    setExportStatus(prev => ({ ...prev, [entityType]: 'loading' }));

    try {
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportStatus(prev => ({ ...prev, [entityType]: 'success' }));
      toast.success(`${entityType} exported successfully`);

      // Reset status after 2 seconds
      setTimeout(() => {
        setExportStatus(prev => ({ ...prev, [entityType]: 'idle' }));
      }, 2000);
    } catch (error) {
      console.error(`Export error for ${entityType}:`, error);
      setExportStatus(prev => ({ ...prev, [entityType]: 'error' }));
      toast.error(`Failed to export ${entityType}`);

      // Reset status after 3 seconds
      setTimeout(() => {
        setExportStatus(prev => ({ ...prev, [entityType]: 'idle' }));
      }, 3000);
    }
  };

  const getButtonIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const getButtonVariant = (status: string) => {
    switch (status) {
      case 'success':
        return 'default' as const;
      case 'error':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to import');
      return;
    }

    setImportStatus('loading');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/import/full-backup', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setImportStatus('success');
      const totalRecords = (Object.values(data.imported) as number[]).reduce((sum: number, val: number) => sum + val, 0);
      toast.success('Full backup imported successfully!', {
        description: `Total records imported: ${totalRecords}

Main data: ${data.imported.users} users, ${data.imported.assets} assets, ${data.imported.subscriptions} subscriptions, ${data.imported.suppliers} suppliers, ${data.imported.accreditations} accreditations, ${data.imported.projects} projects

History data: ${data.imported.assetHistory || 0} asset history, ${data.imported.subscriptionHistory || 0} subscription history, ${data.imported.supplierEngagements || 0} engagements, ${data.imported.accreditationHistory || 0} accreditation history, ${data.imported.accreditationScans || 0} scans, ${data.imported.activityLogs || 0} activity logs, ${data.imported.maintenanceRecords || 0} maintenance records`,
      });

      // Reset after 3 seconds
      setTimeout(() => {
        setImportStatus('idle');
        setSelectedFile(null);
        // Reload the page to reflect changes
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus('error');
      toast.error('Failed to import backup', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });

      // Reset after 3 seconds
      setTimeout(() => {
        setImportStatus('idle');
      }, 3000);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.xlsx')) {
        toast.error('Please select a valid Excel file (.xlsx)');
        return;
      }
      setSelectedFile(file);
      toast.info(`Selected file: ${file.name}`);
    }
  };

  const exportItems = [
    {
      key: 'users',
      title: 'Users',
      description: 'Export all user accounts with roles and permissions',
      endpoint: '/api/users/export',
      filename: `users_${new Date().toISOString().split('T')[0]}.csv`,
    },
    {
      key: 'assets',
      title: 'Assets',
      description: 'Export all assets with assignment history',
      endpoint: '/api/assets/export',
      filename: `assets_${new Date().toISOString().split('T')[0]}.csv`,
    },
    {
      key: 'subscriptions',
      title: 'Subscriptions',
      description: 'Export all subscriptions and licenses',
      endpoint: '/api/subscriptions/export',
      filename: `subscriptions_${new Date().toISOString().split('T')[0]}.csv`,
    },
    {
      key: 'suppliers',
      title: 'Suppliers',
      description: 'Export supplier directory and contact information',
      endpoint: '/api/suppliers/export',
      filename: `suppliers_${new Date().toISOString().split('T')[0]}.csv`,
    },
    {
      key: 'accreditations',
      title: 'Accreditations',
      description: 'Export all accreditation records',
      endpoint: '/api/accreditation/export',
      filename: `accreditations_${new Date().toISOString().split('T')[0]}.csv`,
    },
    {
      key: 'scans',
      title: 'Accreditation Scans',
      description: 'Export QR code scan history',
      endpoint: '/api/accreditation/scans/export',
      filename: `scans_${new Date().toISOString().split('T')[0]}.csv`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Full Database Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Full Database Backup (Export)
          </CardTitle>
          <CardDescription>
            Export ALL system data including history and activity logs - complete backup for disaster recovery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertDescription>
              <strong>Complete Database Backup</strong> - This exports everything in 14 Excel sheets:
              <br/>• Main data: Users, Assets, Subscriptions, Suppliers, Accreditations, Projects
              <br/>• History & logs: Asset history, Subscription history, Supplier engagements, Accreditation history, Scan logs, Activity logs, Maintenance records
              <br/>The file can be large depending on your data size. This is your full disaster recovery backup.
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => handleExport('fullBackup', '/api/export/full-backup', `full_backup_${new Date().toISOString().split('T')[0]}.xlsx`)}
            disabled={exportStatus.fullBackup === 'loading'}
            variant={getButtonVariant(exportStatus.fullBackup || 'idle')}
            className="gap-2"
          >
            {getButtonIcon(exportStatus.fullBackup || 'idle')}
            {exportStatus.fullBackup === 'loading' ? 'Exporting...' : 'Export Full Backup (Excel)'}
          </Button>
        </CardContent>
      </Card>

      {/* Individual Exports */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Data Exports</CardTitle>
          <CardDescription>
            Export specific datasets for analysis or migration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exportItems.map((item) => (
              <Card key={item.key} className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleExport(item.key, item.endpoint, item.filename)}
                    disabled={exportStatus[item.key] === 'loading'}
                    variant={getButtonVariant(exportStatus[item.key] || 'idle')}
                    size="sm"
                    className="w-full gap-2"
                  >
                    {getButtonIcon(exportStatus[item.key] || 'idle')}
                    {exportStatus[item.key] === 'loading' ? 'Exporting...' : 'Export CSV'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Full Database Restore */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Full Database Restore (Import)
          </CardTitle>
          <CardDescription>
            Import and restore data from a full backup Excel file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4 border-yellow-500 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Warning:</strong> This will update existing records and create new ones based on the imported data.
              Make sure you have a current backup before importing. This operation cannot be easily undone.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <label htmlFor="backup-file" className="block text-sm font-medium text-gray-700 mb-2">
                Select Backup File (.xlsx)
              </label>
              <input
                id="backup-file"
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                disabled={importStatus === 'loading'}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <Button
              onClick={handleImport}
              disabled={!selectedFile || importStatus === 'loading'}
              variant={importStatus === 'error' ? 'destructive' : importStatus === 'success' ? 'default' : 'default'}
              className="gap-2"
            >
              {importStatus === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
              {importStatus === 'success' && <CheckCircle2 className="h-4 w-4" />}
              {importStatus === 'error' && <AlertCircle className="h-4 w-4" />}
              {importStatus === 'idle' && <Upload className="h-4 w-4" />}
              {importStatus === 'loading' ? 'Importing...' : importStatus === 'success' ? 'Import Complete!' : 'Import Full Backup'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Other Imports */}
      <Card>
        <CardHeader>
          <CardTitle>Other Data Imports</CardTitle>
          <CardDescription>
            Module-specific import functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Import functionality is available in the respective module pages:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Accreditations: Go to project → Import Records</li>
                <li>Other imports: Available through full backup restore above</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
