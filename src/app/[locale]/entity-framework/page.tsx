'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import MotionFade from '@/app/_animations/MotionFade';
import Card from '@/app/_components/Card';
import CategoryConceptTree, { type ConceptNode, type ConceptEdge } from '@/app/_ui/CategoryConceptTree';

const conceptNodes: ConceptNode[] = [
  { id: 'dbcontext', label: 'DbContext', x: 380, y: 0, group: 'core', shape: 'hexagon' },
  { id: 'change-tracker', label: 'Change Tracker', x: 100, y: 120, group: 'core', shape: 'diamond' },
  { id: 'query-pipeline', label: 'Query Pipeline', x: 640, y: 120, group: 'query', shape: 'hexagon' },
  { id: 'iqueryable', label: 'IQueryable', x: 620, y: 250, group: 'query', shape: 'rounded' },
  { id: 'sql-gen', label: 'SQL Gen', x: 820, y: 250, group: 'query', shape: 'circle' },
  { id: 'migrations', label: 'Migrations', x: 100, y: 260, group: 'schema', shape: 'pill' },
  { id: 'snapshot', label: 'Snapshot', x: 0, y: 370, group: 'schema', shape: 'circle' },
  { id: 'loading', label: 'Loading', x: 380, y: 260, group: 'data', shape: 'rounded' },
  { id: 'relations', label: 'Relationships', x: 380, y: 380, group: 'data', shape: 'diamond' },
  { id: 'perf', label: 'Performance', x: 700, y: 380, group: 'query', shape: 'pill' },
  { id: 'concurrency', label: 'Concurrency', x: 180, y: 460, group: 'data', shape: 'pill' },
  { id: 'raw-sql', label: 'Raw SQL', x: 560, y: 460, group: 'query', shape: 'rectangle' },
];

const conceptEdges: ConceptEdge[] = [
  { from: 'dbcontext', to: 'change-tracker', animated: true },
  { from: 'dbcontext', to: 'query-pipeline', animated: true },
  { from: 'query-pipeline', to: 'iqueryable' },
  { from: 'iqueryable', to: 'sql-gen' },
  { from: 'dbcontext', to: 'loading' },
  { from: 'change-tracker', to: 'migrations' },
  { from: 'migrations', to: 'snapshot' },
  { from: 'loading', to: 'relations' },
  { from: 'relations', to: 'concurrency' },
  { from: 'query-pipeline', to: 'perf' },
  { from: 'perf', to: 'raw-sql' },
];

const groupColors: Record<string, string> = { core: '#f59e0b', query: '#06b6d4', schema: '#a855f7', data: '#10b981' };

const sectionColors: Record<string, { badge: string }> = {
  Core: { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  'Query Engine': { badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  'Schema & Data': { badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
};

const sections = [
  {
    heading: 'Core',
    items: [
      {
        title: 'DbContext & Change Tracker',
        description: 'Unit of Work pattern, entity states (Added/Modified/Deleted), and SaveChanges flow.',
        href: '/entity-framework/dbcontext',
      },
      {
        title: 'Migrations & Schema Evolution',
        description: 'How migration snapshots track database changes and generate SQL diff scripts.',
        href: '/entity-framework/migrations',
      },
    ],
  },
  {
    heading: 'Query Engine',
    items: [
      {
        title: 'Query Pipeline (LINQ → SQL)',
        description: 'IQueryable → expression tree → SQL generation — how EF translates your LINQ.',
        href: '/entity-framework/query-pipeline',
      },
      {
        title: 'Query Performance & Indexing',
        description: 'Compiled queries, split queries, global query filters, and avoiding N+1.',
        href: '/entity-framework/query-performance',
      },
      {
        title: 'Raw SQL & Stored Procedures',
        description: 'FromSqlRaw, ExecuteSqlRaw — when and how to escape the ORM.',
        href: '/entity-framework/raw-sql',
      },
    ],
  },
  {
    heading: 'Schema & Data',
    items: [
      {
        title: 'Loading Strategies',
        description: 'Eager vs Lazy vs Explicit loading — trade-offs and the N+1 problem.',
        href: '/entity-framework/loading-strategies',
      },
      {
        title: 'Relationships & Navigation',
        description: 'FK conventions, shadow properties, cascade delete, and owned types.',
        href: '/entity-framework/relationships',
      },
      {
        title: 'Concurrency & Conflict Resolution',
        description: 'Optimistic concurrency with row versioning and conflict detection.',
        href: '/entity-framework/concurrency',
      },
    ],
  },
];

export default function EntityFrameworkPage() {
  return (
    <MotionFade>
      <div className="max-w-6xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-3 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Entity Framework Core
          </h1>
          <p className="text-text-secondary max-w-2xl leading-relaxed">
            How EF Core maps your C# objects to database operations — from change tracking and LINQ translation to migrations and performance
            optimization.
          </p>
        </div>
        <CategoryConceptTree
          nodes={conceptNodes}
          edges={conceptEdges}
          accentColor="#f59e0b"
          groupColors={groupColors}
          title="EF Core Architecture"
          height={480}
          layoutConfig={{ ranksep: 95, nodesep: 70 }}
        />
        <div className="space-y-12">
          {sections.map((section, si) => {
            const colors = sectionColors[section.heading] || sectionColors['Core'];
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
