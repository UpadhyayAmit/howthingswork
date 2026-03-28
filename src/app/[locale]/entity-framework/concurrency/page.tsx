"use client";

import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";
import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";

const ConcurrencyVisualizer = dynamic(
  () => import("./ConcurrencyVisualizer"),
  { ssr: false, loading: () => <VisualizerSkeleton /> }
);

const CODE_EXAMPLE = `// EF Core 9 — Optimistic Concurrency with rowversion

// Entity with concurrency token
public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public int Stock { get; set; }
    public decimal Price { get; set; }

    [Timestamp]                        // maps to rowversion in SQL Server
    public byte[] RowVersion { get; set; } = [];
    // Alternative for non-SQL Server: [ConcurrencyToken] on any property
}

// SQL Server: ALTER TABLE [Products] ADD [RowVersion] rowversion NOT NULL
// rowversion auto-increments on every UPDATE — no application code needed

// ------------------------------------------------------------------
// The WHERE clause EF generates on UPDATE/DELETE:
// UPDATE [Products] SET [Stock] = @p0
// WHERE [Id] = @p1 AND [RowVersion] = @p2  ← concurrency check
// If 0 rows affected → someone else updated first → exception

// ------------------------------------------------------------------
// Handling DbUpdateConcurrencyException — three strategies:

// Strategy 1: Client Wins (overwrite DB with current user's values)
public async Task UpdateStockClientWinsAsync(int productId, int newStock, CancellationToken ct)
{
    var maxRetries = 3;
    for (var attempt = 0; attempt < maxRetries; attempt++)
    {
        try
        {
            var product = await _dbContext.Products.FindAsync([productId], ct);
            if (product is null) throw new NotFoundException(productId);

            product.Stock = newStock;
            await _dbContext.SaveChangesAsync(ct);
            return;
        }
        catch (DbUpdateConcurrencyException ex)
        {
            if (attempt == maxRetries - 1) throw;  // exhaust retries

            var entry = ex.Entries.Single();
            // Refresh original values from database so next SaveChanges
            // sends the CURRENT rowversion in the WHERE clause
            await entry.ReloadAsync(ct);  // ← CRITICAL: refresh OriginalValues
        }
    }
}

// Strategy 2: Database Wins (discard client changes, keep DB values)
catch (DbUpdateConcurrencyException ex)
{
    var entry = ex.Entries.Single();
    var dbValues = await entry.GetDatabaseValuesAsync(ct);

    if (dbValues is null)
        throw new InvalidOperationException("The entity was deleted by another user.");

    // Overwrite current values with what's in the DB
    entry.OriginalValues.SetValues(dbValues);
    entry.CurrentValues.SetValues(dbValues);
    // Don't retry — database already has the "winning" state
}

// Strategy 3: Merge (apply non-conflicting fields, surface conflicts)
catch (DbUpdateConcurrencyException ex)
{
    var entry = ex.Entries.Single();
    var dbValues = await entry.GetDatabaseValuesAsync(ct);
    var clientValues = entry.CurrentValues;
    var originalValues = entry.OriginalValues;

    var conflicts = new List<string>();

    foreach (var property in entry.Properties)
    {
        var dbValue = dbValues![property.Metadata.Name];
        var clientValue = clientValues[property.Metadata.Name];
        var origValue = originalValues[property.Metadata.Name];

        if (!Equals(dbValue, origValue) && !Equals(clientValue, origValue))
        {
            // Both client and DB changed this field from the original
            conflicts.Add($"{property.Metadata.Name}: DB={dbValue}, You={clientValue}");
        }
    }

    if (conflicts.Count > 0)
        throw new ConcurrencyConflictException(conflicts);  // surface to user

    // Non-conflicting fields: take client values, refresh rowversion
    entry.OriginalValues.SetValues(dbValues!);
    await _dbContext.SaveChangesAsync(ct);
}`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "rowversion — The Conflict Token",
    body: "In SQL Server, a rowversion (or timestamp) column is an 8-byte binary value auto-incremented by the database engine on every INSERT or UPDATE to that row. No application code needed to update it. EF maps [Timestamp] byte[] to rowversion. Each time the row changes, the value increments — and EF uses it as a collision detector.",
  },
  {
    title: "The WHERE Clause with Concurrency Check",
    body: "When EF calls SaveChanges() on a tracked entity with a [Timestamp] property, it generates: UPDATE [Products] SET [Stock] = @p0 WHERE [Id] = @p1 AND [RowVersion] = @p2. If another user has updated the row between your load and save, the RowVersion in the DB will have changed. The WHERE clause matches 0 rows. EF sees rows affected = 0 and throws DbUpdateConcurrencyException.",
  },
  {
    title: "DbUpdateConcurrencyException — What It Contains",
    body: "The exception's Entries property contains IReadOnlyList<EntityEntry> — the entities whose save failed. Each entry has: OriginalValues (what you loaded), CurrentValues (what you tried to save), and GetDatabaseValues() which fires a SELECT to fetch what's currently in the DB. These three value sets are the inputs to any conflict resolution strategy.",
  },
  {
    title: "Client Wins Strategy",
    body: "After catching the exception, call entry.ReloadAsync() to refresh OriginalValues from the DB. This updates the rowversion to the current DB value. Then retry SaveChanges(). The next UPDATE's WHERE clause will match the current rowversion. Client's values overwrite whatever was in the DB. Do NOT retry without ReloadAsync — you'll loop on the same stale rowversion forever.",
  },
  {
    title: "Database Wins Strategy",
    body: "Call entry.GetDatabaseValuesAsync() to fetch current DB state. Then call entry.CurrentValues.SetValues(dbValues) to overwrite the client's pending changes with what the DB has. Call entry.OriginalValues.SetValues(dbValues) to update the rowversion. No retry needed — the entity is now consistent with the DB.",
  },
  {
    title: "Merge / Detect Specific Conflicts",
    body: "Compare OriginalValues (what client loaded), CurrentValues (what client wants to save), and DatabaseValues (what's in DB now). Fields where only one side changed can be safely merged. Fields where both the DB and client changed from the original are genuine conflicts that must be surfaced to the user — you cannot resolve them automatically without business logic.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "[Timestamp]",
    definition:
      "Data annotation that maps a byte[] property to a SQL Server rowversion column. EF automatically includes this column in UPDATE/DELETE WHERE clauses. The DB engine increments the value atomically on every write — no application code required. Equivalent to fluent API: .IsRowVersion().",
    icon: "🕐",
  },
  {
    term: "[ConcurrencyToken]",
    definition:
      "Marks any property as a concurrency token. Unlike [Timestamp], EF does NOT auto-update it — your application must update the value before SaveChanges. Use for non-SQL Server databases or for user-visible version numbers (e.g., a Version int that increments in code).",
    icon: "🔒",
  },
  {
    term: "DbUpdateConcurrencyException",
    definition:
      "Thrown by SaveChanges()/SaveChangesAsync() when a tracked entity's UPDATE or DELETE affected 0 rows. The Entries property contains the conflicting EntityEntry objects with OriginalValues, CurrentValues, and GetDatabaseValues(). Never swallow this exception silently.",
    icon: "💥",
  },
  {
    term: "Entry.GetDatabaseValues()",
    definition:
      "Executes a SELECT statement to fetch the current state of the row from the database. Returns PropertyValues (or null if the row was deleted). This is the freshest view of the DB state and is the foundation of all three conflict resolution strategies.",
    icon: "🔄",
  },
  {
    term: "Entry.OriginalValues",
    definition:
      "The property values as they were when the entity was first loaded from the DB (or last successfully saved). These are what EF puts in the WHERE clause of UPDATE statements. After a concurrency conflict, these must be refreshed (via ReloadAsync or SetValues) before retrying.",
    icon: "📸",
  },
  {
    term: "Optimistic vs Pessimistic",
    definition:
      "Optimistic concurrency assumes conflicts are rare — no locks held while user edits. Conflicts detected at save time. Pessimistic concurrency holds a DB lock (BEGIN TRAN, UPDLOCK hint) for the duration of the edit. Pessimistic is safe but causes deadlocks at scale. Optimistic is preferred for web workloads.",
    icon: "⚖",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "DbUpdateConcurrencyException During Flash Sale — 200 Users, One Product",
    scenario:
      "We ran a flash sale: a limited-edition product with 50 units. Announced on social media, 3,000 concurrent users hit the buy button simultaneously. Within the first 200ms, our exception logging showed 847 DbUpdateConcurrencyException per second. The inventory service was handling ~5% of purchases — 95% were retrying or failing with a user-visible error.",
    problem:
      "Our conflict resolution was: catch DbUpdateConcurrencyException, log it, and return HTTP 409 to the client to 'try again'. No automatic retry in the service. Users hit F5, generating more concurrent attempts. We hadn't thought through the retry strategy. The product sold out in 8 seconds but the exception storm lasted 4 minutes as clients kept retrying stale states.",
    solution:
      "Added a 3-attempt retry loop with entry.ReloadAsync() on each DbUpdateConcurrencyException. Added a stock check after reload: if stock == 0 after reload, return 'sold out' immediately (no retry). Added Polly retry policy at the HTTP client level with exponential backoff. Subsequent flash sale: 4,200 concurrent users, 2 DbUpdateConcurrencyExceptions logged total — absorbed by the retry loop.",
    takeaway:
      "DbUpdateConcurrencyException on stock/inventory tables is expected, not exceptional, during high concurrency. Design your exception handling as a retry loop with ReloadAsync() + domain check (is the operation still valid after reload?), not as a failure path.",
  },
  {
    title: "Swallowed ConcurrencyException Silently Discarded User Edits",
    scenario:
      "Our CRM had a customer profile editor. Two support agents could simultaneously edit different fields of the same customer record. We had [Timestamp] on Customer but our exception handler caught DbUpdateConcurrencyException and returned HTTP 200 with a silent 'Database Wins' strategy — always overwriting the client's changes with the DB version.",
    problem:
      "Agent A opened a customer record. Agent B opened the same record and updated the phone number (saved successfully). Agent A updated the email address and saved — DbUpdateConcurrencyException fired. Our 'Database Wins' handler discarded Agent A's email change silently, wrote Agent B's phone number back to the entity, and returned 200 OK with no indication that the save failed. Agent A's email change was silently lost.",
    solution:
      "Implemented a per-field merge strategy: compare OriginalValues, CurrentValues, and DatabaseValues per property. Non-conflicting field changes (Agent A's email vs Agent B's phone = different fields) are merged automatically. Genuine field conflicts surface a 409 response with a diff UI showing: 'You changed email to X, but another user changed it to Y simultaneously.' Let the user decide.",
    takeaway:
      "Never silently discard user edits. Database Wins is appropriate for automated background processes. For human-facing edit flows, surface conflicts explicitly. A 'your changes were discarded' message is always better than a silent data loss that users discover days later.",
  },
];

export default function ConcurrencyPage() {
  return (
    <MotionFade>
      <Section
        title="Optimistic Concurrency & Conflict Resolution"
        subtitle="How EF Core's row version tokens detect concurrent updates — and what to do when DbUpdateConcurrencyException fires."
      >
        <ConcurrencyVisualizer />
        <ConceptExplainer
          overview="Optimistic concurrency in EF Core works by adding a rowversion (or any concurrency token) to UPDATE and DELETE WHERE clauses. If two users load the same row and both try to save changes, the first save succeeds and increments the rowversion. The second save's WHERE clause references the old rowversion — it matches 0 rows — so EF throws DbUpdateConcurrencyException. The exception gives you all three value sets needed to resolve the conflict: what the user originally loaded, what the user wants to save, and what's currently in the database."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{
            label: "EF Core 9 — rowversion, DbUpdateConcurrencyException, conflict resolution strategies",
            code: CODE_EXAMPLE,
          }}
          whyItMatters="Optimistic concurrency lets your application scale without holding database locks across user interactions. But it's only safe if you handle DbUpdateConcurrencyException correctly. A catch block that logs and swallows the exception is silently discarding user data. A retry without ReloadAsync loops forever on a stale rowversion. Either way, users lose data without knowing it. The exception is not a failure — it's a signal that requires a deliberate, domain-aware response."
          pitfalls={[
            "Retrying SaveChanges after DbUpdateConcurrencyException without calling entry.ReloadAsync() (or manually updating OriginalValues) will fail indefinitely. The WHERE clause still contains the old rowversion. ReloadAsync() fetches the current rowversion from the DB and updates OriginalValues.",
            "Using [ConcurrencyToken] (not [Timestamp]) requires your application code to increment the version value on every update. Forgetting to increment the token means the concurrency check is a no-op — the same value is always in the WHERE clause and no conflict is ever detected.",
            "Pessimistic locking via transactions (SELECT ... WITH (UPDLOCK)) prevents concurrency exceptions but holds a DB lock for the entire user editing session — potentially minutes. At any meaningful scale this causes deadlocks and lock queue buildup. Optimistic concurrency is almost always the right model for web applications.",
            "Using [Timestamp] on an entity does not protect you against concurrent deletes. If User A loads a row and User B deletes it, User A's UPDATE will affect 0 rows and throw DbUpdateConcurrencyException. Your handler must check if dbValues is null (row deleted) vs non-null (row updated) — these require different resolution paths.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
