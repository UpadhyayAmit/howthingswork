"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import { useTranslations } from "next-intl";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const VirtualDomVisualizer = dynamic(() => import("./VirtualDomVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const VDOM_CODE = `// JSX you write:
const element = <div className="box"><span>Hello</span></div>;

// Compiles to:
const element = React.createElement(
  'div',
  { className: 'box' },
  React.createElement('span', null, 'Hello')
);

// Produces this Virtual DOM object:
{
  type: 'div',
  props: {
    className: 'box',
    children: {
      type: 'span',
      props: { children: 'Hello' }
    }
  }
}`;

const USE_CASES: UseCase[] = [
  {
    title: "Optimizing Large List Rendering",
    scenario: "You have a chat app rendering 500+ messages. Scrolling to load older messages causes the entire message list to re-render, taking 300ms and causing visible lag.",
    problem: "When new messages are appended, React creates a new VDOM tree for the entire list. The diffing algorithm walks all 500+ nodes even though only 20 new messages were added.",
    solution: "Use windowing (react-window/react-virtualized) to only render visible messages in the VDOM. Combined with proper `key` props, React's diff only processes ~20 visible nodes instead of 500+. The VDOM tree stays small, diffs stay fast.",
    takeaway: "The VDOM's diffing cost is proportional to tree size, not DOM size. Keeping your VDOM tree small via virtualization is the most effective optimization for large lists.",
  },
  {
    title: "Why Inline Objects Cause Unnecessary Diffs",
    scenario: "A component receives `style={{ color: 'red' }}` as a prop. Despite no visual change, React DevTools shows it re-renders on every parent update.",
    problem: "Each render creates a NEW style object `{ color: 'red' }`. When React diffs oldProps vs newProps, `oldStyle !== newStyle` (different object reference), so React marks this node as 'changed' and commits a DOM update — even though the actual CSS hasn't changed.",
    solution: "Hoist the style object outside the component or wrap it in `useMemo`. Now `oldStyle === newStyle` (same reference), the diff correctly marks it as 'unchanged', and React skips the DOM write entirely.",
    takeaway: "Understanding how the VDOM diff compares props (by reference, not deep equality) reveals why inline objects, arrays, and arrow functions in JSX cause performance issues.",
  },
];

export default function VirtualDomPage() {
  const t = useTranslations("pages.virtualDom");
  return (
    <MotionFade>
      <Section
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <VirtualDomVisualizer />
        <ConceptExplainer
          overview={t("explainer.overview")}
          howItWorks={t.raw("explainer.howItWorks") as ExplainerStep[]}
          keyConcepts={t.raw("explainer.keyConcepts") as KeyConcept[]}
          codeExample={{ label: t("explainer.codeLabel"), code: VDOM_CODE }}
          whyItMatters={t("explainer.whyItMatters")}
          pitfalls={t.raw("explainer.pitfalls") as string[]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
