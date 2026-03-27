"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";

type CacheStatus = "idle" | "hit" | "miss" | "computing" | "cached";

interface DepBox {
  name: string;
  prev: string;
  current: string;
  changed: boolean;
}

// Simulated memory addresses
const ADDRESSES = ["0xA3F1", "0xB7C2", "0xC8D4", "0xD2E9", "0xE5F0"];
let addrIdx = 0;
function nextAddr() {
  addrIdx = (addrIdx + 1) % ADDRESSES.length;
  return ADDRESSES[addrIdx];
}

export default function MemoizationVisualizer() {
  // useMemo state
  const [valueA, setValueA] = useState(2);
  const [valueB, setValueB] = useState(3);
  const [otherState, setOtherState] = useState(0);
  const [memoResult, setMemoResult] = useState(6);
  const [memoStatus, setMemoStatus] = useState<CacheStatus>("idle");
  const [memoDeps, setMemoDeps] = useState<DepBox[]>([
    { name: "a", prev: "2", current: "2", changed: false },
    { name: "b", prev: "3", current: "3", changed: false },
  ]);
  const [parentRenders, setParentRenders] = useState(0);

  // useCallback state
  const [cbAddress, setCbAddress] = useState(ADDRESSES[0]);
  const [cbStatus, setCbStatus] = useState<CacheStatus>("idle");
  const [cbDeps, setCbDeps] = useState<DepBox[]>([
    { name: "a", prev: "2", current: "2", changed: false },
  ]);

  // Child comparison
  const [withoutMemoFlashes, setWithoutMemoFlashes] = useState(0);
  const [withMemoFlashes, setWithMemoFlashes] = useState(0);
  const [withoutFlashing, setWithoutFlashing] = useState(false);
  const [withFlashing, setWithFlashing] = useState(false);

  // --- useMemo interactions ---
  const changeA = useCallback(async () => {
    const newA = valueA + 1;
    setValueA(newA);
    setParentRenders(r => r + 1);

    const newDeps: DepBox[] = [
      { name: "a", prev: String(valueA), current: String(newA), changed: true },
      { name: "b", prev: String(valueB), current: String(valueB), changed: false },
    ];
    setMemoDeps(newDeps);
    setCbDeps([{ name: "a", prev: String(valueA), current: String(newA), changed: true }]);

    setMemoStatus("miss");
    await new Promise(r => setTimeout(r, 400));
    setMemoStatus("computing");
    await new Promise(r => setTimeout(r, 600));
    const newResult = newA * valueB;
    setMemoResult(newResult);
    setMemoStatus("cached");
    await new Promise(r => setTimeout(r, 1000));
    setMemoStatus("idle");

    // useCallback ref changes
    const newAddr = nextAddr();
    setCbAddress(newAddr);
    setCbStatus("miss");
    await new Promise(r => setTimeout(r, 400));
    setCbStatus("idle");

    // Without memo child flashes
    setWithoutFlashing(true);
    setWithoutMemoFlashes(f => f + 1);
    await new Promise(r => setTimeout(r, 300));
    setWithoutFlashing(false);
  }, [valueA, valueB]);

  const changeB = useCallback(async () => {
    const newB = valueB + 1;
    setValueB(newB);
    setParentRenders(r => r + 1);

    const newDeps: DepBox[] = [
      { name: "a", prev: String(valueA), current: String(valueA), changed: false },
      { name: "b", prev: String(valueB), current: String(newB), changed: true },
    ];
    setMemoDeps(newDeps);

    setMemoStatus("miss");
    await new Promise(r => setTimeout(r, 400));
    setMemoStatus("computing");
    await new Promise(r => setTimeout(r, 600));
    const newResult = valueA * newB;
    setMemoResult(newResult);
    setMemoStatus("cached");
    await new Promise(r => setTimeout(r, 1000));
    setMemoStatus("idle");

    // Without memo child flashes
    setWithoutFlashing(true);
    setWithoutMemoFlashes(f => f + 1);
    await new Promise(r => setTimeout(r, 300));
    setWithoutFlashing(false);
  }, [valueA, valueB]);

  const triggerOtherState = useCallback(async () => {
    setOtherState(s => s + 1);
    setParentRenders(r => r + 1);

    // Deps unchanged
    const newDeps: DepBox[] = memoDeps.map(d => ({ ...d, prev: d.current, changed: false }));
    setMemoDeps(newDeps);

    // CACHE HIT
    setMemoStatus("hit");
    await new Promise(r => setTimeout(r, 1200));
    setMemoStatus("idle");

    // useCallback HIT too
    setCbStatus("hit");
    await new Promise(r => setTimeout(r, 800));
    setCbStatus("idle");

    // Without memo child flashes (no callback memoization)
    setWithoutFlashing(true);
    setWithoutMemoFlashes(f => f + 1);
    await new Promise(r => setTimeout(r, 300));
    setWithoutFlashing(false);

    // With memo child SKIPS because callback ref stable
    setWithFlashing(true);
    setWithMemoFlashes(f => f + 1);
    await new Promise(r => setTimeout(r, 300));
    setWithFlashing(false);
  }, [memoDeps]);

  const reset = useCallback(() => {
    setValueA(2);
    setValueB(3);
    setOtherState(0);
    setMemoResult(6);
    setMemoStatus("idle");
    setMemoDeps([
      { name: "a", prev: "2", current: "2", changed: false },
      { name: "b", prev: "3", current: "3", changed: false },
    ]);
    setCbAddress(ADDRESSES[0]);
    setCbStatus("idle");
    setCbDeps([{ name: "a", prev: "2", current: "2", changed: false }]);
    setParentRenders(0);
    setWithoutMemoFlashes(0);
    setWithMemoFlashes(0);
  }, []);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary font-mono">a = {valueA}</span>
          <Button size="sm" onClick={changeA}>a++</Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary font-mono">b = {valueB}</span>
          <Button size="sm" onClick={changeB}>b++</Button>
        </div>
        <Button variant="secondary" size="sm" onClick={triggerOtherState}>
          Other State Change
        </Button>
        <Button variant="secondary" size="sm" onClick={reset}>Reset</Button>
        <span className="text-xs text-text-secondary ml-auto">
          Parent renders: <span className="text-accent font-mono">{parentRenders}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* useMemo panel */}
        <Panel title="useMemo — Cached Computation">
          <div className="space-y-4">
            <div className="font-mono text-xs bg-[#0D0D0D] rounded-lg p-3 border border-border">
              <span className="text-purple-400">const</span>
              <span className="text-text-primary"> result = </span>
              <span className="text-yellow-400">useMemo</span>
              <span className="text-text-primary">{"(() => a * b, [a, b])"}</span>
            </div>

            {/* Deps visualization */}
            <div>
              <div className="text-xs text-text-secondary mb-2">Dependency array:</div>
              <div className="flex gap-2">
                {memoDeps.map((dep) => (
                  <motion.div
                    key={dep.name}
                    animate={dep.changed
                      ? { borderColor: ["#EF4444", "#EF4444"], backgroundColor: "rgba(239,68,68,0.15)" }
                      : { borderColor: "#374151", backgroundColor: "transparent" }
                    }
                    className="flex-1 rounded-lg border p-2 text-center"
                  >
                    <div className="text-xs font-mono text-accent">{dep.name}</div>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={dep.current}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="text-sm font-bold text-text-primary mt-0.5"
                      >
                        {dep.current}
                      </motion.div>
                    </AnimatePresence>
                    {dep.changed && (
                      <div className="text-[9px] text-red-400 mt-0.5">
                        was {dep.prev}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Cache status */}
            <div>
              <div className="text-xs text-text-secondary mb-2">Cache:</div>
              <motion.div
                animate={
                  memoStatus === "hit"       ? { backgroundColor: "rgba(168,85,247,0.2)", borderColor: "#A855F7" } :
                  memoStatus === "miss"      ? { backgroundColor: "rgba(239,68,68,0.15)", borderColor: "#EF4444" } :
                  memoStatus === "computing" ? { backgroundColor: "rgba(251,191,36,0.1)", borderColor: "#FBBF24" } :
                  memoStatus === "cached"    ? { backgroundColor: "rgba(34,197,94,0.15)", borderColor: "#22C55E" } :
                  { backgroundColor: "rgba(30,30,30,0.8)", borderColor: "#374151" }
                }
                className="rounded-lg border p-3 text-center"
              >
                <AnimatePresence mode="wait">
                  <motion.div key={memoStatus} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {memoStatus === "idle" && (
                      <div>
                        <div className="text-xs text-text-secondary">Cached value</div>
                        <div className="text-2xl font-bold font-mono text-text-primary mt-1">{memoResult}</div>
                        <div className="text-xs text-text-secondary mt-0.5">a × b = {valueA} × {valueB}</div>
                      </div>
                    )}
                    {memoStatus === "hit" && (
                      <div>
                        <div className="text-lg">✓</div>
                        <div className="text-sm text-purple-400 font-bold">Cache HIT</div>
                        <div className="text-xs text-text-secondary">Deps unchanged — skipped! {memoResult}</div>
                      </div>
                    )}
                    {memoStatus === "miss" && (
                      <div>
                        <div className="text-lg">✗</div>
                        <div className="text-sm text-red-400 font-bold">Cache MISS</div>
                        <div className="text-xs text-text-secondary">Deps changed — recomputing...</div>
                      </div>
                    )}
                    {memoStatus === "computing" && (
                      <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.4, repeat: Infinity }}>
                        <div className="text-xs text-yellow-400 font-mono">computing {valueA} × {valueB}...</div>
                      </motion.div>
                    )}
                    {memoStatus === "cached" && (
                      <div>
                        <div className="text-lg">✓</div>
                        <div className="text-sm text-green-400 font-bold">Cached!</div>
                        <div className="text-2xl font-bold font-mono text-text-primary">{memoResult}</div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </Panel>

        {/* useCallback panel */}
        <Panel title="useCallback — Stable Function Reference">
          <div className="space-y-4">
            <div className="font-mono text-xs bg-[#0D0D0D] rounded-lg p-3 border border-border">
              <span className="text-purple-400">const</span>
              <span className="text-text-primary"> handler = </span>
              <span className="text-yellow-400">useCallback</span>
              <span className="text-text-primary">{"((x) => x + a, [a])"}</span>
            </div>

            {/* Deps */}
            <div>
              <div className="text-xs text-text-secondary mb-2">Dependency array:</div>
              <div className="flex gap-2">
                {cbDeps.map((dep) => (
                  <motion.div
                    key={dep.name}
                    animate={dep.changed
                      ? { borderColor: "#EF4444", backgroundColor: "rgba(239,68,68,0.15)" }
                      : { borderColor: "#374151", backgroundColor: "transparent" }
                    }
                    className="flex-1 rounded-lg border p-2 text-center"
                  >
                    <div className="text-xs font-mono text-accent">{dep.name}</div>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={dep.current}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm font-bold text-text-primary mt-0.5"
                      >
                        {dep.current}
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Function reference */}
            <div>
              <div className="text-xs text-text-secondary mb-2">Function reference (memory address):</div>
              <motion.div
                animate={
                  cbStatus === "hit"  ? { backgroundColor: "rgba(168,85,247,0.2)", borderColor: "#A855F7" } :
                  cbStatus === "miss" ? { backgroundColor: "rgba(239,68,68,0.15)", borderColor: "#EF4444" } :
                  { backgroundColor: "rgba(30,30,30,0.8)", borderColor: "#374151" }
                }
                className="rounded-lg border p-3"
              >
                <div className="flex items-center justify-between">
                  <motion.span
                    key={cbAddress}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="font-mono text-xl font-bold text-green-400"
                  >
                    {cbAddress}
                  </motion.span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={cbStatus}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className={`text-xs font-mono px-2 py-0.5 rounded ${
                        cbStatus === "hit"  ? "bg-purple-500/20 text-purple-400" :
                        cbStatus === "miss" ? "bg-red-500/20 text-red-400" :
                        "text-text-secondary"
                      }`}
                    >
                      {cbStatus === "hit"  ? "Same ref ✓" :
                       cbStatus === "miss" ? "New ref!" :
                       "stable"}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {cbStatus === "hit"
                    ? "Deps unchanged — same function instance returned"
                    : cbStatus === "miss"
                    ? "Deps changed — new function created at new address"
                    : "Function memoized at this address"}
                </p>
              </motion.div>
            </div>

            {/* Child comparison */}
            <div>
              <div className="text-xs text-text-secondary mb-2">Child component re-renders:</div>
              <div className="grid grid-cols-2 gap-2">
                <ChildBox
                  label="Without memo"
                  flashing={withoutFlashing}
                  count={withoutMemoFlashes}
                  color="red"
                  note="Receives new fn ref every render"
                />
                <ChildBox
                  label="With memo"
                  flashing={withFlashing}
                  count={withMemoFlashes}
                  color="green"
                  note="Skips when fn ref is stable"
                />
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Key insight */}
      <Panel title="Key Insight">
        <div className="grid grid-cols-3 gap-4 text-xs text-text-secondary">
          <div>
            <p className="text-text-primary font-medium mb-1">useMemo</p>
            <p>Caches a computed <em>value</em>. Returns the same value when deps haven't changed. Skips expensive calculations.</p>
          </div>
          <div>
            <p className="text-text-primary font-medium mb-1">useCallback</p>
            <p>Caches a <em>function reference</em>. Prevents child re-renders caused by new function instances on every parent render.</p>
          </div>
          <div>
            <p className="text-text-primary font-medium mb-1">When to use</p>
            <p>Don't over-memoize! Use when: (1) computation is expensive, (2) referential equality matters for child memo, (3) deps are stable.</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function ChildBox({
  label, flashing, count, color, note
}: {
  label: string; flashing: boolean; count: number; color: "red" | "green"; note: string;
}) {
  return (
    <motion.div
      animate={flashing ? {
        borderColor: color === "red" ? "#EF4444" : "#22C55E",
        backgroundColor: color === "red" ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
        scale: [1, 1.02, 1],
      } : {
        borderColor: "#374151",
        backgroundColor: "rgba(30,30,30,0.8)",
        scale: 1,
      }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border p-2 text-center"
    >
      <div className="text-xs font-mono text-text-primary mb-1">{label}</div>
      <motion.div
        key={count}
        initial={{ scale: 1.5 }}
        animate={{ scale: 1 }}
        className={`text-lg font-bold ${color === "red" ? "text-red-400" : "text-green-400"}`}
      >
        {count}
      </motion.div>
      <div className="text-[10px] text-text-secondary mt-1">{note}</div>
    </motion.div>
  );
}
