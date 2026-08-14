import type { ReactNode } from "react";
import Link from "next/link";

const LOGO_URL =
  "https://llwrzitajdsnqzpvflnj.supabase.co/storage/v1/object/public/LOGO/logo.png";

/**
 * Shared layout for the auth pages (login / signup / verify-email):
 * centered card on the indigo-violet gradient background.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-800 flex flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="flex items-center gap-2.5 mb-8">
        <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_URL} alt="ScholarBridge Logo" className="h-11 w-11 object-cover" />
        </div>
        <div>
          <div className="font-extrabold text-xl tracking-tight text-white">ScholarBridge</div>
          <p className="text-[11px] text-indigo-200">Global Admissions &amp; Scholarship Discovery</p>
        </div>
      </Link>
      {children}
      <p className="mt-8 text-[11px] text-indigo-200/70 text-center max-w-sm leading-relaxed">
        ScholarBridge — GPA, IELTS va byudjetingizga mos xorijiy universitetlar va
        grantlarni topish platformasi.
      </p>
    </div>
  );
}
