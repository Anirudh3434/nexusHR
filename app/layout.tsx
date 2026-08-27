import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../context/ThemeContext";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";
import { ToastContainer } from "../components/ui/Toast";

const sourceSans3 = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const siteUrl = "https://nexus-hr-udh9.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "NexusHR — Unified Platform for HR & Projects",
    template: "%s | NexusHR",
  },
  description:
    "NexusHR is a unified HR management system and project management platform for modern enterprise teams. Geo-fenced attendance, leave management, automated payroll, GitHub-integrated sprint boards, and AI-powered insights — all in one portal.",
  keywords: [
    "HR software", "human resources management", "HRM system",
    "attendance tracking", "leave management", "payroll software",
    "employee management", "project management AI", "expense tracking",
    "team collaboration", "geo-fencing attendance", "HR dashboard",
    "NexusHR", "modern HRM", "employee portal",
  ],
  authors: [{ name: "Anirudh Bhardwaj" }],
  creator: "Anirudh Bhardwaj",
  publisher: "NexusHR",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "NexusHR",
    title: "NexusHR — Unified Platform for HR & Projects",
    description:
      "NexusHR is a unified HR management system and project management platform for modern enterprise teams. Geo-fenced attendance, leave management, automated payroll, and AI-powered insights.",
    images: [
      {
        url: "/favicon.png",
        width: 1024,
        height: 1024,
        alt: "NexusHR Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NexusHR — Unified Platform for HR & Projects",
    description:
      "NexusHR is a unified HR management system and project management platform for modern enterprise teams. Geo-fenced attendance, leave management, automated payroll, and AI-powered insights.",
    images: ["/favicon.png"],
    creator: "@anirudh3434",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "NexusHR",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  description:
    "Modern HR Management System with attendance tracking, leave management, payroll processing, AI-powered project management, and real-time team collaboration.",
  url: siteUrl,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Person",
    name: "Anirudh Bhardwaj",
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "NexusHR",
  url: siteUrl,
  logo: `${siteUrl}/favicon.png`,
  description:
    "All-in-one HR Management System for modern teams.",
  founder: {
    "@type": "Person",
    name: "Anirudh Bhardwaj",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={sourceSans3.variable} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className={`${sourceSans3.className} bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50 min-h-screen transition-colors`}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
              <ToastContainer />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
