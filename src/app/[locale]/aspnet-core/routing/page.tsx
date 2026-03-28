"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const RoutingVisualizer = dynamic(() => import("./RoutingVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// Attribute routing — the preferred approach for APIs
[ApiController]
[Route("api/[controller]")]  // Resolves to "api/users"
public class UsersController : ControllerBase
{
    // GET api/users
    [HttpGet]
    public IActionResult GetAll() => Ok();

    // GET api/users/42  — {id:int} constraint ensures int-only
    [HttpGet("{id:int}")]
    public IActionResult GetById(int id) => Ok();

    // GET api/users/search?q=alice&page=2
    [HttpGet("search")]
    public IActionResult Search([FromQuery] string q, [FromQuery] int page = 1) => Ok();

    // PUT api/users/42/roles/admin  — multiple route params
    [HttpPut("{id:int}/roles/{roleName:alpha}")]
    public IActionResult AssignRole(int id, string roleName) => Ok();
}

// Minimal API with route groups (ASP.NET Core 9)
var users = app.MapGroup("/api/users")
    .RequireAuthorization()
    .WithTags("Users");

users.MapGet("/", async (IUserService _userService, CancellationToken cancellationToken)
    => await _userService.GetAllAsync(cancellationToken));

users.MapGet("/{id:int}", async (int id, IUserService _userService, CancellationToken cancellationToken)
    => await _userService.GetByIdAsync(id, cancellationToken) is { } user
        ? Results.Ok(user)
        : Results.NotFound());

// Route constraint examples
// {id:int}          — must be parseable as int
// {id:int:min(1)}   — int AND >= 1
// {name:alpha}      — letters only
// {slug:regex(^[a-z0-9-]+$)}  — custom regex
// {id:guid}         — must be a valid GUID`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Endpoint Registration",
    body: "At startup, all routes are collected from controllers (via MapControllers) and Minimal API definitions. Each route template is compiled into a RoutePattern — a tree structure that enables O(1) or O(log n) matching rather than linear scan.",
  },
  {
    title: "Route Matching with Constraints",
    body: "When a request arrives, the router walks the route tree. Templates with constraints (like {id:int}) eliminate candidates early. The {id:int} constraint means 'match any segment AND successfully parse it as an integer'. A segment like 'abc' is rejected before the action is considered.",
  },
  {
    title: "Ambiguity Resolution",
    body: "If multiple routes match, ASP.NET Core uses a precedence algorithm: literal segments > constrained parameters > unconstrained parameters > catch-all. If two routes have identical precedence, an AmbiguousMatchException is thrown at runtime — not at startup.",
  },
  {
    title: "Endpoint Metadata",
    body: "The matched endpoint carries metadata: [Authorize] attributes, accepted HTTP methods, response types, OpenAPI descriptions. This is why UseAuthorization must come after UseRouting — the auth middleware reads this metadata to decide whether to allow the request.",
  },
  {
    title: "Parameter Binding from Route",
    body: "Route parameter names must match action parameter names (or [FromRoute(Name='...')] explicitly). The route value 'id' from {id:int} automatically binds to the int id parameter. Case is insensitive but naming must match.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "Route Template",
    definition: "Pattern like 'api/users/{id:int}'. Literal segments must match exactly. Parameter segments ({id}) capture values. Constraints (:int, :guid) restrict what values are accepted.",
    icon: "📝",
  },
  {
    term: "Route Constraints",
    definition: "{id:int} — must parse as int. {id:int:min(1)} — int AND >= 1. {name:alpha} — letters only. {id:guid} — valid GUID. Custom constraints via IRouteConstraint.",
    icon: "🔒",
  },
  {
    term: "Attribute Routing",
    definition: "[HttpGet(\"{id:int}\")] on controller actions. Explicit, predictable, and doesn't depend on controller/action naming conventions. Required for [ApiController].",
    icon: "🏷️",
  },
  {
    term: "Route Groups",
    definition: "app.MapGroup(\"/api/users\") creates a group where all child routes share the prefix, plus shared middleware, auth policy, and metadata. ASP.NET Core 7+.",
    icon: "📁",
  },
  {
    term: "Catch-All Parameters",
    definition: "{**slug} matches everything including slashes. Must be the last segment. They block all routes defined after them that share the same prefix — a common source of hard-to-find bugs.",
    icon: "🌐",
  },
  {
    term: "AmbiguousMatchException",
    definition: "Thrown when two routes match with equal precedence. Not thrown at startup — only when the ambiguous URL is actually requested. Can hide in production for months.",
    icon: "⚠️",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "AmbiguousMatchException Reaching Production",
    scenario: "Your API has GET /api/users/{id:int} (controller A) and GET /api/users/{username} (controller B). Everything works in development. Three months later, a user with a numeric username triggers an AmbiguousMatchException in production.",
    problem: "Both routes match when the segment is a number (like '42'). {id:int} matches because '42' is a valid int. {username} matches because it's unconstrained. ASP.NET Core precedence: constrained params > unconstrained. But both routes had been accidentally given the same precedence through a refactor that added a global route prefix.",
    solution: "Make routes unambiguous by design. Use separate path prefixes: /api/users/by-id/{id:int} vs /api/users/by-name/{username}. Or add an :alpha constraint to {username:alpha} to exclude numeric-only values. Write a startup test that enumerates all routes and asserts no duplicates.",
    takeaway: "AmbiguousMatchException is a runtime error that only fires when the ambiguous URL is hit. Write integration tests for every route pattern in your API, not just the happy path — the exception won't surface until a specific input hits both routes simultaneously.",
  },
  {
    title: "Catch-All Route Blocking Downstream Endpoints",
    scenario: "You add a catch-all route /files/{**path} for a file-serving feature. Suddenly /files/upload stops working — it was a separate POST endpoint, but now the catch-all intercepts GET requests to /files/upload and returns 405 Method Not Allowed instead of 404.",
    problem: "The catch-all {**path} has the lowest route precedence, but once matched, the endpoint's [HttpGet] constraint rejects the POST method. The POST to /files/upload matched the catch-all (because literal 'upload' was behind it), not the dedicated upload endpoint.",
    solution: "Register more-specific routes before catch-all routes when using convention routing. With attribute routing, explicitly scope the catch-all: [HttpGet(\"files/{**path}\")] and ensure [HttpPost(\"files/upload\")] has higher precedence. Test by listing all registered endpoints via app.Services.GetRequiredService<EndpointDataSource>().",
    takeaway: "Catch-all routes are greedy and their interactions with method constraints are non-obvious. Any route that shares a prefix with a catch-all needs explicit verification. Log all registered endpoints at startup in development to catch these conflicts early.",
  },
  {
    title: "Route Constraint Not Validating Range",
    scenario: "You use {id:int} thinking it validates that the ID is a positive number. A user passes id=0 or id=-1 and your service throws an InvalidOperationException because it queries the database with an invalid ID. The constraint didn't protect you.",
    problem: "{id:int} only validates that the segment can be parsed as an int. It does NOT validate the value range. -2147483648 is a valid int and passes the constraint. Your business logic expected a positive value but got garbage, and the error is a 500 rather than a clean 400.",
    solution: "Use {id:int:min(1)} to enforce minimum value at the routing level. Alternatively, add model validation with [Range(1, int.MaxValue)] on your action parameter. For IDs specifically, consider using {id:guid} if you're on GUIDs — they're globally unique and unguessable, eliminating the range validation problem entirely.",
    takeaway: "Route constraints are for route matching disambiguation, not for business rule validation. Don't rely on :int to validate your business domain rules. Use DataAnnotations or FluentValidation for value-level validation — constraints only get you type-parsing.",
  },
];

export default function RoutingPage() {
  return (
    <MotionFade>
      <Section
        title="Routing & Endpoint Resolution"
        subtitle="How ASP.NET Core matches an incoming URL to your controller action — and what happens when two routes conflict."
      >
        <RoutingVisualizer />
        <ConceptExplainer
          overview="ASP.NET Core routing matches incoming HTTP requests to endpoint handlers using compiled route trees. It's more than pattern matching — constraints, precedence rules, and endpoint metadata all play a role. Understanding how the router selects a winner (and throws when it can't decide) is essential for building APIs that behave predictably under all inputs."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Attribute Routing & Minimal API Route Groups", code: CODE_EXAMPLE }}
          whyItMatters="Routing bugs are among the hardest to diagnose because they're input-dependent — your happy-path tests pass, but a specific URL pattern causes a 500 in production months later. AmbiguousMatchException, catch-all route conflicts, and constraint misuse are all production incidents waiting to happen if you don't understand the matching rules."
          pitfalls={[
            "AmbiguousMatchException is thrown at REQUEST time, not at startup. You can have two conflicting routes registered for months and never know until a specific URL hits both.",
            "{id:int} does NOT validate range. id=-1 passes the constraint and reaches your action. Use {id:int:min(1)} or [Range(1, int.MaxValue)] for business validation.",
            "Catch-all parameters ({**slug}) must be the LAST segment and they shadow all more-specific routes registered with the same prefix if order isn't correct.",
            "Missing [Route] on a base controller class means attribute routing is undefined — [HttpGet] on actions without a controller-level [Route] will silently use empty prefix.",
            "Convention routing (MapControllerRoute) respects ORDER — the first matching template wins. Unlike attribute routing, there's no precedence algorithm. Routes defined second can be permanently unreachable.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
