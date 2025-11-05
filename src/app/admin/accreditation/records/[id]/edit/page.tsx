'use client';

import { useState, useEffect } from 'react';
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
import { updateAccreditationSchema, type UpdateAccreditationRequest } from '@/lib/validations/accreditation';
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

export default function EditAccreditationPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [accreditationId, setAccreditationId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('DRAFT');
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<AccreditationProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<AccreditationProject | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [orgSuggestions, setOrgSuggestions] = useState<string[]>([]);
  const [jobSuggestions, setJobSuggestions] = useState<string[]>([]);

  // Initialize react-hook-form with Zod validation for UPDATE schema
  type FormData = {
    firstName?: string;
    lastName?: string;
    organization?: string;
    jobTitle?: string;
    accessGroup?: string;
    identificationType?: 'qid' | 'passport';
    qidNumber?: string | null;
    qidExpiry?: Date | null;
    passportNumber?: string | null;
    passportCountry?: string | null;
    passportExpiry?: Date | null;
    hayyaVisaNumber?: string | null;
    hayyaVisaExpiry?: Date | null;
    profilePhotoUrl?: string | null;
    hasBumpInAccess?: boolean;
    bumpInStart?: Date | null;
    bumpInEnd?: Date | null;
    hasLiveAccess?: boolean;
    liveStart?: Date | null;
    liveEnd?: Date | null;
    hasBumpOutAccess?: boolean;
    bumpOutStart?: Date | null;
    bumpOutEnd?: Date | null;
    status?: AccreditationStatus;
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(updateAccreditationSchema) as any,
    mode: 'onChange',
    defaultValues: {
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
    // Get ID from params and fetch accreditation data
    params.then(({ id }) => {
      setAccreditationId(id);
      fetchAccreditation(id);
    });
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/accreditation/projects?isActive=true');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const fetchAccreditation = async (id: string) => {
    try {
      const response = await fetch(`/api/accreditation/records/${id}`);
      if (response.ok) {
        const data = await response.json();
        const record = data.accreditation;

        // Save current status and project ID
        setCurrentStatus(record.status);
        setProjectId(record.projectId);

        // Find and set the selected project
        const project = projects.find((p) => p.id === record.projectId);
        if (project) {
          setSelectedProject(project);
        }

        // Populate form with existing data using reset()
        reset({
          firstName: record.firstName,
          lastName: record.lastName,
          organization: record.organization,
          jobTitle: record.jobTitle,
          accessGroup: record.accessGroup,
          identificationType: record.qidNumber ? 'qid' : 'passport',
          qidNumber: record.qidNumber || null,
          qidExpiry: record.qidExpiry ? new Date(record.qidExpiry) : null,
          passportNumber: record.passportNumber || null,
          passportCountry: record.passportCountry || null,
          passportExpiry: record.passportExpiry ? new Date(record.passportExpiry) : null,
          hayyaVisaNumber: record.hayyaVisaNumber || null,
          hayyaVisaExpiry: record.hayyaVisaExpiry ? new Date(record.hayyaVisaExpiry) : null,
          hasBumpInAccess: record.hasBumpInAccess,
          bumpInStart: record.bumpInStart ? new Date(record.bumpInStart) : null,
          bumpInEnd: record.bumpInEnd ? new Date(record.bumpInEnd) : null,
          hasLiveAccess: record.hasLiveAccess,
          liveStart: record.liveStart ? new Date(record.liveStart) : null,
          liveEnd: record.liveEnd ? new Date(record.liveEnd) : null,
          hasBumpOutAccess: record.hasBumpOutAccess,
          bumpOutStart: record.bumpOutStart ? new Date(record.bumpOutStart) : null,
          bumpOutEnd: record.bumpOutEnd ? new Date(record.bumpOutEnd) : null,
        });

        if (record.profilePhotoUrl) {
          setPhotoPreview(record.profilePhotoUrl);
        }
      } else {
        toast.error('Failed to load accreditation');
        router.push('/admin/accreditation');
      }
    } catch (error) {
      console.error('Error fetching accreditation:', error);
      toast.error('Failed to load accreditation');
      router.push('/admin/accreditation');
    } finally {
      setIsLoading(false);
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
        toast.error('File size must be less than 5MB');
        e.target.value = ''; // Clear the input
        return;
      }

      // Validate file type (only JPEG/PNG)
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        toast.error('Only JPG and PNG files are allowed');
        e.target.value = ''; // Clear the input
        return;
      }

      // Validate image dimensions (min 300x300px)
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl); // Clean up

        if (img.width < 300 || img.height < 300) {
          toast.error('Image dimensions must be at least 300x300 pixels');
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
        toast.error('Failed to load image. Please try another file.');
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
      toast.error('Failed to upload photo');
      return null;
    }
  };

  const onSubmit = async (formData: FormData, submitForApproval: boolean = false) => {
    if (!accreditationId) return;

    try {
      // Upload photo if a new one is present
      let photoUrl = photoPreview; // Keep existing photo by default
      if (photoFile) {
        const uploadedUrl = await uploadPhoto();
        if (!uploadedUrl) {
          throw new Error('Failed to upload photo');
        }
        photoUrl = uploadedUrl;
      }

      // Prepare data - only include relevant identification fields
      const submitData: any = {
        ...formData,
        profilePhotoUrl: photoUrl,
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

      // Update accreditation
      const response = await fetch(`/api/accreditation/records/${accreditationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const data = await response.json();

        // If there are validation details, show them
        if (data.details && Array.isArray(data.details)) {
          const errorMessages = data.details.map((detail: any) =>
            `${detail.path?.join('.')}: ${detail.message}`
          ).join('\n');
          console.error('Validation errors:', errorMessages);
          toast.error(`Validation failed:\n${errorMessages}`);
          throw new Error(data.error || 'Validation failed');
        }

        throw new Error(data.error || 'Failed to update accreditation');
      }

      const updateData = await response.json();

      // If submitForApproval is true and status is DRAFT, submit for approval
      if (submitForApproval && currentStatus === 'DRAFT') {
        const submitResponse = await fetch(`/api/accreditation/records/${accreditationId}/submit`, {
          method: 'POST',
        });

        if (!submitResponse.ok) {
          toast.warning('Updated successfully, but failed to submit for approval');
        } else {
          toast.success('Updated and submitted for approval successfully');
        }
      } else {
        toast.success('Accreditation updated successfully');
      }

      // Navigate back to project records page
      if (projectId) {
        router.push(`/admin/accreditation/projects/${projectId}/records`);
      } else {
        router.back();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update accreditation');
    }
  };

  // Wrapper functions for the submit buttons
  const handleSaveChanges = handleSubmit((data) => onSubmit(data, false));
  const handleSubmitForApproval = handleSubmit((data) => onSubmit(data, true));

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              if (accreditationId) {
                router.push(`/admin/accreditation/records/${accreditationId}`);
              } else {
                router.back();
              }
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Record
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Edit Accreditation</h1>
          <p className="text-gray-600 mt-1">Update event personnel accreditation</p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading accreditation data...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
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
                    {selectedProject?.accessGroups.map((group) => (
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
                  {photoPreview ? (
                    <NextImage src={photoPreview} alt="Preview" width={100} height={100} className="rounded-lg object-cover" />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input type="file" accept="image/jpeg,image/png" onChange={handlePhotoChange} />
                    <p className="text-xs text-gray-500 mt-1">JPG or PNG, max 5MB, min 300x300px</p>
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
                      if (checked && selectedProject) {
                        setValue('hasBumpInAccess', true);
                        setValue('bumpInStart', new Date(selectedProject.bumpInStart));
                        setValue('bumpInEnd', new Date(selectedProject.bumpInEnd));
                      } else {
                        setValue('hasBumpInAccess', false);
                        setValue('bumpInStart', null);
                        setValue('bumpInEnd', null);
                      }
                    }}
                  />
                  <Label htmlFor="bumpIn" className="font-semibold">Bump-In Access</Label>
                </div>
                {hasBumpInAccess && selectedProject && (
                  <div className="ml-6 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bumpInStart">Start Date</Label>
                      <Input
                        id="bumpInStart"
                        type="date"
                        value={bumpInStart ? new Date(bumpInStart).toISOString().split('T')[0] : ''}
                        onChange={(e) => setValue('bumpInStart', e.target.value ? new Date(e.target.value) : null)}
                        min={selectedProject.bumpInStart.slice(0, 10)}
                        max={selectedProject.bumpInEnd.slice(0, 10)}
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
                        min={selectedProject.bumpInStart.slice(0, 10)}
                        max={selectedProject.bumpInEnd.slice(0, 10)}
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
                      if (checked && selectedProject) {
                        setValue('hasLiveAccess', true);
                        setValue('liveStart', new Date(selectedProject.liveStart));
                        setValue('liveEnd', new Date(selectedProject.liveEnd));
                      } else {
                        setValue('hasLiveAccess', false);
                        setValue('liveStart', null);
                        setValue('liveEnd', null);
                      }
                    }}
                  />
                  <Label htmlFor="live" className="font-semibold">Live Access</Label>
                </div>
                {hasLiveAccess && selectedProject && (
                  <div className="ml-6 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="liveStart">Start Date</Label>
                      <Input
                        id="liveStart"
                        type="date"
                        value={liveStart ? new Date(liveStart).toISOString().split('T')[0] : ''}
                        onChange={(e) => setValue('liveStart', e.target.value ? new Date(e.target.value) : null)}
                        min={selectedProject.liveStart.slice(0, 10)}
                        max={selectedProject.liveEnd.slice(0, 10)}
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
                        min={selectedProject.liveStart.slice(0, 10)}
                        max={selectedProject.liveEnd.slice(0, 10)}
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
                      if (checked && selectedProject) {
                        setValue('hasBumpOutAccess', true);
                        setValue('bumpOutStart', new Date(selectedProject.bumpOutStart));
                        setValue('bumpOutEnd', new Date(selectedProject.bumpOutEnd));
                      } else {
                        setValue('hasBumpOutAccess', false);
                        setValue('bumpOutStart', null);
                        setValue('bumpOutEnd', null);
                      }
                    }}
                  />
                  <Label htmlFor="bumpOut" className="font-semibold">Bump-Out Access</Label>
                </div>
                {hasBumpOutAccess && selectedProject && (
                  <div className="ml-6 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bumpOutStart">Start Date</Label>
                      <Input
                        id="bumpOutStart"
                        type="date"
                        value={bumpOutStart ? new Date(bumpOutStart).toISOString().split('T')[0] : ''}
                        onChange={(e) => setValue('bumpOutStart', e.target.value ? new Date(e.target.value) : null)}
                        min={selectedProject.bumpOutStart.slice(0, 10)}
                        max={selectedProject.bumpOutEnd.slice(0, 10)}
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
                        min={selectedProject.bumpOutStart.slice(0, 10)}
                        max={selectedProject.bumpOutEnd.slice(0, 10)}
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
            <Button variant="outline" onClick={handleSaveChanges} disabled={isSubmitting} type="button">
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            {currentStatus === 'DRAFT' && (
              <Button onClick={handleSubmitForApproval} disabled={isSubmitting} type="button">
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
