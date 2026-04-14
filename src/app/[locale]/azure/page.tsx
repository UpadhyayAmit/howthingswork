'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import MotionFade from '@/app/_animations/MotionFade';
import Card from '@/app/_components/Card';
import CategoryConceptTree, { type ConceptNode, type ConceptEdge } from '@/app/_ui/CategoryConceptTree';

const conceptNodes: ConceptNode[] = [
  { id: 'functions', label: 'Functions', x: 0, y: 0, group: 'compute', shape: 'hexagon' },
  { id: 'app-service', label: 'App Service', x: 280, y: 0, group: 'compute', shape: 'rounded' },
  { id: 'entra', label: 'Entra ID', x: 560, y: 0, group: 'security', shape: 'diamond' },
  { id: 'key-vault', label: 'Key Vault', x: 749, y: 0, group: 'security', shape: 'circle' },
  { id: 'service-bus', label: 'Service Bus', x: 100, y: 150, group: 'messaging', shape: 'pill' },
  { id: 'cosmos', label: 'Cosmos DB', x: 369, y: 150, group: 'data', shape: 'hexagon' },
  { id: 'blob', label: 'Blob Storage', x: 620, y: 150, group: 'data', shape: 'rounded' },
  { id: 'apim', label: 'API Mgmt', x: 0, y: 300, group: 'networking', shape: 'diamond' },
  { id: 'insights', label: 'App Insights', x: 280, y: 300, group: 'monitoring', shape: 'circle' },
  { id: 'devops', label: 'DevOps', x: 560, y: 300, group: 'devops', shape: 'pill' },
];

const conceptEdges: ConceptEdge[] = [
  { from: 'functions', to: 'service-bus', animated: true },
  { from: 'functions', to: 'cosmos' },
  { from: 'app-service', to: 'cosmos' },
  { from: 'app-service', to: 'blob' },
  { from: 'entra', to: 'app-service' },
  { from: 'entra', to: 'key-vault' },
  { from: 'key-vault', to: 'functions' },
  { from: 'apim', to: 'app-service' },
  { from: 'apim', to: 'functions' },
  { from: 'insights', to: 'app-service' },
  { from: 'insights', to: 'functions' },
  { from: 'devops', to: 'app-service' },
];

const groupColors: Record<string, string> = {
  compute: '#0ea5e9',
  security: '#ef4444',
  messaging: '#f59e0b',
  data: '#10b981',
  networking: '#a855f7',
  monitoring: '#06b6d4',
  devops: '#ec4899',
};

const sections = [
  {
    heading: 'Compute',
    badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    items: [
      { title: 'Azure Functions', description: 'Serverless execution — triggers, bindings, cold starts, and scaling.', href: '/azure/functions' },
      {
        title: 'App Service & Hosting',
        description: 'Plans, auto-scaling, deployment slots, and zero-downtime deployments.',
        href: '/azure/app-service',
      },
    ],
  },
  {
    heading: 'Security',
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    items: [
      { title: 'Entra ID (Azure AD)', description: 'OAuth2 flows, token lifecycle, MSAL, and managed identity.', href: '/azure/entra-id' },
      { title: 'Key Vault & Managed Identity', description: 'Secret rotation, RBAC, and zero-secret configuration.', href: '/azure/key-vault' },
    ],
  },
  {
    heading: 'Data & Messaging',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    items: [
      { title: 'Service Bus & Messaging', description: 'Queues, topics, dead-letter, and competing consumers.', href: '/azure/service-bus' },
      { title: 'Cosmos DB', description: 'Request Units, partitioning, consistency levels, and global distribution.', href: '/azure/cosmos-db' },
      { title: 'Blob Storage & CDN', description: 'Hot/Cold/Archive tiers, SAS tokens, and lifecycle policies.', href: '/azure/blob-storage' },
    ],
  },
  {
    heading: 'Platform',
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    items: [
      {
        title: 'API Management (APIM)',
        description: 'Gateway pattern, policies, rate limiting, and developer portal.',
        href: '/azure/api-management',
      },
      {
        title: 'Application Insights',
        description: 'Telemetry pipeline, sampling, dependency tracking, and live metrics.',
        href: '/azure/app-insights',
      },
      { title: 'DevOps Pipelines', description: 'CI/CD stages, YAML pipelines, artifacts, and approval gates.', href: '/azure/devops-pipelines' },
    ],
  },
];

export default function AzurePage() {
  return (
    <MotionFade>
      <div className="max-w-6xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-3 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Azure Cloud Services
          </h1>
          <p className="text-text-secondary max-w-2xl leading-relaxed">
            How Azure services work under the hood — from serverless functions and authentication to message queues and observability.
          </p>
        </div>
        <CategoryConceptTree
          nodes={conceptNodes}
          edges={conceptEdges}
          accentColor="#0ea5e9"
          groupColors={groupColors}
          title="Azure Service Connections"
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
