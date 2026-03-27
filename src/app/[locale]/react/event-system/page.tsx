"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import { useTranslations } from "next-intl";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const EventSystemVisualizer = dynamic(() => import("./EventSystemVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const EVENTS_CODE = `// React attaches ONE listener to the root — not to each button:
// root.addEventListener('click', reactHandler)

function App() {
  return (
    <div onClick={() => console.log('div — bubble')}>
      <button
        onClick={(e) => {
          console.log('button — bubble');
          // e.stopPropagation() would stop div from firing
        }}
        onClickCapture={() => console.log('button — capture')}
      >
        Click me
      </button>
    </div>
  );
}

// Click order:
// 1. button — capture  (capture phase, top-down)
// 2. button — bubble   (bubble phase, bottom-up)
// 3. div — bubble      (bubble phase, continues up)`;

const USE_CASES: UseCase[] = [
  {
    title: "Debugging Why stopPropagation Doesn't Stop Native Listeners",
    scenario: "You add a native `document.addEventListener('click', closeMenu)` to close a dropdown on outside click. Inside the dropdown, you call `e.stopPropagation()` on the React onClick — but the menu still closes.",
    problem: "React's stopPropagation stops propagation within React's synthetic event system (which uses delegation at the root). But the native listener on `document` has already received the event since React 17+ attaches to `root`, not `document`. The native handler fires before React can stop it.",
    solution: "Use `e.nativeEvent.stopImmediatePropagation()` to stop the native event from reaching other native listeners, or better yet, replace the native listener with a React `onClickCapture` on a wrapper div. Keep event handling within React's system to avoid mixed delegation conflicts.",
    takeaway: "React's event system runs inside a single delegated listener at the root container. Mixing React events with native `addEventListener` creates ordering conflicts. Prefer keeping all event logic within React's system for predictable behavior.",
  },
  {
    title: "Event Pooling Migration from React 16 to 17+",
    scenario: "Legacy code from React 16 calls `e.persist()` in event handlers to use the event in async callbacks. After upgrading to React 18, you see that removing `e.persist()` works fine — but no one on the team understands why.",
    problem: "React 16 used event pooling — SyntheticEvent objects were reused after the handler returned, setting all properties to null. Accessing `e.target` in a setTimeout would return null unless you called `e.persist()`. Teams kept adding persist() defensively everywhere.",
    solution: "React 17+ removed event pooling entirely. SyntheticEvent objects are no longer reused — they persist naturally. All `e.persist()` calls can be safely removed. Understanding this change helps teams clean up legacy code and stop defensive coding patterns that are no longer needed.",
    takeaway: "React's event system evolves across versions. Event pooling removal (React 17), root-level delegation (React 17), and automatic batching in event handlers (React 18) are all changes that affect how you write event handling code. Stay current with the release notes.",
  },
];

export default function EventSystemPage() {
  const t = useTranslations("pages.eventSystem");
  return (
    <MotionFade>
      <Section
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <EventSystemVisualizer />
        <ConceptExplainer
          overview={t("explainer.overview")}
          howItWorks={t.raw("explainer.howItWorks") as ExplainerStep[]}
          keyConcepts={t.raw("explainer.keyConcepts") as KeyConcept[]}
          codeExample={{ label: t("explainer.codeLabel"), code: EVENTS_CODE }}
          whyItMatters={t("explainer.whyItMatters")}
          pitfalls={t.raw("explainer.pitfalls") as string[]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
