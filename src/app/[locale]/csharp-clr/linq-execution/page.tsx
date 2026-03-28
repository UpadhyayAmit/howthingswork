"use client";

import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";
import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";

const LinqExecutionVisualizer = dynamic(
  () => import("./LinqExecutionVisualizer"),
  { ssr: false, loading: () => <VisualizerSkeleton /> }
);

const CODE_EXAMPLE = `// The N+1 LINQ trap — compiles fine, kills prod
// ⚠️ this bites everyone eventually

// DON'T do this — enumerates the query INSIDE a foreach
// Each iteration calls GetEnumerator() on _dbContext.Orders.Where(...)
// = 1 SQL query per iteration = N+1 database round-trips
var activeUserIds = _dbContext.Users
    .Where(u => u.IsActive)
    .Select(u => u.Id);  // IQueryable — query not executed yet

foreach (var userId in activeUserIds)  // ← FIRST execution
{
    // ⚠️ This re-executes activeUserIds for EACH order check
    var orderCount = _dbContext.Orders
        .Where(o => o.UserId == userId)
        .Count();  // ← executes a COUNT(*) per userId
    Console.WriteLine($"User {userId}: {orderCount} orders");
}
// Result: 1000 users = 1001 SQL queries. Production DB at 100% CPU.

// CORRECT: materialize once, then operate in-memory
var activeUserIds = _dbContext.Users
    .Where(u => u.IsActive)
    .Select(u => u.Id)
    .ToList();  // ← ONE query, materialized to memory

// Or better — single JOIN query via navigation properties
var userOrderCounts = await _dbContext.Users
    .Where(u => u.IsActive)
    .Select(u => new
    {
        u.Id,
        OrderCount = u.Orders.Count()  // EF translates to subquery in single SQL
    })
    .ToListAsync(cancellationToken);

// The double-enumeration trap — two DB round-trips for one logical operation
var expensiveQuery = _dbContext.Products
    .Where(p => p.IsActive && p.Stock > 0)
    .OrderByDescending(p => p.CreatedAt);

// DON'T do this — each call executes the query independently
var totalCount = expensiveQuery.Count();       // SQL: SELECT COUNT(*)
var firstPage = expensiveQuery.Take(20).ToList(); // SQL: SELECT TOP 20 ...
// Two separate round-trips! Use .ToList() once or use pagination-aware queries.

// CORRECT: single materialization
var (items, total) = await GetPagedAsync(_dbContext.Products
    .Where(p => p.IsActive && p.Stock > 0)
    .OrderByDescending(p => p.CreatedAt),
    page: 1, pageSize: 20, cancellationToken);

// IQueryable vs IEnumerable — the filter-side trap
IQueryable<Product> FilterProducts(IQueryable<Product> source, string? search)
    => source.Where(p => search == null || p.Name.Contains(search));
    // ✓ translates to WHERE Name LIKE '%search%' in SQL

IEnumerable<Product> FilterProductsWrong(IEnumerable<Product> source, string? search)
    => source.Where(p => search == null || p.Name.Contains(search));
    // ✗ loads ALL products into memory FIRST, then filters in C#`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Query Definition vs Query Execution",
    body: "Writing a LINQ query does nothing — it builds a chain of iterator objects (IEnumerable) or an expression tree (IQueryable). Execution only happens when you iterate: foreach, ToList(), Count(), First(), Any(). This is deferred execution. The query pipeline is replayable — calling ToList() twice runs the query twice.",
  },
  {
    title: "IEnumerable<T> — Pull-based Iterator Chain",
    body: "Each LINQ operator (Where, Select, OrderBy) wraps the previous with a new iterator object. When you iterate, each item is pulled through the chain one at a time using yield return. Where<T> calls MoveNext() on the source, filters the item, and yields it if it passes. Nothing is buffered until you materialize.",
  },
  {
    title: "IQueryable<T> — Expression Tree Translation",
    body: "IQueryable builds an expression tree — an in-memory AST representing your LINQ query. When materialized, the query provider (EF Core's DbContext) walks the expression tree and translates it to SQL. This is why server-side filtering works — EF sees the entire expression before any data is fetched.",
  },
  {
    title: "Lazy Evaluation and yield return",
    body: "The C# compiler rewrites yield return methods into state machines (same as async/await). When you call MoveNext(), execution resumes after the last yield. This enables infinite sequences (IEnumerable<int> naturals = ...) and processing sequences that don't fit in memory.",
  },
  {
    title: "Materialization — When Execution Happens",
    body: "Terminal operators force materialization: ToList(), ToArray(), ToDictionary(), Count(), Sum(), First(), Single(), Any(). Foreach also materializes lazily (item by item). After materialization to a List, subsequent operations run in-memory against the list — no more deferred execution.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "Deferred Execution",
    definition:
      "LINQ queries are not executed when defined. Execution is deferred until the sequence is enumerated. The same query object re-executes every time it's iterated — this is why caching the query object (not the result) causes double-execution bugs.",
    icon: "⏳",
  },
  {
    term: "IQueryable<T>",
    definition:
      "Extends IEnumerable<T> with an expression tree (Expression<Func<T,bool>> instead of Func<T,bool>). Allows query providers to translate LINQ to SQL, OData, Cosmos DB queries. Preserving IQueryable through service layers keeps filtering server-side.",
    icon: "🌐",
  },
  {
    term: "Expression Trees",
    definition:
      "In-memory representation of code as data. x => x.Name == 'Alice' as Expression<Func<User,bool>> captures the AST, not a delegate. EF Core walks this tree at execution time to emit a parameterized SQL WHERE clause.",
    icon: "🌲",
  },
  {
    term: "Multiple Enumeration",
    definition:
      "Calling Count(), then ToList() on the same IQueryable executes the query twice — two round-trips. Calling these on an IEnumerable from a file or network stream may fail on the second enumeration or produce different results.",
    icon: "⚠️",
  },
  {
    term: "yield return",
    definition:
      "Compiler-generated state machine that turns an iterator method into a lazy sequence. MoveNext() advances execution to the next yield. Enables infinite sequences, pipeline processing without full materialization, and memory-efficient large dataset processing.",
    icon: "🔄",
  },
  {
    term: "Query Provider",
    definition:
      "The IQueryProvider implementation that translates expression trees to data source queries. EF Core's provider translates to SQL. You can build custom providers for any data source. The provider executes when GetEnumerator() is called.",
    icon: "🔌",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "The N+1 That Took Down the Reporting Service",
    scenario:
      "Our weekly sales report ran fine during development — 50 test orders, completed in 2 seconds. Three months into production with 80,000 orders and 12,000 customers, the Monday morning report job started timing out at 30 minutes. The DB team paged us at 7 AM: SQL Server at 100% CPU, thousands of tiny COUNT queries per second.",
    problem:
      "A developer had written a foreach over an IQueryable<Customer> and inside the loop called orders.Where(o => o.CustomerId == customer.Id).Count(). The IQueryable re-executed per iteration. 12,000 customers = 12,001 SQL queries. Each query was fast (indexed), but 12,000 round-trips at ~2.5ms each = 30 seconds minimum, plus connection pool exhaustion under load.",
    solution:
      "Rewrote to a single GROUP BY query using EF's GroupBy translation. All 12,000 customer order counts fetched in one SQL query. Execution time dropped from 30 minutes to 4 seconds. Added a code review checklist item: 'Any LINQ query inside a loop?' and a Roslyn analyzer to flag IQueryable access inside foreach.",
    takeaway:
      "Never execute a query inside a loop over another query. The N+1 problem is the most common LINQ-related production incident. In EF Core, use Include(), GroupBy, or a join query. Materialize before looping with ToList() if you must loop.",
  },
  {
    title: "Double-Count in the Paginated API Cost 2x DB Load",
    scenario:
      "Our product catalog API served 50M requests/day. Each paginated request called Count() for the total and Take(pageSize).ToList() for the page — standard pagination. Our EF Core migration to .NET 8 re-enabled query splitting by default. Suddenly DB CPU doubled. Load tests were clean. The issue only appeared at scale.",
    problem:
      "Two separate queries ran per API call: SELECT COUNT(*) FROM Products WHERE ... and SELECT * FROM Products WHERE ... ORDER BY ... OFFSET ... FETCH. The second query's execution plan was different from the first (different indexes). At 50M requests/day that's 100M SQL queries. We'd been doing this for 2 years but it was masked by connection pooling until query splits changed the pool behavior.",
    solution:
      "Used a single window function query: SELECT *, COUNT(*) OVER() AS TotalCount FROM ... This returns the total count as a column alongside each result row — one query, one round-trip. Wrapped in a generic PaginatedQuery<T> helper that all repository methods use. DB CPU dropped 45%.",
    takeaway:
      "count + ToList() on the same IQueryable is two round-trips. Use SQL window functions (COUNT(*) OVER()) via raw SQL or a pagination library for a single query. This matters at any scale above a few requests/second.",
  },
];

export default function LinqExecutionPage() {
  return (
    <MotionFade>
      <Section
        title="LINQ Deferred Execution & Query Pipeline"
        subtitle="Why your LINQ query doesn't run when you write it — and how IQueryable turns C# into SQL."
      >
        <LinqExecutionVisualizer />
        <ConceptExplainer
          overview="LINQ (Language Integrated Query) is built on two key ideas: deferred execution and composable pipelines. When you chain .Where().Select().OrderBy(), you're building a description of what to compute — not computing it. Execution happens at the terminal operator (ToList, Count, foreach). For in-memory sequences this means lazy pull-based iteration. For IQueryable<T>, it means the entire expression tree is translated to a database query. The difference between IEnumerable and IQueryable is the difference between filtering in C# and filtering in SQL."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{
            label: "LINQ Deferred Execution & N+1 Traps (.NET 9 / EF Core 9)",
            code: CODE_EXAMPLE,
          }}
          whyItMatters="Deferred execution is LINQ's superpower and its biggest footgun. Server-side filtering via IQueryable lets a 50-line C# LINQ query translate to a single optimized SQL query with joins, CTEs, and indexes. But the same pattern with IEnumerable loads the entire table to memory before filtering. Understanding when your query executes and whether it runs on the DB or in-process is the most important LINQ skill for backend developers."
          pitfalls={[
            "Iterating an IQueryable inside a foreach over another IQueryable is N+1 queries — 1000 users in a loop = 1001 SQL round-trips. Always materialize with ToList() before looping, or rewrite as a JOIN/GroupBy query.",
            "Calling Count() then ToList() on the same IQueryable executes the query twice — two separate database round-trips. Use a single window function query (COUNT(*) OVER()) or track total via a single SELECT.",
            "Modifying the source collection while iterating throws System.InvalidOperationException: Collection was modified; enumeration operation may not execute. The enumerator detects the version mismatch. Copy to a list first if you need to mutate during iteration.",
            "Switching from IQueryable to IEnumerable mid-pipeline (e.g., by calling AsEnumerable() or passing to a method accepting IEnumerable) causes everything after that point to execute in-process. A Where() after AsEnumerable() loads the entire table then filters in C#.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
