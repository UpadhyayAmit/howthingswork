"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import MotionFade from "@/app/_animations/MotionFade";
import Card from "@/app/_components/Card";
import CategoryConceptTree, { type ConceptNode, type ConceptEdge } from "@/app/_ui/CategoryConceptTree";

const conceptNodes: ConceptNode[] = [
  { id: "clr",         label: "CLR",                 x: 350, y: 0,   group: "core",     shape: "hexagon" },
  { id: "jit",         label: "JIT Compiler",        x: 50,  y: 120, group: "core",     shape: "diamond" },
  { id: "gc",          label: "GC",                  x: 350, y: 120, group: "core",     shape: "circle" },
  { id: "val-ref",     label: "Value vs Ref",        x: 620, y: 120, group: "core",     shape: "pill" },
  { id: "async",       label: "async/await",         x: 0,   y: 270, group: "features", shape: "rounded" },
  { id: "linq",        label: "LINQ",                x: 220, y: 270, group: "features", shape: "hexagon" },
  { id: "delegates",   label: "Delegates",           x: 480, y: 270, group: "features", shape: "rounded" },
  { id: "generics",    label: "Generics",            x: 720, y: 270, group: "features", shape: "diamond" },
  { id: "di",          label: "DI Container",        x: 120, y: 410, group: "patterns", shape: "pill" },
  { id: "reflection",  label: "Reflection",          x: 520, y: 410, group: "advanced", shape: "circle" },
];

const conceptEdges: ConceptEdge[] = [
  { from: "clr",        to: "jit",        animated: true },
  { from: "clr",        to: "gc",         animated: true },
  { from: "clr",        to: "val-ref" },
  { from: "gc",         to: "val-ref" },
  { from: "jit",        to: "async" },
  { from: "clr",        to: "linq" },
  { from: "val-ref",    to: "delegates" },
  { from: "val-ref",    to: "generics" },
  { from: "async",      to: "di" },
  { from: "generics",   to: "reflection" },
  { from: "linq",       to: "di" },
];

const groupColors: Record<string, string> = { core: "#a855f7", features: "#06b6d4", patterns: "#10b981", advanced: "#f59e0b" };

const sections = [
  { heading: "Core Runtime", badge: "bg-purple-500/15 text-purple-400 border-purple-500/30", items: [
    { title: "CLR Architecture", description: "AppDomains, managed execution model, and the Common Language Runtime pipeline.", href: "/csharp-clr/clr-architecture" },
    { title: "JIT Compilation", description: "IL → native code, tiered compilation, ReadyToRun, and crossgen2.", href: "/csharp-clr/jit-visualizer" },
    { title: "Garbage Collector", description: "Generational GC, LOH, pinning, GC modes, and memory pressure.", href: "/csharp-clr/gc-visualizer" },
    { title: "Value Types vs Reference Types", description: "Stack vs heap allocation, boxing/unboxing costs, and Span<T>.", href: "/csharp-clr/value-reference-types" },
  ]},
  { heading: "Language Features", badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30", items: [
    { title: "async/await State Machine", description: "How the compiler rewrites async methods into state machine classes.", href: "/csharp-clr/async-state-machine" },
    { title: "LINQ Deferred Execution", description: "IEnumerable pipeline, expression trees, and query provider model.", href: "/csharp-clr/linq-execution" },
    { title: "Delegates & Events", description: "Multicast delegates, event patterns, and lambda closures.", href: "/csharp-clr/delegates-events" },
    { title: "Generics & Reification", description: "Reified generics vs Java type erasure, constraints, and covariance.", href: "/csharp-clr/generics" },
  ]},
  { heading: "Patterns & Advanced", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", items: [
    { title: "DI Container & Service Lifetimes", description: "Singleton vs Scoped vs Transient, captive dependencies, and disposal.", href: "/csharp-clr/dependency-injection" },
    { title: "Reflection & Source Generators", description: "Assembly inspection, metadata, and compile-time code generation.", href: "/csharp-clr/reflection" },
  ]},
];

export default function CSharpCLRPage() {
  return (
    <MotionFade>
      <div className="max-w-6xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-3 tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>C# & .NET Runtime</h1>
          <p className="text-text-secondary max-w-2xl leading-relaxed">How the .NET runtime executes your C# code — from JIT compilation and garbage collection to async state machines and generics.</p>
        </div>
        <CategoryConceptTree nodes={conceptNodes} edges={conceptEdges} accentColor="#a855f7" groupColors={groupColors} title="CLR & C# Concept Map" height={440} />
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
