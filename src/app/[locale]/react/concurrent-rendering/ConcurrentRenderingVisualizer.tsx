"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

interface Task {
  id: string;
  label: string;
  lane: "sync" | "input" | "default" | "transition";
  color: string;
  width: number;
  startX: number;
  status: "waiting" | "running" | "paused" | "done";
}

const LANE_CONFIG = {
  sync:       { label: "SyncLane",             color: "#EF4444", priority: 0 },
  input:      { label: "InputContinuousLane",  color: "#F59E0B", priority: 1 },
  default:    { label: "DefaultLane",          color: "#3B82F6", priority: 2 },
  transition: { label: "TransitionLane",       color: "#A855F7", priority: 3 },
};

interface TimelineBlock {
  id: string;
  x: number;
  width: number;
  color: string;
  label: string;
  isYield?: boolean;
}

export default function ConcurrentRenderingVisualizer() {
  const [legacyProgress, setLegacyProgress] = useState(0);
  const [legacyRunning, setLegacyRunning] = useState(false);
  const [concurrentBlocks, setConcurrentBlocks] = useState<TimelineBlock[]>([]);
  const [concurrentRunning, setConcurrentRunning] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [interruptDemo, setInterruptDemo] = useState<{
    lowPauseX: number;
    highStartX: number;
    highEndX: number;
    resumeX: number;
    phase: "idle" | "low-running" | "interrupted" | "high-running" | "resumed" | "done";
  }>({ lowPauseX: 0, highStartX: 0, highEndX: 0, resumeX: 0, phase: "idle" });
  const [scheduler, setScheduler] = useState<string>("Idle");
  const isRunningRef = useRef(false);

  const runLegacy = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setLegacyRunning(true);
    setLegacyProgress(0);

    for (let p = 0; p <= 100; p += 2) {
      setLegacyProgress(p);
      await sleep(40); // slow, blocking
    }

    setLegacyRunning(false);
    isRunningRef.current = false;
  }, []);

  const runConcurrent = useCallback(async () => {
    if (concurrentRunning) return;
    setConcurrentRunning(true);
    setConcurrentBlocks([]);

    const blocks: TimelineBlock[] = [];
    let x = 0;
    const sliceW = 18;
    const yieldW = 6;

    for (let i = 0; i < 8; i++) {
      blocks.push({ id: `work-${i}`, x, width: sliceW, color: "#3B82F6", label: "5ms" });
      setConcurrentBlocks([...blocks]);
      await sleep(120);
      x += sliceW;

      blocks.push({ id: `yield-${i}`, x, width: yieldW, color: "#111827", label: "", isYield: true });
      setConcurrentBlocks([...blocks]);
      await sleep(60);
      x += yieldW;
    }

    setConcurrentRunning(false);
  }, [concurrentRunning]);

  const fireHighPriority = useCallback(async () => {
    if (interruptDemo.phase === "low-running") {
      setInterruptDemo(prev => ({ ...prev, phase: "interrupted" }));
      setScheduler("High-priority task arrived! Pausing low-priority work...");
      await sleep(300);
      setInterruptDemo(prev => ({
        ...prev,
        phase: "high-running",
        highStartX: prev.lowPauseX + 10,
        highEndX: prev.lowPauseX + 60,
      }));
      setScheduler("Running high-priority (SyncLane)...");
      await sleep(700);
      setInterruptDemo(prev => ({ ...prev, phase: "resumed", resumeX: prev.highEndX + 10 }));
      setScheduler("Resuming low-priority (TransitionLane)...");
      await sleep(500);
      setInterruptDemo(prev => ({ ...prev, phase: "done" }));
      setScheduler("All work complete.");
    }
  }, [interruptDemo.phase]);

  const startLowPriority = useCallback(async () => {
    if (interruptDemo.phase !== "idle" && interruptDemo.phase !== "done") return;
    setInterruptDemo({ lowPauseX: 80, highStartX: 0, highEndX: 0, resumeX: 0, phase: "low-running" });
    setScheduler("Running low-priority render (TransitionLane)...");
  }, [interruptDemo.phase]);

  const addTask = useCallback((lane: Task["lane"]) => {
    const cfg = LANE_CONFIG[lane];
    setTasks(prev => {
      const existingX = prev.filter(t => t.lane === lane).reduce((acc, t) => Math.max(acc, t.startX + t.width), 0);
      const newTask: Task = {
        id: `${lane}-${Date.now()}`,
        label: cfg.label.split("Lane")[0],
        lane,
        color: cfg.color,
        width: 60 + Math.random() * 30,
        startX: existingX,
        status: "waiting",
      };
      return [...prev, newTask];
    });
  }, []);

  const runScheduler = useCallback(async () => {
    setScheduler("Scheduler running — processing by priority...");
    const lanes: Task["lane"][] = ["sync", "input", "default", "transition"];
    for (const lane of lanes) {
      setTasks(prev => prev.map(t => t.lane === lane ? { ...t, status: "running" } : t));
      await sleep(500);
      setTasks(prev => prev.map(t => t.lane === lane ? { ...t, status: "done" } : t));
      await sleep(200);
    }
    setScheduler("All tasks complete.");
  }, []);

  const reset = useCallback(() => {
    setLegacyProgress(0);
    setLegacyRunning(false);
    setConcurrentBlocks([]);
    setConcurrentRunning(false);
    setTasks([]);
    setInterruptDemo({ lowPauseX: 0, highStartX: 0, highEndX: 0, resumeX: 0, phase: "idle" });
    setScheduler("Idle");
    isRunningRef.current = false;
  }, []);

  const TL_WIDTH = 340;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={reset}>Reset All</Button>
      </div>

      {/* Legacy vs Concurrent side by side */}
      <div className="grid grid-cols-2 gap-6">
        {/* Legacy */}
        <Panel title="Legacy (Blocking) Render">
          <div className="space-y-4">
            <p className="text-xs text-text-secondary">
              A heavy render blocks the main thread entirely. No user input can be processed until done.
            </p>
            <Button size="sm" onClick={runLegacy} disabled={legacyRunning}>
              {legacyRunning ? "Rendering... (UI Frozen!)" : "Start Heavy Render"}
            </Button>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-text-secondary">
                <span>Render progress</span>
                <span>{legacyProgress}%</span>
              </div>
              <div className="h-6 bg-[#0D0D0D] rounded-lg overflow-hidden border border-border relative">
                <motion.div
                  className="h-full bg-red-500 flex items-center justify-end pr-2"
                  animate={{ width: `${legacyProgress}%` }}
                  transition={{ duration: 0.04, ease: "linear" }}
                >
                  {legacyProgress > 20 && (
                    <span className="text-white text-xs font-mono">{legacyProgress}%</span>
                  )}
                </motion.div>
              </div>
              {legacyRunning && (
                <motion.p
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="text-xs text-red-400 font-mono"
                >
                  !! UI FROZEN — no interactions possible !!
                </motion.p>
              )}
            </div>

            {/* Time axis */}
            <div className="text-xs text-text-secondary">Timeline (16ms frames):</div>
            <div className="relative h-12 bg-[#0D0D0D] rounded border border-border overflow-hidden">
              {legacyProgress > 0 && (
                <motion.div
                  className="absolute top-0 left-0 h-full bg-red-500/40 flex items-center pl-2"
                  animate={{ width: `${legacyProgress}%` }}
                  transition={{ duration: 0.04, ease: "linear" }}
                >
                  <span className="text-red-300 text-xs whitespace-nowrap">blocking render...</span>
                </motion.div>
              )}
              {/* Frame markers */}
              {[16, 32, 48, 64, 80].map(pct => (
                <div key={pct} className="absolute top-0 bottom-0 border-l border-dashed border-border/40" style={{ left: `${pct}%` }}>
                  <span className="text-[9px] text-text-secondary absolute bottom-1 left-0.5">{pct}ms</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* Concurrent */}
        <Panel title="Concurrent (React 18) Render">
          <div className="space-y-4">
            <p className="text-xs text-text-secondary">
              Render is split into 5ms time slices. React yields to the browser between slices for input handling.
            </p>
            <Button size="sm" onClick={runConcurrent} disabled={concurrentRunning}>
              {concurrentRunning ? "Time-slicing..." : "Start Concurrent Render"}
            </Button>

            {/* Time slices */}
            <div className="text-xs text-text-secondary">Work slices (5ms each):</div>
            <div className="relative h-12 bg-[#0D0D0D] rounded border border-border overflow-hidden">
              {concurrentBlocks.map(block => (
                <motion.div
                  key={block.id}
                  className="absolute top-1 h-10 rounded flex items-center justify-center"
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  style={{
                    left: `${(block.x / (TL_WIDTH * 0.7)) * 100}%`,
                    width: `${(block.width / (TL_WIDTH * 0.7)) * 100}%`,
                    background: block.isYield ? "transparent" : block.color + "55",
                    border: block.isYield ? "none" : `1px solid ${block.color}`,
                  }}
                >
                  {!block.isYield && (
                    <span className="text-[8px] text-blue-300 font-mono">{block.label}</span>
                  )}
                  {block.isYield && (
                    <span className="text-[8px] text-text-secondary">yield</span>
                  )}
                </motion.div>
              ))}
              {/* Frame markers */}
              {[20, 40, 60, 80].map(pct => (
                <div key={pct} className="absolute top-0 bottom-0 border-l border-dashed border-border/40" style={{ left: `${pct}%` }}>
                  <span className="text-[9px] text-text-secondary absolute bottom-1 left-0.5">{pct}%</span>
                </div>
              ))}
            </div>

            {concurrentBlocks.length > 0 && !concurrentRunning && (
              <p className="text-xs text-green-400 font-mono">
                UI stayed responsive — React yielded {concurrentBlocks.filter(b => b.isYield).length}x to browser!
              </p>
            )}
          </div>
        </Panel>
      </div>

      {/* Priority Lanes */}
      <Panel title="Priority Lanes">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-3">
            {(Object.entries(LANE_CONFIG) as [Task["lane"], typeof LANE_CONFIG.sync][]).map(([lane, cfg]) => {
              const laneTasks = tasks.filter(t => t.lane === lane);
              return (
                <div key={lane} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                    <span className="text-xs font-mono text-text-primary">{cfg.label}</span>
                    <span className="text-[10px] text-text-secondary">priority {cfg.priority}</span>
                  </div>
                  <div className="h-8 bg-[#0D0D0D] rounded border border-border relative overflow-hidden">
                    <AnimatePresence>
                      {laneTasks.map((task) => (
                        <motion.div
                          key={task.id}
                          className="absolute top-1 h-6 rounded flex items-center px-2"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{
                            opacity: task.status === "done" ? 0.4 : 1,
                            x: 0,
                            background: task.status === "running"
                              ? [cfg.color + "44", cfg.color + "88", cfg.color + "44"]
                              : task.status === "done" ? cfg.color + "22" : cfg.color + "33",
                          }}
                          transition={task.status === "running" ? { duration: 0.4, repeat: Infinity } : {}}
                          style={{
                            left: `${(task.startX / 300) * 100}%`,
                            width: `${(task.width / 300) * 100}%`,
                            border: `1px solid ${cfg.color}55`,
                          }}
                        >
                          <span className="text-[9px] font-mono" style={{ color: cfg.color }}>
                            {task.label}
                            {task.status === "running" && " ▶"}
                            {task.status === "done" && " ✓"}
                          </span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="space-y-2">
            <p className="text-xs text-text-secondary mb-3">Add tasks to lanes:</p>
            {(Object.entries(LANE_CONFIG) as [Task["lane"], typeof LANE_CONFIG.sync][]).map(([lane, cfg]) => (
              <Button key={lane} variant="secondary" size="sm" onClick={() => addTask(lane)} className="w-full">
                <span className="w-2 h-2 rounded-full mr-2 inline-block" style={{ background: cfg.color }} />
                {cfg.label.replace("Lane", "")}
              </Button>
            ))}
            <Button size="sm" onClick={runScheduler} disabled={tasks.length === 0} className="w-full">
              Run Scheduler
            </Button>
            <div className="mt-2 px-2 py-1.5 rounded bg-[#0D0D0D] border border-border">
              <p className="text-[10px] font-mono text-accent">{scheduler}</p>
            </div>
          </div>
        </div>
      </Panel>

      {/* Interruption Demo */}
      <Panel title="Interruption Demo — startTransition">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-xs text-text-secondary">
              Start a low-priority (Transition) render, then fire a high-priority user input. React pauses the low-priority work, handles the urgent update, then resumes.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={startLowPriority}
                disabled={interruptDemo.phase === "low-running" || interruptDemo.phase === "high-running" || interruptDemo.phase === "resumed"}>
                Start Low Priority
              </Button>
              <Button size="sm" variant="secondary" onClick={fireHighPriority}
                disabled={interruptDemo.phase !== "low-running"}>
                Fire High Priority!
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-text-secondary">Execution timeline:</div>
            <div className="relative h-16 bg-[#0D0D0D] rounded border border-border overflow-hidden">
              {/* Low priority block */}
              {(interruptDemo.phase !== "idle") && (
                <motion.div
                  className="absolute top-1 h-6 rounded"
                  initial={{ width: 0 }}
                  animate={{
                    width: interruptDemo.phase === "low-running" ? "25%" :
                           interruptDemo.phase === "interrupted" ? "25%" :
                           interruptDemo.phase === "done" ? "25%" : "25%",
                  }}
                  style={{ left: "0%", background: "#A855F744", border: "1px solid #A855F7" }}
                >
                  <span className="text-[9px] font-mono text-purple-400 px-1">Low-P</span>
                </motion.div>
              )}

              {/* Paused indicator */}
              {(interruptDemo.phase === "interrupted" || interruptDemo.phase === "high-running" || interruptDemo.phase === "resumed" || interruptDemo.phase === "done") && (
                <motion.div
                  className="absolute top-1 h-6 w-6 rounded flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ left: "25%", background: "#EF444422", border: "1px solid #EF4444" }}
                >
                  <span className="text-[9px] text-red-400">⏸</span>
                </motion.div>
              )}

              {/* High priority block */}
              {(interruptDemo.phase === "high-running" || interruptDemo.phase === "resumed" || interruptDemo.phase === "done") && (
                <motion.div
                  className="absolute top-1 h-6 rounded"
                  initial={{ width: 0 }}
                  animate={{ width: "20%" }}
                  style={{ left: "30%", background: "#EF444444", border: "1px solid #EF4444" }}
                >
                  <span className="text-[9px] font-mono text-red-400 px-1">High-P</span>
                </motion.div>
              )}

              {/* Resume block */}
              {(interruptDemo.phase === "resumed" || interruptDemo.phase === "done") && (
                <motion.div
                  className="absolute top-1 h-6 rounded"
                  initial={{ width: 0 }}
                  animate={{ width: "20%" }}
                  style={{ left: "52%", background: "#A855F744", border: "1px solid #A855F7" }}
                >
                  <span className="text-[9px] font-mono text-purple-400 px-1">Low-P (resume)</span>
                </motion.div>
              )}

              {/* Labels */}
              <div className="absolute bottom-0 left-0 right-0 flex text-[8px] text-text-secondary px-1">
                <span style={{ width: "25%" }}>low-p</span>
                <span style={{ width: "5%" }}>pause</span>
                <span style={{ width: "20%" }}>high-p</span>
                <span style={{ width: "5%" }}>gap</span>
                <span style={{ width: "20%" }}>resume</span>
              </div>
            </div>

            <motion.div
              key={interruptDemo.phase}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-xs font-mono px-2 py-1 rounded ${
                interruptDemo.phase === "idle"        ? "text-text-secondary bg-transparent" :
                interruptDemo.phase === "low-running" ? "text-purple-400 bg-purple-400/10" :
                interruptDemo.phase === "interrupted" ? "text-red-400 bg-red-400/10" :
                interruptDemo.phase === "high-running"? "text-orange-400 bg-orange-400/10" :
                interruptDemo.phase === "resumed"     ? "text-purple-400 bg-purple-400/10" :
                "text-green-400 bg-green-400/10"
              }`}
            >
              {scheduler}
            </motion.div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
