"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";

type TypeParam = "int" | "double" | "DateTime" | "string" | "object";

interface TypeInfo {
  label: TypeParam;
  isValueType: boolean;
  clrType: string;
  size: string;
  nativeCode: string;
  memoryLayout: { label: string; color: string; bytes: number }[];
  jitBehavior: string;
}

const TYPE_MAP: Record<TypeParam, TypeInfo> = {
  int: {
    label: "int",
    isValueType: true,
    clrType: "System.Int32",
    size: "4 bytes",
    nativeCode: `// JIT generates SPECIALIZED native code for Stack<int>
// T is replaced with actual int instructions
push_int:
    mov  [rsp + offset], eax   ; store value directly
    inc  dword [_size]         ; _size++
pop_int:
    mov  eax, [rsp + offset]   ; load value directly
    ret                        ; no boxing, no heap alloc`,
    memoryLayout: [
      { label: "_items: int[]", color: "bg-blue-500", bytes: 4 },
      { label: "_size: int", color: "bg-blue-400", bytes: 4 },
    ],
    jitBehavior:
      "CLR generates separate native code for Stack<int>. int values stored directly in the array — zero boxing, zero heap allocations per element.",
  },
  double: {
    label: "double",
    isValueType: true,
    clrType: "System.Double",
    size: "8 bytes",
    nativeCode: `// JIT generates SPECIALIZED native code for Stack<double>
// Different from Stack<int> — separate compiled method body
push_double:
    movsd [rsp + offset], xmm0 ; store double via SSE2
    inc   dword [_size]
pop_double:
    movsd xmm0, [rsp + offset] ; load double via SSE2
    ret                        ; no boxing, no heap alloc`,
    memoryLayout: [
      { label: "_items: double[]", color: "bg-purple-500", bytes: 8 },
      { label: "_size: int", color: "bg-purple-400", bytes: 4 },
    ],
    jitBehavior:
      "CLR generates a THIRD native specialization — separate from int. Value types each get their own JIT-compiled code. Memory layout uses 8-byte doubles directly.",
  },
  DateTime: {
    label: "DateTime",
    isValueType: true,
    clrType: "System.DateTime",
    size: "8 bytes (struct)",
    nativeCode: `// JIT generates SPECIALIZED native code for Stack<DateTime>
// DateTime is a struct — treated like any value type
push_datetime:
    mov  [rsp + offset],     rax  ; store low 8 bytes (Ticks)
    inc  dword [_size]
pop_datetime:
    mov  rax, [rsp + offset]      ; load Ticks
    ret                           ; struct copied by value, no heap`,
    memoryLayout: [
      { label: "_items: DateTime[]", color: "bg-amber-500", bytes: 8 },
      { label: "_size: int", color: "bg-amber-400", bytes: 4 },
    ],
    jitBehavior:
      "Custom structs (like DateTime) each get their own native specialization. This is reification — the CLR materializes a real, concrete type at JIT time.",
  },
  string: {
    label: "string",
    isValueType: false,
    clrType: "System.String",
    size: "reference (8 bytes on x64)",
    nativeCode: `// Stack<string>, Stack<object>, Stack<List<T>> — ALL share ONE native impl
// Reference types only need to store/load pointer-sized slots
push_ref:
    mov  [rsp + offset], rax   ; store object reference (pointer)
    inc  dword [_size]
pop_ref:
    mov  rax, [rsp + offset]   ; load reference
    ret
// Stack<string> == Stack<object> == Stack<MyClass> in native code
// Type safety enforced by JIT type checks, not separate code`,
    memoryLayout: [
      { label: "_items: object[]", color: "bg-emerald-500", bytes: 8 },
      { label: "(ptr to string on heap)", color: "bg-emerald-400", bytes: 8 },
      { label: "_size: int", color: "bg-emerald-300", bytes: 4 },
    ],
    jitBehavior:
      "All reference types share ONE native implementation. Stack<string> and Stack<MyClass> reuse the same compiled code — pointers are pointer-sized regardless of type.",
  },
  object: {
    label: "object",
    isValueType: false,
    clrType: "System.Object",
    size: "reference (8 bytes on x64)",
    nativeCode: `// Same shared reference-type implementation
// This is the pre-generics behavior (ArrayList era)
// ⚠️ If you stored int here: boxing happens!
push_ref:
    mov  [rsp + offset], rax   ; store pointer
    inc  dword [_size]
// With Stack<object> and int values:
// var s = new Stack<object>();
// s.Push(42); ← BOXING: allocates heap object for int 42
// int val = (int)s.Pop(); ← UNBOXING: copies back to stack`,
    memoryLayout: [
      { label: "_items: object[]", color: "bg-slate-500", bytes: 8 },
      { label: "(boxed int on heap)", color: "bg-red-500", bytes: 16 },
      { label: "_size: int", color: "bg-slate-400", bytes: 4 },
    ],
    jitBehavior:
      "Using object instead of generics causes boxing for value types — heap allocation per Push/Pop. This is why generics exist: List<int> vs ArrayList has 10x less GC pressure.",
  },
};

const ALL_TYPES: TypeParam[] = ["int", "double", "DateTime", "string", "object"];

export default function GenericsVisualizer() {
  const [selectedType, setSelectedType] = useState<TypeParam>("int");
  const [showNative, setShowNative] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const info = TYPE_MAP[selectedType];

  const handleSelect = (t: TypeParam) => {
    setSelectedType(t);
    setAnimKey((k) => k + 1);
  };

  // Group types for display
  const valueTypes = ALL_TYPES.filter((t) => TYPE_MAP[t].isValueType);
  const refTypes = ALL_TYPES.filter((t) => !TYPE_MAP[t].isValueType);

  // Count how many native code bodies are generated
  const nativeBodiesCount = valueTypes.length + 1; // one per value type + one shared for all ref types

  return (
    <div className="space-y-4">
      {/* Type selector */}
      <Panel title="Select T for Stack<T>">
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-text-secondary mb-2">
              Value Types — JIT generates separate native code per type
            </p>
            <div className="flex gap-2 flex-wrap">
              {valueTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => handleSelect(t)}
                  className={`font-mono text-sm px-4 py-2 rounded-lg border transition-all duration-200 ${
                    selectedType === t
                      ? "border-accent bg-accent/15 text-accent shadow-[0_0_12px_rgba(168,85,247,0.25)]"
                      : "border-border bg-elevated text-text-secondary hover:border-accent/40"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-text-secondary mb-2">
              Reference Types — all share ONE native implementation
            </p>
            <div className="flex gap-2 flex-wrap">
              {refTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => handleSelect(t)}
                  className={`font-mono text-sm px-4 py-2 rounded-lg border transition-all duration-200 ${
                    selectedType === t
                      ? "border-cyan-500 bg-cyan-500/15 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                      : "border-border bg-elevated text-text-secondary hover:border-cyan-500/40"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {/* Main comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Type info */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`info-${animKey}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Panel
              title={`Stack<${selectedType}> — Type Info`}
              accentColor={info.isValueType ? "#A855F7" : "#06B6D4"}
            >
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0D0D0D] rounded-lg p-3 border border-border">
                    <p className="text-[10px] font-mono uppercase text-text-secondary mb-1">CLR Type</p>
                    <p className="font-mono text-xs text-accent">{info.clrType}</p>
                  </div>
                  <div className="bg-[#0D0D0D] rounded-lg p-3 border border-border">
                    <p className="text-[10px] font-mono uppercase text-text-secondary mb-1">Size</p>
                    <p className="font-mono text-xs text-accent">{info.size}</p>
                  </div>
                </div>

                <div
                  className={`rounded-lg p-3 border text-xs font-semibold flex items-center gap-2 ${
                    info.isValueType
                      ? "border-purple-500/30 bg-purple-500/10 text-purple-300"
                      : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${info.isValueType ? "bg-purple-500" : "bg-cyan-500"}`}
                  />
                  {info.isValueType
                    ? "Value type — CLR generates specialized native code"
                    : "Reference type — shares native code with all ref types"}
                </div>

                <div>
                  <p className="text-[10px] font-mono uppercase text-text-secondary mb-2">
                    JIT Behavior
                  </p>
                  <p className="text-xs text-text-secondary leading-relaxed">{info.jitBehavior}</p>
                </div>

                {/* Reification diagram */}
                <div>
                  <p className="text-[10px] font-mono uppercase text-text-secondary mb-2">
                    Native Code Bodies in Memory
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {valueTypes.map((t) => (
                      <div
                        key={t}
                        className={`text-[10px] font-mono px-2 py-1 rounded border transition-all ${
                          t === selectedType && info.isValueType
                            ? "border-accent/60 bg-accent/15 text-accent"
                            : "border-border bg-elevated text-text-secondary"
                        }`}
                      >
                        Stack&lt;{t}&gt;
                      </div>
                    ))}
                    <div
                      className={`text-[10px] font-mono px-2 py-1 rounded border transition-all ${
                        !info.isValueType
                          ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-400"
                          : "border-border bg-elevated text-text-secondary"
                      }`}
                    >
                      Stack&lt;T_ref&gt; ×1 shared
                    </div>
                  </div>
                  <p className="text-[10px] text-text-secondary mt-1 font-mono">
                    {nativeBodiesCount} total JIT-compiled method bodies for Stack&lt;T&gt;
                  </p>
                </div>
              </div>
            </Panel>
          </motion.div>
        </AnimatePresence>

        {/* Right: Memory layout */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`mem-${animKey}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, delay: 0.05 }}
          >
            <Panel title="Memory Layout — _items array slot" accentColor="#10B981">
              <div className="space-y-3">
                {/* Visual memory slots */}
                <div className="space-y-2">
                  {info.memoryLayout.map((slot, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className={`${slot.color} rounded flex-shrink-0 flex items-center justify-center text-[10px] font-mono text-white font-bold`}
                        style={{ width: `${Math.max(slot.bytes * 10, 40)}px`, height: "32px" }}
                      >
                        {slot.bytes}B
                      </div>
                      <span className="text-xs font-mono text-text-secondary">{slot.label}</span>
                    </div>
                  ))}
                </div>

                {/* Boxing warning for object type */}
                {selectedType === "object" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border border-red-500/40 bg-red-500/10 rounded-lg p-3"
                  >
                    <p className="text-[11px] font-mono text-red-400 font-semibold mb-1">
                      ⚠ Boxing allocation per Push(int)
                    </p>
                    <p className="text-[11px] text-text-secondary">
                      Storing int in Stack&lt;object&gt; allocates a 16-byte heap object per value. With 1M ints, that&apos;s ~16 MB of heap pressure vs 4 MB for Stack&lt;int&gt;.
                    </p>
                  </motion.div>
                )}

                {/* vs Java type erasure */}
                <div className="border border-border rounded-lg p-3 bg-[#0D0D0D]">
                  <p className="text-[10px] font-mono uppercase text-text-secondary mb-2">
                    vs Java Type Erasure
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div>
                      <p className="text-accent mb-1">.NET (Reification)</p>
                      <p className="text-text-secondary">Stack&lt;int&gt; is a</p>
                      <p className="text-text-secondary">real distinct type</p>
                      <p className="text-green-400">No boxing for structs</p>
                    </div>
                    <div>
                      <p className="text-amber-400 mb-1">Java (Erasure)</p>
                      <p className="text-text-secondary">Stack&lt;Integer&gt; →</p>
                      <p className="text-text-secondary">Stack&lt;Object&gt; at runtime</p>
                      <p className="text-red-400">Boxing always required</p>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Native code panel */}
      <Panel title={`JIT-Generated Native Code — Stack<${selectedType}>`}>
        <div className="flex items-center gap-2 mb-3">
          <Button
            size="sm"
            variant={showNative ? "primary" : "secondary"}
            onClick={() => setShowNative((v) => !v)}
          >
            {showNative ? "Hide Native Code" : "Show Native Code"}
          </Button>
          <span className="text-[11px] text-text-secondary font-mono">
            {info.isValueType
              ? "Specialized — unique to Stack<" + selectedType + ">"
              : "Shared — same code for all Stack<ref_type>"}
          </span>
        </div>
        <AnimatePresence>
          {showNative && (
            <motion.pre
              key={`native-${animKey}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="font-mono text-[11px] text-text-secondary bg-[#0D0D0D] border border-border rounded-lg p-4 overflow-x-auto whitespace-pre leading-relaxed"
            >
              {info.nativeCode}
            </motion.pre>
          )}
        </AnimatePresence>
      </Panel>
    </div>
  );
}
