"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type AppState =
  | "idle"
  | "sending"
  | "queued"
  | "peek-locking"
  | "processing"
  | "completed"
  | "deadletter"
  | "retry";

interface Message {
  id: string;
  body: string;
  deliveryCount: number;
  state: "active" | "locked" | "completed" | "deadletter";
}

const INITIAL_MESSAGE: Message = {
  id: crypto.randomUUID ? crypto.randomUUID() : "ord-1234",
  body: '{ orderId: "ord-1234", amount: 99.99 }',
  deliveryCount: 0,
  state: "active",
};

export default function ServiceBusVisualizer() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [message, setMessage] = useState<Message>(INITIAL_MESSAGE);
  const [mode, setMode] = useState<"success" | "fail">("success");
  const [logs, setLogs] = useState<{ text: string; type: "info" | "error" | "success" | "warn" }[]>([]);

  const addLog = (text: string, type: "info" | "error" | "success" | "warn" = "info") =>
    setLogs((p) => [...p, { text, type }]);

  const reset = () => {
    setAppState("idle");
    setMessage({ ...INITIAL_MESSAGE, id: Math.random().toString(36).slice(2) });
    setLogs([]);
  };

  const run = useCallback(async () => {
    if (appState !== "idle") return;
    setLogs([]);

    // ── SEND ──
    setAppState("sending");
    addLog("sender.sendMessages({ body, sessionId: 'customer-42' })", "info");
    await sleep(700);
    addLog("✓ Message accepted by Service Bus broker", "success");
    setMessage((m) => ({ ...m, state: "active" }));

    // ── QUEUED ──
    setAppState("queued");
    addLog("Message enqueued — waiting for receiver", "info");
    await sleep(800);

    // ── PEEK-LOCK ──
    setAppState("peek-locking");
    addLog("receiver.subscribe() — receiveMode: peekLock", "info");
    await sleep(600);
    setMessage((m) => ({ ...m, state: "locked", deliveryCount: m.deliveryCount + 1 }));
    addLog("🔒 Message locked (30s default lock duration)", "warn");
    await sleep(600);

    // ── PROCESS ──
    setAppState("processing");
    addLog("processMessage() invoked — processing order...", "info");
    await sleep(900);

    if (mode === "success") {
      addLog("✓ Order processed — calling completeMessage()", "success");
      await sleep(600);
      setMessage((m) => ({ ...m, state: "completed" }));
      setAppState("completed");
      addLog("✓ Message removed from queue permanently", "success");
    } else {
      addLog("✗ Processing failed — calling abandonMessage()", "error");
      await sleep(500);
      setMessage((m) => ({ ...m, state: "active", deliveryCount: m.deliveryCount + 1 }));
      if (message.deliveryCount + 1 >= 3) {
        setAppState("deadletter");
        setMessage((m) => ({ ...m, state: "deadletter" }));
        addLog("💀 Max delivery count (3) reached — moved to Dead-letter queue", "error");
        addLog("  Inspect via: $deadLetterQueue = '$web/$deadLetterQueue'", "warn");
      } else {
        setAppState("retry");
        addLog(`↩ Message requeued (deliveryCount: ${message.deliveryCount + 1})`, "warn");
      }
    }
  }, [appState, mode, message.deliveryCount]);

  const stateColor: Record<Message["state"], string> = {
    active: "#3b82f6",
    locked: "#f59e0b",
    completed: "#10b981",
    deadletter: "#ef4444",
  };

  return (
    <Panel>
      <div className="flex flex-col gap-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setMode("success")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                mode === "success"
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                  : "border-white/10 text-white/40 hover:text-white/70"
              }`}
            >
              Success path
            </button>
            <button
              onClick={() => setMode("fail")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                mode === "fail"
                  ? "bg-red-500/20 border-red-500/50 text-red-300"
                  : "border-white/10 text-white/40 hover:text-white/70"
              }`}
            >
              Failure / DLQ path
            </button>
          </div>
          <div className="flex gap-2 ml-auto">
            <Button
              onClick={run}
              disabled={appState !== "idle"}
              variant="primary"
            >
              {appState === "idle" ? "Run simulation" : "Simulating…"}
            </Button>
            <Button onClick={reset} variant="secondary">Reset</Button>
          </div>
        </div>

        {/* Flow diagram */}
        <div className="flex items-center gap-2 overflow-x-auto py-2">
          {(["sending", "queued", "peek-locking", "processing", appState === "deadletter" ? "deadletter" : "completed"] as const).map(
            (step, i) => {
              const label: Record<string, string> = {
                sending: "Send",
                queued: "Queue",
                "peek-locking": "Peek-Lock",
                processing: "Process",
                completed: "Complete",
                deadletter: "Dead-letter",
              };
              const isActive = appState === step;
              const isDone =
                ["completed", "deadletter"].includes(appState) ||
                (appState !== "idle" &&
                  ["sending", "queued", "peek-locking"].indexOf(appState) >
                    ["sending", "queued", "peek-locking"].indexOf(step));
              return (
                <div key={step} className="flex items-center gap-2 shrink-0">
                  <motion.div
                    animate={{
                      scale: isActive ? [1, 1.06, 1] : 1,
                      borderColor: isActive
                        ? "rgba(139,92,246,0.8)"
                        : isDone
                        ? "rgba(16,185,129,0.6)"
                        : "rgba(255,255,255,0.1)",
                    }}
                    transition={{ duration: 0.8, repeat: isActive ? Infinity : 0 }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                    style={{
                      background: isActive
                        ? "rgba(139,92,246,0.15)"
                        : isDone
                        ? "rgba(16,185,129,0.1)"
                        : "rgba(255,255,255,0.04)",
                      color: isActive ? "#c4b5fd" : isDone ? "#6ee7b7" : "rgba(255,255,255,0.35)",
                    }}
                  >
                    {label[step]}
                  </motion.div>
                  {i < 4 && <div className="text-white/20 text-sm">→</div>}
                </div>
              );
            }
          )}
        </div>

        {/* Message card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={message.state}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4 border text-xs font-mono"
            style={{
              background: `${stateColor[message.state]}10`,
              borderColor: `${stateColor[message.state]}40`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: `${stateColor[message.state]}25`,
                  color: stateColor[message.state],
                }}
              >
                {message.state}
              </span>
              <span className="text-white/40">deliveryCount: {message.deliveryCount}</span>
            </div>
            <div className="text-white/70">{message.body}</div>
          </motion.div>
        </AnimatePresence>

        {/* Logs */}
        {logs.length > 0 && (
          <div className="bg-black/30 rounded-xl p-4 font-mono text-xs space-y-1 max-h-52 overflow-y-auto">
            {logs.map((l, i) => (
              <div
                key={i}
                className={
                  l.type === "error"
                    ? "text-red-400"
                    : l.type === "success"
                    ? "text-emerald-400"
                    : l.type === "warn"
                    ? "text-amber-400"
                    : "text-white/60"
                }
              >
                {l.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
