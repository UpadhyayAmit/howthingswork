"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import { useTranslations } from "next-intl";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const MemoizationVisualizer = dynamic(() => import("./MemoizationVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const MEMO_CODE = `function ParentComponent({ items }) {
  const [filter, setFilter] = useState('');
  const [count, setCount] = useState(0);

  // useMemo: expensive filter only recomputes when items/filter change
  const filteredItems = useMemo(
    () => items.filter(item => item.name.includes(filter)),
    [items, filter]
  );

  // useCallback: stable reference, doesn't cause Child re-render
  // when only 'count' changes
  const handleSelect = useCallback((id) => {
    console.log('Selected:', id);
  }, []); // no deps — function never needs to change

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <MemoizedChild items={filteredItems} onSelect={handleSelect} />
    </>
  );
}

const MemoizedChild = React.memo(({ items, onSelect }) => {
  // Only re-renders when items or onSelect reference changes
  return items.map(i => <Item key={i.id} item={i} onSelect={onSelect} />);
});`;

const USE_CASES: UseCase[] = [
  {
    title: "Expensive Data Transformation in a Dashboard",
    scenario: "Your analytics dashboard processes 10,000 rows of sales data to calculate aggregates (sum, average, percentiles) and format display values. A clock that updates every second causes the entire dashboard to re-render — and the 50ms data processing runs every second.",
    problem: "The data transformation runs inside the render function without memoization. Every re-render (even from the clock ticker) recomputes all 10,000 rows. The dashboard becomes sluggish because 50ms of computation blocks the main thread on every tick.",
    solution: "Wrap the data transformation in `useMemo(() => processData(salesData), [salesData])`. Now the heavy computation only re-runs when `salesData` actually changes. Clock ticks cause re-renders but skip the 50ms computation entirely — React reuses the cached result.",
    takeaway: "useMemo is designed for expensive computations, not every value. The general guideline: if a computation takes more than 1ms or processes more than 100 items, it's a candidate for useMemo. Profile before optimizing — don't guess.",
  },
  {
    title: "Breaking React.memo with Unstable Callback Props",
    scenario: "You wrap a heavy `DataTable` component in React.memo, but React DevTools still shows it re-renders every time the parent's unrelated state changes. Memo appears to 'not work.'",
    problem: "The parent passes `onRowClick={(id) => handleClick(id)}` — an inline arrow function. Every parent render creates a NEW function reference. React.memo compares props by reference: `oldFn !== newFn`, so it always re-renders. Memo is working correctly — the props ARE different every time.",
    solution: "Wrap the handler in `useCallback`: `const onRowClick = useCallback((id) => handleClick(id), [handleClick])`. Now the function reference is stable across renders. React.memo's shallow comparison sees identical props and correctly skips re-rendering the DataTable.",
    takeaway: "React.memo and useCallback/useMemo are a PAIR — they must be used together. React.memo is useless if any prop is an unstable reference (inline function, inline object, inline array). Always stabilize props with useCallback/useMemo before wrapping a child in React.memo.",
  },
];

export default function MemoizationPage() {
  const t = useTranslations("pages.memoization");
  return (
    <MotionFade>
      <Section
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <MemoizationVisualizer />
        <ConceptExplainer
          overview={t("explainer.overview")}
          howItWorks={t.raw("explainer.howItWorks") as ExplainerStep[]}
          keyConcepts={t.raw("explainer.keyConcepts") as KeyConcept[]}
          codeExample={{ label: t("explainer.codeLabel"), code: MEMO_CODE }}
          whyItMatters={t("explainer.whyItMatters")}
          pitfalls={t.raw("explainer.pitfalls") as string[]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
