"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import { useTranslations } from "next-intl";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const ContextApiVisualizer = dynamic(() => import("./ContextApiVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CONTEXT_CODE = `const ThemeContext = React.createContext('light'); // default

// Provider — wrap at the top level
function App() {
  const [theme, setTheme] = useState('dark');

  // ⚠️ Memoize the value to avoid re-rendering all consumers
  // on every App render, even when theme hasn't changed
  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      <Layout />
    </ThemeContext.Provider>
  );
}

// Consumer — anywhere in the subtree
function Button() {
  const { theme } = useContext(ThemeContext);
  return <button className={theme}>Click</button>;
}`;

const USE_CASES: UseCase[] = [
  {
    title: "Theme Provider with Performance-Safe Architecture",
    scenario: "Your app has a global theme context providing colors, fonts, and dark/light mode. After adding it, every keystroke in a form input re-renders the entire app because the ThemeProvider is at the root.",
    problem: "The context value is `{ theme, toggleTheme }`. If the ThemeProvider's parent re-renders for ANY reason (new route, state change), a new object is created → all consumers re-render. With 50+ themed components, every parent re-render triggers 50+ unnecessary re-renders.",
    solution: "Split into two contexts: `ThemeValueContext` (read-only, changes only on toggle) and `ThemeDispatchContext` (stable setter function). Components that only READ the theme subscribe to ThemeValueContext. Components that only TOGGLE subscribe to ThemeDispatchContext. Memoize both values with useMemo.",
    takeaway: "Split contexts by update frequency: separate rarely-changing data (theme colors) from frequently-changing data (user input). This prevents the 'context-triggers-everything' problem and is the pattern used by Redux, Zustand, and Jotai internally.",
  },
  {
    title: "Avoiding Prop Drilling in a Deeply Nested Settings Panel",
    scenario: "A settings page passes `locale`, `currency`, and `dateFormat` through 6 levels of nesting: Settings → Layout → Panel → Section → Field → Label. Adding a new preference requires editing 6 components.",
    problem: "Prop drilling creates tight coupling — every intermediate component must know about and forward props it doesn't use. Adding, renaming, or removing a preference requires changing every component in the chain. The intermediate components also re-render when props change even though they don't USE the data.",
    solution: "Create a `PreferencesContext` and consume it directly in Label with `useContext(PreferencesContext)`. Intermediate components (Layout, Panel, Section, Field) don't receive or forward preference props. The preferences data 'teleports' from Provider to consumer, skipping all intermediate components.",
    takeaway: "Context eliminates prop drilling for cross-cutting concerns (theme, auth, locale, feature flags). Use it when data needs to be available deep in the tree and passing it through 3+ levels of components that don't use it. For frequently-updating state, consider a state manager instead.",
  },
];

export default function ContextApiPage() {
  const t = useTranslations("pages.contextApi");
  return (
    <MotionFade>
      <Section
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <ContextApiVisualizer />
        <ConceptExplainer
          overview={t("explainer.overview")}
          howItWorks={t.raw("explainer.howItWorks") as ExplainerStep[]}
          keyConcepts={t.raw("explainer.keyConcepts") as KeyConcept[]}
          codeExample={{ label: t("explainer.codeLabel"), code: CONTEXT_CODE }}
          whyItMatters={t("explainer.whyItMatters")}
          pitfalls={t.raw("explainer.pitfalls") as string[]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
