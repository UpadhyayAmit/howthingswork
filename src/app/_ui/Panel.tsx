import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  className?: string;
  title?: string;
  accentColor?: string;
}

export default function Panel({ children, className, title, accentColor }: PanelProps) {
  return (
    <div
      className={cn(
        "bg-elevated border border-border rounded-[10px] overflow-hidden",
        className
      )}
      style={accentColor ? { borderTopColor: accentColor, borderTopWidth: 2 } : undefined}
    >
      {title && (
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
