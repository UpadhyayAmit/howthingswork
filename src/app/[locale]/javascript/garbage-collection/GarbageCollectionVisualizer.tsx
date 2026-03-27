"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";

interface HeapObj {
  id: string;
  label: string;
  color: string;
  marked?: boolean;
  collected?: boolean;
  refs: string[];
}

const INITIAL_HEAP: HeapObj[] = [
  { id: "root", label: "Global / Root", color: "#06b6d4", refs: ["a", "b"] },
  { id: "a", label: "obj A", color: "#10b981", refs: ["c"] },
  { id: "b", label: "obj B", color: "#f59e0b", refs: ["d"] },
  { id: "c", label: "obj C", color: "#a855f7", refs: [] },
  { id: "d", label: "obj D", color: "#ec4899", refs: ["e"] },
  { id: "e", label: "obj E", color: "#ef4444", refs: [] },
  { id: "f", label: "obj F (orphan)", color: "#6b7280", refs: ["g"] },
  { id: "g", label: "obj G (orphan)", color: "#6b7280", refs: [] },
];

type Phase = "idle" | "mark" | "sweep" | "compact" | "done";

export default function GarbageCollectionVisualizer() {
  const [heap, setHeap] = useState<HeapObj[]>(INITIAL_HEAP);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stats, setStats] = useState({ marked: 0, swept: 0 });

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const runGC = useCallback(async () => {
    setHeap(INITIAL_HEAP.map((o) => ({ ...o, marked: false, collected: false })));
    setStats({ marked: 0, swept: 0 });

    // Mark phase
    setPhase("mark");
    await sleep(600);

    const reachable = new Set<string>();
    const queue = ["root"];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      const obj = INITIAL_HEAP.find((o) => o.id === id);
      if (obj) queue.push(...obj.refs);

      setHeap((h) => h.map((o) => o.id === id ? { ...o, marked: true } : o));
      await sleep(400);
    }

    setStats({ marked: reachable.size, swept: 0 });
    await sleep(600);

    // Sweep phase
    setPhase("sweep");
    await sleep(600);

    const unreachable = INITIAL_HEAP.filter((o) => !reachable.has(o.id));
    for (const obj of unreachable) {
      setHeap((h) => h.map((o) => o.id === obj.id ? { ...o, collected: true } : o));
      await sleep(500);
    }

    setStats({ marked: reachable.size, swept: unreachable.length });
    await sleep(500);

    // Compact
    setPhase("compact");
    await sleep(600);
    setHeap((h) => h.filter((o) => !o.collected));
    await sleep(500);

    setPhase("done");
  }, []);

  const phaseDesc: Record<Phase, string> = {
    idle: "Heap before GC — some objects are unreachable",
    mark: "MARK — tracing all reachable objects from root",
    sweep: "SWEEP — freeing unreachable objects",
    compact: "COMPACT — defragmenting memory",
    done: `Done! Marked ${stats.marked}, Swept ${stats.swept} objects`,
  };

  return (
    <Panel title="V8 Garbage Collection" accentColor="#ef4444">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-mono text-text-muted">{phaseDesc[phase]}</span>
        <Button onClick={runGC} disabled={phase !== "idle" && phase !== "done"}>
          ▶ Run Mark-and-Sweep
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AnimatePresence>
          {heap.map((obj) => (
            <motion.div
              key={obj.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: obj.collected ? 0.2 : 1,
                scale: obj.collected ? 0.8 : 1,
              }}
              exit={{ opacity: 0, scale: 0 }}
              className="rounded-lg p-3 relative text-center"
              style={{
                background: obj.collected
                  ? "#ef444415"
                  : obj.marked
                    ? `${obj.color}15`
                    : `${obj.color}08`,
                border: `1px solid ${obj.collected ? "#ef4444" : obj.marked ? obj.color : obj.color + "30"}${obj.collected ? "50" : obj.marked ? "60" : ""}`,
              }}
            >
              {/* Marked badge */}
              {obj.marked && !obj.collected && (
                <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded font-mono">
                  ✓
                </span>
              )}
              {obj.collected && (
                <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-red-500/20 text-red-400 px-1 rounded font-mono">
                  ×
                </span>
              )}
              <div
                className="text-[11px] font-mono font-semibold mb-1"
                style={{ color: obj.collected ? "#ef4444" : obj.color, textDecoration: obj.collected ? "line-through" : "none" }}
              >
                {obj.label}
              </div>
              {obj.refs.length > 0 && (
                <div className="text-[9px] font-mono text-text-muted">
                  → {obj.refs.join(", ")}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 text-[10px] font-mono text-text-muted">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Reachable</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500" /> Unreachable</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Collected</span>
      </div>
    </Panel>
  );
}
