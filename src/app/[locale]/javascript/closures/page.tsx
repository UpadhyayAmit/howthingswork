"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const ClosuresVisualizer = dynamic(() => import("./ClosuresVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// A closure is a function that "remembers"
// variables from its creation scope:

function createMultiplier(factor) {
  // 'factor' is enclosed in the closure
  return function (number) {
    return number * factor;
  };
}

const double = createMultiplier(2);
const triple = createMultiplier(3);

double(5);  // 10 — uses factor=2
triple(5);  // 15 — uses factor=3

// Each call to createMultiplier() creates
// a NEW closure with its OWN 'factor'`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Lexical Scoping",
    body: "JavaScript uses lexical (static) scoping — a function's accessible variables are determined by WHERE it's written in the source code, not where it's called. Inner functions can access variables from all enclosing scopes.",
  },
  {
    title: "The [[Scope]] Chain",
    body: "When a function is created, the engine attaches a hidden [[Scope]] property linking to the parent scope's variable environment. This forms a chain: local scope → parent scope → … → global scope.",
  },
  {
    title: "Closure Formation",
    body: "A closure occurs when a function references variables from an outer scope that has finished executing. Normally, local variables are garbage-collected when a function returns. But if an inner function still references them, the engine keeps those variables alive in a 'closure' object.",
  },
  {
    title: "Variable Lookup",
    body: "When a variable is accessed, the engine walks the scope chain: 1) Check local scope → 2) Check enclosing scope → 3) Keep walking up → 4) Global scope → 5) ReferenceError. This lookup happens EVERY time the variable is accessed.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  { term: "Closure", definition: "A function bundled with references to its surrounding state (lexical environment). The closed-over variables persist even after the outer function returns.", icon: "📦" },
  { term: "Lexical Environment", definition: "An internal structure that holds variable bindings for a specific scope. Each function execution creates a new lexical environment.", icon: "🗺️" },
  { term: "Scope Chain", definition: "The linked list of lexical environments that the engine traverses when resolving variable references, from innermost to outermost scope.", icon: "🔗" },
  { term: "var vs let/const", definition: "'var' is function-scoped (shared across loop iterations). 'let' and 'const' are block-scoped (each iteration gets its own binding).", icon: "⚠️" },
];

const USE_CASES: UseCase[] = [
  {
    title: "Data Privacy with Module Pattern",
    scenario: "You need a counter module where 'count' cannot be directly modified from outside — only through increment/decrement methods. No class syntax, just functions.",
    problem: "Without closures, you'd store count as a global variable or property, making it accessible and modifiable by any code. This breaks encapsulation and makes bugs harder to track.",
    solution: "Use an IIFE (Immediately Invoked Function Expression) that returns an object with methods. The 'count' variable lives in the IIFE's closure, invisible to the outside world but accessible to the returned methods.",
    takeaway: "Closures are JavaScript's primary mechanism for data privacy. Before ES2022's #private fields, closures were the ONLY way to create truly private variables in JavaScript.",
  },
  {
    title: "The Classic Loop + setTimeout Bug",
    scenario: "You create 5 buttons in a loop, each supposed to alert its index when clicked. But every button alerts '5' — the final loop value.",
    problem: "Using 'var' in a for-loop creates a single shared binding. All 5 click handlers close over the SAME 'i' variable. By the time any handler runs, the loop has finished and i === 5.",
    solution: "Replace 'var' with 'let' (creates a new binding per iteration), or wrap the handler in an IIFE that captures the current value: (function(j) { button.onclick = () => alert(j); })(i). Both create a separate closure per iteration.",
    takeaway: "This is the most common closure bug in JavaScript. Understanding that 'var' is function-scoped (one binding) while 'let' is block-scoped (one binding per iteration) eliminates this entire class of bugs.",
  },
];

export default function ClosuresPage() {
  return (
    <MotionFade>
      <Section
        title="Closures & Scope Chain"
        subtitle="How functions 'remember' variables from their creation context — the foundation of data privacy, callbacks, and functional patterns in JavaScript."
      >
        <ClosuresVisualizer />
        <ConceptExplainer
          overview="A closure is created every time a function is defined inside another function and references the outer function's variables. The inner function 'closes over' those variables, keeping them alive even after the outer function has returned."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Closure Factory Pattern", code: CODE_EXAMPLE }}
          whyItMatters="Closures power most JavaScript patterns: React hooks (useState, useEffect), Node.js middleware, event handlers, callbacks, currying, memoization, and the module pattern. Understanding closures is essential for debugging variable reference issues."
          pitfalls={[
            "Memory leaks: Closures keep referenced variables alive. If a closure accidentally captures a large object (like a DOM node), it won't be garbage-collected even if no longer needed.",
            "Loop + var trap: Using 'var' in a for-loop creates ONE shared binding. All closures see the FINAL value. Use 'let' instead for per-iteration binding.",
            "Performance: Deep scope chains require more lookups. Accessing a variable from grandparent scope is slower than local access (though modern engines optimize this).",
            "Stale closures in React: useEffect callbacks close over state values at render time. Without the dependency array, callbacks may reference outdated values.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
