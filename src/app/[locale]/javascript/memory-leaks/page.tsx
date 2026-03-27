"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const MemoryLeaksVisualizer = dynamic(() => import("./MemoryLeaksVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// Detecting memory leaks with Chrome DevTools:

// 1. Timeline Recording:
//    Performance tab → Record → Interact → Stop
//    Look for JS Heap growing over time (sawtooth = normal)

// 2. Heap Snapshots:
//    Memory tab → Take snapshot → Compare snapshots
//    Filter by "Objects allocated between snapshots"

// 3. Allocation Timeline:
//    Memory tab → Allocation sampling → Record

// Common debugging pattern:
performance.mark("before");
// ... suspected leaky operation ...
performance.mark("after");
performance.measure("leak-test", "before", "after");

// WeakRef — hold reference without preventing GC:
const weakRef = new WeakRef(largeObject);
const obj = weakRef.deref(); // undefined if GC'd

// FinalizationRegistry — callback when object is GC'd:
const registry = new FinalizationRegistry((key) => {
  console.log(\`Object \${key} was garbage collected\`);
});
registry.register(myObject, "myObject-id");`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "What Is a Memory Leak?",
    body: "A memory leak occurs when objects that are no longer needed remain reachable (from GC roots), preventing garbage collection. In JavaScript, this usually means unintentional references: forgotten timers, closures, event listeners, or caches that never evict.",
  },
  {
    title: "The Heap Grows, Never Shrinks",
    body: "Normal memory usage shows a sawtooth pattern: allocations grow, GC runs and frees memory, repeat. A leak shows a staircase pattern: each GC cycle frees LESS memory because leaked objects accumulate. Eventually, the page crashes with 'out of memory'.",
  },
  {
    title: "Finding Leaks with Heap Snapshots",
    body: "Chrome DevTools Memory tab lets you take heap snapshots. Take snapshot A, perform an action, undo it, take snapshot B. Compare: objects that exist in B but not A are potential leaks. Look for 'Detached DOM' trees and large retained sizes.",
  },
  {
    title: "Preventing Leaks: The Cleanup Pattern",
    body: "Every allocation should have a corresponding deallocation: addEventListener → removeEventListener, setInterval → clearInterval, subscribe → unsubscribe. In React, useEffect's return function is the cleanup mechanism.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  { term: "Shallow Size", definition: "Memory held by an object itself, excluding referenced objects. A string or number in the object's own properties.", icon: "📏" },
  { term: "Retained Size", definition: "Total memory that would be freed if this object were garbage collected (including all objects it keeps alive exclusively).", icon: "💾" },
  { term: "Detached DOM Tree", definition: "A DOM subtree removed from document.body but still referenced by JavaScript. The entire tree stays in memory.", icon: "🌳" },
  { term: "WeakRef / WeakMap", definition: "Hold references without preventing GC. WeakRef.deref() returns undefined if collected. WeakMap keys are weakly held.", icon: "🔗" },
];

const USE_CASES: UseCase[] = [
  {
    title: "SPA Memory Growth Over Time",
    scenario: "Your React SPA's memory usage grows from 50MB to 300MB after 30 minutes of navigation. Users on low-memory devices experience crashes. The sawtooth pattern disappears — GC can't reclaim memory.",
    problem: "Each React component navigation creates subscriptions, event listeners, and closures. Without proper cleanup in useEffect, these accumulate. After 100+ navigations, thousands of orphaned references prevent GC from reclaiming component trees.",
    solution: "Audit every useEffect for a cleanup return function. Use the React DevTools Profiler to identify components that remount frequently. Implement a subscription manager that auto-cleans on unmount. Use WeakMap for component-keyed caches.",
    takeaway: "SPAs are especially prone to memory leaks because page navigations don't trigger full page reloads. The only GC opportunity is proper cleanup. Every subscription, listener, and timer in your React app must have a corresponding cleanup.",
  },
  {
    title: "Node.js Server Memory Leak in Production",
    scenario: "Your Express.js API server's memory grows by 10MB/hour. After 2 days, it hits the 1.5GB heap limit and crashes with 'FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed'.",
    problem: "A global Map caches database query results without eviction. Each unique query adds an entry that's never removed. The Map grows linearly with unique requests, eventually consuming all available heap.",
    solution: "Replace the Map with an LRU cache (e.g., lru-cache package) with a maxSize. Monitor with --inspect flag and take periodic heap snapshots. Set up PM2 with --max-memory-restart to auto-restart if memory exceeds a threshold.",
    takeaway: "Server memory leaks are different from client leaks — they compound over hours/days instead of minutes. Unbounded caches are the #1 cause. Always use an LRU or TTL-based cache and monitor heap usage in production.",
  },
];

export default function MemoryLeaksPage() {
  return (
    <MotionFade>
      <Section
        title="Memory Leaks & Debugging"
        subtitle="Common memory leak patterns in JavaScript — how to detect, debug, and prevent them with DevTools and proper cleanup."
      >
        <MemoryLeaksVisualizer />
        <ConceptExplainer
          overview="Memory leaks in JavaScript occur when objects that are no longer needed remain reachable by the garbage collector. Unlike languages with manual memory management (C/C++), JS leaks are always caused by unintentional references — forgotten timers, closures, event listeners, and growing caches."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Debugging & Prevention Tools", code: CODE_EXAMPLE }}
          whyItMatters="Memory leaks cause progressive performance degradation, UI freezes, and eventual crashes. In SPAs and long-running Node.js servers, they're the #1 production stability issue. Mastering leak detection and prevention is essential for production-grade JavaScript."
          pitfalls={[
            "Chrome DevTools console.log() itself prevents GC of logged objects! Clear the console or disable logging when profiling memory.",
            "React Strict Mode double-invokes effects in dev, which can mask leak detection. Test memory profiling with Strict Mode disabled.",
            "window.performance entries accumulate indefinitely. Large apps with thousands of mark/measure calls can leak through performance entries.",
            "Third-party libraries can leak. Always check for cleanup methods (destroy(), dispose(), unsubscribe()) in library documentation.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
