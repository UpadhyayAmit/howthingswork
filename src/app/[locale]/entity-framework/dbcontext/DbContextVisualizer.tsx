"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type EntityState = "Detached" | "Unchanged" | "Added" | "Modified" | "Deleted";

interface TrackedEntity {
  id: string;
  type: string;
  key: string;
  state: EntityState;
  properties: { name: string; original: string; current: string; changed: boolean }[];
}

interface GeneratedSql {
  entityId: string;
  sql: string;
  type: "INSERT" | "UPDATE" | "DELETE" | "NONE";
}

const STATE_COLORS: Record<EntityState, { bg: string; border: string; text: string }> = {
  Detached:  { bg: "bg-zinc-800/60",   border: "border-zinc-600",    text: "text-zinc-400" },
  Unchanged: { bg: "bg-emerald-950/40", border: "border-emerald-700/50", text: "text-emerald-400" },
  Added:     { bg: "bg-blue-950/40",   border: "border-blue-600/50", text: "text-blue-400" },
  Modified:  { bg: "bg-amber-950/40",  border: "border-amber-500/50", text: "text-amber-400" },
  Deleted:   { bg: "bg-red-950/40",    border: "border-red-600/50",  text: "text-red-400" },
};

const STATE_DOT: Record<EntityState, string> = {
  Detached:  "bg-zinc-500",
  Unchanged: "bg-emerald-400",
  Added:     "bg-blue-400",
  Modified:  "bg-amber-400",
  Deleted:   "bg-red-400",
};

const INITIAL_ENTITIES: TrackedEntity[] = [
  {
    id: "order-1",
    type: "Order",
    key: "Id = 42",
    state: "Detached",
    properties: [
      { name: "Id",     original: "42",      current: "42",      changed: false },
      { name: "Status", original: "Pending", current: "Pending", changed: false },
      { name: "Total",  original: "$120.00", current: "$120.00", changed: false },
    ],
  },
  {
    id: "customer-1",
    type: "Customer",
    key: "Id = 7",
    state: "Detached",
    properties: [
      { name: "Id",    original: "7",           current: "7",           changed: false },
      { name: "Name",  original: "Alice Martin", current: "Alice Martin", changed: false },
      { name: "Email", original: "alice@co.com", current: "alice@co.com", changed: false },
    ],
  },
  {
    id: "product-1",
    type: "Product",
    key: "Id = 99",
    state: "Detached",
    properties: [
      { name: "Id",    original: "99",     current: "99",     changed: false },
      { name: "Name",  original: "Widget", current: "Widget", changed: false },
      { name: "Stock", original: "250",    current: "250",    changed: false },
    ],
  },
];

function buildSql(entity: TrackedEntity): GeneratedSql {
  if (entity.state === "Added") {
    const cols = entity.properties.filter(p => p.name !== "Id").map(p => p.name).join(", ");
    const vals = entity.properties.filter(p => p.name !== "Id").map(p => `'${p.current}'`).join(", ");
    return {
      entityId: entity.id,
      type: "INSERT",
      sql: `INSERT INTO ${entity.type}s (${cols})\nVALUES (${vals});\n-- RETURNING Id`,
    };
  }
  if (entity.state === "Modified") {
    const changed = entity.properties.filter(p => p.changed);
    const sets = changed.map(p => `    ${p.name} = '${p.current}'`).join(",\n");
    const key = entity.properties.find(p => p.name === "Id");
    return {
      entityId: entity.id,
      type: "UPDATE",
      sql: `UPDATE ${entity.type}s\nSET\n${sets}\nWHERE Id = ${key?.current ?? "?"};`,
    };
  }
  if (entity.state === "Deleted") {
    const key = entity.properties.find(p => p.name === "Id");
    return {
      entityId: entity.id,
      type: "DELETE",
      sql: `DELETE FROM ${entity.type}s\nWHERE Id = ${key?.current ?? "?"};`,
    };
  }
  return { entityId: entity.id, type: "NONE", sql: "-- No changes detected" };
}

export default function DbContextVisualizer() {
  const [entities, setEntities] = useState<TrackedEntity[]>(INITIAL_ENTITIES);
  const [saving, setSaving] = useState(false);
  const [sqlLog, setSqlLog] = useState<GeneratedSql[]>([]);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [activeEntity, setActiveEntity] = useState<string | null>(null);
  const [migrationsHistoryUpdated, setMigrationsHistoryUpdated] = useState(false);

  const updateEntity = useCallback((id: string, updater: (e: TrackedEntity) => TrackedEntity) => {
    setEntities(prev => prev.map(e => e.id === id ? updater(e) : e));
    setSqlLog([]);
    setSavedCount(null);
    setMigrationsHistoryUpdated(false);
  }, []);

  const loadEntity = useCallback((id: string) => {
    updateEntity(id, e => ({ ...e, state: "Unchanged" }));
  }, [updateEntity]);

  const modifyEntity = useCallback((id: string) => {
    updateEntity(id, e => {
      if (e.state === "Detached") return e;
      const props = e.properties.map((p, i) => {
        if (i === 1) {
          const newVal = e.type === "Order" ? "Shipped"
            : e.type === "Customer" ? "alice@newdomain.com"
            : "199";
          return { ...p, current: newVal, changed: true };
        }
        return p;
      });
      return { ...e, state: "Modified", properties: props };
    });
  }, [updateEntity]);

  const addEntity = useCallback((id: string) => {
    updateEntity(id, e => {
      const newProps = e.properties.map((p, i) => {
        if (p.name === "Id") return { ...p, original: "(new)", current: "(new)" };
        if (i === 1) {
          const newVal = e.type === "Order" ? "Processing"
            : e.type === "Customer" ? "Bob Smith"
            : "WidgetPro";
          return { ...p, original: newVal, current: newVal };
        }
        return p;
      });
      return { ...e, state: "Added", properties: newProps };
    });
  }, [updateEntity]);

  const deleteEntity = useCallback((id: string) => {
    updateEntity(id, e => {
      if (e.state === "Detached") return e;
      return { ...e, state: "Deleted" };
    });
  }, [updateEntity]);

  const detachEntity = useCallback((id: string) => {
    updateEntity(id, e => ({
      ...INITIAL_ENTITIES.find(ie => ie.id === id)!,
      state: "Detached",
    }));
  }, [updateEntity]);

  const saveChanges = useCallback(async () => {
    setSaving(true);
    setSqlLog([]);
    setSavedCount(null);

    const pending = entities.filter(e => ["Added", "Modified", "Deleted"].includes(e.state));
    if (pending.length === 0) {
      setSaving(false);
      setSavedCount(0);
      return;
    }

    const generated: GeneratedSql[] = [];
    for (const entity of pending) {
      await sleep(400);
      const sql = buildSql(entity);
      generated.push(sql);
      setSqlLog([...generated]);
    }

    await sleep(400);

    setEntities(prev =>
      prev.map(e => {
        if (e.state === "Added" || e.state === "Modified") return { ...e, state: "Unchanged" };
        if (e.state === "Deleted") return { ...INITIAL_ENTITIES.find(ie => ie.id === e.id)!, state: "Detached" };
        return e;
      })
    );

    setSavedCount(pending.length);
    setMigrationsHistoryUpdated(true);
    setSaving(false);
  }, [entities]);

  const reset = useCallback(() => {
    setEntities(INITIAL_ENTITIES);
    setSqlLog([]);
    setSavedCount(null);
    setActiveEntity(null);
    setMigrationsHistoryUpdated(false);
  }, []);

  const STATE_MACHINE: { from: EntityState; to: EntityState; label: string }[] = [
    { from: "Detached", to: "Unchanged", label: "Load / Attach" },
    { from: "Unchanged", to: "Modified", label: "Modify property" },
    { from: "Unchanged", to: "Deleted", label: "Remove()" },
    { from: "Detached", to: "Added", label: "Add() / new" },
    { from: "Added", to: "Detached", label: "SaveChanges" },
    { from: "Modified", to: "Unchanged", label: "SaveChanges" },
    { from: "Deleted", to: "Detached", label: "SaveChanges" },
  ];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={saveChanges} disabled={saving} size="sm" style={{ background: "#f59e0b", color: "#000" } as React.CSSProperties}>
          {saving ? "Saving..." : "SaveChanges()"}
        </Button>
        <Button variant="secondary" size="sm" onClick={reset}>
          Reset
        </Button>
        <span className="text-xs text-text-secondary font-mono ml-2">
          Click an entity card, then use the operation buttons below it
        </span>
      </div>

      {/* Entity state machine legend */}
      <Panel title="EntityState Machine" accentColor="#f59e0b">
        <div className="flex flex-wrap gap-3 text-xs font-mono">
          {(["Detached", "Unchanged", "Added", "Modified", "Deleted"] as EntityState[]).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${STATE_DOT[s]}`} />
              <span className={STATE_COLORS[s].text}>{s}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {STATE_MACHINE.map((t, i) => (
            <div key={i} className="flex items-center gap-1 text-[11px] text-text-secondary bg-background/40 border border-border/50 rounded px-2 py-0.5">
              <span className={STATE_COLORS[t.from].text}>{t.from}</span>
              <span className="text-border mx-0.5">→</span>
              <span className={STATE_COLORS[t.to].text}>{t.to}</span>
              <span className="text-text-secondary/50 ml-1">({t.label})</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Entity cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {entities.map(entity => {
          const colors = STATE_COLORS[entity.state];
          const isActive = activeEntity === entity.id;
          return (
            <motion.div
              key={entity.id}
              layout
              className={`rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${colors.bg} ${colors.border} ${isActive ? "ring-2 ring-amber-500/50" : ""}`}
              onClick={() => setActiveEntity(isActive ? null : entity.id)}
              animate={{ scale: isActive ? 1.02 : 1 }}
            >
              {/* Header */}
              <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${STATE_DOT[entity.state]}`} />
                  <span className="text-sm font-semibold font-mono text-text-primary">{entity.type}</span>
                  <span className="text-xs text-text-secondary font-mono">({entity.key})</span>
                </div>
                <motion.span
                  key={entity.state}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${colors.text} ${colors.border} ${colors.bg}`}
                >
                  {entity.state}
                </motion.span>
              </div>

              {/* Properties */}
              <div className="px-3 py-2 space-y-1">
                {entity.properties.map(prop => (
                  <div key={prop.name} className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-text-secondary w-12 shrink-0">{prop.name}:</span>
                    <span className={prop.changed ? "text-amber-400 font-semibold" : "text-text-primary"}>
                      {prop.current}
                    </span>
                    {prop.changed && (
                      <span className="text-text-secondary/50 line-through">{prop.original}</span>
                    )}
                    {prop.changed && (
                      <span className="text-amber-500 text-[10px]">modified</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Operation buttons */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border/40 px-3 py-2 flex flex-wrap gap-1.5"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => loadEntity(entity.id)}
                      disabled={entity.state !== "Detached"}
                      className="text-[11px] px-2 py-1 rounded bg-emerald-900/50 border border-emerald-700/50 text-emerald-400 disabled:opacity-30 hover:bg-emerald-800/50 transition-colors"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => modifyEntity(entity.id)}
                      disabled={entity.state === "Detached" || entity.state === "Deleted"}
                      className="text-[11px] px-2 py-1 rounded bg-amber-900/50 border border-amber-700/50 text-amber-400 disabled:opacity-30 hover:bg-amber-800/50 transition-colors"
                    >
                      Modify
                    </button>
                    <button
                      onClick={() => addEntity(entity.id)}
                      disabled={entity.state !== "Detached"}
                      className="text-[11px] px-2 py-1 rounded bg-blue-900/50 border border-blue-700/50 text-blue-400 disabled:opacity-30 hover:bg-blue-800/50 transition-colors"
                    >
                      Add New
                    </button>
                    <button
                      onClick={() => deleteEntity(entity.id)}
                      disabled={entity.state === "Detached" || entity.state === "Added"}
                      className="text-[11px] px-2 py-1 rounded bg-red-900/50 border border-red-700/50 text-red-400 disabled:opacity-30 hover:bg-red-800/50 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => detachEntity(entity.id)}
                      disabled={entity.state === "Detached"}
                      className="text-[11px] px-2 py-1 rounded bg-zinc-800/80 border border-zinc-600/50 text-zinc-400 disabled:opacity-30 hover:bg-zinc-700/80 transition-colors"
                    >
                      Detach
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* SaveChanges output */}
      <AnimatePresence>
        {(sqlLog.length > 0 || savedCount !== null) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Panel title="Generated SQL (SaveChanges output)" accentColor="#f59e0b">
              {savedCount === 0 ? (
                <p className="text-xs text-text-secondary font-mono">-- ChangeTracker.HasChanges() = false — no SQL executed</p>
              ) : (
                <div className="space-y-3">
                  {sqlLog.map((s, i) => (
                    <motion.div
                      key={s.entityId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`rounded-lg border p-3 ${
                        s.type === "INSERT" ? "border-blue-600/30 bg-blue-950/20" :
                        s.type === "UPDATE" ? "border-amber-500/30 bg-amber-950/20" :
                        s.type === "DELETE" ? "border-red-600/30 bg-red-950/20" :
                        "border-border bg-elevated/30"
                      }`}
                    >
                      <div className={`text-[10px] font-mono font-bold mb-1 ${
                        s.type === "INSERT" ? "text-blue-400" :
                        s.type === "UPDATE" ? "text-amber-400" :
                        s.type === "DELETE" ? "text-red-400" : "text-text-secondary"
                      }`}>{s.type}</div>
                      <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap">{s.sql}</pre>
                    </motion.div>
                  ))}
                  {savedCount !== null && savedCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 text-xs font-mono text-emerald-400 border border-emerald-700/40 bg-emerald-950/30 rounded-lg px-3 py-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      SaveChanges() returned {savedCount} — transaction committed. All entity states reset to Unchanged or Detached.
                    </motion.div>
                  )}
                </div>
              )}
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
