import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Validator - Be Creative Portal",
  description: "Scan and verify event accreditation badges",
  manifest: "/manifest.json",
  themeColor: "#475569",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Validator",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
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
