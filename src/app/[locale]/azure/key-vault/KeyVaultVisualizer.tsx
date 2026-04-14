"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type IdentityType = "system" | "user";
type PermModel = "rbac" | "accesspolicy";
type AppState = "idle" | "bad-committing" | "leaked" | "good-starting" | "imds" | "rbac-check" | "secret-returned" | "cached";

const BAD_CONFIG = `{
  "ConnectionStrings": {
    "Sql": "Server=prod.database.windows.net;
            Database=orders;
            User Id=svc_orders;
            Password=P@ssw0rd!2024"
  },
  "ExternalApi": {
    "ApiKey": "sk-live-8f3kx9..."
  }
}`;

const GOOD_CONFIG = `{
  "KeyVault": {
    "VaultUri": "https://contoso-prod.vault.azure.net/"
  }
  // No secrets. Ever.
  // Identity provides access at runtime.
}`;

interface SecretVersion {
  version: string;
  value: string;
  active: boolean;
  created: string;
}

const INITIAL_VERSIONS: SecretVersion[] = [
  { version: "v2", value: "NewKey-abc123xyz", active: true, created: "2024-03-15" },
  { version: "v1", value: "OldKey-def456uvw", active: false, created: "2024-01-10" },
];

export default function KeyVaultVisualizer() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [identityType, setIdentityType] = useState<IdentityType>("system");
  const [permModel, setPermModel] = useState<PermModel>("rbac");
  const [versions, setVersions] = useState<SecretVersion[]>(INITIAL_VERSIONS);
  const [cachedSecret, setCachedSecret] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ text: string; type: "info" | "error" | "success" | "warn" }[]>([]);
  const [side, setSide] = useState<"bad" | "good">("bad");

  const addLog = (text: string, type: "info" | "error" | "success" | "warn" = "info") => {
    setLogs((prev) => [...prev, { text, type }]);
  };

  const runBadWay = useCallback(async () => {
    if (appState !== "idle") return;
    setSide("bad");
    setLogs([]);
    setAppState("bad-committing");

    addLog("$ git add appsettings.json", "info");
    await sleep(600);
    addLog("$ git commit -m 'fix: connection string'", "warn");
    await sleep(700);
    addLog("[main 3f9a2c1] fix: connection string", "warn");
    await sleep(500);
    addLog("$ git push origin main", "error");
    await sleep(800);
    addLog("", "info");
    addLog("💀 GitHub secret scanning detected credentials!", "error");
    addLog("   Pattern: Azure SQL connection string with password", "error");
    addLog("   Commit: 3f9a2c1 — visible in git history FOREVER", "error");
    addLog("   Alert sent to security team", "error");
    await sleep(600);
    setAppState("leaked");
  }, [appState]);

  const runGoodWay = useCallback(async () => {
    if (appState !== "idle") return;
    setSide("good");
    setLogs([]);
    setAppState("good-starting");
    const activeVersion = versions.find((v) => v.active)!;

    addLog(`App starting — ${identityType === "system" ? "System-assigned" : "User-assigned"} Managed Identity`, "info");
    await sleep(600);
    setAppState("imds");
    addLog("→ GET http://169.254.169.254/metadata/identity/oauth2/token", "info");
    addLog("  resource=https://vault.azure.net  metadata:true", "info");
    await sleep(800);
    addLog("← Token issued by Azure AD (no secret needed)", "success");
    await sleep(500);

    setAppState("rbac-check");
    addLog(`→ Calling Key Vault (${permModel === "rbac" ? "RBAC" : "Access Policy"})`, "info");
    addLog(`  GET https://contoso-prod.vault.azure.net/secrets/sql-connection`, "info");
    await sleep(700);

    if (permModel === "rbac") {
      addLog("  RBAC: checking Key Vault Secrets User role on identity", "info");
    } else {
      addLog("  Access Policy: GET permission on secrets for identity", "info");
    }
    await sleep(500);
    addLog("← Authorization: GRANTED", "success");
    await sleep(400);

    setAppState("secret-returned");
    addLog(`← Secret value returned (version ${activeVersion.version})`, "success");
    await sleep(500);

    setAppState("cached");
    setCachedSecret(activeVersion.value);
    addLog("  Cached in SecretClient for 5 minutes (configurable)", "info");
    addLog("✓ App running. Zero secrets in config or environment.", "success");
  }, [appState, identityType, permModel, versions]);

  const rotateSecret = useCallback(async () => {
    if (appState !== "cached" && appState !== "secret-returned") return;
    const newVer: SecretVersion = {
      version: `v${versions.length + 1}`,
      value: `NewKey-${Math.random().toString(36).slice(2, 10)}`,
      active: true,
      created: new Date().toISOString().slice(0, 10),
    };

    addLog("", "info");
    addLog("🔄 Secret rotation triggered (Key Vault)...", "warn");
    await sleep(600);
    setVersions((prev) => [newVer, ...prev.map((v) => ({ ...v, active: false }))]);
    await sleep(400);
    addLog(`← New secret version ${newVer.version} created`, "success");
    addLog("  Previous version soft-deleted (not purged)", "info");
    await sleep(500);
    setCachedSecret(newVer.value);
    addLog("← App picks up new version on next cache refresh (5 min)", "success");
  }, [appState, versions]);

  const reset = () => {
    setAppState("idle");
    setLogs([]);
    setCachedSecret(null);
    setVersions(INITIAL_VERSIONS);
  };

  const phaseLabel: Record<AppState, string> = {
    idle: "idle",
    "bad-committing": "committing secrets...",
    leaked: "LEAKED — credentials in git history",
    "good-starting": "app starting",
    imds: "requesting IMDS token...",
    "rbac-check": "Key Vault RBAC check...",
    "secret-returned": "secret received",
    cached: "secret cached",
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={runBadWay} disabled={appState !== "idle"} variant="secondary" className="border-red-500/40 text-red-400 hover:border-red-500">
          Commit Secret (Bad Way)
        </Button>
        <Button onClick={runGoodWay} disabled={appState !== "idle"}>
          Start App (Key Vault Way)
        </Button>
        {(appState === "cached" || appState === "secret-returned") && (
          <Button variant="secondary" onClick={rotateSecret}>
            Rotate Secret
          </Button>
        )}
        <Button variant="ghost" onClick={reset} disabled={appState !== "idle" && appState !== "leaked" && appState !== "cached"}>
          Reset
        </Button>

        <div className="ml-auto flex gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary font-mono">Identity:</span>
            <button
              onClick={() => setIdentityType("system")}
              className={`px-2 py-1 text-xs rounded font-mono border transition-colors ${identityType === "system" ? "bg-[#0ea5e9]/20 border-[#0ea5e9]/50 text-[#0ea5e9]" : "border-border text-text-secondary"}`}
            >
              System-assigned
            </button>
            <button
              onClick={() => setIdentityType("user")}
              className={`px-2 py-1 text-xs rounded font-mono border transition-colors ${identityType === "user" ? "bg-[#0ea5e9]/20 border-[#0ea5e9]/50 text-[#0ea5e9]" : "border-border text-text-secondary"}`}
            >
              User-assigned
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary font-mono">Permissions:</span>
            <button
              onClick={() => setPermModel("rbac")}
              className={`px-2 py-1 text-xs rounded font-mono border transition-colors ${permModel === "rbac" ? "bg-[#0ea5e9]/20 border-[#0ea5e9]/50 text-[#0ea5e9]" : "border-border text-text-secondary"}`}
            >
              RBAC
            </button>
            <button
              onClick={() => setPermModel("accesspolicy")}
              className={`px-2 py-1 text-xs rounded font-mono border transition-colors ${permModel === "accesspolicy" ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : "border-border text-text-secondary"}`}
            >
              Access Policy
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Side-by-side config comparison */}
        <div className="space-y-4">
          <Panel title="Bad Way: Secret in Config" accentColor="#ef4444">
            <pre
              className="text-[10px] font-mono leading-relaxed rounded-lg p-3 border overflow-x-auto"
              style={{
                backgroundColor: side === "bad" && appState !== "idle" ? "#ef444410" : "#0d0d0d",
                borderColor: side === "bad" && appState === "leaked" ? "#ef4444" : "#2a2a2a",
                color: side === "bad" && appState === "leaked" ? "#f87171" : "#6b7280",
              }}
            >
              {BAD_CONFIG}
            </pre>
            {appState === "leaked" && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 p-2 bg-red-500/15 border border-red-500/40 rounded-lg text-[10px] font-mono text-red-400"
              >
                ☠ Credentials visible in git log --all forever
              </motion.div>
            )}
          </Panel>

          <Panel title="Key Vault Way: Zero Secrets" accentColor="#10b981">
            <pre
              className="text-[10px] font-mono leading-relaxed rounded-lg p-3 border overflow-x-auto"
              style={{
                backgroundColor: side === "good" && appState !== "idle" ? "#10b98110" : "#0d0d0d",
                borderColor: side === "good" && appState === "cached" ? "#10b981" : "#2a2a2a",
                color: side === "good" && appState !== "idle" ? "#6ee7b7" : "#6b7280",
              }}
            >
              {GOOD_CONFIG}
            </pre>
            {cachedSecret && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-[10px] font-mono"
              >
                <span className="text-emerald-400">cached value: </span>
                <span className="text-text-secondary">{cachedSecret.slice(0, 8)}•••••</span>
              </motion.div>
            )}
          </Panel>

          {/* Secret versions */}
          <Panel title="Secret Versions">
            <div className="space-y-1.5">
              {versions.map((ver) => (
                <motion.div
                  key={ver.version}
                  layout
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[10px] font-mono"
                  style={{
                    borderColor: ver.active ? "#10b981" : "#2a2a2a",
                    backgroundColor: ver.active ? "#10b98110" : "#0d0d0d",
                    color: ver.active ? "#6ee7b7" : "#4b5563",
                  }}
                >
                  <span>{ver.active ? "✓" : "○"}</span>
                  <span className="font-bold">{ver.version}</span>
                  <span className="opacity-60">{ver.created}</span>
                  {!ver.active && <span className="ml-auto opacity-40">soft-deleted</span>}
                  {ver.active && <span className="ml-auto text-emerald-400">current</span>}
                </motion.div>
              ))}
            </div>
            <p className="text-[9px] text-text-secondary opacity-40 mt-2">Old versions retained for 90 days (soft-delete)</p>
          </Panel>
        </div>

        {/* Flow visualization + log */}
        <div className="xl:col-span-2 space-y-4">
          {/* Permission model comparison */}
          <Panel title="Permission Model">
            <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
              <div
                className="p-3 rounded-lg border"
                style={{
                  borderColor: permModel === "rbac" ? "#0ea5e9" : "#2a2a2a",
                  backgroundColor: permModel === "rbac" ? "#0ea5e910" : "#0d0d0d",
                }}
              >
                <div className="font-bold text-[#0ea5e9] mb-2">RBAC (Recommended)</div>
                <ul className="space-y-1 text-text-secondary">
                  <li>• Key Vault Secrets User</li>
                  <li>• Key Vault Secrets Officer</li>
                  <li>• Key Vault Administrator</li>
                  <li className="text-emerald-400 mt-2">✓ Azure AD-native</li>
                  <li className="text-emerald-400">✓ Conditional access</li>
                  <li className="text-emerald-400">✓ PIM eligible roles</li>
                </ul>
              </div>
              <div
                className="p-3 rounded-lg border"
                style={{
                  borderColor: permModel === "accesspolicy" ? "#f59e0b" : "#2a2a2a",
                  backgroundColor: permModel === "accesspolicy" ? "#f59e0b10" : "#0d0d0d",
                }}
              >
                <div className="font-bold text-amber-400 mb-2">Access Policies (Legacy)</div>
                <ul className="space-y-1 text-text-secondary">
                  <li>• Per-operation permissions</li>
                  <li>• Get, List, Set, Delete</li>
                  <li>• Vault-level scope only</li>
                  <li className="text-amber-400 mt-2">⚠ Retiring 2025</li>
                  <li className="text-amber-400">⚠ No Conditional Access</li>
                  <li className="text-amber-400">⚠ Coarse-grained</li>
                </ul>
              </div>
            </div>
          </Panel>

          {/* Auth flow animation */}
          <Panel title="Runtime Secret Resolution">
            <div className="flex flex-col gap-2">
              {[
                { id: "good-starting", label: "App Start", icon: "🚀", color: "#10b981" },
                { id: "imds", label: "IMDS Token (169.254.169.254)", icon: "🔐", color: "#0ea5e9" },
                { id: "rbac-check", label: `Key Vault ${permModel.toUpperCase()} Check`, icon: "🛡️", color: "#8b5cf6" },
                { id: "secret-returned", label: "Secret Retrieved", icon: "🔑", color: "#10b981" },
                { id: "cached", label: "Cached (5 min TTL)", icon: "⚡", color: "#f59e0b" },
              ].map((step) => {
                const stateOrder: AppState[] = ["good-starting", "imds", "rbac-check", "secret-returned", "cached"];
                const currentIdx = stateOrder.indexOf(appState as AppState);
                const stepIdx = stateOrder.indexOf(step.id as AppState);
                const isPast = currentIdx > stepIdx && currentIdx >= 0;
                const isActive = appState === step.id;

                return (
                  <motion.div
                    key={step.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border text-xs font-mono transition-all"
                    style={{
                      borderColor: isActive ? step.color : isPast ? `${step.color}40` : "#2a2a2a",
                      backgroundColor: isActive ? `${step.color}15` : isPast ? `${step.color}08` : "#0d0d0d",
                      color: isActive ? step.color : isPast ? `${step.color}90` : "#4b5563",
                    }}
                    animate={isActive ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ repeat: isActive ? Infinity : 0, duration: 0.7 }}
                  >
                    <span>{step.icon}</span>
                    <span>{step.label}</span>
                    {isPast && <span className="ml-auto text-emerald-400">✓</span>}
                    {isActive && (
                      <motion.span
                        className="ml-auto w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: step.color }}
                        animate={{ opacity: [1, 0.2, 1] }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {identityType === "user" && side === "good" && (
              <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[10px] font-mono text-amber-400">
                ⚠ User-assigned identity: ensure it is attached to the resource (App Service, VM, Function App). Forgetting this step causes 403 at the IMDS token request.
              </div>
            )}
          </Panel>

          {/* Log */}
          <Panel title="Runtime Log">
            <div className="bg-background/60 rounded-lg p-3 h-36 overflow-y-auto font-mono text-xs space-y-0.5 border border-border">
              {logs.length === 0 ? (
                <span className="text-text-secondary opacity-40">Choose a path above to begin...</span>
              ) : (
                logs.map((log, i) =>
                  log.text === "" ? (
                    <div key={i} className="h-2" />
                  ) : (
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
                  )
                )
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
