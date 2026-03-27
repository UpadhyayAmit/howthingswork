import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export default function Card({ children, className, glow }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-xl p-5 transition-all duration-300",
        "hover:border-border-hover hover:bg-elevated/40",
        glow && "gradient-border glow-purple hover:shadow-[0_0_50px_rgba(168,85,247,0.12)]",
        className
      )}
    >
      {children}
    </div>
  );
}
