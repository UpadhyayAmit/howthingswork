"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const AuthenticationVisualizer = dynamic(() => import("./AuthenticationVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// Program.cs — ASP.NET Core 9 auth wiring
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
            // ⚠️ this is the footgun — default ClockSkew is 5 minutes
            // Two microservices with drifted clocks can accept "expired" tokens silently
            ClockSkew                = TimeSpan.Zero,
        };
    });

builder.Services.AddAuthorization(options =>
{
    // Policy-based auth — NOT the same as [Authorize(Roles = "Admin")]
    options.AddPolicy("RequireAuditLog", policy =>
        policy.RequireClaim("audit_scope", "write"));

    // Default policy — every [Authorize] attribute must satisfy this
    options.DefaultPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

// In the pipeline, ORDER MATTERS
app.UseAuthentication(); // Populates HttpContext.User
app.UseAuthorization();  // Evaluates [Authorize] policies

// Minimal API — requires "RequireAuditLog" policy
app.MapPost("/audit-entries", CreateAuditEntry)
   .RequireAuthorization("RequireAuditLog");

// Controller — simple "must be authenticated"
[ApiController]
[Authorize]
public class OrdersController : ControllerBase
{
    [AllowAnonymous] // Overrides [Authorize] on controller
    [HttpGet("public")]
    public IActionResult GetPublicInfo() => Ok("no token needed");
}`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Request arrives — UseAuthentication middleware fires",
    body: "Every request first hits the authentication middleware. It inspects the Authorization header (or cookie, or custom scheme). If a Bearer token is present, the JwtBearerHandler is invoked. The middleware calls IAuthenticationService.AuthenticateAsync(), which calls the registered IAuthenticationHandler.",
  },
  {
    title: "Token validation — signature, expiry, claims",
    body: "JwtBearerHandler decodes the JWT. It validates: the signature (using the IssuerSigningKey), the issuer and audience, and the expiry (nbf/exp claims). A single validation failure throws an exception. The ClockSkew parameter gives leeway for clock drift — default 5 minutes, which can hide expired-token bugs in local dev.",
  },
  {
    title: "ClaimsPrincipal construction",
    body: "If validation passes, the handler builds a ClaimsIdentity from the JWT payload, then wraps it in a ClaimsPrincipal. This principal is assigned to HttpContext.User. From this point, User.Identity.IsAuthenticated is true, and User.Claims contains all JWT claims.",
  },
  {
    title: "UseAuthorization middleware evaluates policies",
    body: "The authorization middleware runs AFTER authentication. It reads the [Authorize] attribute (or RequireAuthorization() on minimal APIs) to determine which policy to evaluate. It calls IAuthorizationService.AuthorizeAsync() with the current ClaimsPrincipal and the policy.",
  },
  {
    title: "Policy evaluation — requirements and handlers",
    body: "Each AuthorizationPolicy contains one or more IAuthorizationRequirement objects. The IAuthorizationHandler for each requirement inspects the ClaimsPrincipal and calls context.Succeed() or context.Fail(). All requirements must pass. If any fail, the framework returns 403 Forbidden (not 401 Unauthorized — they mean different things).",
  },
  {
    title: "401 vs 403 — the detail most devs miss",
    body: "401 Unauthorized means: no valid identity was established (no token, or token invalid). 403 Forbidden means: identity was established, but it lacks the required permission. Calling UseAuthentication() without UseAuthorization() in the correct order causes 401s even when a valid token is provided.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "IAuthenticationHandler",
    definition: "The interface JWT, Cookie, and OAuth handlers implement. AuthenticateAsync() verifies the credential and returns an AuthenticateResult containing the ClaimsPrincipal.",
    icon: "🔐",
  },
  {
    term: "ClaimsPrincipal",
    definition: "Represents the authenticated user. Contains one or more ClaimsIdentity objects (one per auth scheme). HttpContext.User is a ClaimsPrincipal.",
    icon: "👤",
  },
  {
    term: "ClaimsIdentity",
    definition: "A single identity from a single authentication scheme. A user can have multiple (e.g., cookie identity + external OAuth identity).",
    icon: "🪪",
  },
  {
    term: "Claim",
    definition: "A key/value pair on a ClaimsIdentity. Examples: sub (subject), email, role, custom claims like tenant_id or audit_scope.",
    icon: "🏷️",
  },
  {
    term: "IAuthorizationRequirement",
    definition: "A marker interface. Represents a single authorization condition (e.g., 'must have claim X'). Evaluated by a paired IAuthorizationHandler.",
    icon: "📋",
  },
  {
    term: "JwtBearerDefaults",
    definition: "The default scheme name 'Bearer'. Used when registering and referencing the JWT authentication scheme in AddAuthentication().",
    icon: "🎫",
  },
  {
    term: "ClockSkew",
    definition: "Leeway added to JWT expiry validation. Default: 5 minutes. Set to TimeSpan.Zero in production to get exact expiry behavior. The default silently accepts tokens that expired 5 minutes ago.",
    icon: "⏱️",
  },
  {
    term: "Policy vs Role vs Claim",
    definition: "Roles are just claims (ClaimTypes.Role). Policies compose multiple requirements. Prefer policies over [Authorize(Roles='X')] — they're testable and composable.",
    icon: "⚖️",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "Every API call started returning 401 after certificate rotation",
    scenario: "Our API gateway rotated the JWT signing certificate at 2 AM. By 2:05 AM, every microservice was returning 401 for valid user sessions. PagerDuty fired 40 alerts in 3 minutes.",
    problem: "The JwtBearerOptions.IssuerSigningKey was hardcoded as a SymmetricSecurityKey in appsettings.json. When the cert rotated, the services were still validating tokens against the OLD key. There was no key rollover window. Every token validation failed with: 'IDX10503: Signature validation failed. Keys tried: ...'",
    solution: "Switch to JwksUri-based validation: options.Authority = identityServerUrl. ASP.NET Core's JwtBearerHandler will fetch the JWKS endpoint and cache signing keys. When a validation fails with a key-mismatch, the handler auto-refreshes the JWKS cache and retries once — giving a zero-downtime key rotation path.",
    takeaway: "Hardcoding IssuerSigningKey is a time bomb. Use Authority + JWKS auto-discovery. The JwtBearerHandler has built-in key refresh logic, but only if you let it fetch keys dynamically.",
  },
  {
    title: "OAuth2 redirect loop with SameSite=Strict cookies",
    scenario: "We deployed a new MVC app with cookie authentication. The login flow worked perfectly in local dev. In production, users were caught in an infinite redirect loop — login page → identity provider → back to app → login page again, forever.",
    problem: "The .AddCookie() middleware defaults changed in .NET 6+ to SameSite=Lax. But our ops team had deployed behind a load balancer that stripped the HTTPS scheme, causing the correlation cookie (set during the OAuth2 code flow) to be rejected. With SameSite=Strict, the browser refuses to send the cookie on the cross-origin redirect from the identity provider, so the OAuth state validation fails.",
    solution: "Set options.Cookie.SameSite = SameSiteMode.None with options.Cookie.SecurePolicy = CookieSecurePolicy.Always. Also configure the ForwardedHeaders middleware BEFORE cookie auth so ASP.NET Core sees the correct HTTPS scheme from the X-Forwarded-Proto header. Without this, cookie Secure flag is never set and SameSite=None cookies are rejected by browsers.",
    takeaway: "Cookie SameSite policy and HTTPS scheme forwarding interact. In any environment behind a reverse proxy, configure UseForwardedHeaders() as the very first middleware before auth. SameSite=None requires Secure=true, which requires the app to know it's behind HTTPS.",
  },
  {
    title: "403 instead of 404 leaking resource existence",
    scenario: "A security audit found that our API was returning 403 Forbidden when an authenticated user hit /api/documents/{id} for a document belonging to another user. This confirmed the document existed — a resource enumeration vulnerability.",
    problem: "The controller had [Authorize] at the class level and a resource-based authorization check inside the action method. When the ownership check failed, we threw a 403. An attacker could probe IDs: 403 = exists but not yours, 404 = doesn't exist at all.",
    solution: "Use IAuthorizationService in the action, but return 404 on authorization failure for sensitive resources: var result = await _authorizationService.AuthorizeAsync(User, document, 'DocumentOwner'); if (!result.Succeeded) return NotFound(); This requires resource-based authorization with a custom IAuthorizationHandler that receives the document as the resource parameter.",
    takeaway: "For sensitive resources, return 404 on authorization failure, not 403. Use IAuthorizationService with resource-based policies rather than [Authorize] attributes. The attribute can't inspect the resource because it runs before the action body fetches the entity.",
  },
];

export default function AuthenticationPage() {
  return (
    <MotionFade>
      <Section
        title="Authentication & Authorization in ASP.NET Core"
        subtitle="How JWT tokens, cookies, and claims flow through the auth pipeline — and why AuthN and AuthZ are different things."
      >
        <AuthenticationVisualizer />
        <ConceptExplainer
          overview="ASP.NET Core separates authentication (who are you?) from authorization (what can you do?). These are two distinct middleware stages. A request first goes through UseAuthentication(), which populates HttpContext.User with a ClaimsPrincipal. Then UseAuthorization() evaluates policy requirements against that principal. Confusing them — or registering them in the wrong order — is the source of a large class of production auth bugs."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "ASP.NET Core 9 — JWT + Policy Auth wiring", code: CODE_EXAMPLE }}
          whyItMatters="Authentication and authorization are foundational to API security. Getting the pipeline order wrong, misconfiguring ClockSkew, or using role-based [Authorize] attributes instead of policies leads to security holes and hard-to-debug 401/403 responses in production. Understanding the claim → principal → policy chain makes these bugs immediately obvious."
          pitfalls={[
            "Calling UseAuthorization() before UseAuthentication() — authorization runs against an unauthenticated (anonymous) principal. Every [Authorize] endpoint returns 401. The correct order is: UseRouting → UseAuthentication → UseAuthorization → UseEndpoints.",
            "Default ClockSkew is 5 minutes. A token that expired at 2:00 PM is still accepted until 2:05 PM. In microservice architectures with token relay, this hides expiry bugs during development. Set ClockSkew = TimeSpan.Zero in production.",
            "Roles are just claims. [Authorize(Roles='Admin')] is equivalent to requiring a claim with type ClaimTypes.Role and value 'Admin'. Use policies instead — they're testable, composable, and don't scatter role strings across controllers.",
            "SameSite=Strict cookie auth breaks OAuth2 redirect flows. The browser won't send the correlation cookie on the cross-origin callback from the identity provider. Use SameSite=Lax or None (with Secure=true) for any app with external identity providers.",
            "Resource-based authorization cannot use [Authorize] attributes alone — the attribute executes before your action method fetches the entity. Inject IAuthorizationService and call AuthorizeAsync(user, resource, policy) inside the action after loading the resource.",
            "AddAuthentication() sets the default scheme. If you have multiple schemes (JWT + Cookie) and don't specify the default challenge scheme, the framework picks the first registered scheme — often not what you want. Always explicitly set DefaultAuthenticateScheme and DefaultChallengeScheme.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
