"use client";

import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";
import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";

const RawSqlVisualizer = dynamic(
  () => import("./RawSqlVisualizer"),
  { ssr: false, loading: () => <VisualizerSkeleton /> }
);

const CODE_EXAMPLE = `// EF Core 9 — Raw SQL, Stored Procedures, Dapper

// FromSqlRaw — materialized to tracked entities
// ✅ Safe: SQL is fixed, params are parameterized
var orders = await _dbContext.Orders
    .FromSqlRaw(
        "SELECT * FROM Orders WHERE CustomerId = {0} AND Status = {1}",
        customerId, "Pending")
    .Include(o => o.Items)  // Can chain Include() after FromSqlRaw!
    .AsNoTracking()
    .ToListAsync(ct);

// FromSqlInterpolated — SAFE interpolation via FormattableString
// EF extracts interpolated values as SQL parameters automatically
var minAmount = 100m;
var orders = await _dbContext.Orders
    .FromSqlInterpolated(
        $"SELECT * FROM Orders WHERE TotalAmount > {minAmount} AND Status = {'Pending'}")
    .AsNoTracking()
    .ToListAsync(ct);

// ❌ SQL INJECTION — NEVER do this with FromSqlRaw:
var status = Request.Query["status"];  // untrusted user input
var orders = await _dbContext.Orders
    .FromSqlRaw($"SELECT * FROM Orders WHERE Status = '{status}'")  // ← INJECTION
    .ToListAsync(ct);
// If status = "'; DROP TABLE Orders; --" you've lost your data

// ExecuteSqlRaw — for non-query SQL (UPDATE, DELETE, INSERT)
// EF Core 7+ bulk update via ExecuteUpdate (preferred over ExecuteSqlRaw for simple cases)
var rowsAffected = await _dbContext.Orders
    .Where(o => o.Status == "Abandoned" && o.PlacedAt < DateTime.UtcNow.AddDays(-30))
    .ExecuteUpdateAsync(set => set
        .SetProperty(o => o.Status, "Archived")
        .SetProperty(o => o.ArchivedAt, DateTime.UtcNow), ct);
// Single UPDATE statement — no entity loading, no change tracker
// ⚠ Bypasses concurrency tokens — [Timestamp] NOT checked

// ExecuteSqlRaw — raw UPDATE for complex expressions
var affected = await _dbContext.Database.ExecuteSqlRawAsync(
    "UPDATE Orders SET TotalAmount = TotalAmount * {0} WHERE CustomerId = {1}",
    discountFactor, customerId, ct);

// Window function — LINQ can't express this, use FromSqlRaw
var ranked = await _dbContext.Database
    .SqlQueryRaw<CustomerRankDto>(
        @"SELECT c.Id, c.Name,
               SUM(o.TotalAmount) AS LifetimeValue,
               ROW_NUMBER() OVER (ORDER BY SUM(o.TotalAmount) DESC) AS Rank
          FROM Customers c
          JOIN Orders o ON o.CustomerId = c.Id
         GROUP BY c.Id, c.Name")
    .ToListAsync(ct);
// SqlQueryRaw<T> (EF Core 8+) — for arbitrary result shapes, not entity types

// Stored procedure — output parameter
var outputParam = new SqlParameter("@TotalOrders", SqlDbType.Int) { Direction = ParameterDirection.Output };
await _dbContext.Database.ExecuteSqlRawAsync(
    "EXEC GetCustomerStats @CustomerId = {0}, @TotalOrders = @TotalOrders OUTPUT",
    customerId, outputParam);
var total = (int)outputParam.Value;

// Dapper alongside EF — shared connection
using var connection = _dbContext.Database.GetDbConnection();
if (connection.State != ConnectionState.Open)
    await connection.OpenAsync(ct);

var results = await connection.QueryAsync<CustomerSummary>(
    @"SELECT c.Id, c.Name, COUNT(o.Id) AS OrderCount
        FROM Customers c
        LEFT JOIN Orders o ON o.CustomerId = c.Id
       GROUP BY c.Id, c.Name
       ORDER BY OrderCount DESC
       OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY",
    new { offset = (page - 1) * pageSize, pageSize });
// Dapper uses EF's connection — same transaction scope if wrapped in BeginTransaction()`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "FromSqlRaw vs FromSqlInterpolated — The Safety Difference",
    body: "FromSqlRaw takes a plain string — SQL injection is your responsibility. If you pass a string literal it's safe. If you interpolate user input into it (via $\"\"), it's an injection vector. FromSqlInterpolated takes a FormattableString and EF extracts interpolated values as SQL parameters automatically. Use FromSqlInterpolated whenever you have dynamic values. Never use string concatenation or $\"\" with FromSqlRaw.",
  },
  {
    title: "FromSqlRaw — How Results Are Materialized",
    body: "FromSqlRaw returns IQueryable<TEntity> backed by the raw SQL. EF materializes results by matching column names in the result set to entity property names (by convention). The entities enter the change tracker just like normal queries. You can chain .Include(), .Where(), .OrderBy() after FromSqlRaw — EF wraps your SQL in a CTE and adds the LINQ clauses on top.",
  },
  {
    title: "ExecuteUpdate / ExecuteDelete — EF Core 7+ Bulk Operations",
    body: "ExecuteUpdateAsync and ExecuteDeleteAsync translate to a single UPDATE or DELETE SQL statement without loading entities into memory. Zero change tracker overhead. But they bypass all EF-level checks: concurrency tokens ([Timestamp]) are NOT evaluated, interceptors may or may not fire (depends on implementation), and SaveChanges events don't fire.",
  },
  {
    title: "SqlQueryRaw<T> — Arbitrary Result Shapes (EF Core 8+)",
    body: "Database.SqlQueryRaw<T>() lets you execute raw SQL and materialize results into any type T — not just entity types. T can be a DTO, a record, or even a primitive. Column names in the result set must match property names in T. Results are not tracked. Useful for window functions, CTEs, aggregations that don't map to entity shapes.",
  },
  {
    title: "Stored Procedures and Output Parameters",
    body: "EF can execute stored procedures via ExecuteSqlRaw() or FromSqlRaw(). Output parameters require SqlParameter with Direction = ParameterDirection.Output, passed directly to ExecuteSqlRawAsync. Stored procedures with multiple result sets (EXEC sp_GetCustomerWithOrders) are not supported by FromSqlRaw — use Dapper or ADO.NET directly for multi-result-set procedures.",
  },
  {
    title: "Dapper Alongside EF — Shared Connection",
    body: "Dapper and EF Core can share the same DbConnection, obtained via _dbContext.Database.GetDbConnection(). If you have an ambient transaction (opened with _dbContext.Database.BeginTransaction()), Dapper queries on the same connection participate in it automatically. This lets you use Dapper for complex read queries while EF handles writes — without managing separate connections.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "FromSqlRaw()",
    definition:
      "Executes raw SQL and materializes results as tracked entity instances. The SQL must return all columns of the entity (or EF throws). Can be composed with LINQ operators — EF wraps the SQL in a CTE. Safe only with string literals or parameterized values, never with string interpolation of user input.",
    icon: "📝",
  },
  {
    term: "FromSqlInterpolated()",
    definition:
      "Like FromSqlRaw but accepts a FormattableString ($\"...\"). EF automatically extracts interpolated values as parameterized SQL arguments, preventing SQL injection. Equivalent to FromSqlRaw with explicit parameters but with safer syntax. Prefer over FromSqlRaw for any dynamic values.",
    icon: "🛡",
  },
  {
    term: "ExecuteUpdateAsync()",
    definition:
      "EF Core 7+. Translates a LINQ Where + SetProperty chain to a single UPDATE statement. No entity loading, no change tracker. Runs immediately — does not wait for SaveChanges(). Bypasses concurrency tokens. Returns int (rows affected).",
    icon: "✏",
  },
  {
    term: "ExecuteDeleteAsync()",
    definition:
      "EF Core 7+. Translates a LINQ Where to a single DELETE statement. No entity loading. Does not fire SaveChanges events. Bypasses soft-delete global query filters unless you explicitly apply them. Bypasses concurrency tokens.",
    icon: "🗑",
  },
  {
    term: "SqlQueryRaw<T>()",
    definition:
      "EF Core 8+. Available on DbContext.Database. Executes raw SQL and materializes results into any type T — not just entity types. Useful for aggregations, window functions, CTEs. T properties must match result column names. Results are never change-tracked.",
    icon: "🔧",
  },
  {
    term: "Dapper",
    definition:
      "Lightweight micro-ORM by StackExchange. Executes raw SQL and maps results to typed objects via reflection. Can share EF's DbConnection and transaction. Ideal for complex reads (window functions, CTEs, stored procs with multiple result sets) that are difficult or impossible to express in LINQ.",
    icon: "⚡",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "Window Function for Customer Ranking — LINQ Couldn't Express It",
    scenario:
      "Our customer success team needed a leaderboard: top customers by lifetime value with their rank, quartile, and delta vs previous month — updated daily via a background job. We tried writing this in LINQ for three days. EF kept generating incorrect GROUP BY clauses and couldn't express ROW_NUMBER() OVER() or NTILE(4) at all.",
    problem:
      "LINQ's GroupBy has limited SQL translation in EF Core. Window functions (ROW_NUMBER, NTILE, LAG, LEAD, SUM OVER PARTITION BY) have no LINQ equivalents. The closest approach — loading all customers and computing ranks in C# — would have loaded 250,000 rows into memory for a job that ran on a 4MB Lambda function.",
    solution:
      "Used Database.SqlQueryRaw<CustomerRankDto>() with a CTE that computed lifetime value, ROW_NUMBER() OVER (ORDER BY LifetimeValue DESC), and NTILE(4) OVER (...) in a single SQL query. The query ran in 180ms returning 250 rows (top-250 only). The lambda's memory usage stayed under 80MB. The LINQ equivalent (load all, compute in C#) would have been 4GB+.",
    takeaway:
      "Window functions, recursive CTEs, and PIVOT/UNPIVOT are legitimate reasons to escape LINQ. Use Database.SqlQueryRaw<T>() (EF Core 8+) for these cases — you get type-safe results without the overhead of loading full entities.",
  },
  {
    title: "ExecuteUpdate Replaced 45-Second Batch Job with 200ms SQL",
    scenario:
      "A nightly job archived abandoned orders (status=Abandoned, older than 30 days) by loading them with .ToListAsync(), iterating each, setting status = Archived, and calling SaveChangesAsync(). In dev (500 orders) it ran in 8 seconds. In production (180,000 abandoned orders), it timed out at 45 minutes, consumed 6GB of memory, and held thousands of SQL connections.",
    problem:
      "The job loaded 180,000 full Order entities into memory (with change tracking), mutated each one, then called SaveChanges which generated 180,000 individual UPDATE statements. Each UPDATE was a round-trip. The change tracker's snapshot comparison ran on every entity. The SQL Server connection pool was exhausted within 3 minutes.",
    solution:
      "Replaced the entire job with: await _dbContext.Orders.Where(o => o.Status == \"Abandoned\" && o.PlacedAt < cutoff).ExecuteUpdateAsync(set => set.SetProperty(o => o.Status, \"Archived\").SetProperty(o => o.ArchivedAt, DateTime.UtcNow)); — a single UPDATE statement. Ran in 200ms, zero memory allocation for entities, one SQL round-trip.",
    takeaway:
      "ExecuteUpdate/ExecuteDelete (EF Core 7+) is the correct tool for bulk mutations. Never load entities into memory just to mutate them in a loop — that's an O(N) entity load + N round-trips. One SQL statement handles any N. Just remember: it bypasses concurrency tokens and EF-level interceptors.",
  },
  {
    title: "SQL Injection via FromSqlRaw String Interpolation in a Search Endpoint",
    scenario:
      "A security audit flagged a product search endpoint. The developer had written: FromSqlRaw($\"SELECT * FROM Products WHERE Name LIKE '%{searchTerm}%'\"). The searchTerm came from a query parameter, URL-decoded but not sanitized. Our penetration tester passed: '; SELECT * FROM Customers; --",
    problem:
      "The $\"\" syntax in C# creates a string — interpolated before EF ever sees it. By the time FromSqlRaw received the argument, it was a complete SQL string with the injected fragment already embedded. The second SELECT returned the entire Customers table in the result set (EF ignored it, but ADO.NET had executed it). A UNION-based injection would have returned customer data to the caller.",
    solution:
      "Replaced FromSqlRaw($\"...\") with FromSqlInterpolated($\"...\"). Identical syntax, completely different behavior — EF extracts the interpolated values as SqlParameter objects. Alternatively: FromSqlRaw(\"SELECT * FROM Products WHERE Name LIKE {0}\", $\"%{searchTerm}%\") with explicit parameter. Added a Roslyn analyzer to the repo that flags FromSqlRaw with string interpolation.",
    takeaway:
      "The most dangerous EF Core footgun: FromSqlRaw with $\"\" string interpolation looks safe because $\"\" looks like parameterization in other frameworks. It is not. FromSqlInterpolated is the safe version. Add a code review checklist item and IDE rule to never use $\"\" with FromSqlRaw.",
  },
];

export default function RawSqlPage() {
  return (
    <MotionFade>
      <Section
        title="Raw SQL & Stored Procedures"
        subtitle="When to escape the LINQ abstraction — and how FromSqlRaw, ExecuteSqlRaw, and Dapper complement EF Core."
      >
        <RawSqlVisualizer />
        <ConceptExplainer
          overview="EF Core's LINQ translation covers 90% of database operations cleanly. The remaining 10% — window functions, complex aggregations, bulk mutations, stored procedures with output parameters, and arbitrary CTEs — are better served by raw SQL. EF Core 8/9 provides excellent raw SQL APIs that keep results type-safe and integrated with the change tracker when needed. The key rules: always use parameterized queries (FromSqlInterpolated or explicit parameters), understand what bypasses the change tracker and concurrency tokens, and know when to reach for Dapper on the same connection."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{
            label: "EF Core 9 — FromSqlRaw, ExecuteUpdate, SqlQueryRaw, Dapper",
            code: CODE_EXAMPLE,
          }}
          whyItMatters="Raw SQL in EF Core is not a smell — it's a tool for when the abstraction leaks. Window functions and bulk mutations are the most common cases. The critical discipline is: never concatenate user input into SQL strings, understand what bypasses EF's safety nets (concurrency tokens, global query filters, SaveChanges interceptors), and use Dapper on EF's shared connection rather than opening a second connection."
          pitfalls={[
            "FromSqlRaw($\"...{userInput}...\") — C# string interpolation produces a plain string before EF sees it. The SQL is already injected by the time EF receives the argument. Use FromSqlInterpolated (safe $\"\" interpolation) or explicit {0} parameters with FromSqlRaw. This is the #1 SQL injection vector in EF Core codebases.",
            "ExecuteUpdate and ExecuteDelete bypass concurrency tokens ([Timestamp], [ConcurrencyToken]). If you use optimistic concurrency on an entity type, bulk operations via ExecuteUpdate will not check rowversion and can overwrite rows without conflict detection.",
            "ExecuteUpdate and ExecuteDelete bypass global query filters by default. If you have a soft-delete filter (e.g., .HasQueryFilter(e => !e.IsDeleted)), ExecuteDelete will delete soft-deleted rows too unless you explicitly add the filter condition in your Where() call.",
            "Stored procedures that return multiple result sets (SELECT ... ; SELECT ...) are not supported by FromSqlRaw — EF only reads the first result set. Use Dapper (QueryMultiple) or raw ADO.NET DataReader for multi-result-set procs.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
