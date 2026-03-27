"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Panel from "@/app/_ui/Panel";

interface BindingRule {
  name: string;
  color: string;
  priority: number;
  code: string;
  thisValue: string;
  explanation: string;
}

const RULES: BindingRule[] = [
  {
    name: "1. new Binding",
    color: "#ef4444",
    priority: 1,
    code: `function User(name) {
  this.name = name;
}
const u = new User("Alice");
// this → brand new object {}`,
    thisValue: "new object {}",
    explanation: "'new' creates a fresh object and sets 'this' to that object inside the constructor. Highest priority.",
  },
  {
    name: "2. Explicit Binding",
    color: "#f59e0b",
    priority: 2,
    code: `function greet() {
  return "Hi, " + this.name;
}
greet.call({ name: "Bob" });
greet.apply({ name: "Bob" });
const bound = greet.bind({ name: "Bob" });`,
    thisValue: "{ name: 'Bob' }",
    explanation: "call(), apply(), and bind() explicitly set 'this' to the first argument. bind() creates a permanently bound copy.",
  },
  {
    name: "3. Implicit Binding",
    color: "#10b981",
    priority: 3,
    code: `const obj = {
  name: "Charlie",
  greet() {
    return "Hi, " + this.name;
  }
};
obj.greet(); // this → obj`,
    thisValue: "obj (the calling object)",
    explanation: "When called as obj.method(), 'this' is the object LEFT of the dot. The context object owns the call.",
  },
  {
    name: "4. Default Binding",
    color: "#6b7280",
    priority: 4,
    code: `function solo() {
  return this;
}
solo(); // this → window (sloppy)
        // this → undefined (strict)`,
    thisValue: "window / undefined",
    explanation: "Standalone function call. In sloppy mode: this = globalThis (window/global). In strict mode: this = undefined.",
  },
  {
    name: "★ Arrow Functions",
    color: "#a855f7",
    priority: 0,
    code: `const obj = {
  name: "Diana",
  greet: () => {
    return this.name; // ← NOT obj!
  },
  delayed() {
    setTimeout(() => {
      console.log(this.name); // ✅ "Diana"
    }, 100);
  }
};`,
    thisValue: "lexical (enclosing scope's this)",
    explanation: "Arrow functions DON'T have their own 'this'. They inherit 'this' from the enclosing lexical scope where they were defined.",
  },
];

export default function ThisBindingVisualizer() {
  const [active, setActive] = useState(0);
  const rule = RULES[active];

  return (
    <Panel title="'this' Binding Rules" accentColor="#f59e0b">
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {RULES.map((r, i) => (
          <button
            key={r.name}
            onClick={() => setActive(i)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all ${
              i === active
                ? `border text-white`
                : "bg-surface text-text-secondary border border-border hover:border-border-hover"
            }`}
            style={i === active ? { background: `${r.color}20`, borderColor: `${r.color}60`, color: r.color } : {}}
          >
            {r.name}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <div>
            <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: rule.color }} />
              Code Example
            </h4>
            <pre className="bg-[#0a0a0a] border border-border rounded-lg p-3 text-[11px] font-mono leading-relaxed overflow-x-auto min-h-[160px]" style={{ color: rule.color }}>
              {rule.code}
            </pre>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg p-4" style={{ background: `${rule.color}10`, border: `1px solid ${rule.color}30` }}>
              <div className="text-xs font-mono text-text-muted mb-1">this =</div>
              <div className="text-lg font-mono font-bold" style={{ color: rule.color }}>
                {rule.thisValue}
              </div>
            </div>
            <div className="rounded-lg p-3 bg-surface border border-border">
              <div className="text-xs text-text-secondary leading-relaxed">
                {rule.explanation}
              </div>
            </div>
            {rule.priority > 0 && (
              <div className="text-[10px] font-mono text-text-muted">
                Priority: {rule.priority}/4 — {rule.priority === 1 ? "Highest" : rule.priority === 2 ? "High" : rule.priority === 3 ? "Medium" : "Lowest"}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </Panel>
  );
}
