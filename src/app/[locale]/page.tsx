"use client";

import dynamic from "next/dynamic";

const DashboardFlow = dynamic(() => import("./DashboardFlow"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-text-muted text-sm font-mono animate-pulse">Loading graph…</div>
    </div>
  ),
});

export default function HomePage() {
  return (
    <>
      {/* 
        Force the parent 'main' container to hide scrollbars while on the Dashboard.
        This prevents the negative margins from triggering layout overflows.
      */}
      <style dangerouslySetInnerHTML={{ __html: `
        main { overflow: hidden !important; }
        body { overflow: hidden !important; }
      ` }} />

      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          /* Offset layout padding (p-8 = 2rem) and footer padding (pb-24 = 6rem) */
          top: "-2rem",
          left: "-2rem",
          right: "-2rem",
          bottom: "-6rem",
          zIndex: 1,
        }}
      >
        <DashboardFlow />
      </div>
    </>
  );
}
