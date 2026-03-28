"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

interface LinqOperator {
  id: string;
  label: string;
  code: string;
  exprNode: string;
  sqlFragment: string;
  warning?: string;
}

const AVAILABLE_OPERATORS: LinqOperator[] = [
  {
    id: "where-status",
    label: "Where (Status)",
    code: ".Where(o => o.Status == OrderStatus.Active)",
    exprNode: "WhereExpression\n  Property: Status\n  Op: ==\n  Constant: Active(2)",
    sqlFragment: "WHERE o.Status = @p0",
  },
  {
    id: "where-customer",
    label: "Where (CustomerId)",
    code: ".Where(o => o.CustomerId == customerId)",
    exprNode: "WhereExpression\n  Property: CustomerId\n  Op: ==\n  Parameter: @customerId",
    sqlFragment: "AND o.CustomerId = @p1",
  },
  {
    id: "select",
    label: "Select (projection)",
    code: ".Select(o => new { o.Id, o.Total, CustomerName = o.Customer.Name })",
    exprNode: "SelectExpression\n  MemberInit:\n    Id -> o.Id\n    Total -> o.Total\n    CustomerName -> o.Customer.Name (JOIN)",
    sqlFragment: "SELECT o.Id, o.Total, c.Name AS CustomerName\nINNER JOIN Customers c ON c.Id = o.CustomerId",
  },
  {
    id: "orderby",
    label: "OrderBy (CreatedAt)",
    code: ".OrderByDescending(o => o.CreatedAt)",
    exprNode: "OrderByExpression\n  Property: CreatedAt\n  Direction: Descending",
    sqlFragment: "ORDER BY o.CreatedAt DESC",
  },
  {
    id: "include",
    label: "Include (Items)",
    code: ".Include(o => o.Items).ThenInclude(i => i.Product)",
    exprNode: "IncludeExpression\n  Navigation: Items\n  ThenInclude:\n    Navigation: Product",
    sqlFragment: "LEFT JOIN OrderItems i ON i.OrderId = o.Id\nLEFT JOIN Products p ON p.Id = i.ProductId",
  },
  {
    id: "skip-take",
    label: "Skip/Take (paging)",
    code: ".Skip((page-1) * 20).Take(20)",
    exprNode: "SkipExpression\n  Count: @skip\nTakeExpression\n  Count: 20",
    sqlFragment: "OFFSET @skip ROWS FETCH NEXT 20 ROWS ONLY",
  },
  {
    id: "contains",
    label: "Contains (⚠ LIKE '%x%')",
    code: ".Where(o => o.Notes.Contains(searchTerm))",
    exprNode: "WhereExpression\n  MethodCall: Contains\n  Property: Notes\n  Arg: @searchTerm",
    sqlFragment: "WHERE o.Notes LIKE '%' + @p2 + '%'",
    warning: "Non-sargable! Leading % prevents index seek. Full table scan on large tables.",
  },
];

type TrackingMode = "tracked" | "no-tracking";

type PipelineStage = "idle" | "expression-tree" | "preprocessing" | "translation" | "sql" | "materialization";

const STAGE_LABELS: Record<PipelineStage, string> = {
  "idle": "Idle",
  "expression-tree": "Expression Tree",
  "preprocessing": "Query Preprocessor",
  "translation": "SQL Translation",
  "sql": "SQL Generated",
  "materialization": "Materialized",
};

export default function QueryPipelineVisualizer() {
  const [selectedOps, setSelectedOps] = useState<LinqOperator[]>([]);
  const [tracking, setTracking] = useState<TrackingMode>("tracked");
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [executing, setExecuting] = useState(false);
  const [resultCount, setResultCount] = useState<number | null>(null);

  const toggleOp = useCallback((op: LinqOperator) => {
    setSelectedOps(prev => {
      const exists = prev.find(o => o.id === op.id);
      if (exists) return prev.filter(o => o.id !== op.id);
      return [...prev, op];
    });
    setStage("idle");
    setResultCount(null);
  }, []);

  const execute = useCallback(async () => {
    if (selectedOps.length === 0) return;
    setExecuting(true);
    setResultCount(null);

    setStage("expression-tree");
    await sleep(600);
    setStage("preprocessing");
    await sleep(700);
    setStage("translation");
    await sleep(700);
    setStage("sql");
    await sleep(800);
    setStage("materialization");
    setResultCount(Math.floor(Math.random() * 40) + 3);
    setExecuting(false);
  }, [selectedOps]);

  const reset = useCallback(() => {
    setSelectedOps([]);
    setStage("idle");
    setExecuting(false);
    setResultCount(null);
  }, []);

  const hasWarning = selectedOps.some(op => op.warning);

  const STAGES: PipelineStage[] = ["expression-tree", "preprocessing", "translation", "sql", "materialization"];

  function buildFullSql(): string {
    const hasSelect = selectedOps.find(o => o.id === "select");
    const selectClause = hasSelect
      ? "SELECT o.Id, o.Total, c.Name AS CustomerName"
      : "SELECT o.*";

    const joins = selectedOps.filter(o => ["include", "select"].includes(o.id))
      .flatMap(o => o.sqlFragment.split("\n").filter(l => l.startsWith("LEFT JOIN") || l.startsWith("INNER JOIN")));

    const wheres = selectedOps.filter(o => o.sqlFragment.startsWith("WHERE") || o.sqlFragment.startsWith("AND"))
      .map(o => o.sqlFragment.replace(/^AND /, "").replace(/^WHERE /, ""));

    const orderby = selectedOps.find(o => o.id === "orderby");
    const paging = selectedOps.find(o => o.id === "skip-take");

    const lines: string[] = [selectClause, "FROM Orders o"];
    if (joins.length > 0) lines.push(...joins);
    if (wheres.length > 0) {
      lines.push("WHERE " + wheres[0]);
      for (let i = 1; i < wheres.length; i++) lines.push("  AND " + wheres[i]);
    }
    if (orderby) lines.push("ORDER BY o.CreatedAt DESC");
    if (paging) lines.push("OFFSET @skip ROWS FETCH NEXT 20 ROWS ONLY");

    const trackingNote = tracking === "no-tracking"
      ? "\n-- AsNoTracking: no snapshot, no identity map lookup — ~35% faster"
      : "\n-- Tracked: each row checked against identity map, snapshot captured";

    return lines.join("\n") + trackingNote;
  }

  return (
    <div className="space-y-4">
      {/* Tracking toggle */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-text-secondary font-mono">Tracking mode:</span>
        <button
          onClick={() => setTracking("tracked")}
          className={`text-xs px-3 py-1.5 rounded-lg border font-mono transition-all ${
            tracking === "tracked"
              ? "border-amber-500/60 bg-amber-950/30 text-amber-400"
              : "border-border bg-elevated text-text-secondary hover:border-border/80"
          }`}
        >
          .AsTracking() (default)
        </button>
        <button
          onClick={() => setTracking("no-tracking")}
          className={`text-xs px-3 py-1.5 rounded-lg border font-mono transition-all ${
            tracking === "no-tracking"
              ? "border-cyan-500/60 bg-cyan-950/30 text-cyan-400"
              : "border-border bg-elevated text-text-secondary hover:border-border/80"
          }`}
        >
          .AsNoTracking()
        </button>
        <div className="flex items-center gap-2 ml-2">
          <Button onClick={execute} disabled={executing || selectedOps.length === 0} size="sm" style={{ background: "#f59e0b", color: "#000" } as React.CSSProperties}>
            {executing ? "Executing..." : "Execute Query"}
          </Button>
          <Button variant="secondary" size="sm" onClick={reset}>Reset</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: LINQ operator picker */}
        <Panel title="Add LINQ Operators" accentColor="#f59e0b">
          <div className="space-y-1.5">
            <p className="text-[11px] text-text-secondary mb-3 font-mono">
              Click operators to compose the query. Each adds a node to the expression tree.
            </p>
            {AVAILABLE_OPERATORS.map(op => {
              const selected = selectedOps.some(o => o.id === op.id);
              return (
                <motion.button
                  key={op.id}
                  onClick={() => toggleOp(op)}
                  whileHover={{ x: 2 }}
                  className={`w-full text-left text-xs font-mono px-3 py-2 rounded-lg border transition-all ${
                    selected
                      ? "border-amber-500/50 bg-amber-950/30 text-amber-300"
                      : "border-border bg-background/30 text-text-secondary hover:border-border/60 hover:text-text-primary"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{op.label}</span>
                    {selected && <span className="text-amber-500">✓</span>}
                  </div>
                  <div className="text-[10px] text-text-secondary/60 mt-0.5 font-mono truncate">{op.code}</div>
                  {op.warning && <div className="text-[10px] text-amber-500 mt-0.5">⚠ {op.warning}</div>}
                </motion.button>
              );
            })}
          </div>
        </Panel>

        {/* Middle: Expression tree */}
        <Panel title="Expression Tree (in-memory)" accentColor="#f59e0b">
          {selectedOps.length === 0 ? (
            <p className="text-xs text-text-secondary font-mono opacity-50">
              Select operators to see the expression tree nodes
            </p>
          ) : (
            <div className="space-y-2">
              <div className="text-[10px] font-mono text-emerald-400 mb-2">
                QueryExpression&lt;Order&gt;
              </div>
              {selectedOps.map((op, i) => (
                <motion.div
                  key={op.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`border rounded-lg p-2 ${
                    stage !== "idle" && STAGES.indexOf(stage) >= 0
                      ? "border-amber-500/30 bg-amber-950/20"
                      : "border-border bg-background/30"
                  }`}
                >
                  <pre className="text-[10px] font-mono text-text-primary whitespace-pre-wrap leading-relaxed">
                    {op.exprNode}
                  </pre>
                </motion.div>
              ))}
            </div>
          )}
        </Panel>

        {/* Right: Pipeline stages + SQL */}
        <div className="space-y-3">
          <Panel title="Translation Pipeline" accentColor="#f59e0b">
            <div className="space-y-1.5">
              {STAGES.map((s, i) => {
                const active = stage === s;
                const done = stage !== "idle" && STAGES.indexOf(stage) > i;
                return (
                  <motion.div
                    key={s}
                    animate={{
                      opacity: active ? 1 : done ? 0.7 : 0.35,
                      scale: active ? 1.02 : 1,
                    }}
                    className={`flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-lg border transition-all ${
                      active ? "border-amber-500/50 bg-amber-950/30 text-amber-300"
                      : done ? "border-emerald-700/40 bg-emerald-950/20 text-emerald-400"
                      : "border-border/40 text-text-secondary"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      active ? "bg-amber-400 animate-pulse"
                      : done ? "bg-emerald-400"
                      : "bg-border"
                    }`} />
                    {STAGE_LABELS[s]}
                    {active && <span className="ml-auto text-[10px] animate-pulse">running</span>}
                    {done && <span className="ml-auto text-[10px]">✓</span>}
                  </motion.div>
                );
              })}
            </div>
          </Panel>

          {/* Generated SQL */}
          <AnimatePresence>
            {stage === "sql" || stage === "materialization" ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Panel title="Generated SQL" accentColor="#f59e0b">
                  <pre className="text-[10px] font-mono text-text-primary whitespace-pre-wrap leading-relaxed">
                    {buildFullSql()}
                  </pre>
                  {hasWarning && (
                    <div className="mt-2 text-[10px] font-mono text-amber-500 border border-amber-500/30 bg-amber-950/20 rounded p-2">
                      ⚠ Non-sargable LIKE detected — will bypass index on large tables
                    </div>
                  )}
                </Panel>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Result */}
          <AnimatePresence>
            {resultCount !== null && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className={`rounded-lg border px-3 py-2 text-xs font-mono ${
                  tracking === "no-tracking"
                    ? "border-cyan-600/40 bg-cyan-950/20 text-cyan-400"
                    : "border-emerald-700/40 bg-emerald-950/20 text-emerald-400"
                }`}>
                  <span className="w-2 h-2 rounded-full bg-current inline-block mr-2 align-middle" />
                  {resultCount} rows materialized
                  {tracking === "no-tracking"
                    ? " (AsNoTracking — no snapshot captured)"
                    : " (tracked — snapshot stored in change tracker)"}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
