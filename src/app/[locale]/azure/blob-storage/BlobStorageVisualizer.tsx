"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

type AppState = "idle" | "uploading" | "hot" | "cool" | "archive" | "rehydrating" | "sas-generating" | "sas-ready";
type Tier = "Hot" | "Cool" | "Archive";

const TIER_COLORS: Record<Tier, string> = {
  Hot: "#f59e0b",
  Cool: "#3b82f6",
  Archive: "#8b5cf6",
};

const TIER_COST: Record<Tier, { storage: string; access: string }> = {
  Hot: { storage: "$$", access: "Low" },
  Cool: { storage: "$", access: "Medium" },
  Archive: { storage: "¢", access: "High (rehydrate first)" },
};

export default function BlobStorageVisualizer() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [tier, setTier] = useState<Tier>("Hot");
  const [sasUrl, setSasUrl] = useState<string>("");
  const [logs, setLogs] = useState<{ text: string; type: "info" | "error" | "success" | "warn" }[]>([]);

  const addLog = (text: string, type: "info" | "error" | "success" | "warn" = "info") =>
    setLogs((p) => [...p, { text, type }]);

  const reset = () => {
    setAppState("idle");
    setTier("Hot");
    setSasUrl("");
    setLogs([]);
  };

  const runUpload = useCallback(async () => {
    if (appState !== "idle") return;
    setLogs([]);

    setAppState("uploading");
    addLog("const containerClient = blobServiceClient.getContainerClient('reports')", "info");
    await sleep(500);
    addLog("await blockBlobClient.uploadData(pdfBuffer, { tier: '" + tier + "' })", "info");
    await sleep(800);
    addLog(`✓ Blob uploaded — tier: ${tier}`, "success");
    addLog(`  Storage cost: ${TIER_COST[tier].storage}  |  Access cost: ${TIER_COST[tier].access}`, "info");

    setAppState(tier.toLowerCase() as "hot" | "cool" | "archive");

    if (tier === "Archive") {
      await sleep(600);
      addLog("ℹ️  Archive tier — blob is offline, access latency: hours", "warn");
      addLog("  To read: call SetBlobAccessTier('Cool') first (rehydration)", "warn");
    }
  }, [appState, tier]);

  const runRehydrate = useCallback(async () => {
    if (appState !== "archive") return;
    setAppState("rehydrating");
    addLog("blockBlobClient.setAccessTier('Cool')  // rehydrate to cool", "info");
    await sleep(500);
    addLog("⏳ Rehydration started — Standard priority (~15h) or High priority (~1h)", "warn");
    await sleep(1200);
    addLog("✓ Rehydration complete — blob accessible in Cool tier", "success");
    setTier("Cool");
    setAppState("cool");
  }, [appState]);

  const runGenerateSas = useCallback(async () => {
    if (!["hot", "cool"].includes(appState)) return;
    setAppState("sas-generating");
    addLog("generateBlobSASQueryParameters({ expiresOn: +1h, permissions: 'r' })", "info");
    await sleep(700);
    const url = `https://contoso.blob.core.windows.net/reports/q1.pdf?sv=2024-11-04&sr=b&sp=r&se=${new Date(Date.now() + 3600000).toISOString()}&spr=https&sig=EXAMPLE`;
    setSasUrl(url);
    addLog("✓ User Delegation SAS generated (no account key exposed)", "success");
    addLog("  Expires: 1 hour from now", "info");
    setAppState("sas-ready");
  }, [appState]);

  const blobs = [
    { name: "reports/2024/q1.pdf", size: "2.1 MB", tier },
    { name: "reports/2024/q2.pdf", size: "1.8 MB", tier: "Cool" as Tier },
    { name: "backups/db-2024.bak", size: "512 MB", tier: "Archive" as Tier },
  ];

  return (
    <Panel>
      <div className="flex flex-col gap-6">
        {/* Tier selector */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-white/50 font-medium">Upload tier:</span>
          {(["Hot", "Cool", "Archive"] as Tier[]).map((t) => (
            <button
              key={t}
              onClick={() => { if (appState === "idle") setTier(t); }}
              disabled={appState !== "idle"}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border transition"
              style={{
                background: tier === t ? `${TIER_COLORS[t]}20` : "rgba(255,255,255,0.04)",
                borderColor: tier === t ? `${TIER_COLORS[t]}60` : "rgba(255,255,255,0.1)",
                color: tier === t ? TIER_COLORS[t] : "rgba(255,255,255,0.4)",
              }}
            >
              {t}
            </button>
          ))}
          <div className="ml-auto flex gap-2 flex-wrap">
            <Button onClick={runUpload} disabled={appState !== "idle"} variant="primary">
              {appState === "idle" ? "Upload blob" : appState === "uploading" ? "Uploading…" : "Uploaded"}
            </Button>
            {appState === "archive" && (
              <Button onClick={runRehydrate} variant="secondary">Rehydrate →</Button>
            )}
            {["hot", "cool"].includes(appState) && (
              <Button onClick={runGenerateSas} disabled={appState === "sas-generating"} variant="secondary">
                Generate SAS URL
              </Button>
            )}
            <Button onClick={reset} variant="secondary">Reset</Button>
          </div>
        </div>

        {/* Container view */}
        <div className="rounded-xl border border-white/8 overflow-hidden">
          <div className="px-4 py-2 bg-white/4 text-xs text-white/50 font-mono border-b border-white/8">
            Container: reports
          </div>
          <div className="divide-y divide-white/5">
            {blobs.map((b, i) => (
              <motion.div
                key={b.name}
                initial={false}
                animate={{ opacity: i === 0 && appState === "uploading" ? 0.4 : 1 }}
                className="flex items-center gap-3 px-4 py-2.5 text-xs"
              >
                <span className="text-white/60 font-mono flex-1">{b.name}</span>
                <span className="text-white/30">{b.size}</span>
                <span
                  className="px-2 py-0.5 rounded-full font-bold text-[10px] uppercase"
                  style={{
                    background: `${TIER_COLORS[b.tier as Tier]}18`,
                    color: TIER_COLORS[b.tier as Tier],
                  }}
                >
                  {i === 0 ? tier : b.tier}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* SAS URL */}
        <AnimatePresence>
          {sasUrl && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-4 border border-emerald-500/25 bg-emerald-500/8"
            >
              <div className="text-xs text-emerald-400 font-semibold mb-1">✓ SAS URL (read-only, 1hr)</div>
              <div className="text-[10px] font-mono text-white/40 break-all">{sasUrl}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Logs */}
        {logs.length > 0 && (
          <div className="bg-black/30 rounded-xl p-4 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
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
