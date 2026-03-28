"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Panel from "@/app/_ui/Panel";

type TypeMode = "struct" | "class";

interface MemoryObject {
  id: string;
  name: string;
  value: string;
  type: TypeMode;
  isBoxed?: boolean;
  location: "stack" | "heap";
  color: string;
}

const STRUCT_OBJECTS: MemoryObject[] = [
  { id: "s1", name: "point1", value: "Vector2 { X=10, Y=20 }", type: "struct", location: "stack", color: "bg-violet-500/20 border-violet-500/40 text-violet-300" },
  { id: "s2", name: "point2", value: "Vector2 { X=10, Y=20 }", type: "struct", location: "stack", color: "bg-violet-500/20 border-violet-500/40 text-violet-300" },
  { id: "s3", name: "count", value: "int = 42", type: "struct", location: "stack", color: "bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300" },
  { id: "s4", name: "flag", value: "bool = true", type: "struct", location: "stack", color: "bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300" },
];

const CLASS_OBJECTS: MemoryObject[] = [
  { id: "c1", name: "order", value: "ref → 0x4A2F", type: "class", location: "stack", color: "bg-sky-500/20 border-sky-500/40 text-sky-300" },
  { id: "c2", name: "userList", value: "ref → 0x7B81", type: "class", location: "stack", color: "bg-sky-500/20 border-sky-500/40 text-sky-300" },
];

const HEAP_OBJECTS = [
  { id: "h1", addr: "0x4A2F", label: "Order { Id=1001, Total=99.99 }", color: "bg-sky-500/15 border-sky-500/30 text-sky-300" },
  { id: "h2", addr: "0x7B81", label: "List<User> [3 items]", color: "bg-sky-500/15 border-sky-500/30 text-sky-300" },
];

const BOXED_OBJECT = {
  id: "box1",
  addr: "0x9C44",
  label: "object { Vector2 { X=10, Y=20 } }",
  color: "bg-amber-500/15 border-amber-500/40 text-amber-300",
};

export default function ValueReferenceTypesVisualizer() {
  const [mode, setMode] = useState<TypeMode>("struct");
  const [showBoxing, setShowBoxing] = useState(false);
  const [isBoxing, setIsBoxing] = useState(false);
  const [boxingDone, setBoxingDone] = useState(false);

  const triggerBoxing = async () => {
    if (isBoxing || boxingDone) return;
    setIsBoxing(true);
    await new Promise((r) => setTimeout(r, 800));
    setShowBoxing(true);
    await new Promise((r) => setTimeout(r, 400));
    setIsBoxing(false);
    setBoxingDone(true);
  };

  const resetBoxing = () => {
    setShowBoxing(false);
    setIsBoxing(false);
    setBoxingDone(false);
  };

  const stackObjects =
    mode === "struct" ? STRUCT_OBJECTS : CLASS_OBJECTS;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-elevated border border-border">
          {(["struct", "class"] as TypeMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); resetBoxing(); }}
              className={`px-4 py-1.5 rounded-md text-sm font-mono transition-all ${
                mode === m
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        {mode === "struct" && (
          <button
            onClick={boxingDone ? resetBoxing : triggerBoxing}
            disabled={isBoxing}
            className="px-4 py-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-sm font-medium hover:bg-amber-500/25 disabled:opacity-50 transition-all"
          >
            {isBoxing
              ? "Boxing..."
              : boxingDone
              ? "↩ Unbox (reset)"
              : "📦 Box a struct"}
          </button>
        )}
      </div>

      {/* Memory visualization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stack */}
        <Panel title="Stack" accentColor="#A855F7">
          <div className="space-y-2 min-h-[200px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary font-mono">
                grows ↓ (frame base → top)
              </span>
              <span className="text-xs text-text-secondary/50 font-mono">
                ~8MB limit
              </span>
            </div>

            {/* Stack frame */}
            <div className="border border-dashed border-border/60 rounded-lg p-2 mb-2">
              <p className="text-[10px] font-mono text-text-secondary/50 mb-2 uppercase tracking-widest">
                Current Method Frame
              </p>
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {stackObjects.map((obj, i) => (
                    <motion.div
                      key={obj.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: i * 0.08 }}
                      className={`border rounded-lg px-3 py-2 ${obj.color}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold">
                          {obj.name}
                        </span>
                        <span className="text-[10px] opacity-60">
                          {mode === "struct" ? "inline" : "ptr"}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono opacity-80 mt-0.5">
                        {obj.value}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Boxing animation — struct jumping to heap */}
                {isBoxing && (
                  <motion.div
                    initial={{ opacity: 1, y: 0, scale: 1 }}
                    animate={{ opacity: 0, y: -40, scale: 0.8 }}
                    transition={{ duration: 0.7 }}
                    className="border rounded-lg px-3 py-2 bg-amber-500/20 border-amber-500/50 text-amber-300"
                  >
                    <div className="text-xs font-mono font-semibold">
                      obj (boxing...)
                    </div>
                    <div className="text-[11px] font-mono opacity-80">
                      Vector2 → heap wrapper
                    </div>
                  </motion.div>
                )}

                {boxingDone && (
                  <div className="border rounded-lg px-3 py-2 border-dashed border-amber-500/30 text-amber-400/50">
                    <div className="text-xs font-mono">obj</div>
                    <div className="text-[11px] font-mono">ref → {BOXED_OBJECT.addr}</div>
                  </div>
                )}
              </div>
            </div>

            {mode === "struct" && (
              <div className="p-2 rounded bg-violet-500/5 border border-violet-500/20">
                <p className="text-[11px] text-violet-300 font-mono">
                  point2 is a full COPY of point1.
                  <br />
                  Mutating point2.X does not affect point1.
                </p>
              </div>
            )}

            {mode === "class" && (
              <div className="p-2 rounded bg-sky-500/5 border border-sky-500/20">
                <p className="text-[11px] text-sky-300 font-mono">
                  Both vars hold 8-byte pointers.
                  <br />
                  Assigning order2 = order copies the pointer — same heap object.
                </p>
              </div>
            )}
          </div>
        </Panel>

        {/* Heap */}
        <Panel title="Managed Heap (GC)" accentColor="#06B6D4">
          <div className="space-y-2 min-h-[200px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary font-mono">
                Gen0 → Gen1 → Gen2
              </span>
              <span className="text-xs text-text-secondary/50 font-mono">
                unrestricted size
              </span>
            </div>

            {mode === "struct" ? (
              <div className="space-y-2">
                <div className="border border-dashed border-border/40 rounded-lg p-4 flex items-center justify-center">
                  <span className="text-xs text-text-secondary/40 font-mono">
                    No heap allocations for plain structs
                  </span>
                </div>

                <AnimatePresence>
                  {showBoxing && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 18 }}
                      className={`border rounded-lg px-3 py-3 ${BOXED_OBJECT.color}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-semibold">
                          {BOXED_OBJECT.addr}
                        </span>
                        <span className="text-[10px] bg-amber-500/20 border border-amber-500/30 rounded px-1.5 py-0.5 text-amber-300">
                          BOXED
                        </span>
                      </div>
                      <div className="text-[11px] font-mono opacity-80">
                        {BOXED_OBJECT.label}
                      </div>
                      <div className="mt-2 text-[10px] text-amber-400/70 font-mono">
                        + object header (16 bytes overhead)
                        <br />
                        + GC tracking
                        <br />
                        + method table pointer
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="space-y-2">
                {HEAP_OBJECTS.map((obj, i) => (
                  <motion.div
                    key={obj.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`border rounded-lg px-3 py-2 ${obj.color}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-semibold">
                        {obj.addr}
                      </span>
                      <span className="text-[10px] bg-sky-500/15 border border-sky-500/25 rounded px-1.5 py-0.5">
                        heap
                      </span>
                    </div>
                    <div className="text-[11px] font-mono opacity-80">
                      {obj.label}
                    </div>
                  </motion.div>
                ))}

                <div className="p-2 rounded bg-sky-500/5 border border-sky-500/15">
                  <p className="text-[11px] text-sky-300 font-mono">
                    GC tracks all live refs from stack → heap.
                    <br />
                    When stack frame is popped, ref count drops.
                    <br />
                    Object collected when no live refs remain.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-border bg-elevated/60">
              <th className="text-left p-3 text-text-secondary uppercase tracking-widest font-medium">
                Property
              </th>
              <th className="text-left p-3 text-violet-400 uppercase tracking-widest font-medium">
                struct (value type)
              </th>
              <th className="text-left p-3 text-sky-400 uppercase tracking-widest font-medium">
                class (reference type)
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Storage", "Inline / stack", "Heap only"],
              ["Assignment", "Full copy", "Copy pointer"],
              ["Nullability", "Never null (unless Nullable<T>)", "Can be null"],
              ["GC pressure", "None (unless boxed)", "Yes — every instance"],
              ["Equality default", "Field comparison", "Reference (pointer) comparison"],
              ["Inheritance", "Cannot inherit (sealed)", "Full inheritance"],
              ["Boxing", "When cast to object/interface", "Never (already a ref)"],
              ["Max performance use", "Span<T>, stackalloc, ref struct", "Pooled objects, classes with ref semantics"],
            ].map(([prop, struct, cls], i) => (
              <tr
                key={prop}
                className={`border-b border-border/50 ${
                  i % 2 === 0 ? "bg-transparent" : "bg-elevated/30"
                }`}
              >
                <td className="p-3 text-text-secondary">{prop}</td>
                <td className="p-3 text-violet-300/80">{struct}</td>
                <td className="p-3 text-sky-300/80">{cls}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
