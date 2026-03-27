"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type RenderMode = "initial" | "navigation" | "serveraction";

interface TreeNode {
  id: string;
  label: string;
  type: "server" | "client";
  bundle: string;
  children?: TreeNode[];
  x: number;
  y: number;
}

const TREE: TreeNode = {
  id: "app",
  label: "App",
  type: "server",
  bundle: "0kb",
  x: 300,
  y: 30,
  children: [
    {
      id: "header",
      label: "Header",
      type: "server",
      bundle: "0kb",
      x: 160,
      y: 110,
      children: [],
    },
    {
      id: "main",
      label: "Main",
      type: "server",
      bundle: "0kb",
      x: 300,
      y: 110,
      children: [
        { id: "article", label: "Article", type: "server", bundle: "0kb", x: 220, y: 195, children: [] },
        { id: "widget", label: "InteractiveWidget", type: "client", bundle: "12kb", x: 360, y: 195, children: [] },
      ],
    },
    {
      id: "footer",
      label: "Footer",
      type: "server",
      bundle: "0kb",
      x: 450,
      y: 110,
      children: [],
    },
  ],
};

function flatNodes(node: TreeNode): TreeNode[] {
  return [node, ...(node.children ?? []).flatMap(flatNodes)];
}

function flatEdges(node: TreeNode): Array<[string, string, number, number, number, number]> {
  const result: Array<[string, string, number, number, number, number]> = [];
  for (const child of node.children ?? []) {
    result.push([node.id, child.id, node.x, node.y + 16, child.x, child.y]);
    result.push(...flatEdges(child));
  }
  return result;
}

const RSC_PAYLOAD = `{
  "type": "App",        // server — serialized
  "children": [
    { "type": "Header" },   // server
    {
      "type": "Main",
      "children": [
        { "type": "Article", "props": {...} },
        {
          "$$typeof": "CLIENT_REFERENCE",
          "identifier": "./InteractiveWidget",
          // ↑ hole for client component
        }
      ]
    },
    { "type": "Footer" }
  ]
}`;

const SERVER_ACTION_PAYLOAD = `// Server Action triggered
POST /_rsc?action=updatePost

// Server re-renders affected subtree:
{
  "type": "Article",
  "props": { "content": "updated..." },
  // Only changed nodes stream back
}

// Client state preserved:
// InteractiveWidget.localState = unchanged`;

const NAV_PAYLOAD = `// Navigation to /dashboard
// Only changed subtree streams:
{
  "type": "Main",
  "children": [
    { "type": "DashboardContent" },
    {
      "$$typeof": "CLIENT_REFERENCE",
      "identifier": "./InteractiveWidget",
    }
  ]
  // Header/Footer not re-sent (unchanged)
}`;

export default function ServerComponentsVisualizer() {
  const [mode, setMode] = useState<RenderMode>("initial");
  const [streaming, setStreaming] = useState(false);
  const [streamedNodes, setStreamedNodes] = useState<string[]>([]);
  const [errorNode, setErrorNode] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState<string[]>([]);
  const [showError, setShowError] = useState(false);

  const allNodes = flatNodes(TREE);
  const allEdges = flatEdges(TREE);

  const runStream = useCallback(async () => {
    setStreaming(true);
    setStreamedNodes([]);
    setHydrated([]);
    setShowError(false);

    const order = ["app", "header", "main", "article", "widget", "footer"];
    for (const id of order) {
      await sleep(250);
      setStreamedNodes((prev) => [...prev, id]);
    }

    // hydrate client components
    await sleep(400);
    setHydrated(["widget"]);
    setStreaming(false);
  }, []);

  const runNavigation = useCallback(async () => {
    setStreaming(true);
    setStreamedNodes(["app", "header", "footer", "main", "article", "widget"]);
    setHydrated(["widget"]);

    await sleep(400);
    // only main subtree re-streams
    setStreamedNodes(["app", "header", "footer"]);
    await sleep(200);
    setStreamedNodes((prev) => [...prev, "main"]);
    await sleep(150);
    setStreamedNodes((prev) => [...prev, "article"]);
    await sleep(150);
    setStreamedNodes((prev) => [...prev, "widget"]);
    setStreaming(false);
  }, []);

  const runServerAction = useCallback(async () => {
    setStreaming(true);
    setStreamedNodes(["app", "header", "footer", "main", "article", "widget"]);
    setHydrated(["widget"]);

    await sleep(300);
    // article re-renders
    setStreamedNodes((prev) => prev.filter((n) => n !== "article"));
    await sleep(400);
    setStreamedNodes((prev) => [...prev, "article"]);
    setStreaming(false);
  }, []);

  const handleRun = useCallback(() => {
    if (mode === "initial") runStream();
    else if (mode === "navigation") runNavigation();
    else runServerAction();
  }, [mode, runStream, runNavigation, runServerAction]);

  const handleHookAttempt = useCallback(async () => {
    setErrorNode("article");
    setShowError(true);
    await sleep(2500);
    setShowError(false);
    setErrorNode(null);
  }, []);

  const handleReset = useCallback(() => {
    setStreaming(false);
    setStreamedNodes([]);
    setHydrated([]);
    setShowError(false);
    setErrorNode(null);
  }, []);

  const payload =
    mode === "initial"
      ? RSC_PAYLOAD
      : mode === "navigation"
      ? NAV_PAYLOAD
      : SERVER_ACTION_PAYLOAD;

  const clientNodes = allNodes.filter((n) => n.type === "client");
  const totalClientBundle = clientNodes.reduce((acc, n) => {
    const kb = parseInt(n.bundle);
    return acc + (isNaN(kb) ? 0 : kb);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Mode tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          ["initial", "Initial Load"],
          ["navigation", "Navigation"],
          ["serveraction", "Server Action"],
        ] as [RenderMode, string][]).map(([m, label]) => (
          <button
            key={m}
            onClick={() => { setMode(m); handleReset(); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              mode === m
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-text-secondary hover:border-accent/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Component tree */}
        <Panel title="Component Tree">
          <div className="space-y-3">
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-[#0d1117] border border-text-secondary" />
                <span className="text-text-secondary">Server</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-accent/30 border border-accent" />
                <span className="text-accent">Client</span>
              </span>
            </div>

            <svg viewBox="0 0 600 260" className="w-full" style={{ height: 220 }}>
              {/* Client boundary glow */}
              <motion.rect
                x={310}
                y={170}
                width={110}
                height={50}
                rx={8}
                fill="rgba(168,85,247,0.06)"
                stroke="#a855f7"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <text x={312} y={167} fontSize={8} fill="#a855f7" fontFamily="monospace">
                client boundary
              </text>

              {/* Edges */}
              {allEdges.map(([from, to, x1, y1, x2, y2]) => (
                <motion.line
                  key={`${from}-${to}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={
                    streamedNodes.includes(to) ? "#4b5563" : "#374151"
                  }
                  strokeWidth={1.5}
                  animate={{
                    stroke: streamedNodes.includes(to) ? "#4b5563" : "#374151",
                  }}
                />
              ))}

              {/* Nodes */}
              {allNodes.map((node) => {
                const isClient = node.type === "client";
                const isStreamed = streamedNodes.includes(node.id);
                const isHydrated = hydrated.includes(node.id);
                const isError = errorNode === node.id;

                return (
                  <g key={node.id}>
                    <motion.rect
                      x={node.x - 40}
                      y={node.y}
                      width={80}
                      height={28}
                      rx={5}
                      fill={
                        isError
                          ? "rgba(239,68,68,0.2)"
                          : isHydrated
                          ? "rgba(168,85,247,0.25)"
                          : isStreamed
                          ? isClient
                            ? "rgba(168,85,247,0.15)"
                            : "rgba(30,30,30,0.9)"
                          : "rgba(22,22,22,0.6)"
                      }
                      stroke={
                        isError
                          ? "#ef4444"
                          : isHydrated
                          ? "#a855f7"
                          : isStreamed
                          ? isClient
                            ? "#a855f7"
                            : "#4b5563"
                          : "#374151"
                      }
                      strokeWidth={isClient ? 1.5 : 1}
                      animate={{
                        opacity: isStreamed ? 1 : 0.4,
                      }}
                      transition={{ duration: 0.3 }}
                    />
                    <text
                      x={node.x}
                      y={node.y + 15}
                      textAnchor="middle"
                      fontSize={9}
                      fill={
                        isError
                          ? "#ef4444"
                          : isClient
                          ? "#c084fc"
                          : "#FAFAFA"
                      }
                      fontFamily="monospace"
                      fontWeight={isClient ? "bold" : "normal"}
                    >
                      {node.label}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + 25}
                      textAnchor="middle"
                      fontSize={7}
                      fill={isClient ? "#a855f7" : "#4b5563"}
                      fontFamily="monospace"
                    >
                      {node.bundle}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Bundle summary */}
            <div className="flex items-center justify-between text-xs border-t border-border pt-2">
              <span className="text-text-secondary">Client bundle total:</span>
              <span className="font-mono font-bold text-accent">{totalClientBundle}kb</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">Server components bundle:</span>
              <span className="font-mono font-bold text-green-400">0kb</span>
            </div>
          </div>
        </Panel>

        {/* RSC Payload */}
        <div className="space-y-4">
          <Panel title="RSC Payload">
            <div className="relative">
              <pre className="font-mono text-xs text-text-secondary leading-relaxed overflow-x-auto whitespace-pre max-h-48">
                {payload.split("\n").map((line, i) => {
                  const isClientLine =
                    line.includes("CLIENT_REFERENCE") || line.includes("identifier");
                  const isServerLine =
                    line.includes("type") && !isClientLine;
                  return (
                    <div
                      key={i}
                      className={
                        isClientLine
                          ? "text-purple-400"
                          : isServerLine
                          ? "text-text-primary"
                          : ""
                      }
                    >
                      {line}
                    </div>
                  );
                })}
              </pre>
              <AnimatePresence>
                {streaming && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    exit={{ scaleX: 0 }}
                    style={{ originX: 0 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className="absolute bottom-0 left-0 h-0.5 bg-accent"
                  />
                )}
              </AnimatePresence>
            </div>
          </Panel>

          {/* Constraints */}
          <Panel title="Server Component Constraints">
            <div className="space-y-2">
              <div
                className="flex items-center gap-2 text-xs cursor-pointer group"
                onClick={handleHookAttempt}
              >
                <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 text-[10px]">
                  ✕
                </div>
                <span className="text-text-secondary group-hover:text-red-400 transition-colors">
                  Cannot use useState / useEffect
                </span>
                <span className="text-[10px] text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                  (click to simulate error)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 text-[10px]">
                  ✕
                </div>
                <span className="text-text-secondary">Cannot use event handlers</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400 text-[10px]">
                  ✓
                </div>
                <span className="text-text-secondary">Can directly access DB / FS</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400 text-[10px]">
                  ✓
                </div>
                <span className="text-text-secondary">Render once on server — never sent to bundle</span>
              </div>
            </div>

            <AnimatePresence>
              {showError && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-3 rounded border border-red-500/40 bg-red-500/10 p-2"
                >
                  <div className="text-xs text-red-400 font-mono">
                    Error: You&apos;re importing a component that needs useState.
                    It only works in a Client Component but none of its parents are
                    marked with &quot;use client&quot;.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Panel>
        </div>
      </div>

      {/* Data flow arrows */}
      <Panel title="Data Flow">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { label: "Server renders RSC", color: "#4b5563", icon: "⚙️" },
            { label: "→", color: "#374151", isArrow: true },
            { label: "RSC Payload streams", color: "#a855f7", icon: "📦" },
            { label: "→", color: "#374151", isArrow: true },
            { label: "Client receives", color: "#22d3ee", icon: "💻" },
            { label: "→", color: "#374151", isArrow: true },
            { label: "Hydrate client components", color: "#22c55e", icon: "⚡" },
          ].map((step, i) =>
            step.isArrow ? (
              <motion.div
                key={i}
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
                className="text-text-secondary text-sm flex-shrink-0"
              >
                →
              </motion.div>
            ) : (
              <div
                key={i}
                className="flex-shrink-0 rounded-lg border px-3 py-2 text-xs text-center min-w-[100px]"
                style={{
                  borderColor: `${step.color}40`,
                  backgroundColor: `${step.color}10`,
                  color: step.color,
                }}
              >
                <div className="text-base mb-1">{step.icon}</div>
                <div>{step.label}</div>
              </div>
            )
          )}
        </div>
      </Panel>

      <div className="flex gap-2 justify-end">
        <Button onClick={handleRun} disabled={streaming} size="sm">
          {streaming ? "Streaming..." : "Run Demo"}
        </Button>
        <Button variant="secondary" onClick={handleReset} size="sm">
          Reset
        </Button>
      </div>
    </div>
  );
}
