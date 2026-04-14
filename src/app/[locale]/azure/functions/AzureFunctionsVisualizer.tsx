"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type TriggerType = "http" | "timer" | "servicebus" | "blob";
type RunPhase =
  | "idle"
  | "cold-worker"
  | "cold-host"
  | "cold-extensions"
  | "cold-index"
  | "executing"
  | "done-cold"
  | "done-warm";

interface ColdPhase {
  id: string;
  label: string;
  durationMs: number;
  color: string;
  description: string;
}

const COLD_PHASES: ColdPhase[] = [
  {
    id: "worker",
    label: "Worker process spin-up",
    durationMs: 800,
    color: "#f59e0b",
    description: "OS allocates a new compute instance and starts the dotnet isolated worker process",
  },
  {
    id: "host",
    label: "Functions host init",
    durationMs: 400,
    color: "#0ea5e9",
    description: "functionshost.exe starts its internal HTTP server and gRPC channel to the worker",
  },
  {
    id: "extensions",
    label: "Extension bundle loading",
    durationMs: 300,
    color: "#8b5cf6",
    description: "Binding extensions (ServiceBus, CosmosDB, Blob) are loaded from the extension bundle",
  },
  {
    id: "index",
    label: "Function indexing",
    durationMs: 150,
    color: "#10b981",
    description: "Worker registers function entry points with the host over gRPC",
  },
];

const TRIGGERS: { type: TriggerType; label: string; icon: string; color: string }[] = [
  { type: "http", label: "HTTP Trigger", icon: "🌐", color: "#0ea5e9" },
  { type: "timer", label: "Timer Trigger", icon: "⏰", color: "#f59e0b" },
  { type: "servicebus", label: "Service Bus", icon: "📨", color: "#8b5cf6" },
  { type: "blob", label: "Blob Trigger", icon: "📦", color: "#10b981" },
];

interface Instance {
  id: string;
  warm: boolean;
  label: string;
}

interface LogEntry {
  text: string;
  type: "info" | "success" | "warn" | "timing";
}

export default function AzureFunctionsVisualizer() {
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType>("http");
  const [phase, setPhase] = useState<RunPhase>("idle");
  const [completedPhases, setCompletedPhases] = useState<string[]>([]);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [scaleCount, setScaleCount] = useState(1);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalColdMs, setTotalColdMs] = useState(0);
  const [tab, setTab] = useState<"invoke" | "scale">("invoke");

  const addLog = useCallback((text: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [...prev, { text, type }]);
  }, []);

  const invoke = useCallback(async () => {
    if (phase !== "idle" && phase !== "done-cold" && phase !== "done-warm") return;

    const isWarm = phase === "done-cold" || phase === "done-warm";

    if (isWarm) {
      // Warm path
      setPhase("executing");
      addLog("→ Invoke (warm path) — worker process already running", "info");
      await sleep(80);
      setPhase("done-warm");
      addLog("✓ Function executed in ~12ms (warm)", "timing");
      return;
    }

    // Cold start path
    setCompletedPhases([]);
    setLogs([]);
    let elapsed = 0;

    const triggerLabel = TRIGGERS.find((t) => t.type === selectedTrigger)!.label;
    addLog(`→ ${triggerLabel} fired — no warm instance available`, "info");
    addLog("  Starting cold start sequence...", "warn");

    for (const cp of COLD_PHASES) {
      setPhase(("cold-" + cp.id) as RunPhase);
      setActivePhaseId(cp.id);
      addLog(`  [${elapsed}ms] ${cp.label}...`, "info");
      await sleep(cp.durationMs);
      elapsed += cp.durationMs;
      setCompletedPhases((prev) => [...prev, cp.id]);
      addLog(`  [${elapsed}ms] ${cp.label} — done`, "success");
    }

    setActivePhaseId(null);
    setTotalColdMs(elapsed);

    setPhase("executing");
    addLog(`  [${elapsed}ms] Executing function...`, "info");
    await sleep(300);
    elapsed += 300;
    setPhase("done-cold");
    addLog(`✓ Cold start complete. Total: ${elapsed}ms`, "timing");
    addLog('  Next invocation will be warm (~12ms)', "success");

    // Ensure at least one warm instance shows
    if (instances.length === 0) {
      setInstances([{ id: "i1", warm: true, label: "Instance #1" }]);
    }
  }, [phase, selectedTrigger, instances, addLog]);

  const reset = () => {
    setPhase("idle");
    setCompletedPhases([]);
    setActivePhaseId(null);
    setLogs([]);
    setTotalColdMs(0);
  };

  const scaleOut = useCallback(async () => {
    if (scaleCount >= 6) return;
    const newCount = scaleCount + 1;
    setScaleCount(newCount);
    const newInstance: Instance = {
      id: `i${newCount}`,
      warm: false,
      label: `Instance #${newCount}`,
    };
    setInstances((prev) => [...prev, newInstance]);
    await sleep(600);
    setInstances((prev) =>
      prev.map((inst) => (inst.id === newInstance.id ? { ...inst, warm: true } : inst))
    );
  }, [scaleCount]);

  const scaleToZero = useCallback(() => {
    setInstances([]);
    setScaleCount(1);
    // Also reset invoke state so cold start shows again next time
    setPhase("idle");
    setCompletedPhases([]);
    setLogs([]);
    setTotalColdMs(0);
  }, []);

  const isRunning =
    phase === "cold-worker" ||
    phase === "cold-host" ||
    phase === "cold-extensions" ||
    phase === "cold-index" ||
    phase === "executing";

  const trigger = TRIGGERS.find((t) => t.type === selectedTrigger)!;

  return (
    <div className="space-y-4">
      {/* Tab selector */}
      <div className="flex rounded-lg border border-border overflow-hidden text-xs font-mono w-fit">
        {(["invoke", "scale"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 transition-colors capitalize ${
              tab === t
                ? "bg-[#0ea5e9]/20 text-[#0ea5e9]"
                : "text-text-secondary hover:bg-elevated"
            }`}
          >
            {t === "invoke" ? "Invoke & Cold Start" : "Scale Out"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "invoke" && (
          <motion.div
            key="invoke"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Trigger selector */}
            <Panel title="Select Trigger Type">
              <div className="flex flex-wrap gap-2">
                {TRIGGERS.map((t) => (
                  <button
                    key={t.type}
                    onClick={() => {
                      if (!isRunning) {
                        setSelectedTrigger(t.type);
                        reset();
                      }
                    }}
                    className={`px-3 py-2 rounded-lg border text-xs font-mono flex items-center gap-2 transition-all ${
                      selectedTrigger === t.type
                        ? "border-opacity-60"
                        : "border-border text-text-secondary hover:border-border/80"
                    }`}
                    style={
                      selectedTrigger === t.type
                        ? {
                            borderColor: t.color,
                            backgroundColor: `${t.color}18`,
                            color: t.color,
                          }
                        : {}
                    }
                  >
                    <span>{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </Panel>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Cold start phases */}
              <Panel title="Host Lifecycle" accentColor={trigger.color}>
                <div className="space-y-2 mb-4">
                  {COLD_PHASES.map((cp) => {
                    const isDone = completedPhases.includes(cp.id);
                    const isActive = activePhaseId === cp.id;
                    return (
                      <div key={cp.id} className="flex items-center gap-3">
                        {/* Status icon */}
                        <motion.div
                          className="w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 text-[10px]"
                          style={{
                            borderColor: isDone
                              ? cp.color
                              : isActive
                              ? cp.color
                              : "#374151",
                            backgroundColor: isDone
                              ? `${cp.color}30`
                              : isActive
                              ? `${cp.color}18`
                              : "transparent",
                          }}
                          animate={
                            isActive
                              ? {
                                  boxShadow: [
                                    `0 0 0px ${cp.color}00`,
                                    `0 0 8px ${cp.color}80`,
                                    `0 0 0px ${cp.color}00`,
                                  ],
                                }
                              : {}
                          }
                          transition={{ repeat: isActive ? Infinity : 0, duration: 0.7 }}
                        >
                          {isDone ? (
                            <span style={{ color: cp.color }}>✓</span>
                          ) : isActive ? (
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              style={{ color: cp.color }}
                            >
                              ◌
                            </motion.span>
                          ) : (
                            <span className="text-border">○</span>
                          )}
                        </motion.div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="text-xs font-mono truncate"
                              style={{
                                color: isDone || isActive ? cp.color : "#6b7280",
                              }}
                            >
                              {cp.label}
                            </span>
                            <span
                              className="text-[10px] font-mono flex-shrink-0"
                              style={{ color: isDone ? cp.color : "#374151" }}
                            >
                              ~{cp.durationMs}ms
                            </span>
                          </div>
                          {isActive && (
                            <motion.p
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="text-[10px] text-text-muted mt-0.5 leading-relaxed"
                            >
                              {cp.description}
                            </motion.p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total timing */}
                {totalColdMs > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-t border-border pt-3 flex items-center justify-between text-xs font-mono"
                  >
                    <span className="text-text-secondary">Cold start total</span>
                    <span className="text-amber-400 font-bold">{totalColdMs}ms</span>
                  </motion.div>
                )}
                {(phase === "done-cold" || phase === "done-warm") && (
                  <div className="mt-1 flex items-center justify-between text-xs font-mono">
                    <span className="text-text-secondary">Warm invocation</span>
                    <span className="text-emerald-400 font-bold">~12ms</span>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={invoke}
                    disabled={isRunning}
                    size="sm"
                  >
                    {phase === "done-cold" || phase === "done-warm"
                      ? "▶ Invoke Again (warm)"
                      : "▶ Invoke"}
                  </Button>
                  <Button variant="secondary" onClick={reset} disabled={isRunning} size="sm">
                    ↺ Reset
                  </Button>
                </div>
              </Panel>

              {/* Execution log */}
              <Panel title="Execution Log">
                <div className="bg-background/60 rounded-lg p-3 h-[220px] overflow-y-auto font-mono text-xs space-y-1 border border-border">
                  {logs.length === 0 ? (
                    <span className="text-text-secondary opacity-40">
                      Select a trigger and click Invoke…
                    </span>
                  ) : (
                    logs.map((log, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={
                          log.type === "success"
                            ? "text-emerald-400"
                            : log.type === "warn"
                            ? "text-amber-400"
                            : log.type === "timing"
                            ? "text-[#0ea5e9] font-bold"
                            : "text-text-secondary"
                        }
                      >
                        {log.text}
                      </motion.div>
                    ))
                  )}
                </div>
              </Panel>
            </div>
          </motion.div>
        )}

        {tab === "scale" && (
          <motion.div
            key="scale"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Panel title="Instance Scale Out / Scale to Zero" accentColor="#0ea5e9">
              <div className="mb-4 flex items-center gap-3">
                <Button
                  onClick={scaleOut}
                  disabled={scaleCount >= 6}
                  size="sm"
                >
                  + Scale Out
                </Button>
                <Button
                  variant="secondary"
                  onClick={scaleToZero}
                  disabled={instances.length === 0}
                  size="sm"
                >
                  ⬛ Scale to Zero
                </Button>
                <span className="text-xs font-mono text-text-secondary ml-auto">
                  {instances.length} / 6 instances
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 min-h-[160px]">
                <AnimatePresence>
                  {instances.map((inst) => (
                    <motion.div
                      key={inst.id}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ type: "spring", stiffness: 300, damping: 22 }}
                      className="border rounded-xl p-4 flex flex-col items-center gap-2 text-center"
                      style={{
                        borderColor: inst.warm ? "#0ea5e9" : "#374151",
                        backgroundColor: inst.warm ? "#0ea5e920" : "#11111180",
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm"
                        style={{
                          borderColor: inst.warm ? "#0ea5e9" : "#374151",
                          backgroundColor: inst.warm ? "#0ea5e930" : "transparent",
                        }}
                      >
                        {inst.warm ? "✓" : (
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="block"
                          >
                            ◌
                          </motion.span>
                        )}
                      </div>
                      <span
                        className="text-[11px] font-mono"
                        style={{ color: inst.warm ? "#0ea5e9" : "#6b7280" }}
                      >
                        {inst.label}
                      </span>
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: inst.warm ? "#0ea5e915" : "#37415130",
                          color: inst.warm ? "#0ea5e9" : "#6b7280",
                        }}
                      >
                        {inst.warm ? "warm" : "starting…"}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {instances.length === 0 && (
                  <div className="col-span-3 flex items-center justify-center h-32">
                    <span className="text-xs font-mono text-text-muted opacity-50">
                      No instances — scaled to zero
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-amber-500/8 border border-amber-500/20 rounded-lg text-[11px] font-mono text-amber-400 leading-relaxed">
                ⚠ Scale to zero means the next request hits a cold start. Premium plan keeps
                pre-warmed instances to avoid this.
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
