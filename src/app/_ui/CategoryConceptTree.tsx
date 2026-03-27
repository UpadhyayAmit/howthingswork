"use client";

import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeProps,
  Position,
  MarkerType,
  Handle,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

/* ─── Types ─── */
export type NodeShape = "rectangle" | "rounded" | "pill" | "diamond" | "hexagon" | "circle";

export type ConceptNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  group?: string;
  shape?: NodeShape;
};

export type ConceptEdge = {
  from: string;
  to: string;
  label?: string;
  animated?: boolean;
};

type Props = {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  accentColor?: string;
  groupColors?: Record<string, string>;
  title?: string;
  height?: number;
};

/* ─── CSS Reset for React Flow node wrappers ─── */
const rfNodeResetCSS = `
.concept-tree-container .react-flow__node {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  padding: 0 !important;
  outline: none !important;
}
.concept-tree-container .react-flow__node.selected,
.concept-tree-container .react-flow__node:focus,
.concept-tree-container .react-flow__node:hover {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
}
`;

/* ─── Shape renderers ─── */

function RectangleNode({ color, label }: { color: string; label: string }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${color}30, ${color}12)`,
        border: `2px solid ${color}`,
        borderRadius: 6,
        padding: "12px 24px",
        minWidth: 130,
        color: "#e5e7eb",
        fontSize: 14,
        fontWeight: 600,
        fontFamily: "var(--font-mono, monospace)",
        textAlign: "center" as const,
        boxShadow: `0 0 20px ${color}30, inset 0 1px 0 ${color}18`,
        lineHeight: 1.3,
      }}
    >
      {label}
    </div>
  );
}

function RoundedNode({ color, label }: { color: string; label: string }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${color}30, ${color}12)`,
        border: `2px solid ${color}`,
        borderRadius: 20,
        padding: "12px 24px",
        minWidth: 130,
        color: "#e5e7eb",
        fontSize: 14,
        fontWeight: 600,
        fontFamily: "var(--font-mono, monospace)",
        textAlign: "center" as const,
        boxShadow: `0 0 20px ${color}30, inset 0 1px 0 ${color}18`,
        lineHeight: 1.3,
      }}
    >
      {label}
    </div>
  );
}

function PillNode({ color, label }: { color: string; label: string }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${color}30, ${color}12)`,
        border: `2px solid ${color}`,
        borderRadius: 50,
        padding: "12px 28px",
        minWidth: 130,
        color: "#e5e7eb",
        fontSize: 14,
        fontWeight: 600,
        fontFamily: "var(--font-mono, monospace)",
        textAlign: "center" as const,
        boxShadow: `0 0 20px ${color}30, inset 0 1px 0 ${color}18`,
        lineHeight: 1.3,
      }}
    >
      {label}
    </div>
  );
}

function DiamondNode({ color, label }: { color: string; label: string }) {
  const size = 110;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(135deg, ${color}30, ${color}12)`,
          border: `2px solid ${color}`,
          borderRadius: 8,
          transform: "rotate(45deg)",
          boxShadow: `0 0 20px ${color}30, inset 0 1px 0 ${color}18`,
        }}
      />
      <span
        style={{
          position: "relative",
          zIndex: 1,
          color: "#e5e7eb",
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "var(--font-mono, monospace)",
          textAlign: "center" as const,
          lineHeight: 1.2,
          maxWidth: size * 0.62,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function HexagonNode({ color, label }: { color: string; label: string }) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 140,
        height: 56,
      }}
    >
      {/* Hexagon border layer */}
      <div
        style={{
          position: "absolute",
          inset: -2,
          background: color,
          clipPath: "polygon(12% 0%, 88% 0%, 100% 50%, 88% 100%, 12% 100%, 0% 50%)",
          opacity: 0.55,
        }}
      />
      {/* Hexagon fill */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(135deg, ${color}30, ${color}12)`,
          clipPath: "polygon(12% 0%, 88% 0%, 100% 50%, 88% 100%, 12% 100%, 0% 50%)",
        }}
      />
      <span
        style={{
          position: "relative",
          zIndex: 1,
          color: "#e5e7eb",
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "var(--font-mono, monospace)",
          textAlign: "center" as const,
          lineHeight: 1.3,
          padding: "0 20px",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function CircleNode({ color, label }: { color: string; label: string }) {
  const size = 92;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${color}30, ${color}12)`,
        border: `2px solid ${color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#e5e7eb",
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "var(--font-mono, monospace)",
        textAlign: "center" as const,
        boxShadow: `0 0 20px ${color}30, inset 0 1px 0 ${color}18`,
        lineHeight: 1.2,
        padding: 10,
      }}
    >
      {label}
    </div>
  );
}

/* ─── Custom Node Component ─── */
function ConceptNodeComponent({ data }: NodeProps) {
  const { label, color, shape } = data as { label: string; color: string; shape: NodeShape };

  const handleStyle: React.CSSProperties = {
    background: color,
    border: `1px solid ${color}`,
    width: 6,
    height: 6,
    opacity: 0.5,
  };

  let shapeEl: React.ReactNode;
  switch (shape) {
    case "diamond":
      shapeEl = <DiamondNode color={color} label={label} />;
      break;
    case "hexagon":
      shapeEl = <HexagonNode color={color} label={label} />;
      break;
    case "circle":
      shapeEl = <CircleNode color={color} label={label} />;
      break;
    case "pill":
      shapeEl = <PillNode color={color} label={label} />;
      break;
    case "rounded":
      shapeEl = <RoundedNode color={color} label={label} />;
      break;
    case "rectangle":
    default:
      shapeEl = <RectangleNode color={color} label={label} />;
      break;
  }

  return (
    <>
      <Handle type="target" position={Position.Top} style={handleStyle} />
      {shapeEl}
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </>
  );
}

const nodeTypes = { concept: ConceptNodeComponent };

/* ─── Main Component ─── */
const defaultGroupColors: Record<string, string> = {
  core: "#06b6d4",
  primary: "#a855f7",
  secondary: "#f59e0b",
  advanced: "#ec4899",
  support: "#10b981",
};

export default function CategoryConceptTree({
  nodes: conceptNodes,
  edges: conceptEdges,
  accentColor = "#06b6d4",
  groupColors = defaultGroupColors,
  title = "Concept Map",
  height = 480,
}: Props) {
  const rfNodes: Node[] = useMemo(
    () =>
      conceptNodes.map((n) => {
        const color = n.group ? groupColors[n.group] || accentColor : accentColor;
        const shape = n.shape || "rounded";
        return {
          id: n.id,
          type: "concept",
          position: { x: n.x, y: n.y },
          data: { label: n.label, color, shape },
        };
      }),
    [conceptNodes, accentColor, groupColors]
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      conceptEdges.map((e, i) => {
        const sourceNode = conceptNodes.find((n) => n.id === e.from);
        const edgeColor = sourceNode?.group
          ? groupColors[sourceNode.group] || accentColor
          : accentColor;

        return {
          id: `e-${e.from}-${e.to}-${i}`,
          source: e.from,
          target: e.to,
          animated: true,
          label: e.label,
          labelStyle: { fontSize: 10, fill: "#9CA3AF", fontWeight: 500 },
          labelBgStyle: { fill: "#0d1117", fillOpacity: 0.8 },
          labelBgPadding: [4, 2] as [number, number],
          style: { stroke: edgeColor, strokeWidth: 2, opacity: 0.6 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeColor,
            width: 14,
            height: 14,
          },
        };
      }),
    [conceptEdges, conceptNodes, accentColor, groupColors]
  );

  // Build legend from groups
  const legend = useMemo(() => {
    const groups = new Set(conceptNodes.map((n) => n.group).filter(Boolean));
    return Array.from(groups).map((g) => ({
      name: g!,
      color: groupColors[g!] || accentColor,
    }));
  }, [conceptNodes, groupColors, accentColor]);

  return (
    <div
      className="concept-tree-container rounded-xl border border-[#374151] overflow-hidden mb-8"
      style={{ background: "#0d1117" }}
    >
      {/* Inject CSS reset for React Flow node wrappers */}
      <style dangerouslySetInnerHTML={{ __html: rfNodeResetCSS }} />

      {/* Flow */}
      <div style={{ height }}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          panOnDrag
          zoomOnScroll={false}
          zoomOnPinch
          nodesDraggable={false}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1a2332" gap={24} size={1} />
          <Controls
            showInteractive={false}
            position="bottom-right"
            style={{
              background: "#111827",
              border: "1px solid #374151",
              borderRadius: 8,
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
