"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

interface HookSlot {
  index: number;
  name: string;
  type: "useState" | "useEffect" | "useMemo";
  value: string;
}

const INITIAL_HOOKS: HookSlot[] = [
  { index: 0, name: "count", type: "useState", value: "0" },
  { index: 1, name: "name", type: "useState", value: '"Alice"' },
  { index: 2, name: "effect", type: "useEffect", value: "callback()" },
  { index: 3, name: "doubled", type: "useMemo", value: "0" },
];

type Phase = "idle" | "calling-hooks" | "state-update" | "re-render" | "done";

export default function HooksVisualizer() {
  const [hooks, setHooks] = useState<HookSlot[]>(INITIAL_HOOKS);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [phase, setPhase] = useState<Phase>("idle");
  const [renderCount, setRenderCount] = useState(0);
  const [stateQueue, setStateQueue] = useState<string[]>([]);

  const runRenderCycle = useCallback(async () => {
    setPhase("calling-hooks");
    setCurrentIndex(-1);

    // Walk through each hook
    for (let i = 0; i < hooks.length; i++) {
      setCurrentIndex(i);
      await sleep(600);
    }

    // Simulate state update
    setPhase("state-update");
    setCurrentIndex(0);
    setStateQueue(["setState(count + 1)"]);
    await sleep(800);

    // Update the value
    setHooks((prev) =>
      prev.map((h) =>
        h.name === "count" ? { ...h, value: String(Number(h.value) + 1) } : h
      )
    );
    setHooks((prev) =>
      prev.map((h) =>
        h.name === "doubled"
          ? { ...h, value: String((Number(hooks[0].value) + 1) * 2) }
          : h
      )
    );

    // Re-render
    setPhase("re-render");
    await sleep(600);

    // Walk hooks again (re-render)
    setPhase("calling-hooks");
    for (let i = 0; i < hooks.length; i++) {
      setCurrentIndex(i);
      await sleep(400);
    }

    setPhase("done");
    setCurrentIndex(-1);
    setRenderCount((c) => c + 1);
    setStateQueue([]);
  }, [hooks]);

  const reset = () => {
    setHooks(INITIAL_HOOKS);
    setCurrentIndex(-1);
    setPhase("idle");
    setRenderCount(0);
    setStateQueue([]);
  };

  const typeColors = {
    useState: "#A855F7",
    useEffect: "#3B82F6",
    useMemo: "#F59E0B",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          onClick={runRenderCycle}
          disabled={phase !== "idle" && phase !== "done"}
        >
          {phase === "idle" || phase === "done"
            ? "Trigger Render Cycle"
            : "Running..."}
        </Button>
        <Button variant="secondary" onClick={reset}>
          Reset
        </Button>
        <span className="text-sm text-text-secondary">
          Renders: {renderCount}
        </span>
      </div>

      {/* Phase indicator */}
      <div className="flex items-center gap-2">
        {(["calling-hooks", "state-update", "re-render"] as Phase[]).map(
          (p) => (
            <div
              key={p}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                phase === p
                  ? "bg-accent/15 text-accent border-accent/40"
                  : "bg-elevated text-text-secondary border-border"
              }`}
            >
              {p.replace("-", " ")}
            </div>
          )
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hooks linked list */}
        <Panel title="Hooks Linked List (fiber.memoizedState)">
          <div className="space-y-2">
            {hooks.map((hook, i) => (
              <motion.div
                key={hook.index}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  currentIndex === i
                    ? "bg-accent/10 border-accent/40"
                    : "bg-bg border-border"
                }`}
                animate={{
                  scale: currentIndex === i ? 1.02 : 1,
                  x: currentIndex === i ? 4 : 0,
                }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                {/* Index pointer */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                    currentIndex === i
                      ? "bg-accent text-white"
                      : "bg-elevated text-text-secondary"
                  }`}
                >
                  {i}
                </div>

                {/* Hook type badge */}
                <span
                  className="px-2 py-0.5 rounded text-xs font-mono"
                  style={{
                    backgroundColor: `${typeColors[hook.type]}20`,
                    color: typeColors[hook.type],
                  }}
                >
                  {hook.type}
                </span>

                {/* Name + value */}
                <span className="text-sm font-medium">{hook.name}</span>
                <span className="ml-auto text-sm font-mono text-accent-secondary">
                  {hook.value}
                </span>

                {/* Next pointer */}
                {i < hooks.length - 1 && (
                  <span className="text-text-secondary text-xs">→</span>
                )}
              </motion.div>
            ))}
          </div>
        </Panel>

        {/* State queue */}
        <Panel title="Update Queue">
          <div className="space-y-3">
            <div className="text-sm text-text-secondary mb-2">
              Pending state updates:
            </div>
            <AnimatePresence>
              {stateQueue.length > 0 ? (
                stateQueue.map((update, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-3 bg-accent/10 border border-accent/30 rounded-lg font-mono text-sm text-accent"
                  >
                    {update}
                  </motion.div>
                ))
              ) : (
                <div className="p-3 bg-bg border border-border rounded-lg text-sm text-text-secondary">
                  Queue empty
                </div>
              )}
            </AnimatePresence>

            <div className="mt-4 p-3 bg-bg border border-border rounded-lg">
              <div className="text-xs text-text-secondary mb-1">
                Hook index pointer
              </div>
              <div className="flex items-center gap-1">
                {hooks.map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded flex items-center justify-center text-xs font-mono ${
                      currentIndex === i
                        ? "bg-accent text-white"
                        : "bg-elevated text-text-secondary"
                    }`}
                  >
                    {i}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
