import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

export default function ReactSectionLoading() {
  return (
    <div className="px-6 py-8 max-w-5xl mx-auto space-y-6">
      {/* Title skeleton */}
      <div className="animate-pulse space-y-2">
        <div className="h-7 w-72 rounded-lg bg-elevated" />
        <div className="h-4 w-96 rounded bg-elevated" />
      </div>
      {/* Buttons skeleton */}
      <div className="flex gap-2">
        <div className="h-9 w-28 rounded-lg bg-elevated animate-pulse" />
        <div className="h-9 w-20 rounded-lg bg-elevated animate-pulse" />
      </div>
      <VisualizerSkeleton />
    </div>
  );
}
