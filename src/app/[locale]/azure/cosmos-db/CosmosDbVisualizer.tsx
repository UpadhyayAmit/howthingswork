"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type AppState = "idle" | "creating" | "inserting" | "querying" | "cross-partition" | "done" | "error";

interface DbItem {
  id: string;
  userId: string;
  amount: number;
  partition: string;
}

const PARTITIONS = ["user-001", "user-002", "user-003"];

const SEED_ITEMS: DbItem[] = [
  { id: "ord-1", userId: "user-001", amount: 49.99, partition: "user-001" },
  { id: "ord-2", userId: "user-001", amount: 129.0, partition: "user-001" },
  { id: "ord-3", userId: "user-002", amount: 19.99, partition: "user-002" },
  { id: "ord-4", userId: "user-003", amount: 299.0, partition: "user-003" },
];

export default function CosmosDbVisualizer() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [items, setItems] = useState<DbItem[]>(SEED_ITEMS);
  const [queryPartition, setQueryPartition] = useState<string>("user-001");
  const [crossPartition, setCrossPartition] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [logs, setLogs] = useState<{ text: string; type: "info" | "error" | "success" | "warn" }[]>([]);
  const [ruCost, setRuCost] = useState<number | null>(null);

  const addLog = (text: string, type: "info" | "error" | "success" | "warn" = "info") =>
    setLogs((p) => [...p, { text, type }]);

  const reset = () => {
    setAppState("idle");
    setItems(SEED_ITEMS);
    setHighlightedIds([]);
    setLogs([]);
    setRuCost(null);
  };

  const runInsert = useCallback(async () => {
    if (appState !== "idle") return;
    setLogs([]);
    setAppState("inserting");
    const newItem: DbItem = {
      id: `ord-${Math.floor(Math.random() * 900) + 100}`,
      userId: "user-001",
      amount: parseFloat((Math.random() * 200 + 10).toFixed(2)),
      partition: "user-001",
    };
    addLog(`container.items.upsert({ id: "${newItem.id}", userId: "user-001", amount: ${newItem.amount} })`, "info");
    await sleep(600);
    addLog(`✓ Written to partition key: /userId = "user-001"`, "success");
    addLog(`  RU cost: ~7 RUs (1KB document)`, "info");
    setItems((prev) => [newItem, ...prev]);
    setHighlightedIds([newItem.id]);
    setRuCost(7);
    setAppState("done");
    setTimeout(() => setHighlightedIds([]), 3000);
  }, [appState]);

  const runQuery = useCallback(async () => {
    if (appState !== "idle") return;
    setLogs([]);
    setAppState("querying");

    if (crossPartition) {
      setAppState("cross-partition");
      addLog(`SELECT * FROM c WHERE c.amount > 50`, "info");
      addLog("⚠️  No partition key filter — fan-out query across ALL partitions", "warn");
      await sleep(700);
      addLog("  Querying partition: user-001…", "warn");
      await sleep(400);
      addLog("  Querying partition: user-002…", "warn");
      await sleep(400);
      addLog("  Querying partition: user-003…", "warn");
      await sleep(500);
      const matched = items.filter((i) => i.amount > 50);
      setHighlightedIds(matched.map((i) => i.id));
      addLog(`✓ ${matched.length} results returned — RU cost: ~${matched.length * 15} RUs (expensive!)`, "error");
      setRuCost(matched.length * 15);
    } else {
      addLog(`SELECT * FROM c WHERE c.userId = "${queryPartition}"`, "info");
      addLog(`  Partition key filter: /userId = "${queryPartition}"`, "success");
      await sleep(700);
      const matched = items.filter((i) => i.partition === queryPartition);
      setHighlightedIds(matched.map((i) => i.id));
      addLog(`✓ ${matched.length} results — single-partition scan, RU cost: ~${matched.length * 3} RUs`, "success");
      setRuCost(matched.length * 3);
    }
    setAppState("done");
    setTimeout(() => setHighlightedIds([]), 3000);
  }, [appState, crossPartition, queryPartition, items]);

  const PARTITION_COLORS: Record<string, string> = {
    "user-001": "#8b5cf6",
    "user-002": "#3b82f6",
    "user-003": "#10b981",
  };

  return (
    <Panel>
      <div className="flex flex-col gap-6">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-white/40 font-medium">Query partition</span>
            <select
              value={queryPartition}
              onChange={(e) => setQueryPartition(e.target.value)}
              disabled={appState !== "idle"}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/80 focus:outline-none"
            >
              {PARTITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
            <input
              type="checkbox"
              checked={crossPartition}
              onChange={(e) => setCrossPartition(e.target.checked)}
              disabled={appState !== "idle"}
              className="accent-amber-500"
            />
            Cross-partition (expensive)
          </label>
          <div className="flex gap-2 ml-auto">
            <Button onClick={runInsert} disabled={appState !== "idle"} variant="secondary">
              Insert document
            </Button>
            <Button onClick={runQuery} disabled={appState !== "idle"} variant="primary">
              {appState === "idle" || appState === "done" ? "Run query" : "Querying…"}
            </Button>
            <Button onClick={reset} variant="secondary">Reset</Button>
          </div>
        </div>

        {/* RU cost indicator */}
        <AnimatePresence>
          {ruCost !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 rounded-xl px-4 py-2 border text-xs"
              style={{
                background: ruCost > 20 ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
                borderColor: ruCost > 20 ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)",
                color: ruCost > 20 ? "#fca5a5" : "#6ee7b7",
              }}
            >
              <span className="text-xl font-bold">{ruCost}</span>
              <span>Request Units consumed {ruCost > 20 ? "— consider adding partition filter" : "— efficient single-partition query"}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Partition visualisation */}
        <div className="grid grid-cols-3 gap-3">
          {PARTITIONS.map((p) => {
            const partItems = items.filter((i) => i.partition === p);
            return (
              <div
                key={p}
                className="rounded-xl border p-3"
                style={{
                  borderColor: `${PARTITION_COLORS[p]}30`,
                  background: `${PARTITION_COLORS[p]}08`,
                }}
              >
                <div
                  className="text-[10px] font-bold uppercase tracking-wider mb-2"
                  style={{ color: PARTITION_COLORS[p] }}
                >
                  {p}
                </div>
                <div className="space-y-1">
                  {partItems.map((item) => (
                    <motion.div
                      key={item.id}
                      animate={{
                        background: highlightedIds.includes(item.id)
                          ? `${PARTITION_COLORS[item.partition]}30`
                          : "rgba(255,255,255,0.03)",
                        borderColor: highlightedIds.includes(item.id)
                          ? PARTITION_COLORS[item.partition]
                          : "rgba(255,255,255,0.06)",
                      }}
                      className="rounded-lg px-2 py-1.5 border text-[10px] font-mono"
                    >
                      <div className="text-white/70">{item.id}</div>
                      <div className="text-white/35">${item.amount}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Logs */}
        {logs.length > 0 && (
          <div className="bg-black/30 rounded-xl p-4 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
            {logs.map((l, i) => (
              <div
                key={i}
                className={
                  l.type === "error" ? "text-red-400"
                    : l.type === "success" ? "text-emerald-400"
                    : l.type === "warn" ? "text-amber-400"
                    : "text-white/60"
                }
              >
                {l.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
