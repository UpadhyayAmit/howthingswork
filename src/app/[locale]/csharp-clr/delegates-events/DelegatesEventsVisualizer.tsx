"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

interface Handler {
  id: string;
  name: string;
  description: string;
  color: string;
  glowColor: string;
}

const HANDLERS: Handler[] = [
  {
    id: "logger",
    name: "LoggingHandler",
    description: "Writes to structured log sink",
    color: "border-blue-500/50 bg-blue-500/10",
    glowColor: "shadow-blue-500/40",
  },
  {
    id: "email",
    name: "EmailNotificationHandler",
    description: "Sends email via SendGrid",
    color: "border-emerald-500/50 bg-emerald-500/10",
    glowColor: "shadow-emerald-500/40",
  },
  {
    id: "audit",
    name: "AuditTrailHandler",
    description: "Persists to audit_log table",
    color: "border-amber-500/50 bg-amber-500/10",
    glowColor: "shadow-amber-500/40",
  },
];

type HandlerState = "idle" | "invoking" | "done" | "error";

export default function DelegatesEventsVisualizer() {
  const [subscribed, setSubscribed] = useState<Set<string>>(new Set());
  const [firing, setFiring] = useState(false);
  const [activeHandler, setActiveHandler] = useState<string | null>(null);
  const [handlerStates, setHandlerStates] = useState<Record<string, HandlerState>>({});
  const [log, setLog] = useState<string[]>([]);
  const [firedCount, setFiredCount] = useState(0);
  const [showOp, setShowOp] = useState<{ text: string; type: "add" | "remove" } | null>(null);

  const toggleSubscription = useCallback(
    async (handler: Handler) => {
      if (firing) return;
      const isSubscribed = subscribed.has(handler.id);
      const op = isSubscribed ? "remove" : "add";
      const opText = isSubscribed
        ? `OnOrderPlaced -= ${handler.name};`
        : `OnOrderPlaced += ${handler.name};`;

      setShowOp({ text: opText, type: op });
      setTimeout(() => setShowOp(null), 1800);

      setSubscribed((prev) => {
        const next = new Set(prev);
        if (isSubscribed) next.delete(handler.id);
        else next.add(handler.id);
        return next;
      });

      setLog((prev) => [
        `[${new Date().toLocaleTimeString()}] ${isSubscribed ? "−" : "+"} ${handler.name} ${isSubscribed ? "unsubscribed" : "subscribed"}`,
        ...prev.slice(0, 9),
      ]);
    },
    [firing, subscribed]
  );

  const fireEvent = useCallback(async () => {
    if (firing || subscribed.size === 0) return;
    setFiring(true);
    setFiredCount((c) => c + 1);
    const subscribedList = HANDLERS.filter((h) => subscribed.has(h.id));

    setLog((prev) => [
      `[${new Date().toLocaleTimeString()}] 🔥 OrderPlacedEvent fired — ${subscribedList.length} handler(s) in invocation list`,
      ...prev.slice(0, 9),
    ]);

    for (const handler of subscribedList) {
      setActiveHandler(handler.id);
      setHandlerStates((s) => ({ ...s, [handler.id]: "invoking" }));
      await sleep(700);
      setHandlerStates((s) => ({ ...s, [handler.id]: "done" }));
      setLog((prev) => [
        `[${new Date().toLocaleTimeString()}]   ✓ ${handler.name}() returned`,
        ...prev.slice(0, 9),
      ]);
      await sleep(300);
    }

    setActiveHandler(null);
    await sleep(400);
    setHandlerStates({});
    setFiring(false);
  }, [firing, subscribed]);

  const reset = () => {
    setSubscribed(new Set());
    setFiring(false);
    setActiveHandler(null);
    setHandlerStates({});
    setLog([]);
    setFiredCount(0);
  };

  const invocationList = HANDLERS.filter((h) => subscribed.has(h.id));

  return (
    <div className="space-y-4">
      {/* Operation toast */}
      <AnimatePresence>
        {showOp && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`font-mono text-xs px-4 py-2 rounded-lg border w-fit ${
              showOp.type === "add"
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-red-500/40 bg-red-500/10 text-red-400"
            }`}
          >
            {showOp.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Publisher panel */}
        <Panel title="Publisher — OrderService" accentColor="#A855F7">
          <div className="space-y-3">
            <div className="font-mono text-xs text-text-secondary bg-[#0D0D0D] rounded-lg p-3 border border-border">
              <span className="text-purple-400">public event</span>{" "}
              <span className="text-blue-400">EventHandler</span>
              <span className="text-text-primary">&lt;</span>
              <span className="text-amber-400">OrderPlacedEventArgs</span>
              <span className="text-text-primary">&gt;</span>
              <br />
              <span className="text-text-primary ml-2">OnOrderPlaced</span>
              <span className="text-text-secondary">;</span>
            </div>

            <div className="space-y-1 text-xs text-text-secondary">
              <div className="flex justify-between">
                <span>Invocation list size</span>
                <span className="font-mono text-accent">{subscribed.size}</span>
              </div>
              <div className="flex justify-between">
                <span>Times fired</span>
                <span className="font-mono text-accent">{firedCount}</span>
              </div>
            </div>

            <Button
              onClick={fireEvent}
              disabled={firing || subscribed.size === 0}
              className="w-full"
            >
              {firing ? "Firing event…" : subscribed.size === 0 ? "No subscribers" : "Fire OrderPlacedEvent"}
            </Button>

            {subscribed.size === 0 && (
              <p className="text-[11px] text-amber-400/80 font-mono">
                ⚠ null invocation list — firing would throw NullReferenceException if not guarded with ?.Invoke()
              </p>
            )}
          </div>
        </Panel>

        {/* Subscribers panel */}
        <Panel title="Subscribers — click to wire/unwire" accentColor="#06B6D4">
          <div className="space-y-2">
            {HANDLERS.map((handler) => {
              const isSubscribed = subscribed.has(handler.id);
              const state = handlerStates[handler.id] ?? "idle";
              const isActive = activeHandler === handler.id;

              return (
                <motion.button
                  key={handler.id}
                  onClick={() => toggleSubscription(handler)}
                  disabled={firing}
                  animate={
                    isActive
                      ? { scale: [1, 1.03, 1], transition: { repeat: Infinity, duration: 0.5 } }
                      : { scale: 1 }
                  }
                  className={`w-full text-left rounded-lg border p-3 transition-all duration-200 ${
                    isActive
                      ? `${handler.color} shadow-lg ${handler.glowColor}`
                      : isSubscribed
                      ? `${handler.color} opacity-90`
                      : "border-border bg-elevated opacity-50 hover:opacity-70"
                  } ${firing ? "cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-text-primary font-semibold">
                      {handler.name}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        state === "invoking"
                          ? "border-accent/60 bg-accent/15 text-accent animate-pulse"
                          : state === "done"
                          ? "border-green-500/40 bg-green-500/10 text-green-400"
                          : isSubscribed
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : "border-border text-text-secondary"
                      }`}
                    >
                      {state === "invoking"
                        ? "invoking…"
                        : state === "done"
                        ? "returned"
                        : isSubscribed
                        ? "subscribed"
                        : "click to subscribe"}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-1">{handler.description}</p>
                </motion.button>
              );
            })}
          </div>
        </Panel>

        {/* Invocation chain panel */}
        <Panel title="Multicast Invocation Chain" accentColor="#10B981">
          <div className="space-y-2 min-h-[120px]">
            {invocationList.length === 0 ? (
              <p className="text-xs text-text-secondary font-mono italic">
                delegate == null
              </p>
            ) : (
              <>
                {invocationList.map((handler, i) => (
                  <div key={handler.id} className="flex flex-col items-center">
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      className={`w-full rounded-lg border p-2 font-mono text-[11px] transition-all duration-300 ${
                        activeHandler === handler.id
                          ? `${handler.color} shadow-lg ${handler.glowColor}`
                          : handlerStates[handler.id] === "done"
                          ? "border-green-500/30 bg-green-500/5 text-green-400"
                          : handler.color
                      }`}
                    >
                      [{i}] {handler.name}
                    </motion.div>
                    {i < invocationList.length - 1 && (
                      <motion.div
                        animate={
                          activeHandler === invocationList[i + 1]?.id
                            ? { opacity: [0.3, 1, 0.3] }
                            : {}
                        }
                        transition={{ repeat: Infinity, duration: 0.6 }}
                        className="w-px h-4 bg-accent/40"
                      />
                    )}
                  </div>
                ))}
                <p className="text-[10px] text-text-secondary font-mono mt-2">
                  Invoked sequentially — exception in [0] skips [1..n]
                </p>
              </>
            )}
          </div>
        </Panel>
      </div>

      {/* Event log */}
      <Panel title="Event Log">
        <div className="font-mono text-[11px] space-y-1 min-h-[80px] max-h-[120px] overflow-y-auto">
          <AnimatePresence initial={false}>
            {log.length === 0 ? (
              <p className="text-text-secondary italic">Subscribe handlers and fire the event…</p>
            ) : (
              log.map((entry, i) => (
                <motion.div
                  key={`${entry}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`${
                    entry.includes("fired")
                      ? "text-accent"
                      : entry.includes("✓")
                      ? "text-green-400"
                      : entry.includes("unsubscribed")
                      ? "text-red-400"
                      : "text-emerald-400"
                  }`}
                >
                  {entry}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </Panel>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={reset} size="sm">
          Reset
        </Button>
      </div>
    </div>
  );
}
