"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type Phase = "idle" | "diffing" | "patching" | "done";

interface NodeDef {
  id: string;
  label: string;
  x: number;
  y: number;
  status?: "same" | "changed" | "new" | "removed";
  detail?: string;
}

interface EdgeDef {
  from: string;
  to: string;
}

const OLD_NODES: NodeDef[] = [
  { id: "app", label: "App", x: 200, y: 30 },
  { id: "header", label: "Header\ncolor:blue", x: 80, y: 110 },
  { id: "nav", label: "Nav", x: 80, y: 190 },
  { id: "main", label: "Main", x: 280, y: 110 },
  { id: "article", label: "Article", x: 220, y: 190 },
  { id: "sidebar", label: "Sidebar", x: 340, y: 190 },
];

const OLD_EDGES: EdgeDef[] = [
  { from: "app", to: "header" },
  { from: "app", to: "main" },
  { from: "header", to: "nav" },
  { from: "main", to: "article" },
  { from: "main", to: "sidebar" },
];

const NEW_NODES: NodeDef[] = [
  { id: "app2", label: "App", x: 200, y: 30 },
  { id: "header2", label: "Header\ncolor:RED", x: 80, y: 110 },
  { id: "nav2", label: "Nav", x: 80, y: 190 },
  { id: "main2", label: "Main", x: 280, y: 110 },
  { id: "article2", label: "Article", x: 200, y: 190 },
  { id: "list2", label: "List\n(new!)", x: 340, y: 190 },
];

const NEW_EDGES: EdgeDef[] = [
  { from: "app2", to: "header2" },
  { from: "app2", to: "main2" },
  { from: "header2", to: "nav2" },
  { from: "main2", to: "article2" },
  { from: "main2", to: "list2" },
];

const DIFF_STATUS: Record<string, NodeDef["status"]> = {
  app: "same", header: "changed", nav: "same",
  main: "same", article: "same", sidebar: "removed",
  app2: "same", header2: "changed", nav2: "same",
  main2: "same", article2: "same", list2: "new",
};

const LOG_ENTRIES = [
  { icon: "✓", msg: "App: unchanged", color: "#6EE7B7" },
  { icon: "✓", msg: "Header: props changed (color: blue → red)", color: "#FCD34D" },
  { icon: "✓", msg: "Nav: unchanged", color: "#6EE7B7" },
  { icon: "✓", msg: "Main: unchanged", color: "#6EE7B7" },
  { icon: "✓", msg: "Article: unchanged", color: "#6EE7B7" },
  { icon: "✗", msg: "Sidebar: removed", color: "#F87171" },
  { icon: "+", msg: "List: inserted (new node)", color: "#C084FC" },
];

const statusColor = (s?: NodeDef["status"], phase?: Phase) => {
  if (!phase || phase === "idle") return "#374151";
  if (!s) return "#374151";
  if (s === "same") return "#059669";
  if (s === "changed") return "#D97706";
  if (s === "new") return "#9333EA";
  if (s === "removed") return "#DC2626";
  return "#374151";
};

function NodeShape({
  node,
  phase,
  patchHighlight,
}: {
  node: NodeDef;
  phase: Phase;
  patchHighlight?: boolean;
}) {
  const fill = statusColor(DIFF_STATUS[node.id], phase);
  const lines = node.label.split("\n");
  const glow = patchHighlight
    ? "drop-shadow(0 0 8px #A855F7)"
    : phase !== "idle" && DIFF_STATUS[node.id] !== "same"
    ? `drop-shadow(0 0 6px ${fill})`
    : "none";

  return (
    <motion.g
      initial={false}
      animate={{
        filter: glow,
        opacity: phase !== "idle" && DIFF_STATUS[node.id] === "removed" ? 0.3 : 1,
      }}
      transition={{ duration: 0.4 }}
    >
      <motion.rect
        x={node.x - 44}
        y={node.y - 18}
        width={88}
        height={36}
        rx={8}
        initial={{ fill: "#374151", stroke: "#4B5563" }}
        animate={{
          fill: phase !== "idle" ? fill + "33" : "#111827",
          stroke: phase !== "idle" ? fill : "#4B5563",
          strokeWidth: phase !== "idle" ? 2 : 1,
        }}
        transition={{ duration: 0.5 }}
      />
      {lines.map((line, i) => (
        <text
          key={i}
          x={node.x}
          y={node.y + (lines.length === 1 ? 5 : i * 14 - 3)}
          textAnchor="middle"
          fontSize={10}
          fill={phase !== "idle" ? fill : "#9CA3AF"}
          fontFamily="JetBrains Mono, monospace"
        >
          {line}
        </text>
      ))}
    </motion.g>
  );
}

function TreeEdges({ edges, nodes }: { edges: EdgeDef[]; nodes: NodeDef[] }) {
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
  return (
    <>
      {edges.map((e) => {
        const from = nodeMap[e.from];
        const to = nodeMap[e.to];
        if (!from || !to) return null;
        return (
          <line
            key={`${e.from}-${e.to}`}
            x1={from.x}
            y1={from.y + 18}
            x2={to.x}
            y2={to.y - 18}
            stroke="#4B5563"
            strokeWidth={1.5}
          />
        );
      })}
    </>
  );
}

export default function VirtualDomVisualizer() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [logVisible, setLogVisible] = useState(0);
  const [patchNodes, setPatchNodes] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  async function handleTrigger() {
    if (running) return;
    setRunning(true);
    setLogVisible(0);
    setPatchNodes([]);

    setPhase("diffing");
    await sleep(1800);

    setPhase("patching");
    // reveal log entries one by one
    for (let i = 0; i < LOG_ENTRIES.length; i++) {
      await sleep(350);
      setLogVisible(i + 1);
      if (DIFF_STATUS[["app", "header", "nav", "main", "article", "sidebar", "list2"][i]] !== "same") {
        setPatchNodes((prev) => [...prev, ["app2", "header2", "nav2", "main2", "article2", "sidebar", "list2"][i]]);
      }
    }

    await sleep(600);
    setPhase("done");
    setRunning(false);
  }

  function handleReset() {
    setPhase("idle");
    setLogVisible(0);
    setPatchNodes([]);
    setRunning(false);
  }

  const phaseLabel: Record<Phase, string> = {
    idle: "Ready",
    diffing: "Diffing trees...",
    patching: "Patching real DOM...",
    done: "Patch complete",
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={handleTrigger} disabled={running || phase === "done"}>
          Trigger Update
        </Button>
        <Button variant="secondary" onClick={handleReset}>
          Reset
        </Button>
        <span className="text-xs font-mono text-text-secondary">
          Phase:{" "}
          <span className="text-accent font-semibold">{phaseLabel[phase]}</span>
        </span>
      </div>

      {/* Trees row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Old VDOM */}
        <Panel title="Old VDOM">
          <svg viewBox="0 0 420 240" className="w-full h-56">
            <TreeEdges edges={OLD_EDGES} nodes={OLD_NODES} />
            {OLD_NODES.map((n) => (
              <NodeShape key={n.id} node={n} phase={phase} />
            ))}
          </svg>
        </Panel>

        {/* New VDOM */}
        <Panel title="New VDOM">
          <svg viewBox="0 0 420 240" className="w-full h-56">
            <TreeEdges edges={NEW_EDGES} nodes={NEW_NODES} />
            {NEW_NODES.map((n) => (
              <NodeShape
                key={n.id}
                node={n}
                phase={phase}
                patchHighlight={phase === "patching" && patchNodes.includes(n.id)}
              />
            ))}
          </svg>
        </Panel>

        {/* Real DOM */}
        <Panel title="Real DOM">
          <div className="flex flex-col gap-2 h-56 justify-center">
            {(["App", "Header", "Nav", "Main", "Article"] as const).map((label) => {
              const isPatchTarget =
                (label === "Header" && phase === "patching") ||
                (label === "Article" && phase === "patching");
              return (
                <motion.div
                  key={label}
                  className="rounded px-3 py-1.5 text-xs font-mono border"
                  animate={{
                    borderColor:
                      label === "Header" && (phase === "patching" || phase === "done")
                        ? "#D97706"
                        : "#374151",
                    backgroundColor:
                      label === "Header" && (phase === "patching" || phase === "done")
                        ? "#D9780620"
                        : "#111827",
                    boxShadow: isPatchTarget ? "0 0 12px #A855F7" : "none",
                  }}
                  transition={{ duration: 0.4 }}
                >
                  <span className="text-text-secondary">&lt;</span>
                  <span
                    style={{
                      color:
                        label === "Header" && (phase === "patching" || phase === "done")
                          ? "#FCD34D"
                          : "#9CA3AF",
                    }}
                  >
                    {label}
                  </span>
                  <span className="text-text-secondary">/&gt;</span>
                </motion.div>
              );
            })}
            <AnimatePresence>
              {(phase === "patching" || phase === "done") && (
                <motion.div
                  key="list-node"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded px-3 py-1.5 text-xs font-mono border"
                  style={{ borderColor: "#9333EA", backgroundColor: "#9333EA20" }}
                >
                  <span className="text-text-secondary">+&lt;</span>
                  <span style={{ color: "#C084FC" }}>List</span>
                  <span className="text-text-secondary">/&gt;</span>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {(phase === "patching" || phase === "done") && (
                <motion.div
                  key="sidebar-removed"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0.3 }}
                  className="rounded px-3 py-1.5 text-xs font-mono border line-through"
                  style={{ borderColor: "#DC2626", backgroundColor: "#DC262620", color: "#F87171" }}
                >
                  &lt;Sidebar/&gt; removed
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Panel>
      </div>

      {/* Diff patch lines overlay hint */}
      {phase === "patching" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs font-mono text-accent"
        >
          Applying minimal patches to Real DOM...
        </motion.div>
      )}

      {/* Log Panel */}
      <Panel title="Diff Log">
        <div className="flex flex-col gap-1 min-h-[120px]">
          <AnimatePresence>
            {LOG_ENTRIES.slice(0, logVisible).map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2 text-xs font-mono"
              >
                <span style={{ color: entry.color }}>{entry.icon}</span>
                <span style={{ color: entry.color }}>{entry.msg}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          {logVisible === 0 && (
            <span className="text-xs text-text-secondary font-mono">
              Awaiting diff...
            </span>
          )}
          {phase === "done" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 text-xs font-mono text-accent font-semibold"
            >
              ✓ Reconciliation complete. 2 patches applied.
            </motion.div>
          )}
        </div>
      </Panel>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs font-mono text-text-secondary">
        {[
          { color: "#059669", label: "Unchanged" },
          { color: "#D97706", label: "Changed" },
          { color: "#9333EA", label: "New" },
          { color: "#DC2626", label: "Removed" },
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
