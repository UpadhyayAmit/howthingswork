"use client";

import { ReactNode } from "react";

export default function ThemeProvider({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-bg text-text-primary">{children}</div>;
}
