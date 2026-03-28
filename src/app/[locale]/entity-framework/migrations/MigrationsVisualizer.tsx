"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

interface ModelChange {
  id: string;
  label: string;
  description: string;
  diffType: "added" | "modified" | "removed";
  upSql: string;
  downSql: string;
  warning?: string;
}

const AVAILABLE_CHANGES: ModelChange[] = [
  {
    id: "add-column",
    label: "Add nullable column",
    description: "Add ShippedAt DateTime? to Orders",
    diffType: "added",
    upSql: `migrationBuilder.AddColumn<DateTime>(
    name: "ShippedAt",
    table: "Orders",
    type: "datetime2",
    nullable: true);`,
    downSql: `migrationBuilder.DropColumn(
    name: "ShippedAt",
    table: "Orders");`,
  },
  {
    id: "add-index",
    label: "Add index",
    description: "Create IX_Orders_Status for query performance",
    diffType: "added",
    upSql: `migrationBuilder.CreateIndex(
    name: "IX_Orders_Status",
    table: "Orders",
    column: "Status",
    filter: "[Status] IS NOT NULL");`,
    downSql: `migrationBuilder.DropIndex(
    name: "IX_Orders_Status",
    table: "Orders");`,
  },
  {
    id: "rename-column",
    label: "Rename column ⚠",
    description: "Rename Address → ShippingAddress (EF sees DROP + ADD!)",
    diffType: "modified",
    upSql: `// ⚠ EF GENERATES THIS — DATA LOSS!
migrationBuilder.DropColumn(
    name: "Address",
    table: "Orders");

migrationBuilder.AddColumn<string>(
    name: "ShippingAddress",
    table: "Orders",
    nullable: true);

// SHOULD BE MANUALLY CHANGED TO:
// migrationBuilder.RenameColumn(
//     "Address", "Orders", "ShippingAddress");`,
    downSql: `migrationBuilder.DropColumn(
    name: "ShippingAddress",
    table: "Orders");

migrationBuilder.AddColumn<string>(
    name: "Address",
    table: "Orders");`,
    warning: "EF generates DROP + ADD, not RENAME. All existing data will be lost!",
  },
  {
    id: "add-nonnullable",
    label: "Add NOT NULL column ⚠",
    description: "Add Region string (NOT NULL) — locks table in SQL Server",
    diffType: "added",
    upSql: `// ⚠ LOCKS TABLE DURING BACKFILL ON LARGE TABLES
migrationBuilder.AddColumn<string>(
    name: "Region",
    table: "Orders",
    type: "nvarchar(50)",
    nullable: false,
    defaultValue: "");   // forces full table rewrite`,
    downSql: `migrationBuilder.DropColumn(
    name: "Region",
    table: "Orders");`,
    warning: "NOT NULL without a default causes SQL Server to lock and rewrite the entire table during migration.",
  },
  {
    id: "drop-table",
    label: "Drop table ⚠",
    description: "Drop legacy AuditLogs table",
    diffType: "removed",
    upSql: `// ⚠ DESTRUCTIVE — no recovery without Down() + backup
migrationBuilder.DropTable(
    name: "AuditLogs");`,
    downSql: `migrationBuilder.CreateTable(
    name: "AuditLogs",
    columns: table => new {
        Id = table.Column<int>(nullable: false)
            .Annotation("SqlServer:Identity", "1, 1"),
        Message = table.Column<string>(nullable: true),
        CreatedAt = table.Column<DateTime>(nullable: false)
    },
    constraints: table => {
        table.PrimaryKey("PK_AuditLogs", x => x.Id);
    });`,
    warning: "Drops all data in AuditLogs permanently. Down() recreates the structure but not the data.",
  },
];

type ApplyStage = "idle" | "checking-history" | "running-up" | "updating-history" | "done";

export default function MigrationsVisualizer() {
  const [selectedChanges, setSelectedChanges] = useState<ModelChange[]>([]);
  const [activeTab, setActiveTab] = useState<"up" | "down">("up");
  const [applyStage, setApplyStage] = useState<ApplyStage>("idle");
  const [appliedMigrations, setAppliedMigrations] = useState<string[]>(["20240101_InitialCreate", "20240310_AddCustomerEmail"]);
  const [applying, setApplying] = useState(false);

  const toggleChange = useCallback((change: ModelChange) => {
    setSelectedChanges(prev => {
      const exists = prev.find(c => c.id === change.id);
      if (exists) return prev.filter(c => c.id !== change.id);
      return [...prev, change];
    });
    setApplyStage("idle");
  }, []);

  const applyMigration = useCallback(async () => {
    if (selectedChanges.length === 0) return;
    setApplying(true);

    setApplyStage("checking-history");
    await sleep(600);
    setApplyStage("running-up");
    await sleep(1200);
    setApplyStage("updating-history");
    await sleep(600);

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const migrationName = `${timestamp}_${selectedChanges.map(c => c.id).join("_")}`;
    setAppliedMigrations(prev => [...prev, migrationName]);

    setApplyStage("done");
    setApplying(false);
  }, [selectedChanges]);

  const reset = useCallback(() => {
    setSelectedChanges([]);
    setApplyStage("idle");
    setAppliedMigrations(["20240101_InitialCreate", "20240310_AddCustomerEmail"]);
    setApplying(false);
  }, []);

  const hasWarnings = selectedChanges.some(c => c.warning);

  function getDiffColor(type: ModelChange["diffType"]) {
    if (type === "added") return { border: "border-emerald-700/50", bg: "bg-emerald-950/30", text: "text-emerald-400", badge: "bg-emerald-900/50 text-emerald-400 border-emerald-700/50" };
    if (type === "modified") return { border: "border-amber-500/50", bg: "bg-amber-950/30", text: "text-amber-400", badge: "bg-amber-900/50 text-amber-400 border-amber-700/50" };
    return { border: "border-red-600/50", bg: "bg-red-950/30", text: "text-red-400", badge: "bg-red-900/50 text-red-400 border-red-700/50" };
  }

  const APPLY_STAGES: { key: ApplyStage; label: string }[] = [
    { key: "checking-history", label: "Check __EFMigrationsHistory" },
    { key: "running-up", label: "Execute Up() SQL" },
    { key: "updating-history", label: "INSERT into __EFMigrationsHistory" },
    { key: "done", label: "Migration applied" },
  ];

  const stageIndex = (s: ApplyStage) => APPLY_STAGES.findIndex(x => x.key === s);

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={applyMigration}
          disabled={applying || selectedChanges.length === 0 || applyStage === "done"}
          size="sm"
          style={{ background: "#f59e0b", color: "#000" } as React.CSSProperties}
        >
          {applying ? "Applying..." : "Apply Migration"}
        </Button>
        <Button variant="secondary" size="sm" onClick={reset}>Reset</Button>
        <span className="text-xs text-text-secondary font-mono ml-1">
          Select model changes to generate a migration diff
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Change picker */}
        <Panel title="Model Changes" accentColor="#f59e0b">
          <div className="space-y-1.5">
            {AVAILABLE_CHANGES.map(change => {
              const selected = selectedChanges.some(c => c.id === change.id);
              const colors = getDiffColor(change.diffType);
              return (
                <motion.button
                  key={change.id}
                  onClick={() => toggleChange(change)}
                  whileHover={{ x: 2 }}
                  className={`w-full text-left text-xs font-mono px-3 py-2.5 rounded-lg border transition-all ${
                    selected ? `${colors.border} ${colors.bg}` : "border-border bg-background/30 hover:border-border/60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={selected ? colors.text : "text-text-primary"}>{change.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase ${colors.badge}`}>
                        {change.diffType}
                      </span>
                      {selected && <span className={colors.text}>✓</span>}
                    </div>
                  </div>
                  <div className="text-[10px] text-text-secondary/70">{change.description}</div>
                  {change.warning && <div className="text-[10px] text-amber-500 mt-1">⚠ {change.warning}</div>}
                </motion.button>
              );
            })}
          </div>
        </Panel>

        {/* Migration diff */}
        <Panel title="Generated Migration" accentColor="#f59e0b">
          {selectedChanges.length === 0 ? (
            <p className="text-xs text-text-secondary font-mono opacity-50">
              Select model changes to see generated migration code
            </p>
          ) : (
            <div className="space-y-2">
              {/* Tab switcher */}
              <div className="flex gap-1 mb-3">
                <button
                  onClick={() => setActiveTab("up")}
                  className={`text-[11px] px-3 py-1 rounded font-mono border transition-all ${
                    activeTab === "up" ? "border-amber-500/50 bg-amber-950/30 text-amber-400" : "border-border text-text-secondary"
                  }`}
                >
                  Up()
                </button>
                <button
                  onClick={() => setActiveTab("down")}
                  className={`text-[11px] px-3 py-1 rounded font-mono border transition-all ${
                    activeTab === "down" ? "border-cyan-500/50 bg-cyan-950/30 text-cyan-400" : "border-border text-text-secondary"
                  }`}
                >
                  Down()
                </button>
              </div>

              {selectedChanges.map((change, i) => {
                const colors = getDiffColor(change.diffType);
                return (
                  <motion.div
                    key={change.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`rounded-lg border p-2.5 ${colors.border} ${colors.bg}`}
                  >
                    <div className={`text-[10px] font-mono font-semibold mb-1.5 ${colors.text}`}>
                      // {change.label}
                    </div>
                    <pre className="text-[10px] font-mono text-text-primary whitespace-pre-wrap leading-relaxed">
                      {activeTab === "up" ? change.upSql : change.downSql}
                    </pre>
                  </motion.div>
                );
              })}

              {hasWarnings && (
                <div className="mt-1 text-[10px] font-mono text-amber-500 border border-amber-500/30 bg-amber-950/20 rounded p-2">
                  ⚠ Review this migration carefully before applying to production — destructive operations detected
                </div>
              )}
            </div>
          )}
        </Panel>

        {/* Apply pipeline + history */}
        <div className="space-y-3">
          <Panel title="Apply Pipeline" accentColor="#f59e0b">
            <div className="space-y-1.5">
              {APPLY_STAGES.map((s, i) => {
                const active = applyStage === s.key;
                const done = applyStage !== "idle" && stageIndex(applyStage) > i;
                const isDone = s.key === "done" && applyStage === "done";
                return (
                  <motion.div
                    key={s.key}
                    animate={{ opacity: active || isDone ? 1 : done ? 0.7 : 0.3 }}
                    className={`flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-lg border transition-all ${
                      isDone ? "border-amber-500/40 bg-amber-950/20 text-amber-300"
                      : active ? "border-amber-500/50 bg-amber-950/30 text-amber-300"
                      : done ? "border-emerald-700/40 bg-emerald-950/20 text-emerald-400"
                      : "border-border/40 text-text-secondary"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      isDone ? "bg-amber-400"
                      : active ? "bg-amber-400 animate-pulse"
                      : done ? "bg-emerald-400"
                      : "bg-border"
                    }`} />
                    <span className="flex-1">{s.label}</span>
                    {(done || isDone) && <span className="text-[10px]">✓</span>}
                    {active && !isDone && <span className="text-[10px] animate-pulse">running</span>}
                  </motion.div>
                );
              })}
            </div>
          </Panel>

          {/* __EFMigrationsHistory table */}
          <Panel title="__EFMigrationsHistory" accentColor="#f59e0b">
            <div className="space-y-1">
              <div className="flex text-[9px] font-mono text-text-secondary/60 px-1 mb-1.5 uppercase">
                <span className="flex-1">MigrationId</span>
                <span className="w-16 text-right">EF Version</span>
              </div>
              {appliedMigrations.map((m, i) => (
                <motion.div
                  key={m}
                  initial={i === appliedMigrations.length - 1 && applyStage === "done" ? { opacity: 0, x: -6 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center gap-2 text-[10px] font-mono px-2 py-1.5 rounded border ${
                    i === appliedMigrations.length - 1 && applyStage === "done"
                      ? "border-amber-500/40 bg-amber-950/20 text-amber-300"
                      : "border-border/40 bg-background/20 text-text-secondary"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="flex-1 truncate">{m}</span>
                  <span className="text-text-secondary/40 w-16 text-right">9.0.0</span>
                </motion.div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
