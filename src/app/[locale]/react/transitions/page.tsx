"use client";
import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import { useTranslations } from "next-intl";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const TransitionsVisualizer = dynamic(() => import("./TransitionsVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const TRANSITIONS_CODE = `import { useState, useTransition } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(allItems);
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    // Urgent: update the input immediately (never interrupted)
    setQuery(e.target.value);

    // Non-urgent: filter 10,000 items as a transition
    startTransition(() => {
      setResults(allItems.filter(item =>
        item.name.includes(e.target.value)
      ));
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}  {/* subtle loading indicator */}
      <ResultsList items={results} />
    </>
  );
}`;

const USE_CASES: UseCase[] = [
  {
    title: "Tab Switching Without Losing Current Tab's State",
    scenario: "A dashboard has tabs: Overview, Analytics, Reports. Clicking 'Analytics' loads heavy chart components. Without transitions, the current tab disappears immediately and the user sees a loading blank until the new tab renders.",
    problem: "The tab switch calls `setActiveTab('analytics')`, which immediately unmounts the Overview tab and starts rendering Analytics. The heavy chart render blocks the main thread for 300ms. During this time, the user sees a blank panel — the old tab is gone, the new tab isn't ready.",
    solution: "Wrap the tab switch in `startTransition(() => setActiveTab('analytics'))`. React keeps showing the Overview tab (marked with `isPending` for a subtle opacity/spinner indicator) while rendering Analytics in the background. When ready, it swaps them in a single frame — no blank state.",
    takeaway: "useTransition is perfect for tab switching, accordion expansions, and any UI where you want the old content to stay visible while new content prepares. The `isPending` boolean lets you show a subtle loading indicator without destroying the current view.",
  },
  {
    title: "useDeferredValue for Derived UI Without Restructuring Code",
    scenario: "A search results component receives `query` as a prop and does heavy filtering inline. You want to defer the results rendering but can't wrap the parent's setState in startTransition because you don't control the parent.",
    problem: "The parent component calls `setQuery(e.target.value)` directly. You can't add startTransition because you don't own the parent component (maybe it's from a library). Your heavy ResultsList re-renders on every keystroke because `query` prop changes immediately.",
    solution: "Use `useDeferredValue(query)` in ResultsList: `const deferredQuery = useDeferredValue(query)`. Filter using `deferredQuery` instead of `query`. React returns the old value during heavy renders, showing stale-but-fast results while computing the new filter in the background. Compare `query !== deferredQuery` to show a loading indicator.",
    takeaway: "useDeferredValue is the consumer-side equivalent of useTransition. Use useTransition when you control the state update (can wrap setState). Use useDeferredValue when you want to defer derived rendering from a prop you don't control.",
  },
];

export default function TransitionsPage() {
  const t = useTranslations("pages.transitions");
  return (
    <MotionFade>
      <Section
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <TransitionsVisualizer />
        <ConceptExplainer
          overview={t("explainer.overview")}
          howItWorks={t.raw("explainer.howItWorks") as ExplainerStep[]}
          keyConcepts={t.raw("explainer.keyConcepts") as KeyConcept[]}
          codeExample={{ label: t("explainer.codeLabel"), code: TRANSITIONS_CODE }}
          whyItMatters={t("explainer.whyItMatters")}
          pitfalls={t.raw("explainer.pitfalls") as string[]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
