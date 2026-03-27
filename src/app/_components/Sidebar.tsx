"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useState, useEffect } from "react";
import { NAV_ITEMS, type NavItem } from "@/lib/constants";
import { cn } from "@/lib/utils";

/* Emoji Map for Sidebar */
const categoryEmojis: Record<string, string> = {
  "/react": "⚛️",
  "/javascript": "🟨",
  "/csharp-clr": "🟣",
  "/aspnet-core": "🌐",
  "/entity-framework": "🗄️",
  "/azure": "☁️",
  "/architecture": "🏛️",
  "/microservices": "🔗",
  "/testing": "✅",
  "/system-design": "⚙️",
  "/ai-ml": "🤖",
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
  
  /* REFINED FONT SIZES: Not too big, not too small */
  const fontSizeClass = isTopLevel 
    ? "text-[15px] font-semibold py-2" 
    : "text-[13px] py-1.5 ml-6";

  return (
    <div>
      <div className="flex items-center group">
        {/* Active indicator bar */}
        {isTopLevel && (
          <div
            className={cn(
              "w-[4px] h-8 rounded-full mr-2 transition-all duration-200",
              isParentActive || isActive
                ? "bg-accent opacity-100"
                : "bg-transparent opacity-0 group-hover:bg-border-hover group-hover:opacity-100"
            )}
          />
        )}
        <Link
          href={item.href}
          className={cn(
            "flex-1 flex items-center gap-3 px-3 rounded-xl transition-all duration-200",
            fontSizeClass,
            isActive
              ? "bg-accent/15 text-accent shadow-lg shadow-accent/5"
              : isParentActive && isTopLevel
                ? "text-text-primary bg-white/5"
                : "text-text-secondary hover:text-text-primary hover:bg-elevated/80"
          )}
        >
          {/* Color Emoji instead of SVG */}
          {isTopLevel && (
            <span className="text-xl flex-shrink-0 grayscale-[0.2] group-hover:grayscale-0 transition-all duration-300">
              {categoryEmojis[item.href] || "📁"}
            </span>
          )}
          
          {/* Child bullet */}
          {depth > 0 && (
            <span
              className={cn(
                "w-2 h-2 rounded-full flex-shrink-0 transition-colors mr-1",
                isActive ? "bg-accent" : "bg-border group-hover:bg-text-secondary"
              )}
            />
          )}

          <span className="truncate tracking-tight">{item.label}</span>
        </Link>
        
        {item.children && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-elevated/80 transition-colors mr-1"
          >
            <svg
              className={cn(
                "w-4 h-4 transition-transform duration-300",
                expanded && "rotate-90"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
      
      {item.children && expanded && (
        <div className="mt-1 space-y-1">
          {item.children.map((child) => (
            <NavLink key={child.href} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border-r border-[#1e293b]">
      {/* Brand area */}
      <div className="p-5 pb-6">
        <Link
          href="/"
          className="flex items-center gap-3.5 group transition-transform active:scale-95"
        >
          {/* HT Icon with exact screenshot styling */}
          <div className="w-11 h-11 rounded-[14px] bg-[#1a2234] border border-[#2d3748] flex items-center justify-center shadow-2xl relative overflow-hidden group-hover:border-accent/40 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-50" />
            <span className="relative z-10 flex font-black text-[17px] tracking-tight">
              <span className="text-[#3b82f6]">H</span>
              <span className="text-[#a855f7]">T</span>
            </span>
          </div>
          
          <span className="text-[17px] font-bold tracking-tight text-white group-hover:text-accent transition-colors">
            How Things Work
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1.5 scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-text-muted">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <div className="bg-elevated/40 rounded-xl p-3 border border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              System Online
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
