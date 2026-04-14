"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type TabMode = "trace" | "map";

interface ServiceNode {
  id: string;
  label: string;
  type: string;
  color: string;
  icon: string;
  failureRate: number;
  avgDuration: number;
}

const SERVICES: ServiceNode[] = [
  { id: "client", label: "Browser Client", type: "browser", color: "#0ea5e9", icon: "🌐", failureRate: 0, avgDuration: 0 },
  { id: "apim", label: "APIM Gateway", type: "gateway", color: "#8b5cf6", icon: "🔗", failureRate: 2, avgDuration: 12 },
  { id: "api", label: "Orders API", type: "app", color: "#10b981", icon: "⚙️", failureRate: 4, avgDuration: 45 },
  { id: "worker", label: "Worker Service", type: "app", color: "#f59e0b", icon: "🔄", failureRate: 8, avgDuration: 120 },
  { id: "sql", label: "Azure SQL", type: "database", color: "#06b6d4", icon: "🗄️", failureRate: 1, avgDuration: 18 },
];

interface Span {
  id: string;
  serviceId: string;
  label: string;
  duration: number;
  startOffset: number;
  statusCode: number;
  parentId: string | null;
  operationId: string;
  failed?: boolean;
  exceptionMessage?: string;
}

function generateSpans(failIndex: number | null, samplingPct: number): Span[] {
  const opId = "abc" + Math.random().toString(36).slice(2, 8);
  const spans: Span[] = [
    { id: "s1", serviceId: "client", label: "GET /orders", duration: 310, startOffset: 0, statusCode: failIndex !== null ? 500 : 200, parentId: null, operationId: opId },
    { id: "s2", serviceId: "apim", label: "APIM forward", duration: 62, startOffset: 8, statusCode: failIndex !== null && failIndex <= 1 ? 500 : 200, parentId: "s1", operationId: opId },
    { id: "s3", serviceId: "api", label: "OrdersController.Get", duration: 280, startOffset: 20, statusCode: failIndex !== null && failIndex <= 2 ? 500 : 200, parentId: "s2", operationId: opId, failed: failIndex === 2, exceptionMessage: failIndex === 2 ? "SqlException: Timeout expired. The timeout period elapsed prior to completion of the operation." : undefined },
    { id: "s4", serviceId: "worker", label: "ProcessOrderQueue", duration: 118, startOffset: 40, statusCode: failIndex !== null && failIndex <= 3 ? 500 : 200, parentId: "s3", operationId: opId, failed: failIndex === 3, exceptionMessage: failIndex === 3 ? "ServiceBusException: Lock expired on message. Another consumer may have processed it." : undefined },
    { id: "s5", serviceId: "sql", label: "sp_GetOrders", duration: 38, startOffset: 55, statusCode: failIndex !== null && failIndex <= 4 ? 500 : 200, parentId: "s3", operationId: opId, failed: failIndex === 4, exceptionMessage: failIndex === 4 ? "SqlException: Deadlock victim. Transaction rolled back." : undefined },
  ];

  // Simulate sampling
  if (samplingPct < 100) {
    const keepRatio = samplingPct / 100;
    return spans.filter((_, i) => i === 0 || Math.random() < keepRatio);
  }
  return spans;
}

export default function AppInsightsVisualizer() {
  const [tab, setTab] = useState<TabMode>("trace");
  const [spans, setSpans] = useState<Span[]>([]);
  const [running, setRunning] = useState(false);
  const [activeSpanId, setActiveSpanId] = useState<string | null>(null);
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);
  const [failIndex, setFailIndex] = useState<number | null>(null);
  const [sampling, setSampling] = useState(100);
  const [animatingIdx, setAnimatingIdx] = useState<number>(-1);

  const sendRequest = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setSpans([]);
    setSelectedSpan(null);
    setActiveSpanId(null);
    setAnimatingIdx(-1);

    const generated = generateSpans(failIndex, sampling);

    for (let i = 0; i < generated.length; i++) {
      setAnimatingIdx(i);
      setActiveSpanId(generated[i].id);
      setSpans(generated.slice(0, i + 1));
      await sleep(550);
    }
    setActiveSpanId(null);
    setAnimatingIdx(-1);
    setRunning(false);
  }, [running, failIndex, sampling]);

  const reset = () => {
    setSpans([]);
    setSelectedSpan(null);
    setActiveSpanId(null);
    setRunning(false);
    setAnimatingIdx(-1);
  };

  const totalDuration = spans.length > 0 ? Math.max(...spans.map((s) => s.startOffset + s.duration)) : 310;

  const serviceById = (id: string) => SERVICES.find((s) => s.id === id)!;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={sendRequest} disabled={running}>
          {running ? "Tracing..." : "Send Request"}
        </Button>
        <Button variant="secondary" onClick={reset} disabled={running}>
          Reset
        </Button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary font-mono">Failure at:</span>
          <select
            value={failIndex ?? "none"}
            onChange={(e) => setFailIndex(e.target.value === "none" ? null : Number(e.target.value))}
            disabled={running}
            className="text-xs font-mono bg-elevated border border-border rounded px-2 py-1 text-text-secondary"
          >
            <option value="none">No failure</option>
            <option value="2">Orders API</option>
            <option value="3">Worker Service</option>
            <option value="4">SQL Database</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary font-mono">Sampling:</span>
          <input
            type="range"
            min={10}
            max={100}
            step={10}
            value={sampling}
            onChange={(e) => setSampling(Number(e.target.value))}
            disabled={running}
            className="w-24 accent-[#0ea5e9]"
          />
          <span className="text-xs font-mono text-[#0ea5e9] w-10">{sampling}%</span>
        </div>

        <div className="ml-auto flex rounded-lg border border-border overflow-hidden text-xs font-mono">
          {(["trace", "map"] as TabMode[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 transition-colors capitalize ${tab === t ? "bg-[#0ea5e9]/20 text-[#0ea5e9]" : "text-text-secondary hover:bg-elevated"}`}
            >
              {t === "trace" ? "Distributed Trace" : "Application Map"}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === "trace" ? (
          <motion.div key="trace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Waterfall */}
            <Panel title="Distributed Trace — Waterfall">
              {spans.length === 0 ? (
                <p className="text-xs text-text-secondary opacity-40 italic">Click Send Request to trace a request through the service chain.</p>
              ) : (
                <div className="space-y-1.5">
                  {spans.map((span, i) => {
                    const svc = serviceById(span.serviceId);
                    const leftPct = (span.startOffset / totalDuration) * 100;
                    const widthPct = Math.max(2, (span.duration / totalDuration) * 100);
                    const isActive = activeSpanId === span.id;
                    const isFailed = span.failed || span.statusCode >= 400;

                    return (
                      <motion.div
                        key={span.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 cursor-pointer group"
                        style={{ paddingLeft: `${Math.min(i * 12, 48)}px` }}
                        onClick={() => setSelectedSpan(selectedSpan?.id === span.id ? null : span)}
                      >
                        <div className="w-28 flex-shrink-0 text-[10px] font-mono truncate" style={{ color: svc.color }}>
                          {svc.icon} {svc.label}
                        </div>
                        <div className="flex-1 relative h-5">
                          <div className="absolute inset-y-0 left-0 right-0 rounded bg-border/20" />
                          <motion.div
                            className="absolute inset-y-0.5 rounded"
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                              backgroundColor: isFailed ? "#ef4444" : isActive ? svc.color : `${svc.color}80`,
                              boxShadow: isActive ? `0 0 8px ${svc.color}60` : undefined,
                            }}
                            animate={isActive ? { opacity: [0.6, 1, 0.6] } : {}}
                            transition={{ repeat: Infinity, duration: 0.5 }}
                          />
                        </div>
                        <div className={`w-12 text-[10px] font-mono text-right ${isFailed ? "text-red-400" : "text-text-secondary"}`}>
                          {span.duration}ms
                        </div>
                        <div className={`w-10 text-[10px] font-mono text-right ${span.statusCode >= 400 ? "text-red-400" : "text-emerald-400"}`}>
                          {span.statusCode}
                        </div>
                      </motion.div>
                    );
                  })}

                  {sampling < 100 && (
                    <div className="mt-2 text-[10px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded px-2 py-1">
                      ⚠ Adaptive sampling at {sampling}% — some spans may be missing from this trace
                    </div>
                  )}
                </div>
              )}
            </Panel>

            {/* Span detail */}
            <AnimatePresence>
              {selectedSpan && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                >
                  <Panel title="Span Properties">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
                      {[
                        { k: "operation_Id", v: selectedSpan.operationId },
                        { k: "id", v: selectedSpan.id },
                        { k: "parentId", v: selectedSpan.parentId ?? "(root)" },
                        { k: "name", v: selectedSpan.label },
                        { k: "duration (ms)", v: String(selectedSpan.duration) },
                        { k: "resultCode", v: String(selectedSpan.statusCode) },
                      ].map(({ k, v }) => (
                        <div key={k} className="bg-background/60 rounded-lg p-2 border border-border">
                          <div className="text-[#0ea5e9] mb-0.5">{k}</div>
                          <div className="text-text-primary truncate">{v}</div>
                        </div>
                      ))}
                    </div>
                    {selectedSpan.exceptionMessage && (
                      <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <div className="text-[10px] font-mono text-red-400 font-bold mb-1">EXCEPTION</div>
                        <pre className="text-[10px] font-mono text-red-300 whitespace-pre-wrap leading-relaxed">
                          {selectedSpan.exceptionMessage}
                        </pre>
                      </div>
                    )}
                  </Panel>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Panel title="Application Map">
              <div className="relative min-h-[200px] overflow-x-auto">
                <div className="flex items-center justify-center gap-4 flex-wrap py-4">
                  {SERVICES.map((svc, i) => (
                    <div key={svc.id} className="flex items-center gap-3">
                      <div className="flex flex-col items-center gap-1">
                        <motion.div
                          className="w-16 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl"
                          style={{
                            borderColor: svc.color,
                            backgroundColor: `${svc.color}15`,
                            boxShadow: `0 0 12px ${svc.color}30`,
                          }}
                          whileHover={{ scale: 1.08 }}
                        >
                          {svc.icon}
                        </motion.div>
                        <span className="text-[10px] font-mono text-center w-20 leading-tight" style={{ color: svc.color }}>
                          {svc.label}
                        </span>
                        <div className="flex gap-2 text-[9px] font-mono">
                          <span className="text-red-400">{svc.failureRate}% fail</span>
                          {svc.avgDuration > 0 && (
                            <span className="text-text-secondary">{svc.avgDuration}ms</span>
                          )}
                        </div>
                      </div>
                      {i < SERVICES.length - 1 && (
                        <svg width="32" height="20" className="flex-shrink-0">
                          <defs>
                            <marker id={`arrow-${i}`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                              <path d="M0,0 L0,6 L6,3 z" fill={SERVICES[i + 1]?.color ?? "#2a2a2a"} />
                            </marker>
                          </defs>
                          <line x1="2" y1="10" x2="26" y2="10" stroke={SERVICES[i + 1]?.color ?? "#2a2a2a"} strokeWidth="1.5" opacity="0.5" markerEnd={`url(#arrow-${i})`} />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-2 text-[10px] text-text-secondary font-mono opacity-60">
                Application Map shows call dependencies, avg response times, and failure rates across your service topology.
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
