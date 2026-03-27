"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";

interface LeakPattern {
  name: string;
  severity: "high" | "medium" | "low";
  color: string;
  icon: string;
  code: string;
  fix: string;
  why: string;
}

const LEAKS: LeakPattern[] = [
  {
    name: "Forgotten Timer",
    severity: "high",
    color: "#ef4444",
    icon: "⏱️",
    code: `// ❌ LEAK: Timer keeps running after unmount
useEffect(() => {
  setInterval(() => {
    setData(fetchLatest()); // closure holds component refs
  }, 5000);
  // No cleanup!
}, []);`,
    fix: `// ✅ FIX: Clear timer in cleanup
useEffect(() => {
  const id = setInterval(() => {
    setData(fetchLatest());
  }, 5000);
  return () => clearInterval(id); // ← cleanup!
}, []);`,
    why: "The interval callback holds a closure over component state. Without cleanup, the timer keeps running after unmount, holding the entire component tree in memory.",
  },
  {
    name: "Event Listener Leak",
    severity: "high",
    color: "#f59e0b",
    icon: "👂",
    code: `// ❌ LEAK: Listener never removed
useEffect(() => {
  window.addEventListener("resize", handleResize);
  // No cleanup!
}, []);`,
    fix: `// ✅ FIX: Remove listener in cleanup  
useEffect(() => {
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);`,
    why: "Event listeners on window/document are global. They hold references to the handler function and its closure, keeping all referenced objects alive even after the component unmounts.",
  },
  {
    name: "Detached DOM Nodes",
    severity: "medium",
    color: "#a855f7",
    icon: "🌲",
    code: `// ❌ LEAK: Variable holds removed DOM node
let cached = document.getElementById("modal");
modal.remove(); // removed from DOM tree
// BUT 'cached' still holds a reference!
// The entire subtree can't be GC'd`,
    fix: `// ✅ FIX: Nullify reference after removal
let cached = document.getElementById("modal");
modal.remove();
cached = null; // allow GC`,
    why: "A detached DOM node (removed from the tree but still referenced by JS) retains its entire subtree in memory. Common in SPAs with modal/popup caching.",
  },
  {
    name: "Closure Over Large Data",
    severity: "medium",
    color: "#06b6d4",
    icon: "📦",
    code: `// ❌ LEAK: Closure keeps large array alive
function process() {
  const hugeArray = new Array(1e6).fill("x");
  return () => hugeArray.length; // closure!
}
const getLen = process();
// hugeArray lives as long as getLen exists`,
    fix: `// ✅ FIX: Extract only what you need
function process() {
  const hugeArray = new Array(1e6).fill("x");
  const len = hugeArray.length; // copy the value
  return () => len; // closure only holds a number
}`,
    why: "Closures capture variables, not values. If the closure is long-lived (stored globally, in cache), all referenced objects stay in memory indefinitely.",
  },
  {
    name: "Growing Map/Set Cache",
    severity: "low",
    color: "#10b981",
    icon: "📈",
    code: `// ❌ LEAK: Cache grows forever
const cache = new Map();
function getData(key) {
  if (!cache.has(key)) {
    cache.set(key, fetchExpensiveData(key));
  }
  return cache.get(key);
}`,
    fix: `// ✅ FIX: Use WeakMap or LRU cache
const cache = new WeakMap(); // auto-GC when key is unreachable
// Or use an LRU cache with max size:
const cache = new LRUCache({ max: 100 });`,
    why: "Regular Maps keep strong references to keys and values. Without eviction, the cache grows unbounded. WeakMap allows GC when keys are no longer referenced elsewhere.",
  },
];

export default function MemoryLeaksVisualizer() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showFix, setShowFix] = useState(false);
  const leak = LEAKS[activeIndex];

  return (
    <Panel title="Memory Leak Patterns & Fixes" accentColor="#ef4444">
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {LEAKS.map((l, i) => (
          <button
            key={l.name}
            onClick={() => { setActiveIndex(i); setShowFix(false); }}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all flex items-center gap-1.5 ${
              i === activeIndex
                ? "border"
                : "bg-surface text-text-secondary border border-border hover:border-border-hover"
            }`}
            style={i === activeIndex ? { background: `${l.color}15`, borderColor: `${l.color}50`, color: l.color } : {}}
          >
            <span>{l.icon}</span>
            {l.name}
            <span className={`text-[8px] px-1 rounded ${l.severity === 'high' ? 'bg-red-500/20 text-red-400' : l.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
              {l.severity}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeIndex}-${showFix}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-mono uppercase tracking-wider" style={{ color: showFix ? "#10b981" : "#ef4444" }}>
                  {showFix ? "✅ Fixed Code" : "❌ Leaky Code"}
                </h4>
                <button
                  onClick={() => setShowFix(!showFix)}
                  className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
                >
                  {showFix ? "Show Leak" : "Show Fix →"}
                </button>
              </div>
              <pre
                className="bg-[#0a0a0a] border rounded-lg p-3 text-[11px] font-mono leading-relaxed overflow-x-auto min-h-[160px]"
                style={{
                  borderColor: showFix ? "#10b98130" : "#ef444430",
                  color: showFix ? "#10b981" : "#ef4444",
                }}
              >
                {showFix ? leak.fix : leak.code}
              </pre>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg p-4" style={{ background: `${leak.color}08`, border: `1px solid ${leak.color}25` }}>
                <h4 className="text-xs font-mono font-semibold mb-2" style={{ color: leak.color }}>
                  {leak.icon} {leak.name}
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {leak.why}
                </p>
              </div>
              <div className="rounded-lg p-3 bg-surface border border-border">
                <span className="text-[10px] font-mono text-text-muted">Severity:</span>
                <span className={`ml-2 text-[10px] font-mono font-bold ${leak.severity === "high" ? "text-red-400" : leak.severity === "medium" ? "text-amber-400" : "text-emerald-400"}`}>
                  {leak.severity.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </Panel>
  );
}
