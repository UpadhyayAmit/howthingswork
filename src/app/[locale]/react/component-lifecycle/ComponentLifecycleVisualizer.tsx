"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type LifecyclePhase = "idle" | "mount" | "update" | "unmount";

interface LifecycleStep {
  label: string;
  type: "render" | "dom" | "effect" | "cleanup";
  detail: string;
}

const MOUNT_STEPS: LifecycleStep[] = [
  { label: "constructor", type: "render", detail: "Initialize state and bind methods" },
  { label: "render()", type: "render", detail: "Return JSX — pure, no side effects" },
  { label: "DOM update", type: "dom", detail: "React writes changes to the real DOM" },
  { label: "useLayoutEffect", type: "effect", detail: "Fires synchronously after DOM mutation" },
  { label: "Browser paint", type: "dom", detail: "Browser renders pixels to screen" },
  { label: "useEffect", type: "effect", detail: "Fires after paint — data fetching, subscriptions" },
];

const UPDATE_STEPS: LifecycleStep[] = [
  { label: "setState()", type: "render", detail: "Schedules a re-render" },
  { label: "re-render()", type: "render", detail: "Component function called again" },
  { label: "DOM diff", type: "dom", detail: "React diffs old vs new VDOM" },
  { label: "useLayoutEffect cleanup", type: "cleanup", detail: "Previous useLayoutEffect cleanup runs" },
  { label: "useLayoutEffect", type: "effect", detail: "New useLayoutEffect runs" },
  { label: "useEffect cleanup", type: "cleanup", detail: "Previous useEffect cleanup runs" },
  { label: "useEffect", type: "effect", detail: "New useEffect runs" },
];

const UNMOUNT_STEPS: LifecycleStep[] = [
  { label: "useEffect cleanup", type: "cleanup", detail: "Cleanup subscriptions, timers, event listeners" },
  { label: "useLayoutEffect cleanup", type: "cleanup", detail: "Cleanup synchronous effects" },
  { label: "DOM removal", type: "dom", detail: "React removes component from the DOM" },
];

const stepColor: Record<LifecycleStep["type"], string> = {
  render: "#A855F7",
  dom: "#3B82F6",
  effect: "#10B981",
  cleanup: "#F97316",
};

function StepItem({
  step,
  active,
  completed,
  index,
}: {
  step: LifecycleStep;
  active: boolean;
  completed: boolean;
  index: number;
}) {
  const color = stepColor[step.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start gap-2 p-2 rounded-lg border text-xs font-mono transition-all"
      style={{
        borderColor: active ? color : completed ? color + "50" : "#374151",
        backgroundColor: active ? color + "20" : completed ? color + "10" : "#111827",
        boxShadow: active ? `0 0 14px ${color}50` : "none",
      }}
    >
      <motion.div
        className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0"
        style={{ backgroundColor: active || completed ? color : "#4B5563" }}
        animate={active ? { scale: [1, 1.5, 1] } : {}}
        transition={{ duration: 0.5, repeat: active ? Infinity : 0 }}
      />
      <div>
        <div style={{ color: active ? color : completed ? color + "cc" : "#6B7280" }}>
          {step.label}
        </div>
        {(active || completed) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] mt-0.5"
            style={{ color: color + "99" }}
          >
            {step.detail}
          </motion.div>
        )}
      </div>
      {active && (
        <motion.span
          className="ml-auto text-[9px] px-1 py-0.5 rounded"
          style={{ backgroundColor: color + "30", color }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          RUNNING
        </motion.span>
      )}
      {completed && !active && (
        <span className="ml-auto text-[9px]" style={{ color: color + "80" }}>
          ✓
        </span>
      )}
    </motion.div>
  );
}

function PhaseColumn({
  title,
  steps,
  activeStep,
  completedSteps,
  phaseColor,
  isActive,
}: {
  title: string;
  steps: LifecycleStep[];
  activeStep: number;
  completedSteps: number[];
  phaseColor: string;
  isActive: boolean;
}) {
  return (
    <div
      className="flex-1 min-w-[200px] rounded-xl border p-3 transition-all"
      style={{
        borderColor: isActive ? phaseColor + "60" : "#374151",
        backgroundColor: isActive ? phaseColor + "08" : "#0d1117",
        boxShadow: isActive ? `0 0 24px ${phaseColor}20` : "none",
      }}
    >
      <div
        className="text-xs font-bold font-mono mb-3 pb-2 border-b tracking-widest uppercase"
        style={{
          borderColor: isActive ? phaseColor + "40" : "#374151",
          color: isActive ? phaseColor : "#4B5563",
        }}
      >
        {title}
      </div>
      <div className="flex flex-col gap-1.5">
        {steps.map((step, i) => (
          <StepItem
            key={step.label}
            step={step}
            active={activeStep === i}
            completed={completedSteps.includes(i)}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

export default function ComponentLifecycleVisualizer() {
  const [phase, setPhase] = useState<LifecyclePhase>("idle");
  const [mountStep, setMountStep] = useState(-1);
  const [updateStep, setUpdateStep] = useState(-1);
  const [unmountStep, setUnmountStep] = useState(-1);
  const [mountCompleted, setMountCompleted] = useState<number[]>([]);
  const [updateCompleted, setUpdateCompleted] = useState<number[]>([]);
  const [unmountCompleted, setUnmountCompleted] = useState<number[]>([]);
  const [componentVisible, setComponentVisible] = useState(false);
  const [componentText, setComponentText] = useState("Hello World");
  const [running, setRunning] = useState(false);

  function fullReset() {
    setPhase("idle");
    setMountStep(-1);
    setUpdateStep(-1);
    setUnmountStep(-1);
    setMountCompleted([]);
    setUpdateCompleted([]);
    setUnmountCompleted([]);
    setComponentVisible(false);
    setComponentText("Hello World");
    setRunning(false);
  }

  async function handleMount() {
    if (running) return;
    setRunning(true);
    setPhase("mount");
    setMountStep(-1);
    setMountCompleted([]);
    setComponentVisible(false);

    const completed: number[] = [];
    for (let i = 0; i < MOUNT_STEPS.length; i++) {
      setMountStep(i);
      await sleep(600);
      if (i === 2) setComponentVisible(true); // After DOM update
      completed.push(i);
      setMountCompleted([...completed]);
    }
    setMountStep(-1);
    setPhase("idle");
    setRunning(false);
  }

  async function handleUpdate() {
    if (running || !componentVisible) return;
    setRunning(true);
    setPhase("update");
    setUpdateStep(-1);
    setUpdateCompleted([]);

    const completed: number[] = [];
    for (let i = 0; i < UPDATE_STEPS.length; i++) {
      setUpdateStep(i);
      await sleep(600);
      if (i === 1) setComponentText("Updated State!");
      completed.push(i);
      setUpdateCompleted([...completed]);
    }
    setUpdateStep(-1);
    setPhase("idle");
    setRunning(false);
  }

  async function handleUnmount() {
    if (running || !componentVisible) return;
    setRunning(true);
    setPhase("unmount");
    setUnmountStep(-1);
    setUnmountCompleted([]);

    const completed: number[] = [];
    for (let i = 0; i < UNMOUNT_STEPS.length; i++) {
      setUnmountStep(i);
      await sleep(600);
      if (i === 2) setComponentVisible(false);
      completed.push(i);
      setUnmountCompleted([...completed]);
    }
    setUnmountStep(-1);
    setPhase("idle");
    setRunning(false);
  }

  const phaseColors: Record<LifecyclePhase, string> = {
    idle: "#9CA3AF",
    mount: "#10B981",
    update: "#A855F7",
    unmount: "#F97316",
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <Button onClick={handleMount} disabled={running || componentVisible}>
          Mount Component
        </Button>
        <Button
          variant="secondary"
          onClick={handleUpdate}
          disabled={running || !componentVisible}
        >
          Trigger Update
        </Button>
        <Button
          variant="secondary"
          onClick={handleUnmount}
          disabled={running || !componentVisible}
        >
          Unmount Component
        </Button>
        <Button variant="ghost" onClick={fullReset} disabled={running}>
          Reset
        </Button>
      </div>

      {/* Component Preview */}
      <Panel title="Component Preview">
        <div className="flex items-center justify-center h-20">
          <AnimatePresence>
            {componentVisible ? (
              <motion.div
                key="component"
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  boxShadow:
                    phase === "update"
                      ? "0 0 20px #A855F760"
                      : phase === "mount"
                      ? "0 0 20px #10B98160"
                      : "0 0 10px #374151",
                }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="px-6 py-3 rounded-xl border-2 font-mono text-sm font-semibold"
                style={{
                  borderColor:
                    phase === "update"
                      ? "#A855F7"
                      : phase === "mount"
                      ? "#10B981"
                      : "#4B5563",
                  color:
                    phase === "update"
                      ? "#A855F7"
                      : phase === "mount"
                      ? "#10B981"
                      : "#FAFAFA",
                  backgroundColor: "#111827",
                }}
              >
                &lt;MyComponent&gt; {componentText} &lt;/MyComponent&gt;
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                className="text-xs font-mono text-text-secondary"
              >
                Component not mounted
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Panel>

      {/* Phase Columns */}
      <div className="flex flex-col md:flex-row gap-4">
        <PhaseColumn
          title="Mount"
          steps={MOUNT_STEPS}
          activeStep={mountStep}
          completedSteps={mountCompleted}
          phaseColor="#10B981"
          isActive={phase === "mount"}
        />
        <PhaseColumn
          title="Update"
          steps={UPDATE_STEPS}
          activeStep={updateStep}
          completedSteps={updateCompleted}
          phaseColor="#A855F7"
          isActive={phase === "update"}
        />
        <PhaseColumn
          title="Unmount"
          steps={UNMOUNT_STEPS}
          activeStep={unmountStep}
          completedSteps={unmountCompleted}
          phaseColor="#F97316"
          isActive={phase === "unmount"}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs font-mono text-text-secondary">
        {Object.entries(stepColor).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: color }}
            />
            {type}
          </span>
        ))}
      </div>
    </div>
  );
}
