"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type EventPhase = "bubble" | "capture";
type AnimState = "idle" | "firing" | "bubbling" | "intercepted" | "dispatching" | "stopped";

interface DomNode {
  id: string;
  label: string;
  x: number;
  y: number;
  isRoot?: boolean;
  isButton?: boolean;
}

const DOM_NODES: DomNode[] = [
  { id: "root", label: "React Root", x: 200, y: 30, isRoot: true },
  { id: "app", label: "App div", x: 200, y: 110 },
  { id: "section", label: "Section", x: 200, y: 190 },
  { id: "button", label: "Button", x: 200, y: 270, isButton: true },
];

const EDGES = [
  { from: "root", to: "app" },
  { from: "app", to: "section" },
  { from: "section", to: "button" },
];

const BUBBLE_ORDER = ["button", "section", "app", "root"];
const CAPTURE_ORDER = ["root", "app", "section", "button"];

const SYNTHETIC_PROPS = [
  { key: "type", value: '"click"' },
  { key: "target", value: "button#btn-1" },
  { key: "currentTarget", value: "root#react-root" },
  { key: "nativeEvent", value: "MouseEvent {...}" },
  { key: "bubbles", value: "true" },
  { key: "preventDefault()", value: "ƒ()" },
  { key: "stopPropagation()", value: "ƒ()" },
];

function NodeBox({
  node,
  active,
  stopped,
  intercepted,
  phase,
}: {
  node: DomNode;
  active: boolean;
  stopped: boolean;
  intercepted: boolean;
  phase: EventPhase;
}) {
  const isRoot = node.isRoot;
  const activeColor = "#A855F7";
  const stopColor = "#EF4444";
  const rootActiveColor = "#F59E0B";

  const borderColor = intercepted && isRoot
    ? rootActiveColor
    : active && stopped
    ? stopColor
    : active
    ? activeColor
    : isRoot
    ? "#3B82F680"
    : "#4B5563";

  const bgColor = intercepted && isRoot
    ? "#F59E0B20"
    : active && stopped
    ? "#EF444420"
    : active
    ? "#A855F720"
    : isRoot
    ? "#3B82F610"
    : "#111827";

  return (
    <motion.div
      className="rounded-xl border-2 px-4 py-2 text-xs font-mono text-center relative"
      style={{ minWidth: 140 }}
      animate={{
        borderColor,
        backgroundColor: bgColor,
        scale: active ? 1.06 : 1,
        boxShadow: active
          ? `0 0 16px ${active && stopped ? stopColor : activeColor}60`
          : intercepted && isRoot
          ? `0 0 20px ${rootActiveColor}60`
          : "none",
      }}
      transition={{ duration: 0.25 }}
    >
      {isRoot && (
        <motion.span
          className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 rounded font-bold"
          style={{
            backgroundColor: "#3B82F6",
            color: "#fff",
          }}
          animate={{
            boxShadow: intercepted ? "0 0 12px #3B82F6" : "none",
          }}
        >
          Listener
        </motion.span>
      )}
      <span
        style={{
          color: intercepted && isRoot
            ? "#F59E0B"
            : active && stopped
            ? "#F87171"
            : active
            ? "#C084FC"
            : isRoot
            ? "#60A5FA"
            : "#9CA3AF",
        }}
      >
        {node.label}
      </span>
      {active && stopped && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 text-[9px] text-red-400 font-bold"
        >
          stopPropagation()
        </motion.div>
      )}
    </motion.div>
  );
}

export default function EventSystemVisualizer() {
  const [eventPhase, setEventPhase] = useState<EventPhase>("bubble");
  const [animState, setAnimState] = useState<AnimState>("idle");
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [visitedNodes, setVisitedNodes] = useState<string[]>([]);
  const [showSynthetic, setShowSynthetic] = useState(false);
  const [stopAtSection, setStopAtSection] = useState(false);
  const [running, setRunning] = useState(false);
  const [dispatchLog, setDispatchLog] = useState<string[]>([]);

  function reset() {
    setAnimState("idle");
    setActiveNode(null);
    setVisitedNodes([]);
    setShowSynthetic(false);
    setRunning(false);
    setDispatchLog([]);
  }

  async function fireEvent() {
    if (running) return;
    setRunning(true);
    setVisitedNodes([]);
    setShowSynthetic(false);
    setDispatchLog([]);

    const order = eventPhase === "bubble" ? BUBBLE_ORDER : CAPTURE_ORDER;

    setAnimState("firing");
    setActiveNode("button");
    setDispatchLog(["click event fired on <Button>"]);
    await sleep(700);

    setAnimState("bubbling");

    const visited: string[] = [];
    for (const nodeId of order) {
      setActiveNode(nodeId);
      visited.push(nodeId);
      setVisitedNodes([...visited]);
      setDispatchLog((prev) => [...prev, `→ ${nodeId} (${eventPhase} phase)`]);
      await sleep(650);

      // Stop propagation scenario
      if (stopAtSection && nodeId === "section" && eventPhase === "bubble") {
        setAnimState("stopped");
        setDispatchLog((prev) => [
          ...prev,
          "",
          "stopPropagation() called at Section",
          "Event will not reach parent nodes.",
        ]);
        setRunning(false);
        return;
      }

      // React intercepts at root
      if (nodeId === "root") {
        setAnimState("intercepted");
        setDispatchLog((prev) => [...prev, "", "React intercepts at root", "Wrapping in SyntheticEvent..."]);
        await sleep(600);
        setShowSynthetic(true);
        setAnimState("dispatching");
        setDispatchLog((prev) => [...prev, "Dispatching via fiber tree handlers..."]);
        await sleep(800);
        break;
      }
    }

    setActiveNode(null);
    setAnimState("idle");
    setRunning(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <Button onClick={fireEvent} disabled={running}>
          Fire Click Event
        </Button>
        <Button variant="secondary" onClick={reset} disabled={running}>
          Reset
        </Button>

        {/* Phase toggle */}
        <div className="flex rounded-lg overflow-hidden border border-border text-xs font-mono">
          {(["bubble", "capture"] as EventPhase[]).map((p) => (
            <button
              key={p}
              onClick={() => { reset(); setEventPhase(p); }}
              className="px-3 py-2 capitalize transition-all"
              style={{
                backgroundColor: eventPhase === p ? "#A855F7" : "#111827",
                color: eventPhase === p ? "#fff" : "#9CA3AF",
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* stopPropagation toggle */}
        <button
          onClick={() => { reset(); setStopAtSection((v) => !v); }}
          className="flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-lg border transition-all"
          style={{
            borderColor: stopAtSection ? "#EF4444" : "#374151",
            backgroundColor: stopAtSection ? "#EF444415" : "#111827",
            color: stopAtSection ? "#F87171" : "#9CA3AF",
          }}
        >
          <span
            className="w-3 h-3 rounded-sm border inline-block"
            style={{
              borderColor: stopAtSection ? "#EF4444" : "#4B5563",
              backgroundColor: stopAtSection ? "#EF4444" : "transparent",
            }}
          />
          stopPropagation at Section
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DOM Tree */}
        <Panel title="DOM Tree (Event Path)">
          <div className="flex flex-col items-center gap-0">
            {(eventPhase === "capture" ? [...DOM_NODES] : [...DOM_NODES].reverse()).map(
              (node, i, arr) => {
                const isStopped = stopAtSection && node.id === "section" && animState === "stopped";
                const isIntercepted = node.id === "root" && animState === "intercepted";
                return (
                  <div key={node.id} className="flex flex-col items-center w-full">
                    <NodeBox
                      node={node}
                      active={activeNode === node.id}
                      stopped={isStopped}
                      intercepted={isIntercepted}
                      phase={eventPhase}
                    />
                    {i < arr.length - 1 && (
                      <motion.div
                        className="w-0.5 h-6 my-0.5"
                        animate={{
                          backgroundColor:
                            visitedNodes.includes(node.id) &&
                            visitedNodes.includes(arr[i + 1].id)
                              ? "#A855F7"
                              : "#374151",
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </div>
                );
              }
            )}
          </div>

          {/* Phase direction hint */}
          <div className="mt-3 text-center text-xs font-mono text-text-secondary">
            {eventPhase === "bubble" ? "⬆️ Bubbles UP from target to root" : "⬇️ Captures DOWN from root to target"}
          </div>
        </Panel>

        <div className="flex flex-col gap-3">
          {/* SyntheticEvent */}
          <Panel title="SyntheticEvent">
            <AnimatePresence>
              {showSynthetic ? (
                <motion.div
                  key="synthetic"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-mono"
                >
                  <div className="text-accent font-bold mb-2">SyntheticEvent {"{"}</div>
                  <div className="pl-4 flex flex-col gap-1">
                    {SYNTHETIC_PROPS.map((prop, i) => (
                      <motion.div
                        key={prop.key}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="flex gap-2"
                      >
                        <span className="text-blue-400">{prop.key}:</span>
                        <span className="text-green-400">{prop.value}</span>
                      </motion.div>
                    ))}
                  </div>
                  <div className="text-accent font-bold mt-1">{"}"}</div>
                </motion.div>
              ) : (
                <span className="text-xs font-mono text-text-secondary">
                  Awaiting event interception at root...
                </span>
              )}
            </AnimatePresence>
          </Panel>

          {/* Dispatch log */}
          <Panel title="Event Log">
            <div className="flex flex-col gap-0.5 min-h-[100px]">
              <AnimatePresence>
                {dispatchLog.length === 0 ? (
                  <span key="empty" className="text-xs font-mono text-text-secondary">
                    Click "Fire Click Event" to start...
                  </span>
                ) : (
                  dispatchLog.map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25 }}
                      className="text-xs font-mono"
                      style={{
                        color: line.startsWith("stopPropagation") || line.startsWith("Event will")
                          ? "#F87171"
                          : line.startsWith("React") || line.startsWith("Wrapping") || line.startsWith("Dispatching")
                          ? "#FCD34D"
                          : line === ""
                          ? "transparent"
                          : "#9CA3AF",
                      }}
                    >
                      {line || "\u00A0"}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </Panel>
        </div>
      </div>

      {/* Stop propagation wall indicator */}
      <AnimatePresence>
        {animState === "stopped" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border px-4 py-3 text-xs font-mono flex items-center gap-2"
            style={{ borderColor: "#EF4444", backgroundColor: "#EF444410" }}
          >
            <span className="text-2xl">🚧</span>
            <div>
              <div className="text-red-400 font-bold">Propagation stopped at Section</div>
              <div className="text-text-secondary">
                event.stopPropagation() prevents the event from reaching App div and React Root.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
