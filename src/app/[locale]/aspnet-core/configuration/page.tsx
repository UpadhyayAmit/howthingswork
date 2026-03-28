"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const ConfigurationVisualizer = dynamic(() => import("./ConfigurationVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// appsettings.json
{
  "EmailService": {
    "Host": "smtp.internal.corp",
    "Port": 587,
    "TimeoutMs": 5000,
    "EnableSsl": true
  }
}

// The strongly-typed options class
public class EmailServiceOptions
{
    public const string SectionName = "EmailService";

    [Required]
    public string Host { get; set; } = default!;

    [Range(1, 65535)]
    public int Port { get; set; }

    [Range(100, 30000)]
    public int TimeoutMs { get; set; } = 5000;

    public bool EnableSsl { get; set; } = true;
}

// Program.cs — bind and validate at startup
builder.Services
    .AddOptions<EmailServiceOptions>()
    .BindConfiguration(EmailServiceOptions.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart(); // ⚠️ fail fast — don't wait until first use

// ❌ DON'T inject IConfiguration directly into services
// This creates tight coupling to config keys (magic strings) and
// makes the service impossible to unit test without a fake IConfiguration
public class BadEmailService(IConfiguration config)
{
    // ⚠️ this is the footgun — magic string, breaks on rename
    var host = config["EmailService:Host"];
}

// ✅ DO inject IOptions<T> — your service has no knowledge of config sources
public class EmailService(IOptions<EmailServiceOptions> options)
{
    private readonly EmailServiceOptions _opts = options.Value;

    public async Task SendAsync(string to, string subject)
    {
        using var client = new SmtpClient(_opts.Host, _opts.Port)
        {
            EnableSsl = _opts.EnableSsl,
            Timeout   = _opts.TimeoutMs,
        };
        // ...
    }
}

// IOptionsMonitor for hot-reload (no app restart needed)
public class FeatureFlagService(IOptionsMonitor<FeatureFlagOptions> monitor)
{
    public bool IsEnabled(string flag)
    {
        // .CurrentValue always returns the latest config
        // even after appsettings.json was changed on disk
        return monitor.CurrentValue.Flags.GetValueOrDefault(flag);
    }
}

// Environment variable override — use __ (double underscore) as separator
// EmailService__Host=smtp.prod.corp
// EmailService__Port=465
// These OVERRIDE the appsettings.json values at runtime`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Provider registration builds the configuration pipeline",
    body: "WebApplication.CreateBuilder() registers providers in order: appsettings.json → appsettings.{Environment}.json → User Secrets (Development only) → Environment Variables → Command-line arguments. Providers are evaluated last-wins: a key present in Environment Variables overrides the same key in appsettings.json.",
  },
  {
    title: "Key lookup walks the provider chain from last to first",
    body: "When you read IConfiguration['EmailService:Host'], the framework asks each provider (in reverse registration order) whether it has the key. The first provider that has the key wins. This is why Environment Variables override appsettings.json — they were registered later.",
  },
  {
    title: "Hierarchical keys use ':' in code, '__' in environment variables",
    body: "JSON nesting is flattened with ':' separators: { 'EmailService': { 'Host': 'x' } } becomes key 'EmailService:Host'. Environment variables cannot contain ':', so they use '__' (double underscore) as the separator: EmailService__Host=x. The configuration system translates both to the same flat key.",
  },
  {
    title: "IOptions<T>.BindConfiguration maps the section to a POCO",
    body: "AddOptions<T>().BindConfiguration('SectionName') uses reflection to map JSON keys to matching property names on T (case-insensitive). This happens once at startup for IOptions<T> (singleton) or per-request for IOptionsSnapshot<T>. The binding ignores unknown keys, so a typo in a config key will silently go unbound — which is why ValidateDataAnnotations() is essential.",
  },
  {
    title: "ValidateOnStart fails the application at startup if config is invalid",
    body: "Without ValidateOnStart(), validation errors surface at first use — potentially in a production request handler returning 500s. With ValidateOnStart(), the host fails to start if the options don't pass [Required] / [Range] / custom validation. This turns a runtime bug into a deployment gate.",
  },
  {
    title: "IOptionsMonitor vs IOptionsSnapshot vs IOptions",
    body: "IOptions<T>: singleton, reads config once. Never reloads. IOptionsSnapshot<T>: scoped (one per request), re-reads config each request (will pick up file changes, but only between requests). IOptionsMonitor<T>: singleton, but CurrentValue is updated whenever the source file changes — and you can register OnChange callbacks.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "IConfiguration",
    definition: "The raw configuration abstraction. A flat key/value store. Supports hierarchical access via ':' separators. Don't inject this directly into your services — use IOptions<T> instead.",
    icon: "🗂️",
  },
  {
    term: "IConfigurationRoot",
    definition: "The concrete root that IConfiguration is built from. Has a Providers collection (the chain). GetDebugView() is your best friend when a config value isn't being picked up.",
    icon: "🌳",
  },
  {
    term: "IOptions<T>",
    definition: "Singleton. Reads config once at application start. Value does not change even if appsettings.json is modified. Best for: database connection strings, fixed infrastructure config.",
    icon: "📌",
  },
  {
    term: "IOptionsSnapshot<T>",
    definition: "Scoped. Creates a new snapshot per HTTP request, reading the latest config values. Can pick up file changes between requests. Can't be injected into Singletons (lifetime mismatch).",
    icon: "📸",
  },
  {
    term: "IOptionsMonitor<T>",
    definition: "Singleton. CurrentValue always reflects the latest configuration. Supports OnChange callbacks. The correct choice for Singletons that need live config reloading (feature flags, rate limits).",
    icon: "👁️",
  },
  {
    term: "ValidateOnStart",
    definition: "Validates options against DataAnnotations at host startup rather than first use. Turns invalid configuration from a runtime 500 into a deployment failure. Always use this.",
    icon: "🛡️",
  },
  {
    term: "Named Options",
    definition: "Multiple configurations of the same type: AddOptions<SmtpOptions>('primary').BindConfiguration('Smtp:Primary'). Resolve with IOptionsSnapshot<SmtpOptions>.Get('primary').",
    icon: "🏷️",
  },
  {
    term: "User Secrets",
    definition: "Development-only provider (ASPNETCORE_ENVIRONMENT=Development). Stores secrets.json outside the project directory, keeping credentials out of source control. Uses dotnet user-secrets set.",
    icon: "🔒",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "Production outage: config key typo silently used defaults for 3 months",
    scenario: "Our payment service had a TimeoutMs option for external API calls. The production environment had an env var set to 500 (half a second, very tight). Under holiday load, calls started timing out. We discovered the env var had been set as 'PaymentService_TimeoutMs' (single underscore) for 3 months — the double-underscore convention had never been documented.",
    problem: "Single underscore is not a valid nesting separator for ASP.NET Core environment variable configuration. The value was never bound to PaymentServiceOptions.TimeoutMs. The class had a default of 30,000 ms (30 seconds). Under normal load this was fine. Under holiday spikes, 30-second timeouts caused thread pool exhaustion and a cascade of request queuing.",
    solution: "Renamed to PaymentService__TimeoutMs (double underscore). Added ValidateOnStart() with [Range(100, 10000)] on TimeoutMs. Added a startup integration test that reads IOptions<PaymentServiceOptions> from a real configuration built from env vars, asserting the value matches what was set. The integration test would have caught the single-underscore error immediately.",
    takeaway: "Environment variable configuration separators must be double underscore (__). Document this explicitly in every runbook. Add ValidateOnStart() with range/required constraints so misconfiguration fails the deployment, not the first production request.",
  },
  {
    title: "Feature flag service reading stale config — IOptions<T> doesn't reload",
    scenario: "We had a feature flag system using IOptions<FeatureFlagOptions>. We deployed a config change to enable a new checkout flow for 100% of users by updating appsettings.json. The change deployed fine but the new checkout flow never activated. We rolled back, redeploy, same result. The feature was 'off' for 4 hours until someone restarted the process.",
    problem: "FeatureFlagService was registered as a Singleton and injected IOptions<FeatureFlagOptions>. IOptions<T> reads the configuration once when the options object is first resolved — at application start. appsettings.json changes after startup are completely ignored by IOptions<T>. Even though the file was updated and the IConfigurationRoot had the new value, the options snapshot was frozen.",
    solution: "Changed injection to IOptionsMonitor<FeatureFlagOptions>. Replaced options.Value with monitor.CurrentValue in all call sites. IOptionsMonitor registers a file watcher on appsettings.json and updates CurrentValue when the file changes. Changes now propagate within ~1 second of the file being updated, with no restart required.",
    takeaway: "IOptions<T> is frozen at startup. For any configuration that should respond to runtime changes (feature flags, rate limits, timeouts), use IOptionsMonitor<T> in Singleton services or IOptionsSnapshot<T> in Scoped services. IOptions<T> is only appropriate for truly static configuration.",
  },
  {
    title: "Secret leaked to git via appsettings.Development.json",
    scenario: "A security scan found our Stripe test API key in the public GitHub repository. It had been committed in appsettings.Development.json by a developer who didn't know about User Secrets. The key was used for test charges, but test keys give full API introspection including customer data schemas.",
    problem: "The developer needed the Stripe key for local development. They added it to appsettings.Development.json, which is not in .gitignore by default. It was committed and pushed. The .gitignore template for ASP.NET Core excludes appsettings.*.json only if you explicitly add that pattern — the default template only excludes appsettings.Development.json in some versions.",
    solution: "Revoked the key immediately. Added appsettings.Development.json to .gitignore (belts and suspenders). Set up dotnet user-secrets for all developers: dotnet user-secrets set 'Stripe:ApiKey' 'sk_test_...'. The User Secrets provider only activates when ASPNETCORE_ENVIRONMENT=Development and stores values in %APPDATA%\\Microsoft\\UserSecrets\\{projectId}\\secrets.json, outside the repo. CI/CD uses environment variables injected by the pipeline.",
    takeaway: "Never put secrets in appsettings.json or any file committed to source control. Use User Secrets in development (dotnet user-secrets), environment variables in CI/CD, and Azure Key Vault or similar in production. The configuration provider chain means User Secrets and env vars will always override the base appsettings.json value.",
  },
];

export default function ConfigurationPage() {
  return (
    <MotionFade>
      <Section
        title="Configuration & the Options Pattern"
        subtitle="How appsettings.json, environment variables, and IOptions<T> layer together — and why you should never read IConfiguration directly in your services."
      >
        <ConfigurationVisualizer />
        <ConceptExplainer
          overview="ASP.NET Core's configuration system is a layered provider pipeline. Each source (JSON files, environment variables, command-line args, Azure Key Vault) is a provider. Providers are registered in order, and later providers override earlier ones for the same key. The Options pattern (IOptions<T>, IOptionsSnapshot<T>, IOptionsMonitor<T>) maps this flat key/value store to strongly-typed POCOs with validation, eliminating magic strings and making your services testable."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "ASP.NET Core 9 — Options pattern with validation", code: CODE_EXAMPLE }}
          whyItMatters="Configuration bugs are silent until they cause production failures. A missing key falls back to a default, a typo in an env var name is ignored, and IOptions never reloads. The options pattern with ValidateOnStart() and data annotation validation turns these silent failures into deployment-time errors — which is exactly when you want to catch them."
          pitfalls={[
            "Injecting IConfiguration directly into services couples them to the config key structure (magic strings). This makes renaming a JSON key a refactoring nightmare and makes unit testing require a fake IConfiguration. Always use IOptions<T>.",
            "IOptions<T> is a Singleton that reads config ONCE at startup. If you're using it for feature flags, rate limits, or anything that needs to change without a restart, you need IOptionsMonitor<T>. Many developers discover this 6 months after writing the code.",
            "Environment variable separator is double underscore (__), not single underscore (_). 'MySection_MyKey' is a top-level key, not a nested one. This is the most common env var configuration bug in Docker/Kubernetes deployments.",
            "ValidateDataAnnotations() without ValidateOnStart() validates lazily — on first use. The first HTTP request that resolves your options will get an InvalidOperationException. Add .ValidateOnStart() to fail at deployment time, not at first user request.",
            "IOptionsSnapshot<T> is Scoped — it cannot be injected into a Singleton service. If you need live config in a Singleton, use IOptionsMonitor<T>. This is a compile-time-invisible runtime exception: 'Cannot consume scoped service from singleton.'",
            "Named options (Get('name')) don't support ValidateDataAnnotations out of the box. You need AddOptions<T>('name').ValidateDataAnnotations() explicitly for each named instance. Easy to miss when adding a second named options instance.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
