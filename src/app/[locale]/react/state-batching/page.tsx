"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import { useTranslations } from "next-intl";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const StateBatchingVisualizer = dynamic(() => import("./StateBatchingVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const BATCHING_CODE = `// React 18: ALL of these batch into 1 render

// Inside event handler (always batched)
function handleClick() {
  setCount(c => c + 1); // queued
  setFlag(true);        // queued
  setName('Alice');     // queued
  // 1 render happens here
}

// Inside setTimeout — NOW also batched in React 18
setTimeout(() => {
  setCount(c => c + 1); // queued
  setFlag(true);        // queued
  // 1 render (React 17 would have triggered 2!)
}, 0);

// Opt out of batching when needed:
import { flushSync } from 'react-dom';
flushSync(() => setCount(1)); // renders immediately
flushSync(() => setFlag(true)); // renders again
// 2 renders total`;

const USE_CASES: UseCase[] = [
  {
    title: "Form Validation with Multiple State Updates",
    scenario: "A login form validates email, password, and shows/hides error messages. The submit handler calls `setEmailError(...)`, `setPasswordError(...)`, `setIsSubmitting(false)` — three state updates that should be a single render.",
    problem: "In React 17, calling setState inside setTimeout or fetch().then() didn't batch — each call triggered a separate render. Users would see a flash: first the email error appears, then the password error, then the loading spinner disappears. Three renders for one validation check.",
    solution: "React 18's automatic batching ensures all three setState calls result in ONE render, regardless of whether they're inside an event handler, setTimeout, fetch callback, or promise. The user sees all errors and the stopped spinner simultaneously — no flash.",
    takeaway: "React 18's automatic batching is a free performance upgrade for existing code. If you migrated from React 17 and had flushSync workarounds for batching, you can now remove them — batching works everywhere automatically.",
  },
  {
    title: "When You Actually Need flushSync (DOM Measurement)",
    scenario: "You need to update a component's state and immediately measure the resulting DOM height to pass to a third-party animation library. With batching, the DOM hasn't updated yet when you try to measure.",
    problem: "Automatic batching defers the DOM update. After calling `setExpanded(true)`, the DOM still shows the collapsed state. Measuring `element.offsetHeight` returns the old height. The animation library receives the wrong value.",
    solution: "Wrap the state update in `flushSync()`: `flushSync(() => setExpanded(true))`. This forces React to immediately commit the DOM update synchronously. The next line can safely measure `element.offsetHeight` and get the expanded height. Use sparingly — it opts out of batching's performance benefit.",
    takeaway: "flushSync is the escape hatch when you need synchronous DOM access after a state update. Common use cases: third-party animation libraries, scroll position restoration, and focus management. Use it only when batching conflicts with imperative DOM operations.",
  },
];

export default function StateBatchingPage() {
  const t = useTranslations("pages.stateBatching");
  return (
    <MotionFade>
      <Section
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <StateBatchingVisualizer />
        <ConceptExplainer
          overview={t("explainer.overview")}
          howItWorks={t.raw("explainer.howItWorks") as ExplainerStep[]}
          keyConcepts={t.raw("explainer.keyConcepts") as KeyConcept[]}
          codeExample={{ label: t("explainer.codeLabel"), code: BATCHING_CODE }}
          whyItMatters={t("explainer.whyItMatters")}
          pitfalls={t.raw("explainer.pitfalls") as string[]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
