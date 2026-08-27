import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/app/providers";
import { BRAND_DESCRIPTION, BRAND_NAME } from "@/lib/brand";
import { isMatchonDesktopRequest } from "@/lib/desktop/request";
import { DESKTOP_APP_HTML_CLASS } from "@/lib/ui/desktop-app-layout";
import { cn } from "@/lib/utils";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: BRAND_NAME,
  title: {
    default: BRAND_NAME,
    template: `%s | ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  icons: {
    // Tab favicon SSOT: fixed #0A47FF assets only (no currentColor /brand SVG)
    icon: [
      { url: "/favicon.svg?v=brand-blue-2", type: "image/svg+xml" },
      { url: "/favicon.ico?v=brand-blue-2", sizes: "any" },
      { url: "/icon.png?v=brand-blue-2", sizes: "32x32", type: "image/png" },
      {
        url: "/icons/icon-192.png?v=brand-blue-2",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/icon-512.png?v=brand-blue-2",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-icon.png?v=brand-blue-2",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: ["/favicon.ico?v=brand-blue-2"],
  },
  openGraph: {
    siteName: BRAND_NAME,
    locale: "ko_KR",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDesktop = await isMatchonDesktopRequest();

  return (
    <html
      lang="ko"
      className={cn(
        `${geistSans.variable} ${geistMono.variable} h-full antialiased`,
        isDesktop && DESKTOP_APP_HTML_CLASS,
      )}
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
