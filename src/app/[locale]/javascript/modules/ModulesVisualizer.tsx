"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Panel from "@/app/_ui/Panel";

interface ModuleBox {
  id: string;
  label: string;
  color: string;
  exports: string[];
  imports?: { from: string; names: string[] }[];
}

const ESM_MODULES: ModuleBox[] = [
  { id: "main", label: "main.js (entry)", color: "#06b6d4", exports: [], imports: [{ from: "utils", names: ["formatDate", "parseUrl"] }, { from: "api", names: ["fetchUser"] }] },
  { id: "utils", label: "utils.js", color: "#10b981", exports: ["formatDate", "parseUrl", "slugify"], imports: [] },
  { id: "api", label: "api.js", color: "#a855f7", exports: ["fetchUser", "fetchPosts"], imports: [{ from: "config", names: ["API_URL"] }] },
  { id: "config", label: "config.js", color: "#f59e0b", exports: ["API_URL", "TIMEOUT"], imports: [] },
];

const CJS_MODULES: ModuleBox[] = [
  { id: "main", label: "main.js (entry)", color: "#06b6d4", exports: [], imports: [{ from: "utils", names: ["require(./utils)"] }, { from: "api", names: ["require(./api)"] }] },
  { id: "utils", label: "utils.js", color: "#10b981", exports: ["module.exports = { formatDate, parseUrl }"], imports: [] },
  { id: "api", label: "api.js", color: "#a855f7", exports: ["module.exports = { fetchUser }"], imports: [{ from: "config", names: ["require(./config)"] }] },
  { id: "config", label: "config.js", color: "#f59e0b", exports: ["module.exports = { API_URL }"], imports: [] },
];

const COMPARISONS = [
  { feature: "Syntax", esm: "import / export", cjs: "require() / module.exports" },
  { feature: "Loading", esm: "Static (parsed at compile time)", cjs: "Dynamic (executed at runtime)" },
  { feature: "Tree Shaking", esm: "✅ Yes — dead code eliminated", cjs: "❌ No — bundler can't know what's used" },
  { feature: "Top-Level Await", esm: "✅ Supported", cjs: "❌ Not supported" },
  { feature: "this at Top Level", esm: "undefined", cjs: "module.exports" },
  { feature: "File Extension", esm: ".mjs or type:module", cjs: ".cjs or default in Node" },
  { feature: "Binding", esm: "Live bindings (updates reflect)", cjs: "Value copy (snapshot at require time)" },
];

export default function ModulesVisualizer() {
  const [system, setSystem] = useState<"esm" | "cjs">("esm");
  const modules = system === "esm" ? ESM_MODULES : CJS_MODULES;

  return (
    <Panel title="Module System: ESM vs CommonJS" accentColor="#10b981">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSystem("esm")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${system === "esm" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40" : "bg-surface text-text-secondary border border-border"}`}
        >
          ESM (import/export)
        </button>
        <button
          onClick={() => setSystem("cjs")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${system === "cjs" ? "bg-amber-500/15 text-amber-400 border border-amber-500/40" : "bg-surface text-text-secondary border border-border"}`}
        >
          CommonJS (require)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Module graph */}
        <div>
          <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2">
            Module Dependency Graph
          </h4>
          <div className="space-y-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={system}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {modules.map((mod, i) => (
                  <motion.div
                    key={mod.id}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-lg p-3"
                    style={{
                      background: `linear-gradient(135deg, ${mod.color}12, ${mod.color}06)`,
                      border: `1px solid ${mod.color}35`,
                      marginLeft: mod.imports && mod.imports.length > 0 ? 0 : 20,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: mod.color }} />
                      <span className="text-[11px] font-mono font-semibold" style={{ color: mod.color }}>
                        {mod.label}
                      </span>
                    </div>
                    {mod.exports.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        <span className="text-[9px] font-mono text-text-muted">exports:</span>
                        {mod.exports.map((e) => (
                          <span key={e} className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${mod.color}15`, color: mod.color }}>
                            {e}
                          </span>
                        ))}
                      </div>
                    )}
                    {mod.imports && mod.imports.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[9px] font-mono text-text-muted">imports:</span>
                        {mod.imports.map((imp) => (
                          <span key={imp.from} className="text-[9px] font-mono text-text-secondary">
                            {imp.names.join(", ")} ← {imp.from}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Comparison table */}
        <div>
          <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2">
            ESM vs CommonJS Comparison
          </h4>
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-2 py-1.5 text-left text-text-muted">Feature</th>
                  <th className="px-2 py-1.5 text-left text-emerald-400">ESM</th>
                  <th className="px-2 py-1.5 text-left text-amber-400">CJS</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISONS.map((c) => (
                  <tr key={c.feature} className="border-b border-border/50">
                    <td className="px-2 py-1.5 text-text-secondary">{c.feature}</td>
                    <td className="px-2 py-1.5 text-text-secondary">{c.esm}</td>
                    <td className="px-2 py-1.5 text-text-secondary">{c.cjs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Panel>
  );
}
