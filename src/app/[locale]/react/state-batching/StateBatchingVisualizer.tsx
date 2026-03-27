"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type Mode = "batched" | "unbatched" | "flushSync";
type QueueItem = { id: number; label: string; color: string };
type RenderBeat = { id: number; label: string; batched: boolean };

const UPDATES: Array<{ label: string; color: string; code: string }> = [
  { label: "setCount(c+1)", color: "#a855f7", code: "setCount(count + 1)" },
  { label: "setName('Alice')", color: "#22d3ee", code: "setName('Alice')" },
  { label: "setLoading(true)", color: "#f59e0b", code: "setLoading(true)" },
];

export default function StateBatchingVisualizer() {
  const [mode, setMode] = useState<Mode>("batched");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [renders, setRenders] = useState<RenderBeat[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [flushing, setFlushing] = useState(false);
  const idRef = useRef(0);
  const renderIdRef = useRef(0);

  const addRender = useCallback((label: string, batched: boolean) => {
    renderIdRef.current += 1;
    const id = renderIdRef.current;
    setRenders((prev) => [...prev.slice(-5), { id, label, batched }]);
  }, []);

  const runBatched = useCallback(async () => {
    setIsRunning(true);
    setQueue([]);

    // Drop all 3 into queue
    for (let i = 0; i < UPDATES.length; i++) {
      await sleep(350);
      idRef.current += 1;
      const item = { id: idRef.current, ...UPDATES[i] };
      setQueue((prev) => [...prev, item]);
    }

    // Flush
    await sleep(500);
    setFlushing(true);
    await sleep(600);
    setQueue([]);
    setFlushing(false);
    addRender("1 render (batched)", true);
    setIsRunning(false);
  }, [addRender]);

  const runUnbatched = useCallback(async () => {
    setIsRunning(true);
    setQueue([]);

    for (let i = 0; i < UPDATES.length; i++) {
      await sleep(350);
      idRef.current += 1;
      const item = { id: idRef.current, ...UPDATES[i] };
      setQueue([item]);
      await sleep(300);
      setQueue([]);
      addRender(`render ${i + 1}/3`, false);
      await sleep(150);
    }

    setIsRunning(false);
  }, [addRender]);

  const runFlushSync = useCallback(async () => {
    setIsRunning(true);
    setQueue([]);

    for (let i = 0; i < UPDATES.length; i++) {
      await sleep(350);
      idRef.current += 1;
      const item = { id: idRef.current, ...UPDATES[i] };
      setQueue([item]);
      await sleep(200);
      setFlushing(true);
      await sleep(300);
      setQueue([]);
      setFlushing(false);
      addRender(`flushSync render ${i + 1}`, false);
      await sleep(150);
    }

    setIsRunning(false);
  }, [addRender]);

  const handleRun = useCallback(() => {
    if (mode === "batched") runBatched();
    else if (mode === "unbatched") runUnbatched();
    else runFlushSync();
  }, [mode, runBatched, runUnbatched, runFlushSync]);

  const handleReset = useCallback(() => {
    setQueue([]);
    setRenders([]);
    setFlushing(false);
    setIsRunning(false);
    idRef.current = 0;
    renderIdRef.current = 0;
  }, []);

  const codeSnippet =
    mode === "flushSync"
      ? `// flushSync forces immediate render each time
import { flushSync } from 'react-dom';

handleClick() {
  flushSync(() => setCount(count + 1));  // render!
  flushSync(() => setName('Alice'));      // render!
  flushSync(() => setLoading(true));     // render!
}`
      : mode === "batched"
      ? `// React 18: automatic batching everywhere
handleClick() {
  setCount(count + 1);   // queued
  setName('Alice');       // queued
  setLoading(true);       // queued
  // → single re-render after handler exits
}`
      : `// React 17: no batching in setTimeout/Promise
setTimeout(() => {
  setCount(count + 1);   // render!
  setName('Alice');       // render!
  setLoading(true);       // render!
  // → 3 separate re-renders
}, 0);`;

  const expectedRenders =
    mode === "batched" ? "1 render" : "3 renders";

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex flex-wrap gap-2">
        {(["batched", "unbatched", "flushSync"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { if (!isRunning) setMode(m); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              mode === m
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-text-secondary hover:border-accent/40"
            }`}
          >
            {m === "batched"
              ? "Event Handler (React 18)"
              : m === "unbatched"
              ? "setTimeout (React 17 behavior)"
              : "flushSync()"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Code snippet */}
        <Panel title="Code">
          <pre className="font-mono text-xs leading-relaxed text-text-secondary whitespace-pre-wrap">
            {codeSnippet.split("\n").map((line, i) => {
              const isHighlighted =
                line.includes("setCount") ||
                line.includes("setName") ||
                line.includes("setLoading");
              return (
                <div
                  key={i}
                  className={isHighlighted ? "text-text-primary" : ""}
                >
                  {line}
                </div>
              );
            })}
          </pre>
        </Panel>

        {/* Queue visualization */}
        <Panel title="State Update Queue">
          <div className="space-y-3">
            <div className="text-xs text-text-secondary mb-2">
              setState calls arrive →
            </div>

            {/* Queue container */}
            <div className="relative min-h-[120px] border border-border rounded-lg bg-[#0d1117] p-2 flex flex-col gap-1 overflow-hidden">
              <AnimatePresence>
                {queue.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ x: -40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={
                      flushing
                        ? { x: 60, opacity: 0, transition: { duration: 0.3 } }
                        : { x: 60, opacity: 0, transition: { duration: 0.2 } }
                    }
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="flex items-center gap-2 rounded px-2 py-1.5 border"
                    style={{
                      borderColor: item.color,
                      backgroundColor: `${item.color}15`,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span
                      className="text-xs font-mono"
                      style={{ color: item.color }}
                    >
                      {item.label}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>

              {queue.length === 0 && !isRunning && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-text-secondary italic">
                  Queue empty
                </div>
              )}
            </div>

            {/* Flush indicator */}
            <AnimatePresence>
              {flushing && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-xs text-green-400"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                    className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full"
                  />
                  Flushing queue → reconciler
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Panel>

        {/* Render counter */}
        <Panel title="React Reconciler">
          <div className="space-y-3">
            <div className="text-xs text-text-secondary">
              Expected:{" "}
              <span
                className={`font-bold ${mode === "batched" ? "text-green-400" : "text-yellow-400"}`}
              >
                {expectedRenders}
              </span>
            </div>

            <div className="space-y-1 min-h-[120px]">
              <AnimatePresence>
                {renders.map((r) => (
                  <motion.div
                    key={r.id}
                    initial={{ scale: 0.8, opacity: 0, x: 10 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 border text-xs font-mono ${
                      r.batched
                        ? "border-green-500 bg-green-500/10 text-green-400"
                        : "border-yellow-500 bg-yellow-500/10 text-yellow-400"
                    }`}
                  >
                    <span>{r.batched ? "✓" : "!"}</span>
                    <span>{r.label}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {renders.length === 0 && (
                <div className="text-xs text-text-secondary italic">
                  No renders yet
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border">
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Total renders:</span>
                <motion.span
                  key={renders.length}
                  initial={{ scale: 1.3, color: "#a855f7" }}
                  animate={{ scale: 1, color: "#FAFAFA" }}
                  className="font-mono font-bold"
                >
                  {renders.length}
                </motion.span>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Bottom timeline */}
      <Panel title="Render Timeline">
        <div className="space-y-3">
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1 text-text-secondary">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Batched render
            </span>
            <span className="flex items-center gap-1 text-text-secondary">
              <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
              Individual render
            </span>
          </div>

          <div className="flex items-end gap-1 h-16">
            {/* Labels */}
            <div className="text-xs text-text-secondary w-16 text-right pr-2 pb-1 self-end">
              renders
            </div>
            <AnimatePresence>
              {renders.map((r, idx) => (
                <motion.div
                  key={r.id}
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  style={{ originY: 1, height: r.batched ? "100%" : "50%" }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className={`flex-1 max-w-[32px] rounded-t flex flex-col items-center justify-end pb-1 ${
                    r.batched
                      ? "bg-green-500/30 border border-green-500/50"
                      : "bg-yellow-500/30 border border-yellow-500/50"
                  }`}
                >
                  <span className="text-[9px] font-mono text-text-secondary">
                    {idx + 1}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </Panel>

      <div className="flex gap-2 justify-end">
        <Button onClick={handleRun} disabled={isRunning}>
          {isRunning ? "Running..." : "Fire Batched Updates"}
        </Button>
        <Button variant="secondary" onClick={handleReset} disabled={isRunning} size="sm">
          Reset
        </Button>
      </div>
    </div>
  );
}
