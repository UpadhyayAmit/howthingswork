"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const ModelBindingVisualizer = dynamic(() => import("./ModelBindingVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// The model — DataAnnotations drive both binding and validation
public class CreateOrderRequest
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string ProductName { get; set; } = string.Empty;

    [Required]
    [Range(1, 10000)]
    public int Quantity { get; set; }

    [Required]
    [EmailAddress]
    public string CustomerEmail { get; set; } = string.Empty;

    [FromHeader(Name = "X-Idempotency-Key")]
    public string? IdempotencyKey { get; set; }
}

[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;

    public OrdersController(IOrderService orderService)
        => _orderService = orderService;

    // [ApiController] auto-returns 400 if ModelState is invalid
    // No need for: if (!ModelState.IsValid) return BadRequest(...)
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateOrderRequest request,        // JSON body
        [FromQuery] string? source,                   // ?source=web
        [FromRoute] string? tenantId,                 // route param
        CancellationToken cancellationToken)
    {
        var order = await _orderService.CreateAsync(request, source, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
    }

    // Custom model binder for complex query string object
    [HttpGet("search")]
    public IActionResult Search(
        [FromQuery][ModelBinder(typeof(OrderSearchBinder))] OrderSearchFilter filter)
    {
        // filter is fully populated from ?minPrice=10&maxPrice=500&status=active
        return Ok();
    }
}

// IValidatableObject for cross-property validation
public class DateRangeRequest : IValidatableObject
{
    public DateTimeOffset From { get; set; }
    public DateTimeOffset To { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (To <= From)
            yield return new ValidationResult(
                "To must be after From",
                new[] { nameof(To) });
    }
}`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Binding Source Selection",
    body: "ASP.NET Core looks at parameter attributes to determine where to read from: [FromBody] reads the request body (JSON/XML via input formatters), [FromQuery] reads query string values, [FromRoute] reads matched route parameters, [FromHeader] reads HTTP headers, [FromForm] reads form data.",
  },
  {
    title: "[ApiController] Inference Rules",
    body: "When [ApiController] is present, binding sources are inferred: complex types → [FromBody], simple types that appear in route template → [FromRoute], everything else → [FromQuery]. This inference can surprise you when you add a new route parameter that clashes with an existing query string parameter.",
  },
  {
    title: "Input Formatters for [FromBody]",
    body: "The Content-Type header determines which input formatter is used. 'application/json' → System.Text.Json (default) or Newtonsoft.Json. 'application/xml' → XML formatter (must be added explicitly). If no formatter handles the Content-Type, the request is rejected with 415 Unsupported Media Type.",
  },
  {
    title: "DataAnnotations Validation",
    body: "After binding, ASP.NET Core runs DataAnnotations validation on all bound models. [Required], [Range], [StringLength], [EmailAddress], [RegularExpression] etc. Results are stored in ModelState. With [ApiController], invalid ModelState automatically returns a 400 ProblemDetails response before your action executes.",
  },
  {
    title: "ModelState and Manual Checking",
    body: "Without [ApiController], you must check ModelState.IsValid yourself. The automatic 400 behavior of [ApiController] calls the InvalidModelStateResponseFactory delegate, which you can override globally to customize the error format — useful for APIs that need a specific error schema.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "[FromBody]",
    definition: "Reads the entire request body using an input formatter. Can only be used ONCE per action — the body stream can't be rewound. Complex type default with [ApiController].",
    icon: "📦",
  },
  {
    term: "[FromQuery]",
    definition: "Reads from the URL query string: ?name=value. Works for simple types and collections (repeated keys). Complex types need a custom model binder.",
    icon: "❓",
  },
  {
    term: "[FromRoute]",
    definition: "Reads from matched route parameters. Automatically inferred for parameters that appear in the route template when [ApiController] is present.",
    icon: "🛤️",
  },
  {
    term: "[FromHeader]",
    definition: "Reads a specific HTTP header. Header names are case-insensitive in HTTP but you specify them in the Name property: [FromHeader(Name = \"X-Api-Key\")].",
    icon: "📋",
  },
  {
    term: "ModelState",
    definition: "Dictionary of field-level validation results. ModelState.IsValid is false if any bound value failed validation. ModelState[\"Email\"].Errors contains the failure messages.",
    icon: "✅",
  },
  {
    term: "IValidatableObject",
    definition: "Interface for cross-property validation logic that can't be expressed with a single attribute. Validate() is called after all attribute validation passes.",
    icon: "🔗",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "Body Stream Already Read — Silent Empty Model",
    scenario: "You have a middleware that reads the request body to log audit trails. After deployment, all POST endpoints start receiving empty/null models. No errors, no exceptions — just null data being saved to the database.",
    problem: "[FromBody] reads from the request body stream, which is forward-only by default. Your logging middleware called await new StreamReader(context.Request.Body).ReadToEndAsync() which advanced the stream position to the end. When the model binder ran later, it read an empty stream and silently bound an empty model.",
    solution: "Enable request body buffering BEFORE any middleware that reads it: app.Use(async (ctx, next) => { ctx.Request.EnableBuffering(); await next(); }). EnableBuffering() wraps the stream in a FileBufferingReadStream that supports seeking. Also set context.Request.Body.Position = 0 after reading in your middleware.",
    takeaway: "The request body is a stream, not a string. Middleware that reads it MUST call EnableBuffering() and reset the position afterward. This is one of those bugs that's invisible — the model binds as empty without throwing, and data gets corrupted silently.",
  },
  {
    title: "Missing [ApiController] Means No Auto-Validation",
    scenario: "You have a legacy controller inheriting from Controller (not ControllerBase) without [ApiController]. You add DataAnnotations to your model expecting automatic 400 responses for invalid input. Invalid data reaches your service layer and causes a NullReferenceException.",
    problem: "[ApiController] is what enables automatic ModelState validation. Without it, ASP.NET Core populates ModelState but NEVER checks it automatically — your action receives invalid data as if it were valid. The [Required] on an email field means nothing if you don't check ModelState.IsValid.",
    solution: "Add [ApiController] to all API controllers. For legacy controllers you can't annotate, add a global action filter: builder.Services.AddControllers(options => options.Filters.Add<ValidateModelStateFilter>()). Implement ValidateModelStateFilter to check ModelState.IsValid and return 400 for all actions.",
    takeaway: "DataAnnotations validation requires [ApiController] for automatic enforcement. Adding [Required] to your model creates a false sense of security if you don't verify it's actually being enforced. Always test that invalid requests actually return 400, not just that valid requests return 200.",
  },
  {
    title: "DateTimeOffset Parsing Fails on Non-English Servers",
    scenario: "Your API accepts a date parameter via [FromQuery]. Works perfectly on your machine and CI (en-US). Deployed to a German server (de-DE), and all date queries return 400 Bad Request — even with valid dates like '2024-01-15'.",
    problem: "Model binding uses the current thread's CultureInfo for parsing. The de-DE culture uses '.' as a decimal separator and expects DD.MM.YYYY date format. '2024-01-15' doesn't match the German date pattern, so binding fails with a parse error and ModelState marks the field as invalid.",
    solution: "Use ISO 8601 format (yyyy-MM-dd) in combination with DateTimeOffset binding that explicitly specifies invariant culture. Register a custom ModelBinderProvider, or use a string parameter and parse manually with DateTimeOffset.Parse(value, CultureInfo.InvariantCulture). For [FromBody] JSON, System.Text.Json handles ISO 8601 correctly regardless of culture.",
    takeaway: "Model binding is culture-sensitive for [FromQuery] and [FromRoute] by default. Any server not running en-US culture will fail to parse dates that work on your dev machine. Either use ISO 8601 with explicit invariant culture parsing, or switch to POST bodies where System.Text.Json handles culture-invariant parsing automatically.",
  },
];

export default function ModelBindingPage() {
  return (
    <MotionFade>
      <Section
        title="Model Binding & Validation"
        subtitle="How [FromBody], [FromQuery], and [FromRoute] pull data from the HTTP request into your C# objects."
      >
        <ModelBindingVisualizer />
        <ConceptExplainer
          overview="Model binding is ASP.NET Core's mechanism for transforming raw HTTP request data — route parameters, query strings, headers, and body — into strongly-typed C# objects. It's automatic, extensible, and deeply integrated with validation. Understanding the binding source hierarchy and how [ApiController] changes the defaults is essential for building APIs that handle invalid input correctly."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Model Binding Sources & DataAnnotations Validation", code: CODE_EXAMPLE }}
          whyItMatters="Model binding is where user input enters your application. Getting it wrong means null reference exceptions, validation bypasses, and silent data corruption. The interaction between [ApiController], ModelState, and [FromBody] contains several non-obvious behaviors that only manifest under specific conditions — the kind that make it to production."
          pitfalls={[
            "[FromBody] reads the request stream once. If any middleware or custom code reads the body before the model binder, the binder gets an empty stream and silently binds null/default values. Always call request.EnableBuffering() before reading the body in middleware.",
            "Missing [ApiController] means ModelState.IsValid is NEVER automatically checked. Your DataAnnotations attributes still populate ModelState, but invalid data reaches your action as if nothing was wrong.",
            "Complex types from query string don't bind automatically. ?filter.minPrice=10&filter.maxPrice=500 requires either [FromQuery] prefix attribute or a custom IModelBinder — it doesn't just work.",
            "DateTimeOffset and DateTime query string binding is culture-sensitive. A date that parses correctly on en-US will fail on de-DE or tr-TR server cultures. Always parse dates with CultureInfo.InvariantCulture explicitly.",
            "The [ApiController] binding source inference can bite you: if you add a route parameter with the same name as an existing [FromQuery] parameter, [ApiController] silently switches it to [FromRoute], changing behavior without any warning.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
