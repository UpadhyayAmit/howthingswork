"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const LoggingVisualizer = dynamic(() => import("./LoggingVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// Program.cs — Serilog with structured logging
builder.Host.UseSerilog((ctx, lc) => lc
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithCorrelationId()   // from Serilog.Enrichers.CorrelationId
    .WriteTo.Console(new RenderedCompactJsonFormatter())
    .WriteTo.Seq("http://seq:5341")
    .WriteTo.ApplicationInsights(
        ctx.Configuration["ApplicationInsights:InstrumentationKey"],
        TelemetryConverter.Traces));

// In a controller or service — DO use ILogger<T>, NOT static fields
public class OrderService(ILogger<OrderService> _logger)
{
    public async Task<Order> ProcessAsync(
        Guid orderId,
        CancellationToken cancellationToken)
    {
        // Use log scopes for correlation across calls
        using var scope = _logger.BeginScope(new Dictionary<string, object>
        {
            ["OrderId"] = orderId,
            ["TraceId"] = Activity.Current?.TraceId.ToString()
                          ?? HttpContext.TraceIdentifier,
        });

        _logger.LogInformation(
            "Processing order {OrderId} for user {UserId}",
            orderId, userId);   // structured — NOT $"Processing order {orderId}"

        try
        {
            var result = await _paymentGateway.ChargeAsync(orderId, cancellationToken);
            _logger.LogInformation(
                "Order {OrderId} charged successfully. Amount: {Amount:C}, Gateway: {Gateway}",
                orderId, result.Amount, result.GatewayName);
            return result.Order;
        }
        catch (PaymentGatewayException ex)
        {
            // Log the exception object — Serilog captures the full stack trace
            _logger.LogError(ex,
                "Payment failed for order {OrderId}. Gateway status: {GatewayStatus}",
                orderId, ex.StatusCode);
            throw;
        }
    }
}

// OpenTelemetry — correlate logs, traces, metrics together
builder.Services.AddOpenTelemetry()
    .WithTracing(b => b
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter())
    .WithMetrics(b => b
        .AddAspNetCoreInstrumentation()
        .AddOtlpExporter());`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "ILogger<T> captures a log event — not a string",
    body: "When you call _logger.LogInformation(\"User {UserId} logged in\", userId), the framework creates a LogEntry with EventId, LogLevel, message template (a constant), and a structured properties dictionary — before any string is built.",
  },
  {
    title: "Level filter gate — the first firewall",
    body: "The minimum level configured for each category is checked first. If the event's level is below the threshold, the entire pipeline short-circuits with zero allocations. This is why message templates (not $-strings) are critical.",
  },
  {
    title: "Log providers (sinks) receive the raw event",
    body: "Each registered ILoggerProvider receives the LogEntry and decides how to serialize it. The Console provider renders to text. Serilog serializes to JSON. Application Insights converts to a TraceTelemetry object. Each sink applies its own level filter.",
  },
  {
    title: "Log scopes carry ambient context",
    body: "BeginScope() pushes key-value pairs onto an async-local stack. Serilog and other providers automatically enrich every log entry written inside the scope with these values. Use scopes for RequestId, UserId, OrderId — not per-message parameters.",
  },
  {
    title: "OpenTelemetry bridges logs, traces, and metrics",
    body: "With .AddOpenTelemetry(), ILogger events are automatically correlated with the current Activity (trace span). TraceId and SpanId are injected into every log entry, letting you jump from a log line directly to the distributed trace in Jaeger or Tempo.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "ILogger<T>",
    definition: "Generic logger interface injected via DI. The T parameter sets the log category (usually the class name), enabling per-category level overrides in config.",
    icon: "📝",
  },
  {
    term: "Message Templates",
    definition: "Constant strings with named holes like {UserId}. Serilog and Microsoft.Extensions.Logging preserve these as structured properties — not interpolated text. Enables querying by property in Seq, Kibana, etc.",
    icon: "🔧",
  },
  {
    term: "LogLevel",
    definition: "Ordered severity: Trace(0) < Debug(1) < Information(2) < Warning(3) < Error(4) < Critical(5). Production typically uses Warning or Information. MinimumLevel.Override allows per-namespace tuning.",
    icon: "📊",
  },
  {
    term: "Log Scopes",
    definition: "BeginScope() creates an async-local context that enriches all logs within its using block. Ideal for request-level context (TraceIdentifier, UserId) that shouldn't be repeated on every line.",
    icon: "🔭",
  },
  {
    term: "Serilog Enrichers",
    definition: "Automatically attach properties to every event: machine name, thread ID, correlation ID, environment name, assembly version. Configured once in Program.cs, available everywhere.",
    icon: "✨",
  },
  {
    term: "Activity / OpenTelemetry",
    definition: "System.Diagnostics.Activity maps to OTel Spans. Activity.Current?.TraceId gives you the W3C trace ID. When using AddOpenTelemetry(), log entries are automatically tagged with the active span context.",
    icon: "🔗",
  },
  {
    term: "TraceIdentifier",
    definition: "HttpContext.TraceIdentifier is the per-request ID generated by ASP.NET Core. Always include this in error responses and logs — it's the first thing you need when a user reports a bug.",
    icon: "🆔",
  },
  {
    term: "Structured Output",
    definition: "Instead of a flat string, structured logs are JSON objects with typed fields. Allows queries like: level:Error AND OrderId:8821 AND ElapsedMs:[500 TO *] in any log aggregation system.",
    icon: "🏗️",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "5-Minute Outage With No Useful Logs",
    scenario: "Black Friday. The checkout service spiked to 500 errors for 5 minutes. The on-call engineer opened Kibana and found 50,000 log lines saying 'Payment processing failed' — all identical strings, no order IDs, no user context, no exception details.",
    problem: "Developers used string interpolation ($\"Payment failed for {orderId}\") but the logger category was set to Warning minimum. The Error logs that did come through were swallowed by a try/catch that called _logger.LogError(\"Payment failed\") with no exception object and no structured properties. Finding the root cause required a 2-hour war room.",
    solution: "Switch every log call to message templates with structured properties. Pass the Exception object as the first parameter to LogError. Add BeginScope with OrderId and TraceIdentifier at the service method entry. Configure minimum level per namespace: Microsoft.* at Warning, your own namespace at Information. The next incident had a TraceId in every log line — RCA took 8 minutes.",
    takeaway: "Structured logging is a production readiness requirement, not a nice-to-have. The investment in setting it up correctly pays back on your very first post-deployment incident.",
  },
  {
    title: "Debug Logs Flooding Production — 40GB/Day",
    scenario: "A new service deployed to production kept hitting Azure Log Analytics storage limits within 6 hours. Ingestion costs spiked from $12/day to $280/day. The culprit: Microsoft.EntityFrameworkCore.Database.Command was logging every SQL query at Debug level.",
    problem: "The appsettings.Production.json had 'Default': 'Debug' — likely copy-pasted from development config. ASP.NET Core and EF Core emit hundreds of Debug/Trace events per request. At 10,000 requests/hour, that's millions of log entries per day that no one ever reads.",
    solution: "Use MinimumLevel.Override() to suppress noisy framework categories in production: Microsoft.EntityFrameworkCore at Warning, Microsoft.AspNetCore at Warning, System.Net.Http at Warning. Keep your own namespace at Information. Use a tiered approach: local dev at Debug, staging at Information, prod at Warning (with Error going to a separate high-priority sink).",
    takeaway: "Always configure category-level overrides in production. 'Default: Debug' in production is a billing disaster waiting to happen, and it makes real errors unfindable in the noise.",
  },
  {
    title: "Correlation IDs Lost Across Service Boundaries",
    scenario: "A microservices system had perfect per-service logs — but when an order failed, tracing the flow across 4 services required manual timeline reconstruction across 4 different Kibana dashboards, correlating timestamps by hand. Incidents averaged 45 minutes of log archaeology.",
    problem: "Each service generated its own RequestId independently. No W3C traceparent header was propagated between services. When Service A called Service B via HttpClient, the logs in B had no connection to the logs in A. Even though both services used Serilog, they were isolated islands of observability.",
    solution: "Add OpenTelemetry with AddAspNetCoreInstrumentation() and AddHttpClientInstrumentation(). HttpClient automatically injects traceparent/tracestate headers. The receiving service picks them up and continues the trace. Add .Enrich.WithSpanId().Enrich.WithTraceId() to Serilog. Now every log line in every service carries the same root TraceId — a single query in Grafana Tempo or Jaeger shows the full distributed trace.",
    takeaway: "Correlation IDs are not a logging concern — they are a distributed systems concern. Set up W3C trace context propagation at the infrastructure level (OpenTelemetry) rather than manually threading request IDs through every method signature.",
  },
];

export default function LoggingPage() {
  return (
    <MotionFade>
      <Section
        title="Structured Logging & Diagnostics"
        subtitle="Why Console.WriteLine is killing your production debuggability — and how ILogger, Serilog, and OpenTelemetry actually work."
      >
        <LoggingVisualizer />
        <ConceptExplainer
          overview="ASP.NET Core's logging abstraction (ILogger<T>) is a structured event pipeline, not a string writer. Every log call captures a message template, structured properties, and context — then fans out to multiple sinks that each apply their own level filters. Understanding this pipeline is the difference between an incident that takes 5 minutes to diagnose and one that takes 5 hours."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Structured Logging with Serilog + OpenTelemetry (ASP.NET Core 9)", code: CODE_EXAMPLE }}
          whyItMatters="Structured logging is what makes your system observable in production. When an order fails at 2 AM, you need to query: show me all logs for OrderId=8821 across all services in the last 10 minutes. That query is only possible if OrderId was logged as a structured property — not interpolated into a string. The 30 minutes you spend setting up Serilog properly will save hours of incident response time."
          pitfalls={[
            "String interpolation ($\"User {userId} logged in\") allocates a string on every call, even when the log level is filtered out. At high request rates this causes measurable GC pressure. Always use message templates: _logger.LogInformation(\"User {UserId} logged in\", userId).",
            "Capturing ILogger in a static field bypasses the category system and breaks structured context injection. Always inject ILogger<T> via the constructor — never store it in a static variable or resolve it via a static service locator.",
            "Logging passwords, tokens, PII, or connection strings is a compliance violation waiting to happen. Use [LoggerMessage] source-generated methods which support redaction, or implement a destructuring policy in Serilog to scrub sensitive properties before they reach any sink.",
            "Missing TraceIdentifier in error responses means support tickets say 'it didn't work' with no way to find the relevant log entry. Include HttpContext.TraceIdentifier (or Activity.Current.TraceId) in every Problem Details error response and every exception log entry.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
