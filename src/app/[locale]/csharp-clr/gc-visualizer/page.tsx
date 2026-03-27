"use client";

import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import GCVisualizer from "./GCVisualizer";

export default function GCVisualizerPage() {
  return (
    <MotionFade>
      <Section
        title="CLR Garbage Collection Visualizer"
        subtitle="Watch .NET's generational garbage collector mark, sweep, promote, and compact objects."
      >
        <GCVisualizer />
      </Section>
    </MotionFade>
  );
}
