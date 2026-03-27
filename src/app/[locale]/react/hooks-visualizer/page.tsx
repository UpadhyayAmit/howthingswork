"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import { useTranslations } from "next-intl";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const HooksVisualizer = dynamic(() => import("./HooksVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const HOOKS_CODE = `// Your component:
function Counter() {
  const [count, setCount] = useState(0);   // Hook 1
  const [name, setName] = useState('Bob'); // Hook 2
  const ref = useRef(null);                // Hook 3

  useEffect(() => { ... }, [count]);       // Hook 4
}

// React's internal hooks linked list for this fiber:
Hook1 { memoizedState: 0,     next: Hook2 }  // count
Hook2 { memoizedState: 'Bob', next: Hook3 }  // name
Hook3 { memoizedState: { current: null }, next: Hook4 } // ref
Hook4 { memoizedState: { create, destroy, deps: [0] }, next: null }

// If you conditionally call hook 2:
// Hook1 → Hook3 → Hook4  (Hook2 slot is now useRef!)
// React reads "Bob" as the ref's current value → BUG`;

const USE_CASES: UseCase[] = [
  {
    title: "Debugging the 'Rendered More Hooks Than Previous Render' Error",
    scenario: "You add an early return in a component for a loading state: `if (loading) return <Spinner />`. After the data loads, React crashes with 'Rendered more hooks than during the previous render.'",
    problem: "The early return is ABOVE some hook calls. On the first render (loading=true), React processes 2 hooks. On the second render (loading=false), it processes 5 hooks. React's linked list has 2 slots but encounters 5 hook calls — the list is corrupted.",
    solution: "Move ALL hook calls above any conditional returns. The early return must come AFTER the last hook call. React hooks are a linked list indexed by call order — the call count must be identical across every render of the same component.",
    takeaway: "The 'Rules of Hooks' aren't arbitrary restrictions — they're a direct consequence of the linked list data structure. React identifies hooks by position (call order), not by name. Changing the number of hooks between renders corrupts the list.",
  },
  {
    title: "Building a Custom Hook with Proper State Isolation",
    scenario: "You build a custom `useToggle` hook used in 3 different components. You notice that toggling in one component doesn't affect the others — but you're confused about WHY, since they share the same hook code.",
    problem: "Developers sometimes assume custom hooks share state like a global singleton. They expect `useToggle()` in Component A and Component B to share the same boolean value, leading to incorrect architecture decisions.",
    solution: "Each component has its own fiber node with its own hooks linked list. When Component A calls `useToggle()`, React creates a hook node in Component A's list. Component B gets a completely separate hook node in its own list. Custom hooks are just a code-sharing mechanism — state is always local to the calling component's fiber.",
    takeaway: "Custom hooks share LOGIC, not STATE. Each component instance gets its own copy of the hook's state because each fiber maintains its own hooks linked list. To share state between components, you need Context, a state manager, or lifting state up.",
  },
];

export default function HooksVisualizerPage() {
  const t = useTranslations("pages.hooksVisualizer");
  return (
    <MotionFade>
      <Section
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <HooksVisualizer />
        <ConceptExplainer
          overview={t("explainer.overview")}
          howItWorks={t.raw("explainer.howItWorks") as ExplainerStep[]}
          keyConcepts={t.raw("explainer.keyConcepts") as KeyConcept[]}
          codeExample={{ label: t("explainer.codeLabel"), code: HOOKS_CODE }}
          whyItMatters={t("explainer.whyItMatters")}
          pitfalls={t.raw("explainer.pitfalls") as string[]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
