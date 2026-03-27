"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import { useTranslations } from "next-intl";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const KeysListsVisualizer = dynamic(() => import("./KeysListsVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const KEYS_CODE = `// ❌ Bad — index as key on dynamic list
{todos.map((todo, index) => (
  <TodoItem key={index} todo={todo} />
))}
// If you delete item at index 0, all items shift — React
// sees every item as 'changed' and re-renders all of them.

// ✅ Good — stable unique ID
{todos.map((todo) => (
  <TodoItem key={todo.id} todo={todo} />
))}
// Deleting one item: React only removes that one node.
// All others are matched by key and kept untouched.

// 🔄 Intentional reset via key change
<UserProfile key={userId} userId={userId} />
// Changing userId resets all internal state — no need for
// a manual reset effect.`;

const USE_CASES: UseCase[] = [
  {
    title: "Dynamic Form Fields with Drag-and-Drop Reordering",
    scenario: "You have a form builder where users can add, remove, and reorder form fields via drag-and-drop. Each field has its own validation state and user input. After reordering, the input values appear in the wrong fields.",
    problem: "Using array index as key means when a user drags field 3 to position 1, React matches the component at position 1 (old field 1) with the new key=1 (field 3's new position). The old component instance retains field 1's input value but now renders field 3's label — a state/UI mismatch.",
    solution: "Assign each form field a stable UUID when created (e.g., `crypto.randomUUID()`). Use this as the key. Now drag-and-drop reordering just changes positions — React recognizes each component by its UUID and moves the DOM nodes without resetting any state.",
    takeaway: "For any list that supports add, remove, reorder, or filter operations, always use a stable unique ID as the key. Array index only works for truly static, never-reordered lists (like a static navigation menu).",
  },
  {
    title: "Using Key to Force Component Reset Without useEffect",
    scenario: "A user profile edit form should reset to clean state whenever the selected user changes. You tried resetting state in useEffect but there's a flash of old data before the reset takes effect.",
    problem: "Setting state in useEffect happens AFTER render and paint. The sequence is: render (shows old user's data) → paint (user sees stale data) → useEffect fires (resets state) → re-render (shows new user's data). This causes a visible flash.",
    solution: "Add `key={userId}` to the form component. When userId changes, React sees a different key at the same position and unmounts the old instance entirely, creating a fresh one. No useEffect needed — the new instance starts with default initial state. Zero flash.",
    takeaway: "The `key` prop is not just for lists — it's a powerful tool to force React to destroy and recreate a component. Use it whenever you want a 'clean slate' without the complexity and timing issues of manually resetting state in useEffect.",
  },
];

export default function KeysListsPage() {
  const t = useTranslations("pages.keysLists");
  return (
    <MotionFade>
      <Section
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <KeysListsVisualizer />
        <ConceptExplainer
          overview={t("explainer.overview")}
          howItWorks={t.raw("explainer.howItWorks") as ExplainerStep[]}
          keyConcepts={t.raw("explainer.keyConcepts") as KeyConcept[]}
          codeExample={{ label: t("explainer.codeLabel"), code: KEYS_CODE }}
          whyItMatters={t("explainer.whyItMatters")}
          pitfalls={t.raw("explainer.pitfalls") as string[]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
