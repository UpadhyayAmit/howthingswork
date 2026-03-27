"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type WorkMode = "with" | "without";

interface WorkItem {
  id: number;
  label: string;
  priority: "urgent" | "transition";
  status: "queued" | "processing" | "done" | "interrupted";
}

const MOCK_RESULTS = [
  "useTransition hook",
  "startTransition API",
  "React concurrent mode",
  "Deferred updates",
  "Priority rendering",
  "Interruptible renders",
];

export default function TransitionsVisualizer() {
  const [mode, setMode] = useState<WorkMode>("with");
  const [searchValue, setSearchValue] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [workQueue, setWorkQueue] = useState<WorkItem[]>([]);
  const [renderLog, setRenderLog] = useState<string[]>([]);
  const [lagDemo, setLagDemo] = useState(false);
  const workIdRef = useRef(0);
  const transitionAbortRef = useRef<number>(0);

  const addLog = useCallback((msg: string) => {
    setRenderLog((prev) => [...prev.slice(-6), msg]);
  }, []);

  const handleSearchChange = useCallback(
    async (val: string) => {
      setSearchValue(val);
      workIdRef.current += 1;
      const myId = workIdRef.current;

      // Urgent update logged
      addLog(`[urgent] input → "${val}"`);

      if (mode === "without") {
        // Simulate blocking — no transition
        setIsPending(true);
        addLog(`[blocking] results render for "${val}"`);
        await sleep(500);
        if (workIdRef.current === myId) {
          setResults(
            MOCK_RESULTS.filter((r) =>
              r.toLowerCase().includes(val.toLowerCase())
            )
          );
          setIsPending(false);
          addLog(`[done] rendered results`);
        }
        return;
      }

      // With transitions: abort previous transition
      transitionAbortRef.current = myId;
      setIsPending(true);

      workIdRef.current += 1;
      const transId = workIdRef.current;

      // Add to work queue visualization
      setWorkQueue((prev) => [
        ...prev.filter((w) => w.priority !== "transition"),
        {
          id: transId,
          label: `results for "${val}"`,
          priority: "transition",
          status: "queued",
        },
      ]);

      addLog(`[transition] queued results render`);

      // Urgent gets through immediately
      await sleep(60);

      if (transitionAbortRef.current !== myId) {
        // Interrupted by newer keystroke
        setWorkQueue((prev) =>
          prev.map((w) =>
            w.id === transId ? { ...w, status: "interrupted" } : w
          )
        );
        addLog(`[interrupt] transition discarded`);
        return;
      }

      setWorkQueue((prev) =>
        prev.map((w) =>
          w.id === transId ? { ...w, status: "processing" } : w
        )
      );

      await sleep(400);

      if (transitionAbortRef.current !== myId) {
        setWorkQueue((prev) =>
          prev.map((w) =>
            w.id === transId ? { ...w, status: "interrupted" } : w
          )
        );
        addLog(`[interrupt] transition discarded`);
        return;
      }

      setResults(
        MOCK_RESULTS.filter((r) =>
          r.toLowerCase().includes(val.toLowerCase())
        )
      );
      setIsPending(false);
      setWorkQueue((prev) =>
        prev.map((w) =>
          w.id === transId ? { ...w, status: "done" } : w
        )
      );
      addLog(`[done] transition committed`);
    },
    [mode, addLog]
  );

  const handleReset = useCallback(() => {
    setSearchValue("");
    setResults([]);
    setWorkQueue([]);
    setRenderLog([]);
    setIsPending(false);
    workIdRef.current = 0;
    transitionAbortRef.current = 0;
  }, []);

  const statusColor: Record<WorkItem["status"], string> = {
    queued: "#9CA3AF",
    processing: "#f59e0b",
    done: "#22c55e",
    interrupted: "#ef4444",
  };

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode("with"); handleReset(); }}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            mode === "with"
              ? "border-accent bg-accent/10 text-accent"
              : "border-border text-text-secondary hover:border-accent/40"
          }`}
        >
          With useTransition
        </button>
        <button
          onClick={() => { setMode("without"); handleReset(); }}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            mode === "without"
              ? "border-red-500 bg-red-500/10 text-red-400"
              : "border-border text-text-secondary hover:border-red-500/40"
          }`}
        >
          Without (blocking)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* LEFT: Urgent update */}
        <Panel title="Urgent Update">
          <div className="space-y-3">
            <div className="text-xs text-red-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              High Priority — never deferred
            </div>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Type to search..."
              className="w-full bg-[#0d1117] border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60 transition-colors"
            />
            <div className="font-mono text-xs rounded border border-border bg-[#0d1117] p-2">
              <div className="text-text-secondary">// Always processes immediately</div>
              <div className="text-red-400 mt-1">
                setSearchValue(e.target.value)
              </div>
            </div>
            <div className="text-xs text-text-secondary">
              Current value:{" "}
              <span className="text-text-primary font-mono">
                &quot;{searchValue}&quot;
              </span>
            </div>
          </div>
        </Panel>

        {/* MIDDLE: Work queue */}
        <Panel title="Work Queue">
          <div className="space-y-3">
            <div className="space-y-1">
              {/* Priority legend */}
              <div className="flex items-center gap-2 text-xs text-text-secondary mb-2">
                <span className="w-2 h-2 rounded bg-red-500" /> urgent
                <span className="w-2 h-2 rounded bg-blue-500 ml-2" /> transition
              </div>

              {/* Input item is always urgent */}
              <AnimatePresence>
                {searchValue && (
                  <motion.div
                    key="urgent"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1.5"
                  >
                    <span className="text-[10px] font-mono text-red-400 uppercase font-bold">urgent</span>
                    <span className="text-xs text-text-primary font-mono flex-1 truncate">
                      input update
                    </span>
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                      className="text-[10px] text-red-400"
                    >
                      processing
                    </motion.span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {workQueue.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="flex items-center gap-2 rounded border px-2 py-1.5"
                    style={{
                      borderColor: `${statusColor[item.status]}40`,
                      backgroundColor: `${statusColor[item.status]}10`,
                    }}
                  >
                    <span
                      className="text-[10px] font-mono uppercase font-bold"
                      style={{ color: "#3b82f6" }}
                    >
                      transition
                    </span>
                    <span className="text-xs font-mono flex-1 truncate text-text-secondary">
                      {item.label}
                    </span>
                    <span
                      className="text-[10px]"
                      style={{ color: statusColor[item.status] }}
                    >
                      {item.status}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>

              {workQueue.length === 0 && !searchValue && (
                <div className="text-xs text-text-secondary italic text-center py-4">
                  Type in the search box
                </div>
              )}
            </div>
          </div>
        </Panel>

        {/* RIGHT: Transition results */}
        <Panel title="Transition Update (Results)">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              <span
                className={mode === "with" ? "text-blue-400" : "text-red-400"}
                style={{ fontWeight: 500 }}
              >
                {mode === "with" ? "startTransition wrapped" : "blocking render"}
              </span>
            </div>

            {/* isPending indicator */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">isPending:</span>
              <motion.span
                animate={isPending ? { opacity: 1 } : { opacity: 0.4 }}
                className={`text-xs font-mono font-bold ${
                  isPending ? "text-yellow-400" : "text-text-secondary"
                }`}
              >
                {isPending ? "true" : "false"}
              </motion.span>
              <AnimatePresence>
                {isPending && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full"
                    style={{ animation: "spin 0.6s linear infinite" }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                      className="w-full h-full border-2 border-yellow-400 border-t-transparent rounded-full"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="min-h-[80px] space-y-1">
              <AnimatePresence>
                {isPending && (
                  <motion.div
                    key="pending"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-yellow-400 italic"
                  >
                    Rendering deferred results...
                  </motion.div>
                )}
                {!isPending &&
                  results.map((r, i) => (
                    <motion.div
                      key={r}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="text-xs text-text-primary bg-[#0d1117] rounded border border-border px-2 py-1"
                    >
                      {r}
                    </motion.div>
                  ))}
                {!isPending && results.length === 0 && searchValue && (
                  <motion.div
                    key="noresults"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-text-secondary italic"
                  >
                    No results
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Panel>
      </div>

      {/* Render log + Priority timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Render Log">
          <div className="space-y-1 font-mono text-xs min-h-[80px]">
            <AnimatePresence>
              {renderLog.map((log, i) => (
                <motion.div
                  key={`${i}-${log}`}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`${
                    log.includes("urgent")
                      ? "text-red-400"
                      : log.includes("interrupt")
                      ? "text-orange-400"
                      : log.includes("done")
                      ? "text-green-400"
                      : log.includes("transition")
                      ? "text-blue-400"
                      : "text-text-secondary"
                  }`}
                >
                  {log}
                </motion.div>
              ))}
            </AnimatePresence>
            {renderLog.length === 0 && (
              <span className="text-text-secondary italic">No activity yet</span>
            )}
          </div>
        </Panel>

        <Panel title="Priority Visualization">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-20 text-xs text-right text-red-400 font-medium">urgent</div>
              <div className="flex-1 h-6 bg-red-500/20 border border-red-500/40 rounded flex items-center px-2">
                <div className="text-xs text-red-300">always first — synchronous</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-20 text-xs text-right text-blue-400 font-medium">transition</div>
              <div className="flex-1 h-6 bg-blue-500/20 border border-blue-500/40 rounded flex items-center px-2 relative overflow-hidden">
                <div className="text-xs text-blue-300">deferred — can interrupt</div>
                <AnimatePresence>
                  {isPending && (
                    <motion.div
                      key="scan"
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent"
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="text-xs text-text-secondary pt-1 border-t border-border">
              {mode === "with" ? (
                <span className="text-green-400">
                  Input stays responsive — transitions yield to urgent work
                </span>
              ) : (
                <span className="text-red-400">
                  Blocking: urgent + transition compete equally — UI can freeze
                </span>
              )}
            </div>
          </div>
        </Panel>
      </div>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={handleReset} size="sm">
          Reset
        </Button>
      </div>
    </div>
  );
}
