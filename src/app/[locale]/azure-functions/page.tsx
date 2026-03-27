"use client";

import Link from "next/link";
import MotionFade from "@/app/_animations/MotionFade";
import Card from "@/app/_components/Card";

export default function AzureFunctionsPage() {
  return (
    <MotionFade>
      <h1 className="text-3xl font-bold mb-2">Azure Functions</h1>
      <p className="text-text-secondary mb-8">
        Understand the serverless execution model — triggers, bindings, and the function lifecycle.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/azure-functions/lifecycle-visualizer">
          <Card glow className="hover:border-accent/40 transition-colors cursor-pointer">
            <h3 className="text-lg font-semibold mb-1">Lifecycle Visualizer</h3>
            <p className="text-sm text-text-secondary">
              Step through the Azure Function execution lifecycle — from trigger to response.
            </p>
          </Card>
        </Link>
      </div>
    </MotionFade>
  );
}
