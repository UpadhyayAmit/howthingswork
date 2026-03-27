"use client";
import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import { useTranslations } from "next-intl";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const ConcurrentRenderingVisualizer = dynamic(() => import("./ConcurrentRenderingVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CONCURRENT_CODE = `import { useState, useTransition } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleInput(e) {
    // Urgent: update the input immediately
    setQuery(e.target.value);

    // Non-urgent: filtering 10,000 results can wait
    startTransition(() => {
      setResults(filterItems(e.target.value));
    });
  }

  return (
    <>
      <input value={query} onChange={handleInput} />
      {isPending && <Spinner />}
      <ResultsList results={results} />
    </>
  );
}
// Typing feels instant (urgent update)
// Results update when React has time (transition)`;

const USE_CASES: UseCase[] = [
  {
    title: "Search-as-You-Type Without Debouncing",
    scenario: "A product catalog with 50,000 items needs instant search. Using debounce (300ms delay) feels sluggish. Without debounce, every keystroke triggers a heavy filter that blocks the main thread and makes typing lag.",
    problem: "Traditional approach: debounce → wait 300ms → filter → re-render. The user types 'laptop' and sees nothing for 300ms after each keystroke. Or without debounce: type 'l' → 50ms filter blocks thread → 'a' keystroke is delayed → laggy typing experience.",
    solution: "Use `startTransition` to mark the filter as non-urgent. React processes the input update immediately (typing stays responsive), then renders the filtered results when the main thread is free. If the user types another character before the filter completes, React ABANDONS the in-progress render and starts the new filter — no wasted work.",
    takeaway: "Concurrent rendering replaces debouncing for CPU-heavy UI updates. It provides a better UX (no artificial delay) with better performance (abandoned renders waste no DOM work). Use useTransition for filtering, sorting, and computing derived state.",
  },
  {
    title: "Keeping Navigation Responsive During Heavy Page Renders",
    scenario: "Clicking a navigation link to a data-heavy dashboard page freezes the UI for 500ms while the new page renders 200+ chart components. The old page disappears, a blank screen shows, then the new page appears — jarring.",
    problem: "Without concurrent rendering, React must complete the entire render synchronously. Clicking 'Dashboard' unmounts the current page and starts rendering 200 charts. The main thread is blocked for 500ms — no animations, no response to user input, just a white flash.",
    solution: "Wrap the navigation in `startTransition(() => navigate('/dashboard'))`. React keeps the old page visible and interactive while rendering the dashboard in the background. If the user clicks 'Back' during this time, React abandons the dashboard render. The transition completes smoothly with no blank screen.",
    takeaway: "Concurrent rendering enables 'optimistic UI' for navigation — the old page stays visible until the new one is fully ready. This eliminates white-flash navigation transitions and lets users cancel slow navigations by clicking elsewhere. Next.js App Router uses this pattern by default.",
  },
];

export default function ConcurrentRenderingPage() {
  const t = useTranslations("pages.concurrentRendering");
  return (
    <MotionFade>
      <Section
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <ConcurrentRenderingVisualizer />
        <ConceptExplainer
          overview={t("explainer.overview")}
          howItWorks={t.raw("explainer.howItWorks") as ExplainerStep[]}
          keyConcepts={t.raw("explainer.keyConcepts") as KeyConcept[]}
          codeExample={{ label: t("explainer.codeLabel"), code: CONCURRENT_CODE }}
          whyItMatters={t("explainer.whyItMatters")}
          pitfalls={t.raw("explainer.pitfalls") as string[]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
