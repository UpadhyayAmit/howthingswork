'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import MotionFade from '@/app/_animations/MotionFade';
import Card from '@/app/_components/Card';
import CategoryConceptTree, { type ConceptNode, type ConceptEdge } from '@/app/_ui/CategoryConceptTree';

const conceptNodes: ConceptNode[] = [
  { id: 'oop', label: 'OOP Pillars', x: 0, y: 0, group: 'foundation', shape: 'hexagon' },
  { id: 'solid', label: 'SOLID', x: 280, y: 0, group: 'foundation', shape: 'diamond' },
  { id: 'clean-arch', label: 'Clean Arch', x: 529, y: 0, group: 'architecture', shape: 'hexagon' },
  { id: 'ddd', label: 'DDD', x: 780, y: 0, group: 'architecture', shape: 'circle' },
  { id: 'repository', label: 'Repository', x: 100, y: 150, group: 'patterns', shape: 'rounded' },
  { id: 'cqrs', label: 'CQRS', x: 369, y: 150, group: 'patterns', shape: 'diamond' },
  { id: 'event-sourcing', label: 'Event Sourcing', x: 620, y: 150, group: 'patterns', shape: 'pill' },
  { id: 'mediator', label: 'Mediator', x: 249, y: 300, group: 'patterns', shape: 'circle' },
  { id: 'design-patterns', label: 'GoF Patterns', x: 0, y: 300, group: 'patterns', shape: 'pill' },
  { id: 'decorator', label: 'Decorator', x: 500, y: 300, group: 'patterns', shape: 'rounded' },
  { id: 'anti-patterns', label: 'Anti-Patterns', x: 749, y: 300, group: 'quality', shape: 'hexagon' },
];

const conceptEdges: ConceptEdge[] = [
  { from: 'oop', to: 'solid', animated: true },
  { from: 'solid', to: 'clean-arch' },
  { from: 'clean-arch', to: 'ddd' },
  { from: 'solid', to: 'repository' },
  { from: 'clean-arch', to: 'cqrs' },
  { from: 'cqrs', to: 'event-sourcing' },
  { from: 'cqrs', to: 'mediator' },
  { from: 'oop', to: 'design-patterns' },
  { from: 'design-patterns', to: 'decorator' },
  { from: 'solid', to: 'anti-patterns', label: 'violating' },
];

const groupColors: Record<string, string> = { foundation: '#10b981', architecture: '#06b6d4', patterns: '#a855f7', quality: '#ef4444' };

const sections = [
  {
    heading: 'Foundation',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    items: [
      { title: 'SOLID Principles', description: 'SRP, OCP, LSP, ISP, DIP — with real C# and TypeScript code examples.', href: '/architecture/solid' },
      {
        title: 'OOP: 4 Pillars in Practice',
        description: 'Encapsulation, Inheritance, Polymorphism, Abstraction — beyond the textbook.',
        href: '/architecture/oop',
      },
    ],
  },
  {
    heading: 'Architecture',
    badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    items: [
      {
        title: 'Clean Architecture',
        description: 'Layers, dependency rule, use cases, and how to structure a real project.',
        href: '/architecture/clean-architecture',
      },
      {
        title: 'Domain-Driven Design (DDD)',
        description: 'Aggregates, entities, value objects, bounded contexts, and ubiquitous language.',
        href: '/architecture/ddd',
      },
    ],
  },
  {
    heading: 'Design Patterns',
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    items: [
      {
        title: 'Repository & Unit of Work',
        description: 'Data access abstraction, transaction boundaries, and testability.',
        href: '/architecture/repository-pattern',
      },
      {
        title: 'CQRS & Event Sourcing',
        description: 'Command/Query split, event stores, and rebuilding state from events.',
        href: '/architecture/cqrs',
      },
      {
        title: 'Mediator & MediatR',
        description: 'Request/handler pipeline, decoupled handlers, and pipeline behaviors.',
        href: '/architecture/mediator',
      },
      {
        title: 'Strategy, Factory, Observer',
        description: "Gang of Four patterns you'll use every day in production code.",
        href: '/architecture/design-patterns',
      },
      {
        title: 'Decorator & Chain',
        description: 'The middleware pattern — cross-cutting concerns like logging and caching.',
        href: '/architecture/decorator-chain',
      },
    ],
  },
  {
    heading: 'Quality',
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    items: [
      {
        title: 'Anti-Patterns & Code Smells',
        description: 'God object, service locator, over-engineering — what NOT to do.',
        href: '/architecture/anti-patterns',
      },
    ],
  },
];

export default function ArchitecturePage() {
  return (
    <MotionFade>
      <div className="max-w-6xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-3 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Architecture & Design Patterns
          </h1>
          <p className="text-text-secondary max-w-2xl leading-relaxed">
            How software systems are structured for maintainability, testability, and scale — from SOLID principles to advanced DDD and event
            sourcing.
          </p>
        </div>
        <CategoryConceptTree
          nodes={conceptNodes}
          edges={conceptEdges}
          accentColor="#10b981"
          groupColors={groupColors}
          title="Architecture Concept Map"
          height={370}
          layoutConfig={{ ranksep: 100, nodesep: 65 }}
        />
        <div className="space-y-12">
          {sections.map((section, si) => (
            <motion.div key={section.heading} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.08 }}>
              <div className="flex items-center gap-3 mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${section.badge}`}>
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
          ))}
        </div>
      </div>
    </MotionFade>
  );
}
