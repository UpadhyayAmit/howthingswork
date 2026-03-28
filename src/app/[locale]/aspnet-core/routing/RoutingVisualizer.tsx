"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";

const ACCENT = "#3b82f6";

interface RouteTemplate {
  id: string;
  method: string;
  template: string;
  action: string;
  params: Record<string, string>;
}

const CONTROLLER_ROUTES: RouteTemplate[] = [
  { id: "r1", method: "GET", template: "api/users", action: "UsersController.GetAll", params: {} },
  { id: "r2", method: "GET", template: "api/users/{id:int}", action: "UsersController.GetById", params: { id: "int" } },
  { id: "r3", method: "POST", template: "api/users", action: "UsersController.Create", params: {} },
  { id: "r4", method: "GET", template: "api/users/search", action: "UsersController.Search", params: {} },
  { id: "r5", method: "PUT", template: "api/users/{id:int}/roles/{roleName:alpha}", action: "UsersController.AssignRole", params: { id: "int", roleName: "alpha" } },
  { id: "r6", method: "DELETE", template: "api/users/{id:int}", action: "UsersController.Delete", params: { id: "int" } },
  { id: "r7", method: "GET", template: "api/users/{username}", action: "UsersController.GetByUsername", params: { username: "string" } },
];

const MINIMAL_API_ROUTES: RouteTemplate[] = [
  { id: "m1", method: "GET", template: "/api/users", action: "app.MapGet(\"/api/users\")", params: {} },
  { id: "m2", method: "GET", template: "/api/users/{id:int}", action: "app.MapGet(\"/api/users/{id:int}\")", params: { id: "int" } },
  { id: "m3", method: "POST", template: "/api/users", action: "app.MapPost(\"/api/users\")", params: {} },
  { id: "m4", method: "GET", template: "/api/users/{id:int}/posts", action: "app.MapGet(\"/api/users/{id:int}/posts\")", params: { id: "int" } },
  { id: "m5", method: "GET", template: "/api/users/{**slug}", action: "app.MapGet(\"/api/users/{**slug}\")", params: { slug: "catch-all" } },
];

type MatchResult = "match" | "no-match" | "constraint-fail" | "ambiguous" | "pending";

interface EvaluatedRoute {
  route: RouteTemplate;
  result: MatchResult;
  extractedParams: Record<string, string>;
  reason: string;
  score: number;
}

function matchRoute(route: RouteTemplate, method: string, url: string): { result: MatchResult; extractedParams: Record<string, string>; reason: string; score: number } {
  const normalizedUrl = url.startsWith("/") ? url.slice(1) : url;
  const routeTemplate = route.template.startsWith("/") ? route.template.slice(1) : route.template;

  if (route.method !== method.toUpperCase()) {
    return { result: "no-match", extractedParams: {}, reason: `Method mismatch: expected ${route.method}`, score: 0 };
  }

  const routeSegments = routeTemplate.split("/");
  const urlSegments = normalizedUrl.split("/");

  if (routeSegments.length !== urlSegments.length) {
    // Check for catch-all
    const hasCatchAll = routeSegments.some(s => s.startsWith("{**"));
    if (!hasCatchAll) {
      return { result: "no-match", extractedParams: {}, reason: `Segment count: route has ${routeSegments.length}, URL has ${urlSegments.length}`, score: 0 };
    }
  }

  const extractedParams: Record<string, string> = {};
  let score = 0;

  for (let i = 0; i < routeSegments.length; i++) {
    const routeSeg = routeSegments[i];
    const urlSeg = urlSegments[i] ?? "";

    if (routeSeg.startsWith("{**")) {
      // Catch-all
      const paramName = routeSeg.slice(3, -1);
      extractedParams[paramName] = urlSegments.slice(i).join("/");
      score += 1;
      continue;
    }

    if (routeSeg.startsWith("{")) {
      // Parameter segment
      const inner = routeSeg.slice(1, -1);
      const [paramName, ...constraints] = inner.split(":");
      const constraint = constraints.join(":");

      if (constraint === "int") {
        if (!/^-?\d+$/.test(urlSeg)) {
          return { result: "constraint-fail", extractedParams: {}, reason: `Constraint fail: "{${paramName}:int}" — "${urlSeg}" is not an integer`, score: 0 };
        }
        extractedParams[paramName] = urlSeg;
        score += 3; // constrained params score higher
      } else if (constraint === "alpha") {
        if (!/^[a-zA-Z]+$/.test(urlSeg)) {
          return { result: "constraint-fail", extractedParams: {}, reason: `Constraint fail: "{${paramName}:alpha}" — "${urlSeg}" contains non-alpha chars`, score: 0 };
        }
        extractedParams[paramName] = urlSeg;
        score += 3;
      } else {
        // Unconstrained
        extractedParams[paramName] = urlSeg;
        score += 2;
      }
    } else {
      // Literal
      if (routeSeg.toLowerCase() !== urlSeg.toLowerCase()) {
        return { result: "no-match", extractedParams: {}, reason: `Literal mismatch: expected "${routeSeg}", got "${urlSeg}"`, score: 0 };
      }
      score += 4; // literals score highest
    }
  }

  return { result: "match", extractedParams, reason: "All segments matched", score };
}

const PRESET_URLS = [
  { url: "/api/users", method: "GET" },
  { url: "/api/users/42", method: "GET" },
  { url: "/api/users/alice", method: "GET" },
  { url: "/api/users/search", method: "GET" },
  { url: "/api/users/42/roles/admin", method: "PUT" },
  { url: "/api/users/abc", method: "GET" },
  { url: "/api/users/42", method: "DELETE" },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "#22c55e",
  POST: "#3b82f6",
  PUT: "#f59e0b",
  DELETE: "#ef4444",
  PATCH: "#a855f7",
};

export default function RoutingVisualizer() {
  const [urlInput, setUrlInput] = useState("/api/users/42");
  const [methodInput, setMethodInput] = useState("GET");
  const [routingMode, setRoutingMode] = useState<"controller" | "minimal">("controller");
  const [evaluated, setEvaluated] = useState<EvaluatedRoute[]>([]);
  const [winner, setWinner] = useState<EvaluatedRoute | null>(null);
  const [ambiguous, setAmbiguous] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const routes = routingMode === "controller" ? CONTROLLER_ROUTES : MINIMAL_API_ROUTES;

  const runMatch = useCallback(() => {
    const results: EvaluatedRoute[] = routes.map(route => {
      const { result, extractedParams, reason, score } = matchRoute(route, methodInput, urlInput);
      return { route, result, extractedParams, reason, score };
    });

    setEvaluated(results);

    const matches = results.filter(r => r.result === "match");
    if (matches.length === 0) {
      setWinner(null);
      setAmbiguous(false);
    } else if (matches.length === 1) {
      setWinner(matches[0]);
      setAmbiguous(false);
    } else {
      // Sort by score, check for ambiguity
      matches.sort((a, b) => b.score - a.score);
      if (matches[0].score === matches[1].score) {
        setAmbiguous(true);
        setWinner(null);
      } else {
        setWinner(matches[0]);
        setAmbiguous(false);
      }
    }
    setHasRun(true);
  }, [routes, methodInput, urlInput]);

  const applyPreset = (preset: { url: string; method: string }) => {
    setUrlInput(preset.url);
    setMethodInput(preset.method);
    setEvaluated([]);
    setWinner(null);
    setAmbiguous(false);
    setHasRun(false);
  };

  const getResultColor = (result: MatchResult) => {
    switch (result) {
      case "match": return "#22c55e";
      case "no-match": return "#6b7280";
      case "constraint-fail": return "#f59e0b";
      case "ambiguous": return "#ef4444";
      default: return "#6b7280";
    }
  };

  const getResultLabel = (result: MatchResult) => {
    switch (result) {
      case "match": return "✓ MATCH";
      case "no-match": return "✗ no match";
      case "constraint-fail": return "⚠ constraint fail";
      default: return "–";
    }
  };

  return (
    <Panel title="Route Matching Simulator" accentColor={ACCENT}>
      <div className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => { setRoutingMode("controller"); setEvaluated([]); setWinner(null); setHasRun(false); }}
            className="px-3 py-1.5 rounded text-xs font-mono border transition-all"
            style={{
              borderColor: routingMode === "controller" ? ACCENT : "#374151",
              backgroundColor: routingMode === "controller" ? `${ACCENT}20` : "transparent",
              color: routingMode === "controller" ? ACCENT : "#9ca3af",
            }}
          >
            Controller Routing
          </button>
          <button
            onClick={() => { setRoutingMode("minimal"); setEvaluated([]); setWinner(null); setHasRun(false); }}
            className="px-3 py-1.5 rounded text-xs font-mono border transition-all"
            style={{
              borderColor: routingMode === "minimal" ? ACCENT : "#374151",
              backgroundColor: routingMode === "minimal" ? `${ACCENT}20` : "transparent",
              color: routingMode === "minimal" ? ACCENT : "#9ca3af",
            }}
          >
            Minimal API
          </button>
        </div>

        {/* URL Input */}
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex gap-0 flex-1 min-w-[280px]">
            <select
              value={methodInput}
              onChange={e => { setMethodInput(e.target.value); setEvaluated([]); setWinner(null); setHasRun(false); }}
              className="px-2 py-2 rounded-l border border-r-0 border-border bg-elevated text-xs font-mono focus:outline-none"
              style={{ color: METHOD_COLORS[methodInput] ?? "#fff" }}
            >
              {["GET", "POST", "PUT", "DELETE", "PATCH"].map(m => (
                <option key={m} value={m} style={{ color: METHOD_COLORS[m] }}>{m}</option>
              ))}
            </select>
            <input
              type="text"
              value={urlInput}
              onChange={e => { setUrlInput(e.target.value); setEvaluated([]); setWinner(null); setHasRun(false); }}
              onKeyDown={e => e.key === "Enter" && runMatch()}
              className="flex-1 px-3 py-2 rounded-r border border-border bg-elevated text-sm font-mono text-text-primary focus:outline-none focus:border-blue-500/50"
              placeholder="/api/users/42"
            />
          </div>
          <Button variant="primary" onClick={runMatch}>
            Match Route →
          </Button>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-text-secondary font-mono self-center">Try:</span>
          {PRESET_URLS.map((p, i) => (
            <button
              key={i}
              onClick={() => applyPreset(p)}
              className="text-xs px-2 py-1 rounded border border-border hover:border-blue-500/50 font-mono text-text-secondary hover:text-blue-400 transition-all"
            >
              <span style={{ color: METHOD_COLORS[p.method] }}>{p.method}</span> {p.url}
            </button>
          ))}
        </div>

        {/* Result Banner */}
        <AnimatePresence>
          {hasRun && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border p-3 font-mono text-sm"
              style={{
                borderColor: winner ? "#22c55e60" : ambiguous ? "#ef444460" : "#6b728060",
                backgroundColor: winner ? "#22c55e10" : ambiguous ? "#ef444410" : "#1a1a1a",
                color: winner ? "#22c55e" : ambiguous ? "#ef4444" : "#9ca3af",
              }}
            >
              {winner && (
                <div>
                  <div className="font-bold">✓ Matched: {winner.route.action}</div>
                  {Object.keys(winner.extractedParams).length > 0 && (
                    <div className="text-xs mt-1 text-green-400/70">
                      Extracted: {Object.entries(winner.extractedParams).map(([k, v]) => `${k} = "${v}"`).join(", ")}
                    </div>
                  )}
                  <div className="text-xs mt-1 text-green-400/50">Precedence score: {winner.score}</div>
                </div>
              )}
              {ambiguous && <div className="font-bold">⚠ AmbiguousMatchException — two routes scored equally. This throws at runtime!</div>}
              {!winner && !ambiguous && <div>✗ No route matched — would return 404 Not Found</div>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Route Table */}
        <div className="space-y-1.5">
          <div className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-2">
            {routes.length} registered routes
          </div>
          {routes.map((route, idx) => {
            const eval_ = evaluated.find(e => e.route.id === route.id);
            const isWinner = winner?.route.id === route.id;
            const result = eval_?.result ?? "pending";

            return (
              <motion.div
                key={route.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="rounded-lg border p-3 transition-all duration-300"
                style={{
                  borderColor: isWinner ? "#22c55e80" : result === "constraint-fail" ? "#f59e0b40" : result === "no-match" ? "#37415160" : "#374151",
                  backgroundColor: isWinner ? "#22c55e08" : result === "no-match" ? "#0a0a0a" : "#111",
                  opacity: result === "no-match" ? 0.6 : 1,
                  boxShadow: isWinner ? "0 0 16px #22c55e20" : "none",
                }}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Method badge */}
                  <span
                    className="text-xs font-bold font-mono px-2 py-0.5 rounded"
                    style={{
                      color: METHOD_COLORS[route.method],
                      backgroundColor: `${METHOD_COLORS[route.method]}15`,
                    }}
                  >
                    {route.method}
                  </span>

                  {/* Template */}
                  <code className="text-sm font-mono text-text-primary flex-1 min-w-0">
                    {route.template.split("/").map((seg, i) => (
                      <span key={i}>
                        {i > 0 && <span className="text-text-secondary">/</span>}
                        {seg.startsWith("{") ? (
                          <span style={{ color: "#f59e0b" }}>{seg}</span>
                        ) : (
                          <span>{seg}</span>
                        )}
                      </span>
                    ))}
                  </code>

                  {/* Match result */}
                  {eval_ && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-xs font-mono px-2 py-0.5 rounded font-bold"
                      style={{
                        color: getResultColor(result),
                        backgroundColor: `${getResultColor(result)}15`,
                      }}
                    >
                      {getResultLabel(result)}
                      {isWinner && ` (score: ${eval_.score})`}
                    </motion.span>
                  )}
                </div>

                {/* Reason */}
                {eval_ && result !== "match" && (
                  <p className="text-xs text-text-secondary mt-1.5 font-mono pl-1">
                    {eval_.reason}
                  </p>
                )}

                {/* Extracted params */}
                {isWinner && eval_ && Object.keys(eval_.extractedParams).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-2 flex flex-wrap gap-1.5"
                  >
                    {Object.entries(eval_.extractedParams).map(([k, v]) => (
                      <span
                        key={k}
                        className="text-xs font-mono px-2 py-0.5 rounded border"
                        style={{ borderColor: "#22c55e40", color: "#22c55e", backgroundColor: "#22c55e10" }}
                      >
                        {k} = &ldquo;{v}&rdquo;
                      </span>
                    ))}
                    <span className="text-xs font-mono text-text-secondary self-center">→ {route.action}</span>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
