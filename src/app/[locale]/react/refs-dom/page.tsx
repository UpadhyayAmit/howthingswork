"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import { useTranslations } from "next-intl";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const RefsDomVisualizer = dynamic(() => import("./RefsDomVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const REFS_CODE = `// 1. DOM access — focus an input programmatically
const inputRef = useRef(null);
<input ref={inputRef} />
// After mount: inputRef.current is the <input> DOM node
inputRef.current.focus(); // imperative DOM call

// 2. Persist a value without re-rendering
const timerRef = useRef(null);
timerRef.current = setInterval(tick, 1000);
// Later:
clearInterval(timerRef.current);

// 3. Read latest state in a stale closure
const countRef = useRef(count);
countRef.current = count; // sync on every render
useEffect(() => {
  const interval = setInterval(() => {
    console.log(countRef.current); // always latest value
  }, 1000);
  return () => clearInterval(interval);
}, []); // empty deps — no stale closure problem`;

const USE_CASES: UseCase[] = [
  {
    title: "Autofocus and Focus Management in Multi-Step Forms",
    scenario: "A multi-step checkout form should automatically focus the first empty field when the user navigates to a new step. Using state to track focus causes infinite re-renders.",
    problem: "Attempting to manage focus with useState creates a loop: setState triggers re-render, re-render re-focuses, which fires onFocus, which might set state again. Focus is an imperative DOM operation — it doesn't fit React's declarative model.",
    solution: "Use a ref to directly call `.focus()` on the input DOM node: `useEffect(() => { inputRef.current?.focus() }, [currentStep])`. The ref gives you direct DOM access without triggering re-renders. Focus management is inherently imperative — refs are React's bridge to imperative DOM APIs.",
    takeaway: "Use refs for imperative DOM operations that don't produce visual output (focus, scroll, measure, select text, play/pause media). These operations are side effects that bypass React's virtual DOM — refs give you a controlled escape hatch.",
  },
  {
    title: "Storing Previous Props/State Without Re-rendering",
    scenario: "You need to compare the current value with the previous value to show a 'price changed' animation. Storing the previous value in state causes an extra re-render on every change.",
    problem: "Using `useState(previousPrice)` to track the old price means: price changes → re-render with new price → useEffect sets previousPrice → ANOTHER re-render. Two renders for one price change, and the animation triggers late.",
    solution: "Use a ref: `const prevPriceRef = useRef(price)`. In useEffect, compare `price !== prevPriceRef.current`, trigger the animation, then update: `prevPriceRef.current = price`. Refs update without re-rendering — you get the comparison for free, no extra render cycle.",
    takeaway: "Refs are the correct tool for 'instance variables' — values that need to persist across renders but shouldn't trigger re-renders when updated. Common patterns: previous values, timer IDs, DOM nodes, external library instances, and accumulator values.",
  },
];

export default function RefsDomPage() {
  const t = useTranslations("pages.refsDom");
  return (
    <MotionFade>
      <Section
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <RefsDomVisualizer />
        <ConceptExplainer
          overview={t("explainer.overview")}
          howItWorks={t.raw("explainer.howItWorks") as ExplainerStep[]}
          keyConcepts={t.raw("explainer.keyConcepts") as KeyConcept[]}
          codeExample={{ label: t("explainer.codeLabel"), code: REFS_CODE }}
          whyItMatters={t("explainer.whyItMatters")}
          pitfalls={t.raw("explainer.pitfalls") as string[]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
