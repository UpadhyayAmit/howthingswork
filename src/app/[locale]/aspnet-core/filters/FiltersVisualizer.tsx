"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

const ACCENT = "#3b82f6";

interface FilterShell {
  id: string;
  name: string;
  interface: string;
  color: string;
  description: string;
  canShortCircuit: boolean;
  shortCircuitEffect: string;
  asyncInterface: string;
  executes: string;
}

const FILTER_SHELLS: FilterShell[] = [
  {
    id: "exception",
    name: "Exception Filter",
    interface: "IExceptionFilter",
    asyncInterface: "IAsyncExceptionFilter",
    color: "#ef4444",
    description: "Catches exceptions from action filters and action. Does NOT catch middleware exceptions.",
    canShortCircuit: false,
    shortCircuitEffect: "Set ExceptionHandled = true to prevent re-throw",
    executes: "OnException — when any inner filter or action throws",
  },
  {
    id: "auth",
    name: "Authorization Filter",
    interface: "IAuthorizationFilter",
    asyncInterface: "IAsyncAuthorizationFilter",
    color: "#f97316",
    description: "Runs before model binding. Short-circuit to reject unauthenticated/unauthorized requests early.",
    canShortCircuit: true,
    shortCircuitEffect: "Sets context.Result → skips model binding, resource, action, result filters",
    executes: "OnAuthorization — before model binding",
  },
  {
    id: "resource",
    name: "Resource Filter",
    interface: "IResourceFilter",
    asyncInterface: "IAsyncResourceFilter",
    color: "#eab308",
    description: "Wraps everything after authorization including model binding. Used for output caching.",
    canShortCircuit: true,
    shortCircuitEffect: "Sets context.Result → skips model binding + action filters + action",
    executes: "OnResourceExecuting / OnResourceExecuted — around model binding",
  },
  {
    id: "action",
    name: "Action Filter",
    interface: "IActionFilter",
    asyncInterface: "IAsyncActionFilter",
    color: "#22c55e",
    description: "Runs directly around the action method. Can modify arguments and result. Most commonly used filter.",
    canShortCircuit: true,
    shortCircuitEffect: "Sets context.Result → action is skipped, but result filters still run",
    executes: "OnActionExecuting / OnActionExecuted — around the controller action",
  },
  {
    id: "action-method",
    name: "Action Method",
    interface: "ControllerBase",
    asyncInterface: "async Task<IActionResult>",
    color: "#3b82f6",
    description: "Your actual controller action. Executes after all action filters' OnActionExecuting. Returns IActionResult.",
    canShortCircuit: false,
    shortCircuitEffect: "Returns IActionResult which becomes context.Result",
    executes: "The controller action body",
  },
  {
    id: "result",
    name: "Result Filter",
    interface: "IResultFilter",
    asyncInterface: "IAsyncResultFilter",
    color: "#a855f7",
    description: "Wraps result execution. Runs even when action short-circuited. Used for response headers.",
    canShortCircuit: false,
    shortCircuitEffect: "Cannot skip result execution from OnResultExecuting",
    executes: "OnResultExecuting / OnResultExecuted — around IActionResult.ExecuteResultAsync()",
  },
];

type FilterState = "idle" | "entering" | "active" | "exiting" | "shortcircuit" | "done" | "error";

interface ExecutionLog {
  phase: string;
  filter: string;
  color: string;
  direction: "in" | "out" | "error";
  detail: string;
}

export default function FiltersVisualizer() {
  const [filterStates, setFilterStates] = useState<Record<string, FilterState>>({});
  const [selectedFilter, setSelectedFilter] = useState<FilterShell | null>(null);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<ExecutionLog[]>([]);
  const [shortCircuitAt, setShortCircuitAt] = useState<string | null>(null);
  const [throwAt, setThrowAt] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const setFState = (id: string, state: FilterState) => {
    setFilterStates(prev => ({ ...prev, [id]: state }));
  };

  const addLog = (entry: ExecutionLog, currentLog: ExecutionLog[]) => {
    const newLog = [...currentLog, entry];
    setLog(newLog);
    return newLog;
  };

  const runPipeline = useCallback(async () => {
    setRunning(true);
    setFilterStates({});
    setDone(false);
    let currentLog: ExecutionLog[] = [];
    setLog([]);

    const orderedFilters = FILTER_SHELLS.slice(0, -1); // exclude action-method from outer shells
    let thrownAt: string | null = null;

    // Forward pass (entering each shell)
    for (const filter of orderedFilters) {
      if (filter.id === "exception") continue; // exception wraps everything, don't "enter" it linearly

      setFState(filter.id, "entering");
      await sleep(350);

      const phase = filter.id === "action" ? "OnActionExecuting" :
        filter.id === "resource" ? "OnResourceExecuting" :
        filter.id === "auth" ? "OnAuthorization" :
        filter.id === "result" ? "OnResultExecuting" : "entering";

      currentLog = addLog({
        phase,
        filter: filter.name,
        color: filter.color,
        direction: "in",
        detail: filter.id === "auth" ? "Checking credentials…" :
          filter.id === "resource" ? "Check cache…" :
          filter.id === "action" ? "Pre-action setup" :
          filter.id === "result" ? "Pre-result processing" : "",
      }, currentLog);

      setFState(filter.id, "active");

      if (shortCircuitAt === filter.id && filter.id !== "action-method") {
        // Short circuit this filter
        setFState(filter.id, "shortcircuit");
        currentLog = addLog({
          phase: "SHORT-CIRCUIT",
          filter: filter.name,
          color: "#eab308",
          direction: "out",
          detail: filter.shortCircuitEffect,
        }, currentLog);
        await sleep(500);
        // Jump to result filters if action filter, else skip to exit
        if (filter.id === "action") {
          // Still run result filter
          setFState("result", "entering");
          await sleep(300);
          currentLog = addLog({
            phase: "OnResultExecuting",
            filter: "Result Filter",
            color: "#a855f7",
            direction: "in",
            detail: "Runs even after short-circuit!",
          }, currentLog);
          setFState("result", "active");
          await sleep(400);
          setFState("result", "exiting");
          currentLog = addLog({
            phase: "OnResultExecuted",
            filter: "Result Filter",
            color: "#a855f7",
            direction: "out",
            detail: "Result filters always run",
          }, currentLog);
          await sleep(300);
        }
        break;
      }

      if (throwAt === filter.id) {
        thrownAt = filter.id;
        setFState(filter.id, "error");
        currentLog = addLog({
          phase: "EXCEPTION THROWN",
          filter: filter.name,
          color: "#ef4444",
          direction: "error",
          detail: `throw new InvalidOperationException("Simulated error in ${filter.name}")`,
        }, currentLog);
        await sleep(500);
        // Exception filter catches it
        setFState("exception", "active");
        currentLog = addLog({
          phase: "OnException",
          filter: "Exception Filter",
          color: "#ef4444",
          direction: "in",
          detail: "Caught! Setting ExceptionHandled = true → returns 400",
        }, currentLog);
        await sleep(600);
        setFState("exception", "exiting");
        break;
      }

      await sleep(200);
    }

    if (!thrownAt && shortCircuitAt === null) {
      // Execute action method
      setFState("action-method", "active");
      currentLog = addLog({
        phase: "ACTION EXECUTES",
        filter: "Action Method",
        color: "#3b82f6",
        direction: "in",
        detail: "return Ok(new { data = result }) — 200 OK",
      }, currentLog);
      await sleep(500);
      setFState("action-method", "exiting");
      currentLog = addLog({
        phase: "IActionResult returned",
        filter: "Action Method",
        color: "#3b82f6",
        direction: "out",
        detail: "context.Result = ObjectResult(200)",
      }, currentLog);
      await sleep(300);
    }

    // Reverse pass (exiting each shell)
    if (!thrownAt) {
      const reverseFilters = [...orderedFilters].reverse().filter(f => f.id !== "auth" || shortCircuitAt === null);

      for (const filter of reverseFilters) {
        if (filter.id === "exception") continue;
        if (shortCircuitAt === filter.id) break;
        if (shortCircuitAt !== null && filter.id !== "result") continue; // only result filter runs after action short-circuit

        setFState(filter.id, "exiting");
        await sleep(300);

        const phase = filter.id === "action" ? "OnActionExecuted" :
          filter.id === "resource" ? "OnResourceExecuted" :
          filter.id === "result" ? "OnResultExecuted" :
          filter.id === "auth" ? "— (no exit hook)" : "exiting";

        currentLog = addLog({
          phase,
          filter: filter.name,
          color: filter.color,
          direction: "out",
          detail: filter.id === "result" ? "Response headers written" :
            filter.id === "action" ? "Log duration, cleanup" :
            filter.id === "resource" ? "Store in cache" : "",
        }, currentLog);

        await sleep(200);
      }
    }

    // Reset states to done
    const doneStates: Record<string, FilterState> = {};
    FILTER_SHELLS.forEach(f => { doneStates[f.id] = "done"; });
    setFilterStates(doneStates);
    setDone(true);
    setRunning(false);
  }, [shortCircuitAt, throwAt]);

  const reset = useCallback(() => {
    setFilterStates({});
    setLog([]);
    setRunning(false);
    setDone(false);
  }, []);

  const getShellStyle = (filter: FilterShell) => {
    const state = filterStates[filter.id];
    const isSelected = selectedFilter?.id === filter.id;
    const isActive = state === "active" || state === "entering";
    const isError = state === "error";
    const isShortCircuit = state === "shortcircuit";

    return {
      borderColor: isError ? "#ef4444" : isShortCircuit ? "#eab308" : isActive ? filter.color : isSelected ? `${filter.color}60` : "#374151",
      backgroundColor: isError ? "#ef444415" : isShortCircuit ? "#eab30810" : isActive ? `${filter.color}12` : "transparent",
      boxShadow: isActive ? `0 0 20px ${filter.color}25, inset 0 0 30px ${filter.color}08` : isShortCircuit ? "0 0 16px #eab30830" : "none",
    };
  };

  const innerFilter = FILTER_SHELLS.find(f => f.id === "action-method")!;

  const renderShellLabel = (filter: FilterShell) => {
    const state = filterStates[filter.id];
    const isActive = state === "active" || state === "entering";
    return (
      <div className="flex items-center justify-between px-2 py-1.5">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: filter.color }}
            animate={isActive ? { scale: [1, 1.5, 1] } : { scale: 1 }}
            transition={{ repeat: isActive ? Infinity : 0, duration: 0.5 }}
          />
          <span className="text-xs font-mono font-semibold" style={{ color: filter.color }}>
            {filter.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {state === "shortcircuit" && <span className="text-[10px] font-mono text-yellow-400">⚡ short-circuit</span>}
          {state === "error" && <span className="text-[10px] font-mono text-red-400">threw</span>}
          {isActive && (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="text-[10px] font-mono"
              style={{ color: filter.color }}
            >●</motion.span>
          )}
        </div>
      </div>
    );
  };

  return (
    <Panel title="Filter Pipeline — Nested Shell Model" accentColor={ACCENT}>
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="primary" onClick={runPipeline} disabled={running}>
            {running ? "Executing…" : "▶ Execute Request"}
          </Button>
          <Button variant="secondary" onClick={reset} disabled={running}>
            Reset
          </Button>

          {/* Short-circuit selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-text-secondary">Short-circuit at:</span>
            <select
              value={shortCircuitAt ?? ""}
              onChange={e => { setShortCircuitAt(e.target.value || null); reset(); }}
              disabled={running}
              className="text-xs font-mono px-2 py-1 rounded border border-border bg-elevated text-text-primary"
            >
              <option value="">None</option>
              {FILTER_SHELLS.filter(f => f.canShortCircuit).map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Throw selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-text-secondary">Throw at:</span>
            <select
              value={throwAt ?? ""}
              onChange={e => { setThrowAt(e.target.value || null); reset(); }}
              disabled={running}
              className="text-xs font-mono px-2 py-1 rounded border border-border bg-elevated text-text-primary"
            >
              <option value="">None</option>
              {FILTER_SHELLS.filter(f => f.id !== "exception" && f.id !== "auth").map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Nested shell diagram — explicitly nested for correct order */}
          <div className="relative">
            <div className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-3">
              Filter Execution Order (concentric)
            </div>

            {/* Exception (outermost) → Auth → Resource → Action → Result → Controller Action (center) */}
            <div
              className="rounded-xl border-2 p-1 transition-all duration-500 cursor-pointer"
              style={getShellStyle(FILTER_SHELLS[0])}
              onClick={() => setSelectedFilter(selectedFilter?.id === "exception" ? null : FILTER_SHELLS[0])}
            >
              <div className="flex items-center gap-2 px-2 py-1 mb-0.5">
                <motion.div
                  className="w-2 h-2 rounded-full bg-red-500 shrink-0"
                  animate={filterStates["exception"] === "active" ? { scale: [1, 1.5, 1] } : { scale: 1 }}
                  transition={{ repeat: filterStates["exception"] === "active" ? Infinity : 0, duration: 0.5 }}
                />
                <span className="text-xs font-mono font-bold text-red-400">Exception Filter</span>
                <span className="text-[10px] font-mono text-red-500/50">catch-all wrapper</span>
                {filterStates["exception"] === "active" && (
                  <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} className="text-[10px] text-red-400 font-mono">catching…</motion.span>
                )}
              </div>

              {/* Authorization */}
              <div
                className="rounded-lg border transition-all duration-500 p-1 m-1 cursor-pointer"
                style={getShellStyle(FILTER_SHELLS[1])}
                onClick={e => { e.stopPropagation(); setSelectedFilter(selectedFilter?.id === "auth" ? null : FILTER_SHELLS[1]); }}
              >
                {renderShellLabel(FILTER_SHELLS[1])}

                {/* Resource */}
                <div
                  className="rounded-lg border transition-all duration-500 p-1 m-1 cursor-pointer"
                  style={getShellStyle(FILTER_SHELLS[2])}
                  onClick={e => { e.stopPropagation(); setSelectedFilter(selectedFilter?.id === "resource" ? null : FILTER_SHELLS[2]); }}
                >
                  {renderShellLabel(FILTER_SHELLS[2])}

                  {/* Action */}
                  <div
                    className="rounded-lg border transition-all duration-500 p-1 m-1 cursor-pointer"
                    style={getShellStyle(FILTER_SHELLS[3])}
                    onClick={e => { e.stopPropagation(); setSelectedFilter(selectedFilter?.id === "action" ? null : FILTER_SHELLS[3]); }}
                  >
                    {renderShellLabel(FILTER_SHELLS[3])}

                    {/* Result */}
                    <div
                      className="rounded-lg border transition-all duration-500 p-1 m-1 cursor-pointer"
                      style={getShellStyle(FILTER_SHELLS[4])}
                      onClick={e => { e.stopPropagation(); setSelectedFilter(selectedFilter?.id === "result" ? null : FILTER_SHELLS[4]); }}
                    >
                      {renderShellLabel(FILTER_SHELLS[4])}

                      {/* Controller Action — innermost */}
                      <div
                        className="rounded border m-1 p-2 transition-all duration-300 cursor-pointer"
                        style={{
                          borderColor: filterStates["action-method"] === "active" ? "#3b82f6" : "#374151",
                          backgroundColor: filterStates["action-method"] === "active" ? "#3b82f615" : "#0a0a0a",
                          boxShadow: filterStates["action-method"] === "active" ? "0 0 16px #3b82f625" : "none",
                        }}
                        onClick={e => { e.stopPropagation(); setSelectedFilter(selectedFilter?.id === "action-method" ? null : innerFilter); }}
                      >
                        <div className="flex items-center gap-2 justify-center py-1">
                          <motion.div
                            className="w-2 h-2 rounded-full bg-blue-500"
                            animate={filterStates["action-method"] === "active" ? { scale: [1, 1.6, 1] } : { scale: 1 }}
                            transition={{ repeat: filterStates["action-method"] === "active" ? Infinity : 0, duration: 0.4 }}
                          />
                          <span className="text-xs font-mono font-bold text-blue-400">Controller Action</span>
                          {filterStates["action-method"] === "active" && (
                            <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.5 }} className="text-[10px] text-blue-400 font-mono">executing…</motion.span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-center text-text-secondary pb-1">
                          return Ok(result)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter detail panel */}
            <AnimatePresence>
              {selectedFilter && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-3 rounded-lg border p-3 text-xs font-mono space-y-1.5"
                  style={{
                    borderColor: `${selectedFilter.color}40`,
                    backgroundColor: `${selectedFilter.color}08`,
                  }}
                >
                  <div className="font-bold" style={{ color: selectedFilter.color }}>{selectedFilter.name}</div>
                  <div className="text-text-secondary">{selectedFilter.description}</div>
                  <div><span className="text-text-secondary">Sync: </span><span className="text-text-primary">{selectedFilter.interface}</span></div>
                  <div><span className="text-text-secondary">Async: </span><span className="text-text-primary">{selectedFilter.asyncInterface}</span></div>
                  <div><span className="text-text-secondary">Executes: </span><span className="text-text-primary">{selectedFilter.executes}</span></div>
                  {selectedFilter.canShortCircuit && (
                    <div style={{ color: "#eab308" }}>⚡ {selectedFilter.shortCircuitEffect}</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Execution log */}
          <div>
            <div className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-3">
              Execution Log
            </div>
            <div
              className="rounded-lg border border-border bg-black/40 p-3 font-mono text-xs space-y-1 overflow-y-auto"
              style={{ minHeight: "280px", maxHeight: "460px" }}
            >
              {log.length === 0 ? (
                <span className="text-text-secondary/50 italic">
                  Press &quot;Execute Request&quot; to see filters run in order.
                  Click any filter shell to see its interface details.
                </span>
              ) : (
                log.map((entry, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: entry.direction === "in" ? -8 : 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-2 items-start"
                  >
                    <span
                      className="flex-shrink-0 font-bold"
                      style={{ color: entry.color }}
                    >
                      {entry.direction === "in" ? "→" : entry.direction === "error" ? "💥" : "←"}
                    </span>
                    <div>
                      <span className="font-bold" style={{ color: entry.color }}>
                        [{entry.filter}]
                      </span>
                      <span className="text-text-secondary"> {entry.phase}</span>
                      {entry.detail && (
                        <div className="text-text-secondary/60 text-[10px] mt-0.5 pl-2">{entry.detail}</div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
              {running && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 0.7 }}
                  className="text-blue-400"
                >
                  ▌
                </motion.span>
              )}
              {done && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-green-400 font-bold pt-2 border-t border-border/50"
                >
                  ✓ Request pipeline completed
                </motion.div>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-text-secondary font-mono">
          Tip: Try &quot;Short-circuit at: Action Filter&quot; — notice that Result Filter STILL runs.
          Try &quot;Throw at: Resource Filter&quot; — Exception Filter catches it.
          Click any shell to see its interface and capabilities.
        </p>
      </div>
    </Panel>
  );
}
