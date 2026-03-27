"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type ErrorState = "idle" | "throwing" | "propagating" | "caught" | "crashed";

interface TreeNode {
  id: string;
  label: string;
  x: number;
  y: number;
  isBoundary?: boolean;
  canThrow?: boolean;
}

const TREE_NODES: TreeNode[] = [
  { id: "app", label: "App", x: 200, y: 30 },
  { id: "eb", label: "ErrorBoundary", x: 200, y: 110, isBoundary: true },
  { id: "parent", label: "Parent", x: 200, y: 190 },
  { id: "child", label: "Child", x: 200, y: 270, canThrow: true },
];

const TREE_EDGES = [
  { from: "app", to: "eb" },
  { from: "eb", to: "parent" },
  { from: "parent", to: "child" },
];

const PROPAGATION_ORDER = ["child", "parent", "eb"];

const nodeColor = (
  nodeId: string,
  state: ErrorState,
  propagatingTo: string[],
  withBoundary: boolean
) => {
  if (state === "idle") return { fill: "#111827", stroke: "#4B5563", text: "#9CA3AF" };

  if (state === "crashed" && !withBoundary) {
    return { fill: "#DC262620", stroke: "#DC2626", text: "#F87171" };
  }

  if (propagatingTo.includes(nodeId) || state === "throwing" && nodeId === "child") {
    if (nodeId === "eb" && withBoundary && state === "caught") {
      return { fill: "#D9780620", stroke: "#D97706", text: "#FCD34D" };
    }
    return { fill: "#DC262620", stroke: "#DC2626", text: "#F87171" };
  }

  if (nodeId === "eb" && (state === "caught") && withBoundary) {
    return { fill: "#D9780620", stroke: "#D97706", text: "#FCD34D" };
  }

  return { fill: "#111827", stroke: "#4B5563", text: "#9CA3AF" };
};

function ShieldIcon({ x, y }: { x: number; y: number }) {
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, type: "spring" }}
    >
      <text x={x + 52} y={y + 4} fontSize={14} fill="#FCD34D">
        🛡️
      </text>
    </motion.g>
  );
}

export default function ErrorBoundaryVisualizer() {
  const [withBoundary, setWithBoundary] = useState(true);
  const [errorState, setErrorState] = useState<ErrorState>("idle");
  const [propagatingTo, setPropagatingTo] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [errorLog, setErrorLog] = useState<string[]>([]);

  function reset() {
    setErrorState("idle");
    setPropagatingTo([]);
    setRunning(false);
    setErrorLog([]);
  }

  async function throwError() {
    if (running) return;
    setRunning(true);
    setErrorLog([]);
    setPropagatingTo([]);

    setErrorState("throwing");
    setErrorLog(["TypeError: Cannot read property 'data' of undefined"]);
    await sleep(700);

    setErrorState("propagating");

    // Propagate up
    const propagated: string[] = [];
    for (const nodeId of PROPAGATION_ORDER) {
      propagated.push(nodeId);
      setPropagatingTo([...propagated]);
      setErrorLog((prev) => [
        ...prev,
        `  at ${nodeId} (${nodeId}.tsx:42:15)`,
      ]);
      await sleep(600);

      if (nodeId === "eb" && withBoundary) {
        // ErrorBoundary catches it
        await sleep(300);
        setErrorState("caught");
        setErrorLog((prev) => [
          ...prev,
          "",
          "ErrorBoundary caught the error.",
          "getDerivedStateFromError() called",
          "componentDidCatch() called",
          "→ Rendering fallback UI",
        ]);
        setRunning(false);
        return;
      }
    }

    // No boundary — full crash
    setErrorState("crashed");
    setErrorLog((prev) => [
      ...prev,
      "",
      "Uncaught error: Application crashed!",
      "React unmounted the entire tree.",
    ]);
    setRunning(false);
  }

  const caught = errorState === "caught";
  const crashed = errorState === "crashed";

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <Button onClick={throwError} disabled={running || errorState !== "idle"}>
          Throw Error
        </Button>
        <Button variant="secondary" onClick={reset}>
          Reset
        </Button>
        <button
          onClick={() => {
            reset();
            setWithBoundary((v) => !v);
          }}
          className="flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-lg border transition-all"
          style={{
            borderColor: withBoundary ? "#D97706" : "#DC2626",
            backgroundColor: withBoundary ? "#D9780620" : "#DC262610",
            color: withBoundary ? "#FCD34D" : "#F87171",
          }}
        >
          {withBoundary ? "With Error Boundary" : "Without Error Boundary"}
        </button>
      </div>

      {/* Main visualization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tree SVG */}
        <Panel title="Component Tree">
          <svg viewBox="0 0 400 340" className="w-full h-72">
            {/* Edges */}
            {TREE_EDGES.map((e) => {
              const from = TREE_NODES.find((n) => n.id === e.from)!;
              const to = TREE_NODES.find((n) => n.id === e.to)!;
              const isPropagating =
                propagatingTo.includes(e.to) || propagatingTo.includes(e.from);
              return (
                <motion.line
                  key={`${e.from}-${e.to}`}
                  x1={from.x}
                  y1={from.y + 20}
                  x2={to.x}
                  y2={to.y - 20}
                  animate={{
                    stroke: isPropagating ? "#DC2626" : "#4B5563",
                    strokeWidth: isPropagating ? 2.5 : 1.5,
                  }}
                  transition={{ duration: 0.3 }}
                />
              );
            })}

            {/* Lightning bolt traveling up */}
            <AnimatePresence>
              {errorState === "propagating" && (
                <motion.text
                  key="bolt"
                  x={210}
                  initial={{ y: 270, opacity: 1 }}
                  animate={{ y: withBoundary ? 110 : 30, opacity: [1, 1, 0] }}
                  transition={{ duration: 1.8, ease: "easeOut" }}
                  fontSize={20}
                  fill="#EF4444"
                >
                  ⚡
                </motion.text>
              )}
            </AnimatePresence>

            {/* Nodes */}
            {TREE_NODES.map((node) => {
              const colors = nodeColor(
                node.id,
                errorState,
                propagatingTo,
                withBoundary
              );
              const isThrowSource = node.canThrow && errorState !== "idle";
              const isBoundaryActive = node.isBoundary && caught;
              const glow = isThrowSource
                ? "drop-shadow(0 0 8px #DC2626)"
                : isBoundaryActive
                ? "drop-shadow(0 0 10px #D97706)"
                : crashed
                ? "drop-shadow(0 0 8px #DC2626)"
                : "none";

              // Hide child/parent if crashed without boundary
              if (crashed && !withBoundary && (node.id === "child" || node.id === "parent")) {
                return null;
              }

              const labelLines = node.label.split(" ");

              return (
                <motion.g
                  key={node.id}
                  animate={{ filter: glow }}
                  transition={{ duration: 0.4 }}
                >
                  <motion.rect
                    x={node.x - 65}
                    y={node.y - 20}
                    width={130}
                    height={40}
                    rx={8}
                    animate={{
                      fill: colors.fill,
                      stroke: colors.stroke,
                      strokeWidth:
                        (node.isBoundary && !withBoundary)
                          ? 1
                          : isThrowSource || isBoundaryActive || crashed
                          ? 2
                          : 1,
                      strokeDasharray:
                        node.isBoundary && !withBoundary ? "4 4" : "none",
                      opacity: !withBoundary && node.isBoundary ? 0.4 : 1,
                    }}
                    transition={{ duration: 0.4 }}
                  />
                  {labelLines.map((line, i) => (
                    <text
                      key={i}
                      x={node.x}
                      y={node.y + (labelLines.length === 1 ? 5 : i * 14 - 3)}
                      textAnchor="middle"
                      fontSize={10}
                      fontFamily="JetBrains Mono, monospace"
                      fill={!withBoundary && node.isBoundary ? "#4B5563" : colors.text}
                    >
                      {line}
                    </text>
                  ))}

                  {/* Shield on boundary when caught */}
                  {node.isBoundary && caught && withBoundary && (
                    <ShieldIcon x={node.x} y={node.y} />
                  )}

                  {/* Error stop wall */}
                  {node.isBoundary && caught && withBoundary && (
                    <motion.rect
                      x={node.x - 65}
                      y={node.y + 20}
                      width={130}
                      height={4}
                      rx={2}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      style={{ transformOrigin: `${node.x}px ${node.y + 22}px` }}
                      fill="#D97706"
                    />
                  )}

                  {/* Fallback label */}
                  {node.isBoundary && caught && withBoundary && (
                    <motion.text
                      x={node.x}
                      y={node.y + 38}
                      textAnchor="middle"
                      fontSize={9}
                      fill="#FCD34D"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      Fallback UI rendered
                    </motion.text>
                  )}
                </motion.g>
              );
            })}

            {/* Crashed overlay */}
            <AnimatePresence>
              {crashed && !withBoundary && (
                <motion.rect
                  key="crash-overlay"
                  x={0}
                  y={0}
                  width={400}
                  height={340}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.35 }}
                  exit={{ opacity: 0 }}
                  fill="#DC2626"
                />
              )}
            </AnimatePresence>

            {/* Crash text */}
            <AnimatePresence>
              {crashed && !withBoundary && (
                <motion.text
                  key="crash-text"
                  x={200}
                  y={170}
                  textAnchor="middle"
                  fontSize={16}
                  fontWeight="bold"
                  fill="#FAFAFA"
                  fontFamily="JetBrains Mono, monospace"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring" }}
                >
                  APP CRASHED
                </motion.text>
              )}
            </AnimatePresence>
          </svg>
        </Panel>

        {/* Error Info Panel */}
        <div className="flex flex-col gap-3">
          <Panel title="Error Stack">
            <div className="font-mono text-xs min-h-[120px] flex flex-col gap-0.5">
              <AnimatePresence>
                {errorLog.length === 0 ? (
                  <span className="text-text-secondary">No error thrown yet...</span>
                ) : (
                  errorLog.map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      style={{
                        color: line.startsWith("TypeError") || line.startsWith("Uncaught")
                          ? "#F87171"
                          : line.startsWith("ErrorBoundary") || line.includes("getDerived") || line.includes("componentDid") || line.includes("→")
                          ? "#FCD34D"
                          : line === ""
                          ? "transparent"
                          : "#9CA3AF",
                      }}
                    >
                      {line || "\u00A0"}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </Panel>

          {/* Status indicator */}
          <AnimatePresence>
            {caught && (
              <motion.div
                key="caught"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border px-4 py-3 text-xs font-mono"
                style={{ borderColor: "#D97706", backgroundColor: "#D9780610" }}
              >
                <span className="text-yellow-400 font-bold">🛡️ Caught by ErrorBoundary</span>
                <div className="text-text-secondary mt-1">
                  The rest of the app continues to work normally.
                </div>
              </motion.div>
            )}
            {crashed && (
              <motion.div
                key="crashed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border px-4 py-3 text-xs font-mono"
                style={{ borderColor: "#DC2626", backgroundColor: "#DC262610" }}
              >
                <span className="text-red-400 font-bold">💥 Application Crashed</span>
                <div className="text-text-secondary mt-1">
                  No error boundary to catch. React unmounted the entire tree.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
