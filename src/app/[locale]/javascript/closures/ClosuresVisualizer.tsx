"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";

interface ScopeBox {
  id: string;
  label: string;
  color: string;
  variables: { name: string; value: string }[];
  highlight?: boolean;
}

const SCENARIOS = [
  {
    name: "Counter Factory",
    code: `function createCounter() {
  let count = 0;        // ← enclosed
  return {
    increment: () => ++count,
    getCount: () => count,
  };
}
const c = createCounter();
c.increment(); // 1
c.increment(); // 2`,
    scopes: [
      {
        id: "global",
        label: "Global Scope",
        color: "#06b6d4",
        variables: [{ name: "createCounter", value: "fn()" }, { name: "c", value: "{increment, getCount}" }],
      },
      {
        id: "createCounter",
        label: "createCounter() — Closed Over",
        color: "#a855f7",
        variables: [{ name: "count", value: "0 → 1 → 2" }],
        highlight: true,
      },
      {
        id: "increment",
        label: "increment()",
        color: "#10b981",
        variables: [{ name: "return", value: "++count" }],
      },
    ] as ScopeBox[],
  },
  {
    name: "Loop Trap (var)",
    code: `for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Prints: 3, 3, 3  😱
// Because 'var' has function scope,
// all callbacks share the SAME 'i'`,
    scopes: [
      {
        id: "global",
        label: "Global / Function Scope",
        color: "#06b6d4",
        variables: [{ name: "i (var)", value: "3" }],
        highlight: true,
      },
      {
        id: "cb0",
        label: "setTimeout callback #0",
        color: "#ec4899",
        variables: [{ name: "closes over", value: "i → 3" }],
      },
      {
        id: "cb1",
        label: "setTimeout callback #1",
        color: "#ec4899",
        variables: [{ name: "closes over", value: "i → 3" }],
      },
      {
        id: "cb2",
        label: "setTimeout callback #2",
        color: "#ec4899",
        variables: [{ name: "closes over", value: "i → 3" }],
      },
    ] as ScopeBox[],
  },
  {
    name: "Loop Fix (let)",
    code: `for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Prints: 0, 1, 2  ✅
// 'let' creates a new binding
// per iteration — each closure
// captures its own 'i'`,
    scopes: [
      {
        id: "iter0",
        label: "Iteration 0 (block scope)",
        color: "#10b981",
        variables: [{ name: "i (let)", value: "0" }],
      },
      {
        id: "iter1",
        label: "Iteration 1 (block scope)",
        color: "#f59e0b",
        variables: [{ name: "i (let)", value: "1" }],
      },
      {
        id: "iter2",
        label: "Iteration 2 (block scope)",
        color: "#a855f7",
        variables: [{ name: "i (let)", value: "2" }],
      },
    ] as ScopeBox[],
  },
];

export default function ClosuresVisualizer() {
  const [activeIndex, setActiveIndex] = useState(0);
  const scenario = SCENARIOS[activeIndex];

  return (
    <Panel title="Closures & Scope Chain Explorer" accentColor="#a855f7">
      {/* Scenario tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {SCENARIOS.map((s, i) => (
          <button
            key={s.name}
            onClick={() => setActiveIndex(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 ${
              i === activeIndex
                ? "bg-accent/15 text-accent border border-accent/40"
                : "bg-surface text-text-secondary border border-border hover:border-border-hover"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Code */}
        <div>
          <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Code
          </h4>
          <pre className="bg-[#0a0a0a] border border-border rounded-lg p-4 text-[11px] font-mono text-emerald-300 leading-relaxed overflow-x-auto min-h-[200px]">
            {scenario.code}
          </pre>
        </div>

        {/* Scope chain visualization */}
        <div>
          <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            Scope Chain
          </h4>
          <div className="space-y-2 min-h-[200px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2"
              >
                {scenario.scopes.map((scope, i) => (
                  <motion.div
                    key={scope.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="rounded-lg p-3 relative"
                    style={{
                      background: `linear-gradient(135deg, ${scope.color}12, ${scope.color}06)`,
                      border: `1px solid ${scope.color}${scope.highlight ? '60' : '30'}`,
                      marginLeft: i * 12,
                      boxShadow: scope.highlight ? `0 0 20px ${scope.color}20` : 'none',
                    }}
                  >
                    {/* Scope chain arrow */}
                    {i > 0 && (
                      <div
                        className="absolute -top-2 left-4 text-[10px] font-mono"
                        style={{ color: scope.color }}
                      >
                        ↑ [[Scope]]
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: scope.color }}
                      />
                      <span className="text-[11px] font-mono font-semibold" style={{ color: scope.color }}>
                        {scope.label}
                      </span>
                      {scope.highlight && (
                        <span className="text-[9px] bg-accent/15 text-accent px-1.5 py-0.5 rounded font-mono">
                          CLOSURE
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {scope.variables.map((v) => (
                        <span
                          key={v.name}
                          className="text-[10px] font-mono px-2 py-1 rounded"
                          style={{
                            background: `${scope.color}15`,
                            color: `${scope.color}`,
                            border: `1px solid ${scope.color}25`,
                          }}
                        >
                          {v.name}: {v.value}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Panel>
  );
}
