"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Panel from "@/app/_ui/Panel";

interface RuntimeLayer {
  id: string;
  label: string;
  color: string;
  items: string[];
  description: string;
}

const LAYERS: RuntimeLayer[] = [
  {
    id: "js-engine",
    label: "V8 Engine (Single Thread)",
    color: "#06b6d4",
    items: ["Call Stack", "Memory Heap", "Garbage Collector"],
    description: "Parses, compiles, and executes JavaScript code. Contains the call stack (execution context) and heap (object allocation).",
  },
  {
    id: "web-apis",
    label: "Web APIs (Browser-Provided)",
    color: "#f59e0b",
    items: ["DOM API", "fetch / XMLHttpRequest", "setTimeout / setInterval", "Canvas / WebGL", "Web Workers", "Geolocation", "Web Storage", "WebSocket"],
    description: "Provided by the browser, NOT part of JavaScript. These run on separate threads and communicate results back via callback queues.",
  },
  {
    id: "callback-queues",
    label: "Callback Queues",
    color: "#a855f7",
    items: ["Microtask Queue (Promises)", "Macrotask Queue (setTimeout)", "Animation Frames (rAF)", "I/O Queue"],
    description: "Completed Web API callbacks wait here. The Event Loop moves them to the Call Stack when it's empty.",
  },
  {
    id: "rendering",
    label: "Rendering Pipeline",
    color: "#10b981",
    items: ["Style Calculation", "Layout (Reflow)", "Paint", "Composite"],
    description: "The browser's rendering engine. Runs between macrotasks when the Event Loop allows. Blocked by long-running JavaScript on the main thread.",
  },
];

export default function WebAPIsVisualizer() {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  return (
    <Panel title="Browser Runtime Architecture" accentColor="#f59e0b">
      <div className="space-y-3">
        {LAYERS.map((layer, i) => (
          <motion.div
            key={layer.id}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => setActiveLayer(activeLayer === layer.id ? null : layer.id)}
            className="rounded-lg p-4 cursor-pointer transition-all duration-200"
            style={{
              background: `linear-gradient(135deg, ${layer.color}10, ${layer.color}05)`,
              border: `1px solid ${activeLayer === layer.id ? layer.color + '60' : layer.color + '25'}`,
              boxShadow: activeLayer === layer.id ? `0 0 20px ${layer.color}15` : 'none',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full" style={{ background: layer.color }} />
              <span className="text-sm font-mono font-semibold" style={{ color: layer.color }}>
                {layer.label}
              </span>
              <span className="ml-auto text-[10px] font-mono text-text-muted">click to expand</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {layer.items.map((item) => (
                <span
                  key={item}
                  className="text-[10px] font-mono px-2 py-0.5 rounded"
                  style={{ background: `${layer.color}12`, color: layer.color, border: `1px solid ${layer.color}20` }}
                >
                  {item}
                </span>
              ))}
            </div>
            {activeLayer === layer.id && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-xs text-text-secondary leading-relaxed mt-2 pt-2 border-t"
                style={{ borderColor: `${layer.color}20` }}
              >
                {layer.description}
              </motion.p>
            )}
          </motion.div>
        ))}

        {/* Flow arrows */}
        <div className="flex items-center justify-center gap-2 py-2 text-[9px] font-mono text-text-muted">
          <span className="text-cyan-400">JS Engine</span>
          <span>→ delegates to →</span>
          <span className="text-amber-400">Web APIs</span>
          <span>→ enqueues in →</span>
          <span className="text-purple-400">Queues</span>
          <span>→ event loop →</span>
          <span className="text-cyan-400">Call Stack</span>
        </div>
      </div>
    </Panel>
  );
}
