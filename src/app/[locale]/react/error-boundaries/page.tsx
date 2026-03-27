"use client";
import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import { useTranslations } from "next-intl";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const ErrorBoundaryVisualizer = dynamic(() => import("./ErrorBoundaryVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const ERRORS_CODE = `class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    // Called during render — must be pure, no side effects
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Called after commit — safe for side effects like logging
    logErrorToSentry(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <FallbackUI error={this.state.error} />;
    }
    return this.props.children;
  }
}

// Usage:
<ErrorBoundary>
  <MyComponent /> {/* If this throws, ErrorBoundary catches it */}
</ErrorBoundary>`;

const USE_CASES: UseCase[] = [
  {
    title: "Production Error Reporting with Sentry Integration",
    scenario: "Your e-commerce app crashes in production when a product with malformed data renders. The entire page goes white and users see nothing — you lose the sale and have no visibility into what happened.",
    problem: "Without error boundaries, a single component throwing an error unmounts the ENTIRE React tree. The user sees a blank page. No error tracking fires because the crash happened during rendering, not in a try/catch block.",
    solution: "Wrap critical sections in error boundaries with strategic granularity: one around the product card, one around the cart, one around the whole page. Use componentDidCatch to send the error + componentStack to Sentry. Show a helpful fallback UI ('Something went wrong, refresh to try again') instead of a blank page.",
    takeaway: "Error boundaries are your PRODUCTION safety net. Place them at route level (catch everything), feature level (isolate failures), and widget level (for third-party components you don't control). Always log to an error tracking service in componentDidCatch.",
  },
  {
    title: "Graceful Degradation for Third-Party Widgets",
    scenario: "You embed a third-party analytics chart widget in your dashboard. After a library update, the widget occasionally throws during rendering due to unexpected data formats.",
    problem: "The chart crash cascades — it's nested inside your dashboard layout, so the error propagates up and takes down the entire dashboard, including the navigation, sidebar, and all other widgets.",
    solution: "Wrap ONLY the third-party widget in its own error boundary. The fallback shows a placeholder ('Chart unavailable — refresh to retry'). The rest of the dashboard remains fully functional. Users can still use all other features while you investigate the chart issue.",
    takeaway: "Error boundaries give you component-level fault isolation, similar to microservice circuit breakers. Treat each third-party or unstable component as an isolated fault domain.",
  },
];

export default function ErrorBoundaryPage() {
  const t = useTranslations("pages.errorBoundaries");
  return (
    <MotionFade>
      <Section
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <ErrorBoundaryVisualizer />
        <ConceptExplainer
          overview={t("explainer.overview")}
          howItWorks={t.raw("explainer.howItWorks") as ExplainerStep[]}
          keyConcepts={t.raw("explainer.keyConcepts") as KeyConcept[]}
          codeExample={{ label: t("explainer.codeLabel"), code: ERRORS_CODE }}
          whyItMatters={t("explainer.whyItMatters")}
          pitfalls={t.raw("explainer.pitfalls") as string[]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
