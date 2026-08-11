import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const LOGO_URL = "https://llwrzitajdsnqzpvflnj.supabase.co/storage/v1/object/public/LOGO/logo.png";

export const metadata: Metadata = {
  title: {
    default: "ScholarBridge AI",
    template: "%s | ScholarBridge AI",
  },
  description: "ScholarBridge AI — Global Admissions & Scholarship Discovery",
  icons: {
    icon: LOGO_URL,
    apple: LOGO_URL,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
