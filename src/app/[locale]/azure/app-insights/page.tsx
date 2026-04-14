"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const AppInsightsVisualizer = dynamic(() => import("./AppInsightsVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// .NET 8 — App Insights with distributed tracing + custom telemetry
// Program.cs
builder.Services.AddApplicationInsightsTelemetry(options =>
{
    // Use connection string, NOT instrumentation key (deprecated)
    options.ConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
});

// Custom middleware — enriches every request with user context
builder.Services.AddSingleton<ITelemetryInitializer, UserTelemetryInitializer>();

public class UserTelemetryInitializer : ITelemetryInitializer
{
    public void Initialize(ITelemetry telemetry)
    {
        // Adds custom dimension to EVERY piece of telemetry
        if (telemetry is ISupportProperties item)
            item.Properties["UserId"] = httpContextAccessor.HttpContext?.User.GetUserId();
    }
}

// Service — track custom event + dependency manually
public class OrderService
{
    private readonly TelemetryClient _telemetry;

    public async Task PlaceOrder(Order order)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            await _db.SaveAsync(order);
            sw.Stop();

            // Custom event with properties (avoid high cardinality keys!)
            _telemetry.TrackEvent("OrderPlaced", new Dictionary<string, string>
            {
                ["ProductCategory"] = order.Category, // LOW cardinality — good
                // ["OrderId"] = order.Id,  // HIGH cardinality — BAD, hits data cap fast
            }, new Dictionary<string, double>
            {
                ["OrderValueGBP"] = order.TotalGbp,
            });
        }
        catch (Exception ex)
        {
            _telemetry.TrackException(ex, new Dictionary<string, string>
            {
                ["OrderId"] = order.Id, // OK in exceptions — low volume
            });
            throw;
        }
    }
}

// Azure Functions — MUST flush before function exits!
public class ProcessOrderFunction
{
    private readonly TelemetryClient _telemetry;

    [FunctionName("ProcessOrder")]
    public async Task Run([ServiceBusTrigger("orders")] string message)
    {
        try { /* process */ }
        finally
        {
            // Without this, telemetry is lost when function host recycles
            await _telemetry.FlushAsync(CancellationToken.None);
        }
    }
}`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "SDK instruments your app at startup",
    body: "AddApplicationInsightsTelemetry() injects middleware that intercepts every HTTP request, outgoing HttpClient call, SQL command, and dependency. It reads the W3C traceparent header to continue a distributed trace started upstream.",
  },
  {
    title: "Telemetry flows through the processing pipeline",
    body: "Before data leaves the process, it passes through TelemetryInitializers (enrichers) and TelemetryProcessors (filters/samplers). This is where you add custom dimensions, filter health-check noise, or implement fixed-rate sampling.",
  },
  {
    title: "Adaptive sampling reduces volume automatically",
    body: "By default, App Insights uses adaptive sampling — it targets ~5 events/second and drops telemetry to stay under the limit. Critically, it samples entire operations (all spans for one trace) together to preserve trace completeness.",
  },
  {
    title: "W3C TraceContext propagates operation IDs across services",
    body: "The SDK automatically injects traceparent: 00-{traceId}-{spanId}-01 into outgoing HTTP requests. Downstream services that also use App Insights (or OpenTelemetry) pick this up, creating the distributed trace that links all spans under one operation_Id.",
  },
  {
    title: "Data lands in Log Analytics Workspace",
    body: "All telemetry is stored in a Log Analytics Workspace as typed tables: requests, dependencies, exceptions, traces, customEvents, customMetrics. You query with KQL. Cross-workspace queries let you join telemetry from multiple services.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "TelemetryClient",
    definition: "The main SDK class. Inject as singleton. Tracks requests, exceptions, events, metrics, dependencies. Use FlushAsync() in Azure Functions before exit.",
    icon: "📡",
  },
  {
    term: "Connection String",
    definition: "Replaces the deprecated instrumentation key. Contains endpoint URL allowing telemetry to be sent to sovereign clouds or custom endpoints. Format: InstrumentationKey=...;IngestionEndpoint=...",
    icon: "🔌",
  },
  {
    term: "Adaptive Sampling",
    definition: "Default sampling strategy that adjusts rate dynamically to target ~5 req/sec. Samples entire operations together (preserves trace completeness). Can be disabled or replaced with fixed-rate.",
    icon: "🎯",
  },
  {
    term: "Dependency Tracking",
    definition: "Auto-instruments outgoing HTTP, SQL, Azure SDK calls, and Redis. Each call becomes a 'dependency' span with duration, result code, and target. Links back to the parent request via operation_Id.",
    icon: "🔗",
  },
  {
    term: "W3C TraceContext",
    definition: "Standard distributed tracing header (traceparent). App Insights injects it into outgoing calls and reads it from incoming requests to stitch spans across service boundaries into one trace.",
    icon: "🌐",
  },
  {
    term: "Live Metrics Stream",
    definition: "Sub-second telemetry preview — requests/sec, failure rate, server metrics — without waiting for ingestion. Useful for deployments and incident response. Does NOT sample.",
    icon: "⚡",
  },
  {
    term: "Availability Tests",
    definition: "Synthetic monitoring: URL ping, multi-step, or custom TrackAvailability() calls from Azure regions worldwide. Alerts when availability drops below threshold. Appears in Application Map.",
    icon: "🔍",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "Sampling Drops the Exact Failing Request During Incident",
    scenario: "A payments API had a 0.3% error rate on a specific payment provider. During a P1 incident, engineers searched App Insights for the failing requests but found no traces — only aggregate error counts in metrics.",
    problem: "Adaptive sampling was running at 8% (high traffic volume). The failing requests — already rare at 0.3% — were statistically being dropped by the sampler. The operation that failed was not preserved.",
    solution: "Added a TelemetryProcessor that forces sampling=true for any operation where ResultCode >= 400 or where a specific CustomDimension is present. Also added a KQL alert on exceptions table (which is sampled differently) rather than requests table.",
    takeaway: "Adaptive sampling does not guarantee that any specific request is kept. For error investigation, use fixed-rate sampling or a custom processor that always keeps failed operations. Never rely on sampling to preserve your debugging evidence.",
  },
  {
    title: "Azure Function Telemetry Lost on Cold Start Recycle",
    scenario: "A processing function appeared healthy in App Insights — low exception rates, normal request counts. But downstream database records showed gaps: some messages were being processed but telemetry for ~5% of invocations was missing.",
    problem: "The Azure Functions consumption plan recycles idle instances. Without await _telemetry.FlushAsync(), in-process telemetry buffers are dropped when the host shuts down. The SDK batches telemetry for efficiency, so a quick function that exits before the flush interval loses its data.",
    solution: "Added FlushAsync(CancellationToken.None) in a finally block in every function. Also configured the App Insights host option flushOnDispose: true and reduced MaxTelemetryBufferCapacity to trigger more frequent flushes.",
    takeaway: "App Insights SDK buffers telemetry in memory and flushes on a timer. In short-lived processes (Azure Functions, console apps, Lambda), you must call FlushAsync() explicitly or telemetry is silently dropped on exit.",
  },
  {
    title: "High-Cardinality Custom Dimensions Exhausting Daily Data Cap",
    scenario: "A team added TrackEvent('ApiCall') with a custom dimension OrderId on every API call. Within a week, their App Insights resource hit the 100GB/day data cap and began dropping telemetry across all services sharing the workspace.",
    problem: "Adding a unique value (OrderId, UserId, CorrelationId) as a customDimensions key creates millions of unique dimension values. These inflate metric cardinality and storage volume dramatically. 500k orders/day * 10 telemetry items each = 5M rows with a unique dimension that can't be aggregated usefully.",
    solution: "Moved high-cardinality values (OrderId) to customProperties on exceptions only (low volume). Replaced on events with low-cardinality dimensions (ProductCategory, Region, PaymentMethod). Set up sampling rules and data cap alerts at 70% threshold.",
    takeaway: "customDimensions keys on high-volume events should have low cardinality (< 1000 unique values). High-cardinality dimensions (IDs, timestamps, free text) should only appear on low-volume telemetry like exceptions or custom events that fire rarely.",
  },
];

export default function AppInsightsPage() {
  return (
    <MotionFade>
      <Section
        title="Application Insights & Distributed Tracing"
        subtitle="How the App Insights SDK instruments your app — sampling, the telemetry pipeline, and reading a distributed trace."
      >
        <AppInsightsVisualizer />
        <ConceptExplainer
          overview="Application Insights is Azure Monitor's APM solution. The SDK auto-instruments your app at startup — intercepting HTTP requests, SQL queries, and outgoing calls — and correlates them into distributed traces using W3C TraceContext headers. All telemetry flows through an in-process pipeline of initializers and processors before being batched and sent to a Log Analytics Workspace."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: ".NET 8 — App Insights with distributed tracing, custom events, and Function flush", code: CODE_EXAMPLE }}
          whyItMatters="Without distributed tracing, a slow API response could be caused by a SQL query, a downstream HTTP call, a message queue delay, or the app's own logic — and you'd have no way to know which without instrumenting every layer manually. App Insights gives you a unified view across all services in one trace, with zero code changes for standard operations."
          pitfalls={[
            "Adaptive sampling does not guarantee any specific request is retained. Rare failures (0.1% error rate) may be consistently dropped. Add a custom TelemetryProcessor that forces keep=true for failed operations.",
            "Azure Functions, console apps, and short-lived processes must call await telemetryClient.FlushAsync() before exit. The SDK batches in memory — process exit drops the buffer silently.",
            "High-cardinality customDimensions (OrderId, UserId, GUIDs) on high-volume events rapidly exhaust the daily data cap. Reserve unique IDs for exceptions and low-volume events only.",
            "Instrumentation key is deprecated — use connection string. The key alone can't target sovereign clouds and will stop working in future SDK versions.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
