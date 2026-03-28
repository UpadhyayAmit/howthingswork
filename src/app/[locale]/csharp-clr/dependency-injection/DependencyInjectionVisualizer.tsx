"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";

type Lifetime = "Singleton" | "Scoped" | "Transient";

interface ServiceReg {
  id: string;
  name: string;
  lifetime: Lifetime;
  description: string;
}

const AVAILABLE_SERVICES: ServiceReg[] = [
  { id: "db", name: "AppDbContext", lifetime: "Scoped", description: "EF Core DbContext — one per request" },
  { id: "repo", name: "UserRepository", lifetime: "Scoped", description: "Depends on AppDbContext" },
  { id: "cache", name: "IMemoryCache", lifetime: "Singleton", description: "In-process cache" },
  { id: "logger", name: "ILogger<T>", lifetime: "Singleton", description: "Microsoft.Extensions.Logging" },
  { id: "email", name: "EmailSender", lifetime: "Transient", description: "Stateless, new per injection" },
  { id: "http", name: "IHttpClientFactory", lifetime: "Singleton", description: "Manages socket lifetime" },
];

const LIFETIME_COLORS: Record<Lifetime, { border: string; bg: string; text: string; dot: string }> = {
  Singleton: { border: "border-purple-500/50", bg: "bg-purple-500/10", text: "text-purple-300", dot: "bg-purple-500" },
  Scoped: { border: "border-cyan-500/50", bg: "bg-cyan-500/10", text: "text-cyan-300", dot: "bg-cyan-500" },
  Transient: { border: "border-amber-500/50", bg: "bg-amber-500/10", text: "text-amber-300", dot: "bg-amber-500" },
};

interface ServiceInstance {
  id: string;
  serviceId: string;
  name: string;
  lifetime: Lifetime;
  requestId: number;
  instanceNum: number;
  isCaptive?: boolean;
}

let instanceCounter = 0;

export default function DependencyInjectionVisualizer() {
  const [registered, setRegistered] = useState<ServiceReg[]>([]);
  const [instances, setInstances] = useState<ServiceInstance[]>([]);
  const [resolved, setResolved] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [captiveWarning, setCaptiveWarning] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const addService = (svc: ServiceReg) => {
    if (registered.find((r) => r.id === svc.id)) return;
    setRegistered((prev) => [...prev, svc]);
    setLog((prev) => [`services.Add${svc.lifetime}(${svc.name});`, ...prev.slice(0, 9)]);
  };

  const removeService = (id: string) => {
    setRegistered((prev) => prev.filter((r) => r.id !== id));
    setLog((prev) => [`// Removed ${id} from container`, ...prev.slice(0, 9)]);
  };

  const reset = () => {
    setRegistered([]);
    setInstances([]);
    setResolved(false);
    setResolving(false);
    setCaptiveWarning(null);
    setLog([]);
    instanceCounter = 0;
  };

  const resolveServices = useCallback(async () => {
    if (registered.length === 0 || resolving) return;
    setResolving(true);
    setInstances([]);
    setCaptiveWarning(null);

    const newInstances: ServiceInstance[] = [];
    const singletonPool: Record<string, ServiceInstance> = {};

    // Check for captive dependency: Singleton depending on Scoped
    const singletons = registered.filter((r) => r.lifetime === "Singleton");
    const scoped = registered.filter((r) => r.lifetime === "Scoped");

    // db is scoped, repo depends on db — if repo is singleton that's captive
    const hasCaptive =
      singletons.some((s) => s.id === "repo") && scoped.some((s) => s.id === "db");

    // Simulate two HTTP requests
    for (let req = 1; req <= 2; req++) {
      for (const svc of registered) {
        if (svc.lifetime === "Singleton") {
          if (singletonPool[svc.id]) {
            // reuse
            newInstances.push({ ...singletonPool[svc.id], requestId: req });
          } else {
            const inst: ServiceInstance = {
              id: `${svc.id}-${++instanceCounter}`,
              serviceId: svc.id,
              name: svc.name,
              lifetime: svc.lifetime,
              requestId: req,
              instanceNum: instanceCounter,
              isCaptive: hasCaptive && svc.id === "repo",
            };
            singletonPool[svc.id] = inst;
            newInstances.push(inst);
          }
        } else if (svc.lifetime === "Scoped") {
          // one per request — find existing for this request
          const existing = newInstances.find(
            (i) => i.serviceId === svc.id && i.requestId === req && i.lifetime === "Scoped"
          );
          if (!existing) {
            newInstances.push({
              id: `${svc.id}-req${req}-${++instanceCounter}`,
              serviceId: svc.id,
              name: svc.name,
              lifetime: svc.lifetime,
              requestId: req,
              instanceNum: instanceCounter,
            });
          }
        } else {
          // Transient — new every injection (show 2 per request for demo)
          newInstances.push({
            id: `${svc.id}-req${req}-inj1-${++instanceCounter}`,
            serviceId: svc.id,
            name: svc.name,
            lifetime: svc.lifetime,
            requestId: req,
            instanceNum: instanceCounter,
          });
          newInstances.push({
            id: `${svc.id}-req${req}-inj2-${++instanceCounter}`,
            serviceId: svc.id,
            name: svc.name,
            lifetime: svc.lifetime,
            requestId: req,
            instanceNum: instanceCounter,
          });
        }
      }
    }

    setInstances(newInstances);
    setResolved(true);

    if (hasCaptive) {
      setCaptiveWarning(
        "⚠ CAPTIVE DEPENDENCY: UserRepository is Singleton but AppDbContext is Scoped. " +
          "The first request's DbContext is captured forever — subsequent requests reuse a disposed DbContext. " +
          "System.InvalidOperationException: 'Cannot access a disposed context' in prod."
      );
    }

    setLog((prev) => [
      `// Resolved ${registered.length} services across 2 HTTP requests`,
      `// ${newInstances.filter((i, idx, arr) => arr.findIndex((x) => x.id === i.id) === idx).length} total instances created`,
      ...prev.slice(0, 8),
    ]);

    setResolving(false);
  }, [registered, resolving]);

  const getInstancesForRequest = (reqId: number) => {
    // For singletons, deduplicate — only show first occurrence
    const seen = new Set<string>();
    return instances.filter((i) => {
      if (i.lifetime === "Singleton") {
        if (seen.has(i.serviceId)) return false;
        seen.add(i.serviceId);
        return true;
      }
      return i.requestId === reqId;
    });
  };

  const singletonInstances = instances.filter(
    (i, idx, arr) => i.lifetime === "Singleton" && arr.findIndex((x) => x.serviceId === i.serviceId) === idx
  );

  return (
    <div className="space-y-4">
      {/* Registration */}
      <Panel title="Step 1 — Register Services (click to add)">
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_SERVICES.map((svc) => {
            const isAdded = registered.some((r) => r.id === svc.id);
            const colors = LIFETIME_COLORS[svc.lifetime];
            return (
              <button
                key={svc.id}
                onClick={() => (isAdded ? removeService(svc.id) : addService(svc))}
                className={`text-left rounded-lg border p-3 transition-all duration-200 min-w-[160px] ${
                  isAdded
                    ? `${colors.border} ${colors.bg}`
                    : "border-border bg-elevated opacity-60 hover:opacity-90"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isAdded ? colors.dot : "bg-border"}`} />
                  <span className={`text-xs font-mono font-semibold ${isAdded ? colors.text : "text-text-secondary"}`}>
                    {svc.lifetime}
                  </span>
                </div>
                <p className="text-xs font-mono text-text-primary">{svc.name}</p>
                <p className="text-[10px] text-text-secondary mt-0.5">{svc.description}</p>
                {isAdded && (
                  <p className="text-[10px] text-red-400 mt-1">click to remove</p>
                )}
              </button>
            );
          })}
        </div>
      </Panel>

      {/* Simulate */}
      <div className="flex gap-2 items-center">
        <Button
          onClick={resolveServices}
          disabled={registered.length === 0 || resolving}
        >
          {resolving ? "Resolving…" : "Simulate 2 HTTP Requests"}
        </Button>
        <Button variant="secondary" onClick={reset} size="sm">
          Reset
        </Button>
        {registered.length === 0 && (
          <span className="text-xs text-text-secondary font-mono">Add services first</span>
        )}
      </div>

      {/* Captive dependency warning */}
      <AnimatePresence>
        {captiveWarning && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border border-red-500/50 bg-red-500/10 rounded-xl p-4"
          >
            <p className="text-xs font-mono text-red-400 leading-relaxed">{captiveWarning}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instance visualization */}
      <AnimatePresence>
        {resolved && instances.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            {/* Singleton column */}
            <Panel title="Singleton — shared across all" accentColor="#A855F7">
              <div className="space-y-2">
                {singletonInstances.length === 0 ? (
                  <p className="text-xs text-text-secondary font-mono italic">No singletons registered</p>
                ) : (
                  singletonInstances.map((inst) => (
                    <motion.div
                      key={inst.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`rounded-lg border p-3 ${
                        inst.isCaptive
                          ? "border-red-500/60 bg-red-500/10"
                          : "border-purple-500/40 bg-purple-500/10"
                      }`}
                    >
                      <p className="font-mono text-xs text-purple-300 font-semibold">{inst.name}</p>
                      <p className="text-[10px] text-text-secondary font-mono">
                        instance #{inst.instanceNum} — shared by both requests
                      </p>
                      {inst.isCaptive && (
                        <p className="text-[10px] text-red-400 mt-1 font-mono">
                          ⚠ captures Scoped service!
                        </p>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </Panel>

            {/* Request 1 */}
            <Panel title="Request 1 — /api/orders" accentColor="#06B6D4">
              <div className="space-y-2">
                {getInstancesForRequest(1)
                  .filter((i) => i.lifetime !== "Singleton")
                  .map((inst, i) => {
                    const colors = LIFETIME_COLORS[inst.lifetime];
                    return (
                      <motion.div
                        key={inst.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className={`rounded-lg border p-3 ${colors.border} ${colors.bg}`}
                      >
                        <div className="flex items-center justify-between">
                          <p className={`font-mono text-xs font-semibold ${colors.text}`}>{inst.name}</p>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${colors.border} ${colors.text}`}>
                            {inst.lifetime}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-secondary font-mono">
                          instance #{inst.instanceNum}
                        </p>
                      </motion.div>
                    );
                  })}
              </div>
            </Panel>

            {/* Request 2 */}
            <Panel title="Request 2 — /api/orders" accentColor="#06B6D4">
              <div className="space-y-2">
                {getInstancesForRequest(2)
                  .filter((i) => i.lifetime !== "Singleton")
                  .map((inst, i) => {
                    const colors = LIFETIME_COLORS[inst.lifetime];
                    return (
                      <motion.div
                        key={inst.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 + 0.1 }}
                        className={`rounded-lg border p-3 ${colors.border} ${colors.bg}`}
                      >
                        <div className="flex items-center justify-between">
                          <p className={`font-mono text-xs font-semibold ${colors.text}`}>{inst.name}</p>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${colors.border} ${colors.text}`}>
                            {inst.lifetime}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-secondary font-mono">
                          instance #{inst.instanceNum}
                          {inst.lifetime === "Scoped"
                            ? " — new for req 2"
                            : inst.lifetime === "Transient"
                            ? " — new per injection"
                            : ""}
                        </p>
                      </motion.div>
                    );
                  })}
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Registration log */}
      {log.length > 0 && (
        <Panel title="IServiceCollection Log">
          <div className="space-y-1 font-mono text-[11px] max-h-[100px] overflow-y-auto">
            {log.map((entry, i) => (
              <div
                key={i}
                className={
                  entry.startsWith("services")
                    ? "text-accent"
                    : entry.startsWith("// Resolved")
                    ? "text-green-400"
                    : "text-text-secondary"
                }
              >
                {entry}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        {(Object.entries(LIFETIME_COLORS) as [Lifetime, typeof LIFETIME_COLORS[Lifetime]][]).map(
          ([lifetime, colors]) => (
            <div key={lifetime} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
              <span className={`text-xs font-mono ${colors.text}`}>{lifetime}</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
