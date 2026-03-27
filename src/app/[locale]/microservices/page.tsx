"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import MotionFade from "@/app/_animations/MotionFade";
import Card from "@/app/_components/Card";
import CategoryConceptTree, { type ConceptNode, type ConceptEdge } from "@/app/_ui/CategoryConceptTree";

const conceptNodes: ConceptNode[] = [
  { id: "monolith",     label: "Monolith",          x: 0,   y: 0,   group: "transition",  shape: "rectangle" },
  { id: "decompose",    label: "Decomposition",     x: 260, y: 0,   group: "transition",  shape: "diamond" },
  { id: "api-gateway",  label: "API Gateway",       x: 520, y: 0,   group: "networking",  shape: "hexagon" },
  { id: "discovery",    label: "Discovery",         x: 780, y: 0,   group: "networking",  shape: "circle" },
  { id: "communication",label: "Communication",     x: 100, y: 150, group: "patterns",    shape: "pill" },
  { id: "circuit",      label: "Circuit Breaker",   x: 369, y: 150, group: "resilience",  shape: "hexagon" },
  { id: "saga",         label: "Saga",              x: 600, y: 150, group: "patterns",    shape: "diamond" },
  { id: "event-driven", label: "Event-Driven",      x: 100, y: 300, group: "patterns",    shape: "rounded" },
  { id: "containers",   label: "Containers",        x: 369, y: 300, group: "infra",       shape: "pill" },
  { id: "observability",label: "Observability",     x: 600, y: 300, group: "monitoring",  shape: "circle" },
  { id: "data-mgmt",    label: "Data Mgmt",         x: 800, y: 150, group: "data",        shape: "rounded" },
];

const conceptEdges: ConceptEdge[] = [
  { from: "monolith",     to: "decompose",     animated: true },
  { from: "decompose",    to: "api-gateway" },
  { from: "api-gateway",  to: "discovery" },
  { from: "decompose",    to: "communication" },
  { from: "communication",to: "circuit" },
  { from: "communication",to: "saga" },
  { from: "communication",to: "event-driven" },
  { from: "saga",         to: "data-mgmt" },
  { from: "decompose",    to: "containers" },
  { from: "containers",   to: "observability" },
];

const groupColors: Record<string, string> = { transition: "#f43f5e", networking: "#06b6d4", patterns: "#a855f7", resilience: "#f59e0b", infra: "#3b82f6", monitoring: "#10b981", data: "#ec4899" };

const sections = [
  { heading: "Getting Started", badge: "bg-rose-500/15 text-rose-400 border-rose-500/30", items: [
    { title: "Monolith vs Microservices", description: "When to split, strangler fig pattern, and the hidden costs of distribution.", href: "/microservices/monolith-vs-micro" },
    { title: "API Gateway Pattern", description: "Routing, aggregation, BFF, and gateway offloading.", href: "/microservices/api-gateway" },
    { title: "Service Discovery & Load Balancing", description: "DNS, Consul, client-side vs server-side LB, and health checks.", href: "/microservices/service-discovery" },
  ]},
  { heading: "Communication Patterns", badge: "bg-purple-500/15 text-purple-400 border-purple-500/30", items: [
    { title: "Inter-Service Communication", description: "REST vs gRPC vs messaging — sync vs async trade-offs.", href: "/microservices/communication" },
    { title: "Circuit Breaker & Resilience", description: "Polly, retry policies, bulkhead isolation, and timeout strategies.", href: "/microservices/circuit-breaker" },
    { title: "Saga Pattern", description: "Choreography vs orchestration for cross-service transactions.", href: "/microservices/saga" },
    { title: "Event-Driven Architecture", description: "Event bus, eventual consistency, outbox pattern, and idempotency.", href: "/microservices/event-driven" },
  ]},
  { heading: "Infrastructure", badge: "bg-blue-500/15 text-blue-400 border-blue-500/30", items: [
    { title: "Containers & K8s", description: "Pods, services, deployments, scaling, and rolling updates.", href: "/microservices/containers" },
    { title: "Observability", description: "Distributed tracing, correlation IDs, and Grafana/Prometheus.", href: "/microservices/observability" },
    { title: "Data Management", description: "Database-per-service, data sync strategies, and CQRS for reads.", href: "/microservices/data-management" },
  ]},
];

export default function MicroservicesPage() {
  return (
    <MotionFade>
      <div className="max-w-6xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-3 tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>Microservice Architecture</h1>
          <p className="text-text-secondary max-w-2xl leading-relaxed">How distributed systems communicate, scale, and stay resilient — from monolith decomposition to event-driven sagas and container orchestration.</p>
        </div>
        <CategoryConceptTree nodes={conceptNodes} edges={conceptEdges} accentColor="#f43f5e" groupColors={groupColors} title="Microservice Architecture Map" height={370} />
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
