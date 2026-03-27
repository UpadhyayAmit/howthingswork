"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import { useTranslations } from "next-intl";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const ComponentLifecycleVisualizer = dynamic(() => import("./ComponentLifecycleVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const LIFECYCLE_CODE = `function Component({ userId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Runs after mount and when userId changes
    let cancelled = false;

    fetch(\`/api/user/\${userId}\`)
      .then(res => res.json())
      .then(json => {
        if (!cancelled) setData(json); // guard against stale closure
      });

    // Cleanup: cancel if userId changes before fetch resolves
    return () => { cancelled = true; };
  }, [userId]); // re-runs when userId changes

  // Runs on unmount
  useEffect(() => {
    return () => console.log('Component unmounted');
  }, []);
}`;

const USE_CASES: UseCase[] = [
  {
    title: "Race Condition in Data Fetching on Rapid Navigation",
    scenario: "A user profile page fetches user data on mount. If a user rapidly clicks through profiles (User A → User B → User C), the displayed data sometimes shows User A's data on User C's page.",
    problem: "Each navigation triggers a re-mount with a new userId. The useEffect fires 3 fetch calls, but they resolve out of order: User B (fast) → User C (fast) → User A (slow). The last-resolving fetch (User A) overwrites the correct data.",
    solution: "Use the cleanup function to set a `cancelled` flag. When userId changes, the previous effect's cleanup runs before the new effect, marking the old fetch as stale. The guard `if (!cancelled) setData(json)` prevents stale responses from updating state.",
    takeaway: "The cleanup function in useEffect isn't just for unmounting — it runs before EVERY re-execution of the effect. This makes it the perfect place to cancel async operations and prevent race conditions.",
  },
  {
    title: "Memory Leak from Forgotten Event Listener Cleanup",
    scenario: "A chart component adds a `window.resize` event listener on mount to recalculate dimensions. After navigating away, the browser's memory usage keeps climbing and console shows 'setState on unmounted component' warnings.",
    problem: "The event listener was added in useEffect but never cleaned up. The component unmounts, but the listener still holds a reference to the component's state setter, creating a memory leak and triggering warnings on resize.",
    solution: "Return a cleanup function from useEffect that removes the event listener. The cleanup runs during the Unmount phase, before DOM removal, ensuring no orphaned listeners persist. Apply the same pattern for WebSocket connections, interval timers, and IntersectionObserver instances.",
    takeaway: "Every subscription, listener, or timer created in useEffect MUST have a corresponding cleanup. Think of mount/unmount as a pair: every 'set up' action needs a corresponding 'tear down' action.",
  },
];

export default function ComponentLifecyclePage() {
  const t = useTranslations("pages.componentLifecycle");
  return (
    <MotionFade>
      <Section
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <ComponentLifecycleVisualizer />
        <ConceptExplainer
          overview={t("explainer.overview")}
          howItWorks={t.raw("explainer.howItWorks") as ExplainerStep[]}
          keyConcepts={t.raw("explainer.keyConcepts") as KeyConcept[]}
          codeExample={{ label: t("explainer.codeLabel"), code: LIFECYCLE_CODE }}
          whyItMatters={t("explainer.whyItMatters")}
          pitfalls={t.raw("explainer.pitfalls") as string[]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
