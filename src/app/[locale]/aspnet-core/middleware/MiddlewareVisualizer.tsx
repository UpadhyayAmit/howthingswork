"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

const ACCENT = "#3b82f6";

interface MiddlewareLayer {
  id: string;
  name: string;
  description: string;
  shortCircuit: boolean;
  color: string;
  shortCircuitStatus: number;
}

const DEFAULT_LAYERS: MiddlewareLayer[] = [
  { id: "exc", name: "ExceptionHandler", description: "Catches unhandled exceptions", shortCircuit: false, color: "#ef4444", shortCircuitStatus: 500 },
  { id: "https", name: "HttpsRedirection", description: "Redirects HTTP → HTTPS", shortCircuit: false, color: "#f97316", shortCircuitStatus: 301 },
  { id: "cors", name: "CORS", description: "Adds Access-Control headers", shortCircuit: false, color: "#eab308", shortCircuitStatus: 403 },
  { id: "auth", name: "Authentication", description: "Populates HttpContext.User", shortCircuit: false, color: "#22c55e", shortCircuitStatus: 401 },
  { id: "routing", name: "Routing", description: "Resolves endpoint from URL", shortCircuit: false, color: "#3b82f6", shortCircuitStatus: 404 },
  { id: "authz", name: "Authorization", description: "Enforces [Authorize] policy", shortCircuit: false, color: "#a855f7", shortCircuitStatus: 403 },
  { id: "endpoint", name: "Endpoint", description: "Controller / Minimal API", shortCircuit: false, color: "#ec4899", shortCircuitStatus: 200 },
];

type Phase = "idle" | "request" | "response" | "done";

interface PacketState {
  layerIndex: number;
  direction: "down" | "up";
  shortCircuitAt: number | null;
}

export default function MiddlewareVisualizer() {
  const [layers, setLayers] = useState<MiddlewareLayer[]>(DEFAULT_LAYERS);
  const [phase, setPhase] = useState<Phase>("idle");
  const [packet, setPacket] = useState<PacketState | null>(null);
  const [visitedDown, setVisitedDown] = useState<Set<string>>(new Set());
  const [visitedUp, setVisitedUp] = useState<Set<string>>(new Set());
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [finalStatus, setFinalStatus] = useState<number | null>(null);

  const toggleShortCircuit = useCallback((id: string) => {
    if (running) return;
    setLayers(prev =>
      prev.map(l => l.id === id ? { ...l, shortCircuit: !l.shortCircuit } : l)
    );
  }, [running]);

  const reset = useCallback(() => {
    setPhase("idle");
    setPacket(null);
    setVisitedDown(new Set());
    setVisitedUp(new Set());
    setLog([]);
    setRunning(false);
    setFinalStatus(null);
  }, []);

  const runRequest = useCallback(async () => {
    reset();
    await sleep(50);
    setRunning(true);
    setPhase("request");

    const newLog: string[] = ["→ GET /api/users/42 HTTP/1.1"];
    const downVisited = new Set<string>();
    let shortCircuitIdx: number | null = null;
    let status = 200;

    // Walk down
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      setPacket({ layerIndex: i, direction: "down", shortCircuitAt: null });
      downVisited.add(layer.id);
      setVisitedDown(new Set(downVisited));
      newLog.push(`  [→] ${layer.name}: ${layer.description}`);
      setLog([...newLog]);
      await sleep(500);

      if (layer.shortCircuit) {
        status = layer.shortCircuitStatus;
        shortCircuitIdx = i;
        newLog.push(`  ⚡ SHORT-CIRCUIT: ${layer.name} responded ${status} — pipeline stopped`);
        setLog([...newLog]);
        setPacket({ layerIndex: i, direction: "down", shortCircuitAt: i });
        await sleep(600);
        break;
      }
    }

    // Walk up (response path)
    setPhase("response");
    const upStart = shortCircuitIdx !== null ? shortCircuitIdx : layers.length - 1;
    const upVisited = new Set<string>();

    for (let i = upStart; i >= 0; i--) {
      const layer = layers[i];
      setPacket({ layerIndex: i, direction: "up", shortCircuitAt: shortCircuitIdx });
      upVisited.add(layer.id);
      setVisitedUp(new Set(upVisited));
      newLog.push(`  [←] ${layer.name}: response path (${status})`);
      setLog([...newLog]);
      await sleep(400);
    }

    setFinalStatus(status);
    setPhase("done");
    setPacket(null);
    newLog.push(`✓ Response: ${status} ${status === 200 ? "OK" : status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : status === 404 ? "Not Found" : status === 301 ? "Moved Permanently" : "Error"}`);
    setLog([...newLog]);
    setRunning(false);
  }, [layers, reset]);

  const getLayerState = (layer: MiddlewareLayer, index: number) => {
    if (!packet) {
      if (phase === "done") {
        if (visitedDown.has(layer.id)) return "visited";
      }
      return "idle";
    }
    if (packet.layerIndex === index) return packet.direction === "down" ? "active-down" : "active-up";
    if (visitedDown.has(layer.id)) return "visited";
    return "idle";
  };

  return (
    <Panel title="Middleware Pipeline Simulator" accentColor={ACCENT}>
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="primary" onClick={runRequest} disabled={running}>
            {running ? "Request flowing…" : "▶ Send Request"}
          </Button>
          <Button variant="secondary" onClick={reset} disabled={running}>
            Reset
          </Button>
          <span className="text-xs text-text-secondary font-mono">
            Toggle "Short-circuit" on any middleware to stop the request there
          </span>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs font-mono text-text-secondary">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500/80 inline-block" /> Request path
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-500/80 inline-block" /> Response path
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" /> Short-circuit
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pipeline */}
          <div className="space-y-1.5 relative">
            {/* Vertical connector line */}
            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-border/50 z-0" />

            {layers.map((layer, index) => {
              const state = getLayerState(layer, index);
              const isActiveDown = state === "active-down";
              const isActiveUp = state === "active-up";
              const isVisited = state === "visited";
              const isShortCircuiting = layer.shortCircuit;

              return (
                <motion.div
                  key={layer.id}
                  layout
                  className="relative z-10 flex items-center gap-3"
                >
                  {/* Circle indicator */}
                  <motion.div
                    className="w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold font-mono transition-all duration-300"
                    style={{
                      borderColor: isActiveDown || isActiveUp ? layer.color : isVisited ? `${layer.color}60` : "#374151",
                      backgroundColor: isActiveDown ? `${layer.color}30` : isActiveUp ? `${layer.color}20` : "transparent",
                      boxShadow: isActiveDown || isActiveUp ? `0 0 12px ${layer.color}60` : "none",
                    }}
                    animate={isActiveDown || isActiveUp ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                    transition={{ duration: 0.4, repeat: isActiveDown || isActiveUp ? Infinity : 0 }}
                  >
                    <span style={{ color: layer.color }}>{index + 1}</span>
                  </motion.div>

                  {/* Layer card */}
                  <div
                    className="flex-1 rounded-lg border p-3 transition-all duration-300 cursor-pointer select-none"
                    style={{
                      borderColor: isActiveDown ? layer.color : isActiveUp ? `${layer.color}80` : isShortCircuiting ? "#eab30860" : "#374151",
                      backgroundColor: isActiveDown ? `${layer.color}15` : isActiveUp ? `${layer.color}08` : isShortCircuiting ? "#eab30808" : "#1a1a1a",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-semibold font-mono"
                            style={{ color: isActiveDown || isActiveUp ? layer.color : isVisited ? `${layer.color}90` : "#9ca3af" }}
                          >
                            {layer.name}
                          </span>
                          {isActiveDown && (
                            <motion.span
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="text-xs px-1.5 py-0.5 rounded font-mono"
                              style={{ backgroundColor: `${layer.color}25`, color: layer.color }}
                            >
                              → processing
                            </motion.span>
                          )}
                          {isActiveUp && (
                            <motion.span
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="text-xs px-1.5 py-0.5 rounded font-mono bg-purple-500/20 text-purple-400"
                            >
                              ← response
                            </motion.span>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">{layer.description}</p>
                      </div>

                      {/* Short-circuit toggle */}
                      <button
                        onClick={() => toggleShortCircuit(layer.id)}
                        disabled={running}
                        className="flex-shrink-0 flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-all duration-200"
                        style={{
                          borderColor: isShortCircuiting ? "#eab308" : "#374151",
                          backgroundColor: isShortCircuiting ? "#eab30820" : "transparent",
                          color: isShortCircuiting ? "#eab308" : "#6b7280",
                          opacity: running ? 0.5 : 1,
                        }}
                        title={`Short-circuit: respond with ${layer.shortCircuitStatus}`}
                      >
                        ⚡ {layer.shortCircuitStatus}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Final status */}
            <AnimatePresence>
              {finalStatus !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 ml-[52px] px-4 py-2.5 rounded-lg border font-mono text-sm"
                  style={{
                    borderColor: finalStatus === 200 ? "#22c55e60" : "#ef444460",
                    backgroundColor: finalStatus === 200 ? "#22c55e10" : "#ef444410",
                    color: finalStatus === 200 ? "#22c55e" : "#ef4444",
                  }}
                >
                  HTTP {finalStatus} — response delivered to client
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Log */}
          <div
            className="rounded-lg border border-border bg-black/40 p-3 font-mono text-xs min-h-[280px] overflow-y-auto"
            style={{ maxHeight: "420px" }}
          >
            <div className="text-text-secondary mb-2 uppercase tracking-widest text-[10px]">Request Log</div>
            {log.length === 0 ? (
              <span className="text-text-secondary/50 italic">Press "Send Request" to simulate the pipeline…</span>
            ) : (
              log.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={
                    line.startsWith("✓")
                      ? "text-green-400 mt-2"
                      : line.includes("SHORT-CIRCUIT")
                      ? "text-yellow-400"
                      : line.startsWith("→")
                      ? "text-blue-400 font-bold"
                      : line.includes("[←]")
                      ? "text-purple-400"
                      : "text-text-secondary"
                  }
                >
                  {line}
                </motion.div>
              ))
            )}
            {running && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="text-blue-400"
              >
                ▌
              </motion.span>
            )}
          </div>
        </div>

        <p className="text-xs text-text-secondary font-mono">
          Tip: Click ⚡ on multiple middleware to see how short-circuiting affects the response path.
          Notice how outer middleware (ExceptionHandler, CORS) always runs on the way back up.
        </p>
      </div>
    </Panel>
  );
}
