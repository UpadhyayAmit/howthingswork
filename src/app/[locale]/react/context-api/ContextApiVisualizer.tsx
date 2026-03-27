"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type Theme = "light" | "dark" | "purple";

interface TreeNode {
  id: string;
  label: string;
  isConsumer: boolean;
  x: number;
  y: number;
  children: string[];
}

const NODES: Record<string, TreeNode> = {
  app:     { id: "app",     label: "App",     isConsumer: false, x: 240, y: 30,  children: ["nav", "main", "footer"] },
  nav:     { id: "nav",     label: "Nav",     isConsumer: true,  x: 80,  y: 110, children: [] },
  main:    { id: "main",    label: "Main",    isConsumer: false, x: 240, y: 110, children: ["article", "sidebar"] },
  footer:  { id: "footer",  label: "Footer",  isConsumer: true,  x: 400, y: 110, children: [] },
  article: { id: "article", label: "Article", isConsumer: false, x: 180, y: 200, children: [] },
  sidebar: { id: "sidebar", label: "Sidebar", isConsumer: true,  x: 300, y: 200, children: [] },
};

const EDGES: [string, string][] = [
  ["app", "nav"], ["app", "main"], ["app", "footer"],
  ["main", "article"], ["main", "sidebar"],
];

const THEME_COLORS: Record<Theme, { bg: string; border: string; text: string; accent: string }> = {
  light:  { bg: "#FFF9F0", border: "#F59E0B", text: "#92400E", accent: "#F59E0B" },
  dark:   { bg: "#0D0D0D", border: "#6B7280", text: "#9CA3AF", accent: "#6B7280" },
  purple: { bg: "#1A0533", border: "#A855F7", text: "#C084FC", accent: "#A855F7" },
};

type PropPhase = "idle" | "propagating" | "notifying" | "rerendering" | "done";

export default function ContextApiVisualizer() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [phase, setPhase] = useState<PropPhase>("idle");
  const [renderCounts, setRenderCounts] = useState<Record<string, number>>({
    nav: 0, footer: 0, sidebar: 0,
  });
  const [flashingNodes, setFlashingNodes] = useState<Set<string>>(new Set());
  const [waveRadius, setWaveRadius] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animatingRef = useRef(false);

  const changeTheme = useCallback(async (newTheme: Theme) => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    setIsAnimating(true);
    setTheme(newTheme);

    // Phase 1: Propagating wave from provider
    setPhase("propagating");
    setWaveRadius(0);
    for (let r = 0; r <= 200; r += 10) {
      setWaveRadius(r);
      await sleep(30);
    }

    // Phase 2: Notify consumers
    setPhase("notifying");
    setFlashingNodes(new Set(["nav", "footer", "sidebar"]));
    await sleep(600);

    // Phase 3: Re-render consumers
    setPhase("rerendering");
    setRenderCounts(prev => ({
      nav:     prev.nav + 1,
      footer:  prev.footer + 1,
      sidebar: prev.sidebar + 1,
    }));
    await sleep(500);

    setPhase("done");
    setFlashingNodes(new Set());
    setWaveRadius(0);
    animatingRef.current = false;
    setIsAnimating(false);
  }, []);

  const reset = useCallback(() => {
    if (animatingRef.current) return;
    setPhase("idle");
    setRenderCounts({ nav: 0, footer: 0, sidebar: 0 });
    setFlashingNodes(new Set());
    setWaveRadius(0);
    setTheme("dark");
  }, []);

  const themeColor = THEME_COLORS[theme];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-sm text-text-secondary">Change theme:</span>
        {(["light", "dark", "purple"] as Theme[]).map((t) => (
          <Button
            key={t}
            variant={theme === t ? "primary" : "secondary"}
            size="sm"
            onClick={() => changeTheme(t)}
            disabled={isAnimating}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Button>
        ))}
        <Button variant="secondary" size="sm" onClick={reset} disabled={isAnimating}>
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Tree SVG */}
        <div className="col-span-2">
          <Panel title="Component Tree">
            <svg width="100%" viewBox="0 0 480 260" className="overflow-visible">
              {/* Wave from provider */}
              <AnimatePresence>
                {phase === "propagating" && waveRadius > 0 && (
                  <motion.circle
                    cx={NODES.app.x}
                    cy={NODES.app.y + 20}
                    r={waveRadius}
                    fill="none"
                    stroke={themeColor.accent}
                    strokeWidth="2"
                    opacity={Math.max(0, 1 - waveRadius / 200)}
                  />
                )}
              </AnimatePresence>

              {/* Edges */}
              {EDGES.map(([from, to]) => {
                const a = NODES[from];
                const b = NODES[to];
                return (
                  <line
                    key={`${from}-${to}`}
                    x1={a.x} y1={a.y + 20}
                    x2={b.x} y2={b.y + 20}
                    stroke="#374151"
                    strokeWidth="2"
                  />
                );
              })}

              {/* Nodes */}
              {Object.values(NODES).map((node) => {
                const isFlashing = flashingNodes.has(node.id);
                const isProvider = node.id === "app";
                return (
                  <g key={node.id}>
                    {/* Consumer ring */}
                    {node.isConsumer && (
                      <motion.rect
                        x={node.x - 42}
                        y={node.y - 2}
                        width={84}
                        height={44}
                        rx={10}
                        fill="none"
                        stroke={isFlashing ? themeColor.accent : "#A855F7"}
                        strokeWidth={isFlashing ? 2.5 : 1.5}
                        strokeDasharray={isFlashing ? "0" : "4 2"}
                        animate={isFlashing ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                        transition={{ duration: 0.4, repeat: isFlashing ? Infinity : 0 }}
                      />
                    )}
                    {/* Provider special ring */}
                    {isProvider && (
                      <motion.rect
                        x={node.x - 46}
                        y={node.y - 6}
                        width={92}
                        height={52}
                        rx={12}
                        fill="none"
                        stroke={themeColor.accent}
                        strokeWidth="2"
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                    {/* Node box */}
                    <motion.rect
                      x={node.x - 38}
                      y={node.y}
                      width={76}
                      height={40}
                      rx={8}
                      fill={isFlashing ? themeColor.accent + "33" : "#111827"}
                      stroke={isFlashing ? themeColor.accent : "#374151"}
                      strokeWidth="1.5"
                      animate={isFlashing ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                      transition={{ duration: 0.3 }}
                      style={{ transformOrigin: `${node.x}px ${node.y + 20}px` }}
                    />
                    {/* Label */}
                    <text
                      x={node.x}
                      y={node.y + 15}
                      textAnchor="middle"
                      fill={isFlashing ? themeColor.accent : "#FAFAFA"}
                      fontSize="11"
                      fontWeight="600"
                      fontFamily="Inter, sans-serif"
                    >
                      {node.label}
                    </text>
                    {/* Consumer badge */}
                    {node.isConsumer && (
                      <text
                        x={node.x}
                        y={node.y + 28}
                        textAnchor="middle"
                        fill={isFlashing ? themeColor.accent : "#A855F7"}
                        fontSize="8"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        useContext
                      </text>
                    )}
                    {/* Provider badge */}
                    {isProvider && (
                      <text
                        x={node.x}
                        y={node.y + 28}
                        textAnchor="middle"
                        fill={themeColor.accent}
                        fontSize="8"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        Provider
                      </text>
                    )}
                    {/* Render count badge */}
                    {node.isConsumer && renderCounts[node.id] > 0 && (
                      <motion.g
                        key={renderCounts[node.id]}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{ transformOrigin: `${node.x + 34}px ${node.y}px` }}
                      >
                        <circle cx={node.x + 34} cy={node.y} r={10} fill="#A855F7" />
                        <text
                          x={node.x + 34}
                          y={node.y + 4}
                          textAnchor="middle"
                          fill="white"
                          fontSize="9"
                          fontWeight="700"
                        >
                          {renderCounts[node.id]}
                        </text>
                      </motion.g>
                    )}
                  </g>
                );
              })}

              {/* Legend */}
              <g transform="translate(10, 230)">
                <rect x={0} y={0} width={12} height={12} rx={3} fill="#111827" stroke="#A855F7" strokeDasharray="4 2" strokeWidth="1.5" />
                <text x={16} y={9} fill="#9CA3AF" fontSize="9" fontFamily="Inter, sans-serif">Consumer (useContext)</text>
                <rect x={140} y={0} width={12} height={12} rx={3} fill="#111827" stroke="#374151" strokeWidth="1.5" />
                <text x={156} y={9} fill="#9CA3AF" fontSize="9" fontFamily="Inter, sans-serif">Non-consumer (no re-render)</text>
              </g>
            </svg>
          </Panel>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <Panel title="Context Value">
            <div className="font-mono text-xs space-y-1">
              <div className="text-text-secondary">ThemeContext.value =</div>
              <motion.div
                key={theme}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-lg p-3 border text-xs"
                style={{ borderColor: themeColor.border, background: themeColor.bg + "22" }}
              >
                <div style={{ color: themeColor.accent }}>{`{`}</div>
                <div className="pl-3">
                  <span className="text-blue-400">theme</span>
                  <span className="text-text-secondary">: </span>
                  <span className="text-green-400">"{theme}"</span>
                  <span className="text-text-secondary">,</span>
                </div>
                <div className="pl-3">
                  <span className="text-blue-400">accent</span>
                  <span className="text-text-secondary">: </span>
                  <span className="text-green-400">"{themeColor.accent}"</span>
                </div>
                <div style={{ color: themeColor.accent }}>{`}`}</div>
              </motion.div>
            </div>
          </Panel>

          <Panel title="Re-render Log">
            <div className="space-y-2">
              {Object.entries(renderCounts).map(([node, count]) => (
                <div key={node} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-accent">{node}</span>
                  <motion.span
                    key={count}
                    initial={{ scale: 1.5, color: "#A855F7" }}
                    animate={{ scale: 1, color: "#9CA3AF" }}
                    className="text-text-secondary"
                  >
                    {count} render{count !== 1 ? "s" : ""}
                  </motion.span>
                </div>
              ))}
              {Object.values(renderCounts).every(v => v === 0) && (
                <p className="text-xs text-text-secondary italic">No re-renders yet</p>
              )}
            </div>
          </Panel>

          <Panel title="Phase">
            <div className="text-xs font-mono">
              <AnimatePresence mode="wait">
                <motion.div
                  key={phase}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className={`px-2 py-1 rounded ${
                    phase === "idle"        ? "text-text-secondary" :
                    phase === "propagating" ? "text-yellow-400 bg-yellow-400/10" :
                    phase === "notifying"   ? "text-orange-400 bg-orange-400/10" :
                    phase === "rerendering" ? "text-accent bg-accent/10" :
                    "text-green-400 bg-green-400/10"
                  }`}
                >
                  {phase === "idle"        ? "Waiting for change..." :
                   phase === "propagating" ? "Propagating down tree..." :
                   phase === "notifying"   ? "Notifying consumers..." :
                   phase === "rerendering" ? "Re-rendering consumers..." :
                   "Done — non-consumers skipped!"}
                </motion.div>
              </AnimatePresence>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
