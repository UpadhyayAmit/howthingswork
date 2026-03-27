"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import { useTranslations } from "next-intl";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const UseEffectLifecycleVisualizer = dynamic(() => import("./UseEffectLifecycleVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const USEEFFECT_CODE = `// 1. Event subscription — must clean up
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []); // mount once, clean up on unmount

// 2. Fetch with cancellation (AbortController)
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/data', { signal: controller.signal })
    .then(res => res.json())
    .then(setData)
    .catch(err => {
      if (err.name !== 'AbortError') throw err; // ignore cancellation
    });

  return () => controller.abort(); // cancel if dep changes or unmount
}, [userId]);

// 3. useLayoutEffect for DOM measurement
useLayoutEffect(() => {
  const height = ref.current.getBoundingClientRect().height;
  setContainerHeight(height); // applied before paint — no flicker
}, [content]);`;

const USE_CASES: UseCase[] = [
  {
    title: "The Infinite Loop from Missing Dependency Array",
    scenario: "A developer writes `useEffect(() => { fetchData() })` without a dependency array. The app makes thousands of API calls per second, the browser freezes, and the API rate limits the user.",
    problem: "No dependency array means the effect runs AFTER EVERY RENDER. fetchData sets state → state change triggers re-render → re-render fires the effect → effect calls fetchData → sets state → infinite loop. Each loop iteration also creates a new network request.",
    solution: "Add the correct dependency array: `useEffect(() => { fetchData() }, [])` for mount-only, or `useEffect(() => { fetchData(query) }, [query])` for re-fetch when query changes. The dependency array tells React's effect scheduler when to skip re-execution.",
    takeaway: "The dependency array is not optional decoration — it's the core control mechanism of useEffect. No array = every render. Empty array = mount only. Specific deps = run when those values change. Getting this wrong is the #1 source of useEffect bugs.",
  },
  {
    title: "Preventing Stale Closures in setInterval",
    scenario: "A countdown timer displays the time remaining. You use `setInterval` inside useEffect with an empty dependency array. The timer shows the same number forever instead of counting down.",
    problem: "The useEffect callback closes over the initial `count` value (e.g., 60). setInterval calls `setCount(count - 1)` every second, but `count` is always 60 inside the closure (captured at mount time). Result: `setCount(59)` every second — never changes from 59.",
    solution: "Use the functional updater form: `setCount(prev => prev - 1)`. The updater receives the CURRENT state, not the stale closure value. Alternatively, store count in a ref and sync it every render. The functional form is React's escape hatch for stale closures in effects.",
    takeaway: "Effects capture values at the time they're created (closures). For intervals and timeouts that need current state, always use the functional updater `setState(prev => ...)` or a ref pattern to bypass the stale closure.",
  },
];

export default function UseEffectLifecyclePage() {
  const t = useTranslations("pages.useeffectLifecycle");
  return (
    <MotionFade>
      <Section
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <UseEffectLifecycleVisualizer />
        <ConceptExplainer
          overview={t("explainer.overview")}
          howItWorks={t.raw("explainer.howItWorks") as ExplainerStep[]}
          keyConcepts={t.raw("explainer.keyConcepts") as KeyConcept[]}
          codeExample={{ label: t("explainer.codeLabel"), code: USEEFFECT_CODE }}
          whyItMatters={t("explainer.whyItMatters")}
          pitfalls={t.raw("explainer.pitfalls") as string[]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
