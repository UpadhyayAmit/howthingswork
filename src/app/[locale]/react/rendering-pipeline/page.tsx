"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import { useTranslations } from "next-intl";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const RenderingPipelineVisualizer = dynamic(() => import("./RenderingPipelineVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const PIPELINE_CODE = `function MyComponent() {
  // Fires: after every render, after browser paint (async)
  useEffect(() => {
    console.log('3. useEffect — DOM painted, async');
    return () => console.log('cleanup');
  });

  // Fires: after every render, before browser paint (sync)
  useLayoutEffect(() => {
    console.log('2. useLayoutEffect — DOM mutated, not painted');
  });

  console.log('1. Render phase — pure, no side effects');
  return <div />;
}
// Order: Render → DOM mutation → useLayoutEffect → Paint → useEffect`;

const USE_CASES: UseCase[] = [
  {
    title: "Preventing Layout Flicker with useLayoutEffect",
    scenario: "You're building a tooltip that positions itself relative to a target element. Using useEffect, the tooltip first renders at (0,0), then jumps to the correct position — causing a visible flash.",
    problem: "useEffect fires AFTER the browser paints. So the sequence is: Render (tooltip at 0,0) → Paint (user sees misplaced tooltip) → useEffect (measure & reposition) → Re-render → Paint (correct). The first paint shows the wrong position.",
    solution: "Switch to useLayoutEffect which fires AFTER DOM mutation but BEFORE paint. The sequence becomes: Render → DOM mutation → useLayoutEffect (measure & update) → Paint (correct position). The user never sees the wrong position because the browser hasn't painted yet.",
    takeaway: "Use useLayoutEffect for any DOM measurement or mutation that affects visual layout (tooltips, popovers, scroll position, animations). Use useEffect for everything else (data fetching, analytics, subscriptions).",
  },
  {
    title: "Understanding Why console.log Order Matters When Debugging",
    scenario: "You add console.log statements to debug when state changes propagate. The logs appear in an unexpected order: render logs appear before effect logs, and cleanup logs appear between them.",
    problem: "Without understanding the pipeline phases, developers assume effects run 'during' rendering. They place side effects in the render function body (causing bugs) or misread the log order and chase phantom timing issues.",
    solution: "The rendering pipeline has strict phases: Render (pure, produces VDOM) → Commit (DOM writes) → Layout Effects (sync, before paint) → Paint (browser) → Effects (async, after paint). Each console.log appears in pipeline order. Understanding this order lets you read debug output correctly and place code in the right phase.",
    takeaway: "The rendering pipeline is NOT a single step — it's 5 distinct phases with different timing guarantees. Most React bugs come from putting code in the wrong phase (e.g., side effects in render, DOM reads in useEffect instead of useLayoutEffect).",
  },
];

export default function RenderingPipelinePage() {
  const t = useTranslations("pages.renderingPipeline");
  return (
    <MotionFade>
      <Section
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <RenderingPipelineVisualizer />
        <ConceptExplainer
          overview={t("explainer.overview")}
          howItWorks={t.raw("explainer.howItWorks") as ExplainerStep[]}
          keyConcepts={t.raw("explainer.keyConcepts") as KeyConcept[]}
          codeExample={{ label: t("explainer.codeLabel"), code: PIPELINE_CODE }}
          whyItMatters={t("explainer.whyItMatters")}
          pitfalls={t.raw("explainer.pitfalls") as string[]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
