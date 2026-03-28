"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Panel from "@/app/_ui/Panel";

interface ExceptionScenario {
  name: string;
  type: string;
  httpStatus: number;
  statusText: string;
  color: string;
  exceptionCode: string;
  problemTitle: string;
  problemType: string;
  problemDetail: string;
  extensions?: Record<string, string | number | string[]>;
}

const SCENARIOS: ExceptionScenario[] = [
  {
    name: "Validation Error",
    type: "ValidationException",
    httpStatus: 422,
    statusText: "Unprocessable Entity",
    color: "#f59e0b",
    exceptionCode: `throw new ValidationException(new[]
{
    new ValidationFailure("Email",
        "Email is not a valid address"),
    new ValidationFailure("Amount",
        "Amount must be positive"),
});`,
    problemTitle: "One or more validation errors occurred.",
    problemType: "https://tools.ietf.org/html/rfc9110#section-15.5.21",
    problemDetail: "See the errors property for details.",
    extensions: {
      errors: '{ "Email": ["not valid"], "Amount": ["must be positive"] }',
      traceId: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    },
  },
  {
    name: "Not Found",
    type: "NotFoundException",
    httpStatus: 404,
    statusText: "Not Found",
    color: "#6b7280",
    exceptionCode: `throw new NotFoundException(
    $"Order {orderId} not found");`,
    problemTitle: "The requested resource was not found.",
    problemType: "https://tools.ietf.org/html/rfc9110#section-15.5.5",
    problemDetail: "Order 8821 was not found or has been deleted.",
    extensions: {
      resourceType: "Order",
      resourceId: "8821",
      traceId: "00-a3f902b7577b34da6a3ce929d0e0e473-00f067aa0ba902b7-01",
    },
  },
  {
    name: "Unauthorized",
    type: "UnauthorizedException",
    httpStatus: 401,
    statusText: "Unauthorized",
    color: "#ef4444",
    exceptionCode: `throw new UnauthorizedException(
    "JWT token has expired");`,
    problemTitle: "Authentication is required.",
    problemType: "https://tools.ietf.org/html/rfc9110#section-15.5.2",
    problemDetail: "Your session has expired. Please re-authenticate.",
    extensions: {
      traceId: "00-b2f802a6477b34da6a3ce929d0e0e473-00f067aa0ba902b7-01",
    },
  },
  {
    name: "Unhandled Exception",
    type: "InvalidOperationException",
    httpStatus: 500,
    statusText: "Internal Server Error",
    color: "#dc2626",
    exceptionCode: `// No try/catch — unhandled
var result = await _repo.GetAsync(id);
// result is null but code assumes non-null
var total = result.Items.Sum(x => x.Price);`,
    problemTitle: "An unhandled error occurred.",
    problemType: "https://tools.ietf.org/html/rfc9110#section-15.6.1",
    problemDetail: "An unexpected error occurred. Use the traceId to report this issue.",
    extensions: {
      traceId: "00-c1f901b5367b34da6a3ce929d0e0e472-00f067aa0ba902b7-01",
    },
  },
];

interface PipelineStage {
  label: string;
  detail: string;
  handled: boolean;
  color: string;
}

function getPipeline(scenario: ExceptionScenario): PipelineStage[] {
  if (scenario.type === "ValidationException") {
    return [
      { label: "Controller Action throws ValidationException", detail: `throw new ValidationException(failures)`, handled: false, color: "#f59e0b" },
      { label: "Exception Filter catches it", detail: "[CustomExceptionFilter] — maps ValidationException → 422 ProblemDetails", handled: true, color: "#22c55e" },
      { label: "Exception Handling Middleware", detail: "Not reached — filter handled it first", handled: false, color: "#444" },
      { label: "UseExceptionHandler / IProblemDetailsService", detail: "Not reached", handled: false, color: "#444" },
    ];
  }
  if (scenario.type === "InvalidOperationException") {
    return [
      { label: "Controller Action throws unhandled exception", detail: `NullReferenceException propagates up`, handled: false, color: "#dc2626" },
      { label: "Exception Filter", detail: "No matching filter for this exception type — propagates", handled: false, color: "#ef444466" },
      { label: "Exception Handling Middleware catches it", detail: "UseExceptionHandler() catches all unhandled exceptions", handled: true, color: "#22c55e" },
      { label: "IProblemDetailsService writes 500 response", detail: "Stack trace STRIPPED in production. TraceIdentifier injected.", handled: true, color: "#22c55e" },
    ];
  }
  return [
    { label: "Controller Action throws domain exception", detail: `throw new ${scenario.type}(...)`, handled: false, color: scenario.color },
    { label: "Exception Filter — no match", detail: "Filter not registered for this type — bubbles up", handled: false, color: "#ef444466" },
    { label: "Global IExceptionHandler (.NET 8+)", detail: `Registered handler for ${scenario.type} — maps to ${scenario.httpStatus} ProblemDetails`, handled: true, color: "#22c55e" },
    { label: "UseExceptionHandler / UseProblemDetails", detail: "Fallback — not needed, IExceptionHandler handled it", handled: false, color: "#444" },
  ];
}

const BAD_RESPONSE = (scenario: ExceptionScenario) => `HTTP/1.1 500 Internal Server Error
Content-Type: text/html

<!DOCTYPE html>
<html>
<head><title>Unhandled Exception</title></head>
<body>
  <h1>${scenario.type}</h1>
  <p>${scenario.type === "InvalidOperationException"
    ? "Object reference not set to an instance of an object."
    : `Unhandled exception of type '${scenario.type}'`}</p>
  <pre>
   at OrderService.ProcessAsync(Guid orderId)
   at OrdersController.Post(CreateOrderRequest req)
   at lambda_method42(Closure, Object, Object[])
   -- CONNECTION STRING: Server=prod-db.internal;
   -- User ID=sa;Password=Sup3rS3cret!;
  </pre>
</body>
</html>`;

const GOOD_RESPONSE = (scenario: ExceptionScenario) => `HTTP/1.1 ${scenario.httpStatus} ${scenario.statusText}
Content-Type: application/problem+json
${scenario.type === "NotFoundException" ? "Cache-Control: no-store\n" : ""}
{
  "type": "${scenario.problemType}",
  "title": "${scenario.problemTitle}",
  "status": ${scenario.httpStatus},
  "detail": "${scenario.problemDetail}",
  "instance": "/api/orders/${scenario.type === "NotFoundException" ? "8821" : "current-request"}",
${Object.entries(scenario.extensions ?? {}).map(([k, v]) => `  "${k}": ${typeof v === "string" ? `"${v}"` : JSON.stringify(v)}`).join(",\n")}
}`;

export default function ErrorHandlingVisualizer() {
  const [selected, setSelected] = useState<ExceptionScenario>(SCENARIOS[0]);
  const [view, setView] = useState<"bad" | "good">("good");

  const pipeline = getPipeline(selected);

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Exception selector */}
      <div className="flex flex-wrap gap-2 p-4 bg-elevated border border-border rounded-xl items-center">
        <span className="text-text-secondary text-[11px] uppercase tracking-widest mr-2">Throw exception:</span>
        {SCENARIOS.map((s) => (
          <button
            key={s.type}
            onClick={() => setSelected(s)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border"
            style={{
              borderColor: selected.type === s.type ? s.color : "#333",
              color: selected.type === s.type ? s.color : "#6b7280",
              background: selected.type === s.type ? s.color + "22" : "transparent",
            }}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Exception thrown */}
        <Panel title="① Exception Thrown" accentColor="#3b82f6">
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.type}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="p-3 rounded-lg border"
                style={{ borderColor: selected.color + "44", background: selected.color + "08" }}>
                <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: selected.color }}>
                  {selected.type}
                </div>
                <div className="text-[10px] text-text-secondary">HTTP {selected.httpStatus} {selected.statusText}</div>
              </div>
              <div className="rounded-lg bg-[#0d0d0d] border border-border p-3">
                <div className="text-[9px] text-text-secondary uppercase tracking-widest mb-2">Controller action</div>
                <pre className="text-[10px] text-[#fca5a5] whitespace-pre-wrap leading-relaxed">{selected.exceptionCode}</pre>
              </div>
            </motion.div>
          </AnimatePresence>
        </Panel>

        {/* Middle: Pipeline */}
        <Panel title="② Exception Handling Pipeline" accentColor="#3b82f6">
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.type + "-pipeline"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {pipeline.map((stage, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-3 p-3 rounded-lg border"
                  style={{
                    borderColor: stage.handled ? "#22c55e44" : stage.color === "#444" ? "#33333366" : stage.color + "44",
                    background: stage.handled ? "#22c55e08" : stage.color === "#444" ? "transparent" : "transparent",
                    opacity: stage.color === "#444" ? 0.4 : 1,
                  }}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {stage.handled ? (
                      <div className="w-4 h-4 rounded-full bg-[#22c55e22] border border-[#22c55e] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                      </div>
                    ) : stage.color === "#444" ? (
                      <div className="w-4 h-4 rounded-full border border-[#444]" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border flex items-center justify-center"
                        style={{ borderColor: stage.color }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: stage.color }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold mb-0.5" style={{ color: stage.handled ? "#22c55e" : stage.color === "#444" ? "#444" : stage.color }}>
                      {stage.label}
                    </div>
                    <div className="text-[10px] text-text-secondary leading-relaxed">{stage.detail}</div>
                  </div>
                </motion.div>
              ))}

              {/* IExceptionHandler snippet */}
              <div className="mt-3 rounded-lg bg-[#0d0d0d] border border-border p-3">
                <div className="text-[9px] text-text-secondary uppercase tracking-widest mb-2">IExceptionHandler (.NET 8+)</div>
                <pre className="text-[10px] text-[#d1d5db] whitespace-pre-wrap leading-relaxed">{`public class DomainExceptionHandler
    : IExceptionHandler
{
  public async ValueTask<bool> TryHandleAsync(
    HttpContext ctx,
    Exception ex,
    CancellationToken ct)
  {
    if (ex is not DomainException de)
      return false; // pass to next handler

    await ctx.Response
      .WriteAsJsonAsync(new ProblemDetails
      {
        Type = de.ProblemType,
        Title = de.Title,
        Status = de.StatusCode,
        Detail = de.Message,
        Instance = ctx.Request.Path,
        Extensions =
        {
          ["traceId"] =
            ctx.TraceIdentifier,
        }
      }, ct);
    return true;
  }
}`}</pre>
              </div>
            </motion.div>
          </AnimatePresence>
        </Panel>

        {/* Right: Response comparison */}
        <Panel title="③ HTTP Response" accentColor="#3b82f6">
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setView("bad")}
                className="flex-1 px-3 py-2 rounded-lg border text-[11px] font-bold transition-all"
                style={{
                  borderColor: view === "bad" ? "#ef4444" : "#333",
                  color: view === "bad" ? "#ef4444" : "#6b7280",
                  background: view === "bad" ? "#ef444411" : "transparent",
                }}
              >
                Bad (raw exception)
              </button>
              <button
                onClick={() => setView("good")}
                className="flex-1 px-3 py-2 rounded-lg border text-[11px] font-bold transition-all"
                style={{
                  borderColor: view === "good" ? "#22c55e" : "#333",
                  color: view === "good" ? "#22c55e" : "#6b7280",
                  background: view === "good" ? "#22c55e11" : "transparent",
                }}
              >
                Good (Problem Details)
              </button>
            </div>

            <AnimatePresence mode="wait">
              {view === "bad" ? (
                <motion.div
                  key="bad"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg bg-[#0d0d0d] border border-[#ef444444] p-3 space-y-2"
                >
                  <div className="text-[9px] text-[#ef4444] uppercase tracking-widest">Leaking internal details!</div>
                  <pre className="text-[10px] text-[#fca5a5] whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {BAD_RESPONSE(selected)}
                  </pre>
                  <div className="p-2 rounded bg-[#ef444411] border border-[#ef444433]">
                    <div className="text-[10px] text-[#ef4444] leading-relaxed">
                      Stack trace exposed. Connection string visible. No structured format. Client cannot parse this programmatically.
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="good"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg bg-[#0d0d0d] border border-[#22c55e44] p-3 space-y-2"
                >
                  <div className="text-[9px] text-[#22c55e] uppercase tracking-widest">RFC 9457 Problem Details</div>
                  <pre className="text-[10px] text-[#86efac] whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {GOOD_RESPONSE(selected)}
                  </pre>
                  <div className="p-2 rounded bg-[#22c55e11] border border-[#22c55e33]">
                    <div className="text-[10px] text-[#86efac] leading-relaxed">
                      Structured JSON. No stack traces. TraceId for support correlation. Type URI is machine-parseable.
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Panel>
      </div>

      {/* RFC 9457 field anatomy */}
      <div className="p-4 rounded-xl border border-border bg-elevated">
        <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-3">RFC 9457 Problem Details — Field Reference</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { field: "type", desc: "URI identifying the error type. Machine-parseable. Clients switch on this.", color: "#3b82f6" },
            { field: "title", desc: "Short human-readable summary. Should NOT change per occurrence.", color: "#8b5cf6" },
            { field: "status", desc: "HTTP status code (mirrors response status). Included for JSON consumers that don't inspect headers.", color: "#f59e0b" },
            { field: "detail", desc: "Human-readable explanation specific to THIS occurrence. Safe to show to users.", color: "#22c55e" },
            { field: "instance", desc: "URI identifying the specific occurrence. Usually the request path.", color: "#60a5fa" },
            { field: "extensions", desc: "Custom properties: traceId, errors, resourceId, etc. Any JSON value.", color: "#a78bfa" },
          ].map((f) => (
            <div key={f.field} className="p-3 rounded-lg border border-border bg-[#1a1a1a]">
              <div className="text-[11px] font-bold mb-1" style={{ color: f.color }}>{f.field}</div>
              <div className="text-[10px] text-text-secondary leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
