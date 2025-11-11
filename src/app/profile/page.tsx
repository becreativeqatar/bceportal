'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield, Calendar, Image as ImageIcon } from 'lucide-react';
import { formatDateTime } from '@/lib/date-format';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    assets: number;
    subscriptions: number;
  };
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users/me');

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile(data);
      setName(data.name || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        e.target.value = '';
        return;
      }

      // Validate file type (only JPEG/PNG)
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        setError('Only JPEG and PNG images are allowed');
        e.target.value = '';
        return;
      }

      setImageFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      setError(null);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    const formData = new FormData();
    formData.append('file', imageFile);

    try {
      setIsUploading(true);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload image');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      // Upload image if a new one is present
      let finalImageUrl = profile?.image || null; // Keep existing image by default
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (!uploadedUrl) {
          throw new Error('Failed to upload image');
        }
        finalImageUrl = uploadedUrl;
      }

      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          image: finalImageUrl,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update profile');
      }

      const result = await response.json();
      setProfile(result.user);
      setSuccess('Profile updated successfully');
      setIsEditing(false);
      setImageFile(null);
      setImagePreview(null);

      // Reload the page to update the session
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(profile?.name || '');
    setImageFile(null);
    setImagePreview(null);
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert variant="error">
          <AlertDescription>Failed to load profile. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive';
      case 'VALIDATOR':
      case 'ACCREDITATION_APPROVER':
        return 'destructive';
      case 'EMPLOYEE':
        return 'default';
      case 'TEMP_STAFF':
        return 'secondary';
      case 'ACCREDITATION_ADDER':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator';
      case 'EMPLOYEE':
        return 'Employee';
      case 'VALIDATOR':
        return 'Validator';
      case 'TEMP_STAFF':
        return 'Temporary Staff';
      case 'ACCREDITATION_ADDER':
        return 'Accreditation Adder';
      case 'ACCREDITATION_APPROVER':
        return 'Accreditation Approver';
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
            <p className="text-gray-600">View and manage your personal information</p>
          </div>

          {error && (
            <Alert variant="error" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6">
            {/* Profile Information Card */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Your personal details and contact information</CardDescription>
                  </div>
                  {!isEditing && (
                    <Button onClick={() => setIsEditing(true)} size="sm">
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {(imagePreview || profile.image) ? (
                        <img
                          src={imagePreview || profile.image!}
                          alt="Profile"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = '<div class="text-4xl text-gray-400"><User /></div>';
                          }}
                        />
                      ) : (
                        <User className="h-10 w-10 text-gray-400" />
                      )}
                    </div>
                    {isEditing && (
                      <div className="flex-1">
                        <Label htmlFor="imageFile" className="text-sm font-medium">Upload Profile Picture</Label>
                        <Input
                          id="imageFile"
                          type="file"
                          accept="image/jpeg,image/png"
                          onChange={handleImageChange}
                          className="mt-1"
                          disabled={isSaving || isUploading}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          JPG or PNG, max 5MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-500 mb-1">
                    <User className="h-4 w-4 mr-2" />
                    <span className="font-medium">Full Name</span>
                  </div>
                  {isEditing ? (
                    <>
                      <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        maxLength={100}
                      />
                      <p className="text-sm text-gray-500">This is your display name</p>
                    </>
                  ) : (
                    <p className="text-lg font-medium text-gray-900">{profile.name || 'Not set'}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-500 mb-1">
                    <Mail className="h-4 w-4 mr-2" />
                    <span className="font-medium">Email Address</span>
                  </div>
                  <p className="text-lg font-medium text-gray-900">{profile.email}</p>
                  <p className="text-sm text-gray-500">Your email cannot be changed</p>
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-500 mb-1">
                    <Shield className="h-4 w-4 mr-2" />
                    <span className="font-medium">Role</span>
                  </div>
                  <Badge variant={getRoleBadgeVariant(profile.role)}>
                    {getRoleLabel(profile.role)}
                  </Badge>
                </div>

                {/* Member Since */}
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-500 mb-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="font-medium">Member Since</span>
                  </div>
                  <p className="text-lg font-medium text-gray-900">
                    {formatDateTime(new Date(profile.createdAt))}
                  </p>
                </div>

                {isEditing && (
                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button variant="outline" onClick={handleCancel} disabled={isSaving || isUploading}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || isUploading}>
                      {isUploading ? 'Uploading...' : isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Summary</CardTitle>
                <CardDescription>Your assets and subscriptions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900">{profile._count.assets}</div>
                    <div className="text-sm text-blue-600">Assigned Assets</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-900">{profile._count.subscriptions}</div>
                    <div className="text-sm text-green-600">Assigned Subscriptions</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
