"use client";

import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface FlowDiagramProps {
  nodes: Node[];
  edges: Edge[];
  className?: string;
  height?: string;
}

export default function FlowDiagram({
  nodes,
  edges,
  className,
  height = "500px",
}: FlowDiagramProps) {
  return (
    <div
      className={className}
      style={{ height, borderRadius: 10, overflow: "hidden" }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
