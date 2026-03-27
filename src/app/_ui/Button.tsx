import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-all",
        // Variants
        variant === "primary" &&
          "bg-accent text-white hover:bg-accent/90 shadow-[0_0_20px_rgba(168,85,247,0.2)]",
        variant === "secondary" &&
          "bg-elevated text-text-primary border border-border hover:border-accent/50",
        variant === "ghost" &&
          "text-text-secondary hover:text-text-primary hover:bg-elevated",
        // Sizes
        size === "sm" && "px-3 py-1.5 text-xs",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
