"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { NextIntlClientProvider } from "next-intl";
import { defaultLocale, isLocale, type Locale } from "./config";
import { dictionaries } from "./messages";
import { getLocaleCookie, setLocaleCookie } from "./locale";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: defaultLocale,
  setLocale: () => {},
});

export function useLocaleContext() {
  return useContext(LocaleContext);
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  // Read the persisted choice on mount. Rendering starts with the default
  // locale so the app shell paints immediately, then swaps to the stored one.
  useEffect(() => {
    const stored = getLocaleCookie();
    if (isLocale(stored)) {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setLocaleCookie(next);
  }, []);

  const messages = useMemo(
    () => dictionaries[locale] ?? dictionaries[defaultLocale],
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Tashkent">
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
