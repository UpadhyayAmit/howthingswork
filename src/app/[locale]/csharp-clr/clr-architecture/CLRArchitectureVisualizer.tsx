"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Panel from "@/app/_ui/Panel";

interface LayerInfo {
  id: string;
  label: string;
  sublabel: string;
  color: string;
  borderColor: string;
  textColor: string;
  detail: {
    heading: string;
    body: string;
    facts: string[];
  };
}

const LAYERS: LayerInfo[] = [
  {
    id: "assembly-loader",
    label: "Assembly Loader",
    sublabel: "AssemblyLoadContext · PE Parser · Fusion",
    color: "bg-violet-500/10",
    borderColor: "border-violet-500/40",
    textColor: "text-violet-400",
    detail: {
      heading: "Assembly Loader & ALC",
      body: "Reads the PE (Portable Executable) file format, maps sections into memory, resolves assembly dependencies via the AssemblyDependencyResolver, and assigns the assembly to an AssemblyLoadContext. Each ALC is an independent type universe.",
      facts: [
        "Default ALC — all application assemblies",
        "Collectible ALCs — plugin isolation, can be unloaded",
        "typeof(T) identity is scoped per ALC",
        "AssemblyLoadContext.Default.Resolving for missing assembly hooks",
      ],
    },
  },
  {
    id: "metadata",
    label: "Metadata & Type System",
    sublabel: "CTS · CLI Spec · Reflection",
    color: "bg-fuchsia-500/10",
    borderColor: "border-fuchsia-500/40",
    textColor: "text-fuchsia-400",
    detail: {
      heading: "Metadata & CTS",
      body: "The CLR reads metadata tables (TypeDef, MethodDef, FieldDef, etc.) to build an in-memory representation of every type. The Common Type System defines how all .NET languages share types — an int in C# is the same CTS Int32 as an Integer in VB.NET.",
      facts: [
        "Metadata stored in ECMA-335 table format inside PE",
        "Type.GetMembers() reads these tables at runtime",
        "Verifier checks IL against metadata for type safety",
        "MethodTable per type: vtable, interface map, GC info",
      ],
    },
  },
  {
    id: "jit",
    label: "JIT Compiler (RyuJIT)",
    sublabel: "Tier 0 → Tier 1 · PGO · SIMD",
    color: "bg-sky-500/10",
    borderColor: "border-sky-500/40",
    textColor: "text-sky-400",
    detail: {
      heading: "RyuJIT — Tiered Compilation",
      body: "Methods start at Tier 0 (fast, minimal optimization) on first call. After a call count threshold (~30 calls), they're queued for Tier 1 recompilation with full optimizations. .NET 7+ adds Profile-Guided Optimization (dynamic PGO) to specialize hot paths based on observed types.",
      facts: [
        "Tier 0: quick compile, no inlining — minimizes startup latency",
        "Tier 1: RyuJIT full optimizer — inlining, loop unrolling, SIMD",
        "On-stack replacement (OSR) in .NET 7+ for long-running loops",
        "[MethodImpl(AggressiveOptimization)] skips Tier 0",
      ],
    },
  },
  {
    id: "gc",
    label: "Garbage Collector",
    sublabel: "Gen0 / Gen1 / Gen2 · LOH · POH",
    color: "bg-emerald-500/10",
    borderColor: "border-emerald-500/40",
    textColor: "text-emerald-400",
    detail: {
      heading: "Generational GC",
      body: "The CLR GC is a generational, compacting, concurrent collector. Most objects die young (Gen0 collected frequently, fast). Survivors promote to Gen1, then Gen2. The LOH (>85KB objects) is collected only during full GC and is not compacted by default — a major source of production fragmentation bugs.",
      facts: [
        "Gen0 collection: <1ms typical, triggered ~every few MB",
        "LOH threshold: 85,000 bytes — never compacted by default",
        "POH (Pinned Object Heap) in .NET 5+ avoids GC scan overhead",
        "Server GC: one heap per logical CPU core for throughput",
      ],
    },
  },
  {
    id: "threadpool",
    label: "Thread Pool & Sync",
    sublabel: "Hill-climbing · SynchronizationContext · I/O Completion",
    color: "bg-amber-500/10",
    borderColor: "border-amber-500/40",
    textColor: "text-amber-400",
    detail: {
      heading: "Thread Pool & SynchronizationContext",
      body: "The CLR thread pool manages worker threads using a hill-climbing algorithm — it monitors throughput and injects or retires threads to find the optimal count. SynchronizationContext is the abstraction async/await uses to dispatch continuations — missing ConfigureAwait(false) in library code causes deadlocks when the SC is single-threaded (ASP.NET classic, WinForms).",
      facts: [
        "Thread injection rate: max 2 new threads/second to avoid thrashing",
        "I/O threads separate from worker threads — IOCP on Windows",
        "SynchronizationContext.Current == null in ASP.NET Core (safe to await anywhere)",
        "ThreadPool.SetMinThreads() avoids starvation on bursty workloads",
      ],
    },
  },
];

const REQUEST_STEPS = [
  "assembly-loader",
  "metadata",
  "jit",
  "gc",
  "threadpool",
];

export default function CLRArchitectureVisualizer() {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [requestPos, setRequestPos] = useState<number>(-1);
  const [isAnimating, setIsAnimating] = useState(false);

  const animateRequest = async () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setRequestPos(-1);
    for (let i = 0; i < REQUEST_STEPS.length; i++) {
      await new Promise((r) => setTimeout(r, 500));
      setRequestPos(i);
    }
    await new Promise((r) => setTimeout(r, 600));
    setRequestPos(-1);
    setIsAnimating(false);
  };

  const activeLayerInfo = activeLayer
    ? LAYERS.find((l) => l.id === activeLayer)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={animateRequest}
          disabled={isAnimating}
          className="px-4 py-2 rounded-lg bg-accent/15 border border-accent/40 text-accent text-sm font-medium hover:bg-accent/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isAnimating ? "Executing..." : "▶ Trace a Method Call"}
        </button>
        <span className="text-xs text-text-secondary font-mono">
          Click a layer to see what it does
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Layer Stack */}
        <div className="space-y-2">
          <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-3">
            CLR Layer Stack
          </p>
          {LAYERS.map((layer, i) => {
            const isActive = activeLayer === layer.id;
            const isRequest = requestPos === i;

            return (
              <motion.button
                key={layer.id}
                onClick={() =>
                  setActiveLayer(isActive ? null : layer.id)
                }
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 relative overflow-hidden ${
                  isActive
                    ? `${layer.color} ${layer.borderColor} ${layer.textColor}`
                    : "bg-elevated border-border text-text-secondary hover:border-accent/30"
                }`}
                animate={{
                  scale: isRequest ? 1.02 : 1,
                  x: isRequest ? 4 : 0,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {isRequest && (
                  <motion.div
                    className="absolute inset-0 bg-accent/10 rounded-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 0.4, repeat: Infinity }}
                  />
                )}
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <span className="text-sm font-semibold block">
                      {layer.label}
                    </span>
                    <span className="text-xs opacity-60 font-mono">
                      {layer.sublabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isRequest && (
                      <motion.div
                        className="w-2 h-2 rounded-full bg-accent"
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ duration: 0.3, repeat: Infinity }}
                      />
                    )}
                    <span className="text-xs opacity-40">
                      {isActive ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {/* Connector arrow */}
                {i < LAYERS.length - 1 && (
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                    <svg width="16" height="14">
                      <path
                        d="M8 0 L8 10 M4 7 L8 11 L12 7"
                        stroke={requestPos > i ? "#A855F7" : "#3a3a3a"}
                        strokeWidth={1.5}
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Detail Panel */}
        <div className="lg:sticky lg:top-4 h-fit">
          <AnimatePresence mode="wait">
            {activeLayerInfo ? (
              <motion.div
                key={activeLayerInfo.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Panel
                  title={activeLayerInfo.detail.heading}
                  accentColor="#A855F7"
                >
                  <div className="space-y-4">
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {activeLayerInfo.detail.body}
                    </p>
                    <div>
                      <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-2">
                        Key Facts
                      </p>
                      <ul className="space-y-2">
                        {activeLayerInfo.detail.facts.map((fact, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-xs text-text-secondary"
                          >
                            <span
                              className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeLayerInfo.textColor.replace("text-", "bg-")}`}
                            />
                            <span className="font-mono leading-relaxed">
                              {fact}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Panel>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Panel title="CLR Layer Details" accentColor="#A855F7">
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-3">
                      <span className="text-accent text-lg">⚙</span>
                    </div>
                    <p className="text-sm text-text-secondary">
                      Click any layer to see what the CLR does at that stage
                    </p>
                    <p className="text-xs text-text-secondary/50 mt-2">
                      Or trace a method call to watch data flow through all layers
                    </p>
                  </div>
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Legend */}
          <div className="mt-3 p-3 rounded-lg border border-border bg-elevated/50">
            <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-2">
              Memory Regions
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Gen0/1", color: "bg-emerald-500/40", desc: "Short-lived" },
                { label: "Gen2", color: "bg-emerald-700/40", desc: "Long-lived" },
                { label: "LOH", color: "bg-red-500/30", desc: ">85KB objects" },
                { label: "POH", color: "bg-sky-500/30", desc: "Pinned (.NET 5+)" },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-sm ${r.color} border border-white/10`} />
                  <span className="text-xs text-text-secondary font-mono">
                    {r.label}
                    <span className="opacity-50 ml-1">— {r.desc}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
