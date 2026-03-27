"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface UseCase {
  title: string;
  scenario: string;
  problem: string;
  solution: string;
  takeaway: string;
}

interface RealWorldUseCaseProps {
  useCases: UseCase[];
  className?: string;
}

export default function RealWorldUseCase({
  useCases,
  className,
}: RealWorldUseCaseProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className={cn("mt-8 space-y-6", className)}
    >
      {/* Section header */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <span className="text-xs font-mono text-text-secondary uppercase tracking-widest px-3 py-1 rounded-full bg-elevated border border-border flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />
          Real-World Use Cases
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-border via-transparent to-transparent" />
      </div>

      {/* Use case cards */}
      <div className="space-y-4">
        {useCases.map((uc, i) => (
          <motion.div
            key={uc.title}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55 + i * 0.08 }}
            className="bg-elevated/50 border border-border rounded-xl p-5 hover:border-accent-cyan/30 transition-all duration-200"
          >
            {/* Title */}
            <h4
              className="text-base font-bold text-text-primary mb-3 flex items-center gap-2"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-accent-cyan/20 to-accent/10 border border-accent-cyan/30 flex items-center justify-center text-[10px] font-mono font-bold text-accent-cyan">
                {i + 1}
              </span>
              {uc.title}
            </h4>

            {/* Scenario */}
            <div className="mb-3">
              <span className="text-[11px] font-mono uppercase tracking-widest text-text-muted mb-1 block">
                Scenario
              </span>
              <p className="text-sm text-text-secondary leading-relaxed">
                {uc.scenario}
              </p>
            </div>

            {/* Problem & Solution grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div className="bg-surface/60 border border-border rounded-lg p-3">
                <span className="text-[11px] font-mono uppercase tracking-widest text-danger/80 mb-1 block flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-danger" />
                  Problem
                </span>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {uc.problem}
                </p>
              </div>
              <div className="bg-surface/60 border border-border rounded-lg p-3">
                <span className="text-[11px] font-mono uppercase tracking-widest text-success/80 mb-1 block flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-success" />
                  Solution
                </span>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {uc.solution}
                </p>
              </div>
            </div>

            {/* Takeaway */}
            <div className="flex gap-2 items-start bg-accent-cyan/5 border border-accent-cyan/15 rounded-lg p-3">
              <span className="text-xs flex-shrink-0 mt-0.5">💡</span>
              <p className="text-xs text-text-secondary leading-relaxed">
                <span className="font-semibold text-accent-cyan">Takeaway: </span>
                {uc.takeaway}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
