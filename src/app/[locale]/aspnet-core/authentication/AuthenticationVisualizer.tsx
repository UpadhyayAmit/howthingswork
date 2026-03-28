"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

const BLUE = "#3b82f6";
const GREEN = "#22c55e";
const RED = "#ef4444";
const YELLOW = "#f59e0b";
const GRAY = "#6b7280";

type Scenario = "valid" | "expired" | "missing_claim";
type Stage =
  | "idle"
  | "sending"
  | "jwt_decode"
  | "signature_check"
  | "expiry_check"
  | "claims_build"
  | "policy_eval"
  | "done_ok"
  | "done_fail";

interface PipelineStep {
  id: Stage;
  label: string;
  detail: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  { id: "sending",        label: "Request → Bearer Token",       detail: "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." },
  { id: "jwt_decode",     label: "JWT Decode",                   detail: "Split header.payload.signature — base64 decode each part" },
  { id: "signature_check",label: "Signature Validation",         detail: "HMACSHA256(header.payload, signingKey) == signature?" },
  { id: "expiry_check",   label: "Lifetime Validation",          detail: "exp claim > UtcNow (± ClockSkew)" },
  { id: "claims_build",   label: "Build ClaimsPrincipal",        detail: "ClaimsIdentity from JWT payload → HttpContext.User" },
  { id: "policy_eval",    label: "Policy Evaluation",            detail: "IAuthorizationHandler: RequireClaim('audit_scope', 'write')?" },
];

const SCENARIO_META: Record<Scenario, { label: string; color: string; failAt: Stage | null; failReason: string; jwtPayload: string }> = {
  valid: {
    label: "Valid Token",
    color: GREEN,
    failAt: null,
    failReason: "",
    jwtPayload: `{
  "sub": "user-42",
  "email": "alice@corp.com",
  "audit_scope": "write",
  "role": ["user", "auditor"],
  "iat": 1711584000,
  "exp": 9999999999   // far future
}`,
  },
  expired: {
    label: "Expired Token",
    color: RED,
    failAt: "expiry_check",
    failReason: "IDX10223: Lifetime validation failed. The token is expired.\nValidTo: '01/01/2024 00:00:00'\nUtcNow: '03/28/2026 09:15:42'",
    jwtPayload: `{
  "sub": "user-42",
  "email": "alice@corp.com",
  "audit_scope": "write",
  "role": ["user", "auditor"],
  "iat": 1703980800,
  "exp": 1704067200   // ⚠️ expired Jan 2024
}`,
  },
  missing_claim: {
    label: "Missing Claim",
    color: YELLOW,
    failAt: "policy_eval",
    failReason: "Authorization failed.\nRequirement 'ClaimsAuthorizationRequirement:Type=audit_scope,Value=write' was not satisfied.",
    jwtPayload: `{
  "sub": "user-99",
  "email": "bob@corp.com",
  "role": ["user"],
  "iat": 1711584000,
  "exp": 9999999999
  // ⚠️ no 'audit_scope' claim — policy will reject
}`,
  },
};

const STEP_COLORS: Record<Stage, string> = {
  idle:            GRAY,
  sending:         BLUE,
  jwt_decode:      BLUE,
  signature_check: BLUE,
  expiry_check:    BLUE,
  claims_build:    BLUE,
  policy_eval:     BLUE,
  done_ok:         GREEN,
  done_fail:       RED,
};

function getStepColor(stepId: Stage, currentStage: Stage, failAt: Stage | null): string {
  const order = PIPELINE_STEPS.map((s) => s.id);
  const stepIdx = order.indexOf(stepId);
  const currIdx = order.indexOf(currentStage);

  if (currentStage === "done_ok") return GREEN;
  if (currentStage === "done_fail" && failAt) {
    const failIdx = order.indexOf(failAt);
    if (stepIdx < failIdx) return GREEN;
    if (stepIdx === failIdx) return RED;
    return GRAY;
  }
  if (stepIdx < currIdx) return GREEN;
  if (stepIdx === currIdx) return STEP_COLORS[currentStage];
  return GRAY;
}

export default function AuthenticationVisualizer() {
  const [scenario, setScenario] = useState<Scenario>("valid");
  const [stage, setStage] = useState<Stage>("idle");
  const [running, setRunning] = useState(false);
  const [showJwt, setShowJwt] = useState(false);

  const meta = SCENARIO_META[scenario];

  const run = useCallback(async () => {
    setRunning(true);
    setShowJwt(false);
    setStage("idle");

    const steps: Stage[] = ["sending", "jwt_decode", "signature_check", "expiry_check", "claims_build", "policy_eval"];

    for (const step of steps) {
      setStage(step);
      if (step === "jwt_decode") setShowJwt(true);
      await sleep(700);
      if (step === meta.failAt) {
        setStage("done_fail");
        setRunning(false);
        return;
      }
    }
    setStage("done_ok");
    setRunning(false);
  }, [meta.failAt]);

  const reset = () => {
    setStage("idle");
    setShowJwt(false);
    setRunning(false);
  };

  const isDone = stage === "done_ok" || stage === "done_fail";

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {(["valid", "expired", "missing_claim"] as Scenario[]).map((s) => {
          const m = SCENARIO_META[s];
          const active = scenario === s;
          return (
            <button
              key={s}
              onClick={() => { setScenario(s); reset(); }}
              disabled={running}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all duration-200 disabled:opacity-50"
              style={{
                borderColor: active ? m.color : "#374151",
                backgroundColor: active ? `${m.color}18` : "transparent",
                color: active ? m.color : "#9ca3af",
              }}
            >
              {m.label}
            </button>
          );
        })}
        <Button onClick={run} disabled={running} className="ml-auto">
          {running ? "Running..." : "Send Request"}
        </Button>
        <Button variant="ghost" onClick={reset} disabled={running}>
          Reset
        </Button>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline */}
        <div className="lg:col-span-2 space-y-2">
          <Panel title="Auth Pipeline — UseAuthentication → UseAuthorization" accentColor={BLUE}>
            <div className="space-y-2">
              {PIPELINE_STEPS.map((step, i) => {
                const color = getStepColor(step.id, stage, meta.failAt);
                const isActive = step.id === stage;
                const isFail = stage === "done_fail" && step.id === meta.failAt;
                return (
                  <motion.div
                    key={step.id}
                    animate={{
                      opacity: color === GRAY && stage !== "idle" ? 0.4 : 1,
                      x: isActive ? 4 : 0,
                    }}
                    transition={{ duration: 0.25 }}
                    className="flex items-start gap-3 p-3 rounded-lg border transition-colors"
                    style={{
                      borderColor: isActive || isFail ? color : "#1f2937",
                      backgroundColor: isActive || isFail ? `${color}10` : "transparent",
                    }}
                  >
                    {/* Step indicator */}
                    <div
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold border mt-0.5"
                      style={{
                        borderColor: color,
                        color: color,
                        backgroundColor: `${color}15`,
                      }}
                    >
                      {color === GREEN ? "✓" : isFail ? "✗" : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-text-primary">{step.label}</div>
                      <div className="text-xs text-text-secondary font-mono mt-0.5 truncate">{step.detail}</div>
                    </div>
                    {/* Pulse on active */}
                    {isActive && !isFail && (
                      <motion.div
                        animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="flex-shrink-0 w-2 h-2 rounded-full mt-2"
                        style={{ backgroundColor: color }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Result banner */}
            <AnimatePresence>
              {isDone && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 p-3 rounded-lg border"
                  style={{
                    borderColor: stage === "done_ok" ? GREEN : RED,
                    backgroundColor: stage === "done_ok" ? `${GREEN}10` : `${RED}10`,
                  }}
                >
                  {stage === "done_ok" ? (
                    <div>
                      <div className="text-xs font-mono font-bold mb-1" style={{ color: GREEN }}>
                        200 OK — Request authorized
                      </div>
                      <div className="text-xs text-text-secondary">
                        HttpContext.User.Identity.IsAuthenticated = true &nbsp;|&nbsp; ClaimsPrincipal populated
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-mono font-bold mb-1" style={{ color: RED }}>
                        {meta.failAt === "policy_eval" ? "403 Forbidden" : "401 Unauthorized"}
                      </div>
                      <pre className="text-[10px] text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
                        {meta.failReason}
                      </pre>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Panel>

          {/* 401 vs 403 explainer */}
          <Panel title="401 vs 403 — Not the Same Thing" accentColor={BLUE}>
            <div className="grid grid-cols-2 gap-3">
              <div
                className="p-3 rounded-lg border text-xs space-y-1"
                style={{ borderColor: `${YELLOW}40`, backgroundColor: `${YELLOW}08` }}
              >
                <div className="font-mono font-bold" style={{ color: YELLOW }}>401 Unauthorized</div>
                <div className="text-text-secondary">Authentication failed — no valid identity established. Token missing, expired, or signature invalid.</div>
              </div>
              <div
                className="p-3 rounded-lg border text-xs space-y-1"
                style={{ borderColor: `${RED}40`, backgroundColor: `${RED}08` }}
              >
                <div className="font-mono font-bold" style={{ color: RED }}>403 Forbidden</div>
                <div className="text-text-secondary">Authenticated, but lacks permission. Valid token, but missing required claim or policy check failed.</div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right column: JWT inspector + ClaimsPrincipal */}
        <div className="space-y-4">
          <Panel title="JWT Payload" accentColor={meta.color}>
            <AnimatePresence mode="wait">
              {!showJwt ? (
                <motion.div
                  key="hidden"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-text-secondary font-mono p-2 text-center"
                >
                  Send a request to decode
                </motion.div>
              ) : (
                <motion.div
                  key={`jwt-${scenario}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <pre
                    className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap break-words"
                    style={{ color: meta.color }}
                  >
                    {meta.jwtPayload}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </Panel>

          <Panel title="ClaimsPrincipal" accentColor={BLUE}>
            <AnimatePresence>
              {stage === "done_ok" || (stage !== "idle" && PIPELINE_STEPS.findIndex(s => s.id === "claims_build") < PIPELINE_STEPS.findIndex(s => s.id === stage) && stage !== "done_fail") ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-1"
                >
                  {[
                    { key: "sub", value: scenario === "missing_claim" ? "user-99" : "user-42", ok: true },
                    { key: "email", value: scenario === "missing_claim" ? "bob@corp.com" : "alice@corp.com", ok: true },
                    { key: "role", value: scenario === "missing_claim" ? '["user"]' : '["user","auditor"]', ok: true },
                    { key: "audit_scope", value: scenario === "missing_claim" ? "(missing)" : '"write"', ok: scenario !== "missing_claim" },
                  ].map((claim) => (
                    <div key={claim.key} className="flex items-center gap-2 text-xs font-mono">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: claim.ok ? GREEN : RED }}
                      />
                      <span className="text-text-secondary">{claim.key}:</span>
                      <span style={{ color: claim.ok ? "#e5e7eb" : RED }}>{claim.value}</span>
                    </div>
                  ))}
                </motion.div>
              ) : (
                <div className="text-xs text-text-secondary font-mono text-center py-2">
                  Pipeline not reached yet
                </div>
              )}
            </AnimatePresence>
          </Panel>

          {/* Auth vs AuthZ distinction */}
          <Panel accentColor={BLUE}>
            <div className="space-y-2 text-xs">
              <div
                className="p-2 rounded border font-mono"
                style={{ borderColor: `${BLUE}40`, backgroundColor: `${BLUE}08`, color: BLUE }}
              >
                UseAuthentication()
                <div className="text-text-secondary mt-1 font-sans font-normal">
                  "Who are you?" — populates HttpContext.User
                </div>
              </div>
              <div className="text-center text-text-secondary">↓</div>
              <div
                className="p-2 rounded border font-mono"
                style={{ borderColor: `${GREEN}40`, backgroundColor: `${GREEN}08`, color: GREEN }}
              >
                UseAuthorization()
                <div className="text-text-secondary mt-1 font-sans font-normal">
                  "What can you do?" — evaluates [Authorize] policies
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
