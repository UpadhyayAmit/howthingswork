"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const ModulesVisualizer = dynamic(() => import("./ModulesVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// ====== ESM (ES Modules) ======
// Named exports:
export const API_URL = "https://api.example.com";
export function fetchUser(id) { /* ... */ }

// Default export:
export default class UserService { /* ... */ }

// Named imports:
import { API_URL, fetchUser } from "./api.js";

// Default import:
import UserService from "./api.js";

// Namespace import:
import * as api from "./api.js";

// ====== CommonJS ======
// Exporting:
module.exports = { fetchUser, API_URL };
// or
exports.fetchUser = fetchUser;

// Importing:
const { fetchUser, API_URL } = require("./api");
const api = require("./api");`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "ESM: Static Analysis",
    body: "ESM imports/exports are analyzed at parse time, BEFORE code execution. The engine builds a module graph, determines dependencies, and can tree-shake unused exports. This is why import/export must be at the top level — no conditional imports.",
  },
  {
    title: "CommonJS: Runtime Execution",
    body: "require() is a regular function call that runs at execution time. It synchronously reads the file, wraps it in a function, executes it, and caches the result. This means you CAN conditionally require modules: if (condition) require('./x').",
  },
  {
    title: "Module Loading Phases (ESM)",
    body: "1) Construction: Parse module, find imports, build module graph. 2) Instantiation: Allocate memory for exports, link imports to exports. 3) Evaluation: Execute module code top-to-bottom to fill in values. Each phase completes for the ENTIRE graph before the next begins.",
  },
  {
    title: "Live Bindings vs Value Copies",
    body: "ESM exports are live bindings — if the exporting module updates a variable, all importers see the change. CommonJS exports are value copies — require() gives you a snapshot. Re-requiring returns the cached copy, not a fresh read.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  { term: "Tree Shaking", definition: "ESM enables bundlers to eliminate unused exports. import { x } from 'lib' tells the bundler exactly what's used. CommonJS can't do this because require() is dynamic.", icon: "🌳" },
  { term: "Circular Dependencies", definition: "ESM handles circular imports via live bindings (partially initialized). CommonJS may give undefined if a module isn't fully loaded yet at require() time.", icon: "🔄" },
  { term: "Module Cache", definition: "Both systems cache modules after first load. require('./x') and import from './x' only execute the file once. Subsequent imports return the cached result.", icon: "💾" },
  { term: "Dynamic import()", definition: "import('./module.js') returns a Promise, enabling lazy loading. Works in both ESM and bundled CJS. Powers code splitting in Next.js/Webpack.", icon: "⚡" },
];

const USE_CASES: UseCase[] = [
  {
    title: "Bundle Size Optimization with Tree Shaking",
    scenario: "You import one function from lodash: import { debounce } from 'lodash'. Your bundle is 70KB because the entire lodash library is included.",
    problem: "lodash uses CommonJS internally. With CJS, the bundler can't determine which functions are used, so it includes everything. import { debounce } from 'lodash' still loads all of lodash.",
    solution: "Use lodash-es (ESM version): import { debounce } from 'lodash-es'. The bundler can now tree-shake, and only debounce (~1KB) is included. Alternatively: import debounce from 'lodash/debounce' (individual file).",
    takeaway: "ESM's static analysis is the foundation of tree shaking. When choosing libraries, prefer ESM-compatible packages. Check package.json for 'module' or 'exports' fields indicating ESM support.",
  },
  {
    title: "Migration from CommonJS to ESM",
    scenario: "Your Node.js project uses CommonJS (require/module.exports). You want to use a new library that only provides ESM. You get ERR_REQUIRE_ESM when trying to require() it.",
    problem: "CommonJS can't synchronously require() an ESM module (ESM is async by design). The reverse works — ESM can import() CJS modules dynamically. This creates a one-way compatibility wall.",
    solution: "Option 1: Convert your project to ESM (add 'type': 'module' to package.json). Option 2: Use dynamic import(): const { lib } = await import('esm-lib'). Option 3: Use a dual-package build that provides both CJS and ESM entry points.",
    takeaway: "The JS ecosystem is migrating from CJS to ESM. Understanding both systems and their interop limitations is essential for modern Node.js development and avoiding dependency compatibility issues.",
  },
];

export default function ModulesPage() {
  return (
    <MotionFade>
      <Section
        title="Module System (ESM vs CJS)"
        subtitle="How JavaScript modules are loaded, linked, and cached — from static ES Modules to dynamic CommonJS require()."
      >
        <ModulesVisualizer />
        <ConceptExplainer
          overview="JavaScript has two module systems: ES Modules (ESM) with import/export, and CommonJS (CJS) with require/module.exports. ESM is the standard, enabling static analysis, tree shaking, and top-level await. CJS is Node.js's legacy system, still widely used."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "ESM vs CommonJS Syntax", code: CODE_EXAMPLE }}
          whyItMatters="Understanding module systems is critical for bundle optimization (tree shaking depends on ESM), Node.js compatibility (CJS vs ESM migration), and debugging import errors (circular dependencies, live bindings vs copies)."
          pitfalls={[
            "require() and import are NOT interchangeable. require() is synchronous; import() is async. You can't use require() in ESM modules or top-level import in CJS.",
            "Circular dependencies behave differently: CJS gives a partial (potentially undefined) export at the point of the cycle. ESM uses live bindings but the value may not be initialized yet.",
            "'import * as' doesn't make a POJO — it creates a live Module Namespace object. You can't destructure it, JSON.stringify it, or use it like a regular object.",
            "Node.js file extension matters: .mjs is always ESM, .cjs is always CJS. .js depends on the nearest package.json's 'type' field.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
