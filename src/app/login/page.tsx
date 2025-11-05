'use client';

import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

// Color scheme for login page
// Modify these values to customize the appearance
const colorScheme = {
  gradient: 'from-slate-900 via-blue-950 to-slate-950',
  textPrimary: 'text-blue-50',
  textSecondary: 'text-blue-200',
  textTertiary: 'text-blue-300',
  button: 'bg-slate-600 hover:bg-slate-700',
  focusRing: 'focus:border-slate-400 focus:ring-slate-400',
};

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    getSession().then((session) => {
      if (session) {
        router.push('/');
      }
    });
  }, [router]);

  const handleAzureSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('azure-ad', { callbackUrl: '/' });
    } catch (error) {
      console.error('Azure sign in error:', error);
      toast.error('Failed to sign in. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Branding */}
      <div className={`hidden lg:flex lg:w-1/2 bg-gradient-to-br ${colorScheme.gradient} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/5" />
        <div className="relative z-10 flex flex-col justify-center px-16 py-24">
          <div className="max-w-md">
            {/* Logo */}
            <div className="mb-8">
              <Image
                src="/logo.png"
                alt="Be Creative Portal Logo"
                width={180}
                height={60}
                className="h-16 w-auto"
                priority
              />
            </div>

            <h1 className={`text-4xl font-bold ${colorScheme.textPrimary} mb-4`}>
              Be Creative Portal
            </h1>
            <p className={`text-lg ${colorScheme.textSecondary} mb-6`}>
              Streamline. Organize. Elevate.
            </p>
            <p className={`${colorScheme.textTertiary} text-base leading-relaxed`}>
              Manage assets, suppliers, accreditations, subscriptions, and resources—all in one unified platform.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-white px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg">
          {/* Welcome Section */}
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome Back
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Sign in to access your workspace and manage your digital resources seamlessly.
            </p>
          </div>

          {/* Login Button */}
          <div className="space-y-6">
            <Button
              onClick={handleAzureSignIn}
              disabled={isLoading}
              className="w-full h-14 bg-[#2F2F2F] hover:bg-[#1a1a1a] text-white font-semibold text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-3">
                  {/* Microsoft Logo - Colorful 4 squares */}
                  <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="10" height="10" fill="#F25022"/>
                    <rect x="11" width="10" height="10" fill="#7FBA00"/>
                    <rect y="11" width="10" height="10" fill="#00A4EF"/>
                    <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
                  </svg>
                  Sign in with Microsoft
                </span>
              )}
            </Button>

            {/* Access Notice - Below button */}
            <p className="text-center text-sm text-gray-500">
              Access restricted to <span className="text-gray-700 font-medium">@becreative.qa</span> domain only
            </p>

            {/* Supplier Registration Link */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-600 mb-3">
                Are you a supplier?
              </p>
              <a
                href="/suppliers/register"
                className="block w-full text-center py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                Register as a Supplier
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}