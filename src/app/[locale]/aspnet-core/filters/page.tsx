"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const FiltersVisualizer = dynamic(() => import("./FiltersVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// Authorization filter — runs before model binding, can short-circuit
public class RequireApiKeyFilter : IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        if (!context.HttpContext.Request.Headers.TryGetValue("X-Api-Key", out var key)
            || key != "secret")
        {
            context.Result = new UnauthorizedResult(); // Short-circuits entire pipeline
        }
    }
}

// Action filter — runs around action execution (before AND after)
public class PerformanceLoggingFilter : IAsyncActionFilter
{
    private readonly ILogger<PerformanceLoggingFilter> _logger;

    public PerformanceLoggingFilter(ILogger<PerformanceLoggingFilter> logger)
        => _logger = logger;

    public async Task OnActionExecutionAsync(
        ActionExecutingContext context,
        ActionExecutionDelegate next)
    {
        var sw = Stopwatch.StartNew();
        var executed = await next(); // Execute the action + remaining action filters
        sw.Stop();

        if (executed.Exception != null && !executed.ExceptionHandled)
        {
            _logger.LogError(executed.Exception, "Action {Action} threw after {Elapsed}ms",
                context.ActionDescriptor.DisplayName, sw.ElapsedMilliseconds);
        }
        else
        {
            _logger.LogInformation("Action {Action} completed in {Elapsed}ms",
                context.ActionDescriptor.DisplayName, sw.ElapsedMilliseconds);
        }
    }
}

// Exception filter — catches exceptions from action + action filters
public class GlobalExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        if (context.Exception is ValidationException ex)
        {
            context.Result = new BadRequestObjectResult(new { errors = ex.Errors });
            context.ExceptionHandled = true; // Prevents further exception filters from running
        }
        // If ExceptionHandled stays false, the exception propagates to middleware
    }
}

// Result filter — runs around result execution
public class ETagResultFilter : IResultFilter
{
    public void OnResultExecuting(ResultExecutingContext context)
    {
        if (context.Result is ObjectResult objectResult)
        {
            var etag = GenerateETag(objectResult.Value);
            context.HttpContext.Response.Headers.ETag = etag;
        }
    }

    public void OnResultExecuted(ResultExecutedContext context) { }
}

// Registration — filter scope matters for order
builder.Services.AddControllers(options =>
{
    options.Filters.Add<GlobalExceptionFilter>();   // Global scope
    options.Filters.Add<ETagResultFilter>();
    options.Filters.Add(new RequireApiKeyFilter(), order: 1);
});

// Controller scope
[ServiceFilter(typeof(PerformanceLoggingFilter))]
public class OrdersController : ControllerBase { }

// Action scope (most specific)
[TypeFilter(typeof(RequireApiKeyFilter))]
public IActionResult SensitiveAction() => Ok();`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Filter Pipeline Within the Request Pipeline",
    body: "Filters are a sub-pipeline that runs inside the endpoint middleware. After the endpoint is matched and model binding completes, filters execute in a specific order: Authorization → Resource → Action → (action executes) → Result. Exception filters wrap the entire sequence.",
  },
  {
    title: "Authorization Filters Run First",
    body: "IAuthorizationFilter runs before model binding. This is intentional — you shouldn't bind the request body or allocate resources for unauthorized requests. If an authorization filter sets context.Result, the entire remaining pipeline is short-circuited.",
  },
  {
    title: "Resource Filters Wrap Everything Else",
    body: "IResourceFilter runs after authorization but before model binding. It wraps action filters, the action, and result filters. Used for caching — the resource filter can return a cached result before model binding even runs, saving significant processing.",
  },
  {
    title: "Action Filters Wrap the Action",
    body: "IActionFilter (or IAsyncActionFilter) has OnActionExecuting (before action) and OnActionExecuted (after action). The async version receives an ActionExecutionDelegate — calling await next() executes the action and returns the result. Anything after next() runs on the way back.",
  },
  {
    title: "Result Filters Wrap Result Execution",
    body: "IResultFilter runs OnResultExecuting before the IActionResult.ExecuteResultAsync() and OnResultExecuted after. Used to add response headers (ETag, Cache-Control) or transform results. Runs even if the action short-circuited by setting context.Result in an action filter.",
  },
  {
    title: "Exception Filters as Last Resort",
    body: "IExceptionFilter catches exceptions from action filters and the action itself. Set ExceptionHandled = true to stop propagation. Critical: exception filters do NOT catch exceptions from resource filters or middleware — only from action filters and the action.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "IAuthorizationFilter",
    definition: "Runs before model binding. Short-circuit by setting context.Result. Use for custom auth logic not covered by policy-based authorization.",
    icon: "🔐",
  },
  {
    term: "IResourceFilter",
    definition: "Wraps model binding, action filters, and result filters. OnResourceExecuting runs before model binding. OnResourceExecuted runs after result filters. Used for output caching.",
    icon: "🗄️",
  },
  {
    term: "IAsyncActionFilter",
    definition: "Single method: OnActionExecutionAsync(context, next). await next() executes the action. Check executed.Exception after next() to handle exceptions. Prefer this over IActionFilter for async work.",
    icon: "⚙️",
  },
  {
    term: "IResultFilter",
    definition: "Wraps result execution. Runs even when the action short-circuits via context.Result. Perfect for adding response headers to all responses from a controller.",
    icon: "📤",
  },
  {
    term: "IExceptionFilter",
    definition: "Catches exceptions from action filters and actions. Does NOT catch exceptions from middleware or resource filters. Set context.ExceptionHandled = true to prevent re-throw.",
    icon: "🚨",
  },
  {
    term: "ServiceFilter vs TypeFilter",
    definition: "ServiceFilter(typeof(T)) resolves T from DI — T must be registered. TypeFilter(typeof(T)) creates T using DI for its own constructor but doesn't require T to be registered. Use ServiceFilter for singleton/scoped filters.",
    icon: "💉",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "Exception Filter Not Catching Middleware Exceptions",
    scenario: "You add a global IExceptionFilter to catch all exceptions and return formatted JSON errors. It works for most cases, but some 500 errors still return the default HTML error page — specifically when UseRateLimiting() throws, and when your custom authentication middleware fails.",
    problem: "Exception filters only catch exceptions thrown by action filters and the action itself. Middleware exceptions (from UseRateLimiting, UseAuthentication, etc.) happen OUTSIDE the filter pipeline. They propagate to the middleware pipeline where no exception filter can intercept them.",
    solution: "Use UseExceptionHandler or a custom exception-handling middleware for exceptions thrown by other middleware. Your exception filter handles action-level exceptions; your exception middleware handles everything else. A common pattern is to duplicate the error formatting logic in both places, or extract it to a shared IErrorResponseFactory service.",
    takeaway: "Exception filters and exception middleware are not interchangeable. Filters only cover the action pipeline. For a consistent error format across all error types, you need BOTH: exception filter for action errors, and UseExceptionHandler for middleware errors.",
  },
  {
    title: "Result Filters Firing When You Expected Short-Circuit",
    scenario: "You have a result filter that adds Cache-Control headers to all responses. An action filter short-circuits a request by setting context.Result = new UnauthorizedResult(). You check the network tab and see Cache-Control headers on the 401 response — caching unauthorized responses crashes the client.",
    problem: "Result filters run even when an action filter short-circuits by setting context.Result. The filter pipeline still executes OnResultExecuting for all result filters before writing the response. Your 'add cache headers' filter had no check for the response status code.",
    solution: "In your result filter's OnResultExecuting, check the result type or status code before adding headers: if (context.Result is ObjectResult { StatusCode: >= 400 }) return; Or check the response status: if (context.HttpContext.Response.StatusCode >= 400) return;. Never blindly add cache headers without checking whether the response should be cached.",
    takeaway: "Short-circuiting in action filters is NOT short-circuiting for result filters. Result filters ALWAYS run unless the result filter itself short-circuits (by setting context.Cancel = true). Guard every result filter against error responses.",
  },
  {
    title: "Filter Execution Order Within Same Scope Is Undefined",
    scenario: "You have three action filters at controller scope: audit logging, performance tracking, and rate limit checking. In development they run in registration order. After a NuGet update, they run in different order. The rate limit check now runs AFTER the audit log, meaning rate-limited requests are being logged as legitimate requests.",
    problem: "When multiple filters have the same scope (all three are controller-scoped), ASP.NET Core makes no guarantee about execution order. The actual order depends on reflection and attribute ordering, which can change between framework versions or compilation settings.",
    solution: "Implement IOrderedFilter or set the Order property on your FilterAttribute. Lower Order values run first in OnXxxExecuting and last in OnXxxExecuted. Explicitly assign: RateLimitFilter.Order = 1, AuditFilter.Order = 2, PerformanceFilter.Order = 3. Add a test that verifies the filter execution order.",
    takeaway: "If filter execution order matters — and it usually does — you MUST set the Order property. Relying on implicit ordering is a ticking time bomb that manifests after framework updates or when the codebase is reorganized. Document the intended order in comments alongside the filter registration.",
  },
];

export default function FiltersPage() {
  return (
    <MotionFade>
      <Section
        title="ASP.NET Core Filters"
        subtitle="Authorization, resource, action, exception, and result filters — the pipeline within the pipeline."
      >
        <FiltersVisualizer />
        <ConceptExplainer
          overview="ASP.NET Core filters form a secondary pipeline inside the endpoint middleware. They execute in a strict order — Authorization, Resource, Action, Result — with Exception filters acting as a catch-all safety net. Each filter type has specific power and specific limitations: knowing which filter to use, and understanding that filters don't catch middleware exceptions, separates correct implementations from brittle ones."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Filter Types, DI Registration & Scope", code: CODE_EXAMPLE }}
          whyItMatters="Filters let you implement cross-cutting concerns (auth, logging, caching, error handling) in a way that's composable and testable. But the non-obvious behaviors — result filters running after short-circuits, exception filters missing middleware errors, and undefined order within a scope — are the source of production bugs that take hours to isolate."
          pitfalls={[
            "Exception filters do NOT catch exceptions from middleware (UseAuthentication, UseRateLimiting, custom middleware). They only catch exceptions from action filters and the action method itself.",
            "Result filters run even when the action short-circuited by setting context.Result in an action filter. If you have a caching result filter, it will add cache headers to 401 and 403 responses unless you explicitly guard against it.",
            "Filter execution order within the same scope (global, controller, or action) is NOT guaranteed. If order matters, implement IOrderedFilter or set the Order property explicitly. This will bite you after a NuGet update.",
            "IAsyncActionFilter and IActionFilter should NOT both be implemented on the same class. If you implement both, only the async version runs — the sync version is completely ignored.",
            "Resource filters run around model binding. If an IResourceFilter.OnResourceExecuting sets context.Result to short-circuit, the action filter pipeline AND result filters still run — but the action does not. This is a common source of confusion about what 'short-circuit' means at the resource filter level.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
