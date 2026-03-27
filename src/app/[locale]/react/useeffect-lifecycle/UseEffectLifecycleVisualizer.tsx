"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type EffectType = "mount" | "deps" | "every";
type Phase = "render" | "commit" | "paint" | "effect" | "cleanup" | "skip";

interface RenderCycle {
  id: number;
  trigger: string;
  phases: Phase[];
  effectRan: boolean;
  cleanupRan: boolean;
  depChanged: boolean;
  count: number;
  theme: string;
}

const PHASE_META: Record<Phase, { color: string; label: string; desc: string }> = {
  render: { color: "#a855f7", label: "Render", desc: "Function executes" },
  commit: { color: "#3b82f6", label: "Commit", desc: "DOM updated" },
  paint: { color: "#22c55e", label: "Paint", desc: "Browser paints" },
  effect: { color: "#f97316", label: "Effect", desc: "useEffect fires" },
  cleanup: { color: "#ef4444", label: "Cleanup", desc: "Previous cleanup" },
  skip: { color: "#4b5563", label: "Skipped", desc: "Deps unchanged" },
};

export default function UseEffectLifecycleVisualizer() {
  const [effectType, setEffectType] = useState<EffectType>("deps");
  const [cycles, setCycles] = useState<RenderCycle[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activePhase, setActivePhase] = useState<Phase | null>(null);
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState("dark");
  const [showStaleWarning, setShowStaleWarning] = useState(false);
  const [showLayoutEffect, setShowLayoutEffect] = useState(false);
  const cycleIdRef = useRef(0);

  const getEffectCode = () => {
    if (effectType === "mount")
      return `useEffect(() => {\n  // mount only\n  return () => cleanup();\n}, []);  // empty deps`;
    if (effectType === "deps")
      return `useEffect(() => {\n  doSomething(count, theme);\n  return () => cleanup();\n}, [count, theme]);`;
    return `useEffect(() => {\n  doSomething();\n  return () => cleanup();\n});  // no deps array`;
  };

  const triggerRender = useCallback(
    async (trigger: string, newCount?: number, newTheme?: string) => {
      if (isAnimating) return;
      setIsAnimating(true);

      const nextCount = newCount !== undefined ? newCount : count;
      const nextTheme = newTheme !== undefined ? newTheme : theme;

      if (newCount !== undefined) setCount(newCount);
      if (newTheme !== undefined) setTheme(newTheme);

      cycleIdRef.current += 1;
      const id = cycleIdRef.current;

      // Determine if effect should run
      let effectRan = false;
      let depChanged = false;

      if (effectType === "every") {
        effectRan = true;
        depChanged = true;
      } else if (effectType === "mount") {
        effectRan = id === 1;
        depChanged = id === 1;
      } else {
        // deps
        depChanged =
          newCount !== undefined || newTheme !== undefined;
        effectRan = depChanged;
      }

      const prevCycle = cycles[cycles.length - 1];
      const cleanupRan = effectRan && prevCycle !== undefined && prevCycle.effectRan;

      const phases: Phase[] = ["render", "commit", "paint"];
      if (cleanupRan) phases.push("cleanup");
      if (effectRan) phases.push("effect");
      else phases.push("skip");

      const newCycle: RenderCycle = {
        id,
        trigger,
        phases,
        effectRan,
        cleanupRan,
        depChanged,
        count: nextCount,
        theme: nextTheme,
      };

      setCycles((prev) => [...prev.slice(-4), newCycle]);

      // Animate through phases
      for (const phase of phases) {
        setActivePhase(phase);
        await sleep(phase === "effect" ? 500 : phase === "cleanup" ? 400 : 300);
      }

      setActivePhase(null);
      setIsAnimating(false);
    },
    [isAnimating, count, theme, effectType, cycles]
  );

  const handleStaleDemo = useCallback(async () => {
    setShowStaleWarning(true);
    await sleep(2500);
    setShowStaleWarning(false);
  }, []);

  const handleReset = useCallback(() => {
    setCycles([]);
    setCount(0);
    setTheme("dark");
    setActivePhase(null);
    setIsAnimating(false);
    setShowStaleWarning(false);
    cycleIdRef.current = 0;
  }, []);

  return (
    <div className="space-y-6">
      {/* Effect type selector */}
      <div className="flex flex-wrap gap-2">
        {([
          ["mount", "[] — mount only"],
          ["deps", "[count, theme] — dep-based"],
          ["every", "no array — every render"],
        ] as [EffectType, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => { if (!isAnimating) { setEffectType(t); handleReset(); } }}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-all font-mono ${
              effectType === t
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-text-secondary hover:border-accent/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Code + deps */}
        <Panel title="Effect Code">
          <div className="space-y-3">
            <pre className="font-mono text-xs bg-[#0d1117] rounded-lg p-3 border border-border text-text-secondary leading-relaxed">
              {getEffectCode().split("\n").map((line, i) => (
                <div key={i} className={line.includes("return") ? "text-red-400" : line.includes("doSomething") || line.includes("mount") ? "text-orange-400" : ""}>{line}</div>
              ))}
            </pre>

            {/* Dependency panel */}
            {effectType === "deps" && (
              <div className="space-y-2">
                <div className="text-xs text-text-secondary">Dependency array:</div>
                <div className="flex gap-2">
                  <div className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-xs font-mono text-cyan-400">
                    count: {count}
                  </div>
                  <div className="rounded border border-yellow-500/40 bg-yellow-500/10 px-2 py-1 text-xs font-mono text-yellow-400">
                    theme: {theme}
                  </div>
                </div>
              </div>
            )}

            {/* useLayoutEffect comparison */}
            <div>
              <button
                onClick={() => setShowLayoutEffect((v) => !v)}
                className="text-xs text-text-secondary underline underline-offset-2 hover:text-text-primary transition-colors"
              >
                {showLayoutEffect ? "Hide" : "Compare"} useLayoutEffect
              </button>
              <AnimatePresence>
                {showLayoutEffect && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 space-y-2"
                  >
                    <div className="text-xs rounded border border-orange-500/30 bg-orange-500/10 p-2">
                      <div className="text-orange-400 font-mono font-bold mb-1">useEffect</div>
                      <div className="text-text-secondary">Render → Commit → Paint → <span className="text-orange-400">Effect</span></div>
                      <div className="text-text-secondary text-[10px] mt-1">async — fires AFTER paint</div>
                    </div>
                    <div className="text-xs rounded border border-pink-500/30 bg-pink-500/10 p-2">
                      <div className="text-pink-400 font-mono font-bold mb-1">useLayoutEffect</div>
                      <div className="text-text-secondary">Render → Commit → <span className="text-pink-400">LayoutEffect</span> → Paint</div>
                      <div className="text-text-secondary text-[10px] mt-1">sync — fires BEFORE paint</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Panel>

        {/* Phase legend */}
        <Panel title="Render Phases">
          <div className="space-y-2">
            {(Object.entries(PHASE_META) as [Phase, typeof PHASE_META[Phase]][])
              .filter(([p]) => p !== "skip")
              .map(([phase, meta]) => (
                <motion.div
                  key={phase}
                  animate={
                    activePhase === phase
                      ? { scale: 1.03, opacity: 1 }
                      : { scale: 1, opacity: 0.7 }
                  }
                  className="flex items-center gap-2 rounded-lg border p-2 transition-all"
                  style={{
                    borderColor:
                      activePhase === phase ? meta.color : "#374151",
                    backgroundColor:
                      activePhase === phase ? `${meta.color}15` : "transparent",
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: meta.color }}
                  />
                  <div className="flex-1">
                    <div className="text-xs font-medium" style={{ color: meta.color }}>
                      {meta.label}
                    </div>
                    <div className="text-[10px] text-text-secondary">{meta.desc}</div>
                  </div>
                  <AnimatePresence>
                    {activePhase === phase && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
          </div>
        </Panel>

        {/* Trigger buttons */}
        <Panel title="Trigger Renders">
          <div className="space-y-3">
            <Button
              onClick={() => triggerRender("count change", count + 1)}
              disabled={isAnimating}
              size="sm"
            >
              Increment count ({count})
            </Button>
            <Button
              variant="secondary"
              onClick={() => triggerRender("theme change", undefined, theme === "dark" ? "light" : "dark")}
              disabled={isAnimating}
              size="sm"
            >
              Toggle theme ({theme})
            </Button>
            <Button
              variant="secondary"
              onClick={() => triggerRender("unrelated re-render")}
              disabled={isAnimating}
              size="sm"
            >
              Re-render (no dep change)
            </Button>

            <div className="pt-2 border-t border-border space-y-2">
              <div className="text-xs text-text-secondary">Pitfall demo:</div>
              <Button
                variant="secondary"
                onClick={handleStaleDemo}
                disabled={isAnimating || showStaleWarning}
                size="sm"
              >
                Stale closure warning
              </Button>
              <AnimatePresence>
                {showStaleWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded border border-yellow-500/40 bg-yellow-500/10 p-2"
                  >
                    <div className="text-xs text-yellow-400 font-mono">
                      Warning: stale closure!
                    </div>
                    <div className="text-[10px] text-text-secondary mt-1">
                      Effect captures count={count} at time of creation.
                      If count changes but &apos;count&apos; is missing from deps[],
                      the effect sees the OLD value forever.
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Panel>
      </div>

      {/* Timeline */}
      <Panel title="Render Timeline">
        <div className="space-y-3">
          {/* Phase color legend */}
          <div className="flex flex-wrap gap-3 text-xs">
            {(Object.entries(PHASE_META) as [Phase, typeof PHASE_META[Phase]][]).map(([phase, meta]) => (
              <span key={phase} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: meta.color }} />
                <span className="text-text-secondary">{meta.label}</span>
              </span>
            ))}
          </div>

          {/* Cycle tracks */}
          <div className="flex gap-3 overflow-x-auto pb-2 min-h-[120px]">
            <AnimatePresence>
              {cycles.map((cycle, cycleIdx) => (
                <motion.div
                  key={cycle.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex-shrink-0 w-28 space-y-1"
                >
                  <div className="text-[10px] text-text-secondary truncate font-mono">
                    #{cycle.id} {cycle.trigger}
                  </div>
                  {cycle.phases.map((phase, pi) => {
                    const meta = PHASE_META[phase];
                    return (
                      <motion.div
                        key={`${cycle.id}-${pi}`}
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={{ delay: pi * 0.08, type: "spring", stiffness: 300 }}
                        style={{
                          originX: 0,
                          backgroundColor: `${meta.color}20`,
                          borderColor: `${meta.color}50`,
                        }}
                        className="h-6 rounded border flex items-center px-1.5"
                      >
                        <span className="text-[9px] font-mono" style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                      </motion.div>
                    );
                  })}

                  {/* Effect chain arrow */}
                  {cycleIdx > 0 && cycles[cycleIdx - 1].effectRan && cycle.cleanupRan && (
                    <div className="text-[9px] text-red-400 font-mono">
                      ↑ cleanup prev
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {cycles.length === 0 && (
              <div className="flex items-center text-xs text-text-secondary italic">
                Trigger renders to see timeline
              </div>
            )}
          </div>

          {/* Cleanup chain diagram */}
          {cycles.filter((c) => c.effectRan).length >= 2 && (
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-text-secondary mb-2">Effect ↔ Cleanup chain:</div>
              <div className="flex items-center gap-1 overflow-x-auto text-xs font-mono">
                {cycles.filter((c) => c.effectRan).map((cycle, i, arr) => (
                  <div key={cycle.id} className="flex items-center gap-1 flex-shrink-0">
                    <div className="rounded border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-orange-400">
                      effect#{cycle.id}
                    </div>
                    {i < arr.length - 1 && (
                      <>
                        <span className="text-text-secondary">→</span>
                        <div className="rounded border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-blue-400">
                          render#{arr[i + 1].id}
                        </div>
                        <span className="text-text-secondary">→</span>
                        <div className="rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-red-400">
                          cleanup#{cycle.id}
                        </div>
                        <span className="text-text-secondary">→</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={handleReset} size="sm">
          Reset
        </Button>
      </div>
    </div>
  );
}
