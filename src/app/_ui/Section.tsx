import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export default function Section({
  children,
  className,
  title,
  subtitle,
}: SectionProps) {
  return (
    <section className={cn("mb-8", className)}>
      {title && (
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
          {subtitle && (
            <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
