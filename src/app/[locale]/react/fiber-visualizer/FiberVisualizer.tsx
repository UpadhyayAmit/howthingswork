"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

interface FiberNode {
  id: string;
  label: string;
  type: string;
  children: FiberNode[];
  x: number;
  y: number;
}

const FIBER_TREE: FiberNode = {
  id: "app",
  label: "App",
  type: "FunctionComponent",
  x: 300,
  y: 40,
  children: [
    {
      id: "header",
      label: "Header",
      type: "FunctionComponent",
      x: 150,
      y: 140,
      children: [
        { id: "nav", label: "Nav", type: "HostComponent", x: 80, y: 240, children: [] },
        { id: "logo", label: "Logo", type: "HostComponent", x: 220, y: 240, children: [] },
      ],
    },
    {
      id: "main",
      label: "Main",
      type: "FunctionComponent",
      x: 450,
      y: 140,
      children: [
        { id: "article", label: "Article", type: "HostComponent", x: 380, y: 240, children: [] },
        { id: "sidebar", label: "Sidebar", type: "HostComponent", x: 520, y: 240, children: [] },
      ],
    },
  ],
};

function flattenEdges(node: FiberNode): Array<[string, string, number, number, number, number]> {
  const edges: Array<[string, string, number, number, number, number]> = [];
  for (const child of node.children) {
    edges.push([node.id, child.id, node.x, node.y, child.x, child.y]);
    edges.push(...flattenEdges(child));
  }
  return edges;
}

function flattenNodes(node: FiberNode): FiberNode[] {
  return [node, ...node.children.flatMap(flattenNodes)];
}

function dfsOrder(node: FiberNode): string[] {
  return [node.id, ...node.children.flatMap(dfsOrder)];
}

export default function FiberVisualizer() {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [visitedNodes, setVisitedNodes] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [step, setStep] = useState(-1);

  const allNodes = flattenNodes(FIBER_TREE);
  const allEdges = flattenEdges(FIBER_TREE);
  const traversalOrder = dfsOrder(FIBER_TREE);

  const runTraversal = useCallback(async () => {
    setIsPlaying(true);
    setVisitedNodes(new Set());
    setStep(-1);

    for (let i = 0; i < traversalOrder.length; i++) {
      setStep(i);
      setActiveNode(traversalOrder[i]);
      setVisitedNodes((prev) => new Set([...prev, traversalOrder[i]]));
      await sleep(700);
    }

    setActiveNode(null);
    setIsPlaying(false);
  }, [traversalOrder]);

  const reset = () => {
    setActiveNode(null);
    setVisitedNodes(new Set());
    setStep(-1);
    setIsPlaying(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={runTraversal} disabled={isPlaying}>
          {isPlaying ? "Traversing..." : "Start DFS Traversal"}
        </Button>
        <Button variant="secondary" onClick={reset} disabled={isPlaying}>
          Reset
        </Button>
        <span className="text-sm text-text-secondary">
          {step >= 0 && `Step ${step + 1}/${traversalOrder.length}`}
        </span>
      </div>

      <Panel title="Fiber Tree — Depth-First Traversal">
        <svg width="620" height="300" className="visualizer-content-scroll">
          {/* Edges */}
          {allEdges.map(([fromId, toId, x1, y1, x2, y2]) => (
            <line
              key={`${fromId}-${toId}`}
              x1={x1 + 40}
              y1={y1 + 20}
              x2={x2 + 40}
              y2={y2}
              stroke={
                visitedNodes.has(fromId) && visitedNodes.has(toId)
                  ? "#A855F7"
                  : "#374151"
              }
              strokeWidth={2}
            />
          ))}

          {/* Nodes */}
          {allNodes.map((node) => {
            const isActive = activeNode === node.id;
            const isVisited = visitedNodes.has(node.id);

            return (
              <g key={node.id}>
                <motion.rect
                  x={node.x}
                  y={node.y}
                  width={80}
                  height={36}
                  rx={8}
                  fill={isActive ? "#A855F7" : isVisited ? "#111827" : "#0d1117"}
                  stroke={isActive ? "#C084FC" : isVisited ? "#A855F7" : "#374151"}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  animate={{
                    scale: isActive ? 1.08 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 300 }}
                />
                <text
                  x={node.x + 40}
                  y={node.y + 22}
                  textAnchor="middle"
                  fill={isActive ? "#FFFFFF" : isVisited ? "#C084FC" : "#9CA3AF"}
                  fontSize={13}
                  fontWeight={isActive ? 600 : 400}
                  fontFamily="Inter, sans-serif"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </Panel>

      <Panel title="Traversal Order">
        <div className="flex flex-wrap gap-2">
          {traversalOrder.map((id, i) => (
            <motion.div
              key={id}
              className={`px-3 py-1.5 rounded-md text-xs font-mono border ${
                activeNode === id
                  ? "bg-accent text-white border-accent"
                  : visitedNodes.has(id)
                  ? "bg-accent/10 text-accent border-accent/30"
                  : "bg-elevated text-text-secondary border-border"
              }`}
              animate={{ scale: activeNode === id ? 1.1 : 1 }}
            >
              {i + 1}. {id}
            </motion.div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
