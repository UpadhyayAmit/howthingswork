"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import { useTranslations } from "next-intl";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const FiberVisualizer = dynamic(() => import("./FiberVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const FIBER_CODE = `// Simplified Fiber node structure (React internals)
{
  tag: FunctionComponent,    // type of fiber
  type: MyComponent,         // component function/class/string
  key: null,
  ref: null,
  pendingProps: { id: 1 },
  memoizedProps: { id: 1 },  // props from last render
  memoizedState: hooksList,  // linked list of hooks

  // Tree pointers
  return: parentFiber,       // parent
  child: firstChildFiber,    // first child
  sibling: nextSiblingFiber, // next sibling

  // Double buffering
  alternate: workInProgressFiber,

  // Work tracking
  flags: Update | Passive,   // effect tags
  lanes: DefaultLane,        // priority
}`;

const USE_CASES: UseCase[] = [
  {
    title: "Debugging Slow Renders with React DevTools Profiler",
    scenario: "Your dashboard app freezes for 200ms when a user opens a settings panel. React DevTools Profiler shows a long 'Render' phase but you can't identify which component is slow.",
    problem: "Without understanding Fiber, the profiler's flame graph (which shows fiber-by-fiber render times) looks like random colored bars. You don't know why some components are 're-rendered' when their props haven't changed.",
    solution: "Understanding that each bar in the Profiler IS a fiber node helps you trace the work loop: parent → child → sibling. You can identify which fiber's `beginWork` is slow, check its `memoizedProps` vs `pendingProps`, and apply React.memo or useMemo precisely.",
    takeaway: "The React DevTools Profiler is literally a fiber tree visualizer. Understanding fiber architecture transforms it from a confusing chart into a powerful debugging tool.",
  },
  {
    title: "Why Your Animation Drops Frames (Priority Lanes)",
    scenario: "You have a drag-and-drop interface where moving an item should animate at 60fps, but data fetching from a heavy table re-render causes janky movement.",
    problem: "A single synchronous render blocks the main thread for 50ms+, causing the browser to skip animation frames during the data fetch re-render.",
    solution: "React Fiber's priority lanes system lets you wrap the heavy re-render in `startTransition()`, marking it as low-priority. The fiber work loop can now pause the heavy render, yield to the browser for animation frames, and resume later — all because fibers are interruptible units of work.",
    takeaway: "Fiber architecture is the reason `useTransition` and `useDeferredValue` exist. These APIs wouldn't be possible without interruptible, priority-based rendering.",
  },
];

export default function FiberVisualizerPage() {
  const t = useTranslations("pages.fiberVisualizer");
  return (
    <MotionFade>
      <Section
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <FiberVisualizer />
        <ConceptExplainer
          overview={t("explainer.overview")}
          howItWorks={t.raw("explainer.howItWorks") as ExplainerStep[]}
          keyConcepts={t.raw("explainer.keyConcepts") as KeyConcept[]}
          codeExample={{ label: t("explainer.codeLabel"), code: FIBER_CODE }}
          whyItMatters={t("explainer.whyItMatters")}
          pitfalls={t.raw("explainer.pitfalls") as string[]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
