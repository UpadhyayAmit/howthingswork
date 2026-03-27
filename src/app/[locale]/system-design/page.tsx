"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import MotionFade from "@/app/_animations/MotionFade";
import Card from "@/app/_components/Card";
import CategoryConceptTree, { type ConceptNode, type ConceptEdge } from "@/app/_ui/CategoryConceptTree";

const conceptNodes: ConceptNode[] = [
  { id: "scalability", label: "Scalability",     x: 340, y: 0,   group: "core",       shape: "hexagon" },
  { id: "lb",          label: "Load Balancers",  x: 0,   y: 130, group: "networking",  shape: "diamond" },
  { id: "caching",     label: "Caching",         x: 260, y: 130, group: "performance", shape: "hexagon" },
  { id: "cdn",         label: "CDN & Edge",      x: 520, y: 130, group: "networking",  shape: "pill" },
  { id: "sharding",    label: "Sharding",        x: 0,   y: 280, group: "data",        shape: "rounded" },
  { id: "mq",          label: "Message Queues",  x: 260, y: 280, group: "async",       shape: "diamond" },
  { id: "rate",        label: "Rate Limiting",   x: 520, y: 280, group: "protection",  shape: "circle" },
  { id: "auth-scale",  label: "Auth at Scale",   x: 720, y: 130, group: "security",    shape: "rounded" },
  { id: "indexing",    label: "DB Indexing",      x: 120, y: 420, group: "data",        shape: "circle" },
  { id: "failure",     label: "Failure Design",  x: 440, y: 420, group: "resilience",  shape: "pill" },
];

const conceptEdges: ConceptEdge[] = [
  { from: "scalability", to: "lb",         animated: true },
  { from: "scalability", to: "caching" },
  { from: "scalability", to: "cdn" },
  { from: "lb",          to: "sharding" },
  { from: "caching",     to: "mq" },
  { from: "cdn",         to: "rate" },
  { from: "cdn",         to: "auth-scale" },
  { from: "sharding",    to: "indexing" },
  { from: "mq",          to: "failure" },
  { from: "rate",        to: "failure" },
];

const groupColors: Record<string, string> = { core: "#f97316", networking: "#06b6d4", performance: "#eab308", data: "#a855f7", async: "#10b981", protection: "#ef4444", security: "#3b82f6", resilience: "#ec4899" };

const sections = [
  { heading: "Scaling", badge: "bg-orange-500/15 text-orange-400 border-orange-500/30", items: [
    { title: "Scalability", description: "Scaling strategies, stateless services, and session management.", href: "/system-design/scalability" },
    { title: "Load Balancers & Reverse Proxies", description: "L4 vs L7, health checks, sticky sessions, and NGINX vs ALB.", href: "/system-design/load-balancers" },
    { title: "CDN & Edge Computing", description: "Static asset distribution, edge functions, and cache invalidation.", href: "/system-design/cdn" },
  ]},
  { heading: "Performance", badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", items: [
    { title: "Caching Strategies", description: "Redis, CDN, write-through vs write-back, and cache invalidation patterns.", href: "/system-design/caching" },
    { title: "Rate Limiting & Throttling", description: "Token bucket, sliding window, leaky bucket, and API quotas.", href: "/system-design/rate-limiting" },
  ]},
  { heading: "Data Layer", badge: "bg-purple-500/15 text-purple-400 border-purple-500/30", items: [
    { title: "Sharding & Replication", description: "Horizontal partitioning, read replicas, CAP theorem, and consistency.", href: "/system-design/sharding" },
    { title: "Message Queues & Pub/Sub", description: "Kafka, RabbitMQ, at-least-once vs exactly-once delivery.", href: "/system-design/message-queues" },
    { title: "Database Indexing Deep Dive", description: "B-trees, hash indexes, composite indexes, and query plans.", href: "/system-design/indexing" },
  ]},
  { heading: "Resilience", badge: "bg-pink-500/15 text-pink-400 border-pink-500/30", items: [
    { title: "Authentication at Scale", description: "SSO, OAuth2 flows, session vs token, and distributed sessions.", href: "/system-design/auth-at-scale" },
    { title: "Designing for Failure", description: "Redundancy, failover, graceful degradation, and chaos engineering.", href: "/system-design/failure-design" },
  ]},
];

export default function SystemDesignPage() {
  return (
    <MotionFade>
      <div className="max-w-6xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-3 tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>System Design</h1>
          <p className="text-text-secondary max-w-2xl leading-relaxed">How large-scale systems are designed — from load balancing and caching to database sharding, message queues, and failure strategies.</p>
        </div>
        <CategoryConceptTree nodes={conceptNodes} edges={conceptEdges} accentColor="#f97316" groupColors={groupColors} title="System Design Building Blocks" height={460} />
        <div className="space-y-12">
          {sections.map((section, si) => (
            <motion.div key={section.heading} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.08 }}>
              <div className="flex items-center gap-3 mb-4"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${section.badge}`}>{section.heading}</span><div className="h-px flex-1 bg-border" /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {section.items.map((v) => (
                  <Link key={v.href} href={v.href}><Card glow className="cursor-pointer h-full group"><h3 className="text-[15px] font-semibold mb-1.5 text-text-primary group-hover:text-white transition-colors" style={{ fontFamily: "var(--font-heading)" }}>{v.title}</h3><p className="text-[13px] text-text-secondary leading-relaxed">{v.description}</p></Card></Link>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </MotionFade>
  );
}
