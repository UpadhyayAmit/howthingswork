'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import { ReactFlow, Background, type NodeTypes, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import { motion } from 'framer-motion';

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
  { key: 'react', label: 'React', slug: 'react', color: '#06b6d4', icon: '⚛️' },
  { key: 'javascript', label: 'JavaScript', slug: 'javascript', color: '#f59e0b', icon: 'JS' },
  { key: 'csharp', label: 'C# / .NET', slug: 'csharp-clr', color: '#a855f7', icon: 'C#' },
  { key: 'aspnet', label: 'ASP.NET Core', slug: 'aspnet-core', color: '#3b82f6', icon: '🌐' },
  { key: 'ef', label: 'Entity Framework', slug: 'entity-framework', color: '#f97316', icon: '🗄️' },
  { key: 'azure', label: 'Azure Cloud', slug: 'azure', color: '#38bdf8', icon: '☁️' },
  { key: 'architecture', label: 'Architecture', slug: 'architecture', color: '#10b981', icon: '🏛️' },
  { key: 'microservices', label: 'Microservices', slug: 'microservices', color: '#f43f5e', icon: '🔗' },
  { key: 'testing', label: 'Testing', slug: 'testing', color: '#84cc16', icon: '✅' },
  { key: 'systemdesign', label: 'System Design', slug: 'system-design', color: '#fb923c', icon: '⚙️' },
  { key: 'aiml', label: 'AI & ML', slug: 'ai-ml', color: '#8b5cf6', icon: '🤖' },
];

/* ─────────────────────── Radial layout ─────────────────────── */
function radial(count: number, rx: number, ry: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    return { x: rx * Math.cos(angle), y: ry * Math.sin(angle) };
  });
}

interface NodeParams {
  size: number;
  fontSize: number;
  titleSize: number;
  iconSize: number;
}

/* ─────────────────────── Center node ─────────────────────── */
function CenterNode({ data }: { data: { params: NodeParams } }) {
  const { size, titleSize, fontSize } = data.params;
  return (
    <motion.div
      animate={{
        boxShadow: ['0 0 25px rgba(6,182,212,0.15)', '0 0 110px rgba(6,182,212,0.5)', '0 0 25px rgba(6,182,212,0.15)'],
      }}
      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle at center, #1b2735 0%, #0b0f19 100%)',
        border: '1.5px solid rgba(6,182,212,0.4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-2 rounded-full border border-dashed border-cyan-500/15"
      />
      <div className="z-10 text-center select-none" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1
          style={{
            color: '#ffffff',
            fontFamily: 'var(--font-heading, sans-serif)',
            fontWeight: 900,
            fontSize: fontSize,
            lineHeight: 1.1,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          How Things
          <br />
          <span className="gradient-text" style={{ fontSize: titleSize }}>
            WORK
          </span>
        </h1>
      </div>
    </motion.div>
  );
}

/* ─────────────────────── Category node ─────────────────────── */
type CatData = { label: string; color: string; icon: string; slug: string; prefix: string; delay: number; params: NodeParams };

function CategoryNode({ data }: { data: CatData }) {
  const isText = data.icon.length <= 2 && !/\p{Emoji_Presentation}/u.test(data.icon);
  const { size, fontSize, iconSize } = data.params;

  return (
    <motion.div
      whileHover={{ scale: 1.12, translateY: -6 }}
      whileTap={{ scale: 0.94 }}
      animate={{
        x: [0, 6, 0, -6, 0],
        y: [0, -3, -6, -3, 0],
      }}
      transition={{
        duration: 14 + data.delay * 1.5,
        repeat: Infinity,
        ease: 'linear',
        delay: data.delay,
      }}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: `rgba(17, 24, 39, 0.9)`,
        border: `1.5px solid ${data.color}66`,
        boxShadow: `0 12px 30px rgba(0, 0, 0, 0.6), 0 0 15px ${data.color}20`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        backdropFilter: 'blur(20px)',
        userSelect: 'none',
      }}
    >
      <div className="mb-1.5">
        {isText ? (
          <div style={{ fontSize: iconSize * 0.7, fontWeight: 950, color: data.color }}>{data.icon}</div>
        ) : (
          <div style={{ fontSize: iconSize }}>{data.icon}</div>
        )}
      </div>

      <div
        style={{
          color: '#ffffff',
          fontWeight: 900,
          fontSize: fontSize,
          textAlign: 'center',
          padding: '0 8px',
          textShadow: '0 2px 4px rgba(0,0,0,1)',
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
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive params: Optimized for Narrow screens (Fix for clipping in Screenshots)
  const rx = isMobile ? 170 : 320;
  const ry = isMobile ? 330 : 260;
  const centerSize = isMobile ? 130 : 180;
  const catSize = isMobile ? 88 : 130;

  const nodeParams: NodeParams = {
    size: catSize,
    fontSize: isMobile ? 10.5 : 14.5,
    titleSize: isMobile ? 16 : 22,
    iconSize: isMobile ? 34 : 50,
  };

  const centerParams = {
    size: centerSize,
    fontSize: isMobile ? 12 : 15,
    titleSize: isMobile ? 18 : 22,
    iconSize: 0,
  };

  const positions = useMemo(() => radial(CATEGORIES.length, rx, ry), [rx, ry]);

  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      if (node.id === 'center') return;
      const cat = CATEGORIES.find((c) => c.key === node.id);
      if (cat) router.push(`/${cat.slug}`);
    },
    [router],
  );

  const nodes: Node[] = useMemo(
    () => [
      {
        id: 'center',
        type: 'center',
        position: { x: -(centerSize / 2), y: -(centerSize / 2) },
        data: { params: centerParams },
        draggable: false,
        selectable: false,
      },
      ...CATEGORIES.map((cat, i) => ({
        id: cat.key,
        type: 'category',
        position: { x: positions[i].x - catSize / 2, y: positions[i].y - catSize / 2 },
        data: { label: cat.label, color: cat.color, icon: cat.icon, slug: cat.slug, prefix, delay: i * 0.9, params: nodeParams },
        draggable: false,
        selectable: false,
      })),
    ],
    [positions, prefix, centerSize, catSize, isMobile],
  );

  const edges: Edge[] = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        id: `e-${cat.key}`,
        source: 'center',
        target: cat.key,
        animated: true,
        style: { stroke: cat.color + '77', strokeWidth: isMobile ? 1.5 : 2.5 },
      })),
    [isMobile],
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
        fitViewOptions={{ padding: isMobile ? 0.02 : 0.15 }}
        minZoom={isMobile ? 0.6 : 1}
        maxZoom={1}
        proOptions={{ hideAttribution: true }}
        preventScrolling={true}
      >
        <Background color="#161e2e" gap={30} size={1} />
      </ReactFlow>
    </div>
  );
}
