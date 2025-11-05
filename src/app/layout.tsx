import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import { Providers } from "@/components/providers";
import MainContent from "@/components/main-content";
// Force rebuild to generate new chunk hashes

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Be Creative Portal",
  description: "Be Creative business operations and management portal",
  manifest: "/manifest.json",
  themeColor: "#475569",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Be Creative Portal",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    apple: "/logo.png",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <Header />
          <MainContent>{children}</MainContent>
        </Providers>
      </body>
    </html>
  );
}
