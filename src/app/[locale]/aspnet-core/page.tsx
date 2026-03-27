"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import MotionFade from "@/app/_animations/MotionFade";
import Card from "@/app/_components/Card";
import CategoryConceptTree, { type ConceptNode, type ConceptEdge } from "@/app/_ui/CategoryConceptTree";

const conceptNodes: ConceptNode[] = [
  { id: "middleware",  label: "Middleware",        x: 380, y: 0,   group: "core",       shape: "hexagon" },
  { id: "routing",     label: "Routing",           x: 380, y: 120, group: "core",       shape: "diamond" },
  { id: "endpoint",    label: "Endpoint",          x: 380, y: 250, group: "core",       shape: "circle" },
  { id: "auth",        label: "Auth",              x: 80,  y: 70,  group: "security",   shape: "pill" },
  { id: "authz",       label: "Authorization",     x: 80,  y: 190, group: "security",   shape: "rounded" },
  { id: "di",          label: "DI Container",      x: 680, y: 70,  group: "services",   shape: "hexagon" },
  { id: "config",      label: "Configuration",     x: 749, y: 190, group: "services",   shape: "rounded" },
  { id: "model",       label: "Model Binding",     x: 120, y: 340, group: "processing", shape: "rounded" },
  { id: "filters",     label: "Filters",           x: 380, y: 370, group: "processing", shape: "diamond" },
  { id: "logging",     label: "Logging",           x: 680, y: 310, group: "services",   shape: "circle" },
  { id: "versioning",  label: "API Versioning",    x: 560, y: 430, group: "processing", shape: "pill" },
  { id: "errors",      label: "Error Handling",    x: 180, y: 430, group: "processing", shape: "pill" },
];

const conceptEdges: ConceptEdge[] = [
  { from: "middleware", to: "routing",    animated: true },
  { from: "routing",    to: "endpoint",   animated: true },
  { from: "middleware", to: "auth" },
  { from: "auth",       to: "authz" },
  { from: "middleware", to: "di" },
  { from: "di",         to: "config" },
  { from: "endpoint",   to: "model" },
  { from: "endpoint",   to: "filters" },
  { from: "di",         to: "logging" },
  { from: "filters",    to: "errors" },
  { from: "routing",    to: "versioning" },
];

const groupColors: Record<string, string> = { core: "#3b82f6", security: "#ef4444", services: "#06b6d4", processing: "#a855f7" };

const sectionColors: Record<string, { badge: string }> = {
  "Request Pipeline":   { badge: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  "Security":           { badge: "bg-red-500/15 text-red-400 border-red-500/30" },
  "Services":           { badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  "Request Processing": { badge: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
};

const sections = [
  { heading: "Request Pipeline", items: [
    { title: "Middleware Pipeline", description: "How the middleware chain processes every HTTP request — ordering, branching, and short-circuiting.", href: "/aspnet-core/middleware" },
    { title: "Routing & Endpoints", description: "Route matching, attribute routing, minimal APIs, and endpoint metadata.", href: "/aspnet-core/routing" },
  ]},
  { heading: "Security", items: [
    { title: "Authentication & Authorization", description: "JWT, Cookie, OAuth2 flows, claims-based identity, and policy-based authorization.", href: "/aspnet-core/authentication" },
  ]},
  { heading: "Services", items: [
    { title: "Dependency Injection", description: "Constructor injection, service scopes per request, Singleton vs Scoped vs Transient.", href: "/aspnet-core/dependency-injection" },
    { title: "Configuration & Options", description: "appsettings.json, IOptions pattern, secrets management, and environment overrides.", href: "/aspnet-core/configuration" },
    { title: "Logging & Diagnostics", description: "ILogger pipeline, structured logging, OpenTelemetry, and distributed tracing.", href: "/aspnet-core/logging" },
  ]},
  { heading: "Request Processing", items: [
    { title: "Model Binding & Validation", description: "How request data maps to C# objects and validates them.", href: "/aspnet-core/model-binding" },
    { title: "Filters", description: "Pipeline interception — authorization, resource, action, exception, and result filters.", href: "/aspnet-core/filters" },
    { title: "API Versioning", description: "URL, query string, and header-based versioning strategies.", href: "/aspnet-core/api-versioning" },
    { title: "Error Handling", description: "RFC 7807 structured errors, global exception handling, and Problem Details.", href: "/aspnet-core/error-handling" },
  ]},
];

export default function AspNetCorePage() {
  return (
    <MotionFade>
      <div className="max-w-6xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-3 tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>ASP.NET Core Internals</h1>
          <p className="text-text-secondary max-w-2xl leading-relaxed">How HTTP requests flow through the ASP.NET Core pipeline — from middleware to endpoints, with authentication, DI, and error handling along the way.</p>
        </div>
        <CategoryConceptTree nodes={conceptNodes} edges={conceptEdges} accentColor="#3b82f6" groupColors={groupColors} title="ASP.NET Core Request Pipeline" height={470} />
        <div className="space-y-12">
          {sections.map((section, si) => {
            const colors = sectionColors[section.heading] || sectionColors["Request Pipeline"];
            return (
              <motion.div key={section.heading} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.08 }}>
                <div className="flex items-center gap-3 mb-4"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${colors.badge}`}>{section.heading}</span><div className="h-px flex-1 bg-border" /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {section.items.map((v) => (
                    <Link key={v.href} href={v.href}><Card glow className="cursor-pointer h-full group"><h3 className="text-[15px] font-semibold mb-1.5 text-text-primary group-hover:text-white transition-colors" style={{ fontFamily: "var(--font-heading)" }}>{v.title}</h3><p className="text-[13px] text-text-secondary leading-relaxed">{v.description}</p></Card></Link>
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
