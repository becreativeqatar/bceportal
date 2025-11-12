'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Upload, Download, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AccreditationProject {
  id: string;
  name: string;
  code: string;
}

interface ParsedRecord {
  row: number;
  data: {
    firstName: string;
    lastName: string;
    organization: string;
    jobTitle: string;
    accessGroup: string;
    identificationType: string;
    qidNumber?: string;
    qidExpiry?: string;
    passportNumber?: string;
    passportCountry?: string;
    passportExpiry?: string;
    hayyaVisaNumber?: string;
    hayyaVisaExpiry?: string;
  };
  errors: string[];
  isDuplicate: boolean;
}

interface ImportAccreditationsPageProps {
  params: Promise<{ id: string }>;
}

export default function ImportAccreditationsPage({ params }: ImportAccreditationsPageProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string>('');
  const [project, setProject] = useState<AccreditationProject | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRecords, setParsedRecords] = useState<ParsedRecord[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    params.then(({ id }) => {
      setProjectId(id);
      fetchProject(id);
    });
  }, [params]);

  const fetchProject = async (id: string) => {
    try {
      const response = await fetch(`/api/accreditation/projects/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.accreditationProject);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project details', { duration: 10000 });
    }
  };

  const downloadTemplate = () => {
    const template = [
      'First Name,Last Name,Organization,Job Title,Access Group,Identification Type,QID Number,QID Expiry,Passport Number,Passport Country,Passport Expiry,Hayya Visa Number,Hayya Visa Expiry',
      'John,Doe,ABC Company,Manager,VIP,qid,12345678901,2025-12-31,,,,,',
      'Jane,Smith,XYZ Corp,Director,Organiser,passport,,,AB123456,USA,2026-06-30,HV987654,2025-12-31',
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'accreditation-import-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file', { duration: 10000 });
      e.target.value = '';
      return;
    }

    setFile(selectedFile);
  };

  const parseCSV = async () => {
    if (!file) {
      toast.error('Please select a file', { duration: 10000 });
      return;
    }

    if (!projectId) {
      toast.error('Please select a project', { duration: 10000 });
      return;
    }

    setIsProcessing(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length < 2) {
        toast.error('CSV file is empty or has no data rows', { duration: 10000 });
        setIsProcessing(false);
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim());
      const records: ParsedRecord[] = [];
      const seenIdentifiers = new Map<string, number>(); // Track seen QIDs/Passports and their row numbers

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim());
        const errors: string[] = [];

        const firstName = values[0] || '';
        const lastName = values[1] || '';
        const organization = values[2] || '';
        const jobTitle = values[3] || '';
        const accessGroup = values[4] || '';
        const identificationType = values[5]?.toLowerCase() || '';
        const qidNumber = values[6] || '';
        const qidExpiry = values[7] || '';
        const passportNumber = values[8] || '';
        const passportCountry = values[9] || '';
        const passportExpiry = values[10] || '';
        const hayyaVisaNumber = values[11] || '';
        const hayyaVisaExpiry = values[12] || '';

        // Validate required fields
        if (!firstName) errors.push('First name is required');
        if (!lastName) errors.push('Last name is required');
        if (!organization) errors.push('Organization is required');
        if (!jobTitle) errors.push('Job title is required');
        if (!accessGroup) errors.push('Access group is required');
        if (!identificationType || !['qid', 'passport'].includes(identificationType)) {
          errors.push('Identification type must be "qid" or "passport"');
        }

        // Validate QID fields
        if (identificationType === 'qid') {
          if (!qidNumber) errors.push('QID number is required');
          if (!qidExpiry) errors.push('QID expiry is required');
          if (qidNumber && !/^\d{11}$/.test(qidNumber)) {
            errors.push('QID must be exactly 11 digits');
          }
        }

        // Validate Passport fields
        if (identificationType === 'passport') {
          if (!passportNumber) errors.push('Passport number is required');
          if (!passportCountry) errors.push('Passport country is required');
          if (!passportExpiry) errors.push('Passport expiry is required');
          if (!hayyaVisaNumber) errors.push('Hayya visa number is required');
          if (!hayyaVisaExpiry) errors.push('Hayya visa expiry is required');
        }

        // Check for duplicates within the CSV itself
        let isDuplicate = false;
        const identifier = identificationType === 'qid' ? qidNumber : passportNumber;
        if (identifier) {
          const firstSeen = seenIdentifiers.get(identifier);
          if (firstSeen !== undefined) {
            isDuplicate = true;
            errors.push(`Duplicate ${identificationType === 'qid' ? 'QID' : 'Passport'} number (also found in row ${firstSeen + 1})`);
          } else {
            seenIdentifiers.set(identifier, i);
          }
        }

        records.push({
          row: i + 1,
          data: {
            firstName,
            lastName,
            organization,
            jobTitle,
            accessGroup,
            identificationType,
            qidNumber,
            qidExpiry,
            passportNumber,
            passportCountry,
            passportExpiry,
            hayyaVisaNumber,
            hayyaVisaExpiry,
          },
          errors,
          isDuplicate,
        });
      }

      setParsedRecords(records);
      toast.success(`Parsed ${records.length} records from CSV`);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error('Failed to parse CSV file', { duration: 10000 });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (parsedRecords.length === 0) {
      toast.error('No records to import', { duration: 10000 });
      return;
    }

    const validRecords = parsedRecords.filter((r) => r.errors.length === 0);
    if (validRecords.length === 0) {
      toast.error('No valid records to import. Please fix errors first.', { duration: 10000 });
      return;
    }

    setIsImporting(true);

    // Show progress indicator
    toast.loading(`Importing ${validRecords.length} record${validRecords.length !== 1 ? 's' : ''}...`, { id: 'import-progress' });

    try {
      const response = await fetch('/api/accreditation/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          records: validRecords.map((r) => r.data),
          skipDuplicates,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Import failed');
      }

      const result = await response.json();
      toast.success(
        `Successfully imported ${result.imported} record(s). ${result.skipped || 0} duplicate(s) skipped. ${result.failed || 0} failed.`,
        { id: 'import-progress' }
      );

      // Navigate back to records page
      router.push(`/admin/accreditation/projects/${projectId}/records`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Import failed', { id: 'import-progress', duration: 10000 });
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedRecords.filter((r) => r.errors.length === 0).length;
  const errorCount = parsedRecords.filter((r) => r.errors.length > 0).length;

  return (
    <div className="container mx-auto py-8 px-4">
      {!projectId ? (
        <p className="text-gray-500">Loading project...</p>
      ) : (
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Import Accreditations</h1>
          <p className="text-gray-600 mt-1">Upload a CSV file to create multiple accreditation records</p>
        </div>

        {/* Step 1: Upload File */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Step 1: Upload CSV</CardTitle>
            <CardDescription>Upload your CSV file for this project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {project && (
              <div>
                <Label>Project</Label>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 mt-1">
                  <div>
                    <p className="font-medium text-gray-900">{project.name}</p>
                    <p className="text-sm text-gray-600">Code: {project.code}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label>CSV File *</Label>
              <Input type="file" accept=".csv" onChange={handleFileChange} />
              <p className="text-xs text-gray-500 mt-1">Upload a CSV file with accreditation data</p>
            </div>

            <div className="flex items-center gap-4">
              <Button onClick={parseCSV} disabled={!file || !projectId || isProcessing}>
                {isProcessing ? 'Processing...' : 'Preview & Validate'}
              </Button>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Preview and Validate */}
        {parsedRecords.length > 0 && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Step 2: Review Validation Results</CardTitle>
                <CardDescription>
                  {validCount} valid, {errorCount} with errors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Checkbox
                    id="skip-duplicates"
                    checked={skipDuplicates}
                    onCheckedChange={(checked) => setSkipDuplicates(checked === true)}
                  />
                  <Label htmlFor="skip-duplicates" className="cursor-pointer">
                    Skip duplicate records (based on QID/Passport number)
                  </Label>
                </div>

                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left">Row</th>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">Organization</th>
                        <th className="px-4 py-2 text-left">ID Type</th>
                        <th className="px-4 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {parsedRecords.map((record, idx) => (
                        <tr key={idx} className={record.errors.length > 0 ? 'bg-red-50' : ''}>
                          <td className="px-4 py-2">{record.row}</td>
                          <td className="px-4 py-2">
                            {record.data.firstName} {record.data.lastName}
                          </td>
                          <td className="px-4 py-2">{record.data.organization}</td>
                          <td className="px-4 py-2">{record.data.identificationType}</td>
                          <td className="px-4 py-2">
                            {record.errors.length === 0 ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                Valid
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-red-600">
                                  <XCircle className="h-4 w-4" />
                                  {record.errors.length} error(s)
                                </div>
                                <ul className="text-xs text-red-600 list-disc list-inside">
                                  {record.errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Import */}
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Import Records</CardTitle>
                <CardDescription>Import all valid records to the database</CardDescription>
              </CardHeader>
              <CardContent>
                {errorCount > 0 && (
                  <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-900">
                        {errorCount} record(s) have validation errors
                      </p>
                      <p className="text-yellow-700">
                        These records will be skipped during import. Only {validCount} valid record(s) will be
                        imported.
                      </p>
                    </div>
                  </div>
                )}

                <Button onClick={handleImport} disabled={validCount === 0 || isImporting} className="w-full">
                  {isImporting ? 'Importing...' : `Import ${validCount} Valid Record(s)`}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      )}
    </div>
  );
}
