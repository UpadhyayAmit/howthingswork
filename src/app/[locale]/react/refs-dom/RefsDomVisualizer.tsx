"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";

interface RenderEvent {
  id: number;
  type: "state" | "ref";
  value: number;
}

export default function RefsDomVisualizer() {
  // useState side
  const [stateCount, setStateCount] = useState(0);
  const [stateFlash, setStateFlash] = useState(false);
  const [stateRenders, setStateRenders] = useState(0);

  // useRef side
  const refCount = useRef(0);
  const [refDisplay, setRefDisplay] = useState(0);
  const refRenders = useRef(0);

  // DOM ref demo
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [focusAnimating, setFocusAnimating] = useState(false);

  // Timeline
  const [renderEvents, setRenderEvents] = useState<RenderEvent[]>([]);
  const eventIdRef = useRef(0);

  const handleStateClick = useCallback(async () => {
    setStateFlash(true);
    setTimeout(() => setStateFlash(false), 600);
    setStateCount((c) => {
      const next = c + 1;
      return next;
    });
    setStateRenders((r) => r + 1);
    eventIdRef.current += 1;
    setRenderEvents((prev) => [
      ...prev.slice(-7),
      { id: eventIdRef.current, type: "state", value: stateCount + 1 },
    ]);
  }, [stateCount]);

  const handleRefClick = useCallback(() => {
    refCount.current += 1;
    refRenders.current += 1;
    // purposely do NOT re-render
    eventIdRef.current += 1;
    setRenderEvents((prev) => [
      ...prev.slice(-7),
      { id: eventIdRef.current, type: "ref", value: refCount.current },
    ]);
  }, []);

  const handleReadRef = useCallback(() => {
    setRefDisplay(refCount.current);
  }, []);

  const handleFocusViaRef = useCallback(async () => {
    setFocusAnimating(true);
    await new Promise((r) => setTimeout(r, 400));
    inputRef.current?.focus();
    setInputFocused(true);
    setTimeout(() => {
      setFocusAnimating(false);
    }, 1200);
  }, []);

  const handleReset = useCallback(() => {
    setStateCount(0);
    setStateFlash(false);
    setStateRenders(0);
    refCount.current = 0;
    setRefDisplay(0);
    refRenders.current = 0;
    setRenderEvents([]);
    setInputFocused(false);
    setFocusAnimating(false);
    eventIdRef.current = 0;
  }, []);

  return (
    <div className="space-y-6">
      {/* Top comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* useState side */}
        <Panel title="useState Counter">
          <div className="space-y-4">
            {/* Fiber node visualization */}
            <div className="rounded-lg border border-border bg-[#0d1117] p-3 font-mono text-xs">
              <span className="text-text-secondary">fiber.memoizedState</span>
              <div className="mt-1 pl-3 border-l-2 border-purple-500">
                <div className="text-purple-400">
                  state:{" "}
                  <motion.span
                    key={stateCount}
                    initial={{ color: "#facc15" }}
                    animate={{ color: "#a855f7" }}
                    transition={{ duration: 0.5 }}
                    className="font-bold"
                  >
                    {stateCount}
                  </motion.span>
                </div>
                <div className="text-text-secondary">
                  queue: [
                  <AnimatePresence>
                    {stateFlash && (
                      <motion.span
                        key="q"
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-yellow-400"
                      >
                        SetStateAction
                      </motion.span>
                    )}
                  </AnimatePresence>
                  ]
                </div>
              </div>
            </div>

            {/* Counter display with re-render flash */}
            <motion.div
              animate={
                stateFlash
                  ? {
                      backgroundColor: ["#111827", "#3b1d6e", "#111827"],
                      borderColor: ["#374151", "#a855f7", "#374151"],
                    }
                  : {}
              }
              transition={{ duration: 0.5 }}
              className="rounded-lg border border-border p-4 text-center"
            >
              <div className="text-4xl font-bold text-text-primary font-mono">
                {stateCount}
              </div>
              <div className="text-xs text-text-secondary mt-1">
                {stateFlash ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-purple-400"
                  >
                    RE-RENDERING...
                  </motion.span>
                ) : (
                  "counter value"
                )}
              </div>
            </motion.div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">Renders triggered:</span>
              <motion.span
                key={stateRenders}
                initial={{ scale: 1.4, color: "#a855f7" }}
                animate={{ scale: 1, color: "#FAFAFA" }}
                className="font-mono font-bold text-text-primary"
              >
                {stateRenders}
              </motion.span>
            </div>

            <Button onClick={handleStateClick} size="sm">
              Increment State
            </Button>
          </div>
        </Panel>

        {/* useRef side */}
        <Panel title="useRef Counter">
          <div className="space-y-4">
            {/* Fiber node */}
            <div className="rounded-lg border border-border bg-[#0d1117] p-3 font-mono text-xs">
              <span className="text-text-secondary">fiber.ref</span>
              <div className="mt-1 pl-3 border-l-2 border-blue-500">
                <div className="text-blue-400">
                  current:{" "}
                  <span className="font-bold text-yellow-400">
                    {refCount.current}
                  </span>
                  <span className="text-text-secondary ml-1">
                    (mutable, not tracked)
                  </span>
                </div>
              </div>
            </div>

            {/* Ref display — does NOT auto-update */}
            <div className="rounded-lg border border-border p-4 text-center">
              <div className="text-4xl font-bold font-mono text-text-primary">
                {refDisplay}
              </div>
              <div className="text-xs text-text-secondary mt-1">
                displayed value (stale until read)
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">Renders triggered:</span>
              <span className="font-mono font-bold text-green-400">0</span>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleRefClick} size="sm">
                Increment Ref
              </Button>
              <Button variant="secondary" onClick={handleReadRef} size="sm">
                Read ref.current
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      {/* DOM Ref demo */}
      <Panel title="DOM Ref — Direct Access">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            {/* Ref object visualization */}
            <div className="flex-1 rounded-lg border border-border bg-[#0d1117] p-3 font-mono text-xs">
              <span className="text-text-secondary">inputRef object</span>
              <div className="mt-1 pl-3 border-l-2 border-cyan-500">
                <div className="text-cyan-400">
                  current:{" "}
                  <span className="text-orange-400">
                    {inputFocused
                      ? "<input type='text' />"
                      : "<input type='text' />"}
                  </span>
                </div>
                <AnimatePresence>
                  {focusAnimating && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-yellow-400 mt-1"
                    >
                      → .focus() called directly
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Input + cursor animation */}
            <div className="flex-1 space-y-3">
              <div className="relative">
                <motion.input
                  ref={inputRef}
                  type="text"
                  placeholder="Click button to focus via ref..."
                  animate={
                    inputFocused
                      ? { borderColor: "#a855f7", boxShadow: "0 0 0 2px rgba(168,85,247,0.3)" }
                      : { borderColor: "#374151", boxShadow: "none" }
                  }
                  className="w-full bg-[#0d1117] border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none"
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                />
                <AnimatePresence>
                  {focusAnimating && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 8, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    >
                      <motion.div
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="w-0.5 h-4 bg-purple-400"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleFocusViaRef} size="sm">
                  Focus Input via Ref
                </Button>
                <span className="text-xs text-text-secondary self-center">
                  No state change — direct DOM access
                </span>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Timeline */}
      <Panel title="Render Timeline">
        <div className="space-y-2">
          <div className="flex gap-3 text-xs text-text-secondary mb-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
              useState — triggers render
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              useRef — no render
            </span>
          </div>

          <div className="flex gap-1 flex-wrap min-h-[40px]">
            <AnimatePresence>
              {renderEvents.map((ev) => (
                <motion.div
                  key={ev.id}
                  initial={{ scale: 0, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className={`flex flex-col items-center justify-center w-12 h-10 rounded border text-xs font-mono ${
                    ev.type === "state"
                      ? "border-purple-500 bg-purple-500/10 text-purple-400"
                      : "border-blue-500 bg-blue-500/10 text-blue-400"
                  }`}
                >
                  <span>{ev.type === "state" ? "re-render" : "no-op"}</span>
                  <span className="font-bold">{ev.value}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {renderEvents.length === 0 && (
              <span className="text-xs text-text-secondary italic">
                Click buttons above to see timeline
              </span>
            )}
          </div>
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={handleReset} size="sm">
          Reset
        </Button>
      </div>
    </div>
  );
}
