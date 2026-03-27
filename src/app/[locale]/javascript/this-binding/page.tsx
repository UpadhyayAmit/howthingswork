"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const ThisBindingVisualizer = dynamic(() => import("./ThisBindingVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// Priority: new > explicit > implicit > default

// Implicit binding — object before the dot:
const user = {
  name: "Alice",
  greet() { return "Hi, " + this.name; }
};
user.greet(); // "Hi, Alice"

// Implicit binding LOST:
const fn = user.greet; // extracted method
fn(); // "Hi, undefined" — this is now global/undefined!

// Fix with bind:
const bound = user.greet.bind(user);
bound(); // "Hi, Alice"

// Arrow function — lexical this:
class Timer {
  seconds = 0;
  start() {
    setInterval(() => {
      this.seconds++;  // ✅ 'this' is the Timer instance
    }, 1000);
  }
}`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "this is Determined at CALL TIME",
    body: "Unlike most languages where 'this' is determined by where the method is defined, JavaScript's 'this' depends on HOW the function is called. The same function can have different 'this' values depending on the call site.",
  },
  {
    title: "4 Binding Rules (Priority Order)",
    body: "1) new Binding (highest): new Foo() → this = fresh object. 2) Explicit: call/apply/bind → this = specified object. 3) Implicit: obj.method() → this = obj. 4) Default (lowest): solo() → this = globalThis or undefined (strict).",
  },
  {
    title: "Arrow Functions: Lexical this",
    body: "Arrow functions don't have their own 'this'. They capture 'this' from the enclosing scope at DEFINITION time (not call time). This makes them ideal for callbacks and event handlers where you want to preserve the outer 'this'.",
  },
  {
    title: "Common Pitfall: Implicit Binding Loss",
    body: "When you extract a method (const fn = obj.method), the implicit binding is lost. fn() is now a bare function call → default binding. This is why React class component methods need .bind(this) in the constructor.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  { term: "Call Site", definition: "The location in code where a function is called. It determines 'this' by applying the 4 binding rules. Not where the function is defined.", icon: "📍" },
  { term: "bind()", definition: "Creates a new function with 'this' permanently set. Cannot be overridden by further bind/call/apply (hard binding).", icon: "🔒" },
  { term: "globalThis", definition: "The global 'this' value: 'window' in browsers, 'global' in Node.js, 'self' in workers. Standardized in ES2020.", icon: "🌍" },
  { term: "Strict Mode", definition: "In strict mode, default binding gives this = undefined instead of globalThis. This prevents accidentally polluting the global object.", icon: "⚠️" },
];

const USE_CASES: UseCase[] = [
  {
    title: "React Class Component Methods",
    scenario: "Your React class component's onClick handler logs 'Cannot read property name of undefined'. The method works when called directly but breaks when passed as an event handler.",
    problem: "Passing this.handleClick to onClick extracts the method, losing the implicit binding. When React calls the handler, 'this' is undefined (React uses strict mode internally).",
    solution: "Three options: 1) Bind in constructor: this.handleClick = this.handleClick.bind(this). 2) Class field with arrow function: handleClick = () => { ... }. 3) Use functional components with hooks (eliminates 'this' entirely).",
    takeaway: "This is why React moved to functional components. Hooks eliminate 'this' binding confusion by using closures instead. If you maintain class components, always bind or use arrow function class fields.",
  },
  {
    title: "Event Listener Context",
    scenario: "Your vanilla JS code attaches obj.handleClick as a DOM event listener. Inside the handler, 'this' points to the DOM element, not your object.",
    problem: "addEventListener sets 'this' to the element that triggered the event (implicit binding by the browser). Your object's properties are inaccessible via 'this'.",
    solution: "Use bind: el.addEventListener('click', obj.handleClick.bind(obj)). Or use an arrow function wrapper: el.addEventListener('click', () => obj.handleClick()). For removal, store the bound reference.",
    takeaway: "Browser APIs rebind 'this' to the DOM element. This is by design — it's useful for event delegation. But if you need your object's context, you must explicitly preserve it.",
  },
];

export default function ThisBindingPage() {
  return (
    <MotionFade>
      <Section
        title="this Binding Rules"
        subtitle="How JavaScript determines 'this' at call time — the 4 binding rules, arrow functions, and why methods lose their context."
      >
        <ThisBindingVisualizer />
        <ConceptExplainer
          overview="In JavaScript, 'this' is not determined by where a function is defined, but by HOW it is called. There are 4 binding rules with a strict priority order. Arrow functions are the exception — they capture 'this' lexically from their enclosing scope."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "this Binding Patterns", code: CODE_EXAMPLE }}
          whyItMatters="'this' is one of the most confusing parts of JavaScript. Understanding the 4 binding rules eliminates an entire class of bugs: lost context in callbacks, event handlers, class methods, and setTimeout. It also explains why arrow functions and bind() exist."
          pitfalls={[
            "Extracting a method loses implicit binding: const fn = obj.method; fn() → 'this' is not obj anymore.",
            "Arrow functions can't be used as constructors (new ArrowFn() throws), as object methods (no own 'this'), or with call/apply/bind (they ignore the specified 'this').",
            "setTimeout(obj.method, 100) loses binding. Use setTimeout(() => obj.method(), 100) or setTimeout(obj.method.bind(obj), 100).",
            "In class fields, 'this' inside a regular method refers to the instance. But if you pass that method as a callback, 'this' is lost. Arrow function class fields avoid this.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
