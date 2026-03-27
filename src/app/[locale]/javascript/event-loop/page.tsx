"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const EventLoopVisualizer = dynamic(() => import("./EventLoopVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// Classic event loop puzzle:
console.log("1: Script start");

setTimeout(() => console.log("5: setTimeout"), 0);

Promise.resolve()
  .then(() => console.log("3: Promise 1"))
  .then(() => console.log("4: Promise 2"));

console.log("2: Script end");

// Output order: 1, 2, 3, 4, 5
// Why? Microtasks (Promises) run BEFORE macrotasks (setTimeout)
// even though setTimeout(cb, 0) was registered first!`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Synchronous Execution",
    body: "JavaScript is single-threaded. The engine executes code top-to-bottom, pushing function calls onto the Call Stack. Each function runs to completion before the next one starts.",
  },
  {
    title: "Web APIs & Registration",
    body: "When you call setTimeout, fetch, or addEventListener, the browser's Web APIs handle the async work outside the JS thread. When complete, the callback is placed into a queue.",
  },
  {
    title: "Microtask Queue (High Priority)",
    body: "Promises (.then, .catch, .finally), MutationObserver, and queueMicrotask() callbacks go into the Microtask Queue. This queue is drained COMPLETELY after every task — before the browser renders or picks up the next macrotask.",
  },
  {
    title: "Macrotask Queue (Low Priority)",
    body: "setTimeout, setInterval, I/O, and UI events go into the Macrotask Queue. The Event Loop picks ONE macrotask per cycle, executes it, then drains all microtasks before the next macrotask.",
  },
  {
    title: "The Event Loop Cycle",
    body: "1) Run all synchronous code → 2) Drain the entire Microtask Queue → 3) Browser may render → 4) Pick ONE Macrotask → 5) Repeat. This is why Promise callbacks always run before setTimeout(cb, 0).",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  { term: "Call Stack", definition: "LIFO data structure tracking function execution. JavaScript can only do one thing at a time — the current stack frame.", icon: "📚" },
  { term: "Microtask Queue", definition: "High-priority queue for Promise callbacks and queueMicrotask. Drained completely between every task.", icon: "⚡" },
  { term: "Macrotask Queue", definition: "Lower-priority queue for setTimeout, setInterval, I/O callbacks. One task processed per event loop tick.", icon: "⏰" },
  { term: "Event Loop", definition: "The orchestrator that checks: is the stack empty? If yes, drain microtasks, then pick one macrotask. Repeat forever.", icon: "🔄" },
  { term: "Run-to-Completion", definition: "Each function on the call stack runs fully before yielding. You can't interrupt synchronous code mid-execution.", icon: "🏃" },
];

const USE_CASES: UseCase[] = [
  {
    title: "UI Freezing from Long Synchronous Operations",
    scenario: "Your React app processes a 10,000-row CSV file using a synchronous loop. The UI completely freezes — buttons don't respond, animations stutter, and users think the app crashed.",
    problem: "The synchronous loop occupies the Call Stack for ~3 seconds. Since JavaScript is single-threaded, the Event Loop cannot process any UI events (clicks, scrolls) or render frames until the loop finishes. The browser literally cannot update the screen.",
    solution: "Break the work into chunks using requestIdleCallback or setTimeout(chunk, 0). Each chunk processes ~500 rows, then yields back to the Event Loop, allowing the browser to process pending UI events and render between chunks. Alternatively, move the processing to a Web Worker (separate thread).",
    takeaway: "Understanding the Event Loop reveals why long sync operations freeze the UI. The loop can't reach the 'render' or 'pick macrotask' phase if the call stack is never empty. Always yield for heavy computation.",
  },
  {
    title: "Race Condition Between setTimeout and Promises",
    scenario: "You register a setTimeout(cb, 0) to update state, then a Promise.then() to read that state. The Promise callback sees stale data because it runs BEFORE the timeout — even though setTimeout was called first.",
    problem: "Developers assume 'setTimeout(cb, 0)' means 'run immediately after current code'. But 0ms just means 'enqueue in the Macrotask Queue as soon as possible'. Promise callbacks go to the Microtask Queue, which has higher priority.",
    solution: "Never rely on execution order between different queue types. If order matters, chain operations using the same mechanism (all Promises, or all setTimeouts). For reading after a write, use await or .then() chaining to guarantee sequence.",
    takeaway: "The Microtask Queue is always drained before any Macrotask runs. This queue priority model explains most 'unexpected execution order' bugs in async JavaScript code.",
  },
];

export default function EventLoopPage() {
  return (
    <MotionFade>
      <Section
        title="Event Loop & Call Stack"
        subtitle="How JavaScript handles async operations with a single thread — task queue, microtask queue, and the render cycle."
      >
        <EventLoopVisualizer />
        <ConceptExplainer
          overview="JavaScript is single-threaded, yet it handles thousands of concurrent operations. The secret is the Event Loop — a continuous cycle that coordinates the Call Stack, Microtask Queue, and Macrotask Queue to execute code without blocking."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Event Loop Execution Order", code: CODE_EXAMPLE }}
          whyItMatters="Understanding the Event Loop is foundational to debugging async bugs, preventing UI freezes, and writing performant JavaScript. Every Promise, setTimeout, fetch, and event handler flows through this mechanism."
          pitfalls={[
            "setTimeout(cb, 0) does NOT mean 'run immediately' — it means 'add to macrotask queue with minimum delay'. The actual delay depends on the queue.",
            "Microtasks can starve the render cycle. An infinite chain of Promise.then() calls will block painting because the microtask queue must be fully drained before rendering.",
            "async/await is syntactic sugar over Promises. The code after 'await' runs as a microtask, NOT synchronously.",
            "Node.js has a slightly different event loop with additional phases (timers, I/O callbacks, idle, poll, check, close). process.nextTick() runs even before Promise microtasks.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
