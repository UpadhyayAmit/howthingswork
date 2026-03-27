"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const AsyncAwaitVisualizer = dynamic(() => import("./AsyncAwaitVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// async function = returns Promise automatically
async function getUser(id) {
  try {
    const resp = await fetch(\`/api/users/\${id}\`);
    if (!resp.ok) throw new Error(\`HTTP \${resp.status}\`);
    const user = await resp.json();
    return user; // resolves the Promise
  } catch (err) {
    console.error("Failed:", err);
    throw err;   // rejects the Promise
  }
}

// Sequential vs Parallel:
// ❌ Sequential (slow — waits for each):
const users = await getUser(1);
const posts = await getPosts(1);

// ✅ Parallel (fast — runs simultaneously):
const [users, posts] = await Promise.all([
  getUser(1),
  getPosts(1),
]);`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "async = Promise Factory",
    body: "An async function ALWAYS returns a Promise. Even if you return a plain value (return 42), it's wrapped in Promise.resolve(42). If your function throws, the returned Promise is rejected.",
  },
  {
    title: "await = Suspension Point",
    body: "When the engine hits 'await expr', it: 1) Evaluates expr (creates/gets a Promise). 2) Suspends the async function's execution. 3) Returns control to the caller (event loop continues). 4) When the Promise settles, resumes the function from that point.",
  },
  {
    title: "State Machine Compilation",
    body: "The engine compiles async/await into a state machine (generator-like). Each 'await' becomes a state boundary. The function's local variables are captured so they survive across suspensions. This is why the function can resume exactly where it left off.",
  },
  {
    title: "Error Handling with try/catch",
    body: "await unwraps the Promise. If the Promise rejects, 'await' re-throws the rejection as a regular exception. This is why try/catch works with async/await — rejected Promises become caught exceptions.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  { term: "async function", definition: "Syntactic sugar that makes a function return a Promise and enables the 'await' keyword inside it.", icon: "🔧" },
  { term: "await", definition: "Pauses async function execution until the awaited Promise settles. Returns the fulfilled value or throws the rejection reason.", icon: "⏸️" },
  { term: "Top-level await", definition: "ES2022 feature allowing 'await' at module top level (not inside a function). Only works in ES modules, not CommonJS.", icon: "🏗️" },
  { term: "for await...of", definition: "Iterates over async iterables (e.g., readable streams). Each iteration awaits the next value.", icon: "🔁" },
];

const USE_CASES: UseCase[] = [
  {
    title: "Accidental Sequential Awaits",
    scenario: "Your API handler fetches user data, permissions, and preferences. It takes 3 seconds because each await runs sequentially, even though the calls are independent.",
    problem: "Writing 'const user = await getUser(); const perms = await getPerms();' means getPerms() doesn't start until getUser() finishes. Three 1-second calls take 3 seconds total.",
    solution: "Start all Promises first, then await them: 'const [user, perms, prefs] = await Promise.all([getUser(), getPerms(), getPrefs()])'. All three run in parallel — total time is ~1 second.",
    takeaway: "Sequential awaits are the #1 async performance mistake. Always ask: 'Does this await depend on the result of the previous one?' If not, use Promise.all() for parallelism.",
  },
  {
    title: "Stale Closures in React useEffect",
    scenario: "Your useEffect calls an async function that reads a state variable. The effect shows stale data even though the state has been updated.",
    problem: "The async function closes over the state value at the time the effect ran. If state updates while the async operation is in flight, the resumed function still sees the OLD value from its closure.",
    solution: "Use the cleanup function to set an 'isCancelled' flag. When the async function resumes, check the flag before updating state. Or use useRef to always read the latest value.",
    takeaway: "async/await in React creates closures around state snapshots. Combined with Strict Mode's double-invocation, this causes subtle bugs. Understanding both closures and async/await together is essential for React development.",
  },
];

export default function AsyncAwaitPage() {
  return (
    <MotionFade>
      <Section
        title="Async/Await Under the Hood"
        subtitle="How async/await compiles to state machines and Promise chains — the syntactic sugar that transformed JavaScript async programming."
      >
        <AsyncAwaitVisualizer />
        <ConceptExplainer
          overview="async/await is syntactic sugar over Promises. An 'async' function returns a Promise. 'await' suspends execution at that point, lets the event loop continue, and resumes when the awaited Promise settles. Under the hood, the engine compiles this into a state machine."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "async/await Patterns", code: CODE_EXAMPLE }}
          whyItMatters="async/await makes asynchronous code read like synchronous code, dramatically improving readability. But understanding the underlying mechanics prevents common bugs like sequential awaits, stale closures, and unhandled rejections."
          pitfalls={[
            "Forgetting to 'await' an async function. Without await, you get a Promise object instead of the resolved value — and errors silently disappear.",
            "Using await in Array.forEach(). forEach ignores the returned Promise. Use for...of loop or Promise.all(arr.map(async ...)) instead.",
            "async arrow functions in event handlers need error boundaries. Unhandled rejections in React event handlers won't trigger error boundaries.",
            "Every 'await' creates a microtask checkpoint. Excessive awaits in tight loops can cause micro-stutter in UI rendering.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
