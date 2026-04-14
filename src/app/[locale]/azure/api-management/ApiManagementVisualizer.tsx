"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type PolicyStage = "inbound" | "backend" | "outbound";
type ViewMode = "visual" | "xml";

interface Policy {
  id: string;
  name: string;
  stage: PolicyStage;
  color: string;
  shortCircuit?: boolean;
  description: string;
  xmlSnippet: string;
}

const AVAILABLE_POLICIES: Policy[] = [
  {
    id: "validate-jwt",
    name: "validate-jwt",
    stage: "inbound",
    color: "#f59e0b",
    shortCircuit: true,
    description: "Validates Bearer token signature, issuer, and claims. Returns 401 on failure — short-circuits the pipeline.",
    xmlSnippet: `<validate-jwt header-name="Authorization" failed-validation-httpcode="401">
  <openid-config url="https://login.microsoftonline.com/{tenant}/.well-known/openid-configuration"/>
  <required-claims><claim name="scp" match="any"><value>api.read</value></claim></required-claims>
</validate-jwt>`,
  },
  {
    id: "rate-limit-by-key",
    name: "rate-limit-by-key",
    stage: "inbound",
    color: "#0ea5e9",
    description: "Limits calls to 100 per minute per subscription key. Returns 429 when exceeded.",
    xmlSnippet: `<rate-limit-by-key calls="100" renewal-period="60"
  counter-key="@(context.Subscription.Id)" />`,
  },
  {
    id: "set-header",
    name: "set-header",
    stage: "inbound",
    color: "#8b5cf6",
    description: "Adds X-Request-Id and removes any X-Forwarded-For header before forwarding to backend.",
    xmlSnippet: `<set-header name="X-Request-Id" exists-action="override">
  <value>@(context.RequestId.ToString())</value>
</set-header>
<set-header name="X-Forwarded-For" exists-action="delete"/>`,
  },
  {
    id: "rewrite-uri",
    name: "rewrite-uri",
    stage: "inbound",
    color: "#10b981",
    description: "Rewrites /v1/users to /api/users for backend routing versioning.",
    xmlSnippet: `<rewrite-uri template="/api/users{?$top,$skip}" />`,
  },
  {
    id: "cache-lookup",
    name: "cache-lookup",
    stage: "inbound",
    color: "#06b6d4",
    description: "Checks built-in cache before forwarding to backend. Cache hit skips backend entirely.",
    xmlSnippet: `<cache-lookup vary-by-developer="false" vary-by-developer-groups="false">
  <vary-by-query-parameter>search</vary-by-query-parameter>
</cache-lookup>`,
  },
  {
    id: "mock-response",
    name: "mock-response",
    stage: "inbound",
    color: "#a855f7",
    description: "Returns a mocked 200 response from the API schema without hitting the backend.",
    xmlSnippet: `<mock-response status-code="200" content-type="application/json" />`,
  },
];

interface PipelineNode {
  policyId: string;
  stage: PolicyStage;
}

type RequestPhase =
  | "idle"
  | "inbound"
  | "backend"
  | "outbound"
  | "done"
  | "blocked";

export default function ApiManagementVisualizer() {
  const [pipeline, setPipeline] = useState<PipelineNode[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("visual");
  const [phase, setPhase] = useState<RequestPhase>("idle");
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [blockedBy, setBlockedBy] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ text: string; type: "info" | "warn" | "error" | "success" }[]>([]);

  const addLog = (text: string, type: "info" | "warn" | "error" | "success" = "info") => {
    setLogs((prev) => [...prev, { text, type }]);
  };

  const togglePolicy = (policy: Policy) => {
    if (phase !== "idle") return;
    setPipeline((prev) => {
      const exists = prev.find((n) => n.policyId === policy.id);
      if (exists) return prev.filter((n) => n.policyId !== policy.id);
      return [...prev, { policyId: policy.id, stage: policy.stage }];
    });
  };

  const sendRequest = useCallback(async () => {
    if (phase !== "idle") return;
    setPhase("inbound");
    setBlockedBy(null);
    setLogs([]);
    addLog("→ Request received by APIM gateway", "info");

    const inbound = pipeline.filter((n) => n.stage === "inbound");
    for (const node of inbound) {
      const policy = AVAILABLE_POLICIES.find((p) => p.id === node.policyId)!;
      setActiveNodeId(node.policyId);
      addLog(`  [inbound] Executing ${policy.name}...`, "info");
      await sleep(700);
      if (policy.shortCircuit) {
        addLog(`  [inbound] ${policy.name} FAILED — 401 Unauthorized`, "error");
        addLog("✗ Pipeline short-circuited. Backend never called.", "error");
        setPhase("blocked");
        setBlockedBy(policy.id);
        setActiveNodeId(null);
        return;
      }
      addLog(`  [inbound] ${policy.name} → pass`, "success");
    }
    setActiveNodeId(null);

    setPhase("backend");
    addLog("→ Forwarding to backend service...", "info");
    await sleep(800);
    addLog("  [backend] HTTP 200 OK  (45ms)", "success");

    setPhase("outbound");
    const outbound = pipeline.filter((n) => n.stage === "outbound");
    for (const node of outbound) {
      const policy = AVAILABLE_POLICIES.find((p) => p.id === node.policyId)!;
      setActiveNodeId(node.policyId);
      addLog(`  [outbound] Executing ${policy.name}...`, "info");
      await sleep(600);
      addLog(`  [outbound] ${policy.name} → applied`, "success");
    }
    setActiveNodeId(null);

    setPhase("done");
    addLog("✓ Response returned to client (62ms total)", "success");
  }, [phase, pipeline]);

  const reset = () => {
    setPhase("idle");
    setActiveNodeId(null);
    setBlockedBy(null);
    setLogs([]);
  };

  const getPhaseColor = (p: RequestPhase) => {
    if (p === "inbound") return "#0ea5e9";
    if (p === "backend") return "#10b981";
    if (p === "outbound") return "#8b5cf6";
    if (p === "done") return "#10b981";
    if (p === "blocked") return "#ef4444";
    return "#374151";
  };

  const pipelineByStage = (stage: PolicyStage) =>
    pipeline
      .filter((n) => n.stage === stage)
      .map((n) => AVAILABLE_POLICIES.find((p) => p.id === n.policyId)!);

  const generatedXml = () => {
    const inb = pipelineByStage("inbound");
    const out = pipelineByStage("outbound");
    return `<policies>
  <inbound>
    <base />
${inb.map((p) => `    ${p.xmlSnippet.split("\n")[0]}`).join("\n")}
  </inbound>
  <backend>
    <base />
    <!-- forward-request is implicit -->
  </backend>
  <outbound>
    <base />
${out.map((p) => `    ${p.xmlSnippet.split("\n")[0]}`).join("\n")}
  </outbound>
  <on-error>
    <base />
  </on-error>
</policies>`;
  };

  const STAGE_ORDER: { label: string; key: PolicyStage | "backend"; color: string; phaseKey: RequestPhase }[] = [
    { label: "Inbound", key: "inbound", color: "#0ea5e9", phaseKey: "inbound" },
    { label: "Backend", key: "backend", color: "#10b981", phaseKey: "backend" },
    { label: "Outbound", key: "outbound", color: "#8b5cf6", phaseKey: "outbound" },
  ];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={sendRequest} disabled={phase !== "idle"}>
          {phase === "idle" ? "Send Request" : phase === "done" || phase === "blocked" ? "Done" : "Processing..."}
        </Button>
        <Button variant="secondary" onClick={reset} disabled={phase !== "idle" && phase !== "done" && phase !== "blocked"}>
          Reset
        </Button>
        <div className="ml-auto flex rounded-lg border border-border overflow-hidden text-xs font-mono">
          <button
            onClick={() => setViewMode("visual")}
            className={`px-3 py-1.5 transition-colors ${viewMode === "visual" ? "bg-[#0ea5e9]/20 text-[#0ea5e9]" : "text-text-secondary hover:bg-elevated"}`}
          >
            Visual
          </button>
          <button
            onClick={() => setViewMode("xml")}
            className={`px-3 py-1.5 transition-colors ${viewMode === "xml" ? "bg-[#0ea5e9]/20 text-[#0ea5e9]" : "text-text-secondary hover:bg-elevated"}`}
          >
            Policy XML
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Policy palette */}
        <Panel title="Available Policies">
          <div className="space-y-2">
            {AVAILABLE_POLICIES.map((policy) => {
              const active = pipeline.some((n) => n.policyId === policy.id);
              return (
                <motion.button
                  key={policy.id}
                  onClick={() => togglePolicy(policy)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
                    active
                      ? "border-opacity-60 bg-opacity-10"
                      : "border-border bg-background/40 text-text-secondary hover:border-border/80"
                  }`}
                  style={active ? { borderColor: policy.color, backgroundColor: `${policy.color}18`, color: policy.color } : {}}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{policy.name}</span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px]"
                      style={{ backgroundColor: `${policy.color}22`, color: policy.color }}
                    >
                      {policy.stage}
                    </span>
                  </div>
                  {active && (
                    <p className="text-[10px] mt-1 opacity-80 leading-relaxed">{policy.description}</p>
                  )}
                </motion.button>
              );
            })}
          </div>
          <p className="text-[10px] text-text-secondary mt-3 opacity-60">Click policies to add/remove from pipeline</p>
        </Panel>

        {/* Pipeline view */}
        <div className="xl:col-span-2 space-y-4">
          <AnimatePresence mode="wait">
            {viewMode === "visual" ? (
              <motion.div
                key="visual"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Panel title="Policy Pipeline">
                  <div className="flex items-stretch gap-2 min-h-[120px]">
                    {STAGE_ORDER.map((stage, si) => {
                      const isActive = phase === stage.phaseKey;
                      const nodes = stage.key !== "backend" ? pipelineByStage(stage.key as PolicyStage) : [];

                      return (
                        <div key={stage.key} className="flex items-center gap-2 flex-1">
                          <div
                            className="flex-1 rounded-xl border p-3 min-h-[100px] transition-all duration-300"
                            style={{
                              borderColor: isActive ? stage.color : "#2a2a2a",
                              backgroundColor: isActive ? `${stage.color}10` : "#111",
                            }}
                          >
                            <div
                              className="text-[10px] font-mono font-bold mb-2 uppercase tracking-wider"
                              style={{ color: stage.color }}
                            >
                              {stage.label}
                            </div>

                            {stage.key === "backend" ? (
                              <motion.div
                                className="flex items-center justify-center h-12 rounded-lg border text-xs text-text-secondary font-mono"
                                style={{
                                  borderColor: isActive ? stage.color : "#2a2a2a",
                                  backgroundColor: isActive ? `${stage.color}15` : "transparent",
                                }}
                                animate={{ scale: isActive ? [1, 1.03, 1] : 1 }}
                                transition={{ repeat: isActive ? Infinity : 0, duration: 0.8 }}
                              >
                                {isActive ? "⚡ calling..." : "backend API"}
                              </motion.div>
                            ) : nodes.length === 0 ? (
                              <p className="text-[10px] text-text-secondary opacity-40 italic">No policies</p>
                            ) : (
                              <div className="space-y-1.5">
                                {nodes.map((policy) => {
                                  const isNodeActive = activeNodeId === policy.id;
                                  const isBlocked = blockedBy === policy.id;
                                  return (
                                    <motion.div
                                      key={policy.id}
                                      className="px-2 py-1.5 rounded-lg border text-[10px] font-mono"
                                      style={{
                                        borderColor: isBlocked ? "#ef4444" : isNodeActive ? policy.color : `${policy.color}50`,
                                        backgroundColor: isBlocked ? "#ef444418" : isNodeActive ? `${policy.color}20` : `${policy.color}08`,
                                        color: isBlocked ? "#ef4444" : isNodeActive ? policy.color : `${policy.color}cc`,
                                      }}
                                      animate={
                                        isNodeActive
                                          ? { scale: [1, 1.04, 1], boxShadow: [`0 0 0px ${policy.color}00`, `0 0 8px ${policy.color}60`, `0 0 0px ${policy.color}00`] }
                                          : {}
                                      }
                                      transition={{ repeat: isNodeActive ? Infinity : 0, duration: 0.6 }}
                                    >
                                      {isBlocked ? "✗ " : isNodeActive ? "▶ " : "○ "}
                                      {policy.name}
                                      {policy.shortCircuit && (
                                        <span className="ml-1 opacity-60">[jwt]</span>
                                      )}
                                    </motion.div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {si < STAGE_ORDER.length - 1 && (
                            <svg width="20" height="20" className="flex-shrink-0">
                              <path
                                d="M4 10 L16 10 M12 6 L16 10 L12 14"
                                fill="none"
                                stroke={phase !== "idle" ? getPhaseColor(phase) : "#2a2a2a"}
                                strokeWidth={1.5}
                                strokeLinecap="round"
                              />
                            </svg>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Phase indicator */}
                  <div className="mt-3 flex items-center gap-2">
                    <motion.div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getPhaseColor(phase) }}
                      animate={{ opacity: phase !== "idle" && phase !== "done" && phase !== "blocked" ? [1, 0.3, 1] : 1 }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                    />
                    <span className="text-xs font-mono text-text-secondary">
                      {phase === "idle" && "Ready — add policies and click Send Request"}
                      {phase === "inbound" && "Processing inbound policies..."}
                      {phase === "backend" && "Forwarding to backend..."}
                      {phase === "outbound" && "Processing outbound policies..."}
                      {phase === "done" && "Request completed successfully"}
                      {phase === "blocked" && "Pipeline short-circuited — validate-jwt returned 401"}
                    </span>
                  </div>
                </Panel>
              </motion.div>
            ) : (
              <motion.div
                key="xml"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Panel title="Generated Policy XML">
                  <pre className="text-[11px] font-mono text-text-secondary leading-relaxed overflow-x-auto bg-background/60 p-4 rounded-lg border border-border">
                    {generatedXml()}
                  </pre>
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Execution log */}
          <Panel title="Gateway Log">
            <div className="bg-background/60 rounded-lg p-3 h-40 overflow-y-auto font-mono text-xs space-y-1 border border-border">
              {logs.length === 0 ? (
                <span className="text-text-secondary opacity-40">Waiting for request...</span>
              ) : (
                logs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={
                      log.type === "error"
                        ? "text-red-400"
                        : log.type === "success"
                        ? "text-emerald-400"
                        : log.type === "warn"
                        ? "text-amber-400"
                        : "text-text-secondary"
                    }
                  >
                    {log.text}
                  </motion.div>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
