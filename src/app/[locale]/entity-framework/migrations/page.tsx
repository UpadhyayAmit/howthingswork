"use client";

import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";
import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";

const MigrationsVisualizer = dynamic(() => import("./MigrationsVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// EF Core 9 — generated migration (DO NOT hand-edit the snapshot)
public partial class AddOrderShippedAtAndIndex : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Add nullable column first — safe for existing rows
        migrationBuilder.AddColumn<DateTime>(
            name: "ShippedAt",
            table: "Orders",
            type: "datetime2",
            nullable: true);   // <-- NEVER non-nullable without a default

        // Add index in a separate step — can be done ONLINE in SQL Server
        migrationBuilder.CreateIndex(
            name: "IX_Orders_ShippedAt",
            table: "Orders",
            column: "ShippedAt",
            filter: "[ShippedAt] IS NOT NULL");  // partial index — sparse
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_Orders_ShippedAt", table: "Orders");
        migrationBuilder.DropColumn(name: "ShippedAt", table: "Orders");
    }
}

// EF Core 9: migration bundles (single executable — no dotnet-ef needed in prod)
// dotnet ef migrations bundle --output ./efbundle

// Apply programmatically — BUT NOT on app startup in production
await using var scope = app.Services.CreateAsyncScope();
var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
await db.Database.MigrateAsync();  // Applies all pending migrations

// Idempotent SQL script for zero-downtime deployments
// dotnet ef migrations script --idempotent --output migrations.sql
// Each statement wrapped in IF NOT EXISTS checks`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "dotnet ef migrations add Captures a Diff",
    body: "The CLI compares the current DbContext model (via model snapshot) against the last snapshot stored in Migrations/[timestamp]_Previous.cs. It generates a new migration file with Up() and Down() methods containing the exact schema changes, and updates the ModelSnapshot.cs file.",
  },
  {
    title: "ModelSnapshot Is the Source of Truth",
    body: "The ModelSnapshot.cs file in your Migrations folder represents what EF Core thinks your database schema currently looks like. It's a C# representation of the full schema, not SQL. Every new migration diffs against it. Losing or corrupting the snapshot breaks future migration generation.",
  },
  {
    title: "Up() and Down() Methods",
    body: "Up() applies the migration — adding columns, creating indexes, etc. Down() reverses it — useful for rollbacks. EF Core 9 generates both automatically. Production rollback via Down() is risky for data-loss operations — always validate before relying on it.",
  },
  {
    title: "__EFMigrationsHistory Table Tracks Applied Migrations",
    body: "Every time a migration is applied, EF inserts a row into __EFMigrationsHistory with the migration ID and EF Core version. When MigrateAsync() runs, EF checks this table and only applies migrations whose IDs are not present. This makes migrations idempotent across environments.",
  },
  {
    title: "Production Deployment Strategy",
    body: "Recommended flow: 1) Generate idempotent SQL script (dotnet ef migrations script --idempotent), 2) Review the SQL, 3) Run it against production as a pre-deployment step, 4) Deploy the new app version. Never call MigrateAsync() in app startup when running multiple instances — two instances racing to apply migrations causes 'Migration already exists' errors or duplicate operations.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  { term: "ModelSnapshot", definition: "A C# file auto-maintained by EF that records the complete current model. Diff target for new migrations. Never edit manually. Commit it to git.", icon: "📸" },
  { term: "Up() / Down()", definition: "Migration methods for forward (apply) and reverse (rollback) schema changes. Down() is auto-generated but should be manually verified for destructive operations.", icon: "⬆️" },
  { term: "__EFMigrationsHistory", definition: "A table EF creates in your database to track which migrations have been applied. Used by MigrateAsync() to determine pending migrations.", icon: "📋" },
  { term: "Migration Bundle", definition: "EF Core 6+ feature: 'dotnet ef migrations bundle' creates a self-contained executable that applies migrations. No dotnet SDK needed in production containers.", icon: "📦" },
  { term: "Idempotent Script", definition: "Generated with --idempotent flag. Each statement checks if it's already been applied before executing. Safe to re-run — useful in CI/CD pipelines.", icon: "🔁" },
  { term: "Seed Data", definition: "modelBuilder.Entity<T>().HasData() inserts reference data during migrations. EF uses primary key to detect insert vs update, making it idempotent.", icon: "🌱" },
];

const USE_CASES: UseCase[] = [
  {
    title: "Race Condition: Two App Instances Applying Migrations on Startup",
    scenario: "After deploying a new version during peak traffic, we rolled out with 3 instances. The deployment window showed 2 instances failing to start. The error logs read: 'Cannot insert duplicate key row in object __EFMigrationsHistory with unique index.'",
    problem: "All three instances called 'await db.Database.MigrateAsync()' in Program.cs at startup. Instance A read the history table, saw migration X as pending, and started applying it. Instances B and C simultaneously did the same — all three tried to insert the migration record into __EFMigrationsHistory, and two of them lost the race with a unique constraint violation.",
    solution: "Remove MigrateAsync() from application startup entirely. Use a pre-deployment migration step: run 'dotnet ef migrations bundle' in CI to create an efbundle executable, then run it as part of the deployment pipeline before the new app instances start. Alternatively, use a distributed lock (IDistributedLock) around the migration call if you must do it in-process.",
    takeaway: "Migrations are a deployment concern, not an application startup concern. Never run MigrateAsync() when you might have multiple app instances starting simultaneously. The __EFMigrationsHistory unique constraint will ensure only one succeeds — and the others will crash.",
  },
  {
    title: "Destructive Column Rename Silently Drops Data",
    scenario: "A developer renamed a property from 'Address' to 'ShippingAddress' in the Order entity, ran 'dotnet ef migrations add RenameColumn', and deployed to staging. The migration ran successfully. Then they noticed all existing orders had a null ShippingAddress — 50,000 rows of address data were gone.",
    problem: "EF Core cannot infer that 'Address' was renamed to 'ShippingAddress'. It sees a column was removed and a new column was added. The generated migration contained 'DropColumn(\"Address\")' followed by 'AddColumn(\"ShippingAddress\")'. All data in the original column was deleted.",
    solution: "For column renames, manually edit the migration to use 'migrationBuilder.RenameColumn(\"Address\", \"Orders\", \"ShippingAddress\")' instead of the generated drop+add. Always review generated migrations before applying them. Add a CI check that diffs the generated SQL against approved patterns to catch unexpected DropColumn operations.",
    takeaway: "EF Core generates migrations based on model snapshots, not intent. It cannot distinguish a rename from a drop+add. Always review generated migration SQL — especially in staging — before running against production data.",
  },
  {
    title: "Adding a Non-Nullable Column to a 10M-Row Table Locks the Table",
    scenario: "A developer added a required (non-nullable) string property 'Region' with no default value. The migration ran fine in dev (200 rows) and staging (5,000 rows). In production (10 million rows), the migration ran for 22 minutes and caused a complete outage because SQL Server locked the table while backfilling.",
    problem: "SQL Server must provide a value for all existing rows when adding a non-nullable column without a default. It locks the entire table, reads every row, writes the default value, then updates statistics. On 10M rows this is a full table rewrite. The table was locked for writes the entire time.",
    solution: "Three-phase migration: Phase 1 — add the column as nullable with no default (instant, no lock). Phase 2 — backfill the data in batches: 'UPDATE Orders SET Region = 'US' WHERE Region IS NULL AND Id BETWEEN @min AND @max' in loops of 10,000 rows. Phase 3 — alter column to NOT NULL after all rows are filled (fast metadata change). Deploy app changes that handle null during the transition window.",
    takeaway: "Never add a non-nullable column without a default to a large production table in a single migration. Always make it nullable first, backfill data, then enforce the constraint. What takes 5ms in dev can take 20 minutes in production.",
  },
];

export default function MigrationsPage() {
  return (
    <MotionFade>
      <Section
        title="EF Core Migrations & Schema Evolution"
        subtitle="How EF Core snapshots your model and generates SQL diff scripts — and why running migrations in production needs a strategy."
      >
        <MigrationsVisualizer />
        <ConceptExplainer
          overview="EF Core Migrations are a version control system for your database schema. When you change your entity model, EF diffs it against a stored ModelSnapshot.cs and generates a migration class with Up() and Down() methods containing the schema operations. Applied migrations are tracked in the __EFMigrationsHistory table. This system lets you evolve your schema incrementally — but production deployments require careful strategy to avoid table locks, data loss, and race conditions."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Migration patterns — safe column additions and deployment", code: CODE_EXAMPLE }}
          whyItMatters="Migrations are the safest way to evolve a production database schema while keeping your C# model and database in sync. But they are sharp tools: a generated migration can silently drop a column that was renamed, add a NOT NULL column that locks a 10M-row table, or race with other app instances to apply the same change twice. Understanding how migrations work — and how they fail — is essential for zero-downtime deployments."
          pitfalls={[
            "Running Database.MigrateAsync() in app startup with multiple instances causes a race condition. Two instances can simultaneously see migration X as pending, both apply it, and both try to insert into __EFMigrationsHistory — one will crash with a unique constraint violation.",
            "Renaming a property generates DropColumn + AddColumn — not RenameColumn. EF Core cannot infer intent from a snapshot diff. Always review generated migration SQL and manually change to RenameColumn when appropriate.",
            "Adding a non-nullable column to a large table causes a full table lock while SQL Server backfills default values. Always add as nullable first, backfill in batches, then alter to NOT NULL in a separate release.",
            "Keeping migrations in a separate project from the DbContext causes the ModelSnapshot to lose its reference. You get 'Unable to create an object of type AppDbContext' and the scaffold fails. Use --project and --startup-project flags, or keep them together.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
