"use client";
import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import { useTranslations } from "next-intl";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const PortalsVisualizer = dynamic(() => import("./PortalsVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const PORTALS_CODE = `import { createPortal } from 'react-dom';

function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  // Renders into document.body, not into parent's DOM node
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body  // the target DOM node
  );
}

// Usage — modal is a React child of Card,
// but renders at document.body in the DOM
function Card() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ overflow: 'hidden' }}> {/* won't clip modal */}
      <button onClick={() => setOpen(true)}>Open Modal</button>
      <Modal isOpen={open} onClose={() => setOpen(false)}>
        Content here!
      </Modal>
    </div>
  );
}`;

const USE_CASES: UseCase[] = [
  {
    title: "Solving the overflow:hidden Modal Problem",
    scenario: "Your card component has `overflow: hidden` to clip long text. When you add a dropdown menu or modal inside the card, it gets clipped by the card's overflow — users can't see the full dropdown.",
    problem: "The modal/dropdown is a DOM child of the card, so CSS `overflow: hidden` on the card clips everything inside it. You could remove overflow:hidden but that breaks the text truncation. CSS `z-index` alone can't escape an overflow context.",
    solution: "Use a portal to render the modal at `document.body`. It escapes the card's CSS stacking context entirely. React events still bubble through the React tree (card → modal), so onClick handlers and context providers work normally — only the DOM position changes.",
    takeaway: "Portals decouple the DOM hierarchy from the React component hierarchy. This is essential for any UI that needs to visually 'break out' of its container: modals, tooltips, dropdowns, toast notifications, and floating menus.",
  },
  {
    title: "Rendering to a Different Root for Micro-frontends",
    scenario: "You're building a micro-frontend where your React widget needs to render inside a specific container managed by a host application (not your root div). The host gives you a `#widget-container` div.",
    problem: "Your React app renders into `#app-root` by default. You can't simply move your component tree because it needs to share context and state with other parts of your React app.",
    solution: "Use portals to render specific components into `#widget-container` while keeping them in the same React tree. They still receive context from their React parent, participate in event bubbling, and share state — they just render into a different DOM node.",
    takeaway: "Portals are the foundation for micro-frontend integration patterns. They let you mount React components into external DOM nodes while preserving the full React component model (context, error boundaries, event delegation).",
  },
];

export default function PortalsPage() {
  const t = useTranslations("pages.portals");
  return (
    <MotionFade>
      <Section
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <PortalsVisualizer />
        <ConceptExplainer
          overview={t("explainer.overview")}
          howItWorks={t.raw("explainer.howItWorks") as ExplainerStep[]}
          keyConcepts={t.raw("explainer.keyConcepts") as KeyConcept[]}
          codeExample={{ label: t("explainer.codeLabel"), code: PORTALS_CODE }}
          whyItMatters={t("explainer.whyItMatters")}
          pitfalls={t.raw("explainer.pitfalls") as string[]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
