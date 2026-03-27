"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

interface CompilationStep {
  id: string;
  label: string;
  code: string;
}

const JIT_STEPS: CompilationStep[] = [
  {
    id: "source",
    label: "C# Source Code",
    code: `public int Add(int a, int b)
{
    return a + b;
}`,
  },
  {
    id: "il",
    label: "IL (Intermediate Language)",
    code: `.method public int32 Add(int32 a, int32 b)
{
    .maxstack 2
    ldarg.1        // push a
    ldarg.2        // push b
    add            // a + b
    ret            // return result
}`,
  },
  {
    id: "native",
    label: "Native x86-64",
    code: `Add:
    mov  eax, ecx     ; a -> eax
    add  eax, edx     ; eax += b
    ret                ; return eax`,
  },
];

export default function JITVisualizer() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiled, setCompiled] = useState(false);

  const compile = useCallback(async () => {
    setIsCompiling(true);
    setCurrentStep(0);
    await sleep(800);
    setCurrentStep(1);
    await sleep(1000);
    setCurrentStep(2);
    await sleep(800);
    setCompiled(true);
    setIsCompiling(false);
  }, []);

  const reset = () => {
    setCurrentStep(0);
    setIsCompiling(false);
    setCompiled(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={compile} disabled={isCompiling}>
          {isCompiling ? "JIT Compiling..." : compiled ? "Recompile" : "JIT Compile"}
        </Button>
        <Button variant="secondary" onClick={reset}>
          Reset
        </Button>
      </div>

      {/* Pipeline */}
      <div className="flex items-center gap-2 mb-4">
        {JIT_STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center">
            <motion.div
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                currentStep === i
                  ? "bg-accent/15 border-accent/50 text-accent"
                  : currentStep > i
                  ? "bg-elevated border-accent/30 text-accent-secondary"
                  : "bg-bg border-border text-text-secondary"
              }`}
              animate={{ scale: currentStep === i ? 1.05 : 1 }}
            >
              {step.label}
            </motion.div>
            {i < JIT_STEPS.length - 1 && (
              <svg width="30" height="20" className="mx-1">
                <path
                  d="M4 10 L24 10 M20 6 L24 10 L20 14"
                  fill="none"
                  stroke={currentStep > i ? "#A855F7" : "#2A2A2A"}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>
        ))}
      </div>

      {/* Code panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {JIT_STEPS.map((step, i) => (
          <Panel key={step.id} title={step.label}>
            <motion.pre
              className={`font-mono text-xs p-3 rounded-lg bg-bg border overflow-x-auto whitespace-pre ${
                currentStep === i
                  ? "border-accent/40 text-accent"
                  : currentStep > i
                  ? "border-accent/20 text-accent-secondary"
                  : "border-border text-text-secondary"
              }`}
              animate={{
                opacity: currentStep >= i ? 1 : 0.4,
              }}
            >
              {step.code}
            </motion.pre>
          </Panel>
        ))}
      </div>

      {compiled && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Panel title="JIT Cache">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-text-secondary">
                Method <code className="text-accent font-mono">Add(int, int)</code> compiled
                and cached. Subsequent calls use native code directly.
              </span>
            </div>
          </Panel>
        </motion.div>
      )}
    </div>
  );
}
