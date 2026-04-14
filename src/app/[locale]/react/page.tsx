'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import MotionFade from '@/app/_animations/MotionFade';
import Card from '@/app/_components/Card';
import CategoryConceptTree, { type ConceptNode, type ConceptEdge } from '@/app/_ui/CategoryConceptTree';

/* ─── React Concept Tree ─── */
const conceptNodes: ConceptNode[] = [
  { id: 'jsx', label: 'JSX', x: 400, y: 0, group: 'core', shape: 'hexagon' },
  { id: 'vdom', label: 'Virtual DOM', x: 180, y: 100, group: 'core', shape: 'rounded' },
  { id: 'fiber', label: 'Fiber Tree', x: 580, y: 100, group: 'core', shape: 'rounded' },
  { id: 'reconcile', label: 'Reconciliation', x: 400, y: 200, group: 'core', shape: 'diamond' },
  { id: 'pipeline', label: 'Render Pipeline', x: 0, y: 200, group: 'core', shape: 'pill' },
  { id: 'lifecycle', label: 'Lifecycle', x: 760, y: 200, group: 'component', shape: 'pill' },
  { id: 'hooks', label: 'Hooks', x: 120, y: 330, group: 'hooks', shape: 'hexagon' },
  { id: 'useeffect', label: 'useEffect', x: 0, y: 440, group: 'hooks', shape: 'circle' },
  { id: 'state', label: 'State & Batching', x: 260, y: 440, group: 'hooks', shape: 'rounded' },
  { id: 'memo', label: 'Memoization', x: 129, y: 540, group: 'hooks', shape: 'rounded' },
  { id: 'refs', label: 'Refs', x: 380, y: 330, group: 'hooks', shape: 'circle' },
  { id: 'context', label: 'Context', x: 560, y: 330, group: 'data', shape: 'diamond' },
  { id: 'events', label: 'Events', x: 760, y: 330, group: 'data', shape: 'rounded' },
  { id: 'keys', label: 'Keys & Lists', x: 620, y: 200, group: 'component', shape: 'rectangle' },
  { id: 'errors', label: 'Error Boundaries', x: 880, y: 100, group: 'component', shape: 'pill' },
  { id: 'portals', label: 'Portals', x: 920, y: 200, group: 'component', shape: 'circle' },
  { id: 'concurrent', label: 'Concurrent', x: 540, y: 460, group: 'react18', shape: 'hexagon' },
  { id: 'suspense', label: 'Suspense', x: 760, y: 460, group: 'react18', shape: 'rounded' },
  { id: 'transitions', label: 'Transitions', x: 540, y: 560, group: 'react18', shape: 'pill' },
  { id: 'rsc', label: 'Server Components', x: 780, y: 560, group: 'react18', shape: 'diamond' },
];

const conceptEdges: ConceptEdge[] = [
  { from: 'jsx', to: 'vdom', animated: true },
  { from: 'jsx', to: 'fiber', animated: true },
  { from: 'vdom', to: 'reconcile' },
  { from: 'fiber', to: 'reconcile' },
  { from: 'vdom', to: 'pipeline' },
  { from: 'fiber', to: 'lifecycle' },
  { from: 'reconcile', to: 'hooks' },
  { from: 'hooks', to: 'useeffect' },
  { from: 'hooks', to: 'state' },
  { from: 'state', to: 'memo' },
  { from: 'hooks', to: 'refs' },
  { from: 'reconcile', to: 'context' },
  { from: 'lifecycle', to: 'events' },
  { from: 'reconcile', to: 'keys' },
  { from: 'fiber', to: 'errors' },
  { from: 'errors', to: 'portals' },
  { from: 'context', to: 'concurrent' },
  { from: 'concurrent', to: 'suspense' },
  { from: 'concurrent', to: 'transitions' },
  { from: 'suspense', to: 'rsc' },
];

const groupColors: Record<string, string> = {
  core: '#06b6d4',
  component: '#a855f7',
  hooks: '#f59e0b',
  data: '#10b981',
  react18: '#ec4899',
};

const sectionColors: Record<string, { badge: string }> = {
  'Core Architecture': { badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  'Component Model': { badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  'Hooks & State': { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  'Data Flow & Events': { badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  'React 18+ Features': { badge: 'bg-pink-500/15 text-pink-400 border-pink-500/30' },
};

const sections = [
  {
    heading: 'Core Architecture',
    items: [
      {
        title: 'Fiber Architecture',
        description: 'How React Fiber builds and traverses the fiber tree using depth-first work loops.',
        href: '/react/fiber-visualizer',
      },
      {
        title: 'Virtual DOM & Diffing',
        description: 'How React creates a virtual representation of the UI and diffs it to find minimal changes.',
        href: '/react/virtual-dom',
      },
      {
        title: 'Reconciliation',
        description: 'The algorithm React uses to compare old and new trees and decide what to update.',
        href: '/react/reconciliation',
      },
      {
        title: 'Rendering Pipeline',
        description: 'The full journey from JSX to pixels — render phase, commit phase, and browser paint.',
        href: '/react/rendering-pipeline',
      },
    ],
  },
  {
    heading: 'Component Model',
    items: [
      {
        title: 'Component Lifecycle',
        description: 'Mount, update, and unmount phases — how React manages component instances.',
        href: '/react/component-lifecycle',
      },
      {
        title: 'Error Boundaries',
        description: 'How React catches errors in the component tree and renders fallback UI.',
        href: '/react/error-boundaries',
      },
      { title: 'Portals', description: 'Rendering children into a different DOM node outside the parent hierarchy.', href: '/react/portals' },
      {
        title: 'Keys & List Rendering',
        description: 'How the key prop helps React efficiently reconcile lists and avoid unnecessary re-mounts.',
        href: '/react/keys-lists',
      },
    ],
  },
  {
    heading: 'Hooks & State',
    items: [
      {
        title: 'Hooks Internals',
        description: 'How React stores hooks as a linked list on each fiber node and walks them every render.',
        href: '/react/hooks-visualizer',
      },
      {
        title: 'useEffect Lifecycle',
        description: 'Setup, cleanup, and dependency tracking — when effects run and why.',
        href: '/react/useeffect-lifecycle',
      },
      {
        title: 'State & Batching',
        description: 'How setState queues updates, batches them, and triggers a single re-render.',
        href: '/react/state-batching',
      },
      {
        title: 'Memoization (useMemo/useCallback)',
        description: 'How React caches computed values and function references across renders.',
        href: '/react/memoization',
      },
      {
        title: 'React.memo & Re-renders',
        description: 'When and why components re-render, and how React.memo prevents unnecessary renders.',
        href: '/react/react-memo',
      },
      {
        title: 'Refs & DOM Access',
        description: 'How useRef persists values across renders and provides direct DOM access.',
        href: '/react/refs-dom',
      },
    ],
  },
  {
    heading: 'Data Flow & Events',
    items: [
      {
        title: 'Context API',
        description: 'How React propagates context values down the tree and triggers consumer re-renders.',
        href: '/react/context-api',
      },
      {
        title: 'Event System (SyntheticEvent)',
        description: "React's event delegation, synthetic event pooling, and bubbling mechanism.",
        href: '/react/event-system',
      },
    ],
  },
  {
    heading: 'React 18+ Features',
    items: [
      {
        title: 'Concurrent Rendering',
        description: 'Time slicing, priority lanes, and interruptible rendering in React 18+.',
        href: '/react/concurrent-rendering',
      },
      { title: 'Suspense & React.lazy', description: 'Fallback rendering, code splitting, and streaming SSR boundaries.', href: '/react/suspense' },
      {
        title: 'Transitions (useTransition)',
        description: 'Priority-based rendering — urgent vs non-urgent updates with startTransition.',
        href: '/react/transitions',
      },
      {
        title: 'Server Components (RSC)',
        description: 'Server/client boundary, RSC payload streaming, and zero-bundle server rendering.',
        href: '/react/server-components',
      },
    ],
  },
];

export default function ReactPage() {
  return (
    <MotionFade>
      <div className="max-w-6xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-3 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            React Internals
          </h1>
          <p className="text-text-secondary max-w-2xl leading-relaxed">
            A comprehensive visual guide to how React works under the hood — from fiber architecture to concurrent rendering. Each visualizer lets you
            step through the concept interactively.
          </p>
        </div>

        {/* Concept Tree */}
        <CategoryConceptTree
          nodes={conceptNodes}
          edges={conceptEdges}
          accentColor="#06b6d4"
          groupColors={groupColors}
          title="How React Concepts Connect"
          height={580}
          layoutConfig={{
            shapeDims: {
              hexagon: { w: 128, h: 44 },
              rounded: { w: 130, h: 42 },
              pill: { w: 138, h: 36 },
              diamond: { w: 88, h: 88 },
              circle: { w: 70, h: 70 },
              rectangle: { w: 130, h: 42 },
            },
            ranksep: 58,
            nodesep: 18,
            fitPadding: 0.04,
          }}
        />

        {/* Sections */}
        <div className="space-y-12">
          {sections.map((section, si) => {
            const colors = sectionColors[section.heading] || sectionColors['Core Architecture'];
            return (
              <motion.div key={section.heading} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.08 }}>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${colors.badge}`}>
                    {section.heading}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {section.items.map((v) => (
                    <Link key={v.href} href={v.href}>
                      <Card glow className="cursor-pointer h-full group">
                        <h3
                          className="text-[15px] font-semibold mb-1.5 text-text-primary group-hover:text-white transition-colors"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          {v.title}
                        </h3>
                        <p className="text-[13px] text-text-secondary leading-relaxed">{v.description}</p>
                      </Card>
                    </Link>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </MotionFade>
  );
}
