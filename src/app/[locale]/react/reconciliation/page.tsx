"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import { useTranslations } from "next-intl";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const ReconciliationVisualizer = dynamic(() => import("./ReconciliationVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const RECONCILE_CODE = `// Without keys — position-based matching (bad for reordering)
// Old: [<A/>, <B/>, <C/>]
// New: [<B/>, <A/>, <C/>]
// React sees: position 0 changed (updates A→B), position 1 changed (updates B→A)
// Result: 2 updates + possible state loss

// With keys — identity-based matching (correct)
// Old: [<A key="a"/>, <B key="b"/>, <C key="c"/>]
// New: [<B key="b"/>, <A key="a"/>, <C key="c"/>]
// React sees: same keys, just reordered
// Result: 0 updates, 2 DOM moves — much more efficient`;

const USE_CASES: UseCase[] = [
  {
    title: "The Classic 'Index as Key' Bug in Dynamic Lists",
    scenario: "You have a todo list where users can delete items from the middle. Each item has an input field showing its text. After deleting the 2nd item, the 3rd item's input shows the 2nd item's text.",
    problem: "Using `index` as the key means when item 2 is deleted, React thinks item 3 IS item 2 (same key=2). It reuses the old component instance (with stale state) instead of destroying item 2 and moving item 3.",
    solution: "Use a stable unique ID (e.g., `todo.id`) as the key. Now React correctly identifies which component was removed and which should be kept. The reconciliation algorithm can match by identity instead of position.",
    takeaway: "The reconciliation algorithm's O(n) shortcut relies entirely on keys for list matching. Using array index as key defeats this optimization and introduces state bugs whenever order changes.",
  },
  {
    title: "Avoiding Full Subtree Re-mount When Changing Component Type",
    scenario: "You have a conditional render: `isAdmin ? <AdminPanel /> : <UserPanel />`. Switching between admin and user views causes a full re-mount, destroying all form state.",
    problem: "React's reconciliation sees a different component TYPE at the same position. Its heuristic: 'different type = completely different tree'. It destroys the old subtree and builds a new one from scratch — losing all internal state.",
    solution: "If both panels share a similar structure, use the same component with conditional rendering inside. Or use `key` to explicitly control when a component should re-mount vs update. Understanding that React compares types first, then props, helps you design state-preserving UIs.",
    takeaway: "React's reconciliation compares elements top-down: type first, then key, then props. A type change always triggers a full unmount/remount of the entire subtree — this is by design, not a bug.",
  },
];

export default function ReconciliationPage() {
  const t = useTranslations("pages.reconciliation");
  return (
    <MotionFade>
      <Section
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <ReconciliationVisualizer />
        <ConceptExplainer
          overview={t("explainer.overview")}
          howItWorks={t.raw("explainer.howItWorks") as ExplainerStep[]}
          keyConcepts={t.raw("explainer.keyConcepts") as KeyConcept[]}
          codeExample={{ label: t("explainer.codeLabel"), code: RECONCILE_CODE }}
          whyItMatters={t("explainer.whyItMatters")}
          pitfalls={t.raw("explainer.pitfalls") as string[]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
