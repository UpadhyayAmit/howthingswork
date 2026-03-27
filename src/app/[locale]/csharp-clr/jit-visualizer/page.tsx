"use client";

import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import JITVisualizer from "./JITVisualizer";

export default function JITVisualizerPage() {
  return (
    <MotionFade>
      <Section
        title="JIT Compilation Visualizer"
        subtitle="Watch C# source code transform from IL to native machine code at runtime."
      >
        <JITVisualizer />
      </Section>
    </MotionFade>
  );
}
