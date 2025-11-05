'use client';

import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

// ========================================
// COLOR SCHEME OPTIONS
// Uncomment ONE option below to activate
// ========================================

// CURRENTLY ACTIVE - Slate Blue with Custom Button
const colorScheme = {
  gradient: 'from-slate-900 via-blue-950 to-slate-950',
  textPrimary: 'text-blue-50',
  textSecondary: 'text-blue-200',
  textTertiary: 'text-blue-300',
  // BUTTON OPTIONS - Uncomment your preferred style:

  // Option A: Lighter Blue (Stands out more)
  // button: 'bg-blue-500 hover:bg-blue-600',
  // focusRing: 'focus:border-blue-400 focus:ring-blue-400',

  // Option B: Slate Gray (Subtle, minimal) - CURRENTLY ACTIVE
  button: 'bg-slate-600 hover:bg-slate-700',
  focusRing: 'focus:border-slate-400 focus:ring-slate-400',

  // Option C: Dark Blue (Matches background tone)
  // button: 'bg-blue-800 hover:bg-blue-700',
  // focusRing: 'focus:border-blue-600 focus:ring-blue-600',

  // Option D: White/Light (High contrast)
  // button: 'bg-white hover:bg-gray-100 text-gray-900',
  // focusRing: 'focus:border-gray-300 focus:ring-gray-300',
};

// OPTION 2: Deep Purple (Creative & Bold)
// const colorScheme = {
//   gradient: 'from-violet-900 via-purple-900 to-fuchsia-950',
//   textPrimary: 'text-violet-50',
//   textSecondary: 'text-violet-200',
//   textTertiary: 'text-violet-300',
//   button: 'bg-violet-600 hover:bg-violet-700',
//   focusRing: 'focus:border-violet-500 focus:ring-violet-500',
// };

// OPTION 3: Emerald Green (Fresh & Modern)
// const colorScheme = {
//   gradient: 'from-emerald-900 via-teal-900 to-cyan-950',
//   textPrimary: 'text-emerald-50',
//   textSecondary: 'text-emerald-200',
//   textTertiary: 'text-emerald-300',
//   button: 'bg-emerald-600 hover:bg-emerald-700',
//   focusRing: 'focus:border-emerald-500 focus:ring-emerald-500',
// };

// OPTION 4: Rose Gold (Warm & Sophisticated)
// const colorScheme = {
//   gradient: 'from-rose-950 via-pink-950 to-purple-950',
//   textPrimary: 'text-rose-50',
//   textSecondary: 'text-rose-200',
//   textTertiary: 'text-rose-300',
//   button: 'bg-rose-600 hover:bg-rose-700',
//   focusRing: 'focus:border-rose-500 focus:ring-rose-500',
// };

// OPTION 5: Ocean Teal (Cool & Tech-forward)
// const colorScheme = {
//   gradient: 'from-cyan-900 via-blue-900 to-indigo-950',
//   textPrimary: 'text-cyan-50',
//   textSecondary: 'text-cyan-200',
//   textTertiary: 'text-cyan-300',
//   button: 'bg-cyan-600 hover:bg-cyan-700',
//   focusRing: 'focus:border-cyan-500 focus:ring-cyan-500',
// };

// OPTION 6: Charcoal Gray (Minimal & Clean)
// const colorScheme = {
//   gradient: 'from-gray-900 via-slate-900 to-zinc-950',
//   textPrimary: 'text-gray-50',
//   textSecondary: 'text-gray-300',
//   textTertiary: 'text-gray-400',
//   button: 'bg-gray-600 hover:bg-gray-700',
//   focusRing: 'focus:border-gray-500 focus:ring-gray-500',
// };

// OPTION 7: Amber Orange (Energetic & Warm)
// const colorScheme = {
//   gradient: 'from-orange-900 via-amber-900 to-yellow-950',
//   textPrimary: 'text-amber-50',
//   textSecondary: 'text-amber-200',
//   textTertiary: 'text-amber-300',
//   button: 'bg-amber-600 hover:bg-amber-700',
//   focusRing: 'focus:border-amber-500 focus:ring-amber-500',
// };

// OPTION 8: Indigo Night (Deep & Mysterious)
// const colorScheme = {
//   gradient: 'from-indigo-950 via-blue-950 to-slate-950',
//   textPrimary: 'text-indigo-50',
//   textSecondary: 'text-indigo-200',
//   textTertiary: 'text-indigo-300',
//   button: 'bg-indigo-600 hover:bg-indigo-700',
//   focusRing: 'focus:border-indigo-500 focus:ring-indigo-500',
// };

// OPTION 9: Forest Green (Natural & Calm)
// const colorScheme = {
//   gradient: 'from-green-900 via-emerald-950 to-teal-950',
//   textPrimary: 'text-green-50',
//   textSecondary: 'text-green-200',
//   textTertiary: 'text-green-300',
//   button: 'bg-green-600 hover:bg-green-700',
//   focusRing: 'focus:border-green-500 focus:ring-green-500',
// };

// OPTION 10: Crimson Red (Bold & Powerful)
// const colorScheme = {
//   gradient: 'from-red-900 via-rose-950 to-pink-950',
//   textPrimary: 'text-red-50',
//   textSecondary: 'text-red-200',
//   textTertiary: 'text-red-300',
//   button: 'bg-red-600 hover:bg-red-700',
//   focusRing: 'focus:border-red-500 focus:ring-red-500',
// };

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLocalLogin, setShowLocalLogin] = useState(false);
  const [showAzureLogin, setShowAzureLogin] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    getSession().then((session) => {
      if (session) {
        router.push('/');
      }
    });

    // Check if local credentials are enabled
    if (process.env.NEXT_PUBLIC_ALLOW_LOCAL_CREDENTIALS === 'true') {
      setShowLocalLogin(true);
    }

    // Check if Azure AD is configured by trying to get providers
    fetch('/api/auth/providers')
      .then(res => res.json())
      .then(providers => {
        setShowAzureLogin('azure-ad' in providers);
      })
      .catch(() => {
        setShowAzureLogin(false);
      });
  }, [router]);

  const handleAzureSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('azure-ad', { callbackUrl: '/' });
    } catch (error) {
      console.error('Azure sign in error:', error);
    }
    setIsLoading(false);
  };

  const handleLocalSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.ok) {
        router.push('/');
      } else {
        toast.error('Invalid credentials. Use password: dev123');
      }
    } catch (error) {
      console.error('Local sign in error:', error);
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
            {showAzureLogin && (
              <>
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
              </>
            )}

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