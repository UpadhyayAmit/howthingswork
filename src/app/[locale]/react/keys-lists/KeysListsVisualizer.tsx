"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

interface ListItem {
  id: string;
  emoji: string;
  label: string;
  color: string;
  bg: string;
}

const ITEMS: ListItem[] = [
  { id: "apple",  emoji: "🔴", label: "Apple",  color: "#EF4444", bg: "rgba(239,68,68,0.1)" },
  { id: "banana", emoji: "🟢", label: "Banana", color: "#22C55E", bg: "rgba(34,197,94,0.1)" },
  { id: "cherry", emoji: "🔵", label: "Cherry", color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
  { id: "date",   emoji: "🟡", label: "Date",   color: "#EAB308", bg: "rgba(234,179,8,0.1)" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Phase = "idle" | "destroying" | "creating" | "done";

interface Stats {
  destroyed: number;
  created: number;
  moved: number;
}

export default function KeysListsVisualizer() {
  const [currentOrder, setCurrentOrder] = useState<ListItem[]>(ITEMS);
  const [noKeyOrder, setNoKeyOrder] = useState<ListItem[]>(ITEMS);
  const [phase, setPhase] = useState<Phase>("idle");
  const [noKeyStats, setNoKeyStats] = useState<Stats>({ destroyed: 0, created: 0, moved: 0 });
  const [withKeyStats, setWithKeyStats] = useState<Stats>({ destroyed: 0, created: 0, moved: 0 });
  const [destroyedIds, setDestroyedIds] = useState<Set<string>>(new Set());
  const [creatingItems, setCreatingItems] = useState<ListItem[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const doShuffle = useCallback(async () => {
    if (isAnimating) return;
    setIsAnimating(true);

    const newOrder = shuffle(ITEMS);

    // Count moved for with-keys
    const moved = newOrder.filter((item, i) => item.id !== currentOrder[i]?.id).length;

    // Phase 1: Without keys — destroy all
    setPhase("destroying");
    setDestroyedIds(new Set(ITEMS.map(i => i.id)));
    await sleep(600);

    // Phase 2: Without keys — recreate in new order
    setPhase("creating");
    setDestroyedIds(new Set());
    setNoKeyOrder(newOrder);
    setCreatingItems(newOrder);
    setNoKeyStats({ destroyed: ITEMS.length, created: ITEMS.length, moved: 0 });

    // With keys moves
    setWithKeyStats({ destroyed: 0, created: 0, moved });
    setCurrentOrder(newOrder);

    await sleep(700);
    setCreatingItems([]);
    setPhase("done");
    setIsAnimating(false);
  }, [isAnimating, currentOrder]);

  const reset = useCallback(() => {
    setCurrentOrder(ITEMS);
    setNoKeyOrder(ITEMS);
    setPhase("idle");
    setNoKeyStats({ destroyed: 0, created: 0, moved: 0 });
    setWithKeyStats({ destroyed: 0, created: 0, moved: 0 });
    setDestroyedIds(new Set());
    setCreatingItems([]);
    setIsAnimating(false);
  }, []);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex gap-3">
        <Button onClick={doShuffle} disabled={isAnimating}>
          {isAnimating ? "Animating..." : "Shuffle List"}
        </Button>
        <Button variant="secondary" onClick={reset} disabled={isAnimating}>
          Reset
        </Button>
      </div>

      {/* Phase indicator */}
      {phase !== "idle" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">Phase:</span>
          <span className={`text-xs font-mono px-2 py-0.5 rounded ${
            phase === "destroying" ? "bg-red-500/20 text-red-400" :
            phase === "creating"   ? "bg-green-500/20 text-green-400" :
            "bg-accent/20 text-accent"
          }`}>
            {phase === "destroying" ? "Destroying nodes..." :
             phase === "creating"   ? "Creating new nodes..." :
             "Complete"}
          </span>
        </div>
      )}

      {/* Side by side lists */}
      <div className="grid grid-cols-2 gap-6">
        {/* WITHOUT KEYS */}
        <Panel title="Without Keys (position-based matching)">
          <div className="space-y-2 mb-4 min-h-[200px]">
            {noKeyOrder.map((item, index) => {
              const isDestroyed = destroyedIds.has(item.id);
              const isCreating  = creatingItems.some(c => c.id === item.id);
              return (
                <motion.div
                  key={index} // intentionally using index as key (no key = positional)
                  animate={
                    isDestroyed
                      ? { opacity: 0, scale: 0.7, backgroundColor: "rgba(239,68,68,0.3)" }
                      : isCreating
                      ? { opacity: [0, 1], y: [-20, 0], scale: [0.8, 1] }
                      : { opacity: 1, scale: 1, y: 0 }
                  }
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg border"
                  style={{
                    borderColor: isDestroyed ? "#EF4444" : item.color + "44",
                    background: isDestroyed ? "rgba(239,68,68,0.15)" : item.bg,
                  }}
                >
                  <span className="text-lg">{item.emoji}</span>
                  <span className="text-sm font-medium text-text-primary">{item.label}</span>
                  {isDestroyed && (
                    <span className="ml-auto text-xs text-red-400 font-mono">DESTROYED</span>
                  )}
                  {isCreating && (
                    <span className="ml-auto text-xs text-green-400 font-mono">CREATED</span>
                  )}
                </motion.div>
              );
            })}
          </div>
          {/* Stats */}
          <div className="flex gap-3 pt-3 border-t border-border">
            <StatBadge label="Destroyed" value={noKeyStats.destroyed} color="red" />
            <StatBadge label="Created"   value={noKeyStats.created}   color="green" />
            <StatBadge label="Moved"     value={noKeyStats.moved}     color="purple" />
          </div>
          <p className="mt-2 text-xs text-red-400/80">
            All {ITEMS.length} nodes destroyed & recreated — expensive!
          </p>
        </Panel>

        {/* WITH KEYS */}
        <Panel title="With Keys (identity-based matching)">
          <div className="space-y-2 mb-4 min-h-[200px]">
            <AnimatePresence mode="popLayout">
              {currentOrder.map((item) => (
                <motion.div
                  key={item.id} // stable key — React tracks identity!
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg border"
                  style={{
                    borderColor: item.color + "44",
                    background: item.bg,
                  }}
                >
                  <span className="text-lg">{item.emoji}</span>
                  <span className="text-sm font-medium text-text-primary">{item.label}</span>
                  <span className="ml-auto text-xs font-mono text-text-secondary">key="{item.id}"</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {/* Stats */}
          <div className="flex gap-3 pt-3 border-t border-border">
            <StatBadge label="Destroyed" value={withKeyStats.destroyed} color="red" />
            <StatBadge label="Created"   value={withKeyStats.created}   color="green" />
            <StatBadge label="Moved"     value={withKeyStats.moved}     color="purple" />
          </div>
          <p className="mt-2 text-xs text-purple-400/80">
            Items smoothly reorder — DOM nodes preserved!
          </p>
        </Panel>
      </div>

      {/* Key insight */}
      <Panel title="Key Insight">
        <div className="flex gap-4 items-start">
          <div className="mt-0.5 w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />
          <p className="text-sm text-text-secondary leading-relaxed">
            React uses <code className="text-accent font-mono bg-accent/10 px-1 rounded">key</code> props to
            match old and new list items across renders. Without keys, React falls back to{" "}
            <span className="text-red-400">position-based matching</span> — if item order changes,
            React thinks every node changed and destroys + recreates them all.
            With stable keys, React tracks each item by identity and can{" "}
            <span className="text-purple-400">reorder DOM nodes</span> instead of destroying them —
            dramatically more efficient and preserves component state.
          </p>
        </div>
      </Panel>
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: number; color: "red" | "green" | "purple" }) {
  const colors = {
    red:    "bg-red-500/10 text-red-400 border-red-500/20",
    green:  "bg-green-500/10 text-green-400 border-green-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono ${colors[color]}`}>
      <span className="text-text-secondary">{label}:</span>
      <motion.span
        key={value}
        initial={{ scale: 1.4, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        className="font-bold"
      >
        {value}
      </motion.span>
    </div>
  );
}
