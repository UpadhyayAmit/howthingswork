"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type Mode = "codesplit" | "datafetch" | "streaming";
type SplitPhase = "idle" | "navigating" | "loading" | "done";
type FetchPhase = "idle" | "suspended" | "resolved";
type StreamPhase = "idle" | "shell" | "streaming" | "done";

function Shimmer() {
  return (
    <div className="space-y-2">
      {[80, 60, 70, 50].map((w, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
          className="h-3 rounded bg-white/10"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  );
}

function CodeSplitDemo() {
  const [phase, setPhase] = useState<SplitPhase>("idle");
  const [progress, setProgress] = useState(0);

  const run = useCallback(async () => {
    setPhase("navigating");
    setProgress(0);
    await sleep(300);
    setPhase("loading");
    // animate progress
    for (let i = 0; i <= 100; i += 5) {
      await sleep(80);
      setProgress(i);
    }
    await sleep(200);
    setPhase("done");
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setProgress(0);
  }, []);

  return (
    <div className="space-y-4">
      {/* Bundle diagram */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-[#0d1117] p-3">
          <div className="text-xs text-text-secondary mb-2 font-mono">main.bundle.js</div>
          <div className="space-y-1">
            {["App", "Header", "Layout", "Router"].map((c) => (
              <div key={c} className="h-5 rounded bg-purple-500/20 border border-purple-500/30 flex items-center px-2">
                <span className="text-xs font-mono text-purple-400">{c}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-text-secondary">~42kb</div>
        </div>

        <div className="rounded-lg border border-border bg-[#0d1117] p-3 relative overflow-hidden">
          <div className="text-xs text-text-secondary mb-2 font-mono">lazy.chunk.js</div>
          <div
            className={`space-y-1 transition-opacity duration-300 ${
              phase === "done" ? "opacity-100" : "opacity-40"
            }`}
          >
            {["LazyDashboard", "Charts", "DataGrid"].map((c) => (
              <div key={c} className="h-5 rounded bg-cyan-500/20 border border-cyan-500/30 flex items-center px-2">
                <span className="text-xs font-mono text-cyan-400">{c}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-text-secondary">~28kb (on demand)</div>

          <AnimatePresence>
            {phase === "loading" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#0d1117]/90 flex flex-col items-center justify-center gap-2 p-3"
              >
                <div className="w-full bg-border rounded-full h-1.5">
                  <motion.div
                    className="h-full rounded-full bg-cyan-400"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.08 }}
                  />
                </div>
                <span className="text-xs text-cyan-400 font-mono">{progress}%</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Suspense boundary */}
      <div className="rounded-lg border-2 border-dashed border-yellow-500/40 p-3 relative">
        <div className="absolute -top-2.5 left-3 bg-bg px-1.5 text-xs text-yellow-400 font-mono">
          &lt;Suspense fallback=&#123;&lt;Spinner /&gt;&#125;&gt;
        </div>

        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs text-text-secondary italic text-center py-4">
              Lazy component not yet loaded
            </motion.div>
          )}
          {phase === "navigating" && (
            <motion.div key="nav" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs text-yellow-400 text-center py-4">
              Navigating...
            </motion.div>
          )}
          {phase === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 py-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full"
              />
              <span className="text-xs text-yellow-400">Suspense fallback active</span>
            </motion.div>
          )}
          {phase === "done" && (
            <motion.div key="done" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded bg-cyan-500/10 border border-cyan-500/30 p-3">
              <div className="text-xs font-mono text-cyan-400 mb-1">LazyDashboard rendered</div>
              <div className="space-y-1">
                {["Dashboard content loaded", "Charts ready", "Data grid initialized"].map((t, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="text-xs text-text-secondary">• {t}</motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Waterfall */}
      <div className="space-y-1">
        <div className="text-xs text-text-secondary mb-1">Network waterfall</div>
        {[
          { label: "HTML + main.bundle.js", color: "bg-purple-500", delay: 0, width: 40 },
          { label: "lazy.chunk.js", color: "bg-cyan-500", delay: 0.3, width: 25, conditional: phase !== "idle" },
        ].map((bar) => (
          <div key={bar.label} className="flex items-center gap-2 text-xs">
            <span className="w-36 text-text-secondary text-right">{bar.label}</span>
            <div className="flex-1 h-4 bg-border/30 rounded relative overflow-hidden">
              <AnimatePresence>
                {(!bar.conditional || bar.conditional) && phase !== "idle" && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${bar.width}%` }}
                    transition={{ delay: bar.delay, duration: 0.6 }}
                    className={`absolute left-0 top-0 h-full ${bar.color} opacity-70 rounded`}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={run} disabled={phase !== "idle"} size="sm">
          Navigate to Lazy Component
        </Button>
        <Button variant="secondary" onClick={reset} size="sm">Reset</Button>
      </div>
    </div>
  );
}

function DataFetchDemo() {
  const [phase, setPhase] = useState<FetchPhase>("idle");

  const run = useCallback(async () => {
    setPhase("suspended");
    await sleep(2200);
    setPhase("resolved");
  }, []);

  const reset = useCallback(() => setPhase("idle"), []);

  return (
    <div className="space-y-4">
      {/* Component tree */}
      <div className="rounded-lg border border-border bg-[#0d1117] p-3 text-xs font-mono">
        <div className="text-text-secondary">Component tree:</div>
        <div className="mt-2 space-y-1 pl-3">
          <div className="text-purple-400">&lt;App&gt;</div>
          <div className="pl-4 text-purple-400">&lt;UserProfile userId=&#123;1&#125; /&gt;</div>
          <div className="pl-8 text-yellow-400">↑ throws Promise while fetching</div>
        </div>
      </div>

      {/* Suspense boundary catching the thrown promise */}
      <div className="rounded-lg border-2 border-dashed border-yellow-500/40 p-3 relative">
        <div className="absolute -top-2.5 left-3 bg-bg px-1.5 text-xs text-yellow-400 font-mono">
          &lt;Suspense&gt; catches thrown Promise
        </div>

        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.div key="idle" exit={{ opacity: 0 }}
              className="text-xs text-text-secondary italic text-center py-4">
              Waiting to fetch...
            </motion.div>
          )}
          {phase === "suspended" && (
            <motion.div key="suspended" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-3">
              <div className="text-xs text-yellow-400 mb-2">Fallback: skeleton UI</div>
              <Shimmer />
            </motion.div>
          )}
          {phase === "resolved" && (
            <motion.div key="resolved" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="rounded bg-green-500/10 border border-green-500/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-bold">A</div>
                <div>
                  <div className="text-sm font-medium text-text-primary">Alice Johnson</div>
                  <div className="text-xs text-text-secondary">alice@example.com</div>
                </div>
              </div>
              <div className="text-xs text-text-secondary">Data resolved — real content shown</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Thrown promise visualization */}
      <div className="rounded-lg border border-border bg-[#0d1117] p-3 text-xs font-mono space-y-1">
        <div className="text-text-secondary">// Inside UserProfile component:</div>
        <div className={`${phase !== "idle" ? "text-yellow-400" : "text-text-secondary"}`}>
          const data = use(fetchUser(1));
        </div>
        <div className="text-text-secondary">// throws Promise if not resolved yet</div>
        <div className="text-text-secondary">// React catches it at Suspense boundary</div>
      </div>

      <div className="flex gap-2">
        <Button onClick={run} disabled={phase !== "idle"} size="sm">
          Fetch Data (suspend)
        </Button>
        <Button variant="secondary" onClick={reset} size="sm">Reset</Button>
      </div>
    </div>
  );
}

const STREAM_CHUNKS = [
  { id: "shell", label: "HTML Shell", color: "#a855f7", delay: 0, desc: "Immediate — nav, layout" },
  { id: "above-fold", label: "Above-fold chunk", color: "#22d3ee", delay: 800, desc: "Hero, title" },
  { id: "sidebar", label: "Sidebar chunk", color: "#f59e0b", delay: 1500, desc: "Trending, tags" },
  { id: "comments", label: "Comments chunk", color: "#22c55e", delay: 2300, desc: "Heavy, deferred" },
];

function StreamingSSRDemo() {
  const [phase, setPhase] = useState<StreamPhase>("idle");
  const [arrived, setArrived] = useState<string[]>([]);

  const run = useCallback(async () => {
    setPhase("shell");
    setArrived([]);

    for (const chunk of STREAM_CHUNKS) {
      await sleep(chunk.delay === 0 ? 200 : chunk.delay - (STREAM_CHUNKS[STREAM_CHUNKS.indexOf(chunk) - 1]?.delay ?? 0));
      setArrived((prev) => [...prev, chunk.id]);
    }

    setPhase("done");
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setArrived([]);
  }, []);

  return (
    <div className="space-y-4">
      {/* Server → Client diagram */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex-1 rounded-lg border border-border bg-[#0d1117] p-2 text-center">
          <div className="text-text-secondary mb-1">Server</div>
          <div className="text-purple-400 font-mono">renderToPipeableStream()</div>
        </div>
        <motion.div
          animate={phase !== "idle" ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.4 }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="text-text-secondary"
        >
          ──── chunks ────→
        </motion.div>
        <div className="flex-1 rounded-lg border border-border bg-[#0d1117] p-2 text-center">
          <div className="text-text-secondary mb-1">Client</div>
          <div className="text-cyan-400 font-mono">hydrateRoot()</div>
        </div>
      </div>

      {/* Streaming chunks */}
      <div className="space-y-2">
        {STREAM_CHUNKS.map((chunk) => {
          const isArrived = arrived.includes(chunk.id);
          return (
            <motion.div
              key={chunk.id}
              animate={isArrived ? { opacity: 1 } : { opacity: 0.3 }}
              className="rounded-lg border p-3 flex items-center gap-3"
              style={{
                borderColor: isArrived ? chunk.color : "#374151",
                backgroundColor: isArrived ? `${chunk.color}10` : "transparent",
              }}
            >
              <AnimatePresence>
                {isArrived ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0"
                    style={{ backgroundColor: chunk.color }}
                  >
                    ✓
                  </motion.div>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-border flex-shrink-0" />
                )}
              </AnimatePresence>
              <div className="flex-1">
                <div className="text-xs font-medium" style={{ color: isArrived ? chunk.color : "#9CA3AF" }}>
                  {chunk.label}
                </div>
                <div className="text-xs text-text-secondary">{chunk.desc}</div>
              </div>
              {isArrived && (
                <motion.div
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs font-mono text-text-secondary"
                >
                  materialized
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button onClick={run} disabled={phase !== "idle"} size="sm">
          Stream Page
        </Button>
        <Button variant="secondary" onClick={reset} size="sm">Reset</Button>
      </div>
    </div>
  );
}

export default function SuspenseVisualizer() {
  const [mode, setMode] = useState<Mode>("codesplit");

  return (
    <div className="space-y-6">
      {/* Mode tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          ["codesplit", "Code Splitting"],
          ["datafetch", "Data Fetching"],
          ["streaming", "Streaming SSR"],
        ] as [Mode, string][]).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              mode === m
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-text-secondary hover:border-accent/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {mode === "codesplit" && (
          <motion.div key="cs" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            <Panel title="Code Splitting — React.lazy()">
              <CodeSplitDemo />
            </Panel>
          </motion.div>
        )}
        {mode === "datafetch" && (
          <motion.div key="df" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            <Panel title="Data Fetching — use() / thrown Promise">
              <DataFetchDemo />
            </Panel>
          </motion.div>
        )}
        {mode === "streaming" && (
          <motion.div key="ssr" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            <Panel title="Streaming SSR — Progressive HTML Chunks">
              <StreamingSSRDemo />
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
