"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type Stage =
  | "idle"
  | "both-loaded"
  | "a-saved"
  | "b-conflict"
  | "resolved";

type Resolution = "last-write-wins" | "client-wins" | "db-wins";

interface OrderState {
  id: number;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  rowVersion: number;
}

const INITIAL_ORDER: OrderState = {
  id: 1042,
  status: "Processing",
  totalAmount: 149.99,
  shippingAddress: "12 Oak Street, London",
  rowVersion: 7,
};

function VersionBadge({ version, highlight }: { version: number; highlight?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
        highlight
          ? "bg-amber-500/25 text-amber-400 border border-amber-500/40"
          : "bg-sky-500/15 text-sky-400 border border-sky-500/30"
      }`}
    >
      rowVersion: 0x{version.toString(16).padStart(8, "0").toUpperCase()}
    </span>
  );
}

function OrderCard({
  label,
  order,
  modifiedFields,
  state,
  sessionColor,
}: {
  label: string;
  order: OrderState;
  modifiedFields?: Partial<OrderState>;
  state: "normal" | "success" | "conflict" | "resolved";
  sessionColor: string;
}) {
  const fields: (keyof OrderState)[] = ["status", "totalAmount", "shippingAddress"];

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all ${
        state === "conflict"
          ? "border-red-500/50 shadow-[0_0_16px_rgba(239,68,68,0.12)]"
          : state === "success"
          ? "border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.10)]"
          : state === "resolved"
          ? "border-sky-500/40"
          : "border-border"
      } bg-elevated`}
    >
      {/* Header */}
      <div
        className={`px-4 py-2.5 border-b border-border flex items-center justify-between ${
          state === "conflict" ? "bg-red-500/8" : state === "success" ? "bg-emerald-500/8" : "bg-background/30"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${sessionColor}`} />
          <span className="text-sm font-semibold text-text-primary font-mono">{label}</span>
        </div>
        {state === "success" && (
          <span className="text-[10px] font-mono text-emerald-400 font-bold">✓ SAVED</span>
        )}
        {state === "conflict" && (
          <span className="text-[10px] font-mono text-red-400 font-bold animate-pulse">✗ CONFLICT</span>
        )}
        {state === "resolved" && (
          <span className="text-[10px] font-mono text-sky-400 font-bold">✓ RESOLVED</span>
        )}
      </div>

      {/* Fields */}
      <div className="p-3 space-y-2">
        <VersionBadge version={order.rowVersion} highlight={state === "conflict"} />

        <div className="space-y-1.5 mt-2">
          {fields.map((field) => {
            const current = String(modifiedFields?.[field] ?? order[field]);
            const original = String(order[field]);
            const changed = modifiedFields?.[field] !== undefined;
            return (
              <div key={field} className="flex items-start gap-2 text-[11px] font-mono">
                <span className="text-text-secondary/60 w-28 shrink-0">{field}:</span>
                {changed ? (
                  <span className="text-amber-300 font-semibold">
                    {current}
                    <span className="text-text-secondary/40 ml-1 font-normal line-through">{original}</span>
                  </span>
                ) : (
                  <span className="text-text-secondary">{current}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SqlWhereClause({
  rowVersion,
  matched,
  show,
}: {
  rowVersion: number;
  matched: boolean;
  show: boolean;
}) {
  if (!show) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border p-3 text-[11px] font-mono ${
        matched
          ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-300"
          : "border-red-500/30 bg-red-500/8 text-red-300"
      }`}
    >
      <div className="text-[10px] uppercase tracking-widest mb-2 font-bold opacity-60">
        Generated SQL
      </div>
      <pre className="whitespace-pre-wrap leading-relaxed">{`UPDATE [Orders]
SET [Status] = @p0, [TotalAmount] = @p1
WHERE [Id] = @p2
  AND [RowVersion] = 0x${rowVersion.toString(16).padStart(8, "0").toUpperCase()}
-- ${matched ? `→ 1 row affected ✓` : `→ 0 rows affected ✗\n-- DbUpdateConcurrencyException!`}`}</pre>
    </motion.div>
  );
}

const RESOLUTION_STRATEGIES = [
  {
    id: "last-write-wins" as Resolution,
    label: "Last Write Wins",
    description: "Reload DB values → retry save. Client's values overwrite DB.",
    color: "border-amber-500/30 bg-amber-500/5 text-amber-400",
    code: `// Retry with fresh rowVersion
await entry.ReloadAsync(ct);
// Now OriginalValues has current rowVersion
await _dbContext.SaveChangesAsync(ct);`,
  },
  {
    id: "client-wins" as Resolution,
    label: "Client Wins",
    description: "Force-set original values to DB version, keep client values.",
    color: "border-sky-500/30 bg-sky-500/5 text-sky-400",
    code: `var dbVals = await entry.GetDatabaseValuesAsync(ct);
// Update rowVersion token only, keep client data values
entry.OriginalValues.SetValues(dbVals!);
await _dbContext.SaveChangesAsync(ct);`,
  },
  {
    id: "db-wins" as Resolution,
    label: "Database Wins",
    description: "Discard client changes, replace with current DB state.",
    color: "border-violet-500/30 bg-violet-500/5 text-violet-400",
    code: `var dbVals = await entry.GetDatabaseValuesAsync(ct);
if (dbVals is null) throw new NotFoundException();
// Overwrite both original and current values with DB
entry.OriginalValues.SetValues(dbVals);
entry.CurrentValues.SetValues(dbVals);
// No save needed — entity matches DB`,
  },
];

export default function ConcurrencyVisualizer() {
  const [stage, setStage] = useState<Stage>("idle");
  const [running, setRunning] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<Resolution | null>(null);
  const [log, setLog] = useState<{ text: string; color?: string }[]>([]);

  const addLog = (text: string, color?: string) => {
    setLog((prev) => [...prev, { text, color }]);
  };

  const reset = () => {
    setStage("idle");
    setRunning(false);
    setSelectedResolution(null);
    setLog([]);
  };

  // Order A loaded state (same as original)
  const orderA: OrderState = { ...INITIAL_ORDER };
  // Order A's pending modifications
  const orderAMod: Partial<OrderState> = { status: "Shipped", totalAmount: 149.99 };
  // Order B loaded state (same rowVersion as A)
  const orderB: OrderState = { ...INITIAL_ORDER };
  // Order B's pending modifications
  const orderBMod: Partial<OrderState> = { shippingAddress: "55 Park Lane, London" };
  // After A saves — rowVersion increments
  const orderAAfterSave: OrderState = { ...INITIAL_ORDER, rowVersion: 8, status: "Shipped" };

  const runSimulation = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setLog([]);

    addLog("Both sessions load Order #1042...", "text-text-secondary");
    await sleep(600);
    setStage("both-loaded");
    addLog("User A loaded: rowVersion=0x00000007", "text-sky-400");
    addLog("User B loaded: rowVersion=0x00000007", "text-violet-400");

    await sleep(1200);
    addLog("User A modifies Status → 'Shipped', calls SaveChanges()...", "text-sky-400");
    await sleep(800);
    addLog("  UPDATE Orders SET Status=@p0 WHERE Id=1042 AND RowVersion=0x00000007", "text-sky-300");
    await sleep(400);
    addLog("  → 1 row affected. RowVersion increments to 0x00000008.", "text-emerald-400");
    setStage("a-saved");

    await sleep(1400);
    addLog("User B modifies ShippingAddress → '55 Park Lane', calls SaveChanges()...", "text-violet-400");
    await sleep(800);
    addLog("  UPDATE Orders SET ShippingAddress=@p0 WHERE Id=1042 AND RowVersion=0x00000007", "text-violet-300");
    await sleep(400);
    addLog("  → 0 rows affected! RowVersion in DB is now 0x00000008.", "text-red-400");
    addLog("  DbUpdateConcurrencyException thrown!", "text-red-400");
    setStage("b-conflict");
    setRunning(false);
  }, [running]);

  const applyResolution = useCallback(
    async (res: Resolution) => {
      if (running) return;
      setSelectedResolution(res);
      setRunning(true);

      addLog(`\nApplying: ${RESOLUTION_STRATEGIES.find((r) => r.id === res)!.label}...`);

      if (res === "last-write-wins") {
        await sleep(500);
        addLog("  entry.ReloadAsync() → fetches current rowVersion=0x00000008", "text-amber-400");
        await sleep(600);
        addLog(
          "  Retry SaveChanges() → UPDATE WHERE RowVersion=0x00000008 → 1 row affected",
          "text-emerald-400"
        );
        addLog("  B's ShippingAddress saved. A's changes preserved.", "text-emerald-400");
      } else if (res === "client-wins") {
        await sleep(500);
        addLog(
          "  GetDatabaseValuesAsync() → current DB state, rowVersion=0x00000008",
          "text-sky-400"
        );
        await sleep(500);
        addLog(
          "  entry.OriginalValues.SetValues(dbVals) → update token only, keep B's ShippingAddress",
          "text-sky-400"
        );
        await sleep(400);
        addLog(
          "  SaveChanges() → UPDATE WHERE RowVersion=0x00000008 → success",
          "text-emerald-400"
        );
      } else {
        await sleep(500);
        addLog(
          "  GetDatabaseValuesAsync() → current DB state (A's Status='Shipped')",
          "text-violet-400"
        );
        await sleep(400);
        addLog(
          "  entry.CurrentValues.SetValues(dbVals) → discard B's ShippingAddress change",
          "text-violet-400"
        );
        addLog(
          "  No save needed — entity now matches DB. B's change silently discarded.",
          "text-amber-400"
        );
        addLog(
          "  ⚠ User should be informed their change was not applied!",
          "text-amber-400"
        );
      }

      await sleep(300);
      setStage("resolved");
      setRunning(false);
    },
    [running]
  );

  const stateA: "normal" | "success" | "conflict" | "resolved" =
    stage === "a-saved" || stage === "b-conflict" || stage === "resolved" ? "success" : "normal";

  const stateB: "normal" | "success" | "conflict" | "resolved" =
    stage === "b-conflict" ? "conflict" : stage === "resolved" ? "resolved" : "normal";

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {stage === "idle" && (
          <Button
            onClick={runSimulation}
            disabled={running}
            style={{ backgroundColor: "#f59e0b", color: "#000" }}
          >
            ▶ Run Conflict Simulation
          </Button>
        )}
        {stage !== "idle" && stage !== "resolved" && (
          <span className="text-xs font-mono text-text-secondary">
            {running ? "Simulating..." : stage === "b-conflict" ? "Choose a resolution strategy below" : ""}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={reset}>
          ↩ Reset
        </Button>
      </div>

      {/* Sessions side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* User A */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sky-500" />
            <span className="text-xs font-semibold font-mono text-sky-400">User A — Session 1</span>
          </div>
          <OrderCard
            label="Order #1042"
            order={
              stage === "a-saved" || stage === "b-conflict" || stage === "resolved"
                ? orderAAfterSave
                : orderA
            }
            modifiedFields={
              stage === "both-loaded" || stage === "idle" ? undefined : {}
            }
            state={stateA}
            sessionColor="bg-sky-500"
          />
          <SqlWhereClause
            rowVersion={7}
            matched={true}
            show={stage === "a-saved" || stage === "b-conflict" || stage === "resolved"}
          />
        </div>

        {/* User B */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-500" />
            <span className="text-xs font-semibold font-mono text-violet-400">User B — Session 2</span>
          </div>
          <OrderCard
            label="Order #1042"
            order={orderB}
            modifiedFields={
              stage === "both-loaded"
                ? undefined
                : stage === "b-conflict" || stage === "resolved"
                ? orderBMod
                : undefined
            }
            state={stateB}
            sessionColor="bg-violet-500"
          />
          <SqlWhereClause
            rowVersion={7}
            matched={false}
            show={stage === "b-conflict" || stage === "resolved"}
          />
        </div>
      </div>

      {/* Resolution strategies — shown only after conflict */}
      <AnimatePresence>
        {stage === "b-conflict" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Panel title="Resolution Strategies" accentColor="#f59e0b">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {RESOLUTION_STRATEGIES.map((res) => (
                  <button
                    key={res.id}
                    onClick={() => applyResolution(res.id)}
                    disabled={running || selectedResolution !== null}
                    className={`text-left p-4 rounded-xl border transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${res.color}`}
                  >
                    <div className="font-semibold text-sm mb-1">{res.label}</div>
                    <p className="text-[11px] opacity-80 mb-3">{res.description}</p>
                    <pre className="text-[10px] font-mono opacity-70 whitespace-pre-wrap leading-relaxed bg-black/20 p-2 rounded">
                      {res.code}
                    </pre>
                  </button>
                ))}
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Execution log */}
      <Panel title="Session Log" accentColor="#A855F7">
        <div className="space-y-1 min-h-[80px] max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-border">
          {log.length === 0 ? (
            <p className="text-xs text-text-secondary/40 font-mono">
              Click 'Run Conflict Simulation' to start
            </p>
          ) : (
            log.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`text-[11px] font-mono leading-relaxed ${entry.color ?? "text-text-secondary/60"}`}
              >
                {entry.text}
              </motion.div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
