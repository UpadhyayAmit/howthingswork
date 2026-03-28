"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Panel from "@/app/_ui/Panel";

type VersioningStrategy = "url" | "query" | "header";

interface ControllerVersion {
  version: string;
  deprecated: boolean;
  sunsetDate?: string;
  description: string;
  responseShape: string;
}

const CONTROLLER_VERSIONS: ControllerVersion[] = [
  {
    version: "1.0",
    deprecated: true,
    sunsetDate: "2024-06-01",
    description: "UsersV1Controller",
    responseShape: '{ "id": 1, "name": "Alice" }',
  },
  {
    version: "2.0",
    deprecated: true,
    sunsetDate: "2025-01-01",
    description: "UsersV2Controller",
    responseShape: '{ "id": 1, "firstName": "Alice", "lastName": "Smith", "email": "..." }',
  },
  {
    version: "3.0",
    deprecated: false,
    description: "UsersV3Controller",
    responseShape: '{ "id": 1, "firstName": "Alice", "lastName": "Smith", "email": "...", "roles": [...] }',
  },
  {
    version: "4.0",
    deprecated: false,
    description: "UsersV4Controller",
    responseShape: '{ "data": { "id": 1, ... }, "meta": { "links": {...} } }',
  },
];

const STRATEGY_CONFIGS: Record<VersioningStrategy, { label: string; description: string; exampleFn: (v: string) => string; extractLabel: string; cacheNote: string }> = {
  url: {
    label: "URL Path",
    description: "Version embedded in the URL segment",
    exampleFn: (v) => `GET /api/v${v}/users/1`,
    extractLabel: "Extract from route segment: /api/v{version}/",
    cacheNote: "CDN-friendly: each version is a distinct URL. But changing version means updating every client URL.",
  },
  query: {
    label: "Query String",
    description: "Version passed as a query parameter",
    exampleFn: (v) => `GET /api/users/1?api-version=${v}`,
    extractLabel: "Extract from query: ?api-version={version}",
    cacheNote: "CDNs may or may not cache per query string. Can be ignored by proxies. Easy to test in browser.",
  },
  header: {
    label: "HTTP Header",
    description: "Version in a custom request header",
    exampleFn: (v) => `GET /api/users/1\napi-version: ${v}`,
    extractLabel: "Extract from header: api-version: {version}",
    cacheNote: "Cleanest URLs. CDN caching requires Vary: api-version header. Harder to test without tooling.",
  },
};

const DEPRECATED_RESPONSE_HEADERS = (v: ControllerVersion) =>
  v.deprecated
    ? [
        `Sunset: ${v.sunsetDate}`,
        `Deprecation: true`,
        `Link: </api/v4/users>; rel="successor-version"`,
      ]
    : [];

export default function ApiVersioningVisualizer() {
  const [strategy, setStrategy] = useState<VersioningStrategy>("url");
  const [inputVersion, setInputVersion] = useState("3.0");
  const [showResponse, setShowResponse] = useState(false);

  const config = STRATEGY_CONFIGS[strategy];
  const matched = CONTROLLER_VERSIONS.find((v) => v.version === inputVersion);
  const deprecationHeaders = matched ? DEPRECATED_RESPONSE_HEADERS(matched) : [];

  const handleVersionChange = (v: string) => {
    setInputVersion(v);
    setShowResponse(false);
    setTimeout(() => setShowResponse(true), 300);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Strategy tabs */}
      <div className="flex gap-2 p-1 bg-elevated border border-border rounded-xl w-fit">
        {(["url", "query", "header"] as VersioningStrategy[]).map((s) => (
          <button
            key={s}
            onClick={() => { setStrategy(s); setShowResponse(false); }}
            className="px-4 py-2 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              background: strategy === s ? "#3b82f6" : "transparent",
              color: strategy === s ? "#fff" : "#6b7280",
            }}
          >
            {STRATEGY_CONFIGS[s].label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Step 1: HTTP Request */}
        <Panel title="① Incoming HTTP Request" accentColor="#3b82f6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-[10px] text-text-secondary uppercase tracking-widest mb-3">Select API Version:</div>
              <div className="flex flex-wrap gap-2">
                {CONTROLLER_VERSIONS.map((cv) => (
                  <button
                    key={cv.version}
                    onClick={() => handleVersionChange(cv.version)}
                    className="px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all"
                    style={{
                      borderColor: inputVersion === cv.version ? "#3b82f6" : cv.deprecated ? "#ef444466" : "#333",
                      color: inputVersion === cv.version ? "#3b82f6" : cv.deprecated ? "#ef4444" : "#6b7280",
                      background: inputVersion === cv.version ? "#3b82f622" : "transparent",
                    }}
                  >
                    v{cv.version}
                    {cv.deprecated && <span className="ml-1 text-[9px] text-[#f59e0b]">DEPRECATED</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-[#0d0d0d] border border-border p-3">
              <div className="text-[10px] text-text-secondary mb-2 uppercase tracking-widest">HTTP Request</div>
              <pre className="text-[11px] text-[#86efac] whitespace-pre-wrap leading-relaxed">
                {config.exampleFn(inputVersion)}
              </pre>
              {strategy === "header" && (
                <div className="mt-2 text-[10px] text-[#60a5fa]">
                  Host: api.example.com<br />
                  Accept: application/json
                </div>
              )}
            </div>

            <div className="text-[10px] text-text-secondary leading-relaxed p-3 bg-[#3b82f611] rounded-lg border border-[#3b82f633]">
              {config.description}. {config.cacheNote}
            </div>
          </div>
        </Panel>

        {/* Step 2: Version extraction + routing */}
        <Panel title="② Version Extraction & Routing" accentColor="#3b82f6">
          <div className="space-y-3">
            {/* Pipeline steps */}
            {[
              {
                label: "1. ApiVersioningMiddleware reads request",
                detail: config.extractLabel,
                color: "#8b5cf6",
              },
              {
                label: "2. Version parsed and validated",
                detail: matched
                  ? `Found: ApiVersion(${inputVersion})`
                  : `No match for ${inputVersion} — returns 400 Bad Request`,
                color: matched ? "#22c55e" : "#ef4444",
              },
              {
                label: "3. MapToApiVersion routes to controller",
                detail: matched
                  ? `[MapToApiVersion("${inputVersion}")] → ${matched.description}`
                  : "No [MapToApiVersion] attribute matches",
                color: matched ? "#3b82f6" : "#ef4444",
              },
              {
                label: "4. Default version fallback",
                detail: "If no version specified: uses ApiVersioningOptions.DefaultApiVersion (e.g. 1.0). AssumeDefaultVersionWhenUnspecified must be true.",
                color: "#f59e0b",
              },
            ].map((step, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-[#1a1a1a] border border-border">
                <div className="w-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: step.color, minHeight: "100%" }} />
                <div>
                  <div className="text-[10px] font-bold mb-1" style={{ color: step.color }}>{step.label}</div>
                  <div className="text-[10px] text-text-secondary leading-relaxed">{step.detail}</div>
                </div>
              </div>
            ))}

            {/* Asp.Versioning.Mvc config snippet */}
            <div className="rounded-lg bg-[#0d0d0d] border border-border p-3 mt-2">
              <div className="text-[9px] text-text-secondary uppercase tracking-widest mb-2">Program.cs</div>
              <pre className="text-[10px] text-[#d1d5db] leading-relaxed whitespace-pre-wrap">{`builder.Services.AddApiVersioning(opt =>
{
  opt.DefaultApiVersion = new ApiVersion(1, 0);
  opt.AssumeDefaultVersionWhenUnspecified = true;
  opt.ReportApiVersions = true;
  opt.ApiVersionReader = ${
    strategy === "url"
      ? "new UrlSegmentApiVersionReader()"
      : strategy === "query"
      ? 'new QueryStringApiVersionReader("api-version")'
      : 'new HeaderApiVersionReader("api-version")'
  };
}).AddMvc();`}</pre>
            </div>
          </div>
        </Panel>

        {/* Step 3: Response */}
        <Panel title="③ Response" accentColor="#3b82f6">
          <AnimatePresence mode="wait">
            {matched ? (
              <motion.div
                key={`${inputVersion}-${strategy}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {/* Controller hit */}
                <div className="p-3 rounded-lg border border-[#22c55e44] bg-[#22c55e08]">
                  <div className="text-[10px] text-[#22c55e] uppercase tracking-widest mb-1">Controller Resolved</div>
                  <div className="text-[11px] font-bold text-[#d1d5db]">{matched.description}</div>
                </div>

                {/* Response headers */}
                <div className="rounded-lg bg-[#0d0d0d] border border-border p-3">
                  <div className="text-[9px] text-text-secondary uppercase tracking-widest mb-2">Response Headers</div>
                  <div className="space-y-1 text-[10px]">
                    <div className="text-[#60a5fa]">HTTP/1.1 200 OK</div>
                    <div className="text-[#d1d5db]">api-supported-versions: 1.0, 2.0, 3.0, 4.0</div>
                    <div className="text-[#d1d5db]">api-deprecated-versions: 1.0, 2.0</div>
                    {deprecationHeaders.map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="text-[#f59e0b]"
                      >
                        {h}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Deprecation warning */}
                {matched.deprecated && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 rounded-lg border border-[#f59e0b44] bg-[#f59e0b08]"
                  >
                    <div className="text-[10px] text-[#f59e0b] font-bold mb-1">DEPRECATED VERSION</div>
                    <div className="text-[10px] text-text-secondary leading-relaxed">
                      Sunset date: {matched.sunsetDate}. Clients still work but should migrate to v4.0. The Sunset header signals this per RFC 8594.
                    </div>
                  </motion.div>
                )}

                {/* Response body */}
                <div className="rounded-lg bg-[#0d0d0d] border border-border p-3">
                  <div className="text-[9px] text-text-secondary uppercase tracking-widest mb-2">Response Body (shape)</div>
                  <pre className="text-[10px] text-[#86efac] whitespace-pre-wrap leading-relaxed">{matched.responseShape}</pre>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-lg border border-[#ef444444] bg-[#ef444408] space-y-2"
              >
                <div className="text-[#ef4444] font-bold text-[11px]">400 Bad Request</div>
                <pre className="text-[10px] text-[#fca5a5] whitespace-pre-wrap">{JSON.stringify({
                  type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
                  title: "Unsupported API version",
                  status: 400,
                  detail: `The HTTP resource that matches the request URI 'api/v${inputVersion}/users' does not support the API version '${inputVersion}'.`,
                }, null, 2)}</pre>
              </motion.div>
            )}
          </AnimatePresence>
        </Panel>
      </div>

      {/* Controller code anatomy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border bg-elevated">
          <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-3">Controller-Based Versioning</div>
          <pre className="text-[10px] text-[#d1d5db] leading-relaxed whitespace-pre-wrap">{`[ApiController]
[Route("api/v{version:apiVersion}/users")]
[ApiVersion("3.0")]
[ApiVersion("2.0", Deprecated = true)]
public class UsersController : ControllerBase
{
    [HttpGet("{id}")]
    [MapToApiVersion("3.0")]
    public IActionResult GetV3(int id) { ... }

    [HttpGet("{id}")]
    [MapToApiVersion("2.0")]
    public IActionResult GetV2(int id) { ... }
}`}</pre>
        </div>
        <div className="p-4 rounded-xl border border-border bg-elevated">
          <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-3">Minimal API Version Sets (ASP.NET Core 7+)</div>
          <pre className="text-[10px] text-[#d1d5db] leading-relaxed whitespace-pre-wrap">{`var versionSet = app.NewApiVersionSet()
    .HasApiVersion(new ApiVersion(3, 0))
    .HasDeprecatedApiVersion(new ApiVersion(2, 0))
    .ReportApiVersions()
    .Build();

app.MapGet("/api/users/{id}", GetUser)
   .WithApiVersionSet(versionSet)
   .MapToApiVersion(new ApiVersion(3, 0));

app.MapGet("/api/users/{id}", GetUserV2)
   .WithApiVersionSet(versionSet)
   .MapToApiVersion(new ApiVersion(2, 0));`}</pre>
        </div>
      </div>
    </div>
  );
}
