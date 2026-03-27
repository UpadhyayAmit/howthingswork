"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import { useTranslations } from "next-intl";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const ReactMemoVisualizer = dynamic(() => import("./ReactMemoVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const REACTMEMO_CODE = `// Without memo — re-renders every time parent renders
function ExpensiveList({ items }) {
  return items.map(item => <Item key={item.id} {...item} />);
}

// With memo — skips re-render if items reference is stable
const ExpensiveList = React.memo(function ExpensiveList({ items }) {
  return items.map(item => <Item key={item.id} {...item} />);
});

function Parent() {
  const [count, setCount] = useState(0);

  // ❌ New array every render — memo never helps
  const items = [{ id: 1, name: 'Apple' }];

  // ✅ Stable reference — memo works as expected
  const items = useMemo(() => [{ id: 1, name: 'Apple' }], []);

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <ExpensiveList items={items} /> {/* skips re-render when only count changes */}
    </>
  );
}`;

const USE_CASES: UseCase[] = [
  {
    title: "Optimizing a Chat Message List with 1000+ Messages",
    scenario: "A Slack-like app renders a message list. When a user types in the input box, the entire list of 1000+ message components re-renders because the parent (ChatRoom) updates on every keystroke.",
    problem: "Each keystroke updates the parent's `inputValue` state, triggering a re-render. Without React.memo, all 1000 Message components re-render even though none of their props changed. Each Message component does string formatting and date calculations — the combined cost creates visible lag.",
    solution: "Wrap Message in React.memo: `const Message = React.memo(({ text, author, timestamp }) => { ... })`. Since the message props are primitive values (strings, numbers), React.memo's shallow comparison correctly identifies that nothing changed. The 1000 messages are skipped entirely — only the input re-renders.",
    takeaway: "React.memo shines when a parent re-renders frequently but a child's props rarely change. The ideal candidates are list items, complex charts, and any component with expensive rendering where the parent updates for unrelated reasons.",
  },
  {
    title: "Custom Comparison for Complex Props",
    scenario: "A MapWidget receives a `coordinates` object `{ lat: 40.7, lng: -74.0 }`. Despite wrapping in React.memo, it still re-renders because the parent creates a new coordinates object each render.",
    problem: "React.memo uses shallow comparison by default: `oldCoords !== newCoords` is always true because each render creates a new object, even if lat/lng values are identical. Shallow comparison checks reference equality, not value equality.",
    solution: "Provide a custom comparison: `React.memo(MapWidget, (prev, next) => prev.coordinates.lat === next.coordinates.lat && prev.coordinates.lng === next.coordinates.lng)`. Now React.memo compares the actual values instead of the object reference. Alternatively, flatten the props: `<MapWidget lat={40.7} lng={-74.0} />` — primitives compare by value automatically.",
    takeaway: "Use custom areEqual functions for components that receive objects or arrays as props and can't be easily memoized upstream. But first, consider if you can flatten the props to primitives or memoize the object with useMemo in the parent — these are simpler and more maintainable.",
  },
];

export default function ReactMemoPage() {
  const t = useTranslations("pages.reactMemo");
  return (
    <MotionFade>
      <Section
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <ReactMemoVisualizer />
        <ConceptExplainer
          overview={t("explainer.overview")}
          howItWorks={t.raw("explainer.howItWorks") as ExplainerStep[]}
          keyConcepts={t.raw("explainer.keyConcepts") as KeyConcept[]}
          codeExample={{ label: t("explainer.codeLabel"), code: REACTMEMO_CODE }}
          whyItMatters={t("explainer.whyItMatters")}
          pitfalls={t.raw("explainer.pitfalls") as string[]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
