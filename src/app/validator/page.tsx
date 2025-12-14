'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QrCode, Search, X, Camera, ShieldCheck } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Image from 'next/image';

export default function ValidatorDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [qrToken, setQrToken] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [autoScanTriggered, setAutoScanTriggered] = useState(false);

  useEffect(() => {
    // Check if we should auto-scan (from URL parameter)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autoScan') === 'true' && !autoScanTriggered) {
      setAutoScanTriggered(true);
      // Small delay to ensure component is mounted
      setTimeout(() => {
        handleScan();
      }, 300);
    }
  }, []);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (qrToken.trim()) {
      router.push(`/verify/${qrToken.trim().toUpperCase()}`);
    }
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase();

    // Auto-add dash after 3 characters (ACC-)
    if (value.length === 3 && !value.includes('-')) {
      value = value + '-';
    }

    setQrToken(value);
  };

  const handleScan = async () => {
    setIsScanning(true);
    setScanError(null);

    try {
      // First check if we have camera permissions
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          // Request camera permission first
          await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (permErr) {
          console.error('Camera permission denied:', permErr);
          setScanError('Camera permission denied. Please allow camera access.');
          setIsScanning(false);
          return;
        }
      } else {
        setScanError('Camera not supported on this device or browser.');
        setIsScanning(false);
        return;
      }

      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          console.log('[Scanner] Decoded QR:', decodedText);

          // First, try to extract token from URL pattern (our accreditation URLs)
          const urlPattern = /\/verify\/([a-zA-Z0-9-]+)$/;
          const match = decodedText.match(urlPattern);
          const token = match ? match[1] : decodedText.trim();

          console.log('[Scanner] Extracted token:', token);

          // If we extracted a token from our URL pattern, use it directly
          if (match) {
            html5QrCode.stop().then(() => {
              setIsScanning(false);
              router.push(`/verify/${token}`);
            }).catch(console.error);
            return;
          }

          // If it's not our URL pattern, validate the raw token
          // Check if it looks like an external URL (not our accreditation)
          if (token.startsWith('http://') || token.startsWith('https://')) {
            html5QrCode.stop().then(() => {
              setIsScanning(false);
              setScanError('Invalid QR Code - This appears to be an external link, not an accreditation code.');
            }).catch(console.error);
            return;
          }

          // Limit token length to prevent abuse
          if (token.length > 50) {
            html5QrCode.stop().then(() => {
              setIsScanning(false);
              setScanError('Invalid QR Code - The scanned code is too long to be a valid accreditation.');
            }).catch(console.error);
            return;
          }

          // Only allow alphanumeric and hyphens (accreditation format: ACC-0001 or UUID)
          if (!/^[a-zA-Z0-9-]+$/.test(token)) {
            html5QrCode.stop().then(() => {
              setIsScanning(false);
              setScanError('Invalid QR Code - This does not appear to be a valid accreditation code.');
            }).catch(console.error);
            return;
          }

          // Stop scanning and verify
          html5QrCode.stop().then(() => {
            setIsScanning(false);
            router.push(`/verify/${token}`);
          }).catch(console.error);
        },
        (errorMessage) => {
          // QR code scan error - ignore, fires continuously while scanning
        }
      );
    } catch (err: any) {
      console.error('Error starting QR scanner:', err);

      let errorMsg = 'Failed to access camera. ';
      if (err.name === 'NotAllowedError') {
        errorMsg += 'Please allow camera access.';
      } else if (err.name === 'NotFoundError') {
        errorMsg += 'No camera found.';
      } else if (err.name === 'NotReadableError') {
        errorMsg += 'Camera is already in use.';
      } else if (err.name === 'NotSupportedError') {
        errorMsg += 'HTTPS is required for camera access.';
      } else {
        errorMsg += err.message || 'Unknown error occurred.';
      }

      setScanError(errorMsg);
      setIsScanning(false);
    }
  };

  const handleStopScan = () => {
    if (html5QrCodeRef.current?.isScanning) {
      html5QrCodeRef.current.stop().then(() => {
        setIsScanning(false);
        setScanError(null);
      }).catch(console.error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* Mobile-sized container - centered on desktop, full width on mobile */}
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Welcome Section */}
          <div className="text-center mb-6 lg:mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">
              Verify Badge
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
              Scan QR code or enter accreditation number
            </p>
          </div>

          {/* Scanner Actions */}
          <div className="space-y-6">
            {/* Scan Button */}
            <Button
              onClick={handleScan}
              disabled={isScanning}
              className="w-full h-14 bg-[#2F2F2F] hover:bg-[#1a1a1a] text-white font-semibold text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isScanning ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Opening Camera...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-3">
                  <Camera className="h-5 w-5" />
                  Scan QR Code
                </span>
              )}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">or enter manually</span>
              </div>
            </div>

            {/* Manual Input */}
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter accreditation number (e.g., ACC-0001)..."
                  value={qrToken}
                  onChange={handleTokenChange}
                  className="flex-1 h-12 text-base"
                />
                <Button type="submit" className="h-12 px-6">
                  <Search className="h-5 w-5" />
                </Button>
              </div>
            </form>

            {/* Error Message */}
            {scanError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium">{scanError}</p>
              </div>
            )}

            {/* User Info */}
            <div className="pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600">
                Logged in as <span className="font-semibold text-gray-900">{session?.user?.name || session?.user?.email}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {isScanning && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Scanning...</h2>
              <button
                onClick={handleStopScan}
                className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-full transition-colors z-50 relative"
                aria-label="Close scanner"
              >
                <X className="h-8 w-8" />
              </button>
            </div>

            <div id="qr-reader" className="rounded-xl overflow-hidden shadow-lg"></div>

            <p className="text-base text-gray-600 mt-6 text-center font-medium">
              Position the QR code within the frame
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
