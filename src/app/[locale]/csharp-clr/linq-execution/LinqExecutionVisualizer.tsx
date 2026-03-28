"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Panel from "@/app/_ui/Panel";

type QueryMode = "ienumerable" | "iqueryable";

interface Operator {
  id: string;
  name: string;
  arg: string;
  description: string;
  color: string;
  isTerminal?: boolean;
}

const AVAILABLE_OPERATORS: Operator[] = [
  { id: "where", name: "Where", arg: "p => p.Stock > 0", description: "Filters elements. In IEnumerable: pulls each item, tests predicate in C#. In IQueryable: adds WHERE clause to SQL.", color: "bg-violet-500/15 border-violet-500/40 text-violet-300" },
  { id: "select", name: "Select", arg: "p => new { p.Id, p.Name, p.Price }", description: "Projects each element. In IQueryable: generates SELECT column list — only fetches needed columns.", color: "bg-sky-500/15 border-sky-500/40 text-sky-300" },
  { id: "orderby", name: "OrderByDescending", arg: "p => p.Price", description: "Sorts elements. Buffers all elements before yielding first result (deferred but must read all). In SQL: ORDER BY clause.", color: "bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-300" },
  { id: "take", name: "Take", arg: "20", description: "Limits elements. In IEnumerable: stops pulling after 20 items. In SQL: TOP 20 / FETCH NEXT 20.", color: "bg-amber-500/15 border-amber-500/40 text-amber-300" },
  { id: "groupby", name: "GroupBy", arg: "p => p.CategoryId", description: "Groups elements by key. In IEnumerable: buffers all elements. In IQueryable: GROUP BY clause.", color: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" },
];

const TERMINAL_OPERATORS: Operator[] = [
  { id: "tolist", name: "ToList()", arg: "", description: "Executes the query. Materializes all results into a List<T> in memory. After this, all operations run in-memory.", color: "bg-accent/15 border-accent/40 text-accent", isTerminal: true },
  { id: "count", name: "Count()", arg: "", description: "Executes a COUNT. In SQL: SELECT COUNT(*). Returns int, no data fetched. TRAP: calling Count() before ToList() = two separate queries.", color: "bg-accent/15 border-accent/40 text-accent", isTerminal: true },
  { id: "first", name: "FirstOrDefault()", arg: "", description: "Fetches first matching element. In SQL: adds TOP 1 / FETCH NEXT 1. Throws if sequence is empty (use FirstOrDefault for null-safe variant).", color: "bg-accent/15 border-accent/40 text-accent", isTerminal: true },
];

// Simulated data
const SOURCE_DATA = [
  { id: 1, name: "Widget Pro", price: 49.99, stock: 12, categoryId: 1 },
  { id: 2, name: "Gadget Plus", price: 129.99, stock: 0, categoryId: 2 },
  { id: 3, name: "Doohickey", price: 9.99, stock: 47, categoryId: 1 },
  { id: 4, name: "Thingamajig", price: 299.99, stock: 3, categoryId: 3 },
  { id: 5, name: "Whatsit", price: 79.99, stock: 8, categoryId: 2 },
  { id: 6, name: "Contraption", price: 19.99, stock: 0, categoryId: 1 },
];

function applyPipeline(
  data: typeof SOURCE_DATA,
  pipeline: Operator[]
): typeof SOURCE_DATA {
  let result = [...data];
  for (const op of pipeline) {
    if (op.id === "where") result = result.filter((p) => p.stock > 0);
    if (op.id === "orderby") result = [...result].sort((a, b) => b.price - a.price);
    if (op.id === "take") result = result.slice(0, 20);
    if (op.id === "groupby") {
      const grouped = result.reduce((acc, p) => {
        const key = p.categoryId;
        if (!acc[key]) acc[key] = [];
        acc[key].push(p);
        return acc;
      }, {} as Record<number, typeof SOURCE_DATA>);
      return Object.values(grouped).flat();
    }
  }
  return result;
}

function generateSQL(pipeline: Operator[], terminal?: Operator): string {
  const conditions: string[] = [];
  const ordering: string[] = [];
  let columns = "*";
  let limit = "";

  for (const op of pipeline) {
    if (op.id === "where") conditions.push("Stock > 0");
    if (op.id === "select") columns = "Id, Name, Price";
    if (op.id === "orderby") ordering.push("Price DESC");
    if (op.id === "take") limit = "FETCH NEXT 20 ROWS ONLY";
    if (op.id === "groupby") ordering.push("CategoryId");
  }

  let sql = `SELECT ${terminal?.id === "count" ? "COUNT(*)" : columns}`;
  sql += `\nFROM Products`;
  if (conditions.length) sql += `\nWHERE ${conditions.join(" AND ")}`;
  if (ordering.length) sql += `\nORDER BY ${ordering.join(", ")}`;
  if (limit) sql += `\n${limit}`;

  return sql;
}

export default function LinqExecutionVisualizer() {
  const [mode, setMode] = useState<QueryMode>("ienumerable");
  const [pipeline, setPipeline] = useState<Operator[]>([]);
  const [terminal, setTerminal] = useState<Operator | null>(null);
  const [materialized, setMaterialized] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const addOperator = (op: Operator) => {
    if (materialized) return;
    if (pipeline.find((p) => p.id === op.id)) return;
    setPipeline((prev) => [...prev, op]);
    setExecutionLog((prev) => [
      ...prev,
      `Added ${op.name}(${op.arg}) — pipeline updated, NOT executed yet`,
    ]);
  };

  const setTerminalOp = async (op: Operator) => {
    if (isExecuting) return;
    setTerminal(op);
    setIsExecuting(true);
    setExecutionLog((prev) => [...prev, `Called ${op.name} — EXECUTING NOW...`]);

    await new Promise((r) => setTimeout(r, 600));

    if (mode === "iqueryable") {
      const sql = generateSQL(pipeline, op);
      setExecutionLog((prev) => [
        ...prev,
        `IQueryable → EF translates expression tree to SQL:`,
        sql,
        `→ Single round-trip to database`,
      ]);
    } else {
      setExecutionLog((prev) => [
        ...prev,
        `IEnumerable → iterating source (${SOURCE_DATA.length} items in memory)`,
        ...pipeline.map((p) => `  pull through ${p.name}(${p.arg})`),
        `→ Result materialized in C# memory`,
      ]);
    }

    await new Promise((r) => setTimeout(r, 400));
    setMaterialized(true);
    setIsExecuting(false);
  };

  const reset = () => {
    setPipeline([]);
    setTerminal(null);
    setMaterialized(false);
    setExecutionLog([]);
    setIsExecuting(false);
  };

  const currentResults = materialized
    ? applyPipeline(SOURCE_DATA, pipeline)
    : [];

  const sql = generateSQL(pipeline, terminal ?? undefined);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-elevated border border-border">
          {(["ienumerable", "iqueryable"] as QueryMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); reset(); }}
              className={`px-3 py-1.5 rounded-md text-sm font-mono transition-all ${
                mode === m
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {m === "ienumerable" ? "IEnumerable<T>" : "IQueryable<T>"}
            </button>
          ))}
        </div>
        <button
          onClick={reset}
          className="px-3 py-2 rounded-lg border border-border text-text-secondary text-sm hover:border-accent/20 transition-all"
        >
          ↩ Reset
        </button>
        <span className="text-xs text-text-secondary font-mono">
          {materialized
            ? "Query executed — results below"
            : "Add operators, then materialize"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Operator picker */}
        <div className="space-y-3">
          <Panel title="Pipeline Operators" accentColor="#A855F7">
            <div className="space-y-2">
              {AVAILABLE_OPERATORS.map((op) => {
                const inPipeline = pipeline.find((p) => p.id === op.id);
                return (
                  <button
                    key={op.id}
                    onClick={() => addOperator(op)}
                    disabled={!!inPipeline || materialized}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs font-mono transition-all ${
                      inPipeline
                        ? "opacity-40 cursor-not-allowed " + op.color
                        : materialized
                        ? "opacity-30 cursor-not-allowed bg-elevated border-border text-text-secondary"
                        : op.color + " hover:opacity-80 cursor-pointer"
                    }`}
                  >
                    <span className="font-semibold">.{op.name}</span>
                    {op.arg && (
                      <span className="opacity-60 ml-1">({op.arg})</span>
                    )}
                    {inPipeline && (
                      <span className="ml-2 text-[10px] opacity-60">✓ added</span>
                    )}
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title="Materialize (Terminal)" accentColor="#06B6D4">
            <div className="space-y-2">
              {TERMINAL_OPERATORS.map((op) => (
                <button
                  key={op.id}
                  onClick={() => setTerminalOp(op)}
                  disabled={isExecuting || materialized}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs font-mono transition-all ${
                    materialized && terminal?.id === op.id
                      ? "bg-accent/20 border-accent/60 text-accent"
                      : "bg-accent/10 border-accent/30 text-accent hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="font-semibold">.{op.name}</span>
                </button>
              ))}
            </div>
          </Panel>
        </div>

        {/* Middle: Pipeline visualization */}
        <Panel title="Query Pipeline" accentColor="#A855F7">
          <div className="space-y-2 min-h-[300px]">
            {/* Source */}
            <div className="px-3 py-2.5 rounded-lg border bg-elevated border-border text-xs font-mono text-text-secondary">
              <span className="text-emerald-400">Source</span>
              {mode === "iqueryable" ? (
                <span className="opacity-60 ml-2">dbContext.Products (IQueryable)</span>
              ) : (
                <span className="opacity-60 ml-2">products (IEnumerable — {SOURCE_DATA.length} items in memory)</span>
              )}
            </div>

            {/* Pipeline operators */}
            <AnimatePresence>
              {pipeline.map((op, i) => (
                <motion.div
                  key={op.id}
                  initial={{ opacity: 0, x: -16, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, x: 16, height: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex items-center gap-1">
                    <div className="w-px h-4 bg-border mx-auto ml-3" />
                  </div>
                  <div className={`px-3 py-2.5 rounded-lg border text-xs font-mono ${op.color}`}>
                    <span className="font-semibold">.{op.name}</span>
                    {op.arg && <span className="opacity-70 ml-1">({op.arg})</span>}
                    {!materialized && (
                      <span className="ml-2 text-[10px] opacity-50 italic">
                        {mode === "iqueryable"
                          ? "→ expression tree"
                          : "→ deferred"}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Terminal */}
            {terminal && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="flex items-center gap-1">
                  <div className="w-px h-4 bg-accent/40 mx-auto ml-3" />
                </div>
                <div className="px-3 py-2.5 rounded-lg border bg-accent/15 border-accent/50 text-xs font-mono text-accent">
                  <span className="font-semibold">.{terminal.name}</span>
                  <span className="ml-2 text-[10px] font-bold">← EXECUTES HERE</span>
                </div>
              </motion.div>
            )}

            {pipeline.length === 0 && !terminal && (
              <div className="flex items-center justify-center py-8 text-xs text-text-secondary/40 font-mono">
                Click operators to build a pipeline
              </div>
            )}

            {/* Deferred indicator */}
            {pipeline.length > 0 && !materialized && (
              <div className="mt-3 p-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
                <p className="text-[11px] text-amber-400 font-mono">
                  ⏳ Query defined but NOT executed. Click a terminal operator to run it.
                </p>
              </div>
            )}
          </div>
        </Panel>

        {/* Right: Execution output */}
        <div className="space-y-3">
          {/* SQL preview (IQueryable mode) */}
          {mode === "iqueryable" && pipeline.length > 0 && (
            <Panel title="Generated SQL Preview" accentColor="#06B6D4">
              <pre className={`text-[11px] font-mono leading-relaxed ${
                materialized ? "text-sky-300" : "text-text-secondary/60"
              }`}>
                {sql}
                {!materialized && (
                  <span className="block mt-2 italic text-text-secondary/40">
                    -- not sent yet (deferred)
                  </span>
                )}
              </pre>
            </Panel>
          )}

          {/* Execution log */}
          <Panel title="Execution Log" accentColor="#A855F7">
            <div className="space-y-1.5 min-h-[120px] max-h-[180px] overflow-y-auto">
              {executionLog.length === 0 ? (
                <p className="text-xs text-text-secondary/40 font-mono">
                  No activity yet...
                </p>
              ) : (
                executionLog.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`text-[11px] font-mono leading-relaxed ${
                      log.startsWith("SELECT") || log.startsWith("FROM") || log.startsWith("WHERE") || log.startsWith("ORDER") || log.startsWith("FETCH")
                        ? "text-sky-400 pl-2"
                        : log.includes("EXECUTING")
                        ? "text-accent font-semibold"
                        : "text-text-secondary/70"
                    }`}
                  >
                    {log}
                  </motion.div>
                ))
              )}
            </div>
          </Panel>

          {/* Results */}
          <AnimatePresence>
            {materialized && currentResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Panel title={`Results (${currentResults.length} items)`} accentColor="#10B981">
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                    {currentResults.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        className="text-[11px] font-mono text-emerald-300/80 flex items-center gap-2"
                      >
                        <span className="text-emerald-500/40">→</span>
                        <span>
                          {item.name} · ${item.price} · stock: {item.stock}
                        </span>
                      </div>
                    ))}
                    {currentResults.length > 6 && (
                      <p className="text-[11px] text-text-secondary/40 font-mono">
                        ... +{currentResults.length - 6} more
                      </p>
                    )}
                  </div>
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Info row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl border border-violet-500/20 bg-violet-500/5">
          <p className="text-xs font-mono text-violet-400 font-semibold mb-1">
            IEnumerable&lt;T&gt; — in-memory
          </p>
          <p className="text-[11px] text-text-secondary">
            Each operator wraps the source as an iterator. Items pulled one-by-one through the chain. Filtering happens in C# process. Loads all data into application server memory first.
          </p>
        </div>
        <div className="p-3 rounded-xl border border-sky-500/20 bg-sky-500/5">
          <p className="text-xs font-mono text-sky-400 font-semibold mb-1">
            IQueryable&lt;T&gt; — server-side
          </p>
          <p className="text-[11px] text-text-secondary">
            Operators add to an expression tree. Nothing sent to DB until terminal operator. EF Core translates the full tree to optimized SQL. Only matching rows cross the network.
          </p>
        </div>
      </div>
    </div>
  );
}
