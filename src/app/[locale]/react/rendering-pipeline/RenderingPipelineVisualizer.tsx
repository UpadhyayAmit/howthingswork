"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

interface Stage {
  id: string;
  label: string;
  detail: string;
  color: string;
}

const STAGES: Stage[] = [
  { id: "jsx", label: "JSX", detail: "Babel transpiles JSX syntax into JavaScript function calls", color: "#F59E0B" },
  { id: "ce", label: "createElement()", detail: "React.createElement() builds descriptor objects with type, props, children", color: "#3B82F6" },
  { id: "vdom", label: "Virtual DOM", detail: "A lightweight JS object tree representing the desired UI state", color: "#8B5CF6" },
  { id: "fiber", label: "Fiber Tree", detail: "React's internal work unit tree — enables interruptible rendering", color: "#A855F7" },
  { id: "render", label: "Render Phase", detail: "React walks the fiber tree, calling render functions, no side effects", color: "#EC4899" },
  { id: "commit", label: "Commit Phase", detail: "React applies all changes to the real DOM in a synchronous flush", color: "#EF4444" },
  { id: "dom", label: "DOM Update", detail: "Mutations are written to the actual browser DOM nodes", color: "#F97316" },
  { id: "paint", label: "Browser Paint", detail: "Browser's layout + paint engine renders pixels to screen", color: "#10B981" },
];

const COMMIT_PHASES = [
  { label: "beforeMutation", detail: "getSnapshotBeforeUpdate, scheduleFlushPassiveEffects", color: "#6366F1" },
  { label: "mutation", detail: "insertions, updates, deletions applied to DOM", color: "#EF4444" },
  { label: "layout", detail: "useLayoutEffect fires synchronously after DOM mutations", color: "#F59E0B" },
];

const STAGE_WIDTH = 90;
const STAGE_GAP = 8;
const TOTAL_WIDTH = STAGES.length * (STAGE_WIDTH + STAGE_GAP);

export default function RenderingPipelineVisualizer() {
  const [activeStage, setActiveStage] = useState(-1);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [commitPhase, setCommitPhase] = useState(-1);
  const [frameTime] = useState("16.2ms");
  const completedRef = useRef<number[]>([]);

  async function runPipeline() {
    if (running) return;
    setRunning(true);
    setDone(false);
    setActiveStage(-1);
    setCommitPhase(-1);
    completedRef.current = [];

    for (let i = 0; i < STAGES.length; i++) {
      setActiveStage(i);
      await sleep(600);
      completedRef.current = [...completedRef.current, i];

      // When we hit commit phase, animate sub-phases
      if (STAGES[i].id === "commit") {
        for (let j = 0; j < COMMIT_PHASES.length; j++) {
          setCommitPhase(j);
          await sleep(500);
        }
        setCommitPhase(-1);
      }
    }

    setActiveStage(-1);
    setDone(true);
    setRunning(false);
  }

  function reset() {
    setActiveStage(-1);
    setRunning(false);
    setDone(false);
    setCommitPhase(-1);
    completedRef.current = [];
  }

  const completed = completedRef.current;

  // Token X position
  const tokenX =
    activeStage >= 0
      ? activeStage * (STAGE_WIDTH + STAGE_GAP) + STAGE_WIDTH / 2
      : -40;

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <Button onClick={runPipeline} disabled={running}>
          Trigger Render
        </Button>
        <Button variant="secondary" onClick={reset}>
          Reset
        </Button>
        {done && (
          <motion.span
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xs font-mono text-green-400"
          >
            Frame rendered in {frameTime}
          </motion.span>
        )}
      </div>

      {/* Pipeline SVG */}
      <Panel title="Pipeline">
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${TOTAL_WIDTH + 40} 130`}
            style={{ minWidth: TOTAL_WIDTH + 40 }}
            className="w-full"
          >
            {/* Connector line */}
            <line
              x1={20}
              y1={50}
              x2={TOTAL_WIDTH + 20}
              y2={50}
              stroke="#374151"
              strokeWidth={2}
            />

            {/* Stage boxes */}
            {STAGES.map((stage, i) => {
              const x = 20 + i * (STAGE_WIDTH + STAGE_GAP);
              const isActive = activeStage === i;
              const isDone = completed.includes(i);
              const color = isDone || isActive ? stage.color : "#4B5563";

              return (
                <g key={stage.id}>
                  {/* Glow for active */}
                  {isActive && (
                    <motion.rect
                      x={x - 2}
                      y={20}
                      width={STAGE_WIDTH + 4}
                      height={60}
                      rx={10}
                      fill={stage.color + "20"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0.6] }}
                      transition={{ duration: 0.3 }}
                      style={{ filter: `drop-shadow(0 0 10px ${stage.color})` }}
                    />
                  )}

                  <motion.rect
                    x={x}
                    y={22}
                    width={STAGE_WIDTH}
                    height={56}
                    rx={8}
                    animate={{
                      fill: isActive ? stage.color + "30" : isDone ? stage.color + "15" : "#111827",
                      stroke: isActive ? stage.color : isDone ? stage.color + "80" : "#374151",
                      strokeWidth: isActive ? 2 : 1,
                    }}
                    transition={{ duration: 0.3 }}
                  />

                  <text
                    x={x + STAGE_WIDTH / 2}
                    y={54}
                    textAnchor="middle"
                    fontSize={9.5}
                    fontFamily="JetBrains Mono, monospace"
                    fill={isActive ? stage.color : isDone ? stage.color + "cc" : "#6B7280"}
                    fontWeight={isActive ? "bold" : "normal"}
                  >
                    {stage.label.split("()").map((part, pi) => (
                      <tspan key={pi}>
                        {pi > 0 ? "()" : ""}
                        {part}
                      </tspan>
                    ))}
                  </text>

                  {/* Arrow to next */}
                  {i < STAGES.length - 1 && (
                    <text
                      x={x + STAGE_WIDTH + STAGE_GAP / 2}
                      y={53}
                      textAnchor="middle"
                      fontSize={10}
                      fill="#4B5563"
                    >
                      →
                    </text>
                  )}

                  {/* Step number */}
                  <text
                    x={x + STAGE_WIDTH / 2}
                    y={70}
                    textAnchor="middle"
                    fontSize={8}
                    fill="#4B5563"
                  >
                    {i + 1}
                  </text>
                </g>
              );
            })}

            {/* Animated token */}
            <AnimatePresence>
              {activeStage >= 0 && (
                <motion.g
                  key="token"
                  initial={{ x: tokenX - 12, y: 0 }}
                  animate={{ x: tokenX - 12, y: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 25 }}
                >
                  <motion.circle
                    cx={12}
                    cy={10}
                    r={8}
                    fill="#A855F7"
                    style={{ filter: "drop-shadow(0 0 8px #A855F7)" }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.4, repeat: Infinity }}
                  />
                  <motion.circle cx={12} cy={10} r={4} fill="#C084FC" />
                </motion.g>
              )}
            </AnimatePresence>
          </svg>
        </div>

        {/* Active stage detail */}
        <AnimatePresence mode="wait">
          {activeStage >= 0 && (
            <motion.div
              key={activeStage}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-3 px-4 py-2 rounded-lg text-xs font-mono border"
              style={{
                borderColor: STAGES[activeStage].color + "60",
                backgroundColor: STAGES[activeStage].color + "10",
                color: STAGES[activeStage].color,
              }}
            >
              <span className="font-bold">{STAGES[activeStage].label}</span>
              {" — "}
              {STAGES[activeStage].detail}
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>

      {/* Commit sub-phases */}
      <Panel title="Commit Phase — Sub-Phases">
        <div className="flex gap-3 flex-wrap">
          {COMMIT_PHASES.map((cp, i) => (
            <motion.div
              key={cp.label}
              className="flex-1 min-w-[140px] rounded-lg border px-3 py-3 text-xs font-mono"
              animate={{
                borderColor: commitPhase === i ? cp.color : "#374151",
                backgroundColor: commitPhase === i ? cp.color + "20" : "#111827",
                boxShadow: commitPhase === i ? `0 0 16px ${cp.color}60` : "none",
              }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="font-bold mb-1"
                style={{ color: commitPhase === i ? cp.color : "#4B5563" }}
              >
                {i + 1}. {cp.label}
              </div>
              <div
                style={{ color: commitPhase === i ? cp.color + "cc" : "#4B5563" }}
              >
                {cp.detail}
              </div>
            </motion.div>
          ))}
        </div>
      </Panel>

      {/* Done Frame indicator */}
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-xs font-mono"
          >
            <span className="text-green-400 font-bold">Frame Complete</span>
            <span className="text-text-secondary ml-2">
              All {STAGES.length} stages executed · Paint time: {frameTime} · 60fps target: 16.7ms
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
