"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Panel from "@/app/_ui/Panel";

type ScenarioId = "simple" | "window" | "bulk";
type ViewMode = "linq" | "raw";

interface Scenario {
  id: ScenarioId;
  label: string;
  tagline: string;
  verdict: { linq: "preferred" | "viable" | "avoid"; raw: "preferred" | "viable" | "avoid" };
  linqCode: string;
  linqSql: string;
  linqNotes: string[];
  rawCode: string;
  rawSql: string;
  rawNotes: string[];
  flowSteps: string[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "simple",
    label: "Simple Query",
    tagline: "LINQ wins — readable, type-safe, composable",
    verdict: { linq: "preferred", raw: "avoid" },
    linqCode: `// LINQ — clean, type-safe, composable
var orders = await _dbContext.Orders
    .Where(o => o.CustomerId == customerId
             && o.Status == OrderStatus.Pending)
    .OrderByDescending(o => o.PlacedAt)
    .Select(o => new OrderDto
    {
        Id = o.Id,
        TotalAmount = o.TotalAmount,
        PlacedAt = o.PlacedAt
    })
    .AsNoTracking()
    .TagWith("Orders:GetPendingByCustomer")
    .ToListAsync(ct);`,
    linqSql: `-- EF generates clean, parameterized SQL:
SELECT o.[Id], o.[TotalAmount], o.[PlacedAt]
FROM [Orders] AS o
WHERE o.[CustomerId] = @p0
  AND o.[Status] = @p1
ORDER BY o.[PlacedAt] DESC

-- @p0 = customerId (int)
-- @p1 = 'Pending' (nvarchar)
-- Query tagged: -- Orders:GetPendingByCustomer`,
    linqNotes: [
      "Fully type-safe — refactoring Order.Status renames the query too",
      "Composable — can chain .Skip/.Take for pagination",
      "TagWith() label flows into SQL profiler and Application Insights",
      "AsNoTracking() skips change tracker for read-only result",
    ],
    rawCode: `// Raw SQL — unnecessary complexity for a simple filter
var orders = await _dbContext.Orders
    .FromSqlInterpolated(
        $@"SELECT Id, TotalAmount, PlacedAt
           FROM Orders
           WHERE CustomerId = {customerId}
             AND Status = {'Pending'}
           ORDER BY PlacedAt DESC")
    .AsNoTracking()
    .ToListAsync(ct);

// ❌ More verbose, loses type safety on column names
// ❌ Refactoring Order.PlacedAt → Order.OrderDate breaks silently
// ❌ No compile-time guarantee SELECT matches entity shape`,
    rawSql: `-- SQL is explicit but verbose and fragile
SELECT Id, TotalAmount, PlacedAt
FROM Orders
WHERE CustomerId = @p0
  AND Status = @p1
ORDER BY PlacedAt DESC

-- EF still parameterizes FromSqlInterpolated values ✓
-- But you lose all the LINQ composition benefits`,
    rawNotes: [
      "No benefit over LINQ for this case",
      "Column name typos fail at runtime, not compile time",
      "Cannot chain .Include() without wrapping in a subquery",
      "More code, less maintainability",
    ],
    flowSteps: [
      "LINQ expression tree built",
      "EF walks expression tree",
      "SQL generated with parameters",
      "SQL sent to database",
      "Rows returned",
      "Materialized to DTOs",
    ],
  },
  {
    id: "window",
    label: "Window Function",
    tagline: "Raw SQL wins — LINQ cannot express ROW_NUMBER / PARTITION BY",
    verdict: { linq: "avoid", raw: "preferred" },
    linqCode: `// LINQ attempt — will NOT produce correct SQL
// EF Core 9 cannot translate ROW_NUMBER() OVER()
var ranked = await _dbContext.Customers
    .GroupBy(c => c.Id)
    .Select(g => new
    {
        CustomerId = g.Key,
        LifetimeValue = g.Sum(c => c.Orders.Sum(o => o.TotalAmount)),
        // ❌ No LINQ equivalent for ROW_NUMBER() OVER (ORDER BY ...)
        // ❌ No LINQ equivalent for NTILE(4) OVER (...)
        // ❌ No LINQ equivalent for LAG() / LEAD()
    })
    .ToListAsync(ct);

// EF will either throw a translation error
// or produce an incorrect query that computes rank in C#
// after loading all rows — 250,000 customers into memory`,
    linqSql: `-- What EF might attempt (incorrect / very slow):
SELECT c.[Id],
       (SELECT COALESCE(SUM(o.[TotalAmount]), 0)
        FROM [Orders] AS o
        WHERE c.[Id] = o.[CustomerId]) AS [LifetimeValue]
FROM [Customers] AS c

-- Then rank computed IN C# by sorting 250k rows
-- No window function in generated SQL
-- 250,000 rows loaded to application server
-- MemoryOverflowException or 45-second timeout`,
    rawCode: `// Raw SQL with window functions — the right tool
var ranked = await _dbContext.Database
    .SqlQueryRaw<CustomerRankDto>(
        @"WITH CustomerValues AS (
            SELECT c.Id, c.Name,
                   SUM(o.TotalAmount) AS LifetimeValue
            FROM Customers c
            LEFT JOIN Orders o ON o.CustomerId = c.Id
            GROUP BY c.Id, c.Name
          )
          SELECT Id, Name, LifetimeValue,
                 ROW_NUMBER() OVER (ORDER BY LifetimeValue DESC) AS Rank,
                 NTILE(4) OVER (ORDER BY LifetimeValue DESC) AS Quartile
          FROM CustomerValues")
    .ToListAsync(ct);

// SqlQueryRaw<T> (EF Core 8+) — works for any type T
// T properties must match result set column names`,
    rawSql: `-- CTE + window functions — exactly what the DB optimizer wants
WITH CustomerValues AS (
    SELECT c.Id, c.Name,
           SUM(o.TotalAmount) AS LifetimeValue
    FROM   Customers c
    LEFT   JOIN Orders o ON o.CustomerId = c.Id
    GROUP  BY c.Id, c.Name
)
SELECT Id, Name, LifetimeValue,
       ROW_NUMBER() OVER (ORDER BY LifetimeValue DESC) AS Rank,
       NTILE(4)     OVER (ORDER BY LifetimeValue DESC) AS Quartile
FROM CustomerValues
ORDER BY Rank

-- DB computes rank in one pass (no C# sorting)
-- 250 rows returned (top 250 only if you add TOP 250)
-- Query plan: Stream Aggregate → Window Spool → Sort`,
    rawNotes: [
      "Window functions computed on DB server — not in C#",
      "Single SQL round-trip regardless of customer count",
      "SqlQueryRaw<CustomerRankDto> maps columns to DTO by name",
      "Results not change-tracked (DTOs, not entities)",
    ],
    flowSteps: [
      "Raw SQL string defined",
      "SqlQueryRaw<T>() called",
      "SQL sent directly to DB",
      "DB executes CTE + window functions",
      "Result rows returned",
      "EF maps columns → CustomerRankDto by name",
    ],
  },
  {
    id: "bulk",
    label: "Bulk Operation",
    tagline: "ExecuteUpdate wins — LINQ updates one entity at a time",
    verdict: { linq: "avoid", raw: "preferred" },
    linqCode: `// ❌ LINQ entity-by-entity update — never do this for bulk
var abandonedOrders = await _dbContext.Orders
    .Where(o => o.Status == "Abandoned"
             && o.PlacedAt < DateTime.UtcNow.AddDays(-30))
    .ToListAsync(ct);  // ← loads 180,000 entities into memory

foreach (var order in abandonedOrders)
{
    order.Status = "Archived";      // mutate entity
    order.ArchivedAt = DateTime.UtcNow;
}

await _dbContext.SaveChangesAsync(ct);
// EF generates 180,000 individual UPDATE statements
// 180,000 SQL round-trips
// 6GB memory for entity objects + change tracker snapshots`,
    linqSql: `-- EF generates one UPDATE per entity:
UPDATE [Orders] SET [Status] = @p0, [ArchivedAt] = @p1
WHERE [Id] = @p2
AND [RowVersion] = @p3  -- (if using concurrency tokens)

-- ...repeated 180,000 times
-- Each is a separate round-trip
-- Connection pool exhausted after ~1,000 in-flight
-- Batch size default: 42 (EF groups them in batches)
-- 180,000 / 42 = 4,286 batches = 4,286 round-trips`,
    rawCode: `// ✅ ExecuteUpdateAsync — single SQL statement
var archivedCount = await _dbContext.Orders
    .Where(o => o.Status == "Abandoned"
             && o.PlacedAt < DateTime.UtcNow.AddDays(-30))
    .ExecuteUpdateAsync(set => set
        .SetProperty(o => o.Status, "Archived")
        .SetProperty(o => o.ArchivedAt, DateTime.UtcNow),
        ct);

// Or for complex expressions not expressible in SetProperty:
await _dbContext.Database.ExecuteSqlRawAsync(
    @"UPDATE Orders
      SET Status = 'Archived', ArchivedAt = GETUTCDATE()
      WHERE Status = 'Abandoned'
        AND PlacedAt < DATEADD(day, -30, GETUTCDATE())", ct);`,
    rawSql: `-- Single UPDATE statement for all matching rows:
UPDATE [o]
SET    [o].[Status]     = N'Archived',
       [o].[ArchivedAt] = @p0
FROM   [Orders] AS [o]
WHERE  [o].[Status] = N'Abandoned'
  AND  [o].[PlacedAt] < @p1

-- 1 round-trip for any N rows
-- @p0 = DateTime.UtcNow
-- @p1 = cutoff date

-- ⚠ Note: RowVersion NOT checked (bypasses concurrency)
-- ⚠ Note: Global query filters NOT applied
-- ⚠ Note: SaveChanges interceptors NOT fired`,
    rawNotes: [
      "One SQL statement for 180,000 rows",
      "Zero entity allocations — no change tracker",
      "Runs in 200ms vs 45 minutes for entity loop",
      "Bypasses concurrency tokens — intentional for batch jobs",
    ],
    flowSteps: [
      "ExecuteUpdateAsync() called",
      "LINQ Where translated to WHERE clause",
      "SetProperty calls translated to SET clause",
      "Single UPDATE sent to DB",
      "rowsAffected count returned",
      "No SaveChanges, no entities loaded",
    ],
  },
];

const VERDICT_STYLES = {
  preferred: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  viable: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  avoid: "bg-red-500/10 text-red-400/70 border border-red-500/20",
};

const VERDICT_LABELS = {
  preferred: "✓ Preferred",
  viable: "~ Viable",
  avoid: "✗ Avoid",
};

export default function RawSqlVisualizer() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("simple");
  const [view, setView] = useState<ViewMode>("linq");
  const [sqlTab, setSqlTab] = useState<"code" | "sql">("code");

  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!;
  const activeCode = view === "linq" ? scenario.linqCode : scenario.rawCode;
  const activeSql = view === "linq" ? scenario.linqSql : scenario.rawSql;
  const activeNotes = view === "linq" ? scenario.linqNotes : scenario.rawNotes;
  const verdict = view === "linq" ? scenario.verdict.linq : scenario.verdict.raw;

  return (
    <div className="space-y-4">
      {/* Scenario tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => { setScenarioId(s.id); setView("linq"); setSqlTab("code"); }}
            className={`px-4 py-2 rounded-xl border text-sm font-mono transition-all ${
              scenarioId === s.id
                ? "border-amber-500/50 text-amber-400"
                : "border-border bg-elevated text-text-secondary hover:text-text-primary"
            }`}
            style={scenarioId === s.id ? { backgroundColor: "rgba(245,158,11,0.08)" } : undefined}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Tagline */}
      <AnimatePresence mode="wait">
        <motion.div
          key={scenarioId}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="p-3 rounded-xl border border-border bg-elevated/50 flex items-center gap-3"
        >
          <span className="text-lg">
            {scenarioId === "simple" ? "💡" : scenarioId === "window" ? "📊" : "⚡"}
          </span>
          <p className="text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">{scenario.label}: </span>
            {scenario.tagline}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* LINQ vs Raw toggle + verdict */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-elevated border border-border">
          {(["linq", "raw"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-md text-sm font-mono transition-all ${
                view === v
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {v === "linq" ? "LINQ" : "Raw SQL"}
            </button>
          ))}
        </div>

        <span
          className={`text-[11px] font-mono font-bold px-3 py-1 rounded-full ${VERDICT_STYLES[verdict]}`}
        >
          {VERDICT_LABELS[verdict]}
        </span>

        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-background/40 border border-border ml-auto">
          {(["code", "sql"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSqlTab(tab)}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
                sqlTab === tab
                  ? "bg-elevated text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab === "code" ? "C#" : "Generated SQL"}
            </button>
          ))}
        </div>
      </div>

      {/* Code display */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <Panel
            title={sqlTab === "code" ? (view === "linq" ? "LINQ / C#" : "Raw SQL / C#") : "Generated SQL"}
            accentColor={view === "linq" ? "#06B6D4" : "#f59e0b"}
          >
            <AnimatePresence mode="wait">
              <motion.pre
                key={`${scenarioId}-${view}-${sqlTab}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[11px] font-mono leading-relaxed overflow-auto max-h-[380px] text-text-secondary/90 whitespace-pre-wrap scrollbar-thin scrollbar-thumb-border"
              >
                {sqlTab === "code" ? activeCode : activeSql}
              </motion.pre>
            </AnimatePresence>
          </Panel>
        </div>

        {/* Notes + execution flow */}
        <div className="space-y-3">
          {/* Notes */}
          <Panel title="Analysis" accentColor={verdict === "preferred" ? "#10B981" : verdict === "avoid" ? "#EF4444" : "#f59e0b"}>
            <div className="space-y-2">
              {activeNotes.map((note, i) => (
                <div key={i} className="flex gap-2 text-[11px] text-text-secondary">
                  <span
                    className={
                      verdict === "preferred"
                        ? "text-emerald-400"
                        : verdict === "avoid"
                        ? "text-red-400"
                        : "text-amber-400"
                    }
                  >
                    {verdict === "preferred" ? "✓" : verdict === "avoid" ? "✗" : "~"}
                  </span>
                  <span className="leading-relaxed">{note}</span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Execution flow */}
          <Panel title="Execution Flow" accentColor="#A855F7">
            <div className="space-y-1.5">
              {scenario.flowSteps.map((step, i) => (
                <motion.div
                  key={`${scenarioId}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-2 text-[11px] font-mono"
                >
                  <div className="w-5 h-5 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-[9px] font-bold text-accent shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-text-secondary">{step}</span>
                </motion.div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Quick reference strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
        {[
          { label: "FromSqlRaw()", note: "Fixed SQL + explicit params", safe: true },
          { label: "FromSqlInterpolated()", note: "C# $\"\" → SQL params auto", safe: true },
          { label: "ExecuteUpdateAsync()", note: "Bulk UPDATE, bypasses rowversion", safe: null },
          { label: "SqlQueryRaw<T>()", note: "Any type, not just entities (EF8+)", safe: true },
        ].map((api) => (
          <div
            key={api.label}
            className="p-2.5 rounded-lg border border-border bg-elevated/50"
          >
            <div className="font-mono font-semibold text-text-primary mb-0.5">{api.label}</div>
            <div className="text-text-secondary/70">{api.note}</div>
            {api.safe === true && (
              <div className="mt-1 text-emerald-400/80 text-[10px]">✓ SQL injection safe</div>
            )}
            {api.safe === null && (
              <div className="mt-1 text-amber-400/80 text-[10px]">⚠ bypasses EF safety nets</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
