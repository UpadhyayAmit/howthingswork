"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type AuthFlow = "auth-code" | "client-credentials" | "managed-identity";
type AppState = "idle" | "redirect" | "consent" | "code-exchange" | "token-issued" | "api-call" | "authorized" | "denied";

const FLOW_DESCRIPTIONS: Record<AuthFlow, { title: string; useCase: string; color: string }> = {
  "auth-code": { title: "Auth Code + PKCE", useCase: "User-facing web/SPA apps", color: "#3b82f6" },
  "client-credentials": { title: "Client Credentials", useCase: "Service-to-service (no user)", color: "#8b5cf6" },
  "managed-identity": { title: "Managed Identity", useCase: "Azure resource → Azure resource", color: "#10b981" },
};

export default function EntraIdVisualizer() {
  const [flow, setFlow] = useState<AuthFlow>("auth-code");
  const [appState, setAppState] = useState<AppState>("idle");
  const [scope, setScope] = useState("orders.read");
  const [granted, setGranted] = useState(true);
  const [token, setToken] = useState<string>("");
  const [logs, setLogs] = useState<{ text: string; type: "info" | "error" | "success" | "warn" }[]>([]);

  const addLog = (text: string, type: "info" | "error" | "success" | "warn" = "info") =>
    setLogs((p) => [...p, { text, type }]);

  const reset = () => {
    setAppState("idle");
    setToken("");
    setLogs([]);
  };

  const runAuthCode = useCallback(async () => {
    setLogs([]);
    setAppState("redirect");
    addLog("1. App redirects user →  login.microsoftonline.com/…/oauth2/v2.0/authorize", "info");
    addLog("   response_type=code  scope=openid orders.read  code_challenge=…", "info");
    await sleep(700);
    setAppState("consent");
    addLog("2. User authenticates + consents to scope: orders.read", granted ? "success" : "warn");
    await sleep(800);

    if (!granted) {
      addLog("✗ User denied consent — error=access_denied", "error");
      setAppState("denied");
      return;
    }

    setAppState("code-exchange");
    addLog("3. Entra ID returns one-time code (expires in 10 min)", "success");
    await sleep(500);
    addLog("4. App POSTs code + PKCE verifier → /oauth2/v2.0/token", "info");
    await sleep(700);
    setAppState("token-issued");
    const mockToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9…[JWT]";
    setToken(mockToken);
    addLog("✓ Access token issued (JWT, 1hr TTL) + refresh token", "success");
    addLog(`  aud: api://orders-api  scp: ${scope}  iss: login.microsoftonline.com/…`, "info");
    await sleep(500);
    setAppState("api-call");
    addLog(`5. Client calls: GET /api/orders  Authorization: Bearer <token>`, "info");
    await sleep(600);
    addLog(`✓ API validates token — aud + issuer + scp="${scope}" match → 200 OK`, "success");
    setAppState("authorized");
  }, [scope, granted]);

  const runClientCreds = useCallback(async () => {
    setLogs([]);
    setAppState("code-exchange");
    addLog("Service-to-service — no user interaction", "info");
    addLog("POST /oauth2/v2.0/token  grant_type=client_credentials", "info");
    addLog("  client_id=…  client_secret=…  scope=https://graph.microsoft.com/.default", "info");
    await sleep(800);
    setAppState("token-issued");
    setToken("eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9…[app-only JWT]");
    addLog("✓ App-only token (no 'scp' claim, has 'roles' claim)", "success");
    addLog("  Best practice: use certificate credential instead of client_secret", "warn");
    await sleep(500);
    setAppState("authorized");
  }, []);

  const runManagedIdentity = useCallback(async () => {
    setLogs([]);
    setAppState("code-exchange");
    addLog("Azure resource (e.g. App Service) calls IMDS endpoint:", "info");
    addLog("  GET http://169.254.169.254/metadata/identity/oauth2/token", "info");
    addLog("  ?resource=https://vault.azure.net  (no credentials in code!)", "info");
    await sleep(800);
    setAppState("token-issued");
    setToken("eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9…[managed-identity JWT]");
    addLog("✓ Token issued by Azure platform — rotated automatically", "success");
    addLog("  var credential = new DefaultAzureCredential(); // picks up MI", "success");
    addLog("  → Zero secrets, zero rotation toil, zero risk of credential leak", "success");
    await sleep(500);
    setAppState("authorized");
  }, []);

  const run = useCallback(async () => {
    if (appState !== "idle") return;
    if (flow === "auth-code") await runAuthCode();
    else if (flow === "client-credentials") await runClientCreds();
    else await runManagedIdentity();
  }, [appState, flow, runAuthCode, runClientCreds, runManagedIdentity]);

  const flowColor = FLOW_DESCRIPTIONS[flow].color;

  const STEPS_BY_FLOW: Record<AuthFlow, string[]> = {
    "auth-code": ["Redirect", "Consent", "Code Exchange", "Token", "API Call"],
    "client-credentials": ["POST /token", "Token", "API Call"],
    "managed-identity": ["IMDS Request", "Token", "Resource Access"],
  };

  const STATE_STEP_MAP: Record<AppState, number> = {
    idle: -1,
    redirect: 0,
    consent: 1,
    "code-exchange": flow === "auth-code" ? 2 : 0,
    "token-issued": flow === "auth-code" ? 3 : 1,
    "api-call": flow === "auth-code" ? 4 : 2,
    authorized: 99,
    denied: 99,
  };

  const steps = STEPS_BY_FLOW[flow];
  const currentStep = STATE_STEP_MAP[appState];

  return (
    <Panel>
      <div className="flex flex-col gap-6">
        {/* Flow type */}
        <div className="flex flex-wrap gap-2">
          {(Object.entries(FLOW_DESCRIPTIONS) as [AuthFlow, typeof FLOW_DESCRIPTIONS[AuthFlow]][]).map(([k, v]) => (
            <button
              key={k}
              onClick={() => { if (appState === "idle") { setFlow(k); setLogs([]); setToken(""); } }}
              disabled={appState !== "idle"}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border transition"
              style={{
                background: flow === k ? `${v.color}20` : "rgba(255,255,255,0.04)",
                borderColor: flow === k ? `${v.color}60` : "rgba(255,255,255,0.1)",
                color: flow === k ? v.color : "rgba(255,255,255,0.4)",
              }}
            >
              {v.title}
              <span className="ml-1.5 opacity-60 text-[9px]">{v.useCase}</span>
            </button>
          ))}
        </div>

        {/* Controls for auth-code */}
        {flow === "auth-code" && (
          <div className="flex flex-wrap gap-4 items-center text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-white/40">Scope requested</span>
              <input
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                disabled={appState !== "idle"}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/80 font-mono w-40 focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-white/60 cursor-pointer mt-4">
              <input
                type="checkbox"
                checked={granted}
                onChange={(e) => setGranted(e.target.checked)}
                disabled={appState !== "idle"}
                className="accent-blue-500"
              />
              User grants consent
            </label>
          </div>
        )}

        {/* Step progress */}
        <div className="flex items-center gap-2 flex-wrap">
          {steps.map((step, i) => {
            const isActive = currentStep === i;
            const isDone = currentStep > i || appState === "authorized";
            return (
              <div key={step} className="flex items-center gap-2 shrink-0">
                <motion.div
                  animate={{ borderColor: isActive ? `${flowColor}cc` : isDone ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.1)" }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                  style={{
                    background: isActive ? `${flowColor}18` : isDone ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.03)",
                    color: isActive ? flowColor : isDone ? "#6ee7b7" : "rgba(255,255,255,0.3)",
                  }}
                >
                  {step}
                </motion.div>
                {i < steps.length - 1 && <div className="text-white/20 text-sm">→</div>}
              </div>
            );
          })}
        </div>

        {/* Token display */}
        <AnimatePresence>
          {token && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-4 border border-emerald-500/20 bg-emerald-500/5"
            >
              <div className="text-[10px] text-emerald-400 font-semibold mb-1">Access Token (JWT)</div>
              <div className="text-[10px] font-mono text-white/40 break-all">{token}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button onClick={run} disabled={appState !== "idle"} variant="primary">
            {appState === "idle" ? "Run flow" : appState === "authorized" ? "✓ Done" : "Running…"}
          </Button>
          <Button onClick={reset} variant="secondary">Reset</Button>
        </div>

        {/* Logs */}
        {logs.length > 0 && (
          <div className="bg-black/30 rounded-xl p-4 font-mono text-xs space-y-1 max-h-52 overflow-y-auto">
            {logs.map((l, i) => (
              <div
                key={i}
                className={
                  l.type === "error" ? "text-red-400"
                    : l.type === "success" ? "text-emerald-400"
                    : l.type === "warn" ? "text-amber-400"
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
