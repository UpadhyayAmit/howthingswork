"use client";

import LocaleSwitcher from "./LocaleSwitcher";
import { Link } from "@/i18n/navigation";
import { SITE_TITLE } from "@/lib/constants";

export default function Topbar() {
  return (
    <header className="h-14 glass border-b border-border/60 flex items-center px-6 sticky top-0 z-40">
      {/* Accent gradient line at the very top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      <Link href="/" className="flex items-center gap-2 group">
        <h1 className="text-sm font-medium text-text-secondary tracking-wide group-hover:text-text-primary transition-colors">
          {SITE_TITLE}
        </h1>
      </Link>

      <div className="ml-auto flex items-center gap-4">
        <LocaleSwitcher />
      </div>
    </header>
  );
}
