export default function VisualizerSkeleton() {
  return (
    <div className="w-full animate-pulse space-y-4">
      {/* Main visualizer panel */}
      <div className="h-64 rounded-xl bg-elevated border border-border" />
      {/* Secondary panel */}
      <div className="h-32 rounded-xl bg-elevated border border-border" />
      {/* Explainer divider */}
      <div className="flex items-center gap-4 mt-10">
        <div className="h-px flex-1 bg-border" />
        <div className="h-3 w-24 rounded bg-border" />
        <div className="h-px flex-1 bg-border" />
      </div>
      {/* Explainer overview */}
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-elevated" />
        <div className="h-3 w-5/6 rounded bg-elevated" />
        <div className="h-3 w-4/6 rounded bg-elevated" />
      </div>
      {/* Steps */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-7 h-7 rounded-full bg-elevated flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-1/3 rounded bg-elevated" />
              <div className="h-3 w-full rounded bg-elevated" />
              <div className="h-3 w-2/3 rounded bg-elevated" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
