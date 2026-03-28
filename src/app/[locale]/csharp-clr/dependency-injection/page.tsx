"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const DependencyInjectionVisualizer = dynamic(
  () => import("./DependencyInjectionVisualizer"),
  { ssr: false, loading: () => <VisualizerSkeleton /> }
);

const CODE_EXAMPLE = `// Program.cs — service registration
var builder = WebApplication.CreateBuilder(args);

// Singleton: one instance for the entire app lifetime
builder.Services.AddSingleton<IMemoryCache, MemoryCache>();
builder.Services.AddSingleton<IHttpClientFactory>(_ =>
    new DefaultHttpClientFactory()); // ← manages socket pooling

// Scoped: one instance per HTTP request (or IServiceScope)
builder.Services.AddScoped<AppDbContext>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IOrderService, OrderService>();

// Transient: new instance every time it's resolved
builder.Services.AddTransient<IEmailSender, SendGridEmailSender>();

// ⚠️ this bites everyone eventually — captive dependency
// DON'T register a Scoped service as Singleton:
// builder.Services.AddSingleton<IOrderService, OrderService>();
// ^ OrderService depends on AppDbContext (Scoped)
// The first request's DbContext is captured forever in the Singleton
// System.InvalidOperationException: Cannot access a disposed context instance.
// The object was disposed. See inner exception for details.

// Correct: Singleton that needs Scoped → inject IServiceScopeFactory
builder.Services.AddSingleton<BackgroundJobService>(sp =>
    new BackgroundJobService(sp.GetRequiredService<IServiceScopeFactory>()));

// In BackgroundJobService:
public class BackgroundJobService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;

    public BackgroundJobService(IServiceScopeFactory scopeFactory)
        => _scopeFactory = scopeFactory;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // Create a new scope per job run — gets a fresh DbContext
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider
                .GetRequiredService<AppDbContext>();

            await ProcessPendingJobsAsync(dbContext, stoppingToken);
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}

// IDisposable — the container calls Dispose() when scope ends
public class UserRepository : IUserRepository, IDisposable
{
    private readonly AppDbContext _dbContext;
    private bool _disposed;

    public UserRepository(AppDbContext dbContext)
        => _dbContext = dbContext; // injected — don't dispose it here

    public async Task<User?> FindByIdAsync(Guid userId, CancellationToken ct)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        return await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct);
    }

    public void Dispose()
    {
        _disposed = true;
        // Note: don't dispose _dbContext here — DI container owns it
    }
}`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "IServiceCollection: the registration phase",
    body: "At startup, you register service descriptors — (interface, implementation, lifetime) tuples — into IServiceCollection. No instances are created yet. This is a blueprint. The collection is then used to build an IServiceProvider.",
  },
  {
    title: "IServiceProvider: the resolution phase",
    body: "When you request a service (GetRequiredService<T>() or constructor injection), the provider walks the dependency graph, creates instances in dependency order, and wires them together. Singletons are cached in the root provider; Scoped services are cached in a scope; Transients are created fresh each time.",
  },
  {
    title: "Scopes and the request lifetime",
    body: "ASP.NET Core creates a new IServiceScope for each HTTP request and disposes it when the request ends. All Scoped services created in that scope are disposed together. This ensures DbContext connections are returned to the pool after each request, not held for the app's lifetime.",
  },
  {
    title: "The captive dependency problem",
    body: "A Singleton holding a Scoped service is a captive dependency. The Singleton lives forever, so it captures the Scoped service's first instance and holds it past its intended lifetime. For DbContext, this means stale change tracking, connection pool exhaustion, and eventual ObjectDisposedException.",
  },
  {
    title: "IDisposable and the disposal chain",
    body: "The DI container tracks IDisposable services and calls Dispose() when their scope ends. For Singletons, Dispose() is called at app shutdown. For Scoped, at scope end. Transients are tracked by the scope that resolved them — another reason to avoid Transient IDisposable services in hot paths.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "Singleton",
    definition:
      "One instance for the entire app lifetime. Shared across all requests and threads. Must be thread-safe. Appropriate for: IMemoryCache, IHttpClientFactory, configuration singletons, in-memory state.",
    icon: "🔷",
  },
  {
    term: "Scoped",
    definition:
      "One instance per IServiceScope (one per HTTP request in ASP.NET Core). Safe for non-thread-safe resources like DbContext. Disposed when the scope ends — connections returned to pool.",
    icon: "🔹",
  },
  {
    term: "Transient",
    definition:
      "New instance every time it's resolved. Safest option — no shared state. But expensive if the service holds resources. Avoid IDisposable Transients in high-throughput paths.",
    icon: "🔸",
  },
  {
    term: "Captive Dependency",
    definition:
      "When a longer-lived service (Singleton) captures a shorter-lived one (Scoped or Transient). The inner service is never disposed properly and may hold stale state. The runtime detects some cases and throws InvalidOperationException.",
    icon: "⚠️",
  },
  {
    term: "IServiceScopeFactory",
    definition:
      "Inject this into Singletons that need Scoped services. Call CreateScope() to create a new scope, resolve services within it, and dispose the scope when done. Canonical pattern for hosted services / background workers.",
    icon: "🏭",
  },
  {
    term: "Constructor Injection",
    definition:
      "The preferred injection point in .NET DI. Dependencies declared in the constructor are resolved by the container. Avoid property injection and service locator (GetRequiredService inside classes) — both obscure dependencies and complicate testing.",
    icon: "🏗️",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "The Captive DbContext That Ate Production",
    scenario:
      "Our ASP.NET Core 8 API was running fine for 30 minutes after deployment, then started throwing System.InvalidOperationException: 'Cannot access a disposed context instance' on every request to /api/orders. Rollback didn't help — the same issue appeared after the previous deploy too.",
    problem:
      "A well-intentioned developer had changed OrderService from Scoped to Singleton to 'improve performance.' OrderService depended on AppDbContext (Scoped). The first request's DbContext was captured in the Singleton and disposed after that request ended. All subsequent requests used the same OrderService instance, which held a reference to a disposed DbContext.",
    solution:
      "Reverted OrderService to Scoped. For the parts of OrderService that genuinely needed to be long-lived (a background queue), extracted them into a separate Singleton that used IServiceScopeFactory. Enabled DI validation at startup: builder.Services.BuildServiceProvider(validateScopes: true) catches captive dependencies at app startup rather than in production.",
    takeaway:
      "Enable ValidateScopes: true and ValidateOnBuild: true in your DI configuration. These settings cause the container to throw at startup if any Singleton captures a Scoped service — turning a production outage into a startup failure caught in CI.",
  },
  {
    title: "HttpClient Registered as Transient — Socket Exhaustion",
    scenario:
      "Our payment microservice started throwing SocketException: 'Only one usage of each socket address is normally permitted' under moderate load (~200 req/sec). The dev environment had never seen this. The service worked perfectly for the first 100 seconds, then fell over.",
    problem:
      "HttpClient was registered as Transient, creating a new instance per injection. HttpClient manages a connection pool, but when created and disposed rapidly, it doesn't release TCP sockets immediately — they enter TIME_WAIT state for ~240 seconds. Under load, we exhausted the port range (65535 ports) within seconds.",
    solution:
      "Replaced manual HttpClient registration with IHttpClientFactory: builder.Services.AddHttpClient<PaymentApiClient>(). The factory manages the handler pool internally, reuses connections, and handles DNS refresh. Alternatively, a single Singleton HttpClient works fine for a single service with stable DNS.",
    takeaway:
      "HttpClient implements IDisposable but is designed to be long-lived. Never new it up per request. Use IHttpClientFactory (AddHttpClient<T>()) or a shared Singleton. This is one of the most common production issues with .NET microservices.",
  },
];

export default function DependencyInjectionPage() {
  return (
    <MotionFade>
      <Section
        title="DI Container & Service Lifetimes"
        subtitle="Singleton vs Scoped vs Transient — and the captive dependency bug that will eventually hit your production app."
      >
        <DependencyInjectionVisualizer />
        <ConceptExplainer
          overview="ASP.NET Core's built-in DI container (Microsoft.Extensions.DependencyInjection) manages object creation and lifetime through three primitives: Singleton (one for the app), Scoped (one per request), and Transient (one per injection). Getting lifetimes wrong causes subtle, hard-to-reproduce bugs — a captured DbContext causes stale queries, a Transient HttpClient causes socket exhaustion. Understanding how the container resolves dependencies and disposes them is foundational to building reliable .NET services."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Service Registration & Lifetime Management", code: CODE_EXAMPLE }}
          whyItMatters="Dependency injection is the central plumbing of every modern .NET application. Every controller, Razor component, minimal API handler, background service, and middleware runs inside the DI container's scope graph. Understanding lifetime semantics is the difference between an app that runs for weeks without issues and one that develops subtle state corruption, memory leaks, or ObjectDisposedException under load."
          pitfalls={[
            "Captive dependency: Singleton holding Scoped → Scoped service is never properly disposed, holds stale state, may hold database connections open. The runtime detects this in development but not always in production. Use ValidateScopes: true in all environments.",
            "Resolving from the root scope: calling app.Services.GetRequiredService<T>() for a Scoped service resolves from the root provider — effectively making it a Singleton for the rest of the app lifetime. Always resolve Scoped services within an explicit IServiceScope.",
            "Transient IDisposable in hot paths: the scope tracks all IDisposable transients and disposes them when the scope ends. If you create many transients that implement IDisposable per request, they accumulate in the scope until request end — memory pressure builds up.",
            "HttpClient as Transient: creating and disposing HttpClient frequently exhausts the socket port range due to TIME_WAIT. Use IHttpClientFactory (AddHttpClient<T>()) which manages connection handler pools with automatic refresh.",
            "Not implementing IDisposable when holding resources: if your Scoped service opens a file handle, database connection, or semaphore but doesn't implement IDisposable, those resources leak — the container can't clean up what it doesn't know about.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
