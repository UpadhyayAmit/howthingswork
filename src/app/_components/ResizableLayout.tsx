"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Props = {
  sidebar: React.ReactNode;
  children: React.ReactNode;
};

const MIN_WIDTH = 220;
const MAX_WIDTH = 450;
const DEFAULT_WIDTH = 280;

export default function ResizableLayout({ sidebar, children }: Props) {
  const pathname = usePathname();
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-close mobile menu when navigating
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      
      if (newWidth < 80) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
        setSidebarWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth)));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div ref={containerRef} className="flex flex-col lg:flex-row min-h-screen bg-[#0b0f19] relative">
      
      {/* ─── MOBILE HEADER ─── */}
      <div className="lg:hidden h-16 border-b border-border/50 bg-[#0d1117] flex items-center justify-between px-5 sticky top-0 z-[100]">
        <button 
          onClick={toggleMobileMenu}
          className="p-2 -ml-2 text-text-secondary hover:text-white transition-colors"
        >
          {isMobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#a855f7] flex items-center justify-center font-black text-white text-xs">HT</div>
          <span className="font-bold text-white text-sm tracking-tight">How Things Work</span>
        </div>
        
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* ─── MOBILE DRAWER (Backdrop) ─── */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ─── SIDEBAR (Responsive) ─── */}
      <div
        className={cn(
          "fixed lg:sticky top-0 h-screen z-[120] lg:z-[90] transition-transform lg:transition-none overflow-hidden border-r border-border/40 bg-[#0d1117]",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          width: collapsed ? 0 : sidebarWidth,
          transition: isDragging ? "none" : "width 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div style={{ width: sidebarWidth, minWidth: sidebarWidth }} className="h-full">
          {sidebar}
        </div>
      </div>

      {/* ─── DESKTOP DRAG HANDLE ─── */}
      <div
        className="hidden lg:block relative flex-shrink-0 z-[100] group"
        style={{ width: 6 }}
      >
        <div
          onMouseDown={handleMouseDown}
          className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize z-50"
        />
        <div
          className="absolute inset-y-0 left-[2px] w-[2px] transition-all duration-200"
          style={{
            background: isDragging ? "var(--color-accent)" : "var(--color-border)",
          }}
        />
        
        <button
          onClick={toggleCollapse}
          className="absolute top-[50%] -translate-y-1/2 -left-3 w-6 h-6 rounded-full border flex items-center justify-center text-xs transition-all duration-200 opacity-0 group-hover:opacity-100 hover:!opacity-100 bg-[#111827] border-[#374151] text-text-secondary z-[110]"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={cn("w-3 h-3 transition-transform", collapsed && "rotate-180")}>
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 min-w-0 min-h-screen flex flex-col relative">
        {children}
      </main>
    </div>
  );
}
