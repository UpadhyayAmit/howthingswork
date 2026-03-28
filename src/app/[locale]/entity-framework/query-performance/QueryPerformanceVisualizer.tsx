"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Panel from "@/app/_ui/Panel";

type VariantId = "naive" | "projected" | "indexed" | "compiled" | "split";

interface QueryVariant {
  id: VariantId;
  label: string;
  description: string;
  execMs: number;
  rowsLoaded: number;
  allocKb: number;
  color: string;
  barColor: string;
  sql: string;
  csharp: string;
}

const VARIANTS: QueryVariant[] = [
  {
    id: "naive",
    label: "1. Naive Full Load",
    description: "Full entity graph, all columns, change-tracked. The default anti-pattern.",
    execMs: 420,
    rowsLoaded: 12400,
    allocKb: 8200,
    color: "text-red-400",
    barColor: "bg-red-500",
    sql: `-- SELECT * — all columns, no projection
SELECT o.Id, o.Status, o.PlacedAt, o.TotalAmount,
       o.InternalNotes, o.BillingMetadata, /* ... 22 more cols */
       c.Id, c.Name, c.Email, c.Phone, c.BillingAddress,
       /* ... 18 more customer cols */
       i.Id, i.OrderId, i.ProductId, i.Quantity, i.UnitPrice, i.Discount
FROM   Orders o
JOIN   Customers c ON c.Id = o.CustomerId
JOIN   OrderItems i ON i.OrderId = o.Id
WHERE  o.Status = N'Pending'
-- 12,400 rows returned (cartesian: orders × items)
-- Change tracker registers every entity: O(N) memory`,
    csharp: `var orders = await _dbContext.Orders
    .Where(o => o.Status == OrderStatus.Pending)
    .Include(o => o.Customer)
    .Include(o => o.Items)
    .ToListAsync(ct);
// ❌ SELECT * — 22 unused columns per order
// ❌ Change tracker overhead — not needed for reads
// ❌ Cartesian product rows for Items`,
  },
  {
    id: "projected",
    label: "2. Projected DTO",
    description: "Only needed columns, no tracking. The baseline for read endpoints.",
    execMs: 38,
    rowsLoaded: 400,
    allocKb: 310,
    color: "text-emerald-400",
    barColor: "bg-emerald-500",
    sql: `-- Projected — only 5 columns fetched
SELECT o.Id, c.Name AS CustomerName,
       o.TotalAmount, o.PlacedAt,
       COUNT(i.Id) AS ItemCount
FROM   Orders o
JOIN   Customers c ON c.Id = o.CustomerId
LEFT   JOIN OrderItems i ON i.OrderId = o.Id
WHERE  o.Status = N'Pending'
GROUP  BY o.Id, c.Name, o.TotalAmount, o.PlacedAt
-- 400 rows (one per order, not cartesian)
-- No tracking — DTOs never enter change tracker`,
    csharp: `var orders = await _dbContext.Orders
    .Where(o => o.Status == OrderStatus.Pending)
    .AsNoTracking()
    .Select(o => new OrderSummaryDto
    {
        Id = o.Id,
        CustomerName = o.Customer.Name,
        TotalAmount = o.TotalAmount,
        PlacedAt = o.PlacedAt,
        ItemCount = o.Items.Count()
    })
    .ToListAsync(ct);
// ✅ 5 columns vs 40+
// ✅ No change tracker overhead
// ✅ EF translates subquery Count() to SQL`,
  },
  {
    id: "indexed",
    label: "3. With FK Index",
    description: "Index on CustomerId FK + OrderStatus. Same projected query, 10x faster scan.",
    execMs: 12,
    rowsLoaded: 400,
    allocKb: 310,
    color: "text-sky-400",
    barColor: "bg-sky-500",
    sql: `-- EF generates index from HasIndex() in OnModelCreating
-- IX_Orders_Status — covering index on Status + Id + TotalAmount + PlacedAt
CREATE NONCLUSTERED INDEX [IX_Orders_Status_CustomerId]
    ON [Orders] ([Status] ASC, [CustomerId] ASC)
    INCLUDE ([TotalAmount], [PlacedAt]);

-- Query now uses Index Seek instead of Table Scan
-- Estimated rows before seek: 2,400,000
-- After index seek on Status = 'Pending': 400
-- Plan: Index Seek (IX_Orders_Status_CustomerId) → Nested Loops
--       → Key Lookup (Customers)`,
    csharp: `// In OnModelCreating or IEntityTypeConfiguration<Order>:
modelBuilder.Entity<Order>()
    .HasIndex(o => new { o.Status, o.CustomerId })
    .HasDatabaseName("IX_Orders_Status_CustomerId")
    .IncludeProperties(o => new { o.TotalAmount, o.PlacedAt });

// EF Core does NOT automatically create indexes on FK columns in SQL Server
// You must add them explicitly — missing FK indexes = table scans on every JOIN`,
  },
  {
    id: "compiled",
    label: "4. Compiled Query",
    description: "Pre-compiled expression tree. Zero LINQ translation cost per call.",
    execMs: 11,
    rowsLoaded: 400,
    allocKb: 285,
    color: "text-violet-400",
    barColor: "bg-violet-500",
    sql: `-- SQL identical to projected variant
-- Difference is in C# execution path:
--   Normal query:  Expression tree walk → SQL generation → parameter bind → execute
--   Compiled:       (pre-compiled at startup) → parameter bind → execute
-- Per-call savings: ~8ms expression tree translation (at scale = significant)

-- At 5,000 RPS: 8ms × 5,000 = 40 CPU-seconds/sec saved
-- Compiled queries are critical for Lambda/Function cold starts`,
    csharp: `// Define ONCE as a static field (compiled at first use)
private static readonly Func<AppDbContext, Task<List<OrderSummaryDto>>>
    GetPendingOrders = EF.CompileAsyncQuery(
        (AppDbContext ctx) => ctx.Orders
            .Where(o => o.Status == OrderStatus.Pending)
            .AsNoTracking()
            .Select(o => new OrderSummaryDto
            {
                Id = o.Id,
                CustomerName = o.Customer.Name,
                TotalAmount = o.TotalAmount,
            }));

// ✅ Zero expression tree compilation cost per call
// Usage:
var orders = await GetPendingOrders(_dbContext);`,
  },
  {
    id: "split",
    label: "5. Split Query",
    description: "AsSplitQuery() for multi-Include — 3 queries vs cartesian product.",
    execMs: 35,
    rowsLoaded: 1150,
    allocKb: 480,
    color: "text-amber-400",
    barColor: "bg-amber-500",
    sql: `-- EF fires 3 separate queries:

-- Query 1: Orders
SELECT o.Id, o.TotalAmount, o.PlacedAt FROM Orders o
WHERE o.Status = N'Pending'; -- 400 rows

-- Query 2: Items for those orders
SELECT i.OrderId, i.ProductId, i.Quantity, i.UnitPrice
FROM OrderItems i
WHERE i.OrderId IN (SELECT o.Id FROM Orders o WHERE o.Status = N'Pending');
-- 600 rows

-- Query 3: Tags for those orders
SELECT t.OrderId, t.Label FROM OrderTags t
WHERE t.OrderId IN (SELECT o.Id FROM Orders o WHERE o.Status = N'Pending');
-- 150 rows

-- Total: 1,150 rows vs ~60,000 cartesian rows without AsSplitQuery`,
    csharp: `var orders = await _dbContext.Orders
    .Where(o => o.Status == OrderStatus.Pending)
    .Include(o => o.Items)
    .Include(o => o.Tags)
    .AsSplitQuery()      // ← prevents cartesian explosion
    .AsNoTracking()
    .TagWith("Dashboard:PendingOrders")
    .ToListAsync(ct);

// ✅ 3 round-trips but no cartesian product
// ✅ TagWith() labels query in SQL profiler
// Trade-off: not atomic — tags/items could diverge
//   between queries in high-concurrency scenarios`,
  },
];

const MAX_MS = 420;
const MAX_ROWS = 12400;
const MAX_KB = 8200;

function MetricBar({
  value,
  max,
  color,
  label,
  unit,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
  unit: string;
}) {
  const pct = Math.max(4, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-[11px] font-mono mb-1">
        <span className="text-text-secondary">{label}</span>
        <span className={color}>
          {value.toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-elevated overflow-hidden border border-border/40">
        <motion.div
          className={`h-full rounded-full ${color.replace("text-", "bg-")}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default function QueryPerformanceVisualizer() {
  const [selected, setSelected] = useState<VariantId>("naive");
  const [activeTab, setActiveTab] = useState<"sql" | "csharp">("sql");

  const variant = VARIANTS.find((v) => v.id === selected)!;

  return (
    <div className="space-y-4">
      {/* Variant selector row */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {VARIANTS.map((v) => {
          const isActive = selected === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setSelected(v.id)}
              className={`rounded-xl border p-3 text-left transition-all ${
                isActive
                  ? "border-amber-500/50 bg-amber-500/8"
                  : "border-border bg-elevated hover:border-border/80 hover:bg-elevated/80"
              }`}
            >
              <div className={`text-[11px] font-semibold font-mono mb-1 ${isActive ? "text-amber-400" : v.color}`}>
                {v.label}
              </div>
              <div className="flex items-end gap-2">
                <span className={`text-lg font-bold font-mono ${isActive ? "text-amber-400" : v.color}`}>
                  {v.execMs}
                </span>
                <span className="text-[10px] text-text-secondary mb-0.5">ms</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Metrics panel */}
        <Panel title="Performance Metrics" accentColor="#f59e0b">
          <div className="space-y-5">
            <p className="text-xs text-text-secondary leading-relaxed">{variant.description}</p>

            {/* Exec time bars — all variants compared */}
            <div className="space-y-3">
              {VARIANTS.map((v) => (
                <div key={v.id}>
                  <div className="flex justify-between text-[11px] font-mono mb-1">
                    <span
                      className={`${selected === v.id ? "text-amber-400 font-semibold" : "text-text-secondary"}`}
                    >
                      {v.label}
                    </span>
                    <span className={v.color}>{v.execMs} ms</span>
                  </div>
                  <div className="h-2 rounded-full bg-background/60 overflow-hidden border border-border/30 relative">
                    <motion.div
                      className={`h-full rounded-full ${v.barColor} ${
                        selected === v.id ? "opacity-100" : "opacity-40"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(3, (v.execMs / MAX_MS) * 100)}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Selected variant detail metrics */}
            <div className="pt-3 border-t border-border/40 space-y-3">
              <MetricBar
                value={variant.rowsLoaded}
                max={MAX_ROWS}
                color="text-sky-400"
                label="Rows transferred"
                unit="rows"
              />
              <MetricBar
                value={variant.allocKb}
                max={MAX_KB}
                color="text-violet-400"
                label="Allocations"
                unit="KB"
              />
            </div>
          </div>
        </Panel>

        {/* Code panel */}
        <Panel title="Generated SQL / C# Code" accentColor="#06B6D4">
          {/* Tab toggle */}
          <div className="flex items-center gap-1 mb-3 p-0.5 rounded-lg bg-background/40 border border-border w-fit">
            {(["sql", "csharp"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
                  activeTab === tab
                    ? "bg-elevated text-text-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab === "sql" ? "SQL" : "C#"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.pre
              key={`${selected}-${activeTab}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="text-[11px] font-mono leading-relaxed overflow-auto max-h-[340px] text-text-secondary/90 whitespace-pre-wrap scrollbar-thin scrollbar-thumb-border"
            >
              {activeTab === "sql" ? variant.sql : variant.csharp}
            </motion.pre>
          </AnimatePresence>
        </Panel>
      </div>

      {/* Insight callout */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 col-span-1">
            <p className="text-[11px] font-mono text-red-400 font-semibold mb-1">Naive vs Projected</p>
            <p className="text-[11px] text-text-secondary">
              Projected DTO reduces exec time by{" "}
              <span className="text-red-400 font-bold">
                {Math.round(((420 - 38) / 420) * 100)}%
              </span>{" "}
              and allocations by{" "}
              <span className="text-red-400 font-bold">
                {Math.round(((8200 - 310) / 8200) * 100)}%
              </span>
              . Same SQL Server, same data, just fewer columns.
            </p>
          </div>
          <div className="p-3 rounded-xl border border-violet-500/20 bg-violet-500/5 col-span-1">
            <p className="text-[11px] font-mono text-violet-400 font-semibold mb-1">Compiled Query Benefit</p>
            <p className="text-[11px] text-text-secondary">
              EF.CompileAsyncQuery() saves ~8ms per call in expression tree translation.
              At 1,000 RPS that's{" "}
              <span className="text-violet-400 font-bold">8 CPU-seconds/sec</span> freed.
              Critical for Lambda cold starts.
            </p>
          </div>
          <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 col-span-1">
            <p className="text-[11px] font-mono text-amber-400 font-semibold mb-1">Split Query Trade-off</p>
            <p className="text-[11px] text-text-secondary">
              AsSplitQuery fires 3 round-trips instead of 1, but reduces row transfer from{" "}
              <span className="text-amber-400 font-bold">60,000 → 1,150 rows</span> when
              multiple Includes create a cartesian product.
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
