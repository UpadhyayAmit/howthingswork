"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

interface LifecycleStep {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const LIFECYCLE_STEPS: LifecycleStep[] = [
  {
    id: "trigger",
    label: "Trigger",
    description: "HTTP request, timer, queue message, or event triggers the function.",
    icon: "⚡",
  },
  {
    id: "host-startup",
    label: "Host Startup",
    description: "Azure Functions host initializes, loads configuration and dependencies.",
    icon: "🔧",
  },
  {
    id: "input-binding",
    label: "Input Binding",
    description: "Input bindings resolve — data is fetched from connected services.",
    icon: "📥",
  },
  {
    id: "execution",
    label: "Function Execution",
    description: "Your function code runs. Business logic executes here.",
    icon: "▶️",
  },
  {
    id: "output-binding",
    label: "Output Binding",
    description: "Output bindings write results to connected services.",
    icon: "📤",
  },
  {
    id: "response",
    label: "Response",
    description: "Response is returned. Logs are flushed. Function execution completes.",
    icon: "✅",
  },
];

export default function AzureLifecycleVisualizer() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const runLifecycle = useCallback(async () => {
    setIsPlaying(true);
    setCompletedSteps(new Set());
    setLogs([]);
    setCurrentStep(-1);

    for (let i = 0; i < LIFECYCLE_STEPS.length; i++) {
      setCurrentStep(i);
      const step = LIFECYCLE_STEPS[i];
      setLogs((prev) => [...prev, `[${new Date().toISOString().slice(11, 23)}] ${step.label}: Started`]);
      await sleep(900);
      setCompletedSteps((prev) => new Set([...prev, step.id]));
      setLogs((prev) => [...prev, `[${new Date().toISOString().slice(11, 23)}] ${step.label}: Completed`]);
    }

    setLogs((prev) => [...prev, `[${new Date().toISOString().slice(11, 23)}] Function execution completed successfully.`]);
    setIsPlaying(false);
  }, []);

  const reset = () => {
    setCurrentStep(-1);
    setCompletedSteps(new Set());
    setIsPlaying(false);
    setLogs([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={runLifecycle} disabled={isPlaying}>
          {isPlaying ? "Executing..." : "Trigger Function"}
        </Button>
        <Button variant="secondary" onClick={reset} disabled={isPlaying}>
          Reset
        </Button>
      </div>

      {/* Pipeline visualization */}
      <Panel title="Execution Pipeline">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {LIFECYCLE_STEPS.map((step, i) => {
            const isCurrent = currentStep === i;
            const isCompleted = completedSteps.has(step.id);

            return (
              <div key={step.id} className="flex items-center">
                <motion.div
                  className={`flex flex-col items-center p-3 rounded-lg border min-w-[120px] transition-colors ${
                    isCurrent
                      ? "bg-accent/15 border-accent/50"
                      : isCompleted
                      ? "bg-elevated border-accent/30"
                      : "bg-bg border-border"
                  }`}
                  animate={{
                    scale: isCurrent ? 1.05 : 1,
                    y: isCurrent ? -4 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <span className="text-xl mb-1">{step.icon}</span>
                  <span
                    className={`text-xs font-medium ${
                      isCurrent
                        ? "text-accent"
                        : isCompleted
                        ? "text-accent-secondary"
                        : "text-text-secondary"
                    }`}
                  >
                    {step.label}
                  </span>
                  {isCurrent && (
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-accent mt-1"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                    />
                  )}
                </motion.div>

                {i < LIFECYCLE_STEPS.length - 1 && (
                  <svg width="24" height="20" className="mx-1 flex-shrink-0">
                    <path
                      d="M4 10 L20 10 M16 6 L20 10 L16 14"
                      fill="none"
                      stroke={
                        completedSteps.has(step.id) ? "#A855F7" : "#2A2A2A"
                      }
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Step details + logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Current Step">
          {currentStep >= 0 ? (
            <div>
              <h4 className="text-lg font-semibold text-accent mb-1">
                {LIFECYCLE_STEPS[currentStep].icon}{" "}
                {LIFECYCLE_STEPS[currentStep].label}
              </h4>
              <p className="text-sm text-text-secondary">
                {LIFECYCLE_STEPS[currentStep].description}
              </p>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">
              Click &quot;Trigger Function&quot; to start the lifecycle.
            </p>
          )}
        </Panel>

        <Panel title="Execution Logs">
          <div className="bg-bg rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs space-y-1">
            {logs.length > 0 ? (
              logs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-text-secondary"
                >
                  {log}
                </motion.div>
              ))
            ) : (
              <span className="text-text-secondary">Waiting for execution...</span>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
