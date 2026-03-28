"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

const BLUE = "#3b82f6";
const GREEN = "#22c55e";
const RED = "#ef4444";
const YELLOW = "#f59e0b";
const PURPLE = "#a855f7";
const CYAN = "#06b6d4";
const GRAY = "#374151";

type Lifetime = "singleton" | "scoped" | "transient";
type RunState = "idle" | "resolving" | "done" | "error";

interface ServiceNode {
  id: string;
  label: string;
  lifetime: Lifetime;
  dependsOn?: string[];
}

const SERVICE_GRAPH: ServiceNode[] = [
  { id: "controller", label: "OrdersController", lifetime: "scoped",    dependsOn: ["service"] },
  { id: "service",    label: "OrderService",     lifetime: "scoped",    dependsOn: ["repo", "cache"] },
  { id: "repo",       label: "OrderRepository",  lifetime: "scoped",    dependsOn: ["db"] },
  { id: "db",         label: "AppDbContext",      lifetime: "scoped",    dependsOn: [] },
  { id: "cache",      label: "MemoryCache",       lifetime: "singleton", dependsOn: [] },
];

const LIFETIME_COLORS: Record<Lifetime, string> = {
  singleton: PURPLE,
  scoped:    BLUE,
  transient: CYAN,
};

const LIFETIME_LABELS: Record<Lifetime, string> = {
  singleton: "Singleton",
  scoped:    "Scoped",
  transient: "Transient",
};

// Simulated instance IDs per lifetime across two requests
function getInstanceId(nodeId: string, lifetime: Lifetime, requestIdx: number): string {
  if (lifetime === "singleton") return `#SGL-${nodeId.slice(0, 3).toUpperCase()}`;
  if (lifetime === "scoped")    return `#SCO-${nodeId.slice(0, 3).toUpperCase()}-R${requestIdx + 1}`;
  // transient: different per injection point (simulate with request + node)
  return `#TRN-${nodeId.slice(0, 3).toUpperCase()}-R${requestIdx + 1}-${Math.floor(Math.random() * 900 + 100)}`;
}

// Captive dependency warning: singleton depending on scoped
function hasCaptive(graph: ServiceNode[]): { singletonId: string; scopedId: string } | null {
  for (const node of graph) {
    if (node.lifetime === "singleton" && node.dependsOn) {
      for (const depId of node.dependsOn) {
        const dep = graph.find((n) => n.id === depId);
        if (dep && dep.lifetime === "scoped") {
          return { singletonId: node.id, scopedId: depId };
        }
      }
    }
  }
  return null;
}

export default function AspNetDIVisualizer() {
  // Per-node lifetime overrides (user can toggle)
  const [lifetimes, setLifetimes] = useState<Record<string, Lifetime>>(() =>
    Object.fromEntries(SERVICE_GRAPH.map((n) => [n.id, n.lifetime]))
  );
  const [runState, setRunState] = useState<RunState>("idle");
  const [resolvedNodes, setResolvedNodes] = useState<Set<string>>(new Set());
  const [instanceIds, setInstanceIds] = useState<Record<string, [string, string]>>({});

  // Build current graph from lifetime overrides
  const graph: ServiceNode[] = SERVICE_GRAPH.map((n) => ({
    ...n,
    lifetime: lifetimes[n.id],
  }));

  const captive = hasCaptive(graph);

  const cycleLifetime = (nodeId: string) => {
    if (runState !== "idle") return;
    const order: Lifetime[] = ["scoped", "singleton", "transient"];
    setLifetimes((prev) => {
      const curr = prev[nodeId];
      const next = order[(order.indexOf(curr) + 1) % order.length];
      return { ...prev, [nodeId]: next };
    });
  };

  const runRequests = useCallback(async () => {
    if (captive) return; // Block run if captive dependency
    setRunState("resolving");
    setResolvedNodes(new Set());
    setInstanceIds({});

    // Build topological resolution order
    const resolutionOrder = ["db", "cache", "repo", "service", "controller"];

    // Resolve request 1
    const ids1: Record<string, string> = {};
    for (const id of resolutionOrder) {
      const node = graph.find((n) => n.id === id)!;
      ids1[id] = getInstanceId(id, node.lifetime, 0);
      setResolvedNodes((prev) => new Set([...prev, id]));
      await sleep(350);
    }

    // Short pause
    await sleep(400);

    // Resolve request 2 (singletons reuse, scoped/transient are fresh)
    const ids2: Record<string, string> = {};
    for (const id of resolutionOrder) {
      const node = graph.find((n) => n.id === id)!;
      ids2[id] = node.lifetime === "singleton"
        ? ids1[id]  // same instance
        : getInstanceId(id, node.lifetime, 1);
      await sleep(200);
    }

    // Store both request instance IDs
    const combined: Record<string, [string, string]> = {};
    for (const id of resolutionOrder) {
      combined[id] = [ids1[id], ids2[id]];
    }
    setInstanceIds(combined);
    setRunState("done");
  }, [graph, captive]);

  const reset = () => {
    setRunState("idle");
    setResolvedNodes(new Set());
    setInstanceIds({});
  };

  const resetAll = () => {
    reset();
    setLifetimes(Object.fromEntries(SERVICE_GRAPH.map((n) => [n.id, n.lifetime])));
  };

  const isResolved = (id: string) => resolvedNodes.has(id);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={runRequests}
          disabled={runState === "resolving" || !!captive}
        >
          {runState === "resolving" ? "Resolving..." : "Simulate 2 Requests"}
        </Button>
        <Button variant="ghost" onClick={reset} disabled={runState === "resolving"}>
          Reset Run
        </Button>
        <Button variant="ghost" onClick={resetAll} disabled={runState === "resolving"}>
          Reset All
        </Button>
        <span className="text-xs text-text-secondary ml-auto">
          Click any service to cycle its lifetime
        </span>
      </div>

      {/* Captive dependency warning */}
      <AnimatePresence>
        {captive && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-lg border text-xs font-mono"
            style={{ borderColor: RED, backgroundColor: `${RED}10`, color: RED }}
          >
            <div className="font-bold mb-1">InvalidOperationException: Captive Dependency Detected</div>
            <div className="text-text-secondary font-sans">
              Cannot consume scoped service &apos;
              <span style={{ color: BLUE }}>{graph.find((n) => n.id === captive.scopedId)?.label}</span>
              &apos; from singleton &apos;
              <span style={{ color: PURPLE }}>{graph.find((n) => n.id === captive.singletonId)?.label}</span>
              &apos;.
            </div>
            <div className="mt-2 text-[11px] text-text-secondary">
              ⚠️ In Production (ValidateScopes=false), this silently shares the Scoped instance across all requests.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Dependency graph */}
        <div className="lg:col-span-2">
          <Panel title="Service Graph — Click to Toggle Lifetime" accentColor={BLUE}>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-4 pb-3 border-b border-border">
              {(["singleton", "scoped", "transient"] as Lifetime[]).map((lt) => (
                <div key={lt} className="flex items-center gap-1.5 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: LIFETIME_COLORS[lt] }} />
                  <span className="font-mono" style={{ color: LIFETIME_COLORS[lt] }}>
                    {LIFETIME_LABELS[lt]}
                  </span>
                </div>
              ))}
            </div>

            {/* Graph rows */}
            <div className="space-y-2">
              {/* Row 1: Controller */}
              <div className="flex justify-center">
                <ServiceNodeCard
                  node={{ ...graph.find((n) => n.id === "controller")!, lifetime: lifetimes["controller"] }}
                  resolved={isResolved("controller")}
                  isCaptive={false}
                  onClick={() => cycleLifetime("controller")}
                  instanceIds={instanceIds["controller"]}
                />
              </div>
              {/* Arrow */}
              <div className="flex justify-center text-text-secondary text-xs">↓ depends on</div>
              {/* Row 2: Service */}
              <div className="flex justify-center">
                <ServiceNodeCard
                  node={{ ...graph.find((n) => n.id === "service")!, lifetime: lifetimes["service"] }}
                  resolved={isResolved("service")}
                  isCaptive={false}
                  onClick={() => cycleLifetime("service")}
                  instanceIds={instanceIds["service"]}
                />
              </div>
              <div className="flex justify-center gap-20 text-text-secondary text-xs">
                <span>↓</span>
                <span>↓</span>
              </div>
              {/* Row 3: Repo + Cache */}
              <div className="flex justify-center gap-6 flex-wrap">
                {["repo", "cache"].map((id) => {
                  const node = { ...graph.find((n) => n.id === id)!, lifetime: lifetimes[id] };
                  const isCaptiveNode =
                    captive !== null &&
                    ((captive.singletonId === id) || (captive.scopedId === id));
                  return (
                    <ServiceNodeCard
                      key={id}
                      node={node}
                      resolved={isResolved(id)}
                      isCaptive={isCaptiveNode}
                      onClick={() => cycleLifetime(id)}
                      instanceIds={instanceIds[id]}
                    />
                  );
                })}
              </div>
              <div className="flex justify-center text-text-secondary text-xs">↓ (Repo depends on)</div>
              {/* Row 4: DbContext */}
              <div className="flex justify-center">
                <ServiceNodeCard
                  node={{ ...graph.find((n) => n.id === "db")!, lifetime: lifetimes["db"] }}
                  resolved={isResolved("db")}
                  isCaptive={false}
                  onClick={() => cycleLifetime("db")}
                  instanceIds={instanceIds["db"]}
                />
              </div>
            </div>
          </Panel>
        </div>

        {/* Right: Instance comparison panel */}
        <div className="space-y-4">
          <Panel title="Instance IDs: Request 1 vs Request 2" accentColor={BLUE}>
            <AnimatePresence mode="wait">
              {runState !== "done" ? (
                <motion.div
                  key="empty"
                  className="text-xs text-text-secondary text-center py-4 font-mono"
                >
                  {runState === "resolving" ? "Resolving..." : "Run the simulation to see instances"}
                </motion.div>
              ) : (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-2"
                >
                  {["controller", "service", "repo", "cache", "db"].map((id) => {
                    const node = graph.find((n) => n.id === id)!;
                    const lt = lifetimes[id];
                    const color = LIFETIME_COLORS[lt];
                    const ids = instanceIds[id];
                    const same = ids && ids[0] === ids[1];
                    return (
                      <div key={id} className="text-[10px] font-mono space-y-0.5">
                        <div style={{ color }} className="font-semibold">{node.label}</div>
                        <div className="flex gap-2 pl-2">
                          <span className="text-text-secondary">R1:</span>
                          <span style={{ color: same ? color : GREEN }}>{ids?.[0] ?? "—"}</span>
                        </div>
                        <div className="flex gap-2 pl-2">
                          <span className="text-text-secondary">R2:</span>
                          <span style={{ color: same ? color : CYAN }}>
                            {ids?.[1] ?? "—"}
                            {same && <span className="text-text-secondary ml-1">(reused)</span>}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </Panel>

          {/* Lifetime cheat sheet */}
          <Panel title="Lifetime Cheat Sheet" accentColor={BLUE}>
            <div className="space-y-3 text-xs">
              {(
                [
                  { lt: "singleton" as Lifetime, desc: "One instance, shared forever. Thread-safe required. Use for: caches, config, IHttpClientFactory." },
                  { lt: "scoped"    as Lifetime, desc: "One per HTTP request. Disposed at request end. Use for: DbContext, repositories, Unit of Work." },
                  { lt: "transient" as Lifetime, desc: "New on every inject. Good for stateless, lightweight services. Never for HttpClient." },
                ] as { lt: Lifetime; desc: string }[]
              ).map(({ lt, desc }) => (
                <div key={lt} className="p-2 rounded-lg border" style={{ borderColor: `${LIFETIME_COLORS[lt]}40`, backgroundColor: `${LIFETIME_COLORS[lt]}08` }}>
                  <div className="font-mono font-bold mb-1" style={{ color: LIFETIME_COLORS[lt] }}>
                    Add{lt.charAt(0).toUpperCase() + lt.slice(1)}
                  </div>
                  <div className="text-text-secondary leading-relaxed">{desc}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

interface ServiceNodeCardProps {
  node: ServiceNode;
  resolved: boolean;
  isCaptive: boolean;
  onClick: () => void;
  instanceIds?: [string, string];
}

function ServiceNodeCard({ node, resolved, isCaptive, onClick, instanceIds }: ServiceNodeCardProps) {
  const color = LIFETIME_COLORS[node.lifetime];
  const borderColor = isCaptive ? RED : resolved ? color : GRAY;

  return (
    <motion.button
      onClick={onClick}
      animate={{
        borderColor,
        backgroundColor: resolved ? `${color}12` : isCaptive ? `${RED}10` : "transparent",
        scale: isCaptive ? [1, 1.02, 1] : 1,
      }}
      transition={{ duration: 0.3, scale: { repeat: isCaptive ? Infinity : 0, duration: 1 } }}
      className="px-4 py-2.5 rounded-xl border-2 text-left min-w-[160px] cursor-pointer hover:opacity-90 transition-opacity"
      style={{ borderColor }}
    >
      <div className="text-xs font-semibold text-text-primary">{node.label}</div>
      <div className="text-[10px] font-mono mt-0.5" style={{ color }}>
        {LIFETIME_LABELS[node.lifetime]}
      </div>
      {instanceIds && (
        <div className="text-[9px] font-mono text-text-secondary mt-1">
          {instanceIds[0] === instanceIds[1]
            ? <span style={{ color }}>shared: {instanceIds[0]}</span>
            : <span>R1: {instanceIds[0]}</span>
          }
        </div>
      )}
      {isCaptive && (
        <div className="text-[9px] mt-1" style={{ color: RED }}>⚠ captive dep!</div>
      )}
    </motion.button>
  );
}
