"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type Tab = "slots" | "scale" | "alwayson";
type SwapPhase = "idle" | "warming" | "shifting" | "complete";

interface SlotConfig {
  version: string;
  env: string;
  dbConn: string;
  isProduction: boolean;
}

interface ScaleInstance {
  id: string;
  cpuPct: number;
}

export default function AppServiceVisualizer() {
  const [tab, setTab] = useState<Tab>("slots");

  // --- Slots tab state ---
  const [production, setProduction] = useState<SlotConfig>({
    version: "v1.0.0",
    env: "Production",
    dbConn: "Server=prod-sql;Database=ProdDB",
    isProduction: true,
  });
  const [staging, setStaging] = useState<SlotConfig>({
    version: "v2.0.0",
    env: "Staging",
    dbConn: "Server=staging-sql;Database=StagingDB",
    isProduction: false,
  });
  const [swapPhase, setSwapPhase] = useState<SwapPhase>("idle");
  const [trafficPct, setTrafficPct] = useState(0);
  const [swapLogs, setSwapLogs] = useState<string[]>([]);
  const [stickyEnabled, setStickyEnabled] = useState(true);

  // --- Scale tab state ---
  const [scaleInstances, setScaleInstances] = useState<ScaleInstance[]>([
    { id: "inst-1", cpuPct: 28 },
  ]);
  const [isScalingSim, setIsScalingSim] = useState(false);
  const cpuSimRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Always On tab state ---
  const [alwaysOn, setAlwaysOn] = useState(false);
  const [heartbeatCount, setHeartbeatCount] = useState(0);
  const [coldStartTimer, setColdStartTimer] = useState(0);
  const coldTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Slots ───────────────────────────────────────────────────

  const doSwap = useCallback(async () => {
    if (swapPhase !== "idle") return;
    setSwapLogs([]);
    setTrafficPct(0);

    setSwapPhase("warming");
    setSwapLogs(["→ Swap initiated — warming up staging slot..."]);
    await sleep(900);
    setSwapLogs((p) => [...p, "  GET https://app-staging.azurewebsites.net/ → 200 OK"]);
    await sleep(600);
    setSwapLogs((p) => [...p, "  Staging slot warm — beginning traffic shift..."]);

    setSwapPhase("shifting");
    for (let pct = 0; pct <= 100; pct += 10) {
      setTrafficPct(pct);
      await sleep(120);
    }
    setSwapLogs((p) => [...p, "  Traffic shifted 100% → new app version"]);
    await sleep(400);

    setSwapPhase("complete");

    // Swap app versions; conditionally swap db conn strings
    setProduction((prev) => ({
      ...prev,
      version: staging.version,
      dbConn: stickyEnabled ? prev.dbConn : staging.dbConn,
    }));
    setStaging((prev) => ({
      ...prev,
      version: production.version,
      dbConn: stickyEnabled ? prev.dbConn : production.dbConn,
    }));

    const connNote = stickyEnabled
      ? "  ✓ Connection strings are slot-sticky — prod keeps prod DB"
      : "  ⚠ Connection strings NOT sticky — staging DB conn is now in prod!";
    setSwapLogs((p) => [
      ...p,
      "✓ Swap complete — production now running " + staging.version,
      connNote,
    ]);
  }, [swapPhase, staging, production, stickyEnabled]);

  const resetSwap = () => {
    setSwapPhase("idle");
    setTrafficPct(0);
    setSwapLogs([]);
    setProduction({ version: "v1.0.0", env: "Production", dbConn: "Server=prod-sql;Database=ProdDB", isProduction: true });
    setStaging({ version: "v2.0.0", env: "Staging", dbConn: "Server=staging-sql;Database=StagingDB", isProduction: false });
  };

  // ─── Scale ────────────────────────────────────────────────────

  const startCpuSim = useCallback(() => {
    if (isScalingSim) return;
    setIsScalingSim(true);

    // Ramp up CPU on existing instances, then trigger scale-out
    let tick = 0;
    cpuSimRef.current = setInterval(() => {
      tick++;
      setScaleInstances((prev) => {
        const updated = prev.map((inst) => ({
          ...inst,
          cpuPct: Math.min(95, inst.cpuPct + 8 + Math.random() * 5),
        }));

        // At tick 6 (~3s), add a new instance if avg CPU > 70
        const avg = updated.reduce((s, i) => s + i.cpuPct, 0) / updated.length;
        if (tick === 6 && avg > 70 && updated.length < 4) {
          const newId = `inst-${updated.length + 1}`;
          return [...updated, { id: newId, cpuPct: 12 }];
        }
        // At tick 10, start cooling down
        if (tick > 9) {
          return updated.map((inst) => ({
            ...inst,
            cpuPct: Math.max(15, inst.cpuPct - 12),
          }));
        }
        return updated;
      });

      if (tick > 14) {
        clearInterval(cpuSimRef.current!);
        setIsScalingSim(false);
      }
    }, 500);
  }, [isScalingSim]);

  const resetScale = () => {
    if (cpuSimRef.current) clearInterval(cpuSimRef.current);
    setIsScalingSim(false);
    setScaleInstances([{ id: "inst-1", cpuPct: 28 }]);
  };

  // ─── Always On ───────────────────────────────────────────────

  const toggleAlwaysOn = (enabled: boolean) => {
    setAlwaysOn(enabled);

    // Clear any running timers
    if (coldTimerRef.current) clearInterval(coldTimerRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    setColdStartTimer(0);
    setHeartbeatCount(0);

    if (enabled) {
      // Heartbeat every 2s (simulated 20s in reality)
      let hb = 0;
      heartbeatRef.current = setInterval(() => {
        hb++;
        setHeartbeatCount(hb);
      }, 2000);
    } else {
      // Count up cold start timer
      let elapsed = 0;
      coldTimerRef.current = setInterval(() => {
        elapsed++;
        setColdStartTimer(elapsed);
      }, 200);
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────

  const cpuColor = (pct: number) =>
    pct >= 70 ? "#ef4444" : pct >= 50 ? "#f59e0b" : "#10b981";

  const avgCpu =
    scaleInstances.reduce((s, i) => s + i.cpuPct, 0) / scaleInstances.length;

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex rounded-lg border border-border overflow-hidden text-xs font-mono w-fit">
        {(["slots", "scale", "alwayson"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 transition-colors ${
              tab === t
                ? "bg-[#0ea5e9]/20 text-[#0ea5e9]"
                : "text-text-secondary hover:bg-elevated"
            }`}
          >
            {t === "slots" ? "Deployment Slots" : t === "scale" ? "Auto-Scale" : "Always On"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── SLOTS TAB ── */}
        {tab === "slots" && (
          <motion.div
            key="slots"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Sticky toggle */}
            <div className="flex items-center gap-3 p-3 bg-elevated border border-border rounded-xl text-xs font-mono">
              <span className="text-text-secondary">Slot-sticky connection strings:</span>
              <button
                onClick={() => { if (swapPhase === "idle") setStickyEnabled((v) => !v); }}
                className={`px-3 py-1 rounded-lg border transition-all ${
                  stickyEnabled
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                    : "border-red-500/50 bg-red-500/15 text-red-400"
                }`}
              >
                {stickyEnabled ? "✓ ENABLED" : "✗ DISABLED"}
              </button>
              <span className="text-text-muted opacity-60 ml-1">
                {stickyEnabled
                  ? "DB conn strings stay in their slot after swap"
                  : "DB conn strings WILL travel with the app on swap"}
              </span>
            </div>

            {/* Slot cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { slot: production, label: "Production", color: "#0ea5e9" },
                { slot: staging, label: "Staging", color: "#8b5cf6" },
              ].map(({ slot, label, color }) => (
                <motion.div
                  key={label}
                  className="border rounded-xl p-4 space-y-3"
                  style={{
                    borderColor: color,
                    backgroundColor: `${color}10`,
                  }}
                  animate={
                    swapPhase === "complete"
                      ? { scale: [1, 1.03, 1] }
                      : {}
                  }
                  transition={{ duration: 0.4 }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-mono font-bold uppercase tracking-wider"
                      style={{ color }}
                    >
                      {label}
                    </span>
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      {slot.version}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="flex gap-2">
                      <span className="text-text-muted w-16 flex-shrink-0">ENV</span>
                      <span className="text-text-secondary">{slot.env}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-text-muted w-16 flex-shrink-0">DB CONN</span>
                      <span
                        className={
                          !stickyEnabled && swapPhase === "complete" && label === "Production"
                            ? "text-red-400"
                            : "text-text-secondary"
                        }
                      >
                        {slot.dbConn}
                      </span>
                    </div>
                    {!stickyEnabled && swapPhase === "complete" && label === "Production" && (
                      <div className="text-[10px] text-red-400 mt-1">
                        ⚠ Staging DB in production!
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Traffic bar */}
            {swapPhase === "shifting" && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-text-secondary">
                  <span>Traffic: v1.0.0</span>
                  <span>v2.0.0</span>
                </div>
                <div className="h-4 bg-elevated rounded-full overflow-hidden border border-border">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      width: `${trafficPct}%`,
                      background: "linear-gradient(90deg, #8b5cf6, #0ea5e9)",
                    }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
                <div className="text-[10px] font-mono text-[#0ea5e9] text-right">
                  {trafficPct}% on new version
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={doSwap}
                disabled={swapPhase !== "idle"}
                size="sm"
              >
                {swapPhase === "idle"
                  ? "⇄ Swap Slots"
                  : swapPhase === "warming"
                  ? "Warming up…"
                  : swapPhase === "shifting"
                  ? "Shifting traffic…"
                  : "✓ Complete"}
              </Button>
              <Button variant="secondary" onClick={resetSwap} disabled={swapPhase !== "idle" && swapPhase !== "complete"} size="sm">
                ↺ Reset
              </Button>
            </div>

            {/* Swap log */}
            {swapLogs.length > 0 && (
              <div className="bg-background/60 rounded-lg p-3 border border-border font-mono text-xs space-y-1">
                {swapLogs.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={
                      line.startsWith("✓")
                        ? "text-emerald-400"
                        : line.includes("⚠")
                        ? "text-red-400"
                        : "text-text-secondary"
                    }
                  >
                    {line}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── SCALE TAB ── */}
        {tab === "scale" && (
          <motion.div
            key="scale"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Panel title="Auto-Scale Simulation — CPU-Based" accentColor="#0ea5e9">
              <div className="flex items-center gap-3 mb-4">
                <Button onClick={startCpuSim} disabled={isScalingSim} size="sm">
                  ▶ Simulate Load Spike
                </Button>
                <Button variant="secondary" onClick={resetScale} size="sm">
                  ↺ Reset
                </Button>
                <span className="text-xs font-mono text-text-secondary ml-auto">
                  Scale rule: CPU &gt; 70% → add instance (5-min window)
                </span>
              </div>

              {/* CPU average indicator */}
              <div className="mb-4">
                <div className="flex justify-between text-[10px] font-mono mb-1">
                  <span className="text-text-secondary">Avg CPU across plan</span>
                  <span style={{ color: cpuColor(avgCpu) }}>
                    {avgCpu.toFixed(0)}%
                    {avgCpu >= 70 && (
                      <span className="ml-2 text-amber-400 animate-pulse">▲ scale-out rule firing…</span>
                    )}
                  </span>
                </div>
                <div className="h-3 bg-elevated rounded-full overflow-hidden border border-border">
                  <motion.div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, avgCpu)}%`,
                      backgroundColor: cpuColor(avgCpu),
                    }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-text-muted mt-0.5">
                  <span>0%</span>
                  <span className="text-amber-500/80">70% threshold</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Instance cards */}
              <div className="flex flex-wrap gap-3">
                <AnimatePresence>
                  {scaleInstances.map((inst, idx) => (
                    <motion.div
                      key={inst.id}
                      initial={{ opacity: 0, scale: 0.7, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className="border rounded-xl p-4 w-32 text-center space-y-2"
                      style={{
                        borderColor: cpuColor(inst.cpuPct),
                        backgroundColor: `${cpuColor(inst.cpuPct)}12`,
                      }}
                    >
                      <div className="text-[10px] font-mono text-text-secondary">
                        Instance {idx + 1}
                        {idx === scaleInstances.length - 1 && scaleInstances.length > 1 && (
                          <span className="block text-[#0ea5e9]">NEW</span>
                        )}
                      </div>
                      <div
                        className="text-lg font-bold font-mono"
                        style={{ color: cpuColor(inst.cpuPct) }}
                      >
                        {inst.cpuPct.toFixed(0)}%
                      </div>
                      <div className="text-[9px] font-mono text-text-muted">CPU</div>
                      <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, inst.cpuPct)}%`,
                            backgroundColor: cpuColor(inst.cpuPct),
                          }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <p className="text-[10px] font-mono text-text-muted mt-3 leading-relaxed">
                When avg CPU exceeds 70% for 5 minutes, the scale controller adds one instance. New instances
                start cold but the load balancer routes to them once healthy. Cooldown prevents immediate scale-in.
              </p>
            </Panel>
          </motion.div>
        )}

        {/* ── ALWAYS ON TAB ── */}
        {tab === "alwayson" && (
          <motion.div
            key="alwayson"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Panel title="Always On Behavior" accentColor="#10b981">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm font-mono text-text-secondary">Always On:</span>
                <button
                  onClick={() => toggleAlwaysOn(!alwaysOn)}
                  className={`relative w-12 h-6 rounded-full border transition-all ${
                    alwaysOn
                      ? "bg-emerald-500/30 border-emerald-500/60"
                      : "bg-elevated border-border"
                  }`}
                >
                  <motion.div
                    className="absolute top-0.5 w-5 h-5 rounded-full"
                    style={{
                      backgroundColor: alwaysOn ? "#10b981" : "#6b7280",
                    }}
                    animate={{ left: alwaysOn ? "24px" : "2px" }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  />
                </button>
                <span
                  className="text-sm font-mono font-semibold"
                  style={{ color: alwaysOn ? "#10b981" : "#ef4444" }}
                >
                  {alwaysOn ? "ON" : "OFF"}
                </span>
              </div>

              <AnimatePresence mode="wait">
                {alwaysOn ? (
                  <motion.div
                    key="on"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                      <div className="text-sm font-mono text-emerald-400 mb-2">
                        Worker process: RUNNING
                      </div>
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="w-3 h-3 rounded-full bg-emerald-400"
                          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        />
                        <span className="text-xs font-mono text-text-secondary">
                          Heartbeat ping every 20s — pings received: {heartbeatCount}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-text-secondary leading-relaxed">
                      Azure sends a periodic GET request to your app root to keep the worker process alive.
                      First request latency stays at ~50–200ms even after long idle periods.
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="off"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <div className="text-sm font-mono text-red-400 mb-2">
                        Worker process will recycle after idle timeout
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-text-secondary">
                          Cold start countdown (simulated):
                        </span>
                        <span className="text-sm font-mono font-bold text-amber-400">
                          +{(coldStartTimer * 0.25).toFixed(1)}s
                        </span>
                      </div>
                      <div className="mt-2 h-2 bg-elevated rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-amber-500"
                          style={{
                            width: `${Math.min(100, (coldStartTimer / 20) * 100)}%`,
                          }}
                          transition={{ duration: 0.2 }}
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl text-[11px] font-mono text-amber-400 leading-relaxed">
                      ⚠ Free (F1) and Shared (D1) tiers do not support Always On.
                      Next user request after idle will see a 5–15s cold start.
                    </div>
                    <div className="text-xs text-text-secondary leading-relaxed">
                      Without Always On, IIS unloads the application after ~20 minutes of inactivity.
                      The next request triggers ASP.NET Core initialization, DI container build, and
                      EF Core model compilation — all blocking the first response.
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
