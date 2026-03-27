"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { routing, localeLabels, localeFlags, type Locale } from "@/i18n/routing";

export default function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname(); // path WITHOUT locale prefix, e.g. "/react/fiber-visualizer"
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function switchLocale(next: Locale) {
    setOpen(false);
    startTransition(() => {
      // next-intl's router.replace handles adding/removing locale prefix automatically
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-elevated hover:border-accent/40 transition-colors text-sm font-mono ${isPending ? "opacity-60" : ""}`}
        title="Switch language"
      >
        <span>{localeFlags[locale]}</span>
        <span className="text-text-secondary hidden sm:inline">
          {localeLabels[locale]}
        </span>
        <svg
          className={`w-3 h-3 text-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-2 w-48 bg-elevated border border-border rounded-lg shadow-xl overflow-hidden z-50"
          >
            {routing.locales.map((loc) => (
              <button
                key={loc}
                onClick={() => switchLocale(loc as Locale)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-accent/10 transition-colors ${
                  loc === locale
                    ? "text-accent font-semibold bg-accent/5"
                    : "text-text-primary"
                }`}
              >
                <span className="text-base">{localeFlags[loc]}</span>
                <span>{localeLabels[loc]}</span>
                {loc === locale && (
                  <svg
                    className="ml-auto w-3.5 h-3.5 text-accent"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
