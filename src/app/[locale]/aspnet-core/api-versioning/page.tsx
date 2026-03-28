"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const ApiVersioningVisualizer = dynamic(() => import("./ApiVersioningVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// Install: dotnet add package Asp.Versioning.Mvc (ASP.NET Core 9)

// Program.cs
builder.Services.AddApiVersioning(options =>
{
    // What version to assume when none is specified
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;

    // Include api-supported-versions / api-deprecated-versions in response headers
    options.ReportApiVersions = true;

    // Choose your strategy (or combine multiple readers with ApiVersionReader.Combine)
    options.ApiVersionReader = ApiVersionReader.Combine(
        new UrlSegmentApiVersionReader(),
        new HeaderApiVersionReader("api-version"),
        new QueryStringApiVersionReader("api-version")
    );
}).AddMvc();

// Controller: multiple versions on one class, or split into separate classes
[ApiController]
[Route("api/v{version:apiVersion}/orders")]
[ApiVersion("3.0")]
[ApiVersion("2.0", Deprecated = true)]   // still works, but sends Sunset/Deprecation headers
public class OrdersController : ControllerBase
{
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(ILogger<OrdersController> logger) => _logger = logger;

    [HttpGet("{orderId:guid}")]
    [MapToApiVersion("3.0")]
    public async Task<IActionResult> GetOrderV3(
        Guid orderId,
        CancellationToken cancellationToken)
    {
        // V3 includes nested line items and fulfillment status
        var order = await _orderService.GetWithLineItemsAsync(orderId, cancellationToken);
        if (order is null) return NotFound();
        return Ok(new OrderV3Response(order));
    }

    [HttpGet("{orderId:guid}")]
    [MapToApiVersion("2.0")]
    public async Task<IActionResult> GetOrderV2(
        Guid orderId,
        CancellationToken cancellationToken)
    {
        _logger.LogWarning(
            "Client called deprecated v2 endpoint for order {OrderId}. " +
            "TraceId: {TraceId}",
            orderId, HttpContext.TraceIdentifier);

        var order = await _orderService.GetAsync(orderId, cancellationToken);
        if (order is null) return NotFound();
        return Ok(new OrderV2Response(order));  // old response shape
    }
}

// Version-neutral endpoint (no versioning applied — e.g. health checks)
[ApiController]
[ApiVersionNeutral]
[Route("health")]
public class HealthController : ControllerBase
{
    [HttpGet] public IActionResult Get() => Ok(new { status = "healthy" });
}

// Minimal API version sets (ASP.NET Core 7+ / Asp.Versioning 7+)
var versionSet = app.NewApiVersionSet()
    .HasApiVersion(new ApiVersion(3, 0))
    .HasApiVersion(new ApiVersion(4, 0))
    .HasDeprecatedApiVersion(new ApiVersion(2, 0))
    .ReportApiVersions()
    .Build();

app.MapGet("/api/products/{id}", GetProduct)
   .WithApiVersionSet(versionSet)
   .MapToApiVersion(new ApiVersion(4, 0));`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Request arrives — version reader extracts the version",
    body: "ApiVersioningMiddleware intercepts the request and uses the configured IApiVersionReader(s) to extract the requested API version from the URL segment, query string, or header. Multiple readers can be combined — the framework tries each in order.",
  },
  {
    title: "Version is matched to registered ApiVersions",
    body: "The extracted version is compared against all controllers/endpoints decorated with [ApiVersion]. If AssumeDefaultVersionWhenUnspecified is true and no version is present, the DefaultApiVersion is used. An unregistered version returns 400 Bad Request with a Problem Details body.",
  },
  {
    title: "[MapToApiVersion] routes to the right action",
    body: "When a controller handles multiple versions, [MapToApiVersion] disambiguates which action method handles which version. Without it, all actions in the class apply to all versions declared on the class.",
  },
  {
    title: "Deprecated versions still work — with warning headers",
    body: "Marking a version as Deprecated = true does NOT remove it. The endpoint continues to function and ReportApiVersions injects api-deprecated-versions response headers. For RFC 8594 compliance, manually add Sunset and Deprecation response headers to give clients a removal timeline.",
  },
  {
    title: "ApiVersionNeutral endpoints skip versioning entirely",
    body: "Health checks, metadata endpoints, and OpenAPI documents shouldn't be versioned. Decorate with [ApiVersionNeutral] to bypass the versioning middleware entirely. These routes match regardless of what version header or segment is present.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "Asp.Versioning.Mvc",
    definition: "The official NuGet package (formerly Microsoft.AspNetCore.Mvc.Versioning). Provides AddApiVersioning(), all reader strategies, and [ApiVersion]/[MapToApiVersion] attributes. Install Asp.Versioning.Mvc.ApiExplorer for Swagger integration.",
    icon: "📦",
  },
  {
    term: "ApiVersionReader",
    definition: "Interface for extracting version from a request. Built-in: UrlSegmentApiVersionReader, QueryStringApiVersionReader, HeaderApiVersionReader, MediaTypeApiVersionReader. Combine multiple with ApiVersionReader.Combine().",
    icon: "🔍",
  },
  {
    term: "MapToApiVersion",
    definition: "Attribute on controller action methods to specify which API version(s) the action handles when multiple versions are declared on the same controller class.",
    icon: "🗺️",
  },
  {
    term: "Deprecation vs Removal",
    definition: "Deprecated = true marks a version as outdated but keeps it functional. Use Sunset response headers (RFC 8594) to communicate removal dates. Only remove a version after your monitoring shows zero usage — usually 6-12 months after sunset.",
    icon: "⚠️",
  },
  {
    term: "ApiVersionNeutral",
    definition: "Controller/endpoint attribute that bypasses all versioning logic. Use for health checks, metrics endpoints, OpenAPI docs, or any endpoint that all API versions share identically.",
    icon: "🔄",
  },
  {
    term: "Version Sets (Minimal APIs)",
    definition: "NewApiVersionSet() creates a version set that can be attached to route groups or individual endpoints with .WithApiVersionSet(). Cleaner than attributes for Minimal API style architectures.",
    icon: "🗂️",
  },
  {
    term: "URL vs Header Caching",
    definition: "URL-based versioning (/v1/users vs /v2/users) creates distinct cache keys — CDNs cache them independently with no configuration. Header versioning requires Vary: api-version on responses, or CDNs will serve v1 responses for v2 requests.",
    icon: "⚡",
  },
  {
    term: "ReportApiVersions",
    definition: "When true, adds api-supported-versions and api-deprecated-versions response headers. Allows API consumers to discover available versions programmatically without reading documentation.",
    icon: "📋",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "Breaking Change Forced Every Client to Update Simultaneously",
    scenario: "A B2B platform had 23 enterprise clients calling /api/users. The backend team renamed the email field to emailAddress in a schema change. Three clients broke in production within 30 minutes. Emergency rollback cost 4 hours of engineering time and a SLA penalty.",
    problem: "There was no versioning. Every client called the same unversioned endpoint. A breaking change had no migration path — it was a big bang deployment that all clients had to absorb simultaneously, or none could.",
    solution: "Introduce Asp.Versioning.Mvc with the existing endpoint as v1. Roll out the new schema as v2. Set v1 to Deprecated = true with a Sunset header 6 months out. Email all client integration contacts with the migration guide. Monitor api-version usage metrics to track migration progress. Once usage drops to zero, remove v1.",
    takeaway: "API versioning is primarily about decoupling your deployment cycle from your clients' deployment cycle. Without it, every breaking change requires synchronized deployments across all consumers — which is operationally impossible at scale.",
  },
  {
    title: "CDN Serving Wrong Version After Header Versioning Rollout",
    scenario: "The team switched from URL versioning to header versioning to 'clean up the URLs'. Three days later, client A (sending api-version: 2) started receiving v1 responses intermittently. Investigation found that Azure Front Door was caching the first response for /api/users/1 regardless of the api-version header.",
    problem: "CDNs use the URL as the default cache key. Without Vary: api-version, all requests to /api/users/1 share a single cache entry — regardless of which version header was sent. The first request to populate the cache for a given URL determines what every subsequent request receives.",
    solution: "Add Vary: api-version to all responses when using header versioning, or add cache-busting middleware. Alternatively, revert to URL versioning — /v1/ and /v2/ are distinct URLs and CDNs handle them correctly with zero configuration. Header versioning requires explicit CDN configuration that most teams forget.",
    takeaway: "Header versioning is architecturally clean but operationally dangerous with CDN layers. URL versioning is verbose but predictably cacheable. Choose based on your infrastructure, not aesthetics.",
  },
  {
    title: "Default Version Trap — New Clients Silently Using Deprecated API",
    scenario: "AssumeDefaultVersionWhenUnspecified was set to true with DefaultApiVersion = 1.0. v1.0 was deprecated and sunset-dated 6 months prior. A new frontend team built a new mobile app without reading the API docs. Every call went to v1.0 (the default), and they didn't realize it until v1.0 was actually removed in a cleanup sprint.",
    problem: "With AssumeDefaultVersionWhenUnspecified = true, clients that don't specify a version silently use whatever the default is. If the default is a deprecated or old version, new clients build against an already-obsolete API. There is no warning at integration time.",
    solution: "Set DefaultApiVersion to your latest stable version and update it with each release. Consider setting AssumeDefaultVersionWhenUnspecified = false in production after an initial grace period — clients that don't specify a version get a 400 with a helpful error message listing available versions. This forces clients to make an explicit versioning choice.",
    takeaway: "AssumeDefaultVersionWhenUnspecified is a convenience for migration, not a permanent production setting. Defaulting to the latest version creates pressure on clients to opt into new versions explicitly rather than silently inheriting whatever is current.",
  },
];

export default function ApiVersioningPage() {
  return (
    <MotionFade>
      <Section
        title="API Versioning Strategies"
        subtitle="URL path, query string, or header versioning — each has trade-offs that will bite you when you're on v4 with 3 active clients."
      >
        <ApiVersioningVisualizer />
        <ConceptExplainer
          overview="API versioning is how you evolve a contract without breaking existing consumers. ASP.NET Core 9 with Asp.Versioning.Mvc provides three strategies — URL segment, query string, and header — each with distinct behavior around caching, discoverability, and CDN compatibility. The right choice depends on your client landscape, not convention."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "API Versioning with Asp.Versioning.Mvc (ASP.NET Core 9)", code: CODE_EXAMPLE }}
          whyItMatters="The moment you make your API public or have more than one consumer, you've entered a versioning contract — whether you acknowledge it or not. Breaking changes on unversioned APIs cause production incidents for clients you may not even know about. Proper versioning with deprecation timelines and sunset headers gives you the ability to evolve your API without coordination ceremonies."
          pitfalls={[
            "Forgetting Vary: api-version when using header versioning. CDNs use URL as cache key by default — all versions share one cache entry, causing clients to silently receive responses from the wrong version. Always add Vary: api-version or use URL versioning if you have a CDN.",
            "Default version handling: AssumeDefaultVersionWhenUnspecified = true means unversioned requests silently use DefaultApiVersion. If DefaultApiVersion points to a deprecated version, new clients build against outdated contracts without any warning.",
            "Treating Deprecated = true as equivalent to removal. Deprecated versions continue to serve traffic — you must actively monitor usage metrics and only remove a version after confirmed zero usage over an extended period (typically 30+ days).",
            "URL versioning breaks semantic URL caching. /api/v1/users and /api/v2/users are separate resources — but they may represent the same entity at different points in time. Consider this in your cache invalidation strategy.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
