import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  className?: string;
  title?: string;
  accentColor?: string;
  noPadding?: boolean;
}

export default function Panel({ children, className, title, accentColor, noPadding = false }: PanelProps) {
  return (
    <div
      className={cn(
        "bg-elevated border border-border rounded-[10px] overflow-hidden shadow-sm",
        className
      )}
      style={accentColor ? { borderTopColor: accentColor, borderTopWidth: 2 } : undefined}
    >
      {title && (
        <div className="px-4 py-3 border-b border-border bg-background/30">
          <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">{title}</h3>
        </div>
      )}
      <div className={cn("overflow-x-auto scrollbar-thin scrollbar-thumb-border", !noPadding && "p-4")}>
        {children}
      </div>
    </div>
  );
}
