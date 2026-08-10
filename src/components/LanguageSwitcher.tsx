"use client";

import React from "react";
import { Globe } from "lucide-react";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { localeNames, locales, type Locale } from "@/i18n/config";

interface LanguageSwitcherProps {
  onLocaleChange?: (locale: Locale) => void;
}

export function LanguageSwitcher({ onLocaleChange }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocaleContext();

  const handleChange = (next: string) => {
    const value = next as Locale;
    setLocale(value);
    onLocaleChange?.(value);
  };

  return (
    <div className="relative flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
      <Globe className="h-4 w-4 text-slate-500 ml-2 shrink-0" />
      <select
        value={locale}
        onChange={(e) => handleChange(e.target.value)}
        className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 py-1 pl-1 pr-6 focus:outline-none cursor-pointer"
        aria-label="Language"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
