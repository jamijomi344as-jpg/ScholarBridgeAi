"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Printer, Award } from "lucide-react";

export interface CertificateData {
  id: number;
  certificateCode: string;
  issuedAt: string;
  courseTitle?: string;
  profileName?: string;
}

interface CertificateViewProps {
  certificate: CertificateData;
  profileName: string;
}

export function CertificateView({ certificate, profileName }: CertificateViewProps) {
  const t = useTranslations("courses");
  const holder = certificate.profileName || profileName;
  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md print:hidden transition-colors"
        >
          <Printer className="h-4 w-4" /> {t("print")}
        </button>
      </div>

      {/* Printable certificate layout */}
      <div className="bg-white rounded-2xl border-4 border-double border-indigo-300 shadow-lg p-8 print:border print:shadow-none">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg">
              <Award className="h-9 w-9" />
            </div>
          </div>

          <div>
            <p className="text-[10px] tracking-[0.35em] text-slate-400 font-bold uppercase">ScholarBridge AI</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{t("certificate")}</h2>
          </div>

          <div className="max-w-xl mx-auto">
            <p className="text-sm text-slate-500">{t("certificateHolder")}</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-700 mt-2 font-serif">
              {holder}
            </p>
            <p className="text-sm text-slate-500 mt-2">{t("hasCompleted")}</p>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {certificate.courseTitle || ""}
            </p>
          </div>

          <div className="flex items-center justify-center gap-8 pt-4 text-xs text-slate-500">
            <div>
              <p className="font-bold text-slate-700">{t("issuedOn")}</p>
              <p>{issuedDate}</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div>
              <p className="font-bold text-slate-700">{t("certificateCode")}</p>
              <p className="font-mono">{certificate.certificateCode}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
