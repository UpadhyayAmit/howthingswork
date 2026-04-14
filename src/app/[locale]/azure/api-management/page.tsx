"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const ApiManagementVisualizer = dynamic(
  () => import("./ApiManagementVisualizer"),
  { ssr: false, loading: () => <VisualizerSkeleton /> }
);

const CODE_EXAMPLE = `// APIM Policy — rate limit + JWT validation + header transform
<policies>
  <inbound>
    <base />
    <!-- 1. Validate JWT first — short-circuits on failure (401) -->
    <validate-jwt header-name="Authorization"
                  failed-validation-httpcode="401"
                  failed-validation-error-message="Unauthorized">
      <openid-config url="https://login.microsoftonline.com/{tenantId}/v2.0/.well-known/openid-configuration"/>
      <required-claims>
        <claim name="scp" match="any"><value>api.read</value></claim>
      </required-claims>
    </validate-jwt>

    <!-- 2. Rate limit per subscription key (NOT per IP!) -->
    <rate-limit-by-key calls="100" renewal-period="60"
      counter-key="@(context.Subscription.Id)"
      increment-condition="@(context.Response.StatusCode < 400)" />

    <!-- 3. Named Value — secret stored in Key Vault reference -->
    <set-header name="X-Backend-Key" exists-action="override">
      <value>{{backend-api-key}}</value>
    </set-header>
  </inbound>
  <backend>
    <base />
  </backend>
  <outbound>
    <base />
    <!-- Strip internal headers from response -->
    <set-header name="X-Powered-By" exists-action="delete" />
    <set-header name="X-AspNet-Version" exists-action="delete" />
  </outbound>
  <on-error>
    <base />
    <return-response>
      <set-status code="@(context.Response.StatusCode)" />
      <set-body>@(context.LastError.Message)</set-body>
    </return-response>
  </on-error>
</policies>`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Request enters the Inbound pipeline",
    body: "Every API call hits APIM before reaching your backend. The Inbound section runs policies top-to-bottom: authentication checks, rate limiting, header manipulation, URL rewriting. Any policy can short-circuit the pipeline and return a response directly.",
  },
  {
    title: "Backend call (or mock)",
    body: "If inbound policies pass, APIM forwards the request to the configured backend. You can configure multiple backends with load balancing, circuit breakers, and health checks. The mock-response policy can skip the backend entirely for testing.",
  },
  {
    title: "Outbound pipeline transforms the response",
    body: "After the backend responds, outbound policies process the response before returning to the client: strip internal headers, add CORS headers, transform XML to JSON, or store results in the built-in cache.",
  },
  {
    title: "on-error handles failures gracefully",
    body: "If any policy or the backend throws, the on-error section runs. You can map errors to structured JSON responses, log to Event Hub, or retry with a different backend.",
  },
  {
    title: "Subscriptions and Named Values secure secrets",
    body: "Clients authenticate via subscription keys sent in the Ocp-Apim-Subscription-Key header. Backend secrets (API keys, connection strings) are stored as Named Values — which can reference Azure Key Vault — and referenced in policy XML as {{my-secret}}.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "Policy Pipeline",
    definition: "Four sequential sections: Inbound (pre-backend), Backend (forward-request), Outbound (post-backend), on-error. Policies within each section run top-to-bottom.",
    icon: "🔗",
  },
  {
    term: "Subscriptions",
    definition: "APIM's built-in authentication. Clients send Ocp-Apim-Subscription-Key. Rate limits and usage tracking are per subscription key, not per IP.",
    icon: "🔑",
  },
  {
    term: "Named Values",
    definition: "Key-value store inside APIM. Reference them in policies as {{my-value}}. Can be plain text, secrets, or Key Vault references (rotated automatically).",
    icon: "📦",
  },
  {
    term: "Backends",
    definition: "Named backend targets with URL, credentials, and circuit breaker config. Allows A/B routing and blue/green deploys without policy changes.",
    icon: "🖥️",
  },
  {
    term: "Mock Response",
    definition: "Policy that returns a static response from the API schema definition without forwarding to the backend. Enables frontend teams to work before the API is ready.",
    icon: "🎭",
  },
  {
    term: "Tiers",
    definition: "Developer (no SLA, single unit) | Basic (99.9%) | Standard (99.9%) | Premium (99.99%, multi-region, VNet). Developer tier must NEVER be used in production.",
    icon: "📊",
  },
  {
    term: "Self-hosted Gateway",
    definition: "Docker container that runs the APIM gateway on-premises or in any cloud. Config is pulled from APIM in Azure. Enables consistent policy enforcement in hybrid environments.",
    icon: "🏠",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "Production Rate Limit Misconfiguration — 50k Unexpected Backend Calls",
    scenario: "An e-commerce API on APIM Standard tier suffered a traffic spike. The rate-limit policy was configured but the counter-key was set to the caller IP from a proxy, not the subscription key.",
    problem: "All requests from behind a corporate proxy shared one IP, so the rate limit applied to the entire company as one 'client'. 10 developers sharing 100 req/min meant each got effectively 10 req/min — but more critically, unauthenticated callers from the same IP exhausted the legitimate users' quota.",
    solution: "Changed counter-key to @(context.Subscription.Id) to track limits per subscription. Added a separate rate-limit-by-key based on the authenticated user claim for fine-grained per-user throttling. Moved unauthenticated endpoints to a separate APIM product with stricter limits.",
    takeaway: "APIM rate limits are per counter-key, not per IP by default. Always audit what context expression you use as the counter key — IP-based limiting breaks behind proxies and NATs.",
  },
  {
    title: "validate-jwt Placed in Outbound — Auth Bypass in Production",
    scenario: "A team migrated their API to APIM and placed validate-jwt in the outbound section (copy-paste error). The policy appeared to work in testing because the JWT was structurally valid.",
    problem: "JWT validation in outbound runs AFTER the backend has already processed the request and returned data. The policy rejected invalid tokens in the response phase, but the backend had already executed business logic, mutated database state, and the validation failure was invisible to monitoring.",
    solution: "Moved validate-jwt to the top of the inbound section. Added a policy unit test using APIM's test console. Enabled APIM diagnostic logging to Azure Monitor to verify the pipeline execution order on every request.",
    takeaway: "validate-jwt must always be in inbound, as early as possible. Auth policies in outbound or backend sections execute after damage is done. The APIM portal highlights this with a warning but teams miss it during copy-paste migrations.",
  },
  {
    title: "Developer Tier in Production Causes Outage During Update",
    scenario: "A startup deployed their MVP on APIM Developer tier to save costs. During an Azure maintenance window, the single APIM unit was unavailable for 22 minutes, taking down all customer-facing APIs.",
    problem: "Developer tier has no SLA, no redundancy, and is explicitly documented for non-production use. When Azure performed routine maintenance on the underlying infrastructure, there was no failover unit available.",
    solution: "Migrated to Basic tier ($140/month vs Developer's $50/month) which provides 99.9% SLA with redundant units. For higher availability requirements, Standard tier with geo-redundancy was configured.",
    takeaway: "Developer tier costs ~$50/month vs Basic at ~$140/month — a false saving if your API serves real customers. The cost of a 22-minute outage during business hours far exceeded a year's tier upgrade cost.",
  },
];

export default function ApiManagementPage() {
  return (
    <MotionFade>
      <Section
        title="Azure API Management (APIM)"
        subtitle="The gateway in front of all your APIs — policies, rate limiting, transformations, and the developer portal."
      >
        <ApiManagementVisualizer />
        <ConceptExplainer
          overview="Azure API Management is a fully managed gateway that sits between API consumers and your backend services. Every request passes through a four-stage policy pipeline — Inbound, Backend, Outbound, and on-error — where you apply cross-cutting concerns like authentication, rate limiting, caching, and protocol transformation without changing your backend code."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "APIM Policy — JWT validation + rate limiting + header stripping", code: CODE_EXAMPLE }}
          whyItMatters="APIM decouples API consumers from backend implementations. You can version APIs, throttle abusive callers, enforce security policies, mock responses for development, and migrate backends — all without touching consumer code. It's the single enforcement point for governance across dozens of microservices."
          pitfalls={[
            "validate-jwt placed in outbound or backend sections does nothing to protect your backend — the request has already been processed. Always place it first in inbound.",
            "Rate limits are per subscription key by default, not per IP. Behind corporate proxies or NAT, all clients share one IP, making IP-based counters unreliable.",
            "Developer tier has zero SLA and is explicitly for non-production. It will be taken offline during Azure maintenance with no compensation.",
            "Outbound policies cannot modify the HTTP status code after it has been set by the backend. Use return-response in on-error instead.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
