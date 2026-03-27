"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import CodeBlock from "./CodeBlock";

export interface ExplainerStep {
  title: string;
  body: string;
}

export interface KeyConcept {
  term: string;
  definition: string;
  icon?: string;
}

export interface ConceptExplainerProps {
  overview: string;
  howItWorks: ExplainerStep[];
  keyConcepts?: KeyConcept[];
  codeExample?: {
    label: string;
    code: string;
  };
  whyItMatters?: string;
  pitfalls?: string[];
  className?: string;
}

export default function ConceptExplainer({
  overview,
  howItWorks,
  keyConcepts,
  codeExample,
  whyItMatters,
  pitfalls,
  className,
}: ConceptExplainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className={cn("mt-10 space-y-8", className)}
    >
      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <span className="text-xs font-mono text-text-secondary uppercase tracking-widest px-3 py-1 rounded-full bg-elevated border border-border">
          How It Works
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-border via-transparent to-transparent" />
      </div>

      {/* Overview */}
      <p className="text-text-secondary leading-relaxed text-[15px] max-w-3xl">
        {overview}
      </p>

      {/* Step-by-step */}
      <div className="space-y-3">
        {howItWorks.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.06 }}
            className="flex gap-4 group"
          >
            {/* Step number — gradient circle */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-accent-cyan/10 border border-accent/30 flex items-center justify-center text-xs font-mono font-bold text-accent mt-0.5">
              {i + 1}
            </div>
            <div className="flex-1 pb-3 border-b border-border/50 last:border-0">
              <span
                className="text-sm font-semibold text-text-primary"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {step.title}
              </span>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                {step.body}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Key Concepts grid */}
      {keyConcepts && keyConcepts.length > 0 && (
        <div>
          <h4 className="text-xs font-mono uppercase tracking-widest mb-4 px-3 py-1 rounded-full bg-elevated border border-border text-text-secondary inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />
            Key Concepts
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {keyConcepts.map((concept, i) => (
              <motion.div
                key={concept.term}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                className="bg-elevated border border-border rounded-xl p-4 hover:border-accent/30 transition-all duration-200 group border-l-2 border-l-accent/40"
              >
                <div className="flex items-center gap-2 mb-2">
                  {concept.icon && (
                    <span className="text-base">{concept.icon}</span>
                  )}
                  <span className="text-sm font-semibold font-mono text-accent">
                    {concept.term}
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {concept.definition}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Code example */}
      {codeExample && (
        <CodeBlock
          code={codeExample.code}
          label={codeExample.label}
          language="tsx"
        />
      )}

      {/* Why it matters */}
      {whyItMatters && (
        <div className="flex gap-3 p-5 bg-gradient-to-r from-accent/8 to-accent-cyan/5 border border-accent/20 rounded-xl">
          <span className="text-lg flex-shrink-0">💡</span>
          <div>
            <span
              className="text-sm font-bold text-accent block mb-1.5"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Why This Matters
            </span>
            <p className="text-sm text-text-secondary leading-relaxed">
              {whyItMatters}
            </p>
          </div>
        </div>
      )}

      {/* Pitfalls */}
      {pitfalls && pitfalls.length > 0 && (
        <div>
          <h4 className="text-xs font-mono uppercase tracking-widest mb-4 px-3 py-1 rounded-full bg-elevated border border-border text-text-secondary inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            Common Pitfalls
          </h4>
          <div className="space-y-2">
            {pitfalls.map((pitfall, i) => (
              <div
                key={i}
                className="flex gap-3 text-sm text-text-secondary p-4 bg-elevated border border-border rounded-xl border-l-2 border-l-warning/60 hover:border-warning/30 transition-colors"
              >
                <span className="text-warning flex-shrink-0">⚠</span>
                <span className="leading-relaxed">{pitfall}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
