"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const PromisesVisualizer = dynamic(() => import("./PromisesVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// Promise is a state machine: pending → fulfilled | rejected

const promise = new Promise((resolve, reject) => {
  // Async work here...
  setTimeout(() => resolve("data"), 1000);
});

promise
  .then(data => {
    console.log(data);       // "data"
    return transform(data);  // returns new Promise
  })
  .then(result => render(result))
  .catch(err => handleError(err))  // catches ANY error above
  .finally(() => hideSpinner());   // runs regardless

// Promise.all — parallel execution
const [users, posts] = await Promise.all([
  fetch('/api/users'),
  fetch('/api/posts'),
]);

// Promise.race — first to settle wins
const result = await Promise.race([
  fetch('/api/data'),
  timeout(5000),  // reject after 5s
]);`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Promise States (One-Way Transitions)",
    body: "A Promise starts in 'pending' state. It can transition to 'fulfilled' (resolved with a value) or 'rejected' (rejected with a reason). Once settled, it NEVER changes state again — this immutability is a key design feature.",
  },
  {
    title: ".then() Creates New Promises",
    body: "Every .then() call returns a NEW Promise. If the handler returns a value, the new Promise is fulfilled with that value. If it returns another Promise, the new Promise 'follows' it. If it throws, the new Promise is rejected.",
  },
  {
    title: "Microtask Queue Integration",
    body: "Promise callbacks (.then, .catch, .finally) are always scheduled as microtasks, not run synchronously. This means they execute after the current synchronous code completes but before any macrotasks (setTimeout, etc.).",
  },
  {
    title: "Error Propagation",
    body: "Rejections propagate down the chain until they hit a .catch() handler. If no .catch() exists, you get an 'unhandled promise rejection'. .catch(fn) is equivalent to .then(null, fn) — it returns a new Promise, so the chain can continue after catching.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  { term: "Thenable", definition: "Any object with a .then() method. Promises interop with thenables — if you return a thenable from .then(), the Promise adopts its state.", icon: "🔄" },
  { term: "Promise.all()", definition: "Runs promises in parallel. Resolves when ALL fulfill (returns array of results). Rejects as soon as ANY promise rejects.", icon: "⚡" },
  { term: "Promise.allSettled()", definition: "Like .all() but waits for ALL promises to settle (fulfill or reject). Never rejects — returns array of {status, value/reason} objects.", icon: "📊" },
  { term: "Promise.race()", definition: "Resolves or rejects with the FIRST promise that settles. Commonly used for timeout patterns.", icon: "🏁" },
  { term: "Unhandled Rejection", definition: "A rejected Promise with no .catch() handler. In Node.js, this crashes the process. Always add error handling to promise chains.", icon: "💥" },
];

const USE_CASES: UseCase[] = [
  {
    title: "Parallel API Calls with Promise.all()",
    scenario: "Your dashboard page needs data from 5 API endpoints. Loading them sequentially takes 5 seconds (1s each). Users see a blank screen for too long.",
    problem: "Sequential awaits: await fetch(A); await fetch(B); await fetch(C)... means each request waits for the previous one to finish. Total time = sum of all request times.",
    solution: "Use Promise.all([fetch(A), fetch(B), fetch(C)...]). All requests fire simultaneously. Total time = time of the SLOWEST request (usually ~1-1.5s instead of 5s).",
    takeaway: "Promise.all() is the standard pattern for independent parallel operations. Use it whenever multiple async operations don't depend on each other's results.",
  },
  {
    title: "Timeout Pattern with Promise.race()",
    scenario: "Your API call sometimes takes 30+ seconds due to server issues. Users are stuck on a loading screen with no feedback, eventually abandoning the page.",
    problem: "fetch() has no built-in timeout. The browser's default timeout is very long (300s in Chrome). There's no way to configure it with standard fetch options.",
    solution: "Race the fetch against a timeout Promise: Promise.race([fetch(url), new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))]). If fetch doesn't resolve in 5 seconds, the timeout Promise rejects first.",
    takeaway: "Promise.race() is the idiomatic way to implement timeouts in JavaScript. Libraries like axios use AbortController, but the race pattern works universally with any Promise-based API.",
  },
];

export default function PromisesPage() {
  return (
    <MotionFade>
      <Section
        title="Promises & Microtasks"
        subtitle="How Promises manage async state transitions — from pending to settled — and why their callbacks always run before setTimeout."
      >
        <PromisesVisualizer />
        <ConceptExplainer
          overview="A Promise is a state machine representing an asynchronous operation's eventual result. It provides a clean, chainable API (.then/.catch/.finally) that replaces nested callbacks and integrates with the microtask queue for deterministic execution ordering."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Promise Patterns", code: CODE_EXAMPLE }}
          whyItMatters="Promises are the foundation of modern async JavaScript. async/await is built on top of Promises. fetch(), most Node.js APIs, and every modern library returns Promises. Understanding their state machine, chaining, and error propagation is essential."
          pitfalls={[
            "Forgetting to return in .then() handlers. Without return, the next .then() receives undefined instead of your transformed value.",
            "Using .then(success, error) vs .then(success).catch(error) — the latter catches errors thrown in the success handler too.",
            "Promise.all() fails fast — if 1 of 10 promises rejects, you lose all results. Use Promise.allSettled() to get all results regardless.",
            "Creating promises in a loop without awaiting can fire thousands of requests simultaneously. Use for...of with await or batch with Promise.all() in chunks.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
