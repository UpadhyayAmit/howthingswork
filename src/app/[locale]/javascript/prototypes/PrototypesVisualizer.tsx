"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Panel from "@/app/_ui/Panel";

interface ProtoObj {
  id: string;
  label: string;
  color: string;
  props: { name: string; value: string }[];
  highlight?: string;
}

const SCENARIOS = [
  {
    name: "Basic Chain",
    description: "obj → Object.prototype → null",
    objects: [
      {
        id: "obj",
        label: "myObj",
        color: "#06b6d4",
        props: [{ name: "name", value: '"Alice"' }, { name: "age", value: "30" }],
      },
      {
        id: "objProto",
        label: "Object.prototype",
        color: "#a855f7",
        props: [
          { name: "toString()", value: "fn" },
          { name: "hasOwnProperty()", value: "fn" },
          { name: "valueOf()", value: "fn" },
        ],
      },
      {
        id: "null",
        label: "null",
        color: "#6b7280",
        props: [{ name: "end of chain", value: "—" }],
      },
    ] as ProtoObj[],
    code: `const myObj = { name: "Alice", age: 30 };

myObj.toString(); // ✅ Found on Object.prototype
myObj.name;       // ✅ Found on myObj (own prop)
myObj.fly();      // ❌ TypeError — not in chain`,
    lookupSteps: [
      "myObj.toString() → not on myObj",
      "→ follow __proto__ to Object.prototype",
      "→ FOUND: toString() on Object.prototype ✅",
    ],
  },
  {
    name: "Constructor Pattern",
    description: "dog → Animal.prototype → Object.prototype → null",
    objects: [
      {
        id: "dog",
        label: 'dog (instance)',
        color: "#10b981",
        props: [{ name: "name", value: '"Rex"' }, { name: "breed", value: '"Husky"' }],
      },
      {
        id: "animalProto",
        label: "Animal.prototype",
        color: "#f59e0b",
        props: [{ name: "speak()", value: "fn" }, { name: "eat()", value: "fn" }],
        highlight: "Shared methods",
      },
      {
        id: "objProto",
        label: "Object.prototype",
        color: "#a855f7",
        props: [{ name: "toString()", value: "fn" }],
      },
      {
        id: "null",
        label: "null",
        color: "#6b7280",
        props: [{ name: "end", value: "—" }],
      },
    ] as ProtoObj[],
    code: `function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function() {
  return this.name + " speaks";
};

const dog = new Animal("Rex");
dog.breed = "Husky";

dog.speak();     // ✅ Found on Animal.prototype
dog.toString();  // ✅ Found on Object.prototype`,
    lookupSteps: [
      "dog.speak() → not own prop on dog",
      "→ __proto__ → Animal.prototype",
      "→ FOUND: speak() ✅",
      "dog.breed → 'Husky' (own prop) ✅",
    ],
  },
  {
    name: "ES6 Class (sugar)",
    description: "Classes are syntactic sugar over prototypes",
    objects: [
      {
        id: "tesla",
        label: "tesla (instance)",
        color: "#ec4899",
        props: [{ name: "brand", value: '"Tesla"' }, { name: "battery", value: "100" }],
      },
      {
        id: "evProto",
        label: "ElectricCar.prototype",
        color: "#f59e0b",
        props: [{ name: "charge()", value: "fn" }],
        highlight: "Subclass methods",
      },
      {
        id: "carProto",
        label: "Car.prototype",
        color: "#06b6d4",
        props: [{ name: "drive()", value: "fn" }, { name: "honk()", value: "fn" }],
        highlight: "Superclass methods",
      },
      {
        id: "objProto",
        label: "Object.prototype",
        color: "#a855f7",
        props: [{ name: "toString()", value: "fn" }],
      },
    ] as ProtoObj[],
    code: `class Car {
  constructor(brand) { this.brand = brand; }
  drive() { return "Vroom!"; }
}

class ElectricCar extends Car {
  constructor(brand) {
    super(brand);
    this.battery = 100;
  }
  charge() { this.battery = 100; }
}

const tesla = new ElectricCar("Tesla");
// tesla.__proto__ → ElectricCar.prototype
// → Car.prototype → Object.prototype`,
    lookupSteps: [
      "tesla.charge() → ElectricCar.prototype ✅",
      "tesla.drive() → Car.prototype ✅",
      "tesla.toString() → Object.prototype ✅",
    ],
  },
];

export default function PrototypesVisualizer() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lookupStep, setLookupStep] = useState(-1);
  const scenario = SCENARIOS[activeIndex];

  const runLookup = () => {
    setLookupStep(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= scenario.lookupSteps.length) {
        clearInterval(interval);
      }
      setLookupStep(step);
    }, 800);
  };

  return (
    <Panel title="Prototype Chain Explorer" accentColor="#f59e0b">
      <div className="flex gap-2 mb-4 flex-wrap">
        {SCENARIOS.map((s, i) => (
          <button
            key={s.name}
            onClick={() => { setActiveIndex(i); setLookupStep(-1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 ${
              i === activeIndex
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/40"
                : "bg-surface text-text-secondary border border-border hover:border-border-hover"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Prototype chain visualization */}
        <div>
          <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Prototype Chain
          </h4>
          <div className="space-y-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1"
              >
                {scenario.objects.map((obj, i) => (
                  <motion.div key={obj.id}>
                    {/* __proto__ arrow */}
                    {i > 0 && (
                      <div className="flex items-center justify-center py-0.5">
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-mono text-text-muted">__proto__</span>
                          <svg width="12" height="12" viewBox="0 0 12 12" className="text-text-muted">
                            <path d="M6 0 L6 8 L3 5 M6 8 L9 5" stroke="currentColor" fill="none" strokeWidth="1.5" />
                          </svg>
                        </div>
                      </div>
                    )}
                    <motion.div
                      initial={{ opacity: 0, x: -15 }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        scale: lookupStep >= 0 && lookupStep < scenario.lookupSteps.length && scenario.lookupSteps[lookupStep]?.includes(obj.label.split(" ")[0]) ? 1.02 : 1,
                      }}
                      transition={{ delay: i * 0.08 }}
                      className="rounded-lg p-3"
                      style={{
                        background: `linear-gradient(135deg, ${obj.color}12, ${obj.color}06)`,
                        border: `1px solid ${obj.color}35`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: obj.color }} />
                        <span className="text-[11px] font-mono font-semibold" style={{ color: obj.color }}>
                          {obj.label}
                        </span>
                        {obj.highlight && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: `${obj.color}15`, color: obj.color }}>
                            {obj.highlight}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {obj.props.map((p) => (
                          <span
                            key={p.name}
                            className="text-[10px] font-mono px-2 py-0.5 rounded"
                            style={{ background: `${obj.color}10`, color: obj.color, border: `1px solid ${obj.color}20` }}
                          >
                            {p.name}: {p.value}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Code + lookup */}
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Code
            </h4>
            <pre className="bg-[#0a0a0a] border border-border rounded-lg p-3 text-[11px] font-mono text-emerald-300 leading-relaxed overflow-x-auto">
              {scenario.code}
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                Property Lookup
              </h4>
              <button
                onClick={runLookup}
                className="text-[10px] font-mono px-2 py-1 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors"
              >
                ▶ Run Lookup
              </button>
            </div>
            <div className="bg-surface border border-border rounded-lg p-3 space-y-1.5 min-h-[100px]">
              {scenario.lookupSteps.map((step, i) => (
                <motion.div
                  key={step}
                  initial={false}
                  animate={{ opacity: lookupStep >= i ? 1 : 0.2, x: lookupStep >= i ? 0 : 10 }}
                  className="text-[11px] font-mono"
                  style={{ color: step.includes("✅") ? "#10b981" : step.includes("❌") ? "#ef4444" : "#9ca3af" }}
                >
                  {step}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
