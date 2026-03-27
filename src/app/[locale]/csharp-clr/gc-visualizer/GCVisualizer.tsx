"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

interface HeapObject {
  id: string;
  label: string;
  size: number;
  generation: 0 | 1 | 2;
  alive: boolean;
  marked: boolean;
}

let objCounter = 0;
function createObject(gen: 0 | 1 | 2 = 0): HeapObject {
  objCounter++;
  const labels = ["String", "Array", "Dict", "List", "Task", "Buffer", "Stream", "Config"];
  return {
    id: `obj-${objCounter}`,
    label: labels[Math.floor(Math.random() * labels.length)],
    size: Math.floor(Math.random() * 3) + 1,
    generation: gen,
    alive: Math.random() > 0.35,
    marked: false,
  };
}

function createInitialHeap(): HeapObject[] {
  return [
    ...Array.from({ length: 6 }, () => createObject(0)),
    ...Array.from({ length: 4 }, () => createObject(1)),
    ...Array.from({ length: 3 }, () => createObject(2)),
  ];
}

type Phase = "idle" | "mark" | "sweep" | "compact" | "promote" | "done";

const GEN_COLORS: Record<number, string> = {
  0: "#A855F7",
  1: "#3B82F6",
  2: "#F59E0B",
};

export default function GCVisualizer() {
  const [heap, setHeap] = useState<HeapObject[]>(createInitialHeap);
  const [phase, setPhase] = useState<Phase>("idle");
  const [collecting, setCollecting] = useState(false);
  const [collectionGen, setCollectionGen] = useState(0);
  const [stats, setStats] = useState({ collected: 0, promoted: 0, total: 0 });

  const runGC = useCallback(
    async (targetGen: 0 | 1 | 2) => {
      setCollecting(true);
      setCollectionGen(targetGen);

      // MARK phase
      setPhase("mark");
      await sleep(800);
      setHeap((prev) =>
        prev.map((obj) =>
          obj.generation <= targetGen ? { ...obj, marked: true } : obj
        )
      );
      await sleep(600);

      // SWEEP phase
      setPhase("sweep");
      await sleep(600);
      let collected = 0;
      setHeap((prev) => {
        const remaining = prev.filter((obj) => {
          if (obj.generation <= targetGen && !obj.alive) {
            collected++;
            return false;
          }
          return true;
        });
        return remaining;
      });
      await sleep(600);

      // PROMOTE phase — surviving objects move up a generation
      setPhase("promote");
      let promoted = 0;
      setHeap((prev) =>
        prev.map((obj) => {
          if (obj.generation <= targetGen && obj.generation < 2 && obj.alive) {
            promoted++;
            return {
              ...obj,
              generation: (obj.generation + 1) as 0 | 1 | 2,
              marked: false,
            };
          }
          return { ...obj, marked: false };
        })
      );
      await sleep(600);

      // COMPACT
      setPhase("compact");
      await sleep(400);

      // Allocate new Gen0 objects
      setHeap((prev) => [
        ...prev,
        ...Array.from({ length: 4 }, () => createObject(0)),
      ]);

      setStats({ collected, promoted, total: collected + promoted });
      setPhase("done");
      setCollecting(false);
    },
    []
  );

  const reset = () => {
    objCounter = 0;
    setHeap(createInitialHeap());
    setPhase("idle");
    setCollecting(false);
    setStats({ collected: 0, promoted: 0, total: 0 });
  };

  const genObjects = (gen: number) => heap.filter((o) => o.generation === gen);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={() => runGC(0)} disabled={collecting}>
          Collect Gen 0
        </Button>
        <Button variant="secondary" onClick={() => runGC(1)} disabled={collecting}>
          Collect Gen 0+1
        </Button>
        <Button variant="secondary" onClick={() => runGC(2)} disabled={collecting}>
          Full GC (Gen 0+1+2)
        </Button>
        <Button variant="ghost" onClick={reset} disabled={collecting}>
          Reset Heap
        </Button>
      </div>

      {/* Phase indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["mark", "sweep", "promote", "compact"] as Phase[]).map((p) => (
          <div
            key={p}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              phase === p
                ? "bg-accent/15 text-accent border-accent/40"
                : "bg-elevated text-text-secondary border-border"
            }`}
          >
            {p.toUpperCase()}
          </div>
        ))}
        {phase === "done" && (
          <span className="text-xs text-text-secondary">
            Collected: {stats.collected} | Promoted: {stats.promoted}
          </span>
        )}
      </div>

      {/* Heap visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((gen) => (
          <Panel key={gen} title={`Generation ${gen}`}>
            <div className="flex flex-wrap gap-2 min-h-[100px]">
              <AnimatePresence>
                {genObjects(gen).map((obj) => (
                  <motion.div
                    key={obj.id}
                    layout
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      borderColor: obj.marked
                        ? obj.alive
                          ? "#22C55E"
                          : "#EF4444"
                        : GEN_COLORS[gen] + "60",
                    }}
                    exit={{ opacity: 0, scale: 0, y: 20 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="relative p-2 rounded-md border-2 text-xs"
                    style={{
                      backgroundColor: `${GEN_COLORS[gen]}10`,
                      minWidth: `${40 + obj.size * 16}px`,
                    }}
                  >
                    <div className="font-mono font-medium" style={{ color: GEN_COLORS[gen] }}>
                      {obj.label}
                    </div>
                    <div className="text-text-secondary text-[10px]">
                      {obj.size * 32}B
                    </div>
                    {obj.marked && (
                      <div
                        className={`absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full ${
                          obj.alive ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {genObjects(gen).length === 0 && (
                <div className="text-xs text-text-secondary self-center">
                  Empty
                </div>
              )}
            </div>
          </Panel>
        ))}
      </div>

      {/* Stats */}
      <Panel title="Heap Summary">
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((gen) => (
            <div key={gen} className="text-center">
              <div
                className="text-2xl font-bold"
                style={{ color: GEN_COLORS[gen] }}
              >
                {genObjects(gen).length}
              </div>
              <div className="text-xs text-text-secondary">Gen {gen} objects</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
