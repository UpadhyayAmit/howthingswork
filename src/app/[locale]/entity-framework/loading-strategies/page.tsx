"use client";

import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";
import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";

const LoadingStrategiesVisualizer = dynamic(() => import("./LoadingStrategiesVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// ✅ Eager loading — 1 query with JOIN (best for known navigations)
var orders = await _dbContext.Orders
    .Include(o => o.Customer)
    .Include(o => o.Items)
        .ThenInclude(i => i.Product)
    .Where(o => o.Status == OrderStatus.Active)
    .ToListAsync(cancellationToken);

// ✅ EF Core 9: AsSplitQuery() for large Include chains
// Avoids cartesian product explosion (Order × Items × Products)
var orders = await _dbContext.Orders
    .AsSplitQuery()     // 3 separate queries instead of 1 monster JOIN
    .Include(o => o.Items)
        .ThenInclude(i => i.Product)
    .ToListAsync(cancellationToken);

// ✅ Explicit loading — controlled, on-demand (best for conditional loads)
var order = await _dbContext.Orders.FindAsync(orderId, cancellationToken);
if (order.NeedsItemDetails)
{
    // Only load items when you actually need them
    await _dbContext.Entry(order)
        .Collection(o => o.Items)
        .LoadAsync(cancellationToken);
}

// ❌ Lazy loading — INVISIBLE N+1 in loops
// Requires: UseLazyLoadingProxies() + virtual navigation properties
foreach (var order in orders)   // 10 orders loaded
{
    // This line fires a SQL query PER ORDER — you can't see it in this code!
    var count = order.Items.Count;  // 10 additional SELECT queries = 11 total
}

// ✅ Fix: project what you need — no navigation loading at all
var summaries = await _dbContext.Orders
    .Select(o => new {
        o.Id,
        ItemCount = o.Items.Count,   // COUNT() subquery — stays server-side
        Total = o.Items.Sum(i => i.Price * i.Quantity)
    })
    .ToListAsync(cancellationToken);`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Eager Loading: Include() Generates a Single JOIN Query",
    body: "When you call .Include(o => o.Items), EF Core adds a LEFT JOIN to the generated SQL and materializes both the order and its items from a single result set. All data arrives in one round-trip. Best when you know upfront which navigations you need.",
  },
  {
    title: "The Cartesian Explosion Problem with Multiple Includes",
    body: "If an Order has 5 Items and 3 Tags, a single query with both .Include(Items) and .Include(Tags) returns 5 × 3 = 15 rows per order — the cartesian product. With 100 orders each having 10 items and 5 tags, that's 5,000 rows for what should be 1,500 entities. AsSplitQuery() splits this into separate queries.",
  },
  {
    title: "Lazy Loading: SQL Fires When You Access a Navigation Property",
    body: "With UseLazyLoadingProxies(), every navigation property access that isn't already loaded fires a new SQL SELECT. If you loop over 100 orders and access .Items on each one, you fire 101 queries. The danger is that the code looks identical to eager-loaded code — the N+1 is completely invisible.",
  },
  {
    title: "Explicit Loading: You Control When Navigations Are Loaded",
    body: "entry.Collection(o => o.Items).LoadAsync() lets you decide exactly when to load a navigation, after the entity is already in memory. Useful for conditional loads — you can check a flag before deciding to load the related collection, or load only filtered subsets using Query().",
  },
  {
    title: "Projection: The Best Strategy for Read-Only Scenarios",
    body: "Instead of loading full entities and navigations, use .Select() to project exactly the columns you need. 'o.Items.Count' in a Select becomes a COUNT() subquery — no navigation loading required. This is often 10x faster than any of the three loading strategies for read-only queries.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  { term: ".Include() / .ThenInclude()", definition: "Eager loading operators. Added to the IQueryable before materialization. EF generates LEFT JOINs or separate queries (AsSplitQuery). Entities are tracked by default.", icon: "🔗" },
  { term: "UseLazyLoadingProxies()", definition: "Opt-in service registration that generates runtime proxy classes. Navigation property access fires SELECT automatically. Requires virtual keyword on all navigation properties.", icon: "🔮" },
  { term: ".Load() / .LoadAsync()", definition: "Explicit loading method on DbContext.Entry(entity).Collection() or .Reference(). Fires a single SELECT for that specific navigation on demand.", icon: "📥" },
  { term: "AsSplitQuery()", definition: "EF Core 5+ operator that splits a multi-Include query into separate SELECT statements. Eliminates cartesian product explosion. Trades 1 round-trip for N round-trips.", icon: "✂️" },
  { term: "Collection.IsLoaded", definition: "Boolean flag on navigation collection entries indicating whether the collection has been loaded from the database. Check before loading to avoid duplicate queries.", icon: "✅" },
  { term: "Filtered Includes", definition: "EF Core 5+: .Include(o => o.Items.Where(i => !i.IsCancelled)).Take(10) — load only a subset of a collection. Avoids loading entire large collections.", icon: "🔍" },
];

const USE_CASES: UseCase[] = [
  {
    title: "Lazy Loading Fired 1,847 Queries on a Single API Request",
    scenario: "Our order dashboard endpoint was taking 12 seconds to respond. SQL Server showed 1,847 separate SELECT statements within a single HTTP request. The application had lazy loading proxies enabled and the endpoint looped over orders.",
    problem: "The Razor view was iterating over a list of orders and accessing order.Customer.Name, order.Items.Count, and order.Items.Sum(i => i.Price) on each order. With lazy loading proxies, each of those property accesses fired a separate SQL query. With 180 orders on the dashboard, that was roughly 1 + 180 + 180 + 180 = 541... but Items was a collection accessed twice, triggering the load twice for the proxy. Some orders had multiple items loading per property. The actual query count was 1,847.",
    solution: "Projected the needed data in a single query: .Select(o => new DashboardDto { Id = o.Id, CustomerName = o.Customer.Name, ItemCount = o.Items.Count, Total = o.Items.Sum(i => i.Price * i.Quantity) }). This generated a single query with COUNT() and SUM() subqueries — down from 1,847 queries to 1 query, from 12 seconds to 80ms.",
    takeaway: "Lazy loading is invisible N+1. The code reads identically to eager-loaded code. If you use lazy loading proxies, every navigation property access in a loop fires a query. Always use projections or eager loading for list/report endpoints.",
  },
  {
    title: "Cartesian Explosion: Include Chains Returning 50k Rows for 500 Orders",
    scenario: "An order export endpoint was working fine until a customer with large orders started using it. Their export of 500 orders was returning correctly but the query was pulling 50,000 rows and timing out. EF Core was returning correct data — but the method to get it was catastrophically wrong.",
    problem: "The query used .Include(o => o.Items).ThenInclude(i => i.Product).Include(o => o.ShippingHistory). Orders had an average of 8 items and 12.5 shipping history entries. The JOIN produced 8 × 12.5 = 100 rows per order. 500 orders × 100 rows = 50,000 rows transferred for 500 orders with 4,000 items and 6,250 history entries. SQL Server was doing the work but the network transfer was massive.",
    solution: "Added AsSplitQuery() to the IQueryable. EF Core now fires 3 separate queries: one for orders, one for items+products (WHERE OrderId IN (...)), one for shipping history. Total rows: 500 + 4,000 + 6,250 = 10,750 — 80% reduction. Query time dropped from 8 seconds to 600ms.",
    takeaway: "Multiple .Include() chains on collections create cartesian products. 3 collections of average size 10 on 1000 rows = 1,000,000 result rows. Use AsSplitQuery() when you have more than one collection Include, or when cardinality is unknown.",
  },
  {
    title: "Include() on AsNoTracking() Detached Entities Missing Collections",
    scenario: "A background job loaded products with AsNoTracking() for a bulk pricing update, then tried to access product.Category.Name for logging. Category was always null even though categories existed in the database and the product had a CategoryId.",
    problem: "The query used AsNoTracking() without Include(): 'await _dbContext.Products.AsNoTracking().ToListAsync()'. Since AsNoTracking() skips the identity map and change tracker, EF cannot lazy-load navigations on detached entities — there's no proxy, no entry, no DbContext attached to them. product.Category was null because it was never loaded.",
    solution: "Either add .Include(p => p.Category) to the original query — even with AsNoTracking() this generates a JOIN and loads the navigation. Or project the needed data: .Select(p => new { p.Id, p.Price, CategoryName = p.Category.Name }).ToList(). Lazy loading requires a tracked entity with a DbContext reference — it never works on AsNoTracking entities.",
    takeaway: "Lazy loading does not work on AsNoTracking entities. There is no proxy, no DbContext reference, and no identity map to trigger a load. Always use .Include() or projection when you need navigations in AsNoTracking queries.",
  },
];

export default function LoadingStrategiesPage() {
  return (
    <MotionFade>
      <Section
        title="Eager, Lazy & Explicit Loading"
        subtitle="Three ways to load related data in EF Core — and why choosing wrong generates N+1 queries that destroy performance."
      >
        <LoadingStrategiesVisualizer />
        <ConceptExplainer
          overview="EF Core gives you three ways to load related entities: Eager loading (.Include) fetches everything in one JOIN query upfront; Lazy loading fires additional queries automatically when you access a navigation property; Explicit loading lets you call .LoadAsync() manually when you need it. The right choice depends on whether you know which navigations you need, how large the collections are, and whether you're in a loop. Getting it wrong — especially lazy loading in a loop — generates N+1 queries that are completely invisible in the code."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Loading strategies — patterns and anti-patterns", code: CODE_EXAMPLE }}
          whyItMatters="N+1 queries are the most common EF Core production performance problem. A dashboard that loads 200 orders and accesses .Items on each one in a loop fires 201 queries — and the code is indistinguishable from a single-query approach when using lazy loading. Understanding when each strategy fires SQL, and how to use projections to avoid loading navigations entirely, is the difference between a 50ms endpoint and a 12-second timeout."
          pitfalls={[
            "Lazy loading in a loop is invisible N+1. Each navigation property access fires a SELECT. With 100 entities in a loop you get 101 queries. The code looks identical to eager-loaded code — only SQL Server Profiler or EF logging reveals the problem.",
            "Multiple .Include() chains on collections create cartesian products. Order with 10 Items and 10 ShippingHistory entries produces 100 rows per order in a single JOIN query. Use AsSplitQuery() when including more than one collection.",
            "AsNoTracking() disables lazy loading entirely — there is no EF proxy on the entity. Navigation properties on AsNoTracking entities will be null unless you explicitly Include() them or project them.",
            "Loading an entire entity graph with .Include() when you only need 2 fields from a related table is an invisible SELECT *. Always project with .Select() for read-only scenarios — skip loading navigations entirely.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
