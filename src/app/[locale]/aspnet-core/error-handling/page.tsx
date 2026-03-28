"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const ErrorHandlingVisualizer = dynamic(() => import("./ErrorHandlingVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// Program.cs — global error handling pipeline
var app = builder.Build();

// 1. UseExceptionHandler catches ALL unhandled exceptions
app.UseExceptionHandler(exceptionHandlerApp =>
{
    exceptionHandlerApp.Run(async context =>
    {
        var exceptionFeature = context.Features
            .Get<IExceptionHandlerFeature>();

        // Don't leak stack traces in production
        var isDev = app.Environment.IsDevelopment();

        await Results.Problem(
            title: "An unexpected error occurred.",
            detail: isDev ? exceptionFeature?.Error.Message : null,
            statusCode: 500,
            extensions: new Dictionary<string, object?>
            {
                ["traceId"] = context.TraceIdentifier,
            }
        ).ExecuteAsync(context);
    });
});

// 2. IProblemDetailsService + IExceptionHandler (.NET 8+) — preferred approach
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<DomainExceptionHandler>();
builder.Services.AddExceptionHandler<ValidationExceptionHandler>();
// Fallback catch-all MUST be last
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// IExceptionHandler implementations
public sealed class ValidationExceptionHandler : IExceptionHandler
{
    private readonly IProblemDetailsService _pds;
    public ValidationExceptionHandler(IProblemDetailsService pds) => _pds = pds;

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is not ValidationException ve)
            return false;   // let the next handler try

        httpContext.Response.StatusCode = StatusCodes.Status422UnprocessableEntity;

        return await _pds.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = new ValidationProblemDetails(
                ve.Errors.GroupBy(e => e.PropertyName)
                         .ToDictionary(
                             g => g.Key,
                             g => g.Select(e => e.ErrorMessage).ToArray()))
            {
                Type = "https://tools.ietf.org/html/rfc9110#section-15.5.21",
                Title = "One or more validation errors occurred.",
                Status = 422,
                Detail = "See the errors property for details.",
                Instance = httpContext.Request.Path,
                Extensions =
                {
                    ["traceId"] = httpContext.TraceIdentifier,
                }
            }
        });
    }
}

public sealed class GlobalExceptionHandler(
    ILogger<GlobalExceptionHandler> logger,
    IHostEnvironment env) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        // Log the full exception — NEVER return it to the client
        logger.LogError(exception,
            "Unhandled exception on {Method} {Path}. TraceId: {TraceId}",
            httpContext.Request.Method,
            httpContext.Request.Path,
            httpContext.TraceIdentifier);

        httpContext.Response.StatusCode = 500;

        await httpContext.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Type = "https://tools.ietf.org/html/rfc9110#section-15.6.1",
            Title = "An unhandled error occurred.",
            Status = 500,
            // In production, NEVER include exception.Message — it may contain
            // SQL queries, connection strings, or internal paths
            Detail = env.IsDevelopment() ? exception.Message
                : "An unexpected error occurred. Please use the traceId to report this.",
            Instance = httpContext.Request.Path,
            Extensions =
            {
                ["traceId"] = httpContext.TraceIdentifier,
            }
        }, cancellationToken: cancellationToken);

        return true;
    }
}`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Exception filters — first in the chain",
    body: "IExceptionFilter and IAsyncExceptionFilter run before the middleware pipeline. They can handle exceptions thrown by controller actions and set the result. Useful for controller-scoped handling but they cannot catch exceptions from middleware or Razor Pages.",
  },
  {
    title: "IExceptionHandler (.NET 8+) — the recommended approach",
    body: "Multiple IExceptionHandler implementations are registered in DI and tried in registration order. Each returns a bool: true means 'I handled it, stop', false means 'try the next one'. This enables clean per-exception-type handling without a giant switch statement.",
  },
  {
    title: "UseExceptionHandler middleware — the safety net",
    body: "Catches any unhandled exception that escapes all IExceptionHandler implementations. Re-executes the request pipeline against a configured error path. The IExceptionHandlerFeature gives access to the original exception for logging — but never send it to the client.",
  },
  {
    title: "UseStatusCodePages — handles non-exception 4xx responses",
    body: "Middleware that intercepts responses with status codes in the 400-599 range that have no body yet (e.g., 404 from routing, 401 from auth middleware). Without it, clients receive an empty 404 response with no explanation.",
  },
  {
    title: "IProblemDetailsService writes the RFC 9457 JSON",
    body: "AddProblemDetails() registers IProblemDetailsService which handles the actual JSON serialization of ProblemDetails objects. You can customize the factory via AddProblemDetails(options => options.CustomizeProblemDetails = ...) to inject tracing context, environment info, or machine-parseable type URIs.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "RFC 9457 Problem Details",
    definition: "IETF standard for HTTP API error responses. Defines a JSON format with type (URI), title, status, detail, and instance fields. Allows API clients to programmatically identify and handle error types by the type URI.",
    icon: "📋",
  },
  {
    term: "IExceptionHandler",
    definition: "Interface introduced in .NET 8. Register multiple implementations with different exception-type specializations. Called in registration order — return true to short-circuit, false to pass to the next handler.",
    icon: "🎯",
  },
  {
    term: "IProblemDetailsService",
    definition: "Registered by AddProblemDetails(). Handles serialization of ProblemDetails to application/problem+json. Customize with options.CustomizeProblemDetails to inject global properties like environment, version, or correlation IDs.",
    icon: "⚙️",
  },
  {
    term: "UseExceptionHandler",
    definition: "Middleware-level safety net. Catches all unhandled exceptions and re-executes the pipeline at a configured error handling path. Access the original exception via IExceptionHandlerFeature. Always comes last in the middleware chain.",
    icon: "🛡️",
  },
  {
    term: "TraceIdentifier",
    definition: "HttpContext.TraceIdentifier is a unique string per request (W3C trace ID format when OpenTelemetry is configured). Always include this in Problem Details responses — it is the correlation key that links a user's error report to your logs.",
    icon: "🔗",
  },
  {
    term: "ProblemDetails type field",
    definition: "A URI that uniquely identifies the error type. Clients can switch on this value to handle specific error types programmatically. Use https://tools.ietf.org/html/rfc9110#section-... for standard HTTP errors, or your own URIs for domain errors.",
    icon: "🏷️",
  },
  {
    term: "ValidationProblemDetails",
    definition: "A ProblemDetails subclass with an additional errors dictionary (property name → string[]). Built into ASP.NET Core — automatically returned by controllers with [ApiController] when ModelState is invalid (status 400).",
    icon: "✅",
  },
  {
    term: "UseStatusCodePages",
    definition: "Intercepts responses with status codes 400-599 that have no body. Without this, a 404 from routing returns an empty response. Combined with UseProblemDetails (Hellang middleware) or AddProblemDetails, converts these to Problem Details automatically.",
    icon: "📄",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "Stack Traces in Production Exposing Database Credentials",
    scenario: "A client integration engineer opened the browser developer tools while testing an API and found a 500 response body containing the full ASP.NET exception page — including the connection string with the production database password in plain text. The server had never been configured with app.UseExceptionHandler for production.",
    problem: "The development exception page (UseDeveloperExceptionPage) was active in production because the ASPNETCORE_ENVIRONMENT variable was not set, defaulting to 'Development'. Every unhandled exception dumped the full stack trace, local variable values, and environment variables — including secrets — directly into the HTTP response.",
    solution: "Always call app.UseExceptionHandler(\"/error\") in production (or rely on IExceptionHandler) and UseStatusCodePages. The critical fix: check app.Environment.IsDevelopment() before including exception details in responses. In GlobalExceptionHandler, log the full exception internally but return only a sanitized ProblemDetails with the TraceIdentifier.",
    takeaway: "ASPNETCORE_ENVIRONMENT must be explicitly set to 'Production' in every production deployment. Never include exception.Message, exception.StackTrace, or InnerException in HTTP responses in production — these routinely leak connection strings, file paths, and internal architecture details.",
  },
  {
    title: "Inconsistent Error Formats Breaking Client SDK",
    scenario: "A platform had 15 microservices. Six returned XML errors, four returned plain text strings, three returned custom JSON, and two returned RFC 7807 Problem Details. The mobile client SDK had to handle 4 different error formats with conditional parsing code that broke whenever a new service was added.",
    problem: "Each team implemented error handling independently with no cross-service standard. The client SDK became a parsing zoo. When a new 503 from the API gateway returned an HTML Nginx error page, the SDK crashed with a JSON parse exception — which the client logged as 'unknown error', with no TraceIdentifier for support to correlate.",
    solution: "Mandate RFC 9457 Problem Details across all services with AddProblemDetails() in every service's Program.cs. Define a company-wide set of type URIs for common domain errors. The mobile client SDK now switches on type: if the status is 422 and type contains 'validation', show field errors; if 503, show maintenance message. One parsing path, consistent forever.",
    takeaway: "Consistency in error responses is an API design contract, not a nice-to-have. RFC 9457 exists precisely to give clients a stable format to depend on. Adopt it at the organization level with shared middleware packages, not per-team.",
  },
  {
    title: "Swallowed Exceptions Causing Silent Data Corruption",
    scenario: "An order processing service had a fire-and-forget background task that swallowed exceptions in a try/catch that only called _logger.LogWarning. Over three months, 847 orders silently failed to update their fulfillment status. The bug was discovered when a customer complained their order shipped 3 months ago showed as 'pending'.",
    problem: "The middleware chain had an unintended catch block that caught Exception and returned 200 OK regardless of outcome, logging only a Warning. The assumption was 'we log it, we'll see it'. But Warning-level logs were not monitored with alerts. The exception was swallowed — no error response, no dead letter queue, no compensation logic.",
    solution: "Never catch-all Exception in application code unless you re-throw or dead-letter. Use IExceptionHandler at the infrastructure boundary. Set up alerting on Error-level log entries. For background workers, use IHostedService with try/catch that logs at Error and writes to a dead-letter mechanism. Add distributed tracing so every failed operation has a TraceId in the support queue.",
    takeaway: "Swallowed exceptions are worse than unhandled exceptions — at least an unhandled exception returns a 500 that clients can detect. A silently-caught exception returns a 200 that corrupts client state. Log exceptions at Error level, alert on them, and never hide them behind generic Warning messages.",
  },
];

export default function ErrorHandlingPage() {
  return (
    <MotionFade>
      <Section
        title="Global Error Handling & Problem Details"
        subtitle="Why you should never return raw exceptions to clients — and how RFC 9457 Problem Details make your API errors actually useful."
      >
        <ErrorHandlingVisualizer />
        <ConceptExplainer
          overview="Every ASP.NET Core API will throw exceptions in production. The question is not whether you'll handle them — it's whether you'll handle them consistently, safely, and in a way that gives clients enough information to respond intelligently without exposing your internals. RFC 9457 Problem Details combined with the IExceptionHandler pipeline in .NET 8+ is the production-grade answer."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "IExceptionHandler + Problem Details (ASP.NET Core 9 / .NET 9)", code: CODE_EXAMPLE }}
          whyItMatters="Unhandled exceptions that reach clients in their raw form are simultaneously a security vulnerability (they leak stack traces and connection strings), an API usability failure (clients can't parse HTML exception pages), and an operational nightmare (no TraceIdentifier means you can't correlate the user's error report to your logs). Problem Details solves all three: structured JSON that clients parse, no internal details in production, and TraceIdentifier for support correlation."
          pitfalls={[
            "Leaking stack traces in production: exception.StackTrace and exception.Message routinely contain SQL queries, connection strings, internal service addresses, and file system paths. Never include these in HTTP responses. Log them server-side at Error level, return only a sanitized ProblemDetails with a TraceIdentifier.",
            "Inconsistent error formats across endpoints: mixing manual JSON error objects, plain text, and Problem Details in the same API forces clients to write defensive parsing for every endpoint. Adopt IProblemDetailsService globally via AddProblemDetails() and enforce it in middleware — not in individual controllers.",
            "Swallowing exceptions in middleware or background services: a catch block that logs at Warning and returns 200 hides failures from clients and monitoring systems. If you catch an exception and can't handle it meaningfully, re-throw it or write to a dead-letter queue. Silent success is worse than an explicit failure.",
            "Not including HttpContext.TraceIdentifier in error responses: when a user submits a support ticket saying 'it didn't work', you need a correlation key to find the relevant log entry across distributed services. Without TraceIdentifier in the response body, RCA requires guessing from timestamps — which is unreliable at scale.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
