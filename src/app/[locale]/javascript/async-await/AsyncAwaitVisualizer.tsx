"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Panel from "@/app/_ui/Panel";

interface TransformLine {
  original: string;
  compiled: string;
  colorO: string;
  colorC: string;
}

const TRANSFORMS: TransformLine[] = [
  { original: "async function fetchUser(id) {", compiled: "function fetchUser(id) {", colorO: "#06b6d4", colorC: "#06b6d4" },
  { original: "  const resp = await fetch(url);", compiled: "  return fetch(url).then(resp => {", colorO: "#a855f7", colorC: "#f59e0b" },
  { original: "  const data = await resp.json();", compiled: "    return resp.json().then(data => {", colorO: "#a855f7", colorC: "#f59e0b" },
  { original: "  return data;", compiled: "      return data;", colorO: "#10b981", colorC: "#10b981" },
  { original: "}", compiled: "    }); }); }", colorO: "#6b7280", colorC: "#6b7280" },
];

const STATES = [
  { label: "START", desc: "Function called — returns a Promise immediately", color: "#06b6d4" },
  { label: "SUSPEND", desc: "Hits 'await' — pauses execution, yields to event loop", color: "#f59e0b" },
  { label: "RESUME", desc: "Awaited Promise settles — engine resumes from saved state", color: "#10b981" },
  { label: "SUSPEND", desc: "Hits second 'await' — suspends again", color: "#f59e0b" },
  { label: "RESUME", desc: "Second Promise settles — resumes", color: "#10b981" },
  { label: "RETURN", desc: "Function completes — resolves the outer Promise", color: "#a855f7" },
];

export default function AsyncAwaitVisualizer() {
  const [view, setView] = useState<"transform" | "state">("transform");
  const [activeStep, setActiveStep] = useState(-1);
  const [showCompiled, setShowCompiled] = useState(false);

  const runStateMachine = () => {
    setActiveStep(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= STATES.length) {
        clearInterval(interval);
        return;
      }
      setActiveStep(step);
    }, 1000);
  };

  return (
    <Panel title="async/await Under the Hood" accentColor="#a855f7">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setView("transform"); setActiveStep(-1); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${view === "transform" ? "bg-accent/15 text-accent border border-accent/40" : "bg-surface text-text-secondary border border-border"}`}
        >
          Desugaring View
        </button>
        <button
          onClick={() => { setView("state"); setActiveStep(-1); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${view === "state" ? "bg-accent/15 text-accent border border-accent/40" : "bg-surface text-text-secondary border border-border"}`}
        >
          State Machine
        </button>
      </div>

      {view === "transform" && (
        <div>
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setShowCompiled(!showCompiled)}
              className="text-[10px] font-mono px-2 py-1 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500/25 transition-colors"
            >
              {showCompiled ? "Show Original" : "Show Compiled ⟶"}
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                What You Write (async/await)
              </h4>
              <div className="bg-[#0a0a0a] border border-border rounded-lg p-3 space-y-0.5">
                {TRANSFORMS.map((t, i) => (
                  <motion.div
                    key={`o-${i}`}
                    animate={{ opacity: showCompiled ? 0.3 : 1 }}
                    className="text-[11px] font-mono"
                    style={{ color: t.colorO }}
                  >
                    {t.original}
                  </motion.div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                What Engine Sees (Promise chain)
              </h4>
              <div className="bg-[#0a0a0a] border border-border rounded-lg p-3 space-y-0.5">
                {TRANSFORMS.map((t, i) => (
                  <motion.div
                    key={`c-${i}`}
                    animate={{ opacity: showCompiled ? 1 : 0.3 }}
                    className="text-[11px] font-mono"
                    style={{ color: t.colorC }}
                  >
                    {t.compiled}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-[10px] font-mono text-text-muted mt-2 text-center">
            async/await is syntactic sugar — the engine transforms it into a Promise chain with a state machine
          </p>
        </div>
      )}

      {view === "state" && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              onClick={runStateMachine}
              className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
            >
              ▶ Run State Machine
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {STATES.map((s, i) => (
              <motion.div
                key={`state-${i}`}
                animate={{
                  opacity: activeStep >= i ? 1 : 0.25,
                  scale: activeStep === i ? 1.02 : 1,
                  x: activeStep === i ? 4 : 0,
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{
                  background: activeStep === i ? `${s.color}15` : "transparent",
                  border: `1px solid ${activeStep >= i ? s.color + '40' : '#1f293700'}`,
                }}
              >
                <span
                  className="w-16 text-center text-[10px] font-mono font-bold px-2 py-1 rounded"
                  style={{ background: `${s.color}20`, color: s.color }}
                >
                  {s.label}
                </span>
                <span className="text-xs text-text-secondary">{s.desc}</span>
                {activeStep === i && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto text-xs"
                  >
                    ◀
                  </motion.span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
