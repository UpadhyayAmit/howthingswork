"use client";

import LocaleSwitcher from "./LocaleSwitcher";
import Image from "next/image";

export default function Topbar() {
  return (
    <header className="h-14 glass border-b border-border/60 flex items-center px-6 sticky top-0 z-40">
      {/* Accent gradient line at the very top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      <Image
        src="/logo.png"
        alt="HowThingsWork logo"
        width={32}
        height={32}
        priority
      />

      <div className="ml-auto flex items-center gap-4">
        <LocaleSwitcher />
      </div>
    </header>
  );
}
