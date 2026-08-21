import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://scholarbridgeai-1.onrender.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Google Search Console ownership verification (renders the
  // <meta name="google-site-verification" .../> tag in <head>).
  verification: {
    google: "EZ2ipQrYUQxTQEBlEGYcqAOfVHm6pc0oIm1BYkN2VTs",
  },
  title: {
    default: "ScholarBridgeAI — Xorijda O'qish, Grant va Universitet Tanlash",
    template: "%s | ScholarBridgeAI",
  },
  description:
    "ScholarBridgeAI — GPA, IELTS va byudjetga mos xorijiy universitetlar va grantlarni toping. Universitet tanlash, SOP yozish va ariza topshirishda AI yordami.",
  keywords: [
    "xorijda o'qish",
    "grant",
    "stipendiya",
    "universitet tanlash",
    "IELTS",
    "GPA",
    "SOP yozish",
    "magistratura",
    "bakalavriat",
    "DAAD",
    "Chevening",
    "Erasmus Mundus",
    "Fulbright",
    "xalqaro talaba",
    "xorijiy universitetlar",
    "ScholarBridgeAI",
    "ScholarBridge",
  ],
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    url: SITE_URL,
    siteName: "ScholarBridgeAI",
    title: "ScholarBridgeAI — Xorijda O'qish, Grant va Universitet Tanlash",
    description:
      "ScholarBridgeAI — GPA, IELTS va byudjetga mos xorijiy universitetlar va grantlarni toping. Universitet tanlash, SOP yozish va ariza topshirishda AI yordami.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ScholarBridgeAI logotipi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ScholarBridgeAI — Xorijda O'qish, Grant va Universitet Tanlash",
    description:
      "ScholarBridgeAI — GPA, IELTS va byudjetga mos xorijiy universitetlar va grantlarni toping. Universitet tanlash, SOP yozish va ariza topshirishda AI yordami.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
