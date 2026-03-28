"use client";

import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";
import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";

const QueryPipelineVisualizer = dynamic(() => import("./QueryPipelineVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// EF Core 9: IQueryable<T> — the query is NOT executed yet
IQueryable<Order> query = _dbContext.Orders;

// Each operator ADDS to the expression tree — no SQL yet
query = query.Where(o => o.CustomerId == customerId);
query = query.Where(o => o.Status == OrderStatus.Active);
query = query.OrderByDescending(o => o.CreatedAt);

// Include navigations before materialization
query = query.Include(o => o.Customer)
             .Include(o => o.Items)
             .ThenInclude(i => i.Product);

// Projection — only select the columns you need
var result = await query
    .Select(o => new OrderSummaryDto
    {
        Id = o.Id,
        CustomerName = o.Customer.Name,  // JOIN resolved
        ItemCount = o.Items.Count,       // COUNT() subquery
        Total = o.Items.Sum(i => i.Price * i.Quantity)
    })
    .Skip((page - 1) * pageSize)
    .Take(pageSize)
    .ToListAsync(cancellationToken);     // <-- SQL executes HERE

// Generated SQL (parameterized — no injection possible):
// SELECT o.Id, c.Name, COUNT(i.Id), SUM(i.Price * i.Quantity)
// FROM Orders o
// INNER JOIN Customers c ON c.Id = o.CustomerId
// LEFT JOIN OrderItems i ON i.OrderId = o.Id
// LEFT JOIN Products p ON p.Id = i.ProductId
// WHERE o.CustomerId = @customerId AND o.Status = @status
// ORDER BY o.CreatedAt DESC
// OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY

// WRONG — .ToList() before .Where() pulls ALL rows into memory
var bad = await _dbContext.Orders.ToListAsync();  // SELECT * FROM Orders
var filtered = bad.Where(o => o.Status == OrderStatus.Active);  // in-memory!`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "LINQ Operators Build an Expression Tree",
    body: "When you call .Where(), .Select(), .OrderBy() on IQueryable<T>, nothing hits the database. Each operator appends a node to an in-memory expression tree — a data structure that represents the query as an abstract syntax tree. The SQL hasn't been written yet.",
  },
  {
    title: "Query Translation Preprocessors",
    body: "EF Core runs a chain of IQueryTranslationPreprocessor passes over the expression tree: expanding navigations, applying owned entity mappings, inlining global query filters (soft-delete, tenant ID), and normalizing subqueries. This happens before any database-specific code runs.",
  },
  {
    title: "Provider Translates to SQL",
    body: "The database provider (SQL Server, PostgreSQL, SQLite) walks the normalized expression tree and generates parameterized SQL. String.Contains() becomes LIKE '%@p0%', arithmetic becomes SQL expressions, navigation includes become JOINs or subqueries. Anything it cannot translate causes an exception — or worse, client-side evaluation in older EF versions.",
  },
  {
    title: "Query Compilation & Caching",
    body: "EF Core 9 caches compiled queries keyed by the expression tree structure (not the parameter values). The first execution of a query shape pays the compilation cost (~1ms). All subsequent calls with different parameter values reuse the cached plan — parameters are injected safely.",
  },
  {
    title: "Materialization",
    body: "When .ToList(), .FirstOrDefault(), .ToListAsync() etc. are called, EF sends the SQL, reads the DbDataReader, and materializes C# objects. For tracked queries, each row is checked against the identity map first. For AsNoTracking queries, objects are created without snapshotting.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  { term: "IQueryable<T>", definition: "Represents a not-yet-executed query. Operators compose the expression tree. SQL only executes when you call a terminating operator like ToList() or FirstOrDefault().", icon: "🔗" },
  { term: "Expression Tree", definition: "An in-memory tree data structure representing the query as code that can be inspected, transformed, and translated. Not the same as a delegate — it's data, not bytecode.", icon: "🌳" },
  { term: "Query Provider", definition: "The EF Core component that owns IQueryable and handles translation. When you compose operators, you're calling the provider's CreateQuery() method.", icon: "⚙️" },
  { term: "Parameterized Queries", definition: "All variable values (method arguments, captured variables) are extracted as @p0, @p1 parameters. This prevents SQL injection and enables query plan caching in the database.", icon: "🔒" },
  { term: "Client Evaluation", definition: "If EF cannot translate an expression to SQL, it throws in EF Core 3+. In EF Core 2.x it silently fell back to pulling all rows and filtering in memory — a major hidden performance bug.", icon: "⚠️" },
  { term: "Compiled Queries", definition: "EF.CompileAsyncQuery() pre-compiles a query at startup, skipping the expression tree translation on every call. Useful for hot paths called thousands of times per second.", icon: "⚡" },
];

const USE_CASES: UseCase[] = [
  {
    title: "Silent Full-Table Scan from .ToList() Before .Where()",
    scenario: "A reporting endpoint was timing out under load. The query looked correct in code but SQL Server showed a sequential scan returning 2 million rows. The query took 8 seconds and was called on every page load.",
    problem: "The developer had written: 'var orders = await _dbContext.Orders.ToListAsync(); var filtered = orders.Where(o => o.Status == status).ToList();' The first ToListAsync() terminated the IQueryable and sent 'SELECT * FROM Orders' — 2 million rows into application memory. The .Where() after it was C# LINQ-to-Objects, not SQL. No error, no warning, just catastrophic performance.",
    solution: "Keep the entire query as IQueryable<T> until materialization: '_dbContext.Orders.Where(o => o.Status == status).ToListAsync()'. All filtering, ordering, and projection must happen before the terminating call. Added an EF Core interceptor to log queries taking over 200ms to catch regressions early.",
    takeaway: "IQueryable<T> is only a query description until you call ToList/FirstOrDefault/etc. The moment you materialize, EF sends SQL. Everything after materialization is LINQ-to-Objects running on already-fetched data in memory.",
  },
  {
    title: "string.Contains() Generating Non-Sargable LIKE Queries",
    scenario: "A product search feature was fast in development (10k products) but destroyed performance in production (500k products). Index scans showed the search column had an index, but SQL Server was ignoring it and doing a full table scan.",
    problem: "EF Core translates 'o.Name.Contains(term)' to 'LIKE \\'%widget%\\''. A leading wildcard '%widget%' is non-sargable — the database cannot use a B-tree index to seek, it must scan every row. With 500k products this meant ~120ms per search, multiplied by concurrent users.",
    solution: "For prefix search (most common): use 'EF.Functions.Like(o.Name, term + \"%\")' which generates 'LIKE \\'widget%\\'' — sargable. For full-text search: use SQL Server FTS with EF.Functions.Contains(). For complex search: use a dedicated search index (Elasticsearch, Azure Cognitive Search) and fetch only matched IDs from the DB.",
    takeaway: "EF Core faithfully translates your C# to SQL — including non-sargable patterns. Understanding what SQL your LINQ generates is non-negotiable for production queries. Always check via logging or SQL Profiler.",
  },
  {
    title: ".Count() > 0 Vs .Any() on a Million-Row Table",
    scenario: "An order validation check was measuring poorly in production traces: 'hasActiveOrders' was taking 45ms on users with many orders, even though it was just checking existence.",
    problem: "The code was: 'var hasActive = await _dbContext.Orders.Where(o => o.UserId == id && o.Status == Active).CountAsync() > 0;' EF generated: 'SELECT COUNT(*) FROM Orders WHERE UserId = @id AND Status = @s'. COUNT(*) must touch every matching row to count them — even though you only need to know if at least one exists.",
    solution: "Replace with: 'var hasActive = await _dbContext.Orders.Where(...).AnyAsync(cancellationToken);' EF generates: 'SELECT CASE WHEN EXISTS (SELECT 1 FROM Orders WHERE ...) THEN 1 ELSE 0 END'. The EXISTS subquery short-circuits on the first match — 0.2ms vs 45ms.",
    takeaway: "Use .Any() to check existence, never .Count() > 0 or .Count() == 0. EF Core translates .Any() to SQL EXISTS which short-circuits at the first match. The difference is immeasurable on small tables and catastrophic on large ones.",
  },
];

export default function QueryPipelinePage() {
  return (
    <MotionFade>
      <Section
        title="EF Core Query Pipeline (LINQ → SQL)"
        subtitle="How EF Core translates your LINQ into SQL — and the pipeline it goes through before hitting the database."
      >
        <QueryPipelineVisualizer />
        <ConceptExplainer
          overview="When you write a LINQ query against a DbSet<T>, EF Core doesn't execute anything immediately. Each operator (.Where, .Select, .Include) appends a node to an expression tree — an in-memory representation of the query. When you call a terminating operator like ToListAsync(), EF walks that tree through a translation pipeline: preprocessing, provider translation, parameterization, and SQL generation. Understanding this pipeline explains why some C# code translates perfectly and other code either throws or silently falls back to client-side evaluation."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "IQueryable pipeline — composition vs. materialization", code: CODE_EXAMPLE }}
          whyItMatters="The LINQ-to-SQL pipeline is where most EF Core performance bugs are born. A misplaced .ToList(), an untranslatable expression, a string.Contains() generating LIKE '%x%' — all of these look correct in C# but generate catastrophic SQL. Knowing the pipeline lets you write queries that generate the exact SQL you want, with parameters, indexes, and projections that scale to production data volumes."
          pitfalls={[
            "Calling .ToList() or .ToArray() mid-query terminates the IQueryable — all subsequent .Where() or .Select() calls become LINQ-to-Objects on in-memory data. This can silently pull millions of rows into application memory with no error.",
            "string.Contains(x) generates LIKE '%x%' with a leading wildcard — non-sargable, index-bypassing full table scan. Use EF.Functions.Like(col, x + '%') for prefix search, or full-text search for arbitrary substrings.",
            "Using .Count() > 0 to check existence forces the database to count all matching rows. Use .Any() instead — it generates SQL EXISTS which stops at the first match.",
            "Methods EF cannot translate (custom C# methods, complex .NET string operations) throw 'The LINQ expression could not be translated' in EF Core 3+. In EF Core 2.x they silently caused client-side evaluation — always test with a profiler.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
