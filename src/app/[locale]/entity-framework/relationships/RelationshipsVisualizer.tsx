"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Panel from "@/app/_ui/Panel";

type RelType = "one-to-many" | "many-to-many" | "owned";
type DeleteBehavior = "cascade" | "restrict";
type FKMode = "required" | "optional";

interface EntityBox {
  name: string;
  columns: { name: string; type: string; note?: string; isShadow?: boolean; isFK?: boolean }[];
}

function getShadowVisible(showShadow: boolean, fkMode: FKMode): boolean {
  return showShadow;
}

function getCustomerEntity(showShadow: boolean): EntityBox {
  return {
    name: "Customers",
    columns: [
      { name: "Id", type: "int", note: "PK" },
      { name: "Name", type: "nvarchar(200)" },
      { name: "Email", type: "nvarchar(200)" },
    ],
  };
}

function getOrderEntity(fkMode: FKMode, showShadow: boolean): EntityBox {
  const cols: EntityBox["columns"] = [
    { name: "Id", type: "int", note: "PK" },
    { name: "PlacedAt", type: "datetime2" },
    { name: "TotalAmount", type: "decimal(18,2)" },
  ];

  if (fkMode === "required") {
    cols.push({ name: "CustomerId", type: "int NOT NULL", note: "FK", isFK: true });
  } else {
    if (showShadow) {
      cols.push({ name: "CustomerId", type: "int NULL", note: "FK (shadow)", isFK: true, isShadow: true });
    } else {
      cols.push({ name: "CustomerId", type: "int NULL", note: "FK (hidden)", isFK: true, isShadow: true });
    }
  }

  return { name: "Orders", columns: cols };
}

function getOrderItemEntity(): EntityBox {
  return {
    name: "OrderItems",
    columns: [
      { name: "Id", type: "int", note: "PK" },
      { name: "OrderId", type: "int NOT NULL", note: "FK", isFK: true },
      { name: "ProductId", type: "int NOT NULL", note: "FK", isFK: true },
      { name: "Quantity", type: "int" },
      { name: "UnitPrice", type: "decimal(18,2)" },
    ],
  };
}

function getManyToManyEntities(showShadow: boolean): { products: EntityBox; tags: EntityBox; join: EntityBox } {
  const join: EntityBox = {
    name: "ProductTag (join table)",
    columns: showShadow
      ? [
          { name: "ProductsId", type: "int NOT NULL", note: "FK (shadow)", isFK: true, isShadow: true },
          { name: "TagsId", type: "int NOT NULL", note: "FK (shadow)", isFK: true, isShadow: true },
        ]
      : [
          { name: "ProductId", type: "int NOT NULL", note: "FK (explicit)", isFK: true },
          { name: "TagId", type: "int NOT NULL", note: "FK (explicit)", isFK: true },
          { name: "TaggedAt", type: "datetime2", note: "payload" },
          { name: "TaggedBy", type: "nvarchar(100)", note: "payload" },
        ],
  };

  return {
    products: {
      name: "Products",
      columns: [
        { name: "Id", type: "int", note: "PK" },
        { name: "Name", type: "nvarchar(200)" },
        { name: "Price", type: "decimal(18,2)" },
      ],
    },
    tags: {
      name: "Tags",
      columns: [
        { name: "Id", type: "int", note: "PK" },
        { name: "Label", type: "nvarchar(100)" },
      ],
    },
    join,
  };
}

function getOwnedEntities(): { customer: EntityBox; ownedInline: EntityBox } {
  return {
    customer: {
      name: "Customers (with owned Address)",
      columns: [
        { name: "Id", type: "int", note: "PK" },
        { name: "Name", type: "nvarchar(200)" },
        { name: "Email", type: "nvarchar(200)" },
        { name: "ShippingAddress_Street", type: "nvarchar(200)", note: "owned" },
        { name: "ShippingAddress_City", type: "nvarchar(100)", note: "owned" },
        { name: "ShippingAddress_PostCode", type: "nvarchar(20)", note: "owned" },
      ],
    },
    ownedInline: {
      name: "[Owned] Address",
      columns: [
        { name: "Street", type: "string" },
        { name: "City", type: "string" },
        { name: "PostCode", type: "string" },
      ],
    },
  };
}

function EntityTable({ entity, highlight }: { entity: EntityBox; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl border overflow-hidden text-xs font-mono ${
        highlight
          ? "border-amber-500/50 bg-amber-500/5"
          : "border-border bg-elevated"
      }`}
    >
      <div
        className={`px-3 py-2 font-semibold text-[11px] uppercase tracking-wider ${
          highlight ? "bg-amber-500/15 text-amber-400" : "bg-background/40 text-text-secondary"
        }`}
      >
        {entity.name}
      </div>
      <div className="divide-y divide-border/40">
        {entity.columns.map((col, i) => (
          <div
            key={i}
            className={`px-3 py-1.5 flex items-center gap-2 ${
              col.isShadow
                ? "bg-violet-500/8 border-l-2 border-l-violet-400/40"
                : col.isFK
                ? "bg-sky-500/5 border-l-2 border-l-sky-400/30"
                : ""
            }`}
          >
            <span
              className={
                col.isShadow
                  ? "text-violet-300"
                  : col.isFK
                  ? "text-sky-300"
                  : "text-text-primary"
              }
            >
              {col.name}
            </span>
            <span className="text-text-secondary/50 flex-1">{col.type}</span>
            {col.note && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  col.note.includes("shadow")
                    ? "bg-violet-500/20 text-violet-400"
                    : col.note === "owned"
                    ? "bg-amber-500/20 text-amber-400"
                    : col.note === "payload"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : col.note === "PK"
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-sky-500/15 text-sky-400"
                }`}
              >
                {col.note}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Arrow({ label, color = "border-text-secondary/30" }: { label?: string; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-1">
      <div className={`w-px h-5 border-l-2 border-dashed ${color}`} />
      {label && (
        <span className="text-[10px] font-mono text-text-secondary/60 px-1.5 py-0.5 rounded bg-elevated border border-border">
          {label}
        </span>
      )}
      <div className={`w-px h-5 border-l-2 border-dashed ${color}`} />
    </div>
  );
}

function SqlSchema({ sql }: { sql: string }) {
  return (
    <pre className="text-[11px] font-mono leading-relaxed text-sky-300/80 whitespace-pre-wrap">
      {sql}
    </pre>
  );
}

function getOneToManySql(fkMode: FKMode, deleteBehavior: DeleteBehavior): string {
  const nullable = fkMode === "optional" ? "NULL" : "NOT NULL";
  const onDelete = deleteBehavior === "cascade" ? "CASCADE" : "RESTRICT";
  return `ALTER TABLE [Orders]
  ADD CONSTRAINT [FK_Orders_Customers_CustomerId]
  FOREIGN KEY ([CustomerId])
  REFERENCES [Customers] ([Id])
  ON DELETE ${onDelete};

-- CustomerId is ${nullable}
-- ${fkMode === "optional" ? "Shadow property — no C# FK property on Order" : "Explicit FK property on Order"}`;
}

function getManyToManySql(showShadow: boolean): string {
  if (showShadow) {
    return `-- Implicit join table (no explicit join entity)
CREATE TABLE [ProductTag] (
    [ProductsId] INT NOT NULL,
    [TagsId]     INT NOT NULL,
    CONSTRAINT [PK_ProductTag] PRIMARY KEY ([ProductsId], [TagsId]),
    CONSTRAINT [FK_ProductTag_Products_ProductsId] FOREIGN KEY ([ProductsId]) REFERENCES [Products]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ProductTag_Tags_TagsId] FOREIGN KEY ([TagsId]) REFERENCES [Tags]([Id]) ON DELETE CASCADE
);
-- Shadow FK names: ProductsId, TagsId (EF convention: pluralized nav name + Id)
-- Cannot add payload columns to this table via EF`;
  }
  return `-- Explicit join entity (ProductTag class)
CREATE TABLE [ProductTag] (
    [ProductId]  INT NOT NULL,
    [TagId]      INT NOT NULL,
    [TaggedAt]   DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [TaggedBy]   NVARCHAR(100) NOT NULL,
    CONSTRAINT [PK_ProductTag] PRIMARY KEY ([ProductId], [TagId]),
    CONSTRAINT [FK_ProductTag_Products] FOREIGN KEY ([ProductId]) REFERENCES [Products]([Id]),
    CONSTRAINT [FK_ProductTag_Tags]     FOREIGN KEY ([TagId])     REFERENCES [Tags]([Id])
);
-- Payload columns enabled — TaggedAt, TaggedBy`;
}

function getOwnedSql(): string {
  return `-- Owned type maps to OWNER's table (no JOIN needed)
CREATE TABLE [Customers] (
    [Id]                        INT IDENTITY PRIMARY KEY,
    [Name]                      NVARCHAR(200) NOT NULL,
    [Email]                     NVARCHAR(200) NOT NULL,
    [ShippingAddress_Street]    NVARCHAR(200) NOT NULL,
    [ShippingAddress_City]      NVARCHAR(100) NOT NULL,
    [ShippingAddress_PostCode]  NVARCHAR(20) NOT NULL
);
-- No separate CustomerAddresses table
-- No JOIN required to load Address
-- If moved to .ToTable("CustomerAddresses"), Include() becomes required`;
}

export default function RelationshipsVisualizer() {
  const [relType, setRelType] = useState<RelType>("one-to-many");
  const [fkMode, setFKMode] = useState<FKMode>("required");
  const [deleteBehavior, setDeleteBehavior] = useState<DeleteBehavior>("cascade");
  const [showShadow, setShowShadow] = useState(false);

  const relTabs: { id: RelType; label: string }[] = [
    { id: "one-to-many", label: "1 → Many" },
    { id: "many-to-many", label: "Many ↔ Many" },
    { id: "owned", label: "Owned Type" },
  ];

  const customer = getCustomerEntity(showShadow);
  const order = getOrderEntity(fkMode, showShadow);
  const orderItem = getOrderItemEntity();
  const { products, tags, join } = getManyToManyEntities(showShadow);
  const { customer: ownedCustomer } = getOwnedEntities();

  return (
    <div className="space-y-4">
      {/* Tab selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-elevated border border-border">
          {relTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRelType(tab.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-mono transition-all ${
                relType === tab.id
                  ? "text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
              style={relType === tab.id ? { backgroundColor: "#f59e0b" } : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowShadow((v) => !v)}
          className={`px-3 py-1.5 rounded-lg border text-sm font-mono transition-all ${
            showShadow
              ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
              : "bg-elevated border-border text-text-secondary hover:text-text-primary"
          }`}
        >
          {showShadow ? "👻 Shadow props ON" : "👻 Show shadow props"}
        </button>
      </div>

      {/* Controls row — only for 1-to-many */}
      <AnimatePresence>
        {relType === "one-to-many" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 flex-wrap overflow-hidden"
          >
            {/* FK mode toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-elevated border border-border">
              {(["required", "optional"] as FKMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setFKMode(m)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
                    fkMode === m
                      ? "bg-sky-500/30 text-sky-300 border border-sky-500/40"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  FK: {m}
                </button>
              ))}
            </div>

            {/* Delete behavior toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-elevated border border-border">
              {(["cascade", "restrict"] as DeleteBehavior[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDeleteBehavior(d)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
                    deleteBehavior === d
                      ? d === "cascade"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {d === "cascade" ? "⚡ CASCADE" : "🛡 RESTRICT"}
                </button>
              ))}
            </div>

            {deleteBehavior === "cascade" && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-red-400 font-mono bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg"
              >
                ⚠ Deleting Customer will delete all Orders and OrderItems
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main diagram area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Entity diagram */}
        <Panel title="Schema Diagram" accentColor="#f59e0b">
          <div className="space-y-1">
            <AnimatePresence mode="wait">
              {relType === "one-to-many" && (
                <motion.div
                  key="one-to-many"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-1"
                >
                  <EntityTable entity={customer} />
                  <Arrow
                    label={`1 → many (${deleteBehavior === "cascade" ? "CASCADE" : "RESTRICT"})`}
                    color={deleteBehavior === "cascade" ? "border-red-400/40" : "border-emerald-400/40"}
                  />
                  <EntityTable entity={order} />
                  <Arrow label="1 → many (CASCADE)" color="border-border" />
                  <EntityTable entity={orderItem} />

                  {/* Shadow property legend */}
                  {showShadow && fkMode === "optional" && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 p-3 rounded-xl border border-violet-500/25 bg-violet-500/8"
                    >
                      <p className="text-[11px] font-mono text-violet-300">
                        <span className="font-bold">Shadow property:</span> EF generates{" "}
                        <code className="bg-violet-500/20 px-1 rounded">CustomerId</code> on Orders
                        internally. No C# property on your Order class, but the column exists in the DB
                        and can be read via{" "}
                        <code className="bg-violet-500/20 px-1 rounded">
                          Entry(order).Property&lt;int?&gt;("CustomerId")
                        </code>
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {relType === "many-to-many" && (
                <motion.div
                  key="many-to-many"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-1"
                >
                  <EntityTable entity={products} />
                  <Arrow label="many ↔ many" color="border-amber-400/40" />
                  <EntityTable entity={join} highlight />
                  <Arrow label="many ↔ many" color="border-amber-400/40" />
                  <EntityTable entity={tags} />

                  {showShadow ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 p-3 rounded-xl border border-violet-500/25 bg-violet-500/8"
                    >
                      <p className="text-[11px] font-mono text-violet-300">
                        <span className="font-bold">Implicit join table:</span> EF generates shadow FK
                        columns using pluralized nav names.{" "}
                        <code className="bg-violet-500/20 px-1 rounded">ProductsId</code> /{" "}
                        <code className="bg-violet-500/20 px-1 rounded">TagsId</code>. Cannot add payload
                        columns. Toggle off shadow props to see explicit join entity with payload.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/8"
                    >
                      <p className="text-[11px] font-mono text-emerald-300">
                        <span className="font-bold">Explicit join entity:</span> ProductTag class allows
                        payload columns (TaggedAt, TaggedBy). Requires explicit join entity in your C#
                        model. Both Product and Tag have <code className="bg-emerald-500/20 px-1 rounded">ICollection&lt;ProductTag&gt;</code> navs.
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {relType === "owned" && (
                <motion.div
                  key="owned"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <EntityTable entity={ownedCustomer} />
                  <div className="p-3 rounded-xl border border-amber-500/25 bg-amber-500/8">
                    <p className="text-[11px] font-mono text-amber-300">
                      <span className="font-bold">[Owned] Address</span> maps inline into Customers
                      table as{" "}
                      <code className="bg-amber-500/20 px-1 rounded">ShippingAddress_*</code>{" "}
                      columns. No JOIN needed. No separate table. Loaded automatically with Customer.
                    </p>
                    <p className="text-[11px] font-mono text-amber-300/70 mt-2">
                      ⚠ If you add <code className="bg-amber-500/20 px-1 rounded">.ToTable("CustomerAddresses")</code>,
                      the owned type moves to a separate table and requires explicit{" "}
                      <code className="bg-amber-500/20 px-1 rounded">.Include(c =&gt; c.ShippingAddress)</code>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Panel>

        {/* Generated SQL */}
        <Panel title="Generated SQL (Migration Output)" accentColor="#06B6D4">
          <AnimatePresence mode="wait">
            {relType === "one-to-many" && (
              <motion.div
                key="sql-1m"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SqlSchema sql={getOneToManySql(fkMode, deleteBehavior)} />
              </motion.div>
            )}
            {relType === "many-to-many" && (
              <motion.div
                key="sql-mm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SqlSchema sql={getManyToManySql(showShadow)} />
              </motion.div>
            )}
            {relType === "owned" && (
              <motion.div
                key="sql-owned"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SqlSchema sql={getOwnedSql()} />
              </motion.div>
            )}
          </AnimatePresence>
        </Panel>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-[11px] font-mono">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-sky-500/30 border border-sky-400/40" />
          <span className="text-text-secondary">Foreign key column</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-violet-500/30 border border-violet-400/40" />
          <span className="text-text-secondary">Shadow property (no C# field)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-amber-500/30 border border-amber-400/40" />
          <span className="text-text-secondary">Owned type column</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-400/40" />
          <span className="text-text-secondary">Payload column</span>
        </div>
      </div>
    </div>
  );
}
