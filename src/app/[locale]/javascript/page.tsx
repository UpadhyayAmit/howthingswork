"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import MotionFade from "@/app/_animations/MotionFade";
import Card from "@/app/_components/Card";
import CategoryConceptTree, {
  type ConceptNode,
  type ConceptEdge,
  type NodeShape,
} from "@/app/_ui/CategoryConceptTree";

/* ─── Concept Tree: how JS internals interconnect ─── */
const conceptNodes: ConceptNode[] = [
  { id: "event-loop",  label: "Event Loop",     x: 360, y: 0,   group: "core",   shape: "hexagon" },
  { id: "call-stack",  label: "Call Stack",      x: 100, y: 110, group: "core",   shape: "rectangle" },
  { id: "microtasks",  label: "Microtask Queue", x: 580, y: 110, group: "core",   shape: "rectangle" },
  { id: "web-apis",    label: "Web APIs",        x: 360, y: 200, group: "core",   shape: "pill" },
  { id: "promises",    label: "Promises",        x: 640, y: 230, group: "async",  shape: "rounded" },
  { id: "async-await", label: "Async/Await",     x: 800, y: 110, group: "async",  shape: "rounded" },
  { id: "closures",    label: "Closures",        x: 0,   y: 230, group: "scope",  shape: "diamond" },
  { id: "scope-chain", label: "Scope Chain",     x: 100, y: 350, group: "scope",  shape: "pill" },
  { id: "this",        label: "this",            x: 330, y: 350, group: "scope",  shape: "circle" },
  { id: "prototypes",  label: "Prototypes",      x: 0,   y: 460, group: "oop",    shape: "hexagon" },
  { id: "modules",     label: "Modules",         x: 250, y: 460, group: "oop",    shape: "rounded" },
  { id: "gc",          label: "GC (V8)",         x: 560, y: 370, group: "memory", shape: "diamond" },
  { id: "memory",      label: "Memory Leaks",   x: 770, y: 370, group: "memory", shape: "pill" },
];

const conceptEdges: ConceptEdge[] = [
  { from: "event-loop",  to: "call-stack",  animated: true },
  { from: "event-loop",  to: "microtasks",  animated: true },
  { from: "event-loop",  to: "web-apis" },
  { from: "microtasks",  to: "promises" },
  { from: "promises",    to: "async-await" },
  { from: "call-stack",  to: "closures" },
  { from: "closures",    to: "scope-chain" },
  { from: "scope-chain", to: "this" },
  { from: "scope-chain", to: "prototypes" },
  { from: "prototypes",  to: "modules" },
  { from: "closures",    to: "gc" },
  { from: "gc",          to: "memory" },
  { from: "web-apis",    to: "gc" },
];

const groupColors: Record<string, string> = {
  core:   "#eab308", // yellow
  async:  "#f97316", // orange
  scope:  "#06b6d4", // cyan
  oop:    "#a855f7", // purple
  memory: "#ef4444", // red
};

/* ─── Section data ─── */
const sectionColors: Record<string, { badge: string; text: string }> = {
  "Core Runtime": {
    badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    text: "text-yellow-400",
  },
  "Async Model": {
    badge: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    text: "text-orange-400",
  },
  "Scope & OOP": {
    badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    text: "text-cyan-400",
  },
  "Memory & Modules": {
    badge: "bg-red-500/15 text-red-400 border-red-500/30",
    text: "text-red-400",
  },
};

const sections = [
  {
    heading: "Core Runtime",
    items: [
      { title: "Event Loop & Call Stack", description: "How JavaScript handles async operations with a single thread — task queue, microtask queue, and the render cycle.", href: "/javascript/event-loop" },
      { title: "Web APIs & Browser Runtime", description: "How setTimeout, fetch, requestAnimationFrame, and other Web APIs integrate with the JS engine.", href: "/javascript/web-apis" },
    ],
  },
  {
    heading: "Async Model",
    items: [
      { title: "Promises & Microtasks", description: "Promise resolution, microtask queue priority, and how .then() chains schedule work.", href: "/javascript/promises" },
      { title: "Async/Await Internals", description: "How the compiler transforms async functions into generator-based state machines.", href: "/javascript/async-await" },
    ],
  },
  {
    heading: "Scope & OOP",
    items: [
      { title: "Closures & Scope Chain", description: "How lexical scoping works, closure memory model, and variable capture.", href: "/javascript/closures" },
      { title: "this Binding Rules", description: "4 binding rules — default, implicit, explicit, new — plus arrow function lexical this.", href: "/javascript/this-binding" },
      { title: "Prototypal Inheritance", description: "The prototype chain, __proto__ vs prototype, and how ES6 classes map to prototypes.", href: "/javascript/prototypes" },
    ],
  },
  {
    heading: "Memory & Modules",
    items: [
      { title: "Garbage Collection (V8)", description: "Mark-and-sweep, generational GC, Scavenger vs Mark-Compact, and memory profiling.", href: "/javascript/garbage-collection" },
      { title: "Module System (ESM vs CJS)", description: "Static vs dynamic imports, tree-shaking, circular dependencies, and dual packages.", href: "/javascript/modules" },
      { title: "Memory Leaks & Debugging", description: "Detached DOM nodes, closures over large scopes, WeakRef, and Chrome DevTools heap snapshots.", href: "/javascript/memory-leaks" },
    ],
  },
];

export default function JavaScriptPage() {
  return (
    <MotionFade>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="mb-10">
          <h1
            className="text-3xl font-bold mb-3 tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            JavaScript Engine Internals
          </h1>
          <p className="text-text-secondary max-w-2xl leading-relaxed">
            Deep-dive into how the JavaScript engine actually runs your code — from the
            event loop and call stack to closures, prototypes, and memory management.
          </p>
        </div>

        {/* Concept Tree */}
        <CategoryConceptTree
          nodes={conceptNodes}
          edges={conceptEdges}
          accentColor="#eab308"
          groupColors={groupColors}
          title="How JavaScript Concepts Connect"
          height={460}
        />

        {/* Sections */}
        <div className="space-y-12">
          {sections.map((section, si) => {
            const colors = sectionColors[section.heading] || sectionColors["Core Runtime"];
            return (
              <motion.div
                key={section.heading}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: si * 0.08 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${colors.badge}`}
                  >
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
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {v.title}
                        </h3>
                        <p className="text-[13px] text-text-secondary leading-relaxed">
                          {v.description}
                        </p>
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
