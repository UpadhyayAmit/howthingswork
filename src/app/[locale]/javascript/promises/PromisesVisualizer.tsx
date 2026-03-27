"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";

type PromiseState = "pending" | "fulfilled" | "rejected";

interface PromiseBox {
  id: string;
  label: string;
  state: PromiseState;
  value?: string;
}

const stateColors: Record<PromiseState, string> = {
  pending: "#f59e0b",
  fulfilled: "#10b981",
  rejected: "#ef4444",
};

const stateIcons: Record<PromiseState, string> = {
  pending: "⏳",
  fulfilled: "✅",
  rejected: "❌",
};

export default function PromisesVisualizer() {
  const [promises, setPromises] = useState<PromiseBox[]>([]);
  const [microQueue, setMicroQueue] = useState<string[]>([]);
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const runChainDemo = useCallback(async () => {
    setRunning(true);
    setPromises([]);
    setMicroQueue([]);
    setOutput([]);

    // Create initial promise
    setPromises([{ id: "p1", label: "fetch('/api/user')", state: "pending" }]);
    setOutput((o) => [...o, "→ Starting fetch..."]);
    await sleep(1200);

    // Resolve p1
    setPromises([{ id: "p1", label: "fetch('/api/user')", state: "fulfilled", value: '{ name: "Alice" }' }]);
    setMicroQueue(["p1.then(parseJSON)"]);
    setOutput((o) => [...o, "✓ Fetch resolved with data"]);
    await sleep(800);

    // Process .then — parse JSON
    setMicroQueue([]);
    setPromises((p) => [...p, { id: "p2", label: ".then(parseJSON)", state: "pending" }]);
    await sleep(600);
    setPromises((p) => p.map((x) => x.id === "p2" ? { ...x, state: "fulfilled" as const, value: "User object" } : x));
    setMicroQueue(["p2.then(validate)"]);
    setOutput((o) => [...o, "✓ JSON parsed"]);
    await sleep(800);

    // Process .then — validate
    setMicroQueue([]);
    setPromises((p) => [...p, { id: "p3", label: ".then(validate)", state: "pending" }]);
    await sleep(600);
    setPromises((p) => p.map((x) => x.id === "p3" ? { ...x, state: "fulfilled" as const, value: "valid: true" } : x));
    setMicroQueue(["p3.then(renderUI)"]);
    setOutput((o) => [...o, "✓ Validation passed"]);
    await sleep(800);

    // Final .then — render
    setMicroQueue([]);
    setPromises((p) => [...p, { id: "p4", label: ".then(renderUI)", state: "pending" }]);
    await sleep(600);
    setPromises((p) => p.map((x) => x.id === "p4" ? { ...x, state: "fulfilled" as const, value: "UI updated" } : x));
    setOutput((o) => [...o, "✓ UI rendered — chain complete!"]);
    setRunning(false);
  }, []);

  const runErrorDemo = useCallback(async () => {
    setRunning(true);
    setPromises([]);
    setMicroQueue([]);
    setOutput([]);

    setPromises([{ id: "p1", label: "fetch('/api/data')", state: "pending" }]);
    setOutput((o) => [...o, "→ Starting fetch..."]);
    await sleep(1200);

    // Reject
    setPromises([{ id: "p1", label: "fetch('/api/data')", state: "rejected", value: "NetworkError" }]);
    setOutput((o) => [...o, "✗ Fetch REJECTED: NetworkError"]);
    await sleep(800);

    // Skip .then, jump to .catch
    setPromises((p) => [
      ...p,
      { id: "p2", label: ".then(parse) — SKIPPED", state: "rejected", value: "skipped" },
    ]);
    setOutput((o) => [...o, "— .then(parse) skipped (promise rejected)"]);
    await sleep(800);

    // .catch runs
    setPromises((p) => [
      ...p,
      { id: "p3", label: ".catch(handleError)", state: "pending" },
    ]);
    await sleep(600);
    setPromises((p) => p.map((x) => x.id === "p3" ? { ...x, state: "fulfilled" as const, value: "Error handled" } : x));
    setOutput((o) => [...o, "✓ .catch() handled the error"]);
    await sleep(600);

    // .finally runs
    setPromises((p) => [
      ...p,
      { id: "p4", label: ".finally(cleanup)", state: "fulfilled", value: "cleaned up" },
    ]);
    setOutput((o) => [...o, "✓ .finally() ran cleanup"]);
    setRunning(false);
  }, []);

  return (
    <Panel title="Promise State Machine" accentColor="#a855f7">
      <div className="flex gap-2 mb-4">
        <Button onClick={runChainDemo} disabled={running}>▶ Success Chain</Button>
        <Button onClick={runErrorDemo} disabled={running}>▶ Error Flow</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Promise chain */}
        <div className="lg:col-span-2 space-y-2">
          <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            Promise Chain
          </h4>
          <div className="bg-surface border border-border rounded-lg p-3 min-h-[220px] space-y-2">
            <AnimatePresence>
              {promises.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3"
                >
                  {i > 0 && <span className="text-text-muted text-xs">→</span>}
                  <div
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between"
                    style={{
                      background: `${stateColors[p.state]}10`,
                      border: `1px solid ${stateColors[p.state]}40`,
                    }}
                  >
                    <span style={{ color: stateColors[p.state] }}>
                      {stateIcons[p.state]} {p.label}
                    </span>
                    {p.value && (
                      <span className="text-[10px] text-text-muted ml-2">= {p.value}</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {promises.length === 0 && (
              <div className="text-[10px] font-mono text-text-muted text-center py-16 opacity-50">
                Click a demo to start
              </div>
            )}
          </div>
          {/* Microtask queue */}
          {microQueue.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-[10px] font-mono text-purple-400"
            >
              <span className="text-text-muted">Microtask Queue:</span>
              {microQueue.map((m) => (
                <span key={m} className="px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/25">
                  {m}
                </span>
              ))}
            </motion.div>
          )}
        </div>

        {/* Output */}
        <div>
          <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Execution Log
          </h4>
          <div className="bg-[#0a0a0a] border border-border rounded-lg p-3 min-h-[220px] space-y-1">
            <AnimatePresence>
              {output.map((line, i) => (
                <motion.div
                  key={`${line}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[11px] font-mono"
                  style={{
                    color: line.startsWith("✓") ? "#10b981" :
                           line.startsWith("✗") ? "#ef4444" :
                           line.startsWith("—") ? "#6b7280" : "#9ca3af",
                  }}
                >
                  {line}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Panel>
  );
}
