'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Upload, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import NextImage from 'next/image';
import { dedupRequest } from '@/lib/request-dedup';
import { createAccreditationSchema } from '@/lib/validations/accreditation';
import { AccreditationStatus } from '@prisma/client';

interface AccreditationProject {
  id: string;
  name: string;
  code: string;
  bumpInStart: string;
  bumpInEnd: string;
  liveStart: string;
  liveEnd: string;
  bumpOutStart: string;
  bumpOutEnd: string;
  accessGroups: string[];
}

interface NewAccreditationPageProps {
  params: Promise<{ id: string }>;
}

function NewAccreditationContent({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<AccreditationProject | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [orgSuggestions, setOrgSuggestions] = useState<string[]>([]);
  const [jobSuggestions, setJobSuggestions] = useState<string[]>([]);

  // Initialize react-hook-form with Zod validation
  type FormData = {
    projectId: string;
    firstName: string;
    lastName: string;
    organization: string;
    jobTitle: string;
    accessGroup: string;
    identificationType: 'qid' | 'passport';
    qidNumber?: string | null;
    qidExpiry?: Date | null;
    passportNumber?: string | null;
    passportCountry?: string | null;
    passportExpiry?: Date | null;
    hayyaVisaNumber?: string | null;
    hayyaVisaExpiry?: Date | null;
    profilePhotoUrl?: string | null;
    hasBumpInAccess: boolean;
    bumpInStart?: Date | null;
    bumpInEnd?: Date | null;
    hasLiveAccess: boolean;
    liveStart?: Date | null;
    liveEnd?: Date | null;
    hasBumpOutAccess: boolean;
    bumpOutStart?: Date | null;
    bumpOutEnd?: Date | null;
    status: AccreditationStatus;
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(createAccreditationSchema) as any,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      projectId: '',
      firstName: '',
      lastName: '',
      organization: '',
      jobTitle: '',
      accessGroup: '',
      identificationType: 'qid',
      qidNumber: null,
      qidExpiry: null,
      passportNumber: null,
      passportCountry: null,
      passportExpiry: null,
      hayyaVisaNumber: null,
      hayyaVisaExpiry: null,
      profilePhotoUrl: null,
      hasBumpInAccess: false,
      bumpInStart: null,
      bumpInEnd: null,
      hasLiveAccess: false,
      liveStart: null,
      liveEnd: null,
      hasBumpOutAccess: false,
      bumpOutStart: null,
      bumpOutEnd: null,
      status: AccreditationStatus.DRAFT,
    },
  });

  // Watch fields for conditional rendering and form updates
  const identificationType = watch('identificationType');
  const hasBumpInAccess = watch('hasBumpInAccess');
  const hasLiveAccess = watch('hasLiveAccess');
  const hasBumpOutAccess = watch('hasBumpOutAccess');
  const bumpInStart = watch('bumpInStart');
  const bumpInEnd = watch('bumpInEnd');
  const liveStart = watch('liveStart');
  const liveEnd = watch('liveEnd');
  const bumpOutStart = watch('bumpOutStart');
  const bumpOutEnd = watch('bumpOutEnd');
  const firstName = watch('firstName');
  const lastName = watch('lastName');
  const organization = watch('organization');
  const jobTitle = watch('jobTitle');
  const accessGroup = watch('accessGroup');
  const qidNumber = watch('qidNumber');
  const qidExpiry = watch('qidExpiry');
  const passportNumber = watch('passportNumber');
  const passportCountry = watch('passportCountry');
  const passportExpiry = watch('passportExpiry');
  const hayyaVisaNumber = watch('hayyaVisaNumber');
  const hayyaVisaExpiry = watch('hayyaVisaExpiry');

  useEffect(() => {
    // Set projectId in form and fetch project details
    setValue('projectId', projectId);
    fetchProject();
  }, [projectId]);

  // Clear QID validation errors when both fields are filled
  useEffect(() => {
    if (identificationType === 'qid' && qidNumber && qidExpiry) {
      clearErrors('qidNumber');
    }
  }, [qidNumber, qidExpiry, identificationType, clearErrors]);

  // Clear Passport validation errors when all fields are filled
  useEffect(() => {
    if (identificationType === 'passport' && passportNumber && passportCountry && passportExpiry && hayyaVisaNumber && hayyaVisaExpiry) {
      clearErrors('passportNumber');
    }
  }, [passportNumber, passportCountry, passportExpiry, hayyaVisaNumber, hayyaVisaExpiry, identificationType, clearErrors]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/accreditation/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        const fetchedProject = data.accreditationProject;
        setProject(fetchedProject);

        // Pre-fill phase dates with project dates if project is loaded
        if (fetchedProject) {
          setValue('hasBumpInAccess', true);
          setValue('bumpInStart', new Date(fetchedProject.bumpInStart));
          setValue('bumpInEnd', new Date(fetchedProject.bumpInEnd));

          setValue('hasLiveAccess', true);
          setValue('liveStart', new Date(fetchedProject.liveStart));
          setValue('liveEnd', new Date(fetchedProject.liveEnd));

          setValue('hasBumpOutAccess', true);
          setValue('bumpOutStart', new Date(fetchedProject.bumpOutStart));
          setValue('bumpOutEnd', new Date(fetchedProject.bumpOutEnd));
        }
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project details', { duration: 10000 });
    }
  };

  const fetchOrgSuggestions = async (query: string) => {
    if (query.length < 2) return;
    try {
      const response = await fetch(`/api/accreditation/autocomplete/organizations?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setOrgSuggestions(data.organizations);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const fetchJobSuggestions = async (query: string) => {
    if (query.length < 2) return;
    try {
      const response = await fetch(`/api/accreditation/autocomplete/jobtitles?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setJobSuggestions(data.jobTitles);
      }
    } catch (error) {
      console.error('Error fetching job titles:', error);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB', { duration: 10000 });
        e.target.value = ''; // Clear the input
        return;
      }

      // Validate file type (only JPEG/PNG)
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        toast.error('Only JPG and PNG files are allowed', { duration: 10000 });
        e.target.value = ''; // Clear the input
        return;
      }

      // Validate image dimensions (min 300x300px)
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl); // Clean up

        if (img.width < 300 || img.height < 300) {
          toast.error('Image dimensions must be at least 300x300 pixels', { duration: 10000 });
          e.target.value = ''; // Clear the input
          return;
        }

        // All validations passed
        setPhotoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        toast.error('Failed to load image. Please try another file.', { duration: 10000 });
        e.target.value = ''; // Clear the input
      };

      img.src = objectUrl;
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;

    const formData = new FormData();
    formData.append('file', photoFile);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo', { duration: 10000 });
      return null;
    }
  };

  const onSubmit = async (formData: FormData, status: 'DRAFT' | 'PENDING') => {
    try {
      // Validate project ID exists
      if (!projectId || !formData.projectId) {
        toast.error('Project not loaded', {
          description: 'Please wait for the project to load before submitting',
          duration: 10000,
        });
        return;
      }

      // Upload photo if present
      let photoUrl = null;
      if (photoFile) {
        photoUrl = await uploadPhoto();
        if (!photoUrl) {
          throw new Error('Failed to upload photo');
        }
      }

      // Prepare data - only include relevant identification fields
      const submitData: Record<string, unknown> = {
        ...formData,
        projectId: projectId,
        profilePhotoUrl: photoUrl,
        status: AccreditationStatus.DRAFT,
      };

      // Add identification fields based on type
      if (formData.identificationType === 'qid') {
        // Set passport fields to null
        submitData.passportNumber = null;
        submitData.passportCountry = null;
        submitData.passportExpiry = null;
        submitData.hayyaVisaNumber = null;
        submitData.hayyaVisaExpiry = null;
      } else {
        submitData.passportNumber = formData.passportNumber ? formData.passportNumber.toUpperCase() : null;
        // Set QID fields to null
        submitData.qidNumber = null;
        submitData.qidExpiry = null;
      }

      // Create accreditation (always as DRAFT first) with deduplication
      const dedupKey = `create-accreditation-${formData.qidNumber || formData.passportNumber}-${Date.now()}`;

      const response = await dedupRequest(
        dedupKey,
        () => fetch('/api/accreditation/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        }),
        2000 // Prevent duplicate submits within 2 seconds
      );

      if (!response.ok) {
        const responseData = await response.json();

        // If there are validation details, show them
        if (responseData.details && Array.isArray(responseData.details)) {
          const errorMessages = responseData.details.map((detail: any) =>
            `${detail.path?.join('.')}: ${detail.message}`
          ).join('; ');
          console.error('Validation errors:', errorMessages);
          toast.error('Validation failed', {
            description: errorMessages,
            duration: 10000,
          });
          return;
        }

        // Show specific error from API
        // Check both 'details' and 'error' fields
        const errorMessage = responseData.details || responseData.error;
        console.error('Create accreditation error:', errorMessage);
        console.error('Full error response:', responseData);

        // Show error with description (the actual reason)
        toast.error('Failed to create accreditation', {
          description: errorMessage || 'Unknown error occurred',
          duration: 10000,
        });
        return;
      }

      const responseData = await response.json();

      // If status is PENDING, submit for approval
      if (status === 'PENDING') {
        const submitResponse = await fetch(`/api/accreditation/records/${responseData.accreditation.id}/submit`, {
          method: 'POST',
        });

        if (!submitResponse.ok) {
          throw new Error('Failed to submit for approval');
        }
      }

      toast.success(status === 'DRAFT' ? 'Draft saved successfully' : 'Submitted for approval', {
        duration: 5000,
      });
      router.push(`/admin/accreditation/projects/${projectId}/records`);
    } catch (error) {
      console.error('Unexpected error creating accreditation:', error);
      toast.error('An unexpected error occurred', {
        description: error instanceof Error ? error.message : 'Failed to create accreditation',
        duration: 10000,
      });
    }
  };

  // Wrapper functions for the submit buttons
  const handleSaveDraft = handleSubmit((data) => onSubmit(data, 'DRAFT'));
  const handleSubmitForApproval = handleSubmit((data) => onSubmit(data, 'PENDING'));

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">New Accreditation</h1>
          <p className="text-gray-600 mt-1">Create a new event personnel accreditation</p>
        </div>

        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    {...register('firstName')}
                    className={errors.firstName ? 'border-red-500' : ''}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-600">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    {...register('lastName')}
                    className={errors.lastName ? 'border-red-500' : ''}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-600">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization">Organization *</Label>
                <Input
                  id="organization"
                  {...register('organization')}
                  onChange={(e) => {
                    setValue('organization', e.target.value);
                    fetchOrgSuggestions(e.target.value);
                  }}
                  list="org-suggestions"
                  className={errors.organization ? 'border-red-500' : ''}
                />
                {errors.organization && (
                  <p className="text-sm text-red-600">{errors.organization.message}</p>
                )}
                {orgSuggestions.length > 0 && (
                  <datalist id="org-suggestions">
                    {orgSuggestions.map((org) => (
                      <option key={org} value={org} />
                    ))}
                  </datalist>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title *</Label>
                <Input
                  id="jobTitle"
                  {...register('jobTitle')}
                  onChange={(e) => {
                    setValue('jobTitle', e.target.value);
                    fetchJobSuggestions(e.target.value);
                  }}
                  list="job-suggestions"
                  className={errors.jobTitle ? 'border-red-500' : ''}
                />
                {errors.jobTitle && (
                  <p className="text-sm text-red-600">{errors.jobTitle.message}</p>
                )}
                {jobSuggestions.length > 0 && (
                  <datalist id="job-suggestions">
                    {jobSuggestions.map((job) => (
                      <option key={job} value={job} />
                    ))}
                  </datalist>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessGroup">Access Group *</Label>
                <Select value={accessGroup} onValueChange={(value) => setValue('accessGroup', value)}>
                  <SelectTrigger id="accessGroup">
                    <SelectValue placeholder="Select access group" />
                  </SelectTrigger>
                  <SelectContent>
                    {project?.accessGroups.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.accessGroup && (
                  <p className="text-sm text-red-600">{errors.accessGroup.message}</p>
                )}
              </div>

              {/* Profile Photo */}
              <div className="space-y-2">
                <Label>Profile Photo (Optional)</Label>
                <div className="flex items-start gap-4">
                  <div
                    className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors overflow-hidden"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {photoPreview ? (
                      <NextImage src={photoPreview} alt="Preview" width={96} height={96} className="object-cover w-full h-full" />
                    ) : (
                      <Upload className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Photo
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">JPG or PNG, max 5MB, min 300x300px</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Identification */}
          <Card>
            <CardHeader>
              <CardTitle>Identification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={identificationType === 'qid' ? 'default' : 'outline'}
                  onClick={() => setValue('identificationType', 'qid')}
                >
                  QID
                </Button>
                <Button
                  type="button"
                  variant={identificationType === 'passport' ? 'default' : 'outline'}
                  onClick={() => setValue('identificationType', 'passport')}
                >
                  Passport + Hayya
                </Button>
              </div>

              {identificationType === 'qid' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="qidNumber">QID Number * (11 digits)</Label>
                    <Input
                      id="qidNumber"
                      type="text"
                      inputMode="numeric"
                      {...register('qidNumber', {
                        setValueAs: (v) => v || null,
                      })}
                      maxLength={11}
                      placeholder="29135640969"
                      className={errors.qidNumber ? 'border-red-500' : ''}
                    />
                    {errors.qidNumber && (
                      <p className="text-sm text-red-600">{errors.qidNumber.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qidExpiry">QID Expiry Date *</Label>
                    <Input
                      id="qidExpiry"
                      type="date"
                      value={qidExpiry ? new Date(qidExpiry).toISOString().split('T')[0] : ''}
                      onChange={(e) => setValue('qidExpiry', e.target.value ? new Date(e.target.value) : null)}
                      min={new Date().toISOString().split('T')[0]}
                      className={errors.qidExpiry ? 'border-red-500' : ''}
                    />
                    {errors.qidExpiry && (
                      <p className="text-sm text-red-600">{errors.qidExpiry.message}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="passportNumber">Passport Number *</Label>
                      <Input
                        id="passportNumber"
                        {...register('passportNumber', {
                          setValueAs: (v) => v || null,
                        })}
                        className={errors.passportNumber ? 'border-red-500' : ''}
                      />
                      {errors.passportNumber && (
                        <p className="text-sm text-red-600">{errors.passportNumber.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passportCountry">Passport Country *</Label>
                      <Select
                        value={passportCountry || ''}
                        onValueChange={(value) => setValue('passportCountry', value)}
                      >
                        <SelectTrigger id="passportCountry" className={errors.passportCountry ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="Afghanistan">Afghanistan</SelectItem>
                          <SelectItem value="Albania">Albania</SelectItem>
                          <SelectItem value="Algeria">Algeria</SelectItem>
                          <SelectItem value="Argentina">Argentina</SelectItem>
                          <SelectItem value="Australia">Australia</SelectItem>
                          <SelectItem value="Austria">Austria</SelectItem>
                          <SelectItem value="Bahrain">Bahrain</SelectItem>
                          <SelectItem value="Bangladesh">Bangladesh</SelectItem>
                          <SelectItem value="Belgium">Belgium</SelectItem>
                          <SelectItem value="Brazil">Brazil</SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                          <SelectItem value="China">China</SelectItem>
                          <SelectItem value="Denmark">Denmark</SelectItem>
                          <SelectItem value="Egypt">Egypt</SelectItem>
                          <SelectItem value="France">France</SelectItem>
                          <SelectItem value="Germany">Germany</SelectItem>
                          <SelectItem value="India">India</SelectItem>
                          <SelectItem value="Indonesia">Indonesia</SelectItem>
                          <SelectItem value="Iran">Iran</SelectItem>
                          <SelectItem value="Iraq">Iraq</SelectItem>
                          <SelectItem value="Ireland">Ireland</SelectItem>
                          <SelectItem value="Italy">Italy</SelectItem>
                          <SelectItem value="Japan">Japan</SelectItem>
                          <SelectItem value="Jordan">Jordan</SelectItem>
                          <SelectItem value="Kuwait">Kuwait</SelectItem>
                          <SelectItem value="Lebanon">Lebanon</SelectItem>
                          <SelectItem value="Malaysia">Malaysia</SelectItem>
                          <SelectItem value="Mexico">Mexico</SelectItem>
                          <SelectItem value="Morocco">Morocco</SelectItem>
                          <SelectItem value="Netherlands">Netherlands</SelectItem>
                          <SelectItem value="New Zealand">New Zealand</SelectItem>
                          <SelectItem value="Nigeria">Nigeria</SelectItem>
                          <SelectItem value="Norway">Norway</SelectItem>
                          <SelectItem value="Oman">Oman</SelectItem>
                          <SelectItem value="Pakistan">Pakistan</SelectItem>
                          <SelectItem value="Palestine">Palestine</SelectItem>
                          <SelectItem value="Philippines">Philippines</SelectItem>
                          <SelectItem value="Poland">Poland</SelectItem>
                          <SelectItem value="Portugal">Portugal</SelectItem>
                          <SelectItem value="Qatar">Qatar</SelectItem>
                          <SelectItem value="Russia">Russia</SelectItem>
                          <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
                          <SelectItem value="Singapore">Singapore</SelectItem>
                          <SelectItem value="South Africa">South Africa</SelectItem>
                          <SelectItem value="South Korea">South Korea</SelectItem>
                          <SelectItem value="Spain">Spain</SelectItem>
                          <SelectItem value="Sri Lanka">Sri Lanka</SelectItem>
                          <SelectItem value="Sudan">Sudan</SelectItem>
                          <SelectItem value="Sweden">Sweden</SelectItem>
                          <SelectItem value="Switzerland">Switzerland</SelectItem>
                          <SelectItem value="Syria">Syria</SelectItem>
                          <SelectItem value="Thailand">Thailand</SelectItem>
                          <SelectItem value="Tunisia">Tunisia</SelectItem>
                          <SelectItem value="Turkey">Turkey</SelectItem>
                          <SelectItem value="United Arab Emirates">United Arab Emirates</SelectItem>
                          <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                          <SelectItem value="United States">United States</SelectItem>
                          <SelectItem value="Yemen">Yemen</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.passportCountry && (
                        <p className="text-sm text-red-600">{errors.passportCountry.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="passportExpiry">Passport Expiry *</Label>
                      <Input
                        id="passportExpiry"
                        type="date"
                        value={passportExpiry ? new Date(passportExpiry).toISOString().split('T')[0] : ''}
                        onChange={(e) => setValue('passportExpiry', e.target.value ? new Date(e.target.value) : null)}
                        min={new Date().toISOString().split('T')[0]}
                        className={errors.passportExpiry ? 'border-red-500' : ''}
                      />
                      {errors.passportExpiry && (
                        <p className="text-sm text-red-600">{errors.passportExpiry.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hayyaVisaNumber">Hayya Visa Number *</Label>
                      <Input
                        id="hayyaVisaNumber"
                        {...register('hayyaVisaNumber', {
                          setValueAs: (v) => v || null,
                        })}
                        className={errors.hayyaVisaNumber ? 'border-red-500' : ''}
                      />
                      {errors.hayyaVisaNumber && (
                        <p className="text-sm text-red-600">{errors.hayyaVisaNumber.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hayyaVisaExpiry">Hayya Visa Expiry *</Label>
                      <Input
                        id="hayyaVisaExpiry"
                        type="date"
                        value={hayyaVisaExpiry ? new Date(hayyaVisaExpiry).toISOString().split('T')[0] : ''}
                        onChange={(e) => setValue('hayyaVisaExpiry', e.target.value ? new Date(e.target.value) : null)}
                        min={new Date().toISOString().split('T')[0]}
                        className={errors.hayyaVisaExpiry ? 'border-red-500' : ''}
                      />
                      {errors.hayyaVisaExpiry && (
                        <p className="text-sm text-red-600">{errors.hayyaVisaExpiry.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Access Validity */}
          <Card>
            <CardHeader>
              <CardTitle>Access Validity</CardTitle>
              <CardDescription>Select the phases and customize access dates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bump-In */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="bumpIn"
                    checked={hasBumpInAccess}
                    onCheckedChange={(checked) => {
                      if (checked && project) {
                        setValue('hasBumpInAccess', true);
                        setValue('bumpInStart', new Date(project.bumpInStart));
                        setValue('bumpInEnd', new Date(project.bumpInEnd));
                      } else {
                        setValue('hasBumpInAccess', false);
                        setValue('bumpInStart', null);
                        setValue('bumpInEnd', null);
                      }
                    }}
                  />
                  <Label htmlFor="bumpIn" className="font-semibold">Bump-In Access</Label>
                </div>
                {hasBumpInAccess && project && (
                  <div className="ml-6 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bumpInStart">Start Date</Label>
                      <Input
                        id="bumpInStart"
                        type="date"
                        value={bumpInStart ? new Date(bumpInStart).toISOString().split('T')[0] : ''}
                        onChange={(e) => setValue('bumpInStart', e.target.value ? new Date(e.target.value) : null)}
                        min={project.bumpInStart.slice(0, 10)}
                        max={project.bumpInEnd.slice(0, 10)}
                        className={errors.bumpInStart ? 'border-red-500' : ''}
                      />
                      {errors.bumpInStart && (
                        <p className="text-sm text-red-600">{errors.bumpInStart.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bumpInEnd">End Date</Label>
                      <Input
                        id="bumpInEnd"
                        type="date"
                        value={bumpInEnd ? new Date(bumpInEnd).toISOString().split('T')[0] : ''}
                        onChange={(e) => setValue('bumpInEnd', e.target.value ? new Date(e.target.value) : null)}
                        min={project.bumpInStart.slice(0, 10)}
                        max={project.bumpInEnd.slice(0, 10)}
                        className={errors.bumpInEnd ? 'border-red-500' : ''}
                      />
                      {errors.bumpInEnd && (
                        <p className="text-sm text-red-600">{errors.bumpInEnd.message}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {errors.hasBumpInAccess && (
                <p className="text-sm text-red-600">{errors.hasBumpInAccess.message}</p>
              )}

              {/* Live */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="live"
                    checked={hasLiveAccess}
                    onCheckedChange={(checked) => {
                      if (checked && project) {
                        setValue('hasLiveAccess', true);
                        setValue('liveStart', new Date(project.liveStart));
                        setValue('liveEnd', new Date(project.liveEnd));
                      } else {
                        setValue('hasLiveAccess', false);
                        setValue('liveStart', null);
                        setValue('liveEnd', null);
                      }
                    }}
                  />
                  <Label htmlFor="live" className="font-semibold">Live Access</Label>
                </div>
                {hasLiveAccess && project && (
                  <div className="ml-6 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="liveStart">Start Date</Label>
                      <Input
                        id="liveStart"
                        type="date"
                        value={liveStart ? new Date(liveStart).toISOString().split('T')[0] : ''}
                        onChange={(e) => setValue('liveStart', e.target.value ? new Date(e.target.value) : null)}
                        min={project.liveStart.slice(0, 10)}
                        max={project.liveEnd.slice(0, 10)}
                        className={errors.liveStart ? 'border-red-500' : ''}
                      />
                      {errors.liveStart && (
                        <p className="text-sm text-red-600">{errors.liveStart.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="liveEnd">End Date</Label>
                      <Input
                        id="liveEnd"
                        type="date"
                        value={liveEnd ? new Date(liveEnd).toISOString().split('T')[0] : ''}
                        onChange={(e) => setValue('liveEnd', e.target.value ? new Date(e.target.value) : null)}
                        min={project.liveStart.slice(0, 10)}
                        max={project.liveEnd.slice(0, 10)}
                        className={errors.liveEnd ? 'border-red-500' : ''}
                      />
                      {errors.liveEnd && (
                        <p className="text-sm text-red-600">{errors.liveEnd.message}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bump-Out */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="bumpOut"
                    checked={hasBumpOutAccess}
                    onCheckedChange={(checked) => {
                      if (checked && project) {
                        setValue('hasBumpOutAccess', true);
                        setValue('bumpOutStart', new Date(project.bumpOutStart));
                        setValue('bumpOutEnd', new Date(project.bumpOutEnd));
                      } else {
                        setValue('hasBumpOutAccess', false);
                        setValue('bumpOutStart', null);
                        setValue('bumpOutEnd', null);
                      }
                    }}
                  />
                  <Label htmlFor="bumpOut" className="font-semibold">Bump-Out Access</Label>
                </div>
                {hasBumpOutAccess && project && (
                  <div className="ml-6 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bumpOutStart">Start Date</Label>
                      <Input
                        id="bumpOutStart"
                        type="date"
                        value={bumpOutStart ? new Date(bumpOutStart).toISOString().split('T')[0] : ''}
                        onChange={(e) => setValue('bumpOutStart', e.target.value ? new Date(e.target.value) : null)}
                        min={project.bumpOutStart.slice(0, 10)}
                        max={project.bumpOutEnd.slice(0, 10)}
                        className={errors.bumpOutStart ? 'border-red-500' : ''}
                      />
                      {errors.bumpOutStart && (
                        <p className="text-sm text-red-600">{errors.bumpOutStart.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bumpOutEnd">End Date</Label>
                      <Input
                        id="bumpOutEnd"
                        type="date"
                        value={bumpOutEnd ? new Date(bumpOutEnd).toISOString().split('T')[0] : ''}
                        onChange={(e) => setValue('bumpOutEnd', e.target.value ? new Date(e.target.value) : null)}
                        min={project.bumpOutStart.slice(0, 10)}
                        max={project.bumpOutEnd.slice(0, 10)}
                        className={errors.bumpOutEnd ? 'border-red-500' : ''}
                      />
                      {errors.bumpOutEnd && (
                        <p className="text-sm text-red-600">{errors.bumpOutEnd.message}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => router.back()} type="button">
              Cancel
            </Button>
            <Button variant="outline" onClick={handleSaveDraft} disabled={isSubmitting} type="button">
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
            <Button onClick={handleSubmitForApproval} disabled={isSubmitting} type="button">
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewAccreditationPage({ params }: NewAccreditationPageProps) {
  const [projectId, setProjectId] = useState<string>('');

  useEffect(() => {
    params.then(({ id }) => {
      setProjectId(id);
    });
  }, [params]);

  return (
    <div className="container mx-auto py-8 px-4">
      {!projectId ? (
        <p className="text-gray-500">Loading project...</p>
      ) : (
        <Suspense fallback={<p className="text-gray-500">Loading form...</p>}>
          <NewAccreditationContent projectId={projectId} />
        </Suspense>
      )}
    </div>
  );
}
