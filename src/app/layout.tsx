import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const LOGO_URL = "https://llwrzitajdsnqzpvflnj.supabase.co/storage/v1/object/public/LOGO/logo.png";
const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://scholarbridge-ai.onrender.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ScholarBridge — Xorijda O'qish, Grant va Universitet Tanlash Platformasi",
    template: "%s | ScholarBridge",
  },
  description:
    "ScholarBridge — GPA, IELTS va byudjetga mos xorijiy universitetlar va grantlarni toping. Universitet tanlash, SOP yozish va ariza topshirishda AI yordami.",
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
    "ScholarBridge",
  ],
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    url: SITE_URL,
    siteName: "ScholarBridge",
    title: "ScholarBridge — Xorijda O'qish, Grant va Universitet Tanlash Platformasi",
    description:
      "GPA, IELTS va byudjetga mos xorijiy universitetlar va grantlarni toping. Universitet tanlash, SOP yozish va ariza topshirishda AI yordami.",
    images: [
      {
        url: LOGO_URL,
        width: 512,
        height: 512,
        alt: "ScholarBridge logotipi",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: LOGO_URL,
    apple: LOGO_URL,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
