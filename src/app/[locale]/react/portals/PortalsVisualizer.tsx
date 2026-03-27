"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type Mode = "portal" | "bubbling";

interface BubbleStep {
  id: string;
  label: string;
  tree: "react" | "dom";
}

const BUBBLE_STEPS: BubbleStep[] = [
  { id: "modal-btn",  label: "Button (click)",  tree: "dom" },
  { id: "modal-root", label: "#modal-root",     tree: "dom" },
  { id: "modal",      label: "Modal (Portal)",  tree: "react" },
  { id: "card",       label: "Card",            tree: "react" },
  { id: "main",       label: "Main",            tree: "react" },
  { id: "app",        label: "App",             tree: "react" },
];

export default function PortalsVisualizer() {
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("portal");
  const [bubbleStep, setBubbleStep] = useState(-1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [eventLog, setEventLog] = useState<string[]>([]);

  const openModal = useCallback(async () => {
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setBubbleStep(-1);
  }, []);

  const triggerBubble = useCallback(async () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setEventLog([]);
    setBubbleStep(-1);

    for (let i = 0; i < BUBBLE_STEPS.length; i++) {
      setBubbleStep(i);
      const step = BUBBLE_STEPS[i];
      setEventLog(prev => [...prev, `click → ${step.label} (${step.tree} tree)`]);
      await sleep(500);
    }

    setIsAnimating(false);
    setBubbleStep(-1);
  }, [isAnimating]);

  const reset = useCallback(() => {
    setModalOpen(false);
    setBubbleStep(-1);
    setEventLog([]);
    setIsAnimating(false);
  }, []);

  // SVG dimensions
  const W = 240;
  const H = 280;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <Button onClick={openModal} disabled={modalOpen}>
          Open Portal Modal
        </Button>
        <Button
          variant={mode === "bubbling" ? "primary" : "secondary"}
          onClick={() => { setMode(m => m === "portal" ? "bubbling" : "portal"); setBubbleStep(-1); setEventLog([]); }}
        >
          {mode === "portal" ? "Show Event Bubbling" : "Show Portal View"}
        </Button>
        <Button variant="secondary" onClick={reset}>
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* React Component Tree */}
        <Panel title="React Component Tree">
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
            {/* Edges */}
            <line x1={120} y1={45} x2={60}  y2={95}  stroke="#374151" strokeWidth="1.5" />
            <line x1={120} y1={45} x2={120} y2={95}  stroke="#374151" strokeWidth="1.5" />
            <line x1={120} y1={45} x2={180} y2={95}  stroke="#374151" strokeWidth="1.5" />
            <line x1={120} y1={115} x2={90} y2={165} stroke="#374151" strokeWidth="1.5" />
            <line x1={90}  y1={185} x2={90} y2={225} stroke="#374151" strokeWidth="1.5" />

            {/* App */}
            <TreeNode x={120} y={20} label="App" active={bubbleStep >= 5 && BUBBLE_STEPS[bubbleStep]?.id === "app"} />
            {/* Nav */}
            <TreeNode x={60}  y={90} label="Nav" />
            {/* Main */}
            <TreeNode x={120} y={90} label="Main" active={bubbleStep >= 4 && BUBBLE_STEPS[bubbleStep]?.id === "main"} />
            {/* Footer */}
            <TreeNode x={180} y={90} label="Footer" />
            {/* Card */}
            <TreeNode x={90}  y={160} label="Card" active={bubbleStep >= 3 && BUBBLE_STEPS[bubbleStep]?.id === "card"} />

            {/* Portal node — inside Card in React tree */}
            {modalOpen && (
              <motion.g initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: "90px 230px" }}>
                {/* Dashed border = portal */}
                <rect x={62} y={215} width={56} height={30} rx={6}
                  fill="#1A0533"
                  stroke="#A855F7"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                <text x={90} y={227} textAnchor="middle" fill="#C084FC" fontSize="8" fontWeight="600" fontFamily="Inter, sans-serif">
                  Portal
                </text>
                <text x={90} y={238} textAnchor="middle" fill="#A855F7" fontSize="7" fontFamily="Inter, sans-serif">
                  (Modal)
                </text>
              </motion.g>
            )}

            {/* Portal label */}
            {modalOpen && (
              <text x={90} y={262} textAnchor="middle" fill="#A855F7" fontSize="8" fontFamily="Inter, sans-serif">
                Child of Card in React tree
              </text>
            )}
          </svg>
        </Panel>

        {/* DOM Tree */}
        <Panel title="Actual DOM Tree">
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
            {/* html → body */}
            <line x1={120} y1={40} x2={120} y2={80} stroke="#374151" strokeWidth="1.5" />
            {/* body → #root and #modal-root */}
            <line x1={120} y1={100} x2={70}  y2={150} stroke="#374151" strokeWidth="1.5" />
            <line x1={120} y1={100} x2={180} y2={150} stroke="#374151" strokeWidth="1.5" />
            {/* #root → App > Main > Card */}
            <line x1={70}  y1={170} x2={70}  y2={200} stroke="#374151" strokeWidth="1.5" />

            {/* html */}
            <TreeNode x={120} y={15} label="html" color="#6B7280" />
            {/* body */}
            <TreeNode x={120} y={80} label="body" color="#6B7280" />
            {/* #root */}
            <TreeNode x={70} y={145} label="#root" color="#3B82F6" size={50} />
            {/* #modal-root */}
            <TreeNode
              x={180} y={145}
              label="#modal-root"
              color={modalOpen ? "#A855F7" : "#4B5563"}
              size={68}
              active={modalOpen}
            />

            {/* App>Main>Card */}
            <TreeNode x={70} y={200} label="App>Main>Card" color="#3B82F6" size={80} />

            {/* Modal appears in #modal-root */}
            {modalOpen && (
              <motion.g initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <line x1={180} y1={170} x2={180} y2={210} stroke="#A855F7" strokeWidth="1.5" strokeDasharray="3 2" />
                <rect x={148} y={210} width={64} height={30} rx={6}
                  fill="#1A0533"
                  stroke="#A855F7"
                  strokeWidth="1.5"
                />
                <text x={180} y={222} textAnchor="middle" fill="#C084FC" fontSize="8" fontWeight="600" fontFamily="Inter, sans-serif">
                  Modal
                </text>
                <text x={180} y={233} textAnchor="middle" fill="#A855F7" fontSize="7" fontFamily="Inter, sans-serif">
                  div.modal
                </text>
              </motion.g>
            )}

            {/* Portal connection line */}
            {modalOpen && (
              <text x={120} y={260} textAnchor="middle" fill="#A855F7" fontSize="8" fontFamily="Inter, sans-serif">
                Modal lives at body level in DOM!
              </text>
            )}
          </svg>

          {/* Animated portal connector line between panels */}
          {modalOpen && (
            <div className="mt-2 flex items-center gap-2 text-xs text-purple-400">
              <motion.div
                className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6 }}
              />
              <span className="font-mono whitespace-nowrap">createPortal()</span>
              <motion.div
                className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6 }}
              />
            </div>
          )}
        </Panel>
      </div>

      {/* Event bubbling section */}
      <AnimatePresence>
        {mode === "bubbling" && modalOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Panel title="Event Bubbling Demo">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-text-secondary mb-3">
                    Click the button inside the Modal. Although Modal is in <code className="text-accent">#modal-root</code> in the DOM,
                    events bubble through the <span className="text-purple-400">React tree</span> — all the way up to Card → Main → App.
                  </p>
                  <Button size="sm" onClick={triggerBubble} disabled={isAnimating}>
                    Click inside Modal
                  </Button>

                  <div className="mt-4 space-y-1">
                    {BUBBLE_STEPS.map((step, i) => (
                      <motion.div
                        key={step.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono ${
                          bubbleStep >= i ? "opacity-100" : "opacity-20"
                        }`}
                        animate={bubbleStep === i ? { backgroundColor: ["#1A0533", "#2D1B69", "#1A0533"] } : {}}
                        transition={{ duration: 0.4, repeat: 2 }}
                        style={{ background: bubbleStep >= i ? "rgba(168,85,247,0.1)" : "transparent" }}
                      >
                        <span className={step.tree === "react" ? "text-accent" : "text-blue-400"}>
                          {step.tree === "react" ? "⚛" : "🌐"}
                        </span>
                        <span className="text-text-primary">{step.label}</span>
                        {bubbleStep === i && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="ml-auto text-accent"
                          >
                            ← event here
                          </motion.span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-text-secondary mb-2">Event log:</div>
                  <div className="bg-[#0D0D0D] rounded-lg p-3 min-h-[120px] font-mono text-xs space-y-1">
                    <AnimatePresence>
                      {eventLog.map((log, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-green-400"
                        >
                          &gt; {log}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {eventLog.length === 0 && (
                      <span className="text-text-secondary italic">waiting...</span>
                    )}
                  </div>
                </div>
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Key Insight */}
      <Panel title="Key Insight">
        <div className="grid grid-cols-2 gap-4 text-sm text-text-secondary">
          <div className="flex gap-3">
            <span className="text-accent text-lg">⚛</span>
            <div>
              <p className="text-text-primary font-medium mb-1">React Tree</p>
              <p>Modal is a child of Card. Events bubble through React hierarchy normally. Context and ref forwarding work as expected.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-400 text-lg">🌐</span>
            <div>
              <p className="text-text-primary font-medium mb-1">DOM Tree</p>
              <p>Modal renders into <code className="text-accent">#modal-root</code> — outside <code className="text-blue-400">#root</code>. Escapes overflow:hidden, z-index stacking, and CSS containment.</p>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function TreeNode({
  x, y, label, color = "#FAFAFA", size = 56, active = false
}: {
  x: number; y: number; label: string; color?: string; size?: number; active?: boolean;
}) {
  return (
    <motion.g animate={active ? { scale: [1, 1.08, 1] } : { scale: 1 }} style={{ transformOrigin: `${x}px ${y + 16}px` }} transition={{ duration: 0.3 }}>
      <rect
        x={x - size / 2}
        y={y}
        width={size}
        height={32}
        rx={7}
        fill={active ? color + "22" : "#111827"}
        stroke={active ? color : "#374151"}
        strokeWidth={active ? 2 : 1.5}
      />
      <text
        x={x}
        y={y + 20}
        textAnchor="middle"
        fill={active ? color : "#FAFAFA"}
        fontSize={label.length > 8 ? "8" : "10"}
        fontWeight="500"
        fontFamily="Inter, sans-serif"
      >
        {label}
      </text>
    </motion.g>
  );
}
