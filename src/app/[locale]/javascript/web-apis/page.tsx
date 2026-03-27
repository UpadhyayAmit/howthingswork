"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const WebAPIsVisualizer = dynamic(() => import("./WebAPIsVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// Web APIs are NOT JavaScript — they're browser-provided:

// DOM API — manipulate the document
document.querySelector("#app").innerHTML = "Hello";

// Fetch API — HTTP requests (runs on network thread)
const resp = await fetch("/api/data");
const data = await resp.json();

// setTimeout — delegates to the browser timer thread
setTimeout(() => console.log("delayed"), 1000);

// Web Worker — true multi-threading
const worker = new Worker("heavy-task.js");
worker.postMessage({ data: largeArray });
worker.onmessage = (e) => console.log(e.data);

// requestAnimationFrame — synced with display refresh
function animate() {
  updateCanvas();
  requestAnimationFrame(animate); // ~16ms (60fps)
}

// IntersectionObserver — efficient scroll detection
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) loadImage(e.target);
  });
});`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "JavaScript ≠ Browser APIs",
    body: "JavaScript (the language) is just variables, functions, objects, and control flow. DOM manipulation, HTTP requests, timers, storage — these are all WEB APIs provided by the browser environment. They're NOT part of the ECMAScript specification.",
  },
  {
    title: "Multi-Threaded Under the Hood",
    body: "While JS is single-threaded, the browser uses multiple threads: a network thread for fetch, a timer thread for setTimeout, a rendering thread for layout/paint, and worker threads for Web Workers. The Event Loop bridges these threads back to JS.",
  },
  {
    title: "requestAnimationFrame (rAF)",
    body: "Unlike setTimeout, rAF is synced with the browser's display refresh rate (usually 60Hz). Callbacks run BEFORE the next paint, making it ideal for animations. The browser can also pause rAF in background tabs to save resources.",
  },
  {
    title: "Web Workers: True Parallelism",
    body: "Web Workers run JavaScript on a separate thread. They can't access the DOM but can do heavy computation without blocking the main thread. Communication is via postMessage (data is copied, not shared — unless using SharedArrayBuffer).",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  { term: "Main Thread", definition: "Runs JS, handles DOM updates, processes events, and executes rendering. Everything shares this thread, which is why long JS blocks UI.", icon: "🧵" },
  { term: "requestAnimationFrame", definition: "Schedules a callback before the next paint. Runs at display refresh rate (~60fps). Automatically paused in background tabs.", icon: "🎞️" },
  { term: "Web Workers", definition: "Run JS in a background thread. No DOM access, communicate via messages. Ideal for heavy computation (image processing, data parsing).", icon: "⚙️" },
  { term: "Service Workers", definition: "Special workers that act as network proxies. Enable offline support, push notifications, and background sync. Part of Progressive Web App (PWA) patterns.", icon: "📡" },
];

const USE_CASES: UseCase[] = [
  {
    title: "Smooth Animations with rAF",
    scenario: "Your JavaScript animation uses setInterval(update, 16) to target 60fps. It works on your monitor but stutters on 120Hz displays and wastes CPU in background tabs.",
    problem: "setInterval isn't synced with the display refresh rate. On 120Hz displays, you only update every other frame (visual stuttering). In background tabs, the interval keeps firing (wasted CPU and battery).",
    solution: "Replace setInterval with requestAnimationFrame. rAF automatically matches the display's refresh rate (60Hz, 120Hz, 144Hz) and pauses when the tab is hidden. Use the timestamp parameter for frame-rate-independent animation.",
    takeaway: "requestAnimationFrame is the only correct way to do visual animations in JavaScript. It's display-synced, power-efficient, and provides a high-resolution timestamp for smooth, frame-independent motion.",
  },
  {
    title: "Offloading Heavy Computation to Web Workers",
    scenario: "Your app parses a 50MB CSV file client-side. The UI freezes for 8 seconds during parsing — no spinner, no progress feedback. Users think the app crashed.",
    problem: "CSV parsing runs on the main thread, blocking all UI updates, event processing, and rendering. The browser can't even show a loading spinner because the rendering pipeline is blocked.",
    solution: "Move parsing to a Web Worker: const worker = new Worker('csv-parser.js'). Send the file via postMessage, receive parsed results async. The main thread stays responsive for UI updates and progress indication.",
    takeaway: "Any computation taking >50ms should be considered for a Web Worker. The 50ms threshold comes from the recommended budget for maintaining 60fps (16ms per frame, with time needed for rendering and event processing).",
  },
];

export default function WebAPIsPage() {
  return (
    <MotionFade>
      <Section
        title="Web APIs & Browser Runtime"
        subtitle="The browser environment that powers JavaScript — from DOM manipulation and fetch to Web Workers and requestAnimationFrame."
      >
        <WebAPIsVisualizer />
        <ConceptExplainer
          overview="JavaScript the language is surprisingly small. Most of what developers think of as 'JavaScript' — DOM manipulation, HTTP requests, timers, storage — are actually Web APIs provided by the browser. Understanding this boundary explains why the same JS code behaves differently in Node.js vs browsers."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Common Web APIs", code: CODE_EXAMPLE }}
          whyItMatters="Knowing which APIs are browser-provided (not JavaScript) helps you: write isomorphic code, understand threading boundaries, optimize animations with rAF, offload work to Web Workers, and build offline-capable PWAs."
          pitfalls={[
            "DOM APIs are synchronous and block the main thread. Batch DOM reads and writes separately to avoid layout thrashing.",
            "Web Workers can't access the DOM. If you need to update the UI based on worker results, you must postMessage back to the main thread.",
            "localStorage is synchronous and blocks the main thread. For large data, use IndexedDB (async) instead.",
            "fetch() doesn't reject on HTTP errors (404, 500). It only rejects on network failures. Always check response.ok.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
