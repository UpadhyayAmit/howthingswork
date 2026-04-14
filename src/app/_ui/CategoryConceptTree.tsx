'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BaseEdge,
  getSmoothStepPath,
  type Node,
  type Edge,
  type EdgeProps,
  type NodeProps,
  Position,
  Handle,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

/* ─── Types ─── */
export type NodeShape = 'rectangle' | 'rounded' | 'pill' | 'diamond' | 'hexagon' | 'circle';

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

export type LayoutConfig = {
  /** Override individual shape bounding-boxes (merged with the component defaults). */
  shapeDims?: Partial<Record<string, { w: number; h: number }>>;
  /** Dagre vertical spacing (px) between ranks. Default 100. */
  ranksep?: number;
  /** Dagre horizontal spacing (px) between sibling nodes. Default 80. */
  nodesep?: number;
  /** ReactFlow fitView padding (0–1). Default 0.15. */
  fitPadding?: number;
};

type Props = {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  accentColor?: string;
  groupColors?: Record<string, string>;
  title?: string;
  height?: number;
  /** Per-section layout config — isolates spacing and shape dims from other sections. */
  layoutConfig?: LayoutConfig;
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
/* Override ReactFlow's default tiny dash animation — use larger dashes so edges are
   clearly visible at all zoom levels, with a smooth flowing directional animation. */
.concept-tree-container .react-flow__edge.animated .react-flow__edge-path {
  stroke-dasharray: 8 3 !important;
  animation: conceptEdgeFlow 1s linear infinite !important;
}
@keyframes conceptEdgeFlow {
  from { stroke-dashoffset: 33; }
  to   { stroke-dashoffset: 0; }
}
/* Non-animated edges: solid line, no dash */
.concept-tree-container .react-flow__edge:not(.animated) .react-flow__edge-path {
  stroke-dasharray: none !important;
  animation: none !important;
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
        padding: '12px 24px',
        minWidth: 130,
        color: '#e5e7eb',
        fontSize: 14,
        fontWeight: 600,
        fontFamily: 'var(--font-mono, monospace)',
        textAlign: 'center' as const,
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
        padding: '12px 24px',
        minWidth: 130,
        color: '#e5e7eb',
        fontSize: 14,
        fontWeight: 600,
        fontFamily: 'var(--font-mono, monospace)',
        textAlign: 'center' as const,
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
        padding: '12px 28px',
        minWidth: 130,
        color: '#e5e7eb',
        fontSize: 14,
        fontWeight: 600,
        fontFamily: 'var(--font-mono, monospace)',
        textAlign: 'center' as const,
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${color}30, ${color}12)`,
          border: `2px solid ${color}`,
          borderRadius: 8,
          transform: 'rotate(45deg)',
          boxShadow: `0 0 20px ${color}30, inset 0 1px 0 ${color}18`,
        }}
      />
      <span
        style={{
          position: 'relative',
          zIndex: 1,
          color: '#e5e7eb',
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'var(--font-mono, monospace)',
          textAlign: 'center' as const,
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
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 140,
        height: 56,
      }}
    >
      {/* Hexagon border layer */}
      <div
        style={{
          position: 'absolute',
          inset: -2,
          background: color,
          clipPath: 'polygon(12% 0%, 88% 0%, 100% 50%, 88% 100%, 12% 100%, 0% 50%)',
          opacity: 0.55,
        }}
      />
      {/* Hexagon fill */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${color}30, ${color}12)`,
          clipPath: 'polygon(12% 0%, 88% 0%, 100% 50%, 88% 100%, 12% 100%, 0% 50%)',
        }}
      />
      <span
        style={{
          position: 'relative',
          zIndex: 1,
          color: '#e5e7eb',
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'var(--font-mono, monospace)',
          textAlign: 'center' as const,
          lineHeight: 1.3,
          padding: '0 20px',
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
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${color}30, ${color}12)`,
        border: `2px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e5e7eb',
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'var(--font-mono, monospace)',
        textAlign: 'center' as const,
        boxShadow: `0 0 20px ${color}30, inset 0 1px 0 ${color}18`,
        lineHeight: 1.2,
        padding: 10,
      }}
    >
      {label}
    </div>
  );
}

/* ─── Custom Gradient Edge ─── */
function GradientFlowEdge({ id, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, data, style = {} }: EdgeProps) {
  const { sourceColor = '#06b6d4', targetColor = '#06b6d4' } = (data ?? {}) as { sourceColor: string; targetColor: string };

  const gradId = `g-${id}`;
  const glowId = `gw-${id}`;
  const markerId = `mk-${id}`;

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <>
      <defs>
        <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
          <stop offset="0%" stopColor={sourceColor} stopOpacity={1} />
          <stop offset="100%" stopColor={targetColor} stopOpacity={1} />
        </linearGradient>
        <filter
          id={glowId}
          x={Math.min(sourceX, targetX) - 20}
          y={Math.min(sourceY, targetY) - 20}
          width={Math.max(Math.abs(targetX - sourceX) + 40, 40)}
          height={Math.max(Math.abs(targetY - sourceY) + 40, 40)}
          filterUnits="userSpaceOnUse"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* markerUnits=userSpaceOnUse → fixed pixel size regardless of strokeWidth/zoom;
            refX=11 aligns the arrow tip exactly at the path endpoint (node border). */}
        <marker id={markerId} markerWidth="12" markerHeight="9" refX="11" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
          <polygon points="0 0, 12 4.5, 0 9" fill={targetColor} opacity={1} />
        </marker>
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: `url(#${gradId})`,
          strokeWidth: 2.5,
          opacity: 0.95,
          filter: `url(#${glowId})`,
        }}
        markerEnd={`url(#${markerId})`}
      />
    </>
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
    case 'diamond':
      shapeEl = <DiamondNode color={color} label={label} />;
      break;
    case 'hexagon':
      shapeEl = <HexagonNode color={color} label={label} />;
      break;
    case 'circle':
      shapeEl = <CircleNode color={color} label={label} />;
      break;
    case 'pill':
      shapeEl = <PillNode color={color} label={label} />;
      break;
    case 'rounded':
      shapeEl = <RoundedNode color={color} label={label} />;
      break;
    case 'rectangle':
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
const edgeTypes = { 'gradient-flow': GradientFlowEdge };

/* ─── Main Component ─── */
const defaultGroupColors: Record<string, string> = {
  core: '#06b6d4',
  primary: '#a855f7',
  secondary: '#f59e0b',
  advanced: '#ec4899',
  support: '#10b981',
};

// Base fallback shape dimensions — each section page can override via layoutConfig.shapeDims.
// Keeping this as a fallback so sections without a layoutConfig still render correctly.
const BASE_SHAPE_DIMS: Record<string, { w: number; h: number }> = {
  rectangle: { w: 190, h: 60 },
  rounded: { w: 190, h: 60 },
  pill: { w: 200, h: 52 },
  hexagon: { w: 170, h: 65 },
  diamond: { w: 115, h: 115 },
  circle: { w: 95, h: 95 },
};

export default function CategoryConceptTree({
  nodes: conceptNodes,
  edges: conceptEdges,
  accentColor = '#06b6d4',
  groupColors = defaultGroupColors,
  title = 'Concept Map',
  height = 650,
  layoutConfig,
}: Props) {
  const { rfNodes, rfEdges, graphHeight } = useMemo(() => {
    // Merge per-section overrides on top of base dims — prevents one section's
    // layout settings from leaking into any other section's graph.
    const effectiveDims = {
      ...BASE_SHAPE_DIMS,
      ...(layoutConfig?.shapeDims ?? {}),
    } as Record<string, { w: number; h: number }>;
    const ranksep = layoutConfig?.ranksep ?? 100;
    const nodesep = layoutConfig?.nodesep ?? 80;

    const initialNodes: Node[] = conceptNodes.map((n) => {
      const color = n.group ? groupColors[n.group] || accentColor : accentColor;
      const shape = n.shape || 'rounded';
      const dims = effectiveDims[shape] ?? effectiveDims.rounded;
      return {
        id: n.id,
        type: 'concept',
        position: { x: n.x, y: n.y }, // Will be overridden by dagre
        data: { label: n.label, color, shape },
        // Explicit size so ReactFlow uses correct bounds for fitView on first render
        width: dims.w,
        height: dims.h,
      };
    });

    const initialEdges: Edge[] = conceptEdges.map((e, i) => {
      const sourceNode = conceptNodes.find((n) => n.id === e.from);
      const targetNode = conceptNodes.find((n) => n.id === e.to);

      const sourceColor = sourceNode?.group ? groupColors[sourceNode.group] || accentColor : accentColor;
      const targetColor = targetNode?.group ? groupColors[targetNode.group] || accentColor : accentColor;

      return {
        id: `e-${e.from}-${e.to}-${i}`,
        source: e.from,
        target: e.to,
        type: 'gradient-flow',
        animated: e.animated ?? true,
        label: e.label,
        labelStyle: { fontSize: 10, fill: '#9CA3AF', fontWeight: 500 },
        labelBgStyle: { fill: '#0d1117', fillOpacity: 0.8 },
        labelBgPadding: [4, 2] as [number, number],
        data: { sourceColor, targetColor },
        style: { strokeWidth: 2 },
      };
    });

    // Apply auto layout with Dagre
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', ranksep, nodesep });
    g.setDefaultEdgeLabel(() => ({}));

    // Use the same dims that are on the node objects so dagre and ReactFlow agree
    initialNodes.forEach((node) => {
      g.setNode(node.id, { width: node.width, height: node.height });
    });

    initialEdges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    // Calculate layout
    dagre.layout(g);

    // Total height dagre computed (used to size the container dynamically)
    const computedHeight = g.graph().height || 0;

    // Apply new positions
    const layoutedNodes = initialNodes.map((node) => {
      const dbNode = g.node(node.id);
      return {
        ...node,
        position: {
          x: dbNode.x - (node.width as number) / 2,
          y: dbNode.y - (node.height as number) / 2,
        },
      };
    });

    return { rfNodes: layoutedNodes, rfEdges: initialEdges, graphHeight: computedHeight };
  }, [conceptNodes, conceptEdges, accentColor, groupColors, layoutConfig]);

  // Build legend from groups
  const legend = useMemo(() => {
    const groups = new Set(conceptNodes.map((n) => n.group).filter(Boolean));
    return Array.from(groups).map((g) => ({
      name: g!,
      color: groupColors[g!] || accentColor,
    }));
  }, [conceptNodes, groupColors, accentColor]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  // vpHeight: available viewport pixels from the container top to the bottom of the screen.
  // Starts null (SSR-safe) — set on mount so ReactFlow gets the right container size for fitView.
  const [vpHeight, setVpHeight] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      const isMob = window.innerWidth < 1024;
      setIsMobile(isMob);
      if (!isMob && containerRef.current) {
        const top = containerRef.current.getBoundingClientRect().top;
        setVpHeight(Math.max(420, Math.floor(window.innerHeight - top - 16)));
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const fitPadding = layoutConfig?.fitPadding ?? 0.05;
  // On first load vpHeight is null; falls back to graph-based height.
  // When vpHeight becomes known the ReactFlow key changes → remount → fitView fires on correct size.
  const displayHeight = isMobile ? 550 : (vpHeight ?? Math.max(height, graphHeight + 160));

  return (
    <div
      ref={containerRef}
      className="concept-tree-container rounded-xl border border-border/60 overflow-hidden mb-8 shadow-2xl relative"
      style={{ background: '#0d1117' }}
    >
      <style dangerouslySetInnerHTML={{ __html: rfNodeResetCSS }} />

      {/* Horizontal scroll wrapper for mobile */}
      <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border">
        <div style={{ height: displayHeight, minWidth: isMobile ? 700 : '100%' }}>
          <ReactFlow
            key={vpHeight !== null ? 'fitted' : 'init'}
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: fitPadding }}
            panOnDrag
            zoomOnScroll={false}
            zoomOnPinch
            nodesDraggable={false}
            nodesConnectable={false}
            minZoom={0.2}
            maxZoom={1}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#1a2332" gap={24} size={1} />
            <Controls
              showInteractive={false}
              position="bottom-right"
              style={{
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: 8,
              }}
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
