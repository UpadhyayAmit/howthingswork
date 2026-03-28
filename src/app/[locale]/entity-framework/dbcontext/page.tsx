"use client";

import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";
import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";

const DbContextVisualizer = dynamic(() => import("./DbContextVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// The DbContext is your Unit of Work — it tracks EVERYTHING
public class AppDbContext : DbContext
{
    public DbSet<Order> Orders { get; set; }
    public DbSet<Customer> Customers { get; set; }

    // EF Core 9: SaveChangesAsync with CancellationToken support
    public override async Task<int> SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        // Inspect what's about to be written — great for audit logs
        var entries = ChangeTracker.Entries()
            .Where(e => e.State is EntityState.Added or EntityState.Modified);

        foreach (var entry in entries)
        {
            if (entry.Entity is IAuditableEntity auditable)
                auditable.UpdatedAt = DateTime.UtcNow;
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}

// Reading entities — tracked by default
var order = await _dbContext.Orders.FindAsync(orderId, cancellationToken);
order.Status = OrderStatus.Shipped;  // Change Tracker sees this

// The SQL EF generates:
// UPDATE Orders SET Status = 2, UpdatedAt = '...' WHERE Id = @id
// Only CHANGED columns are included — not SELECT *
await _dbContext.SaveChangesAsync(cancellationToken);

// For read-only queries: skip the change tracker overhead
var reportData = await _dbContext.Orders
    .AsNoTracking()
    .Where(o => o.CreatedAt >= cutoff)
    .ToListAsync(cancellationToken);

// Check before flushing
if (_dbContext.ChangeTracker.HasChanges())
    await _dbContext.SaveChangesAsync(cancellationToken);`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "DbContext Opens a Connection",
    body: "When you first execute a query or call SaveChanges, EF Core opens a connection from the connection pool. The DbContext holds this connection for its lifetime — which in ASP.NET Core is one HTTP request via scoped DI.",
  },
  {
    title: "Identity Map: One Instance Per Key",
    body: "The change tracker maintains an identity map. If you load Order #42 twice in the same DbContext lifetime, you get the exact same C# object reference — not two separate copies. This prevents phantom updates but can hide stale data bugs.",
  },
  {
    title: "Snapshot-Based Change Detection",
    body: "On load, EF Core captures a snapshot of every tracked entity's original property values. When SaveChanges is called, it calls DetectChanges() which diffs the current values against the snapshot to find Modified properties.",
  },
  {
    title: "State Machine Transition",
    body: "Each entity moves through states: Detached → Added/Unchanged → Modified/Deleted. EF generates exactly the SQL needed for each state — INSERT for Added, UPDATE for Modified (only changed columns), DELETE for Deleted, nothing for Unchanged.",
  },
  {
    title: "SaveChanges Flushes in One Transaction",
    body: "All pending changes are written in a single database transaction. If any statement fails, the entire batch rolls back. EF Core 9 returns the count of affected rows and raises SavedChanges / SaveChangesFailed events for observability.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  { term: "EntityState", definition: "Enum with 5 values: Detached, Unchanged, Added, Modified, Deleted. EF generates SQL based on this state at SaveChanges time.", icon: "🔵" },
  { term: "Change Tracker", definition: "The internal mechanism that watches every tracked entity. Stores original values (snapshot) and current values. Drives DetectChanges().", icon: "👁" },
  { term: "Unit of Work", definition: "Design pattern: collect all changes during a business operation, then flush them atomically. DbContext IS your unit of work.", icon: "📦" },
  { term: "DetectChanges()", definition: "Scans all tracked entities comparing current vs. snapshot values. Called automatically before SaveChanges. Expensive in loops — never call it manually per-entity.", icon: "🔍" },
  { term: "AsNoTracking()", definition: "Bypasses the identity map and change tracking entirely. 30-40% faster for read-only queries. Entities returned cannot be directly SaveChanges'd.", icon: "⚡" },
  { term: "SaveChangesAsync", definition: "Async flush. Calls DetectChanges, validates entities, generates SQL, executes in a transaction, updates entity states back to Unchanged.", icon: "💾" },
];

const USE_CASES: UseCase[] = [
  {
    title: "Silent Data Corruption from Shared DbContext",
    scenario: "We had a background service that processed orders in parallel using Task.WhenAll. Intermittently, order statuses were being saved with wrong values — a 'Shipped' order would revert to 'Pending'.",
    problem: "The service was registering DbContext as a singleton. Two Task threads were sharing the same DbContext instance simultaneously. Thread A loaded Order #1 and Thread B loaded Order #2 — but the identity map and change tracker are not thread-safe. Thread B's SaveChanges flushed Thread A's partial changes in a corrupted state. The actual exception we eventually saw: 'InvalidOperationException: A second operation was started on this context instance before a previous operation completed.'",
    solution: "Register DbContext as scoped (default in ASP.NET Core). For background services, use IDbContextFactory<AppDbContext> to create a fresh DbContext per task: 'using var context = _factory.CreateDbContext();'. Each parallel operation gets complete isolation.",
    takeaway: "DbContext is explicitly documented as not thread-safe. One instance per request/operation, never shared across threads. IDbContextFactory is the canonical solution for parallel work.",
  },
  {
    title: "Long-Lived DbContext Serving Stale Data",
    scenario: "Our API was returning stale inventory counts. Another service had decremented stock 10 minutes ago, but the GET endpoint was still returning the old values. No caching was involved.",
    problem: "The DbContext was registered as a singleton (accidentally, via a DI configuration mistake). The identity map was returning the cached in-memory entity from the first load — never re-querying the database. The data in the identity map was 10 minutes old.",
    solution: "Fix the lifetime to scoped. For cases where you genuinely need to re-read fresh data within the same context, call '_dbContext.Entry(entity).ReloadAsync(cancellationToken)' to force a re-fetch, or use AsNoTracking() with a fresh query. Also added a DbContext lifetime assertion in integration tests.",
    takeaway: "The identity map is a feature, not a bug — but it means a long-lived DbContext is effectively a cache of your database state. Short-lived, per-request DbContext instances are the intended design.",
  },
  {
    title: "DetectChanges Killing Performance in a Bulk Import",
    scenario: "Importing 50,000 product records took 4 minutes. Profiling showed 98% of CPU time inside EF's DetectChanges method, which was being called thousands of times.",
    problem: "The import loop was calling SaveChanges() after every entity insert. Each SaveChanges() call triggers DetectChanges(), which scans ALL tracked entities. By record 40,000, there were 40,000 tracked entities to scan — O(n²) behavior.",
    solution: "Either call SaveChanges every 500 records and clear the tracker ('_dbContext.ChangeTracker.Clear()'), use AddRange() for batching, or switch to ExecuteBulkInsert via EFCore.BulkExtensions for genuine bulk scenarios. Also set AutoDetectChangesEnabled = false during import and call DetectChanges() once before the batch SaveChanges.",
    takeaway: "DetectChanges is O(n) per tracked entity. Combine that with calling SaveChanges() per record and you get O(n²). Always batch inserts and clear the change tracker when doing bulk operations.",
  },
];

export default function DbContextPage() {
  return (
    <MotionFade>
      <Section
        title="DbContext & the Change Tracker"
        subtitle="EF Core's Unit of Work — how it tracks every entity state change before writing a single byte to the database."
      >
        <DbContextVisualizer />
        <ConceptExplainer
          overview="The DbContext is EF Core's central object — it represents a session with the database, manages the identity map, and acts as the Unit of Work by collecting all entity changes and flushing them atomically. Every entity you load or add gets registered in the change tracker with a snapshot of its original values. When SaveChanges fires, EF diffs current vs. original, generates the minimum SQL needed, and executes it in one transaction."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "DbContext & Change Tracker — real patterns", code: CODE_EXAMPLE }}
          whyItMatters="The DbContext's change tracking is what separates EF Core from a raw SQL mapper. It means you can modify entities in plain C# and SaveChanges generates precise SQL touching only changed columns. But it's also the source of the most production bugs: non-thread-safe shared instances, stale identity map data, and O(n²) DetectChanges in bulk operations. Understanding the state machine and lifetime model prevents entire categories of data corruption."
          pitfalls={[
            "DbContext is NOT thread-safe. Sharing one instance across Task.WhenAll threads will throw 'InvalidOperationException: A second operation was started on this context instance before a previous operation completed' — or worse, silently corrupt data.",
            "Calling DetectChanges() manually in a loop that already has hundreds of tracked entities causes O(n) work per call. EF calls it automatically before SaveChanges — you almost never need to call it yourself.",
            "Using AsNoTracking() on entities you plan to later attach and modify/delete is a trap. The entity's state is Detached and EF won't generate the right SQL unless you explicitly call _dbContext.Update(entity) — which sends UPDATE for ALL columns, not just changed ones.",
            "Long-lived DbContext instances (singleton, stored in a field) serve data from the identity map cache. The identity map never expires. Your query might return 10-minute-old data even though the database was updated by another process.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
