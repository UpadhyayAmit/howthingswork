"use client";

import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import AzureLifecycleVisualizer from "./AzureLifecycleVisualizer";

export default function AzureLifecycleVisualizerPage() {
  return (
    <MotionFade>
      <Section
        title="Azure Function Lifecycle Visualizer"
        subtitle="Step through the complete Azure Function execution lifecycle — from trigger to response."
      >
        <AzureLifecycleVisualizer />
      </Section>
    </MotionFade>
  );
}
