"use client";

import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  type NodeTypes,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { motion } from "framer-motion";

/* ─────────────────────── Global RF override ─────────────────── */
const RF_STYLE = `
  .react-flow__node { 
    background: transparent !important; 
    border: none !important; 
    box-shadow: none !important; 
    padding: 0 !important;
    pointer-events: all !important;
  }
  .react-flow { 
    background: #0b0f19 !important; 
    overflow: hidden !important; 
    user-select: none !important;
  }
  .react-flow__handle { display: none !important; }
  .react-flow__attribution { display: none !important; }
  .react-flow__node.selected { outline: none !important; }
  .react-flow__pane { cursor: default !important; }
`;

/* ─────────────────────── Category config ─────────────────────── */
const CATEGORIES = [
  { key: "react",         label: "React",            slug: "react",            color: "#06b6d4", icon: "⚛️" },
  { key: "javascript",   label: "JavaScript",        slug: "javascript",       color: "#f59e0b", icon: "JS" },
  { key: "csharp",       label: "C# / .NET",         slug: "csharp-clr",       color: "#a855f7", icon: "C#" },
  { key: "aspnet",       label: "ASP.NET Core",      slug: "aspnet-core",      color: "#3b82f6", icon: "🌐" },
  { key: "ef",           label: "Entity Framework",  slug: "entity-framework", color: "#f97316", icon: "🗄️" },
  { key: "azure",        label: "Azure Cloud",       slug: "azure",            color: "#38bdf8", icon: "☁️" },
  { key: "architecture", label: "Architecture",      slug: "architecture",     color: "#10b981", icon: "🏛️" },
  { key: "microservices",label: "Microservices",     slug: "microservices",    color: "#f43f5e", icon: "🔗" },
  { key: "testing",      label: "Testing",           slug: "testing",          color: "#84cc16", icon: "✅" },
  { key: "systemdesign", label: "System Design",     slug: "system-design",    color: "#fb923c", icon: "⚙️" },
  { key: "aiml",         label: "AI & ML",           slug: "ai-ml",            color: "#8b5cf6", icon: "🤖" },
];

/* ─────────────────────── Radial layout ─────────────────────── */
function radial(count: number, rx: number, ry: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    return { x: rx * Math.cos(angle), y: ry * Math.sin(angle) };
  });
}

/* ─────────────────────── Center node ─────────────────────── */
function CenterNode() {
  return (
    <motion.div
      animate={{
        boxShadow: [
          "0 0 25px rgba(6,182,212,0.15)",
          "0 0 110px rgba(6,182,212,0.5)",
          "0 0 25px rgba(6,182,212,0.15)",
        ],
      }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      style={{
        width: 180,
        height: 180,
        borderRadius: "50%",
        background: "radial-gradient(circle at center, #1b2735 0%, #0b0f19 100%)",
        border: "1.5px solid rgba(6,182,212,0.4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute inset-2 rounded-full border border-dashed border-cyan-500/15"
      />
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute inset-8 rounded-full border border-dotted border-blue-500/10"
      />

      <div className="z-10 text-center select-none">
        <h1
          style={{
            color: "#ffffff",
            fontFamily: "var(--font-heading, sans-serif)",
            fontWeight: 900,
            fontSize: 15,
            lineHeight: 1.1,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          How Things
          <br />
          <span className="gradient-text" style={{ fontSize: 22 }}>WORK</span>
        </h1>
        <div style={{ width: 28, height: 1.5, background: "rgba(6,182,212,0.4)", margin: "10px auto 0" }} />
      </div>

      <motion.div 
        animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-20 h-20 rounded-full bg-cyan-400/20 blur-2xl z-0"
      />
    </motion.div>
  );
}

/* ─────────────────────── Category node ─────────────────────── */
type CatData = { label: string; color: string; icon: string; slug: string; prefix: string; delay: number };

function CategoryNode({ data }: { data: CatData }) {
  const isText = data.icon.length <= 2 && !/\p{Emoji_Presentation}/u.test(data.icon);
  
  return (
    <motion.div
      whileHover={{ scale: 1.12, translateY: -6 }}
      whileTap={{ scale: 0.94 }}
      animate={{ 
        x: [0, 8, 0, -8, 0],
        y: [0, -4, -8, -4, 0],
      }}
      transition={{
        duration: 14 + (data.delay * 1.5),
        repeat: Infinity,
        ease: "linear",
        delay: data.delay,
      }}
      style={{
        width: 130, 
        height: 130,
        borderRadius: 40,
        background: `rgba(17, 24, 39, 0.88)`,
        border: `1.5px solid ${data.color}66`,
        boxShadow: `0 14px 36px rgba(0, 0, 0, 0.6), 0 0 20px ${data.color}25`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        backdropFilter: "blur(24px)",
        transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        userSelect: "none",
      }}
    >
      <div className="mb-2">
        {isText ? (
          <div
            style={{
              fontSize: 32,
              fontWeight: 950,
              color: data.color,
              fontFamily: "var(--font-heading, sans-serif)",
            }}
          >
            {data.icon}
          </div>
        ) : (
          <div style={{ fontSize: 50, filter: "drop-shadow(0 0 12px rgba(255,255,255,0.2))" }}>{data.icon}</div>
        )}
      </div>

      <div
        style={{
          color: "#ffffff",
          fontFamily: "var(--font-heading, sans-serif)",
          fontWeight: 900,
          fontSize: 14.5,
          textAlign: "center",
          padding: "0 10px",
          textShadow: "0 2px 4px rgba(0,0,0,1)",
        }}
      >
        {data.label}
      </div>
    </motion.div>
  );
}

const nodeTypes: NodeTypes = {
  center: CenterNode as any,
  category: CategoryNode as any,
};

/* ─────────────────────── Main ─────────────────────── */
export default function DashboardFlow() {
  const router = useRouter();
  const locale = useLocale();
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;

  // Compact circular layout for a more consolidated "hub" feeling
  const positions = useMemo(() => radial(CATEGORIES.length, 320, 260), []);

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.id === "center") return;
    const cat = CATEGORIES.find(c => c.key === node.id);
    if (cat) router.push(`/${cat.slug}`);
  }, [router]);

  const nodes: Node[] = useMemo(
    () => [
      {
        id: "center",
        type: "center",
        position: { x: -90, y: -90 },
        data: {},
        draggable: false, selectable: false,
      },
      ...CATEGORIES.map((cat, i) => ({
        id: cat.key,
        type: "category",
        position: { x: positions[i].x - 65, y: positions[i].y - 65 },
        data: { label: cat.label, color: cat.color, icon: cat.icon, slug: cat.slug, prefix, delay: i * 0.9 },
        draggable: false, selectable: false,
      })),
    ],
    [positions, prefix]
  );

  const edges: Edge[] = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        id: `e-${cat.key}`,
        source: "center",
        target: cat.key,
        animated: true,
        style: { stroke: cat.color + "77", strokeWidth: 2.5 },
      })),
    []
  );

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0b0f19]">
      <style>{RF_STYLE}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        panOnScroll={false}
        elementsSelectable={false}
        nodesDraggable={false}
        nodesConnectable={false}
        
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={1}
        maxZoom={1}
        
        proOptions={{ hideAttribution: true }}
        preventScrolling={true}
      >
        <Background color="#161e2e" gap={30} size={1} />
      </ReactFlow>
    </div>
  );
}
