"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type Strategy = "eager" | "lazy" | "explicit";

interface SqlQuery {
  sql: string;
  type: "primary" | "n-plus-1" | "controlled";
  orderIndex?: number;
}

const ORDER_COUNT = 8;

function buildEagerQueries(): SqlQuery[] {
  return [
    {
      type: "primary",
      sql: `SELECT o.Id, o.Status, o.CreatedAt,\n       c.Id, c.Name,\n       i.Id, i.Quantity, i.Price,\n       p.Id, p.Name, p.Sku\nFROM Orders o\nINNER JOIN Customers c ON c.Id = o.CustomerId\nLEFT JOIN OrderItems i ON i.OrderId = o.Id\nLEFT JOIN Products p ON p.Id = i.ProductId\nWHERE o.Status = @status\nORDER BY o.CreatedAt DESC`,
    },
  ];
}

function buildLazyQueries(): SqlQuery[] {
  const queries: SqlQuery[] = [
    {
      type: "primary",
      sql: `SELECT o.Id, o.Status, o.CreatedAt, o.CustomerId\nFROM Orders o\nWHERE o.Status = @status`,
    },
  ];
  for (let i = 1; i <= ORDER_COUNT; i++) {
    queries.push({
      type: "n-plus-1",
      orderIndex: i,
      sql: `SELECT i.Id, i.Quantity, i.Price, i.ProductId\nFROM OrderItems i\nWHERE i.OrderId = ${100 + i}`,
    });
  }
  return queries;
}

function buildExplicitQueries(): SqlQuery[] {
  return [
    {
      type: "primary",
      sql: `SELECT o.Id, o.Status, o.CreatedAt, o.CustomerId\nFROM Orders o\nWHERE o.Status = @status`,
    },
    {
      type: "controlled",
      sql: `SELECT i.Id, i.Quantity, i.Price,\n       p.Id, p.Name, p.Sku\nFROM OrderItems i\nINNER JOIN Products p ON p.Id = i.ProductId\nWHERE i.OrderId IN (101, 102, 103, 104, 105, 106, 107, 108)`,
    },
  ];
}

const STRATEGY_META: Record<Strategy, { label: string; tagline: string; color: string; borderColor: string; badgeClass: string; queryBuilderFn: () => SqlQuery[] }> = {
  eager: {
    label: "Eager Loading",
    tagline: ".Include() — 1 query with JOIN",
    color: "text-emerald-400",
    borderColor: "border-emerald-700/50",
    badgeClass: "bg-emerald-900/40 border-emerald-700/50 text-emerald-400",
    queryBuilderFn: buildEagerQueries,
  },
  lazy: {
    label: "Lazy Loading",
    tagline: "Proxies — 1 + N queries (N+1 explosion)",
    color: "text-red-400",
    borderColor: "border-red-700/50",
    badgeClass: "bg-red-900/40 border-red-700/50 text-red-400",
    queryBuilderFn: buildLazyQueries,
  },
  explicit: {
    label: "Explicit Loading",
    tagline: ".LoadAsync() — 2 controlled queries",
    color: "text-cyan-400",
    borderColor: "border-cyan-600/50",
    badgeClass: "bg-cyan-900/40 border-cyan-600/50 text-cyan-400",
    queryBuilderFn: buildExplicitQueries,
  },
};

export default function LoadingStrategiesVisualizer() {
  const [activeStrategy, setActiveStrategy] = useState<Strategy | null>(null);
  const [queries, setQueries] = useState<SqlQuery[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const runStrategy = useCallback(async (strategy: Strategy) => {
    setActiveStrategy(strategy);
    setQueries([]);
    setVisibleCount(0);
    setRunning(true);
    setDone(false);

    const allQueries = STRATEGY_META[strategy].queryBuilderFn();

    for (let i = 0; i < allQueries.length; i++) {
      const delay = strategy === "lazy" && i > 0 ? 150 : 500;
      await sleep(delay);
      setQueries(allQueries.slice(0, i + 1));
      setVisibleCount(i + 1);
    }

    setDone(true);
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    setActiveStrategy(null);
    setQueries([]);
    setVisibleCount(0);
    setRunning(false);
    setDone(false);
  }, []);

  return (
    <div className="space-y-4">
      {/* Scenario description */}
      <Panel title="Scenario: Load 8 orders and display each order&apos;s item count" accentColor="#f59e0b">
        <div className="flex flex-wrap gap-2 items-center">
          <code className="text-xs font-mono text-amber-400 bg-amber-950/30 border border-amber-500/30 px-2 py-1 rounded">
            Order has many OrderItems, each has a Product
          </code>
          <span className="text-xs text-text-secondary">—</span>
          <span className="text-xs text-text-secondary">Click a strategy below to simulate the queries it fires.</span>
        </div>
      </Panel>

      {/* Strategy selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(["eager", "lazy", "explicit"] as Strategy[]).map(strategy => {
          const meta = STRATEGY_META[strategy];
          const isActive = activeStrategy === strategy;
          return (
            <motion.button
              key={strategy}
              onClick={() => !running && runStrategy(strategy)}
              disabled={running}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                isActive ? `${meta.borderColor} bg-elevated` : "border-border bg-elevated/50 hover:border-border/80"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <div className={`text-sm font-semibold font-mono mb-1 ${isActive ? meta.color : "text-text-primary"}`}>
                {meta.label}
              </div>
              <div className="text-xs text-text-secondary">{meta.tagline}</div>
              {isActive && running && (
                <div className={`mt-2 text-[10px] font-mono animate-pulse ${meta.color}`}>
                  firing queries...
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Query animation area */}
      <AnimatePresence mode="wait">
        {activeStrategy && (
          <motion.div
            key={activeStrategy}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {/* Query count badge */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className={`text-xs font-mono px-3 py-1.5 rounded-full border font-semibold ${STRATEGY_META[activeStrategy].badgeClass}`}>
                {visibleCount} {visibleCount === 1 ? "query" : "queries"} fired
              </div>
              {activeStrategy === "lazy" && visibleCount > 1 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-xs font-mono text-red-400 border border-red-600/40 bg-red-950/20 px-3 py-1.5 rounded-full"
                >
                  ⚠ N+1 detected: {visibleCount - 1} extra {visibleCount - 1 === 1 ? "query" : "queries"} for {Math.min(visibleCount - 1, ORDER_COUNT)} orders
                </motion.div>
              )}
              {done && activeStrategy === "eager" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-mono text-emerald-400 border border-emerald-700/40 bg-emerald-950/20 px-3 py-1.5 rounded-full">
                  ✓ All data loaded in 1 round-trip
                </motion.div>
              )}
              {done && activeStrategy === "explicit" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-mono text-cyan-400 border border-cyan-600/40 bg-cyan-950/20 px-3 py-1.5 rounded-full">
                  ✓ 2 controlled round-trips — predictable performance
                </motion.div>
              )}
              <Button variant="secondary" size="sm" onClick={reset} className="ml-auto">
                Reset
              </Button>
            </div>

            {/* Queries */}
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {queries.map((q, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`rounded-lg border p-3 ${
                    q.type === "n-plus-1"
                      ? "border-red-600/40 bg-red-950/20"
                      : q.type === "controlled"
                      ? "border-cyan-600/30 bg-cyan-950/10"
                      : "border-emerald-700/30 bg-emerald-950/10"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      q.type === "n-plus-1"
                        ? "text-red-400 border-red-600/40 bg-red-900/30"
                        : q.type === "controlled"
                        ? "text-cyan-400 border-cyan-600/40 bg-cyan-900/30"
                        : "text-emerald-400 border-emerald-700/40 bg-emerald-900/30"
                    }`}>
                      {q.type === "n-plus-1" ? `Query #${i + 1} (N+1 — OrderId ${100 + (q.orderIndex ?? i)})` : `Query #${i + 1}`}
                    </span>
                    {q.type === "n-plus-1" && (
                      <span className="text-[10px] text-red-400 font-mono">← fired by lazy proxy accessing .Items</span>
                    )}
                  </div>
                  <pre className="text-[10px] font-mono text-text-primary whitespace-pre-wrap leading-relaxed">
                    {q.sql}
                  </pre>
                </motion.div>
              ))}
            </div>

            {/* Summary comparison (shown after lazy completes) */}
            {done && activeStrategy === "lazy" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Panel title="N+1 Impact — same data, different strategies" accentColor="#f59e0b">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: "Eager (.Include)", queries: 1, color: "text-emerald-400", bg: "bg-emerald-950/20 border-emerald-700/40" },
                      { label: "Explicit (.LoadAsync)", queries: 2, color: "text-cyan-400", bg: "bg-cyan-950/20 border-cyan-600/40" },
                      { label: "Lazy (proxies)", queries: ORDER_COUNT + 1, color: "text-red-400", bg: "bg-red-950/20 border-red-600/40" },
                    ].map(item => (
                      <div key={item.label} className={`rounded-lg border p-3 ${item.bg}`}>
                        <div className={`text-2xl font-bold font-mono ${item.color}`}>{item.queries}</div>
                        <div className="text-[10px] text-text-secondary mt-1">{item.label}</div>
                        <div className="text-[10px] text-text-secondary/60">{item.queries === 1 ? "query" : "queries"}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-text-secondary mt-3 font-mono">
                    With 100 orders, lazy loading fires 101 queries. With 1,000 orders, 1,001 queries.
                    The number scales linearly with the dataset — and is completely invisible in the application code.
                  </p>
                </Panel>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Initial state hint */}
      {!activeStrategy && (
        <div className="text-center py-8 text-xs text-text-secondary/50 font-mono border border-dashed border-border/40 rounded-xl">
          Select a loading strategy above to see the SQL queries it generates
        </div>
      )}
    </div>
  );
}
