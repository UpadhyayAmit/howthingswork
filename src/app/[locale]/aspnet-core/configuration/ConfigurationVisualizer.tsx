"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";
import { sleep } from "@/lib/utils";

const BLUE = "#3b82f6";
const GREEN = "#22c55e";
const YELLOW = "#f59e0b";
const PURPLE = "#a855f7";
const CYAN = "#06b6d4";
const RED = "#ef4444";

type OptionsVariant = "IOptions" | "IOptionsSnapshot" | "IOptionsMonitor";

interface ConfigLayer {
  id: string;
  label: string;
  description: string;
  color: string;
  values: Record<string, string>;
  priority: number; // higher = wins
}

const CONFIG_LAYERS: ConfigLayer[] = [
  {
    id: "appsettings",
    label: "appsettings.json",
    description: "Base config — checked in to source control",
    color: "#6b7280",
    priority: 1,
    values: {
      "EmailService:Host":      "smtp.internal.corp",
      "EmailService:Port":      "587",
      "EmailService:TimeoutMs": "5000",
      "FeatureFlags:NewCheckout":"false",
    },
  },
  {
    id: "appsettings_prod",
    label: "appsettings.Production.json",
    description: "Environment-specific overrides",
    color: BLUE,
    priority: 2,
    values: {
      "EmailService:Host":       "smtp.prod.corp",
      "EmailService:Port":       "465",
      "FeatureFlags:NewCheckout":"false",
    },
  },
  {
    id: "env_vars",
    label: "Environment Variables",
    description: "Runtime injection (EmailService__Host=...)",
    color: CYAN,
    priority: 3,
    values: {
      "EmailService:Host":       "smtp.k8s.cluster",
      "EmailService:TimeoutMs":  "2000",
    },
  },
  {
    id: "user_secrets",
    label: "User Secrets (dev only)",
    description: "Secrets outside repo — %APPDATA%\\UserSecrets",
    color: YELLOW,
    priority: 2.5,
    values: {
      "Stripe:ApiKey": "sk_test_****",
    },
  },
  {
    id: "keyvault",
    label: "Azure Key Vault",
    description: "Production secrets — highest priority",
    color: GREEN,
    priority: 4,
    values: {
      "EmailService:Host": "smtp.vault.corp",
      "Stripe:ApiKey":     "sk_live_****",
    },
  },
];

// Which layers are "active" (registered)
const DEFAULT_ACTIVE_LAYERS = new Set(["appsettings", "appsettings_prod", "env_vars"]);

interface LookupResult {
  key: string;
  winner: ConfigLayer;
  losers: ConfigLayer[];
}

function resolveKey(key: string, activeLayers: Set<string>): LookupResult | null {
  const active = CONFIG_LAYERS.filter((l) => activeLayers.has(l.id));
  const candidates = active.filter((l) => key in l.values);
  if (candidates.length === 0) return null;

  const sorted = [...candidates].sort((a, b) => b.priority - a.priority);
  const [winner, ...losers] = sorted;
  return { key, winner, losers };
}

const LOOKUP_KEYS = [
  "EmailService:Host",
  "EmailService:Port",
  "EmailService:TimeoutMs",
  "FeatureFlags:NewCheckout",
  "Stripe:ApiKey",
];

const OPTIONS_VARIANTS: OptionsVariant[] = ["IOptions", "IOptionsSnapshot", "IOptionsMonitor"];

const OPTIONS_META: Record<OptionsVariant, { color: string; lifetime: string; reloads: boolean; useCase: string }> = {
  IOptions: {
    color: PURPLE,
    lifetime: "Singleton",
    reloads: false,
    useCase: "Static config: DB connections, infrastructure URLs",
  },
  IOptionsSnapshot: {
    color: BLUE,
    lifetime: "Scoped (per request)",
    reloads: true,
    useCase: "Per-request config: A/B tests, per-tenant settings",
  },
  IOptionsMonitor: {
    color: GREEN,
    lifetime: "Singleton + live updates",
    reloads: true,
    useCase: "Hot-reloadable: feature flags, rate limits, timeouts",
  },
};

export default function ConfigurationVisualizer() {
  const [activeLayers, setActiveLayers] = useState<Set<string>>(DEFAULT_ACTIVE_LAYERS);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [animating, setAnimating] = useState(false);
  const [animStep, setAnimStep] = useState(-1);
  const [selectedVariant, setSelectedVariant] = useState<OptionsVariant>("IOptions");
  const [fileChanged, setFileChanged] = useState(false);
  const [reloadVisible, setReloadVisible] = useState(false);

  const toggleLayer = (id: string) => {
    if (animating) return;
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setLookupResult(null);
    setAnimStep(-1);
  };

  const runLookup = useCallback(async (key: string) => {
    if (animating) return;
    setAnimating(true);
    setSelectedKey(key);
    setLookupResult(null);
    setAnimStep(-1);

    // Sort layers highest priority first for animation
    const active = CONFIG_LAYERS.filter((l) => activeLayers.has(l.id))
      .sort((a, b) => b.priority - a.priority);

    for (let i = 0; i < active.length; i++) {
      setAnimStep(i);
      await sleep(400);
      if (key in active[i].values) {
        // Found it
        const result = resolveKey(key, activeLayers);
        setLookupResult(result);
        setAnimStep(-1);
        setAnimating(false);
        return;
      }
    }

    // Not found
    setLookupResult(null);
    setAnimStep(-1);
    setAnimating(false);
  }, [animating, activeLayers]);

  const simulateFileChange = useCallback(async () => {
    setFileChanged(true);
    await sleep(800);
    setReloadVisible(true);
  }, []);

  const resetFileChange = () => {
    setFileChanged(false);
    setReloadVisible(false);
  };

  // Sorted layers for display (highest priority first = top of stack = overrides)
  const sortedLayers = [...CONFIG_LAYERS].sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-secondary">Toggle layers:</span>
        {CONFIG_LAYERS.map((layer) => {
          const active = activeLayers.has(layer.id);
          return (
            <button
              key={layer.id}
              onClick={() => toggleLayer(layer.id)}
              disabled={animating}
              className="px-2 py-1 rounded text-[10px] font-mono border transition-all duration-200 disabled:opacity-50"
              style={{
                borderColor: active ? layer.color : "#374151",
                backgroundColor: active ? `${layer.color}18` : "transparent",
                color: active ? layer.color : "#6b7280",
              }}
            >
              {layer.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Provider stack + key lookup */}
        <div className="lg:col-span-2 space-y-4">
          {/* Provider chain */}
          <Panel title="Configuration Provider Chain (higher = overrides lower)" accentColor={BLUE}>
            <div className="space-y-2">
              {sortedLayers.map((layer, idx) => {
                const active = activeLayers.has(layer.id);
                const isWinner = lookupResult?.winner.id === layer.id;
                const isLoser = lookupResult?.losers.some((l) => l.id === layer.id) ?? false;
                const isAnimating = animating && animStep === sortedLayers.length - 1 - idx;

                return (
                  <motion.div
                    key={layer.id}
                    animate={{
                      opacity: active ? 1 : 0.3,
                      x: isAnimating ? 6 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-3 p-3 rounded-lg border transition-colors"
                    style={{
                      borderColor: isWinner ? layer.color : isLoser ? "#374151" : active ? `${layer.color}30` : "#1f2937",
                      backgroundColor: isWinner ? `${layer.color}12` : "transparent",
                    }}
                  >
                    {/* Priority badge */}
                    <div
                      className="flex-shrink-0 w-5 h-5 rounded text-[9px] font-mono font-bold flex items-center justify-center"
                      style={{ backgroundColor: active ? `${layer.color}20` : "#1f2937", color: active ? layer.color : "#6b7280" }}
                    >
                      P{layer.priority}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className="text-xs font-mono font-semibold"
                        style={{ color: active ? layer.color : "#6b7280" }}
                      >
                        {layer.label}
                      </div>
                      <div className="text-[10px] text-text-secondary mt-0.5 truncate">{layer.description}</div>
                    </div>

                    {/* Value preview when key selected */}
                    {selectedKey && active && selectedKey in layer.values && (
                      <div
                        className="text-[10px] font-mono px-2 py-0.5 rounded border flex-shrink-0"
                        style={{
                          borderColor: isWinner ? layer.color : "#374151",
                          color: isWinner ? layer.color : "#6b7280",
                          backgroundColor: isWinner ? `${layer.color}15` : "transparent",
                          textDecoration: isLoser ? "line-through" : "none",
                        }}
                      >
                        {layer.values[selectedKey]}
                        {isWinner && <span className="ml-1">✓ wins</span>}
                      </div>
                    )}

                    {/* Pulse on active animation */}
                    {isAnimating && (
                      <motion.div
                        animate={{ scale: [1, 1.4, 1] }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: layer.color }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </Panel>

          {/* Key lookup */}
          <Panel title="Simulate Config Key Lookup" accentColor={BLUE}>
            <div className="flex flex-wrap gap-2 mb-3">
              {LOOKUP_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => runLookup(key)}
                  disabled={animating}
                  className="px-2 py-1 rounded text-[10px] font-mono border transition-all duration-200 disabled:opacity-50"
                  style={{
                    borderColor: selectedKey === key ? BLUE : "#374151",
                    backgroundColor: selectedKey === key ? `${BLUE}18` : "transparent",
                    color: selectedKey === key ? BLUE : "#9ca3af",
                  }}
                >
                  {key}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {lookupResult && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 rounded-lg border text-xs"
                  style={{
                    borderColor: `${lookupResult.winner.color}60`,
                    backgroundColor: `${lookupResult.winner.color}08`,
                  }}
                >
                  <div className="font-mono mb-1">
                    <span className="text-text-secondary">{lookupResult.key} = </span>
                    <span className="font-bold" style={{ color: lookupResult.winner.color }}>
                      &quot;{lookupResult.winner.values[lookupResult.key]}&quot;
                    </span>
                  </div>
                  <div className="text-text-secondary">
                    Source: <span style={{ color: lookupResult.winner.color }}>{lookupResult.winner.label}</span>
                    {lookupResult.losers.length > 0 && (
                      <span className="ml-2 line-through text-[10px]">
                        (overrides: {lookupResult.losers.map((l) => l.label).join(", ")})
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
              {!lookupResult && selectedKey && !animating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 rounded-lg border text-xs"
                  style={{ borderColor: RED, backgroundColor: `${RED}08`, color: RED }}
                >
                  Key &apos;{selectedKey}&apos; not found in active providers — IConfiguration[&apos;{selectedKey}&apos;] returns null
                </motion.div>
              )}
            </AnimatePresence>
          </Panel>
        </div>

        {/* Right: IOptions variants */}
        <div className="space-y-4">
          <Panel title="IOptions<T> Variants" accentColor={BLUE}>
            {/* Tabs */}
            <div className="flex gap-1 mb-3">
              {OPTIONS_VARIANTS.map((v) => {
                const active = selectedVariant === v;
                const meta = OPTIONS_META[v];
                return (
                  <button
                    key={v}
                    onClick={() => { setSelectedVariant(v); resetFileChange(); }}
                    className="flex-1 px-1 py-1.5 rounded text-[9px] font-mono font-semibold border transition-all"
                    style={{
                      borderColor: active ? meta.color : "#374151",
                      backgroundColor: active ? `${meta.color}20` : "transparent",
                      color: active ? meta.color : "#6b7280",
                    }}
                  >
                    {v.replace("IOptions", "IOptions\n")}
                  </button>
                );
              })}
            </div>

            {/* Variant details */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedVariant}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {(() => {
                  const meta = OPTIONS_META[selectedVariant];
                  return (
                    <>
                      <div className="p-2 rounded-lg border text-xs space-y-1" style={{ borderColor: `${meta.color}30`, backgroundColor: `${meta.color}08` }}>
                        <div className="font-mono font-bold" style={{ color: meta.color }}>{selectedVariant}&lt;T&gt;</div>
                        <div className="text-text-secondary">Lifetime: <span style={{ color: meta.color }}>{meta.lifetime}</span></div>
                        <div className="text-text-secondary">Reloads on change: <span style={{ color: meta.reloads ? GREEN : RED }}>{meta.reloads ? "Yes" : "No"}</span></div>
                        <div className="text-text-secondary text-[10px] mt-1 leading-relaxed">{meta.useCase}</div>
                      </div>

                      {/* File change simulation */}
                      <div className="mt-3">
                        <div className="text-[10px] text-text-secondary mb-2">Simulate appsettings.json change:</div>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            onClick={simulateFileChange}
                            disabled={fileChanged}
                          >
                            <span className="text-[10px]">Edit file</span>
                          </Button>
                          {fileChanged && (
                            <Button variant="ghost" onClick={resetFileChange}>
                              <span className="text-[10px]">Reset</span>
                            </Button>
                          )}
                        </div>

                        <AnimatePresence>
                          {fileChanged && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 space-y-1 text-[10px] font-mono overflow-hidden"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: YELLOW }} />
                                <span className="text-text-secondary">appsettings.json changed on disk</span>
                              </div>

                              {selectedVariant === "IOptions" && (
                                <div className="p-2 rounded border" style={{ borderColor: `${RED}40`, backgroundColor: `${RED}08`, color: RED }}>
                                  Not reloaded. .Value still returns startup snapshot. Restart required.
                                </div>
                              )}

                              {selectedVariant === "IOptionsSnapshot" && reloadVisible && (
                                <div className="p-2 rounded border" style={{ borderColor: `${BLUE}40`, backgroundColor: `${BLUE}08`, color: BLUE }}>
                                  Next HTTP request will get new value (scoped: re-resolved per request).
                                </div>
                              )}

                              {selectedVariant === "IOptionsMonitor" && reloadVisible && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="p-2 rounded border"
                                  style={{ borderColor: `${GREEN}40`, backgroundColor: `${GREEN}08`, color: GREEN }}
                                >
                                  CurrentValue updated in ~500ms. OnChange callbacks fired. No restart needed.
                                </motion.div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          </Panel>

          {/* Env var naming cheat sheet */}
          <Panel title="Env Var Separator Rules" accentColor={BLUE}>
            <div className="space-y-2 text-[10px] font-mono">
              <div className="text-text-secondary mb-1 font-sans text-xs">JSON key → Environment variable</div>
              {[
                { json: "EmailService:Host",    env: "EmailService__Host",    ok: true },
                { json: "EmailService:Port",    env: "EmailService_Port",     ok: false },
                { json: "Stripe:ApiKey",        env: "Stripe__ApiKey",        ok: true },
                { json: "Nested:Deep:Value",    env: "Nested__Deep__Value",   ok: true },
              ].map((row, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <div className="text-text-secondary">{row.json}</div>
                  <div className="flex items-center gap-1 pl-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: row.ok ? GREEN : RED }}
                    />
                    <span style={{ color: row.ok ? GREEN : RED }}>{row.env}</span>
                    {!row.ok && <span className="text-red-400"> ← wrong! (single _)</span>}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
