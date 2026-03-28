"use client";

import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";
import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";

const RelationshipsVisualizer = dynamic(
  () => import("./RelationshipsVisualizer"),
  { ssr: false, loading: () => <VisualizerSkeleton /> }
);

const CODE_EXAMPLE = `// EF Core 9 — Relationships, Shadow Properties & Owned Types

// Required relationship (non-nullable FK)
public class Order
{
    public int Id { get; set; }
    public int CustomerId { get; set; }          // explicit FK property
    public Customer Customer { get; set; } = null!; // required nav

    public ICollection<OrderItem> Items { get; set; } = [];
}

// Optional relationship — EF generates nullable FK column
public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = "";

    // No FK property declared — EF creates shadow property "CategoryId" (int?)
    public Category? Category { get; set; }
}

// Many-to-many WITHOUT explicit join entity — EF creates "ProductTag" join table
// with shadow FK properties ProductsId, TagsId
public class Product
{
    public ICollection<Tag> Tags { get; set; } = [];
}
public class Tag
{
    public ICollection<Product> Products { get; set; } = [];
}

// Many-to-many WITH explicit join entity — allows payload columns
public class ProductTag
{
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public int TagId { get; set; }
    public Tag Tag { get; set; } = null!;

    public DateTime TaggedAt { get; set; }  // payload column — impossible without explicit entity
    public string TaggedBy { get; set; } = "";
}

// Owned entity — maps to same table by default (no separate JOIN needed)
public class Customer
{
    public int Id { get; set; }
    public string Name { get; set; } = "";

    public Address ShippingAddress { get; set; } = null!;  // owned type
}

[Owned]
public class Address
{
    public string Street { get; set; } = "";
    public string City { get; set; } = "";
    public string PostCode { get; set; } = "";
}

// Fluent API — cascade delete control (CRITICAL: understand before using)
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<Order>()
        .HasMany(o => o.Items)
        .WithOne(i => i.Order)
        .HasForeignKey(i => i.OrderId)
        .OnDelete(DeleteBehavior.Cascade);  // deleting Order deletes ALL Items

    modelBuilder.Entity<Order>()
        .HasOne(o => o.Customer)
        .WithMany(c => c.Orders)
        .HasForeignKey(o => o.CustomerId)
        .OnDelete(DeleteBehavior.Restrict);  // deleting Customer throws if Orders exist

    // Accessing shadow property value
    var shadowFk = _dbContext.Entry(product)
        .Property<int?>("CategoryId").CurrentValue;
}`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "EF Convention-based FK Discovery",
    body: "EF Core 9 scans your entity classes for navigation properties and infers foreign keys by convention: if Order has a CustomerId int property and a Customer navigation, EF links them. If you only declare the navigation (no FK property), EF creates a shadow property — a FK column that exists in the database but has no corresponding C# property on your entity.",
  },
  {
    title: "Required vs Optional Relationships",
    body: "A required relationship generates a NOT NULL FK column. EF infers required from whether the FK property is nullable (int vs int?) or whether the navigation's reference type is nullable (Customer? vs Customer). EF Core 8+ uses C# nullable reference types to drive this — if you have <Nullable>enable</Nullable>, non-nullable navs become required relationships automatically.",
  },
  {
    title: "Shadow Properties — the Hidden FK",
    body: "When you declare only a navigation property without an FK property, EF creates a shadow property in the model. It's named by convention (e.g., CategoryId). It exists in the DB schema but is invisible in your C# class. You can read/write it via dbContext.Entry(entity).Property<int>(\"CategoryId\"). It's a common source of confusion when debugging why a column appears in your migration.",
  },
  {
    title: "Many-to-Many: Implicit vs Explicit Join",
    body: "EF Core 5+ supports implicit many-to-many (just two ICollection navs, no join class). EF generates the join table automatically with shadow FK columns. The moment you need extra columns on the relationship (e.g., TaggedAt, CreatedBy), you must introduce an explicit join entity — you cannot add columns to the implicit join table via fluent API.",
  },
  {
    title: "Owned Types and Table Splitting",
    body: "Marking a type with [Owned] or .OwnsOne() in fluent API tells EF the owned type's properties should be inlined into the owner's table as columns. No JOIN required. If you use .OwnsMany() or ToTable() on the owned type to put it in a separate table, EF requires explicit .Include() to load it — owned-in-separate-table does NOT load automatically, which is a sharp footgun.",
  },
  {
    title: "Cascade Delete Propagation",
    body: "DeleteBehavior.Cascade is EF's default for required relationships. Deleting a parent deletes all children — recursively. This is translated to ON DELETE CASCADE at the DB schema level (in migrations). Dangerous: if your Customer has Orders which have OrderItems, deleting a Customer can cascade-delete hundreds of rows across multiple tables if all relationships are Cascade.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "Shadow Property",
    definition:
      "A property in the EF model that has no corresponding C# property on the entity class. Commonly created for FK columns when you omit the explicit FK property. Accessible via Entry().Property<T>(\"name\"). Appears in migrations as a real DB column.",
    icon: "👻",
  },
  {
    term: "Navigation Property",
    definition:
      "A C# property that represents a relationship to another entity — either a reference (Customer) or collection (ICollection<Order>). EF uses navs to determine how to generate JOINs and how to wire up FK constraints in migrations.",
    icon: "🧭",
  },
  {
    term: "DeleteBehavior",
    definition:
      "Controls what EF/DB does when the principal (parent) entity is deleted. Cascade = delete dependents. Restrict = throw if dependents exist. SetNull = set FK to NULL. ClientSetNull = EF sets FK to null in tracked entities, relies on DB to throw for untracked ones.",
    icon: "🗑",
  },
  {
    term: "[Owned]",
    definition:
      "Marks a type as an owned entity — it has no independent identity and belongs to exactly one owner. By default maps to the owner's table as columns. Owned types can themselves own other types. An owned type cannot be shared between owners.",
    icon: "📦",
  },
  {
    term: "[ForeignKey]",
    definition:
      "Data annotation to explicitly declare which property is the FK for a navigation. Use when the convention-based name doesn't match (e.g., FK is 'BillingCustomerId' but nav is 'Customer'). Without it, EF may create a shadow property instead of linking to your existing property.",
    icon: "🔑",
  },
  {
    term: "[InverseProperty]",
    definition:
      "Required when you have two navigation properties of the same type pointing to the same related entity. E.g., Employee has 'Manager' and 'DirectReports', both navigating to Employee. Without [InverseProperty], EF cannot determine which nav pairs with which and throws a model validation error.",
    icon: "↔",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "Cascade Delete Wiped Our Entire Order History",
    scenario:
      "We were running EF Core 7 on a multi-tenant SaaS. A tenant deactivation flow called _dbContext.Remove(tenant) and SaveChanges(). Within 4 seconds, 6 years of order history, invoice line items, and audit logs were gone — 2.3 million rows deleted across 11 tables.",
    problem:
      "The Tenant entity was at the root of a required relationship chain: Tenant → Customers → Orders → OrderItems → InvoiceLines. Every relationship used the default DeleteBehavior.Cascade because no one had explicitly set it in OnModelCreating. EF emitted ON DELETE CASCADE constraints in the original migration and the DB executed them all in one atomic transaction.",
    solution:
      "Restored from backup (4-hour data loss). Added a global convention in OnModelCreating to set all FK delete behaviors to Restrict, then explicitly opted specific relationships into Cascade only where it made semantic sense (e.g., OrderItem when Order is deleted). Added an integration test that asserts no unexpected cascade-deletes exist in the model.",
    takeaway:
      "Never rely on EF's default DeleteBehavior.Cascade. In OnModelCreating, add: foreach (var fk in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys())) { fk.DeleteBehavior = DeleteBehavior.Restrict; } then selectively re-enable Cascade only where you've thought it through.",
  },
  {
    title: "Owned Entity in Separate Table Broke Our API Silently",
    scenario:
      "We refactored Customer.ShippingAddress (an owned type) from inline columns to a separate table using .OwnsOne(c => c.ShippingAddress, sa => sa.ToTable(\"CustomerAddresses\")). All tests passed. Deployed Friday. Monday, the support team reported that every customer's shipping address was showing as null in the checkout flow.",
    problem:
      "Moving the owned type to a separate table changed EF's loading behavior. Inline owned types are always loaded with their owner (no JOIN needed — same table). Owned types in a separate table must be explicitly included with .Include(c => c.ShippingAddress). Every LINQ query that fetched customers omitted the Include, so ShippingAddress was null. No exception — EF just didn't load it.",
    solution:
      "Added .Include(c => c.ShippingAddress) to all customer queries. Added a global query filter approach using HasQueryFilter to auto-include it wasn't viable, so instead we moved the Include into the repository base class and added a regression test that asserts ShippingAddress is never null after a load.",
    takeaway:
      "Moving an owned type from inline to ToTable() is a silent breaking change to loading behavior. Document this explicitly when doing the refactor. Add a test that asserts owned-type-in-separate-table properties are populated after load, not just non-null after construction.",
  },
  {
    title: "Shadow FK Collision Corrupted Navigation Wiring",
    scenario:
      "We had a Product entity with both a ManufacturerId (explicit FK, maps to Manufacturer nav) and a SupplierId (explicit FK, maps to Supplier nav). When we added a second optional Category nav without an explicit FK property, EF created a shadow property named 'CategoryId'. The migration looked fine. But at runtime, querying .Include(p => p.Category) returned wrong Category records.",
    problem:
      "Our Product table already had a CategoryId column from a previous migration (added manually as a raw SQL migration, not through EF). EF's shadow property used the same name 'CategoryId' and mapped to that existing column, but the column had been populated with data that mapped to an old category schema before we introduced EF relationships. EF silently joined on incorrect values.",
    solution:
      "Added an explicit int? CategoryId property to Product and decorated it with [ForeignKey(nameof(Category))]. This forced EF to use our explicit property and map it correctly. Lesson: never have columns in the DB schema that shadow EF's naming conventions unless you explicitly declare them.",
    takeaway:
      "Always declare FK properties explicitly when your database has existing columns. EF's shadow property convention creates properties named [NavigationName]Id — if a column by that name already exists for unrelated reasons, you get silent data corruption. Explicit is always safer than convention for FK mapping.",
  },
];

export default function RelationshipsPage() {
  return (
    <MotionFade>
      <Section
        title="Relationships & Navigation Properties"
        subtitle="How EF Core maps one-to-many, many-to-many, and owned types — and the shadow properties you didn't know you had."
      >
        <RelationshipsVisualizer />
        <ConceptExplainer
          overview="EF Core builds a model of your entity relationships from C# class structure, data annotations, and fluent API configuration. For every relationship, EF needs to know: the principal entity (the '1' side), the dependent entity (the FK side), and the delete behavior. When you omit explicit FK properties, EF silently creates shadow properties — FK columns with no C# counterpart. Understanding how EF discovers and configures these relationships is critical to avoiding cascade-delete disasters, silent null navigation properties, and unexpected schema diffs in migrations."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{
            label: "EF Core 9 — Relationships, Shadow Properties & Cascade Delete",
            code: CODE_EXAMPLE,
          }}
          whyItMatters="Relationship configuration determines your database schema (FK constraints, nullable columns, join tables), query behavior (how Include() works, what gets cascade-deleted), and migration output. Getting this wrong silently — by relying on conventions without understanding what EF is generating — is the source of some of the most damaging production incidents: accidental mass deletes from cascade, null navigation properties from missing Include, and data corruption from shadow FK collisions."
          pitfalls={[
            "Cascade delete is EF's default for required relationships and it applies recursively. Deleting a root entity can cascade through 10 tables without any warning. Always audit your model's delete behaviors: modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()).Select(fk => fk.DeleteBehavior).",
            "Owned types moved to a separate table via ToTable() no longer auto-load with the owner — they require explicit .Include(). This is a silent breaking change from inline owned types. EF does not warn you. Your navigation properties will just be null.",
            "Implicit many-to-many join tables cannot have payload columns. If you later need to add 'CreatedAt' or 'TaggedBy' to the join, you must introduce an explicit join entity and migrate the data — there is no upgrade path that preserves the implicit syntax.",
            "Shadow property names follow the [NavigationName]Id convention. If your database already has a column with that name for unrelated reasons, EF will map to it silently — potentially causing wrong JOIN behavior. Always declare FK properties explicitly if in doubt.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
