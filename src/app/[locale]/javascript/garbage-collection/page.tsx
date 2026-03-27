"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const GCVisualizer = dynamic(() => import("./GarbageCollectionVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// Memory lifecycle in JavaScript:
// 1. Allocate → 2. Use → 3. Release (automatic via GC)

let user = { name: "Alice", data: new Array(1e6) };
// → Allocated in Young Generation (V8 heap)

user = null;
// → No more references → eligible for GC
// → V8 will collect it in next Scavenge cycle

// Common leak patterns:
// 1. Forgotten timers
const id = setInterval(() => {
  doSomething(hugeData); // hugeData can't be GC'd
}, 1000);
// Fix: clearInterval(id) when done

// 2. Closures retaining large objects
function process() {
  const bigData = loadHugeFile();
  return () => bigData.length; // closure keeps bigData alive!
}

// 3. Detached DOM nodes
const el = document.createElement("div");
document.body.append(el);
el.remove(); // removed from DOM but still referenced by 'el'
// Fix: el = null; after removal`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Generational Hypothesis",
    body: "V8 divides the heap into Young Generation (short-lived objects) and Old Generation (long-lived objects). Most objects die young — 70-90% of allocations are collected in the first GC cycle. This insight drives V8's two-collector strategy.",
  },
  {
    title: "Scavenger (Young Generation)",
    body: "Uses a semi-space copying algorithm. Memory is split into 'from-space' and 'to-space'. During GC: 1) Trace reachable objects from roots. 2) Copy living objects to to-space. 3) Swap the spaces. Very fast (~1-2ms) but covers small memory.",
  },
  {
    title: "Mark-Sweep-Compact (Old Generation)",
    body: "For long-lived objects that survive 2+ Scavenger cycles. Mark: trace from roots, mark reachable. Sweep: free unmarked memory. Compact: defragment by moving objects together. Slower but handles the full heap.",
  },
  {
    title: "Incremental & Concurrent GC",
    body: "V8 doesn't stop the world for the entire GC. Mark phase is incremental (interleaved with JS execution). Sweeping runs on background threads concurrently. This keeps GC pauses under 1ms in most cases.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  { term: "Reachability", definition: "An object is 'alive' if it's reachable from a root (global, stack, active closures). Unreachable objects are candidates for collection.", icon: "🔗" },
  { term: "GC Roots", definition: "Starting points for reachability analysis: global object, current call stack variables, active closures, and registered callbacks.", icon: "🌱" },
  { term: "Young Generation", definition: "Small heap region (~1-8MB) for new allocations. Collected frequently by the fast Scavenger algorithm.", icon: "🐣" },
  { term: "Old Generation", definition: "Larger heap region for objects that survived 2+ young-gen collections. Collected by the slower Mark-Sweep-Compact.", icon: "🏛️" },
  { term: "Write Barrier", definition: "Mechanism that tracks when old-gen objects point to young-gen objects. Without it, the Scavenger would need to scan the entire heap.", icon: "🚧" },
];

const USE_CASES: UseCase[] = [
  {
    title: "Memory Leak from Event Listeners",
    scenario: "Your SPA adds scroll listeners for infinite loading. After navigating away, memory usage keeps climbing. The heap snapshot shows thousands of detached DOM trees.",
    problem: "Event listeners from unmounted components still reference DOM nodes and component closures. The GC can't collect them because the listener registration (on window/document) holds a strong reference.",
    solution: "Always remove event listeners in cleanup: React's useEffect return function, or AbortController for addEventListener. Use WeakRef or WeakMap for caches that should be GC-eligible.",
    takeaway: "The GC can only collect unreachable objects. Event listeners, timers, and global references create 'invisible' roots that keep object trees alive. Always clean up registrations when components unmount.",
  },
  {
    title: "GC Pauses Causing Frame Drops",
    scenario: "Your canvas-based game or animation stutters every few seconds. DevTools Performance panel shows minor GC pauses of 5-10ms — enough to drop a frame at 60fps.",
    problem: "The game allocates thousands of small objects per frame (particles, vectors, collision results). The young generation fills up quickly, triggering frequent Scavenger runs. Each run pauses JS execution.",
    solution: "Object pooling: pre-allocate a fixed pool of objects and recycle them instead of creating new ones. Avoid allocations in hot paths. Use TypedArrays for numeric data (contiguous memory, no GC overhead).",
    takeaway: "GC is automatic but not free. In performance-critical code (games, animations, audio processing), minimizing allocations is crucial. Object pooling and TypedArrays bypass GC pressure entirely.",
  },
];

export default function GarbageCollectionPage() {
  return (
    <MotionFade>
      <Section
        title="Garbage Collection (V8)"
        subtitle="How V8 automatically frees memory — generational collection, mark-and-sweep, and why memory leaks still happen."
      >
        <GCVisualizer />
        <ConceptExplainer
          overview="JavaScript automatically manages memory through garbage collection. V8 uses a generational strategy: a fast Scavenger for short-lived objects and a Mark-Sweep-Compact collector for long-lived objects. Understanding GC helps prevent memory leaks and optimize performance-critical applications."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Memory Lifecycle & Leak Patterns", code: CODE_EXAMPLE }}
          whyItMatters="Memory leaks are the #1 production issue in long-running JavaScript applications (SPAs, Node.js servers). Understanding GC reveals why leaks happen, how to detect them with heap snapshots, and how to write allocation-efficient code."
          pitfalls={[
            "Setting a variable to null doesn't immediately free memory. It makes the object eligible for GC, but collection happens at the engine's discretion.",
            "Console.log in Chrome DevTools keeps references to logged objects, preventing GC. Remove console.logs in production.",
            "WeakRef doesn't guarantee the object will be collected — it just ALLOWS collection. Don't use it for critical resource management.",
            "Large ArrayBuffers are allocated outside the V8 heap. They follow different rules and can cause memory pressure even when the JS heap looks fine.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
