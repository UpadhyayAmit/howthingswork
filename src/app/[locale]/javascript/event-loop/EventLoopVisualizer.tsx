"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";

type Phase = "idle" | "sync" | "microtask" | "macrotask" | "render" | "done";

interface StackFrame {
  id: string;
  label: string;
  color: string;
}

interface QueueItem {
  id: string;
  label: string;
  type: "micro" | "macro";
}

const SCENARIO_CODE = `console.log("1: Start");

setTimeout(() => {
  console.log("5: Timeout");
}, 0);

Promise.resolve()
  .then(() => console.log("3: Promise 1"))
  .then(() => console.log("4: Promise 2"));

console.log("2: End");`;

export default function EventLoopVisualizer() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [callStack, setCallStack] = useState<StackFrame[]>([]);
  const [microQueue, setMicroQueue] = useState<QueueItem[]>([]);
  const [macroQueue, setMacroQueue] = useState<QueueItem[]>([]);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [loopAngle, setLoopAngle] = useState(0);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const runDemo = useCallback(async () => {
    setPhase("sync");
    setStep(1);
    setCallStack([]);
    setMicroQueue([]);
    setMacroQueue([]);
    setConsoleOutput([]);

    // Step 1: Push main() onto call stack
    setCallStack([{ id: "main", label: "main()", color: "#06b6d4" }]);
    await sleep(600);

    // Step 2: console.log("1: Start")
    setStep(2);
    setCallStack((s) => [...s, { id: "log1", label: 'console.log("Start")', color: "#10b981" }]);
    await sleep(400);
    setConsoleOutput((o) => [...o, '1: Start']);
    setCallStack((s) => s.filter((f) => f.id !== "log1"));
    await sleep(400);

    // Step 3: setTimeout — registers callback in macro queue
    setStep(3);
    setCallStack((s) => [...s, { id: "timeout", label: "setTimeout(cb, 0)", color: "#f59e0b" }]);
    await sleep(400);
    setMacroQueue([{ id: "timeout-cb", label: "Timeout cb", type: "macro" }]);
    setCallStack((s) => s.filter((f) => f.id !== "timeout"));
    await sleep(400);

    // Step 4: Promise.resolve().then() — registers microtask
    setStep(4);
    setCallStack((s) => [...s, { id: "promise", label: "Promise.then(cb1)", color: "#a855f7" }]);
    await sleep(400);
    setMicroQueue([{ id: "p1", label: "Promise cb1", type: "micro" }]);
    setCallStack((s) => s.filter((f) => f.id !== "promise"));
    await sleep(300);
    setMicroQueue((q) => [...q, { id: "p2", label: "Promise cb2", type: "micro" }]);
    await sleep(400);

    // Step 5: console.log("2: End")
    setStep(5);
    setCallStack((s) => [...s, { id: "log2", label: 'console.log("End")', color: "#10b981" }]);
    await sleep(400);
    setConsoleOutput((o) => [...o, '2: End']);
    setCallStack((s) => s.filter((f) => f.id !== "log2"));
    await sleep(400);

    // Pop main()
    setCallStack([]);
    await sleep(500);

    // Step 6: Event loop — process microtasks first
    setPhase("microtask");
    setStep(6);
    setLoopAngle(180);
    await sleep(600);

    // Process Promise cb1
    setCallStack([{ id: "p1-exec", label: "Promise cb1", color: "#a855f7" }]);
    setMicroQueue((q) => q.filter((i) => i.id !== "p1"));
    await sleep(400);
    setConsoleOutput((o) => [...o, '3: Promise 1']);
    setCallStack([]);
    await sleep(400);

    // Process Promise cb2
    setStep(7);
    setCallStack([{ id: "p2-exec", label: "Promise cb2", color: "#a855f7" }]);
    setMicroQueue((q) => q.filter((i) => i.id !== "p2"));
    await sleep(400);
    setConsoleOutput((o) => [...o, '4: Promise 2']);
    setCallStack([]);
    await sleep(500);

    // Step 8: Macro task
    setPhase("macrotask");
    setStep(8);
    setLoopAngle(360);
    await sleep(600);

    setCallStack([{ id: "timer-exec", label: "Timeout cb", color: "#f59e0b" }]);
    setMacroQueue([]);
    await sleep(400);
    setConsoleOutput((o) => [...o, '5: Timeout']);
    setCallStack([]);
    await sleep(400);

    setPhase("done");
    setStep(9);
    setLoopAngle(360);
  }, []);

  const reset = () => {
    setPhase("idle");
    setStep(0);
    setCallStack([]);
    setMicroQueue([]);
    setMacroQueue([]);
    setConsoleOutput([]);
    setLoopAngle(0);
  };

  const phaseLabel: Record<Phase, string> = {
    idle: "Click 'Run Code' to start",
    sync: "Executing synchronous code…",
    microtask: "Event Loop → Processing microtask queue",
    macrotask: "Event Loop → Processing macrotask queue",
    render: "Render cycle",
    done: "Execution complete!",
  };

  return (
    <Panel title="Event Loop Simulator" accentColor="#f59e0b">
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
            Phase:
          </span>
          <span className="text-xs font-mono text-accent-cyan">{phaseLabel[phase]}</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={runDemo} disabled={phase !== "idle" && phase !== "done"}>
            ▶ Run Code
          </Button>
          <Button onClick={reset} disabled={phase === "idle"}>
            ↺ Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Call Stack */}
        <div className="space-y-2">
          <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            Call Stack
          </h4>
          <div
            className="bg-surface border border-border rounded-lg p-3 min-h-[200px] flex flex-col-reverse gap-1"
          >
            <AnimatePresence>
              {callStack.map((frame) => (
                <motion.div
                  key={frame.id}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  className="px-3 py-2 rounded-md text-xs font-mono text-white text-center font-semibold"
                  style={{
                    background: `linear-gradient(135deg, ${frame.color}40, ${frame.color}20)`,
                    border: `1px solid ${frame.color}60`,
                  }}
                >
                  {frame.label}
                </motion.div>
              ))}
            </AnimatePresence>
            {callStack.length === 0 && (
              <div className="text-[10px] font-mono text-text-muted text-center py-8 opacity-50">
                Stack empty
              </div>
            )}
          </div>
        </div>

        {/* Queues */}
        <div className="space-y-3">
          {/* Microtask Queue */}
          <div>
            <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              Microtask Queue
              <span className="text-[9px] text-text-muted">(Priority: HIGH)</span>
            </h4>
            <div className="bg-surface border border-border rounded-lg p-2 min-h-[60px] flex flex-wrap gap-1">
              <AnimatePresence>
                {microQueue.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    className="px-2.5 py-1.5 rounded text-[10px] font-mono text-purple-300 bg-purple-500/15 border border-purple-500/30"
                  >
                    {item.label}
                  </motion.div>
                ))}
              </AnimatePresence>
              {microQueue.length === 0 && (
                <div className="text-[10px] font-mono text-text-muted text-center w-full py-3 opacity-50">Empty</div>
              )}
            </div>
          </div>

          {/* Macrotask Queue */}
          <div>
            <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Macrotask Queue
              <span className="text-[9px] text-text-muted">(Priority: LOW)</span>
            </h4>
            <div className="bg-surface border border-border rounded-lg p-2 min-h-[60px] flex flex-wrap gap-1">
              <AnimatePresence>
                {macroQueue.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    className="px-2.5 py-1.5 rounded text-[10px] font-mono text-amber-300 bg-amber-500/15 border border-amber-500/30"
                  >
                    {item.label}
                  </motion.div>
                ))}
              </AnimatePresence>
              {macroQueue.length === 0 && (
                <div className="text-[10px] font-mono text-text-muted text-center w-full py-3 opacity-50">Empty</div>
              )}
            </div>
          </div>

          {/* Event Loop indicator */}
          <div className="flex items-center justify-center py-2">
            <motion.div
              animate={{ rotate: loopAngle }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center"
              style={{
                borderColor:
                  phase === "microtask" ? "#a855f7" :
                  phase === "macrotask" ? "#f59e0b" :
                  "#374151",
              }}
            >
              <span className="text-xs">🔄</span>
            </motion.div>
            <span className="ml-2 text-[10px] font-mono text-text-muted">Event Loop</span>
          </div>
        </div>

        {/* Console Output */}
        <div className="space-y-2">
          <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Console Output
          </h4>
          <div className="bg-[#0a0a0a] border border-border rounded-lg p-3 min-h-[200px] font-mono text-xs space-y-1">
            <div className="text-text-muted text-[10px] mb-2">{'>'} node script.js</div>
            <AnimatePresence>
              {consoleOutput.map((line, i) => (
                <motion.div
                  key={`${line}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-emerald-400"
                >
                  {line}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Code snippet */}
      <details className="mt-4">
        <summary className="text-xs font-mono text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
          📋 View Source Code
        </summary>
        <pre className="mt-2 bg-[#0a0a0a] border border-border rounded-lg p-3 text-[11px] font-mono text-text-secondary overflow-x-auto">
          {SCENARIO_CODE}
        </pre>
      </details>
    </Panel>
  );
}
