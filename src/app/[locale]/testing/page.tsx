'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import MotionFade from '@/app/_animations/MotionFade';
import Card from '@/app/_components/Card';
import CategoryConceptTree, { type ConceptNode, type ConceptEdge } from '@/app/_ui/CategoryConceptTree';

const conceptNodes: ConceptNode[] = [
  { id: 'unit', label: 'Unit Tests', x: 0, y: 0, group: 'levels', shape: 'hexagon' },
  { id: 'integration', label: 'Integration', x: 300, y: 0, group: 'levels', shape: 'diamond' },
  { id: 'e2e', label: 'E2E', x: 600, y: 0, group: 'levels', shape: 'hexagon' },
  { id: 'xunit', label: 'xUnit/NUnit', x: 0, y: 150, group: 'tools', shape: 'rounded' },
  { id: 'jest', label: 'Jest & RTL', x: 300, y: 150, group: 'tools', shape: 'rounded' },
  { id: 'playwright', label: 'Playwright', x: 600, y: 150, group: 'tools', shape: 'pill' },
  { id: 'mocking', label: 'Mocking', x: 100, y: 300, group: 'techniques', shape: 'circle' },
  { id: 'tdd', label: 'TDD', x: 369, y: 300, group: 'techniques', shape: 'diamond' },
  { id: 'coverage', label: 'Coverage', x: 649, y: 300, group: 'quality', shape: 'circle' },
  { id: 'contract', label: 'Contract Tests', x: 369, y: 430, group: 'advanced', shape: 'pill' },
  { id: 'perf', label: 'Perf Testing', x: 649, y: 430, group: 'advanced', shape: 'hexagon' },
];

const conceptEdges: ConceptEdge[] = [
  { from: 'unit', to: 'integration', animated: true },
  { from: 'integration', to: 'e2e', animated: true },
  { from: 'unit', to: 'xunit' },
  { from: 'unit', to: 'jest' },
  { from: 'e2e', to: 'playwright' },
  { from: 'unit', to: 'mocking' },
  { from: 'mocking', to: 'tdd' },
  { from: 'tdd', to: 'coverage' },
  { from: 'integration', to: 'contract' },
  { from: 'e2e', to: 'perf' },
];

const groupColors: Record<string, string> = { levels: '#84cc16', tools: '#06b6d4', techniques: '#a855f7', quality: '#f59e0b', advanced: '#ec4899' };

const sections = [
  {
    heading: 'Test Levels',
    badge: 'bg-lime-500/15 text-lime-400 border-lime-500/30',
    items: [
      { title: 'Unit Testing Fundamentals', description: 'AAA pattern, test isolation, fakes vs mocks vs stubs.', href: '/testing/unit-testing' },
      { title: 'Integration Testing (ASP.NET)', description: 'WebApplicationFactory, in-memory DB, and test server.', href: '/testing/integration' },
      {
        title: 'E2E Testing with Playwright',
        description: 'Page objects, auto-waiting, assertions, and CI integration.',
        href: '/testing/playwright',
      },
    ],
  },
  {
    heading: 'Tools & Frameworks',
    badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    items: [
      { title: 'xUnit & NUnit (.NET)', description: 'Test lifecycle, fixtures, parameterized tests, and assertions.', href: '/testing/xunit-nunit' },
      {
        title: 'Jest & React Testing Library',
        description: 'Component testing, user-event, snapshots, and custom renders.',
        href: '/testing/jest-rtl',
      },
      {
        title: 'Mocking & Dependency Isolation',
        description: 'Moq, NSubstitute, jest.mock — when to mock and when NOT to.',
        href: '/testing/mocking',
      },
    ],
  },
  {
    heading: 'Practices & Quality',
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    items: [
      { title: 'Test-Driven Development (TDD)', description: 'Red-Green-Refactor cycle — when TDD helps and when it hinders.', href: '/testing/tdd' },
      { title: 'Code Coverage & Quality Gates', description: 'What metrics actually matter and common coverage traps.', href: '/testing/coverage' },
      { title: 'API & Contract Testing', description: 'Pact, consumer-driven contracts, and schema validation.', href: '/testing/contract-testing' },
      {
        title: 'Performance & Load Testing',
        description: 'k6, JMeter, identifying bottlenecks, and setting baselines.',
        href: '/testing/performance',
      },
    ],
  },
];

export default function TestingPage() {
  return (
    <MotionFade>
      <div className="max-w-6xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-3 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Testing Strategies & Tools
          </h1>
          <p className="text-text-secondary max-w-2xl leading-relaxed">
            How automated testing works at every layer — from unit tests with Jest and xUnit to end-to-end testing with Playwright and performance
            profiling.
          </p>
        </div>
        <CategoryConceptTree
          nodes={conceptNodes}
          edges={conceptEdges}
          accentColor="#84cc16"
          groupColors={groupColors}
          title="Testing Pyramid & Tools"
          height={470}
          layoutConfig={{ ranksep: 100, nodesep: 75 }}
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
