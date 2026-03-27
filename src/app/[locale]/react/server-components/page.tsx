"use client";
import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import { useTranslations } from "next-intl";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const ServerComponentsVisualizer = dynamic(() => import("./ServerComponentsVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const SERVER_CODE = `// ServerComponent.tsx — runs ONLY on server
// No bundle cost, can use async/await, access DB directly
async function ProductPage({ id }) {
  const product = await db.products.findById(id); // direct DB access!

  return (
    <div>
      <h1>{product.name}</h1>
      {/* Pass server data to a client component */}
      <AddToCartButton productId={product.id} price={product.price} />
    </div>
  );
}

// AddToCartButton.tsx — runs on client (needs onClick)
'use client';
function AddToCartButton({ productId, price }) {
  const [added, setAdded] = useState(false);

  return (
    <button onClick={() => {
      addToCart(productId);
      setAdded(true);
    }}>
      {added ? 'Added!' : \`Add for $\${price}\`}
    </button>
  );
}`;

const USE_CASES: UseCase[] = [
  {
    title: "E-Commerce Product Page with Zero-Bundle Server Data",
    scenario: "A product detail page needs to show: product info (from DB), reviews (from API), and an interactive 'Add to Cart' button. Traditional approach: fetch all data client-side with useEffect → loading spinners → hydration overhead.",
    problem: "Client-side fetching means: ship the fetch logic in the bundle → render loading state → make API calls from the browser → parse responses → re-render with data. The user sees a spinner, the bundle includes API client code, and there's a waterfall: page loads → JS executes → fetch starts → data arrives.",
    solution: "Make ProductPage and Reviews as Server Components (the default in Next.js App Router). They fetch data on the server with direct DB/API access and send pre-rendered HTML. Only AddToCartButton is a Client Component (marked with 'use client') because it needs onClick. Zero API client code in the bundle.",
    takeaway: "Server Components eliminate the request waterfall by moving data fetching to the server. Only interactive components (buttons, forms, animations) need to be Client Components. This pattern typically reduces bundle size by 30-50% and eliminates loading spinners for initial data.",
  },
  {
    title: "Deciding the Server/Client Component Boundary",
    scenario: "You're building a blog post page. It has a header (static), article body (static with syntax-highlighted code), a comment section (interactive — like/reply buttons), and a share widget (interactive — copy link, social share).",
    problem: "New developers often mark the entire page as 'use client' because ONE component needs interactivity. This sends the entire page's JavaScript to the browser — syntax highlighting library, markdown parser, etc. — even though 80% of the page is static content.",
    solution: "Keep the page as a Server Component (default). Only wrap Comment and ShareWidget with 'use client'. The header, article body, and syntax highlighting render on the server and send zero JavaScript. The client only receives the small interactive components. Think of the boundary as: 'What needs browser APIs (state, effects, event handlers)?'",
    takeaway: "Push the 'use client' boundary as far DOWN the tree as possible. The rule: a component should be a Client Component only if it directly uses useState, useEffect, onClick, or browser-only APIs. Everything else should stay as a Server Component for zero bundle cost.",
  },
];

export default function ServerComponentsPage() {
  const t = useTranslations("pages.serverComponents");
  return (
    <MotionFade>
      <Section
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <ServerComponentsVisualizer />
        <ConceptExplainer
          overview={t("explainer.overview")}
          howItWorks={t.raw("explainer.howItWorks") as ExplainerStep[]}
          keyConcepts={t.raw("explainer.keyConcepts") as KeyConcept[]}
          codeExample={{ label: t("explainer.codeLabel"), code: SERVER_CODE }}
          whyItMatters={t("explainer.whyItMatters")}
          pitfalls={t.raw("explainer.pitfalls") as string[]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
