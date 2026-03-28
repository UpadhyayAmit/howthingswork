"use client";

import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";
import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";

const QueryPerformanceVisualizer = dynamic(
  () => import("./QueryPerformanceVisualizer"),
  { ssr: false, loading: () => <VisualizerSkeleton /> }
);

const CODE_EXAMPLE = `// EF Core 9 — Query Performance Patterns

// ❌ Naive: loads full entity, all columns, change-tracked
var orders = await _dbContext.Orders
    .Include(o => o.Customer)
    .Include(o => o.Items)
    .ToListAsync();
// SELECT * FROM Orders + JOINs — all columns, change-tracked in memory

// ✅ Projected: only what you need, no tracking
var orders = await _dbContext.Orders
    .Where(o => o.Status == OrderStatus.Pending)
    .Select(o => new OrderSummaryDto
    {
        Id = o.Id,
        CustomerName = o.Customer.Name,
        TotalAmount = o.TotalAmount,
        ItemCount = o.Items.Count()
    })
    .AsNoTracking()
    .ToListAsync(cancellationToken);
// SELECT o.Id, c.Name, o.TotalAmount, COUNT(i.Id)
// FROM Orders o JOIN Customers c ... LEFT JOIN OrderItems i ...
// No change tracker overhead — projected DTOs aren't tracked

// ✅ Compiled query: one-time expression tree compilation
// Define ONCE at class/static level (not inside a method!)
private static readonly Func<AppDbContext, int, Task<Order?>> GetOrderById =
    EF.CompileAsyncQuery((AppDbContext ctx, int id) =>
        ctx.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .FirstOrDefault(o => o.Id == id));

// Call at runtime — zero LINQ compilation cost
var order = await GetOrderById(_dbContext, orderId);

// ✅ Split query: avoids cartesian explosion on multi-Include
var order = await _dbContext.Orders
    .Include(o => o.Items)
    .Include(o => o.Tags)        // 2nd collection Include = cartesian product!
    .AsSplitQuery()              // EF fires 3 separate queries instead
    .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);

// ✅ TagWith: label queries in profiler/slow query logs
var orders = await _dbContext.Orders
    .TagWith("OrderDashboard:GetRecentOrders")
    .Where(o => o.PlacedAt > DateTime.UtcNow.AddDays(-7))
    .AsNoTracking()
    .ToListAsync(cancellationToken);
// SQL comment: -- OrderDashboard:GetRecentOrders
// Shows up in SQL Server Profiler, Application Insights, pg_stat_statements

// ❌ .Contains() footgun: IN clause with thousands of IDs
var ids = Enumerable.Range(1, 10_000).ToList();
var products = await _dbContext.Products
    .Where(p => ids.Contains(p.Id))
    .ToListAsync();
// Generates: WHERE Id IN (1, 2, 3, ... 10000 values)
// SQL Server query plan cache pollution — different plan per call
// Use a temp table join or TVP instead for large sets

// ❌ .ToList() then .Where() — in-memory filtering of full table
var active = _dbContext.Products.ToList()  // loads ALL products
    .Where(p => p.IsActive)                // filters in C#, not SQL
    .ToList();`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "How EF Compiles LINQ to SQL",
    body: "Every time EF executes a LINQ query, it walks the expression tree, translates it to a SQL AST, then serializes it to a SQL string with parameters. This translation has CPU cost — expression tree walking, parameter binding, query cache lookup. For hot paths called thousands of times/second, this overhead is measurable.",
  },
  {
    title: "EF.CompileQuery — Paying the Cost Once",
    body: "EF.CompileAsyncQuery() pre-compiles the expression tree into a query plan delegate. The LINQ-to-SQL translation happens once at startup (or first call), not per request. The result is a typed delegate you call with DbContext + parameters. The compiled query skips expression tree walking on every execution — it jumps straight to SQL parameter binding.",
  },
  {
    title: "AsSplitQuery — Preventing the Cartesian Explosion",
    body: "When you Include() two or more collection navigations (e.g., Order.Items and Order.Tags), EF by default generates a single SQL JOIN that produces a cartesian product row set. 100 items × 50 tags = 5,000 rows on the wire for one order. AsSplitQuery() fires N separate SQL queries (one per Include level) and EF stitches the results together in memory — fewer rows, no duplication.",
  },
  {
    title: "AsNoTracking — Skipping the Change Tracker",
    body: "Every tracked entity is registered in the DbContext change tracker — a dictionary keyed by entity type + PK. On SaveChanges, EF snapshots all tracked entities and diffs them for changes. For read-only queries this is pure overhead. AsNoTracking() skips registration entirely. For read-heavy workloads, AsNoTracking() typically reduces allocation by 30-50% per query.",
  },
  {
    title: "Projections — SELECT What You Need",
    body: "Selecting into a DTO with .Select(o => new MyDto { ... }) tells EF to only emit the columns referenced in the projection. No SELECT *. No loading unused columns across the network. And since DTOs are not entity types, they are never change-tracked regardless of whether you use AsNoTracking(). Projections are the single highest-impact optimization for read paths.",
  },
  {
    title: "TagWith — Tracing Queries to Code",
    body: "TagWith(\"label\") prepends a SQL comment to the generated query. This comment flows through to SQL Server Profiler, pg_stat_statements, Application Insights dependency tracking, and slow query logs. When a DBA asks 'what code is generating this expensive query?', TagWith answers it immediately. Use caller member name for automatic tagging.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "EF.CompileQuery()",
    definition:
      "Pre-compiles an EF LINQ query into a reusable delegate. Eliminates per-call expression tree translation. Must be defined as a static field or property — not inside a method — so it's compiled once. Returns Func<DbContext, TParam, TResult> or async variant.",
    icon: "⚡",
  },
  {
    term: "AsSplitQuery()",
    definition:
      "Instructs EF to execute multiple SQL queries (one per Include collection level) instead of a single JOIN that produces cartesian product rows. Results are stitched in memory. Trade-off: multiple round-trips vs data duplication. Use when cartesian product would return 10x+ rows.",
    icon: "✂",
  },
  {
    term: "AsNoTracking()",
    definition:
      "Disables change tracking for entities returned by the query. They are not registered in the DbContext identity map. Reduces memory allocation (no snapshot), CPU (no diff on SaveChanges), and improves throughput on read-only paths. Entities loaded with AsNoTracking cannot be saved back via SaveChanges without re-attaching.",
    icon: "🚀",
  },
  {
    term: "TagWith()",
    definition:
      "Adds a -- comment to the generated SQL query. The comment appears in profiler, slow query logs, and Application Insights. Use [CallerMemberName] attribute for automatic method-name tagging. Costs nothing at runtime — the comment is part of the SQL string.",
    icon: "🏷",
  },
  {
    term: "Global Query Filters",
    definition:
      "Applied in OnModelCreating with .HasQueryFilter(e => e.TenantId == _tenantId). EF appends the filter to every query on that entity type automatically. Used for soft deletes (IsDeleted == false) and multi-tenancy. Can be bypassed per-query with .IgnoreQueryFilters().",
    icon: "🔍",
  },
  {
    term: "Compiled Models",
    definition:
      "EF Core 6+ feature (dotnet ef dbcontext optimize). Pre-generates the entire model as C# source code — entity types, relationships, column mappings. Eliminates model-building cost at startup. Critical for Lambda/serverless deployments where cold starts matter.",
    icon: "📦",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "SELECT * Loaded 4MB Per API Request",
    scenario:
      "Our product listing API was p99 = 800ms at 1000 RPS. SQL Server showed the queries were fast (20ms). The issue was application-side. Each API request loaded full Product entities with .Include(p => p.Images).Include(p => p.Attributes). Product records had Description columns holding rich-text HTML up to 50KB. We were loading 80 products per page = 4MB of entity data per request.",
    problem:
      "Every product query used the repository base class which always returned IQueryable<Product> — full entity. No one had ever added a projection because 'the repository handles fetching'. The product list endpoint only needed 6 fields (Id, Name, Price, Slug, ThumbnailUrl, InStock) but was loading 40+ columns including large text fields, then GC'ing 4MB per request.",
    solution:
      "Added a .Select(p => new ProductListItemDto { ... }) projection for the list endpoint. Added AsNoTracking() to all read-only repository methods. p99 dropped from 800ms to 45ms. Memory allocations per request dropped 95%. The fix was 12 lines of code.",
    takeaway:
      "A repository pattern that always returns full entities is an anti-pattern for read paths. Query your data for the shape you need, not for the entity shape EF mapped. Projections with AsNoTracking() on list endpoints are table-stakes.",
  },
  {
    title: "Cartesian Explosion Brought Down the Orders Dashboard",
    scenario:
      "Our order management dashboard loaded the top 50 orders with their line items, tags, and fulfilment events. In staging (200 orders) it was fast. In production (2M orders, 50 per page), the dashboard page timed out at 30 seconds at peak. SQL Server CPU hit 100%. The query in the slow query log was returning 847,000 rows for 50 orders.",
    problem:
      "The query used .Include(o => o.Items).Include(o => o.Tags).Include(o => o.Events). Three collection Includes on 50 orders. SQL Server's execution plan chose a merge join, producing Items × Tags × Events rows per order. Order 1 had 12 items, 8 tags, 15 events = 1,440 rows for a single order. 50 orders × average 1,200 cross-product rows = 60,000 rows on the wire, transferred and materialized to 50 entity objects.",
    solution:
      "Added .AsSplitQuery() to the dashboard query. EF fired 4 separate SQL queries (orders, then items, tags, events) and materialized in memory. Row count per query: 50 + 600 + 400 + 750 = 1,800 total rows instead of 60,000. Dashboard load time: 1.2 seconds. Also added .TagWith(\"Dashboard:OrderGrid\") so the DBA could identify future regressions.",
    takeaway:
      "Any query with 2+ collection Includes can trigger a cartesian explosion. Use AsSplitQuery() for multi-Include queries. The trade-off (multiple round-trips) is almost always preferable to cartesian explosion in production.",
  },
  {
    title: "Compiled Query Cut Lambda Cold Start 60%",
    scenario:
      "Our checkout service ran on Azure Functions with consumption plan. Cold start p99 was 4.2 seconds. Profiling showed 2.1 seconds was EF Core model initialization (OnModelCreating, relationship discovery) and another 800ms was LINQ expression tree compilation for the 8 critical checkout queries that ran on every cold path.",
    problem:
      "Each checkout request re-compiled 8 LINQ expression trees: fetch cart, validate stock, fetch customer, validate coupon, etc. Expression tree compilation involves reflection, expression visitor walks, and SQL parameter extraction. 8 queries × ~100ms each = 800ms per cold start, even before any SQL hit the DB.",
    solution:
      "Ran dotnet ef dbcontext optimize to generate a compiled model (eliminated 2.1s model build cost). Converted the 8 hot-path queries to EF.CompileAsyncQuery() static fields (eliminated 800ms expression compilation). Also added AsNoTracking() to all read-only checkout queries. Cold start dropped from 4.2s to 1.4s. Warm-path p99 dropped from 120ms to 38ms.",
    takeaway:
      "For serverless workloads, use both compiled models (dotnet ef dbcontext optimize) and EF.CompileAsyncQuery() for hot queries. The payoff is orders of magnitude larger than any individual query optimization when cold starts dominate your latency profile.",
  },
];

export default function QueryPerformancePage() {
  return (
    <MotionFade>
      <Section
        title="EF Core Query Performance"
        subtitle="Compiled queries, split queries, and avoiding the SELECT * traps that are quietly destroying your database performance."
      >
        <QueryPerformanceVisualizer />
        <ConceptExplainer
          overview="EF Core translates LINQ expression trees to SQL on every query execution. For most applications this overhead is negligible. But at scale — high RPS APIs, serverless cold starts, queries with multiple Includes — the cost of SELECT *, cartesian join explosion, expression tree recompilation, and change tracker overhead becomes the dominant factor in request latency. The tools to fix this are already in EF Core: projections, AsNoTracking, AsSplitQuery, EF.CompileQuery, and compiled models. Using them consistently on read paths is not premature optimization — it's baseline hygiene."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{
            label: "EF Core 9 — Query Performance Patterns",
            code: CODE_EXAMPLE,
          }}
          whyItMatters="The most impactful query optimization is almost always the same: stop loading data you don't use. Add AsNoTracking() to every read-only query. Project into DTOs instead of loading full entities for list endpoints. Understand when your Includes create a cartesian product. These three patterns alone will eliminate 80% of EF-related performance issues in production."
          pitfalls={[
            ".Contains(largeList) on a List<Guid> or List<int> generates an IN clause with every value in the list. With 1,000+ IDs this creates a query plan cache miss on every call (different parameter count = different SQL = different plan). Use a join against a temp table or TVP for bulk lookups.",
            "Calling .Count() then .Take().ToList() on the same IQueryable executes the query twice. Use SELECT COUNT(*) OVER() window function via raw SQL, or use a library like Sieve that handles pagination in a single query.",
            "Using .Any() instead of .Count() > 0 — EF Core translates .Any() to SELECT TOP 1 or EXISTS, which short-circuits. .Count() > 0 forces a full COUNT(*) scan. Always prefer .Any() for existence checks.",
            "Forgetting to add an index on FK columns. EF does not create indexes on FK columns by default in SQL Server (unlike MySQL/PostgreSQL). Every .Include() that JOINs on an unindexed FK is a table scan. Check your migration output — add .HasIndex() for every FK that will be used in queries.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
