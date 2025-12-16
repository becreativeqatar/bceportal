import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#475569",
};

export const metadata: Metadata = {
  title: "Validator - Be Creative Portal",
  description: "Scan and verify event accreditation badges",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Validator",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    apple: "/logo.png",
  },
};

export default function ValidatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
