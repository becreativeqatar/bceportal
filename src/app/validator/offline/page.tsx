'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function OfflinePage() {
  const router = useRouter();

  const handleRetry = () => {
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* Mobile-sized container - centered on desktop, full width on mobile */}
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 rounded-full mb-6">
            <WifiOff className="h-10 w-10 text-orange-600" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">You&apos;re Offline</h1>

          <p className="text-gray-600 mb-6">
            It looks like you&apos;ve lost your internet connection. Some features may not be available.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-2">Available Offline:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• View recently scanned badges</li>
              <li>• Access cached accreditation data</li>
              <li>• Scan history</li>
            </ul>
          </div>

          <Button onClick={handleRetry} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>

          <p className="text-xs text-gray-500 mt-4">
            The app will automatically reconnect when your internet is restored
          </p>
        </div>
      </div>
    </div>
  );
}
