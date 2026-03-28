"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Panel from "@/app/_ui/Panel";

type ViewMode = "user-code" | "state-machine";

interface MachineState {
  id: number;
  label: string;
  description: string;
  stateValue: number;
  codeHighlight: number[];
  fields: { name: string; value: string; changed?: boolean }[];
}

const USER_CODE_LINES = [
  { n: 1, text: "public async Task<Order> GetOrderAsync(int orderId) {" },
  { n: 2, text: "  // State machine starts here (state = -1)" },
  { n: 3, text: "  var user = await _userRepository" },
  { n: 4, text: "      .GetCurrentUserAsync();" },
  { n: 5, text: "  // Resumes at state 0 after awaiter completes" },
  { n: 6, text: "  var order = await _dbContext.Orders" },
  { n: 7, text: "      .FindAsync(orderId, user.Id);" },
  { n: 8, text: "  // Resumes at state 1 after awaiter completes" },
  { n: 9, text: "  return order ?? throw new KeyNotFoundException();" },
  { n: 10, text: "}" },
];

const STATES: MachineState[] = [
  {
    id: 0,
    label: "Initial Call",
    description: "MoveNext() called for the first time. State = -1. Starts the first awaitable (GetCurrentUserAsync). If not completed, saves awaiter, sets state = 0, schedules itself as continuation, returns.",
    stateValue: -1,
    codeHighlight: [1, 2, 3, 4],
    fields: [
      { name: "<>1__state", value: "-1", changed: true },
      { name: "orderId", value: "1001", changed: true },
      { name: "<user>5__1", value: "(unset)" },
      { name: "<order>5__2", value: "(unset)" },
      { name: "<>u__1 (awaiter)", value: "(not started)" },
    ],
  },
  {
    id: 1,
    label: "Awaiting User (State 0)",
    description: "Thread yielded. GetCurrentUserAsync is executing on an I/O thread. The original thread is free to handle other requests. When the user query completes, the awaiter calls MoveNext() again.",
    stateValue: 0,
    codeHighlight: [3, 4, 5],
    fields: [
      { name: "<>1__state", value: "0 — at await #1", changed: true },
      { name: "orderId", value: "1001" },
      { name: "<user>5__1", value: "(pending...)" },
      { name: "<order>5__2", value: "(unset)" },
      { name: "<>u__1 (awaiter)", value: "TaskAwaiter<User> {active}", changed: true },
    ],
  },
  {
    id: 2,
    label: "Resumed — User Resolved",
    description: "Awaiter called MoveNext() again. State is 0 so we jump via goto to state0_resume. GetResult() extracts the User. Now starts the second awaitable (FindAsync). Sets state = 1, yields again.",
    stateValue: 0,
    codeHighlight: [5, 6, 7],
    fields: [
      { name: "<>1__state", value: "1 — at await #2", changed: true },
      { name: "orderId", value: "1001" },
      { name: "<user>5__1", value: "User { Id=42, Name='Alice' }", changed: true },
      { name: "<order>5__2", value: "(pending...)" },
      { name: "<>u__2 (awaiter)", value: "TaskAwaiter<Order?> {active}", changed: true },
    ],
  },
  {
    id: 3,
    label: "Awaiting Order (State 1)",
    description: "Thread yielded again. DB query executing asynchronously. The I/O completion port will fire when the query result arrives, which wakes up the continuation registered with the awaiter.",
    stateValue: 1,
    codeHighlight: [6, 7, 8],
    fields: [
      { name: "<>1__state", value: "1" },
      { name: "orderId", value: "1001" },
      { name: "<user>5__1", value: "User { Id=42, Name='Alice' }" },
      { name: "<order>5__2", value: "(pending DB query...)", changed: true },
      { name: "<>u__2 (awaiter)", value: "TaskAwaiter<Order?> {active}" },
    ],
  },
  {
    id: 4,
    label: "Completed — State -2",
    description: "Final MoveNext() call. Jumps to state1_resume. Order resolved. Executes return statement. builder.SetResult(order) transitions the Task to the Completed state. State machine is done (-2).",
    stateValue: -2,
    codeHighlight: [8, 9, 10],
    fields: [
      { name: "<>1__state", value: "-2 (DONE)", changed: true },
      { name: "orderId", value: "1001" },
      { name: "<user>5__1", value: "User { Id=42, Name='Alice' }" },
      { name: "<order>5__2", value: "Order { Id=1001, Total=99.99 }", changed: true },
      { name: "Result (Task)", value: "Order { Id=1001, Total=99.99 }", changed: true },
    ],
  },
];

const STATE_COLORS: Record<number, string> = {
  [-1]: "text-text-secondary",
  0: "text-amber-400",
  1: "text-sky-400",
  [-2]: "text-emerald-400",
};

export default function AsyncStateMachineVisualizer() {
  const [view, setView] = useState<ViewMode>("user-code");
  const [step, setStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const currentState = STATES[step];

  const runAll = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setStep(0);
    for (let i = 1; i < STATES.length; i++) {
      await new Promise((r) => setTimeout(r, 900));
      setStep(i);
    }
    setIsRunning(false);
  };

  const reset = () => {
    setStep(0);
    setIsRunning(false);
  };

  const stateColor = STATE_COLORS[currentState.stateValue] || "text-text-secondary";

  return (
    <div className="space-y-4">
      {/* View toggle + controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-elevated border border-border">
          <button
            onClick={() => setView("user-code")}
            className={`px-3 py-1.5 rounded-md text-sm font-mono transition-all ${
              view === "user-code"
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Your Code
          </button>
          <button
            onClick={() => setView("state-machine")}
            className={`px-3 py-1.5 rounded-md text-sm font-mono transition-all ${
              view === "state-machine"
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            State Machine
          </button>
        </div>

        <button
          onClick={runAll}
          disabled={isRunning}
          className="px-4 py-2 rounded-lg bg-accent/15 border border-accent/40 text-accent text-sm font-medium hover:bg-accent/25 disabled:opacity-50 transition-all"
        >
          {isRunning ? "Running..." : "▶ Auto-step"}
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || isRunning}
            className="px-3 py-2 rounded-lg bg-elevated border border-border text-text-secondary text-sm hover:border-accent/30 disabled:opacity-40 transition-all"
          >
            ← Prev
          </button>
          <button
            onClick={() =>
              setStep((s) => Math.min(STATES.length - 1, s + 1))
            }
            disabled={step === STATES.length - 1 || isRunning}
            className="px-3 py-2 rounded-lg bg-elevated border border-border text-text-secondary text-sm hover:border-accent/30 disabled:opacity-40 transition-all"
          >
            Next →
          </button>
        </div>

        <button
          onClick={reset}
          className="px-3 py-2 rounded-lg border border-border text-text-secondary text-sm hover:border-accent/20 transition-all"
        >
          Reset
        </button>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-2">
        {STATES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => !isRunning && setStep(i)}
            className={`flex-1 h-1.5 rounded-full transition-all ${
              i < step
                ? "bg-accent"
                : i === step
                ? "bg-accent/70"
                : "bg-border"
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Code view */}
        <Panel
          title={view === "user-code" ? "Your async method" : "Compiler output (MoveNext)"}
          accentColor="#A855F7"
        >
          {view === "user-code" ? (
            <div className="font-mono text-xs space-y-0.5">
              {USER_CODE_LINES.map((line) => {
                const isHighlighted = currentState.codeHighlight.includes(line.n);
                return (
                  <motion.div
                    key={line.n}
                    animate={{
                      backgroundColor: isHighlighted
                        ? "rgba(168, 85, 247, 0.12)"
                        : "transparent",
                    }}
                    className="flex items-start gap-3 px-2 py-0.5 rounded"
                  >
                    <span className="text-text-secondary/40 w-4 text-right flex-shrink-0 select-none">
                      {line.n}
                    </span>
                    <span
                      className={
                        isHighlighted
                          ? "text-accent"
                          : "text-text-secondary/70"
                      }
                    >
                      {line.text}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {/* State machine class visualization */}
              <div className="border border-border rounded-lg p-3 bg-background/30">
                <p className="text-xs font-mono text-violet-400 mb-2">
                  sealed class GetOrderAsync_StateMachine
                </p>
                <div className="pl-3 border-l border-violet-500/20 space-y-1">
                  <p className="text-xs font-mono text-text-secondary/60">
                    int {"<>1__state"} ={" "}
                    <span className={`font-bold ${stateColor}`}>
                      {currentState.stateValue}
                    </span>
                  </p>
                  <p className="text-xs font-mono text-text-secondary/60">
                    AsyncTaskMethodBuilder&lt;Order&gt; {"<>t__builder"}
                  </p>
                  <p className="text-xs font-mono text-text-secondary/60">
                    User {"<user>5__1"}
                  </p>
                  <p className="text-xs font-mono text-text-secondary/60">
                    Order {"<order>5__2"}
                  </p>
                </div>
              </div>

              <div className="border border-border rounded-lg p-3 bg-background/30">
                <p className="text-xs font-mono text-sky-400 mb-2">
                  void MoveNext()
                </p>
                <div className="pl-3 border-l border-sky-500/20 space-y-1">
                  <p className="text-xs font-mono text-text-secondary/60">
                    int state = {"<>1__state"}; {"//"}{" "}
                    <span className={stateColor}>
                      {currentState.stateValue}
                    </span>
                  </p>
                  {currentState.stateValue === -1 && (
                    <p className="text-xs font-mono text-amber-300/80">
                      // initial call → start first awaitable
                    </p>
                  )}
                  {currentState.stateValue === 0 && (
                    <p className="text-xs font-mono text-amber-300/80">
                      // goto state0_resume → GetResult()
                    </p>
                  )}
                  {currentState.stateValue === 1 && (
                    <p className="text-xs font-mono text-sky-300/80">
                      // goto state1_resume → GetResult()
                    </p>
                  )}
                  {currentState.stateValue === -2 && (
                    <p className="text-xs font-mono text-emerald-300/80">
                      // builder.SetResult(order) → Task complete
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </Panel>

        {/* Right: State visualization */}
        <div className="space-y-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Panel
                title={`Step ${step + 1}/${STATES.length} — ${currentState.label}`}
                accentColor="#A855F7"
              >
                <div className="space-y-4">
                  {/* State indicator */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`px-3 py-1.5 rounded-lg border font-mono text-sm font-bold ${
                        currentState.stateValue === -2
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : currentState.stateValue === -1
                          ? "bg-text-secondary/10 border-border text-text-secondary"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      }`}
                    >
                      state = {currentState.stateValue}
                    </div>
                    {currentState.stateValue === -2 && (
                      <span className="text-xs text-emerald-400 font-mono">
                        Task completed ✓
                      </span>
                    )}
                    {(currentState.stateValue === 0 ||
                      currentState.stateValue === 1) && (
                      <span className="text-xs text-amber-400 font-mono animate-pulse">
                        awaiting...
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {currentState.description}
                  </p>

                  {/* Fields */}
                  <div>
                    <p className="text-xs font-mono text-text-secondary/60 uppercase tracking-widest mb-2">
                      State Machine Fields
                    </p>
                    <div className="space-y-1.5">
                      {currentState.fields.map((field) => (
                        <motion.div
                          key={field.name}
                          animate={{
                            backgroundColor: field.changed
                              ? "rgba(168, 85, 247, 0.08)"
                              : "transparent",
                          }}
                          className="flex items-start gap-2 rounded-md px-2 py-1.5"
                        >
                          <span className="text-xs font-mono text-violet-400/70 flex-shrink-0 min-w-[120px]">
                            {field.name}
                          </span>
                          <span
                            className={`text-xs font-mono ${
                              field.changed
                                ? "text-accent font-semibold"
                                : "text-text-secondary/60"
                            }`}
                          >
                            = {field.value}
                          </span>
                          {field.changed && (
                            <span className="text-[10px] text-accent/50 flex-shrink-0">
                              ← changed
                            </span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </Panel>
            </motion.div>
          </AnimatePresence>

          {/* State flow diagram */}
          <div className="flex items-center gap-1 p-3 rounded-xl border border-border bg-elevated/50 overflow-x-auto">
            {[-1, 0, 1, -2].map((sv, i) => {
              const isActive =
                currentState.stateValue === sv ||
                (sv === 0 &&
                  currentState.id === 2 &&
                  step === 2);
              const isPast =
                currentState.stateValue > sv && sv !== -2;
              const labels: Record<number, string> = {
                [-1]: "Start",
                0: "await #1",
                1: "await #2",
                [-2]: "Done",
              };
              return (
                <div key={sv} className="flex items-center gap-1">
                  <div
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-accent/15 border-accent/50 text-accent"
                        : isPast
                        ? "bg-elevated border-accent/20 text-accent/40"
                        : "bg-background border-border text-text-secondary/50"
                    }`}
                  >
                    {sv} · {labels[sv]}
                  </div>
                  {i < 3 && (
                    <span
                      className={`text-sm ${
                        isPast ? "text-accent/50" : "text-border"
                      }`}
                    >
                      →
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
