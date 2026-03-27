"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";

type Props = {
  sidebar: React.ReactNode;
  children: React.ReactNode;
};

const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 256; // w-64

export default function ResizableLayout({ sidebar, children }: Props) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
      if (newWidth < 60) {
        setCollapsed(true);
        setSidebarWidth(DEFAULT_WIDTH);
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

  return (
    <div ref={containerRef} className="flex relative" style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <div
        className="h-screen sticky top-0 flex-shrink-0 overflow-hidden"
        style={{
          width: collapsed ? 0 : sidebarWidth,
          transition: isDragging ? "none" : "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div style={{ width: sidebarWidth, minWidth: sidebarWidth }}>
          {sidebar}
        </div>
      </div>

      {/* Drag handle / Splitter */}
      <div
        className="relative flex-shrink-0 z-50 group"
        style={{ width: 6 }}
      >
        {/* Invisible hover area */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize z-50"
        />
        {/* Visual line */}
        <div
          className="absolute inset-y-0 left-[2px] w-[2px] transition-all duration-200"
          style={{
            background: isDragging
              ? "var(--color-accent, #a855f7)"
              : "var(--color-border, #1f2937)",
          }}
        />
        {/* Glow on drag */}
        {isDragging && (
          <div
            className="absolute inset-y-0 left-0 w-[6px]"
            style={{
              background: "linear-gradient(90deg, rgba(168,85,247,0.2), transparent)",
            }}
          />
        )}

        {/* Collapse / Expand toggle button */}
        <button
          onClick={toggleCollapse}
          className="absolute top-[50%] -translate-y-1/2 -left-3 w-6 h-6 rounded-full border flex items-center justify-center text-xs transition-all duration-200 opacity-0 group-hover:opacity-100 hover:!opacity-100"
          style={{
            background: "var(--color-surface, #111827)",
            borderColor: "var(--color-border, #374151)",
            color: "var(--color-text-secondary, #9ca3af)",
            zIndex: 60,
          }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="w-3 h-3"
            style={{
              transform: collapsed ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          >
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
}
