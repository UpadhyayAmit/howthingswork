"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";

const ACCENT = "#3b82f6";

interface RequestField {
  id: string;
  source: "route" | "query" | "body" | "header" | "form";
  key: string;
  value: string;
  editable: boolean;
}

interface ModelProperty {
  id: string;
  name: string;
  type: string;
  bindingSource: "route" | "query" | "body" | "header" | "form";
  bindingKey: string;
  validations: ValidationRule[];
}

interface ValidationRule {
  name: string;
  check: (val: string) => boolean;
  errorMsg: string;
}

interface BindingResult {
  propertyId: string;
  sourceFieldId: string | null;
  value: string | null;
  validationErrors: string[];
}

const SOURCE_COLORS: Record<string, string> = {
  route: "#f59e0b",
  query: "#3b82f6",
  body: "#a855f7",
  header: "#22c55e",
  form: "#ec4899",
};

const SOURCE_LABELS: Record<string, string> = {
  route: "Route",
  query: "Query",
  body: "Body",
  header: "Header",
  form: "Form",
};

const DEFAULT_REQUEST: RequestField[] = [
  { id: "r-id", source: "route", key: "id", value: "42", editable: true },
  { id: "q-source", source: "query", key: "source", value: "web", editable: true },
  { id: "h-idem", source: "header", key: "X-Idempotency-Key", value: "req-abc-123", editable: true },
  { id: "b-product", source: "body", key: "productName", value: "Laptop Pro", editable: true },
  { id: "b-qty", source: "body", key: "quantity", value: "3", editable: true },
  { id: "b-email", source: "body", key: "customerEmail", value: "alice@example.com", editable: true },
];

const MODEL_PROPERTIES: ModelProperty[] = [
  {
    id: "p-id",
    name: "int id",
    type: "int",
    bindingSource: "route",
    bindingKey: "id",
    validations: [
      { name: "[Range(1, int.MaxValue)]", check: v => parseInt(v) >= 1, errorMsg: "Must be >= 1" },
    ],
  },
  {
    id: "p-source",
    name: "string? source",
    type: "string?",
    bindingSource: "query",
    bindingKey: "source",
    validations: [],
  },
  {
    id: "p-idem",
    name: "string? IdempotencyKey",
    type: "string?",
    bindingSource: "header",
    bindingKey: "X-Idempotency-Key",
    validations: [],
  },
  {
    id: "p-product",
    name: "string ProductName",
    type: "string",
    bindingSource: "body",
    bindingKey: "productName",
    validations: [
      { name: "[Required]", check: v => v.trim().length > 0, errorMsg: "The ProductName field is required." },
      { name: "[StringLength(100, MinimumLength = 1)]", check: v => v.length >= 1 && v.length <= 100, errorMsg: "Length must be 1-100 chars." },
    ],
  },
  {
    id: "p-qty",
    name: "int Quantity",
    type: "int",
    bindingSource: "body",
    bindingKey: "quantity",
    validations: [
      { name: "[Required]", check: v => v.trim().length > 0, errorMsg: "The Quantity field is required." },
      { name: "[Range(1, 10000)]", check: v => { const n = parseInt(v); return !isNaN(n) && n >= 1 && n <= 10000; }, errorMsg: "Must be between 1 and 10000." },
    ],
  },
  {
    id: "p-email",
    name: "string CustomerEmail",
    type: "string",
    bindingSource: "body",
    bindingKey: "customerEmail",
    validations: [
      { name: "[Required]", check: v => v.trim().length > 0, errorMsg: "The CustomerEmail field is required." },
      { name: "[EmailAddress]", check: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), errorMsg: "Invalid email address format." },
    ],
  },
];

type Phase = "idle" | "binding" | "validating" | "done";

export default function ModelBindingVisualizer() {
  const [requestFields, setRequestFields] = useState<RequestField[]>(DEFAULT_REQUEST);
  const [bindingResults, setBindingResults] = useState<BindingResult[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeArrows, setActiveArrows] = useState<Set<string>>(new Set());
  const [validationPhase, setValidationPhase] = useState(false);
  const [modelStateValid, setModelStateValid] = useState<boolean | null>(null);

  const updateField = useCallback((id: string, value: string) => {
    setRequestFields(prev => prev.map(f => f.id === id ? { ...f, value } : f));
    setBindingResults([]);
    setPhase("idle");
    setActiveArrows(new Set());
    setValidationPhase(false);
    setModelStateValid(null);
  }, []);

  const runBinding = useCallback(async () => {
    setPhase("binding");
    setBindingResults([]);
    setActiveArrows(new Set());
    setValidationPhase(false);
    setModelStateValid(null);

    const results: BindingResult[] = [];
    const newArrows = new Set<string>();

    for (const prop of MODEL_PROPERTIES) {
      await new Promise(r => setTimeout(r, 300));
      const sourceField = requestFields.find(
        f => f.source === prop.bindingSource && f.key === prop.bindingKey
      );
      const arrowKey = `${sourceField?.id ?? "none"}->${prop.id}`;
      newArrows.add(arrowKey);
      setActiveArrows(new Set(newArrows));

      results.push({
        propertyId: prop.id,
        sourceFieldId: sourceField?.id ?? null,
        value: sourceField?.value ?? null,
        validationErrors: [],
      });
      setBindingResults([...results]);
    }

    // Validation phase
    await new Promise(r => setTimeout(r, 400));
    setPhase("validating");
    setValidationPhase(true);

    const validatedResults: BindingResult[] = results.map(r => {
      const prop = MODEL_PROPERTIES.find(p => p.id === r.propertyId)!;
      const errors: string[] = [];

      if (r.value === null && prop.validations.some(v => v.name.includes("[Required]"))) {
        errors.push(`The ${prop.name} field is required.`);
      } else if (r.value !== null) {
        for (const validation of prop.validations) {
          if (!validation.check(r.value)) {
            errors.push(validation.errorMsg);
          }
        }
      }

      return { ...r, validationErrors: errors };
    });

    setBindingResults(validatedResults);
    const allValid = validatedResults.every(r => r.validationErrors.length === 0);
    setModelStateValid(allValid);
    setPhase("done");
  }, [requestFields]);

  const reset = useCallback(() => {
    setRequestFields(DEFAULT_REQUEST);
    setBindingResults([]);
    setPhase("idle");
    setActiveArrows(new Set());
    setValidationPhase(false);
    setModelStateValid(null);
  }, []);

  const getResult = (propId: string) => bindingResults.find(r => r.propertyId === propId);

  return (
    <Panel title="Model Binding & Validation Visualizer" accentColor={ACCENT}>
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="primary" onClick={runBinding} disabled={phase === "binding" || phase === "validating"}>
            {phase === "binding" ? "Binding…" : phase === "validating" ? "Validating…" : "▶ Bind & Validate"}
          </Button>
          <Button variant="secondary" onClick={reset} disabled={phase === "binding" || phase === "validating"}>
            Reset
          </Button>
          <span className="text-xs font-mono text-text-secondary">
            Edit request values, then click Bind & Validate
          </span>
        </div>

        {/* ModelState banner */}
        <AnimatePresence>
          {modelStateValid !== null && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border p-3 font-mono text-sm font-bold"
              style={{
                borderColor: modelStateValid ? "#22c55e60" : "#ef444460",
                backgroundColor: modelStateValid ? "#22c55e10" : "#ef444410",
                color: modelStateValid ? "#22c55e" : "#ef4444",
              }}
            >
              {modelStateValid
                ? "✓ ModelState.IsValid = true — action executes normally"
                : "✗ ModelState.IsValid = false — [ApiController] returns 400 ProblemDetails automatically"}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: HTTP Request */}
          <div className="space-y-2">
            <div className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-3">
              HTTP Request
            </div>

            {(["route", "query", "header", "body"] as const).map(source => {
              const fields = requestFields.filter(f => f.source === source);
              if (fields.length === 0) return null;
              return (
                <div key={source} className="rounded-lg border border-border overflow-hidden">
                  <div
                    className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest font-bold"
                    style={{ backgroundColor: `${SOURCE_COLORS[source]}15`, color: SOURCE_COLORS[source] }}
                  >
                    [{SOURCE_LABELS[source]}]
                    {source === "route" && " /api/orders/{id}"}
                    {source === "query" && " ?source=web"}
                    {source === "header" && " HTTP Headers"}
                    {source === "body" && " application/json"}
                  </div>
                  <div className="p-2 space-y-1.5">
                    {fields.map(field => {
                      const isAnimating = Array.from(activeArrows).some(a => a.startsWith(field.id));
                      return (
                        <motion.div
                          key={field.id}
                          animate={isAnimating ? { x: [0, 4, 0] } : {}}
                          transition={{ duration: 0.3 }}
                          className="flex gap-2 items-center"
                        >
                          <span
                            className="text-xs font-mono w-28 flex-shrink-0"
                            style={{ color: SOURCE_COLORS[source] }}
                          >
                            &quot;{field.key}&quot;:
                          </span>
                          <input
                            type="text"
                            value={field.value}
                            onChange={e => updateField(field.id, e.target.value)}
                            className="flex-1 text-xs font-mono px-2 py-1 rounded border border-border bg-black/30 text-text-primary focus:outline-none focus:border-blue-500/50"
                            style={{
                              borderColor: isAnimating ? SOURCE_COLORS[source] : undefined,
                              boxShadow: isAnimating ? `0 0 8px ${SOURCE_COLORS[source]}40` : undefined,
                            }}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: C# Model */}
          <div className="space-y-2">
            <div className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-3">
              C# Action Parameters + Model
            </div>
            {MODEL_PROPERTIES.map(prop => {
              const result = getResult(prop.id);
              const hasErrors = (result?.validationErrors.length ?? 0) > 0;
              const isBound = result !== undefined && result.value !== null;
              const isAnimating = Array.from(activeArrows).some(a => a.endsWith(`->${prop.id}`));

              return (
                <motion.div
                  key={prop.id}
                  layout
                  className="rounded-lg border p-3 transition-all duration-300"
                  style={{
                    borderColor: hasErrors
                      ? "#ef444460"
                      : isBound && validationPhase
                      ? "#22c55e60"
                      : isAnimating
                      ? `${SOURCE_COLORS[prop.bindingSource]}80`
                      : "#374151",
                    backgroundColor: hasErrors
                      ? "#ef444410"
                      : isBound && validationPhase
                      ? "#22c55e08"
                      : "#111",
                    boxShadow: isAnimating ? `0 0 10px ${SOURCE_COLORS[prop.bindingSource]}30` : "none",
                  }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Binding source badge */}
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold"
                      style={{
                        color: SOURCE_COLORS[prop.bindingSource],
                        backgroundColor: `${SOURCE_COLORS[prop.bindingSource]}15`,
                      }}
                    >
                      [{SOURCE_LABELS[prop.bindingSource]}]
                    </span>
                    <code className="text-sm font-mono text-text-primary">{prop.name}</code>

                    {/* Bound value */}
                    {result?.value !== null && result?.value !== undefined && (
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-xs font-mono px-2 py-0.5 rounded"
                        style={{
                          color: hasErrors ? "#ef4444" : "#22c55e",
                          backgroundColor: hasErrors ? "#ef444415" : "#22c55e15",
                        }}
                      >
                        = &quot;{result.value}&quot;
                      </motion.span>
                    )}

                    {/* Null */}
                    {result !== undefined && result.value === null && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs font-mono text-gray-500"
                      >
                        = null (not found in request)
                      </motion.span>
                    )}
                  </div>

                  {/* Validation rules */}
                  {prop.validations.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {prop.validations.map((v, i) => {
                        const failed = result?.validationErrors.some(e => e === v.errorMsg);
                        const passed = validationPhase && !failed && result !== undefined;
                        return (
                          <span
                            key={i}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded border transition-all"
                            style={{
                              borderColor: failed ? "#ef4444" : passed ? "#22c55e60" : "#374151",
                              color: failed ? "#ef4444" : passed ? "#22c55e" : "#6b7280",
                              backgroundColor: failed ? "#ef444410" : passed ? "#22c55e10" : "transparent",
                            }}
                          >
                            {passed ? "✓ " : failed ? "✗ " : ""}{v.name}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Validation errors */}
                  <AnimatePresence>
                    {hasErrors && result?.validationErrors.map((err, i) => (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-red-400 font-mono mt-1.5"
                      >
                        ⚠ {err}
                      </motion.p>
                    ))}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-text-secondary font-mono">
          Try clearing the customerEmail or setting quantity to 0 or 99999 to trigger validation errors.
          Notice how [ApiController] auto-returns 400 without any code in your action.
        </p>
      </div>
    </Panel>
  );
}
