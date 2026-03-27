"use client";
import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import { useTranslations } from "next-intl";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const SuspenseVisualizer = dynamic(() => import("./SuspenseVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const SUSPENSE_CODE = `// Code splitting with React.lazy
const HeavyChart = React.lazy(() => import('./HeavyChart'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <HeavyChart /> {/* loads the JS bundle on demand */}
    </Suspense>
  );
}

// Data fetching (with a Suspense-compatible library)
// The library throws a Promise internally when data isn't ready
function UserProfile({ userId }) {
  // use() hook (React 19) or library wrapper throws if not ready
  const user = use(fetchUser(userId));
  return <h1>{user.name}</h1>;
}

<Suspense fallback={<ProfileSkeleton />}>
  <UserProfile userId={1} />
</Suspense>`;

const USE_CASES: UseCase[] = [
  {
    title: "Route-Based Code Splitting to Reduce Initial Bundle",
    scenario: "Your SPA ships a 2MB JavaScript bundle. The landing page only needs 200KB of it — the rest is for the admin panel, chart library, and markdown editor that 80% of users never visit.",
    problem: "Without code splitting, the browser downloads, parses, and executes 2MB of JavaScript before showing anything. On mobile (3G network + slower CPU), this means 8+ seconds before the page is interactive — most users bounce.",
    solution: "Use `React.lazy` + `Suspense` at route boundaries: `const AdminPanel = React.lazy(() => import('./AdminPanel'))`. The initial bundle drops to 200KB. When a user navigates to /admin, the AdminPanel chunk loads on demand. The Suspense fallback shows a skeleton while the chunk downloads.",
    takeaway: "Code splitting at route boundaries is the highest-impact optimization for initial load time. Wrap lazy-loaded routes in Suspense with skeleton fallbacks. Tools like Next.js do this automatically for page components, but you should also lazy-load heavy feature components within pages.",
  },
  {
    title: "Nested Suspense Boundaries for Progressive Loading",
    scenario: "A dashboard page loads 3 things: sidebar navigation (fast), main content (medium), and analytics charts (slow). With a single Suspense boundary, the entire page shows a spinner until the slowest component (charts) finishes loading.",
    problem: "One Suspense boundary at the page level means the entire page is either 'loading' or 'ready'. The sidebar (50ms) and main content (200ms) are ready quickly, but the user stares at a full-page spinner for 2 seconds waiting for the charts.",
    solution: "Nest multiple Suspense boundaries: one around the sidebar (shows instantly), one around the main content (shows after 200ms), one around the charts (shows after 2s). Each section renders independently as its data/code becomes available. The page progressively reveals content instead of all-or-nothing.",
    takeaway: "Use nested Suspense boundaries to control loading granularity. The boundary placement determines the loading UX: coarse boundaries (page-level) show everything at once, fine boundaries (component-level) enable progressive, streaming-style loading.",
  },
];

export default function SuspensePage() {
  const t = useTranslations("pages.suspense");
  return (
    <MotionFade>
      <Section
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <SuspenseVisualizer />
        <ConceptExplainer
          overview={t("explainer.overview")}
          howItWorks={t.raw("explainer.howItWorks") as ExplainerStep[]}
          keyConcepts={t.raw("explainer.keyConcepts") as KeyConcept[]}
          codeExample={{ label: t("explainer.codeLabel"), code: SUSPENSE_CODE }}
          whyItMatters={t("explainer.whyItMatters")}
          pitfalls={t.raw("explainer.pitfalls") as string[]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
