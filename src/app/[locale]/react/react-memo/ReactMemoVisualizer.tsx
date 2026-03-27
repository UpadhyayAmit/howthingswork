"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";

interface RenderLog {
  id: number;
  component: string;
  reason: string;
  time: string;
  skipped: boolean;
}

interface PropsComparison {
  propName: string;
  oldVal: string;
  newVal: string;
  equal: boolean;
}

let logId = 0;
function getTime() {
  return new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function ReactMemoVisualizer() {
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Render counts
  const [parentCount,  setParentCount]  = useState(0);
  const [childACount,  setChildACount]  = useState(0);
  const [childBCount,  setChildBCount]  = useState(0);
  const [childCCount,  setChildCCount]  = useState(0);

  // Flash state
  const [flashParent,  setFlashParent]  = useState(false);
  const [flashChildA,  setFlashChildA]  = useState(false);
  const [flashChildB,  setFlashChildB]  = useState(false);
  const [flashChildC,  setFlashChildC]  = useState(false);

  const [renderLog,    setRenderLog]    = useState<RenderLog[]>([]);
  const [comparison,   setComparison]   = useState<PropsComparison[] | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const animatingRef = useRef(false);

  const addLog = useCallback((component: string, reason: string, skipped: boolean) => {
    setRenderLog(prev => [{
      id: ++logId,
      component,
      reason,
      time: getTime(),
      skipped,
    }, ...prev].slice(0, 20));
  }, []);

  const flash = useCallback(async (
    setter: (v: boolean) => void,
    duration = 350
  ) => {
    setter(true);
    await new Promise(r => setTimeout(r, duration));
    setter(false);
  }, []);

  const incrementCount = useCallback(async () => {
    if (animatingRef.current) return;
    animatingRef.current = true;

    const newCount = count + 1;
    setCount(newCount);
    setParentCount(p => p + 1);

    // Show props comparison for ChildB
    setComparison([
      { propName: "count",  oldVal: String(count),  newVal: String(newCount), equal: false },
      { propName: "theme",  oldVal: theme,           newVal: theme,            equal: true  },
      { propName: "label",  oldVal: '"Child B"',     newVal: '"Child B"',      equal: true  },
    ]);
    setShowComparison(true);

    // Parent flashes
    await flash(setFlashParent);
    addLog("Parent", "setState(count++)", false);

    // ChildA always re-renders (no memo)
    await flash(setFlashChildA);
    setChildACount(c => c + 1);
    addLog("ChildA", "parent re-rendered (no memo)", false);

    // ChildB — memo checks props — count changed so re-renders
    await flash(setFlashChildB, 300);
    setChildBCount(c => c + 1);
    addLog("ChildB", "count prop changed", false);

    // ChildC — custom compare (only re-renders on theme change) — SKIPS
    addLog("ChildC", "count changed but custom compare returns true → SKIP", true);

    animatingRef.current = false;
  }, [count, theme, addLog, flash]);

  const changeTheme = useCallback(async () => {
    if (animatingRef.current) return;
    animatingRef.current = true;

    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    setParentCount(p => p + 1);

    // Props comparison for ChildB
    setComparison([
      { propName: "count",  oldVal: String(count), newVal: String(count), equal: true  },
      { propName: "theme",  oldVal: theme,          newVal: newTheme,      equal: false },
      { propName: "label",  oldVal: '"Child B"',    newVal: '"Child B"',   equal: true  },
    ]);
    setShowComparison(true);

    await flash(setFlashParent);
    addLog("Parent", "setState(theme)", false);

    // ChildA — no memo, always re-renders
    await flash(setFlashChildA);
    setChildACount(c => c + 1);
    addLog("ChildA", "parent re-rendered (no memo)", false);

    // ChildB — theme prop changed → re-renders
    await flash(setFlashChildB);
    setChildBCount(c => c + 1);
    addLog("ChildB", "theme prop changed", false);

    // ChildC — custom compare: theme changed → re-renders
    await flash(setFlashChildC);
    setChildCCount(c => c + 1);
    addLog("ChildC", "theme prop changed — custom compare false", false);

    animatingRef.current = false;
  }, [count, theme, addLog, flash]);

  const reset = useCallback(() => {
    setCount(0);
    setTheme("dark");
    setParentCount(0);
    setChildACount(0);
    setChildBCount(0);
    setChildCCount(0);
    setRenderLog([]);
    setComparison(null);
    setShowComparison(false);
    animatingRef.current = false;
  }, []);

  const themeAccent = theme === "light" ? "#F59E0B" : "#A855F7";

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <Button onClick={incrementCount}>
          Increment Count ({count})
        </Button>
        <Button variant="secondary" onClick={changeTheme}>
          Change Theme ({theme})
        </Button>
        <Button variant="secondary" onClick={() => setShowComparison(s => !s)}>
          {showComparison ? "Hide" : "Show"} Props Compare
        </Button>
        <Button variant="secondary" size="sm" onClick={reset}>Reset</Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Component Tree */}
        <div className="col-span-2 space-y-4">
          {/* Parent */}
          <ComponentBox
            label="Parent"
            subtitle={`count=${count}, theme="${theme}"`}
            flashing={flashParent}
            renderCount={parentCount}
            memoType="none"
            color="#6B7280"
            badge="State holder"
          />

          <div className="pl-8 space-y-3">
            {/* ChildA */}
            <ComponentBox
              label="ChildA"
              subtitle={`count=${count}, theme="${theme}"`}
              flashing={flashChildA}
              renderCount={childACount}
              memoType="none"
              color="#EF4444"
              badge="No memo"
              note="Always re-renders when parent does"
            />

            {/* ChildB */}
            <ComponentBox
              label="ChildB"
              subtitle={`count=${count}, theme="${theme}", label="Child B"`}
              flashing={flashChildB}
              renderCount={childBCount}
              memoType="memo"
              color="#3B82F6"
              badge="React.memo"
              note="Shallow prop comparison"
            />

            {/* ChildC */}
            <ComponentBox
              label="ChildC"
              subtitle={`theme="${theme}"`}
              flashing={flashChildC}
              renderCount={childCCount}
              memoType="custom"
              color="#A855F7"
              badge="memo + custom compare"
              note="Only re-renders when theme changes"
            />
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Props comparison */}
          <AnimatePresence>
            {showComparison && comparison && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Panel title="Props Comparison (ChildB)">
                  <div className="space-y-2">
                    {comparison.map((c) => (
                      <div key={c.propName} className="grid grid-cols-5 items-center gap-1 text-xs font-mono">
                        <span className="text-accent col-span-1">{c.propName}</span>
                        <span className="text-text-secondary col-span-1 text-right truncate">{c.oldVal}</span>
                        <span className="text-text-secondary text-center">→</span>
                        <span className={`col-span-1 truncate ${c.equal ? "text-text-secondary" : "text-yellow-400"}`}>
                          {c.newVal}
                        </span>
                        <motion.span
                          key={String(c.equal)}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`text-center ${c.equal ? "text-green-400" : "text-red-400"}`}
                        >
                          {c.equal ? "✓" : "✗"}
                        </motion.span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-border">
                      <p className="text-[10px] text-text-secondary">
                        React.memo does <span className="text-accent">shallow</span> comparison using Object.is()
                      </p>
                    </div>
                  </div>
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Render log */}
          <Panel title="Render Log">
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              <AnimatePresence initial={false}>
                {renderLog.length === 0 && (
                  <p className="text-xs text-text-secondary italic">No renders yet</p>
                )}
                {renderLog.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: "auto" }}
                    className={`text-xs rounded px-2 py-1.5 border ${
                      log.skipped
                        ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                        : "bg-[#0D0D0D] border-border text-text-secondary"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-mono font-bold ${
                        log.component === "Parent"  ? "text-[#6B7280]" :
                        log.component === "ChildA"  ? "text-red-400" :
                        log.component === "ChildB"  ? "text-blue-400" :
                        "text-purple-400"
                      }`}>
                        {log.component}
                      </span>
                      <span className="text-[9px] text-text-secondary">{log.time}</span>
                    </div>
                    <div className={`text-[10px] mt-0.5 ${log.skipped ? "text-purple-300" : "text-text-secondary"}`}>
                      {log.skipped ? "⏭ SKIPPED — " : "↻ "}{log.reason}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </Panel>

          {/* Theme indicator */}
          <Panel title="Current Theme">
            <motion.div
              animate={{ borderColor: themeAccent, backgroundColor: themeAccent + "11" }}
              className="rounded-lg border p-2 text-center"
            >
              <motion.div key={theme} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <div className="text-2xl mb-1">{theme === "light" ? "☀️" : "🌙"}</div>
                <div className="text-sm font-mono" style={{ color: themeAccent }}>{theme}</div>
              </motion.div>
            </motion.div>
          </Panel>
        </div>
      </div>

      {/* Key Insight */}
      <Panel title="Key Insight">
        <div className="grid grid-cols-3 gap-4 text-xs text-text-secondary">
          <div>
            <p className="text-red-400 font-medium mb-1">ChildA (no memo)</p>
            <p>Re-renders every time parent renders, regardless of whether its own props changed. Default React behavior.</p>
          </div>
          <div>
            <p className="text-blue-400 font-medium mb-1">ChildB (React.memo)</p>
            <p>Skips re-render if all props are shallowly equal. Uses <code className="text-accent">Object.is()</code> for comparison. Catches most cases.</p>
          </div>
          <div>
            <p className="text-purple-400 font-medium mb-1">ChildC (custom compare)</p>
            <p>
              <code className="text-accent">memo(Comp, (prev, next) =&gt; prev.theme === next.theme)</code> — only re-renders when theme changes, ignores count entirely.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

interface ComponentBoxProps {
  label: string;
  subtitle: string;
  flashing: boolean;
  renderCount: number;
  memoType: "none" | "memo" | "custom";
  color: string;
  badge: string;
  note?: string;
}

function ComponentBox({
  label, subtitle, flashing, renderCount, memoType, color, badge, note
}: ComponentBoxProps) {
  return (
    <motion.div
      animate={flashing ? {
        borderColor: color,
        backgroundColor: color + "18",
        boxShadow: `0 0 20px ${color}44`,
      } : {
        borderColor: "#374151",
        backgroundColor: "#111827",
        boxShadow: "none",
      }}
      transition={{ duration: 0.25 }}
      className="rounded-xl border p-4 relative"
    >
      {/* Render flash overlay */}
      <AnimatePresence>
        {flashing && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{ background: color + "22" }}
          />
        )}
      </AnimatePresence>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold font-mono" style={{ color }}>
            {label}
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded font-mono border"
            style={{ color, borderColor: color + "44", background: color + "11" }}
          >
            {badge}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {flashing && (
            <motion.span
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="text-xs font-mono px-1.5 py-0.5 rounded"
              style={{ background: color + "22", color }}
            >
              re-rendering!
            </motion.span>
          )}
          <motion.div
            key={renderCount}
            initial={{ scale: 1.6, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: renderCount > 0 ? color : "#374151" }}
          >
            {renderCount}
          </motion.div>
        </div>
      </div>

      <div className="mt-2 font-mono text-[11px] text-text-secondary truncate">
        props: {`{ ${subtitle} }`}
      </div>

      {memoType !== "none" && (
        <div className="mt-1 text-[10px] font-mono text-accent/70">
          {memoType === "memo"   ? "export default memo(ChildB)" :
                                   "export default memo(ChildC, (p, n) => p.theme === n.theme)"}
        </div>
      )}

      {note && (
        <div className="mt-1 text-[10px] text-text-secondary italic">{note}</div>
      )}
    </motion.div>
  );
}
