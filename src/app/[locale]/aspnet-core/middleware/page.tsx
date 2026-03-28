"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const MiddlewareVisualizer = dynamic(() => import("./MiddlewareVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// Program.cs — order is everything
var app = builder.Build();

// MUST be first — catches unhandled exceptions from all subsequent middleware
app.UseExceptionHandler("/error");

// HTTPS redirect before anything else reads the request
app.UseHttpsRedirection();

// CORS must be before Auth — preflight OPTIONS requests
// must be handled before authorization checks run
app.UseCors("AllowFrontend");

// Auth before Routing? No. Routing must resolve the endpoint first
// so [Authorize] metadata is available to UseAuthorization
app.UseRouting();

app.UseAuthentication();  // Populates HttpContext.User
app.UseAuthorization();   // Checks [Authorize] on the matched endpoint

// Custom middleware — accesses both the resolved route AND the identity
app.UseMiddleware<RequestLoggingMiddleware>();

app.MapControllers();

// ----------------------------------------------------------------
// Custom middleware using the IMiddleware interface (DI-friendly)
public class RequestLoggingMiddleware : IMiddleware
{
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(ILogger<RequestLoggingMiddleware> logger)
        => _logger = logger;

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            await next(context);  // Call next middleware in pipeline
        }
        finally
        {
            sw.Stop();
            _logger.LogInformation(
                "{Method} {Path} responded {StatusCode} in {Elapsed}ms",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                sw.ElapsedMilliseconds);
        }
    }
}`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Pipeline Assembly at Startup",
    body: "When you call app.Use*, app.Run, or app.Map, ASP.NET Core builds a linked chain of RequestDelegate functions. Each middleware wraps the next one — like nested Russian dolls. The chain is compiled once and reused for every request.",
  },
  {
    title: "Request Flows Inward",
    body: "An HTTP request enters the first middleware. That middleware does its pre-processing, then calls 'await next(context)' to pass control to the next one. This continues until a terminal middleware (app.Run or an endpoint) generates a response.",
  },
  {
    title: "Response Flows Outward",
    body: "After the terminal middleware writes the response, control returns up the chain. Each middleware can inspect or modify the response on the way out. This is how response compression and caching headers work — they run on the way back.",
  },
  {
    title: "Short-Circuiting the Pipeline",
    body: "Middleware can return early without calling next(). Authorization middleware does this for 401/403 responses. Static files middleware does this when it finds a matching file — the request never reaches your controllers.",
  },
  {
    title: "app.Use vs app.Run vs app.Map",
    body: "app.Use adds middleware that calls next(). app.Run adds terminal middleware that never calls next() — it ends the pipeline. app.Map branches the pipeline based on path prefix, creating a sub-pipeline for matched requests.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "RequestDelegate",
    definition: "The compiled type of a middleware chain: Func<HttpContext, Task>. Each app.Use* call wraps the existing delegate in a new one.",
    icon: "🔗",
  },
  {
    term: "IMiddleware",
    definition: "Interface with InvokeAsync(HttpContext, RequestDelegate). Prefer this over the convention-based approach — it supports DI constructor injection and is testable.",
    icon: "📐",
  },
  {
    term: "Short-Circuit",
    definition: "Returning from InvokeAsync without calling next(context). Stops the request from reaching further middleware. The response path still executes for outer middleware.",
    icon: "⚡",
  },
  {
    term: "UseRouting / UseEndpoints",
    definition: "UseRouting resolves which endpoint matches the request (populates IEndpointFeature). UseAuthorization needs this to read [Authorize] metadata. Put Authorization AFTER Routing.",
    icon: "🗺️",
  },
  {
    term: "Terminal Middleware",
    definition: "app.Run() and mapped endpoints. Never call next() — they generate the response. Every pipeline must end with one or requests will get an empty 200 response.",
    icon: "🏁",
  },
  {
    term: "Middleware Order",
    definition: "CORS before Auth, ExceptionHandler first, Routing before Authorization. The order isn't a preference — wrong order causes production bugs that are hard to diagnose.",
    icon: "📋",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "CORS Preflight Failing in Production",
    scenario: "A React SPA makes a POST to your API with a custom Authorization header. It works in dev but breaks in production with 'No Access-Control-Allow-Origin header'. The browser's preflight OPTIONS request returns 401.",
    problem: "UseCors() was added AFTER UseAuthentication() in Program.cs. Preflight OPTIONS requests don't carry credentials, so UseAuthentication marked them as unauthenticated. UseAuthorization then rejected them with 401 before the CORS middleware ever ran.",
    solution: "Move app.UseCors() before app.UseAuthentication(). CORS middleware must see the request before authentication so it can respond to OPTIONS preflights without requiring credentials. This is documented but easy to get wrong when refactoring startup code.",
    takeaway: "Middleware order bugs are silent in development because you often test from the same origin. Always verify CORS headers with a cross-origin request in staging, and keep a comment in Program.cs documenting WHY the order is what it is.",
  },
  {
    title: "Exception Handler Swallowing Stack Traces",
    scenario: "You add app.UseExceptionHandler('/error') to return JSON errors. Suddenly your logs show no stack traces for 500 errors — just 'An error occurred while processing your request.' Debugging takes hours.",
    problem: "UseExceptionHandler re-executes the pipeline to /error, clearing the original exception from the response. If you don't read HttpContext.Features.Get<IExceptionHandlerFeature>()?.Error in your error controller, you lose the exception entirely.",
    solution: "In your /error controller, always read the exception feature: var ex = HttpContext.Features.Get<IExceptionHandlerFeature>()?.Error. Log it with full stack trace before returning the sanitized response. In development, use app.UseDeveloperExceptionPage() which shows the full trace.",
    takeaway: "UseExceptionHandler is a pipeline reset — it loses exception context unless you explicitly retrieve it from the features collection. Always wire up proper logging inside your error handler, not just in the exception middleware itself.",
  },
  {
    title: "Custom Middleware Breaking Streaming Responses",
    scenario: "A response logging middleware wraps every request and logs the response body size. SSE (Server-Sent Events) endpoints start timing out and clients disconnect — the events stop flowing after 30 seconds.",
    problem: "The logging middleware buffered the response body to read its size, which called context.Response.Body.Seek(0, SeekOrigin.Begin). This broke the streaming nature of SSE responses. The middleware was effectively buffering the entire stream before forwarding.",
    solution: "Check for streaming responses before buffering: if (context.Response.ContentType?.Contains('text/event-stream') == true) { await next(context); return; }. Better: use a memory stream as a proxy only for non-streaming responses, detected by ContentLength or Content-Type.",
    takeaway: "Middleware that reads or wraps Response.Body must be carefully tested with streaming endpoints (SSE, gRPC, large file downloads). A middleware that's harmless for JSON APIs can completely break streaming — and the failure mode is subtle, not an immediate error.",
  },
];

export default function MiddlewarePage() {
  return (
    <MotionFade>
      <Section
        title="ASP.NET Core Middleware Pipeline"
        subtitle="Every HTTP request passes through a chain of middleware — order matters more than you think."
      >
        <MiddlewareVisualizer />
        <ConceptExplainer
          overview="The ASP.NET Core middleware pipeline is a series of components assembled at startup. Each component receives an HttpContext, can inspect and modify the request, optionally calls the next component, then can inspect and modify the response on the way back. Think of it as an onion — request goes in through each layer, response comes back through those same layers in reverse."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Middleware Order in Program.cs", code: CODE_EXAMPLE }}
          whyItMatters="Middleware order causes more production incidents than almost any other ASP.NET Core concept. A CORS middleware placed after authentication will silently fail for browser clients. An exception handler placed anywhere but first means exceptions from earlier middleware are uncaught. Getting the order right — and documenting why — is one of the most important things you can do in Program.cs."
          pitfalls={[
            "UseCors() MUST come before UseAuthentication(). Browser preflight OPTIONS requests don't include credentials, so if authentication runs first it will reject preflights with 401 before CORS headers are ever added.",
            "Calling 'await next(context)' twice will throw 'Cannot write to response after headers have been sent'. This usually happens in error handling code where you forget to return after writing the response.",
            "UseExceptionHandler must be the FIRST middleware. If you put it after UseHttpsRedirection, exceptions thrown during HTTPS redirect are uncaught.",
            "UseRouting() must come BEFORE UseAuthorization(). Authorization needs the endpoint metadata (from [Authorize]) which is only populated after routing resolves the endpoint.",
            "Convention-based middleware (with InvokeAsync but not implementing IMiddleware) is instantiated once as a singleton. Injecting scoped services in the constructor will cause a captured dependency bug — inject them via InvokeAsync parameters instead.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
