"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useState, useEffect } from "react";
import { NAV_ITEMS, type NavItem } from "@/lib/constants";
import { cn } from "@/lib/utils";

/* Inline SVG icons for categories */
const I = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={1.5}>
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const categoryIcons: Record<string, React.ReactNode> = {
  "/react": (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="2.5" />
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
    </svg>
  ),
  "/javascript": <I d="M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2zM9 12v5M14 12c2 0 2 5 0 5" />,
  "/csharp-clr": (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={1.5}>
      <path d="M6.5 15.5l-2-3.5 2-3.5h4l2 3.5-2 3.5h-4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 10h4M14 12h4M14 14h2" strokeLinecap="round" />
      <rect x="2" y="4" width="20" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "/aspnet-core": <I d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />,
  "/entity-framework": <I d="M4 6h16M4 10h16M4 14h16M4 18h16M8 6v12M16 6v12" />,
  "/azure": <I d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  "/architecture": <I d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4M9 9h.01M15 9h.01M9 13h.01M15 13h.01" />,
  "/microservices": <I d="M5 12h14M12 5v14M7.5 7.5l9 9M16.5 7.5l-9 9" />,
  "/testing": <I d="M9 12l2 2 4-4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />,
  "/system-design": <I d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />,
  "/ai-ml": <I d="M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4zM6 20v-1a6 6 0 0112 0v1M9 14l-3 6M15 14l3 6" />,
};

const categoryColors: Record<string, string> = {
  "/react": "text-cyan-400",
  "/javascript": "text-yellow-400",
  "/csharp-clr": "text-purple-400",
  "/aspnet-core": "text-blue-400",
  "/entity-framework": "text-amber-400",
  "/azure": "text-sky-400",
  "/architecture": "text-emerald-400",
  "/microservices": "text-rose-400",
  "/testing": "text-lime-400",
  "/system-design": "text-orange-400",
  "/ai-ml": "text-violet-400",
};

function NavLink({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const isActive = pathname === item.href;
  const isParentActive = pathname.startsWith(item.href) && item.href !== "/";
  const [expanded, setExpanded] = useState(isParentActive);

  useEffect(() => {
    setExpanded(isParentActive);
  }, [isParentActive]);

  const isTopLevel = depth === 0;
  const iconColor = categoryColors[item.href] || "text-accent";

  return (
    <div>
      <div className="flex items-center group">
        {/* Active indicator bar */}
        {isTopLevel && (
          <div
            className={cn(
              "w-[3px] h-8 rounded-full mr-2 transition-all duration-200",
              isParentActive || isActive
                ? "bg-accent opacity-100"
                : "bg-transparent opacity-0 group-hover:bg-border-hover group-hover:opacity-100"
            )}
          />
        )}
        <Link
          href={item.href}
          className={cn(
            "flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200",
            depth > 0 && "ml-6 text-[13px] py-1.5",
            isActive
              ? "bg-accent/12 text-accent font-semibold"
              : isParentActive && isTopLevel
                ? "text-text-primary font-medium"
                : "text-text-secondary hover:text-text-primary hover:bg-elevated/60"
          )}
        >
          {/* Category icon */}
          {isTopLevel && categoryIcons[item.href] && (
            <span className={cn("flex-shrink-0", isActive || isParentActive ? iconColor : "text-text-secondary group-hover:text-text-primary transition-colors")}>
              {categoryIcons[item.href]}
            </span>
          )}
          {/* Child bullet */}
          {depth > 0 && (
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors",
                isActive ? "bg-accent" : "bg-border group-hover:bg-text-secondary"
              )}
            />
          )}
          {item.label}
        </Link>
        {item.children && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-text-secondary hover:text-text-primary rounded-md hover:bg-elevated/60 transition-colors"
          >
            <svg
              className={cn(
                "w-3.5 h-3.5 transition-transform duration-200",
                expanded && "rotate-90"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
      </div>
      {item.children && expanded && (
        <div className="mt-0.5 space-y-0.5">
          {item.children.map((child) => (
            <NavLink key={child.href} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-full h-screen bg-surface border-r border-border flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/25 to-accent-cyan/25 border border-accent/20 flex items-center justify-center transition-all duration-300 group-hover:from-accent/35 group-hover:to-accent-cyan/35 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <span className="font-bold text-sm gradient-text">HT</span>
          </div>
          <div>
            <span className="font-bold text-base text-text-primary">How Things Work</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <span className="text-xs text-text-muted font-mono">howthingswork.aiwisdom.dev</span>
      </div>
    </aside>
  );
}
