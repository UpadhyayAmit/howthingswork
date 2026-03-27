"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type NodeStatus = "pending" | "same" | "update" | "insert" | "delete";

interface FiberNode {
  id: string;
  label: string;
  key?: string;
  depth: number;
  index: number;
  status: NodeStatus;
}

const CURRENT_TREE: FiberNode[] = [
  { id: "c0", label: "App", depth: 0, index: 0, status: "pending" },
  { id: "c1", label: "Header", depth: 1, index: 0, status: "pending" },
  { id: "c2", label: "Nav", depth: 2, index: 0, status: "pending" },
  { id: "c3", label: "Main", depth: 1, index: 1, status: "pending" },
  { id: "c4", label: "Item A", key: "a", depth: 2, index: 0, status: "pending" },
  { id: "c5", label: "Item B", key: "b", depth: 2, index: 1, status: "pending" },
  { id: "c6", label: "Footer", depth: 1, index: 2, status: "pending" },
];

const WIP_TREE_NO_KEYS: FiberNode[] = [
  { id: "w0", label: "App", depth: 0, index: 0, status: "pending" },
  { id: "w1", label: "Header", depth: 1, index: 0, status: "pending" },
  { id: "w2", label: "Nav", depth: 2, index: 0, status: "pending" },
  { id: "w3", label: "Main", depth: 1, index: 1, status: "pending" },
  { id: "w4", label: "Item X", depth: 2, index: 0, status: "pending" },
  { id: "w5", label: "Item A", depth: 2, index: 1, status: "pending" },
  { id: "w6", label: "Item B", depth: 2, index: 2, status: "pending" },
  { id: "w7", label: "Footer", depth: 1, index: 2, status: "pending" },
];

const WIP_TREE_WITH_KEYS: FiberNode[] = [
  { id: "wk0", label: "App", depth: 0, index: 0, status: "pending" },
  { id: "wk1", label: "Header", depth: 1, index: 0, status: "pending" },
  { id: "wk2", label: "Nav", depth: 2, index: 0, status: "pending" },
  { id: "wk3", label: "Main", depth: 1, index: 1, status: "pending" },
  { id: "wk4", label: "Item X", key: "x", depth: 2, index: 0, status: "pending" },
  { id: "wk5", label: "Item A", key: "a", depth: 2, index: 1, status: "pending" },
  { id: "wk6", label: "Item B", key: "b", depth: 2, index: 2, status: "pending" },
  { id: "wk7", label: "Footer", depth: 1, index: 2, status: "pending" },
];

// Steps: [currentIdx, wipIdx, action]
const STEPS_NO_KEYS: Array<{
  desc: string;
  currentId?: string;
  wipId?: string;
  effect: "same" | "update" | "insert" | "delete" | "compare";
  effectList?: string;
}> = [
  { desc: "Compare root: App ↔ App — same type", currentId: "c0", wipId: "w0", effect: "same" },
  { desc: "Compare: Header ↔ Header — same type", currentId: "c1", wipId: "w1", effect: "same" },
  { desc: "Compare: Nav ↔ Nav — same type", currentId: "c2", wipId: "w2", effect: "same" },
  { desc: "Compare: Main ↔ Main — same type", currentId: "c3", wipId: "w3", effect: "same" },
  { desc: "Position 0: Item A ↔ Item X — same type, different content → UPDATE", currentId: "c4", wipId: "w4", effect: "update", effectList: "UPDATE Item A→X" },
  { desc: "Position 1: Item B ↔ Item A — same type, different content → UPDATE", currentId: "c5", wipId: "w5", effect: "update", effectList: "UPDATE Item B→A" },
  { desc: "Position 2: nothing ↔ Item B — new node → INSERT", wipId: "w6", effect: "insert", effectList: "INSERT Item B" },
  { desc: "Compare: Footer ↔ Footer — same type", currentId: "c6", wipId: "w7", effect: "same" },
];

const STEPS_WITH_KEYS: typeof STEPS_NO_KEYS = [
  { desc: "Compare root: App ↔ App — same type", currentId: "c0", wipId: "wk0", effect: "same" },
  { desc: "Compare: Header ↔ Header — same type", currentId: "c1", wipId: "wk1", effect: "same" },
  { desc: "Compare: Nav ↔ Nav — same type", currentId: "c2", wipId: "wk2", effect: "same" },
  { desc: "Compare: Main ↔ Main — same type", currentId: "c3", wipId: "wk3", effect: "same" },
  { desc: "Key 'x' not in old tree → INSERT Item X", wipId: "wk4", effect: "insert", effectList: "INSERT key=x" },
  { desc: "Key 'a' matches old Item A → REUSE (move)", currentId: "c4", wipId: "wk5", effect: "same", effectList: "REUSE key=a" },
  { desc: "Key 'b' matches old Item B → REUSE (move)", currentId: "c5", wipId: "wk6", effect: "same", effectList: "REUSE key=b" },
  { desc: "Compare: Footer ↔ Footer — same type", currentId: "c6", wipId: "wk7", effect: "same" },
];

const statusColors: Record<NodeStatus | "compare", string> = {
  pending: "#374151",
  same: "#059669",
  update: "#D97706",
  insert: "#9333EA",
  delete: "#DC2626",
  compare: "#2563EB",
};

function NodeBox({
  node,
  active,
  useKeys,
}: {
  node: FiberNode;
  active: boolean;
  useKeys: boolean;
}) {
  const color = statusColors[node.status];
  const isActive = active;

  return (
    <motion.div
      layout
      className="flex items-center gap-1 text-xs font-mono rounded px-2 py-1 border"
      style={{
        marginLeft: node.depth * 16,
        borderColor: isActive ? "#A855F7" : color !== "#374151" ? color : "#4B5563",
        backgroundColor:
          isActive ? "#A855F720" : color !== "#374151" ? color + "20" : "#111827",
        color: color !== "#374151" ? color : "#9CA3AF",
      }}
      animate={{
        scale: isActive ? 1.04 : 1,
        boxShadow: isActive ? "0 0 12px #A855F7" : "none",
      }}
      transition={{ duration: 0.25 }}
    >
      {useKeys && node.key && (
        <span className="text-yellow-400 mr-1">key="{node.key}"</span>
      )}
      <span>{node.label}</span>
      {node.status !== "pending" && node.status !== "same" && (
        <span
          className="ml-1 uppercase text-[9px] font-bold px-1 rounded"
          style={{ backgroundColor: color + "33", color }}
        >
          {node.status}
        </span>
      )}
    </motion.div>
  );
}

export default function ReconciliationVisualizer() {
  const [useKeys, setUseKeys] = useState(false);
  const [step, setStep] = useState(-1);
  const [running, setRunning] = useState(false);
  const [currentTree, setCurrentTree] = useState<FiberNode[]>(CURRENT_TREE);
  const [wipTree, setWipTree] = useState<FiberNode[]>(
    useKeys ? WIP_TREE_WITH_KEYS : WIP_TREE_NO_KEYS
  );
  const [effectList, setEffectList] = useState<string[]>([]);

  const steps = useKeys ? STEPS_WITH_KEYS : STEPS_NO_KEYS;

  function reset() {
    setStep(-1);
    setRunning(false);
    setEffectList([]);
    setCurrentTree(CURRENT_TREE.map((n) => ({ ...n, status: "pending" })));
    setWipTree(
      (useKeys ? WIP_TREE_WITH_KEYS : WIP_TREE_NO_KEYS).map((n) => ({
        ...n,
        status: "pending",
      }))
    );
  }

  function toggleKeys() {
    const next = !useKeys;
    setUseKeys(next);
    setStep(-1);
    setRunning(false);
    setEffectList([]);
    setCurrentTree(CURRENT_TREE.map((n) => ({ ...n, status: "pending" })));
    setWipTree(
      (next ? WIP_TREE_WITH_KEYS : WIP_TREE_NO_KEYS).map((n) => ({
        ...n,
        status: "pending",
      }))
    );
  }

  async function runReconciliation() {
    if (running) return;
    setRunning(true);
    reset();
    await sleep(200);

    const ct = CURRENT_TREE.map((n) => ({ ...n, status: "pending" as NodeStatus }));
    const wt = (useKeys ? WIP_TREE_WITH_KEYS : WIP_TREE_NO_KEYS).map((n) => ({
      ...n,
      status: "pending" as NodeStatus,
    }));
    const effects: string[] = [];

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      setStep(i);
      await sleep(900);

      // Apply status to current
      if (s.currentId) {
        const idx = ct.findIndex((n) => n.id === s.currentId);
        if (idx !== -1) {
          ct[idx] = {
            ...ct[idx],
            status:
              s.effect === "delete"
                ? "delete"
                : s.effect === "update"
                ? "update"
                : "same",
          };
          setCurrentTree([...ct]);
        }
      }
      if (s.wipId) {
        const idx = wt.findIndex((n) => n.id === s.wipId);
        if (idx !== -1) {
          wt[idx] = {
            ...wt[idx],
            status: s.effect === "insert" ? "insert" : s.effect === "update" ? "update" : "same",
          };
          setWipTree([...wt]);
        }
      }
      if (s.effectList) {
        effects.push(s.effectList);
        setEffectList([...effects]);
      }
    }

    setStep(-1);
    setRunning(false);
  }

  const currentStep = step >= 0 ? steps[step] : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <Button onClick={runReconciliation} disabled={running}>
          Run Reconciliation
        </Button>
        <Button variant="secondary" onClick={reset}>
          Reset
        </Button>
        <button
          onClick={toggleKeys}
          className="flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-lg border transition-all"
          style={{
            borderColor: useKeys ? "#A855F7" : "#374151",
            backgroundColor: useKeys ? "#A855F720" : "#111827",
            color: useKeys ? "#A855F7" : "#9CA3AF",
          }}
        >
          <span
            className="w-3 h-3 rounded-sm border inline-block"
            style={{
              borderColor: useKeys ? "#A855F7" : "#4B5563",
              backgroundColor: useKeys ? "#A855F7" : "transparent",
            }}
          />
          Use Keys
        </button>
      </div>

      {/* Step description */}
      <AnimatePresence mode="wait">
        {currentStep && (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="text-xs font-mono px-4 py-2 rounded-lg border border-accent/30 bg-accent/10 text-accent"
          >
            Step {step + 1}/{steps.length}: {currentStep.desc}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trees */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Current Tree (Old)">
          <div className="flex flex-col gap-1.5 min-h-[240px]">
            {currentTree.map((node) => (
              <NodeBox
                key={node.id}
                node={node}
                active={currentStep?.currentId === node.id}
                useKeys={useKeys}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Work-in-Progress Tree (New)">
          <div className="flex flex-col gap-1.5 min-h-[240px]">
            {wipTree.map((node) => (
              <NodeBox
                key={node.id}
                node={node}
                active={currentStep?.wipId === node.id}
                useKeys={useKeys}
              />
            ))}
          </div>
        </Panel>
      </div>

      {/* Effect List */}
      <Panel title="Effect List">
        <div className="flex flex-wrap gap-2 min-h-[40px]">
          <AnimatePresence>
            {effectList.length === 0 ? (
              <span className="text-xs text-text-secondary font-mono">
                Effects will appear here...
              </span>
            ) : (
              effectList.map((e, i) => {
                const color = e.startsWith("INSERT")
                  ? "#9333EA"
                  : e.startsWith("UPDATE")
                  ? "#D97706"
                  : e.startsWith("DELETE")
                  ? "#DC2626"
                  : "#059669";
                return (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-xs font-mono px-2 py-1 rounded border"
                    style={{
                      borderColor: color,
                      backgroundColor: color + "20",
                      color,
                    }}
                  >
                    {e}
                  </motion.span>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </Panel>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs font-mono text-text-secondary">
        {[
          { color: "#059669", label: "Same / Reused" },
          { color: "#D97706", label: "Update" },
          { color: "#9333EA", label: "Insert" },
          { color: "#DC2626", label: "Delete" },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: l.color }}
            />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
