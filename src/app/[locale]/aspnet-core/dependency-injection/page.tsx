"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const AspNetDIVisualizer = dynamic(() => import("./AspNetDIVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// Program.cs — registering services with different lifetimes
builder.Services.AddSingleton<IAppCache, MemoryAppCache>();     // one instance, ever
builder.Services.AddScoped<IOrderRepository, OrderRepository>();  // one per HTTP request
builder.Services.AddTransient<IEmailFormatter, EmailFormatter>(); // new on every inject

// ⚠️ this is the footgun — DbContext as Singleton
// builder.Services.AddSingleton<AppDbContext>(); // NEVER DO THIS

// Correct — Scoped DbContext (one per request, disposed after)
builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseSqlServer(connectionString)); // AddDbContext registers as Scoped by default

// .NET 8+ Keyed Services — inject specific implementations by name
builder.Services.AddKeyedSingleton<IPaymentGateway, StripeGateway>("stripe");
builder.Services.AddKeyedSingleton<IPaymentGateway, PayPalGateway>("paypal");

public class CheckoutService([FromKeyedServices("stripe")] IPaymentGateway gateway) { }

// IHttpClientFactory — never new up HttpClient directly
builder.Services.AddHttpClient<IGitHubClient, GitHubClient>(client =>
{
    client.BaseAddress = new Uri("https://api.github.com");
    client.DefaultRequestHeaders.Add("User-Agent", "MyApp/1.0");
});

// Resolving Scoped services from a background service (IHostedService)
// This pattern avoids the captive dependency trap:
public class DataSyncService(IServiceScopeFactory scopeFactory) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            using var scope = scopeFactory.CreateScope();
            // ✅ fresh scope per iteration — DbContext is scoped, not captured
            var repo = scope.ServiceProvider.GetRequiredService<IOrderRepository>();
            await repo.SyncPendingOrdersAsync(ct);
            await Task.Delay(TimeSpan.FromMinutes(5), ct);
        }
    }
}`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Registration — IServiceCollection builds the recipe",
    body: "During startup, you call builder.Services.AddScoped<T>() etc. This adds ServiceDescriptor entries to the IServiceCollection. No instances are created yet. Think of it as writing a recipe — the container knows how to make each service, not that it has made them.",
  },
  {
    title: "Build — WebApplication.Build() creates the IServiceProvider",
    body: "When you call builder.Build(), ASP.NET Core compiles all registrations into an IServiceProvider (specifically a ServiceProviderEngine). From this point, the container is immutable — you cannot add more registrations after Build().",
  },
  {
    title: "Request scope creation — one scope per HTTP request",
    body: "For every incoming HTTP request, the framework calls IServiceScopeFactory.CreateScope(), producing a child IServiceProvider. Scoped services are resolved from this child scope. When the request ends, the scope is disposed, which triggers IDisposable.Dispose() on all Scoped services in registration-reverse order.",
  },
  {
    title: "Constructor injection — the container resolves the dependency graph",
    body: "When you resolve OrdersController, the container inspects its constructor, sees it needs IOrderRepository, resolves that (finds it needs AppDbContext), and recursively resolves the entire graph. This is depth-first. If any dependency is unregistered, you get InvalidOperationException: 'Unable to resolve service for type X while attempting to activate Y.'",
  },
  {
    title: "Lifetime enforcement — scope validation catches captive dependencies",
    body: "In Development, the DI container runs scope validation on startup. If a Singleton captures a Scoped dependency (e.g., Singleton → DbContext), it throws: 'Cannot consume scoped service from singleton'. In Production, scope validation is off by default — the bug is silent and causes shared DbContext state across requests.",
  },
  {
    title: "Disposal — IDisposable services are automatically cleaned up",
    body: "The scope disposes all IDisposable services it created, in reverse registration order. Singleton services are disposed when the application shuts down (IHost.StopAsync). Transient services are disposed by the scope if they implement IDisposable — even though they're created fresh each time.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "AddSingleton<T>",
    definition: "One instance for the entire application lifetime. Shared across all requests and threads. Must be thread-safe. Good for: caches, configuration snapshots, HttpClient (via IHttpClientFactory).",
    icon: "1️⃣",
  },
  {
    term: "AddScoped<T>",
    definition: "One instance per request (per DI scope). The most common lifetime for services that touch the database. DbContext, repositories, UoW — always Scoped.",
    icon: "🔄",
  },
  {
    term: "AddTransient<T>",
    definition: "New instance every time it's injected. Good for lightweight, stateless services. Beware: HttpClient as Transient exhausts socket connections (port exhaustion). Use IHttpClientFactory instead.",
    icon: "✨",
  },
  {
    term: "IServiceScopeFactory",
    definition: "The safe way to create a child scope from a Singleton or background service. Call CreateScope(), resolve your Scoped services from scope.ServiceProvider, then Dispose() the scope. Don't cache the resolved service.",
    icon: "🏭",
  },
  {
    term: "Captive Dependency",
    definition: "When a longer-lived service (Singleton) holds a reference to a shorter-lived one (Scoped). The Scoped service is 'captured' and lives as long as the Singleton — defeating the purpose of its lifetime. Classic example: Singleton service with a DbContext field.",
    icon: "🪤",
  },
  {
    term: "Keyed Services (.NET 8+)",
    definition: "Register multiple implementations of the same interface under different keys. Resolve with [FromKeyedServices('key')] in constructors or GetRequiredKeyedService<T>('key').",
    icon: "🔑",
  },
  {
    term: "IHttpClientFactory",
    definition: "The correct way to use HttpClient. Manages HttpMessageHandler pooling to prevent socket exhaustion. Supports named and typed clients, Polly retry policies, and DNS refresh.",
    icon: "🌐",
  },
  {
    term: "ValidateOnBuild",
    definition: "services.BuildServiceProvider(validateScopes: true) or the default in Development. Checks for captive dependencies and unresolvable services at startup instead of first use.",
    icon: "✅",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "DbContext registered as Singleton caused data corruption in production",
    scenario: "Our e-commerce app was running fine in staging. In production under load, customers started seeing each other's shopping carts. Two requests for different users were reading and modifying the same DbContext instance.",
    problem: "A junior dev had added services.AddSingleton<AppDbContext>() instead of AddDbContext<AppDbContext>(). DbContext is NOT thread-safe. Two concurrent requests shared the same EF Core change tracker, which tracks entity state per-instance. Request A's changes were visible to Request B before being saved. EF threw InvalidOperationException: 'A second operation was started on this context instance before a previous operation completed.'",
    solution: "Changed to builder.Services.AddDbContext<AppDbContext>(opts => opts.UseSqlServer(connString)), which registers it as Scoped. In Development, added builder.Services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true }) to catch lifetime violations at startup. The scope validator would have caught this immediately as a captive dependency error.",
    takeaway: "DbContext must always be Scoped. Never Singleton, never Transient (creates a new change tracker per injection, losing tracked entities mid-request). If you're in a background service, use IServiceScopeFactory to create a new scope per unit of work.",
  },
  {
    title: "Socket exhaustion from new HttpClient() in a Transient service",
    scenario: "Our integration service started failing with 'Only one usage of each socket address is normally permitted' after about 500 requests. The server ran out of available ports. Restarting bought 20 minutes of relief before it happened again.",
    problem: "The service had services.AddTransient<IExternalApiClient, ExternalApiClient>() and ExternalApiClient's constructor called new HttpClient(). Each request created a fresh HttpClient, which created a new HttpMessageHandler with its own TCP connection pool. Even after the client was disposed, the underlying socket stays in TIME_WAIT for 4 minutes. Under load, we exhausted all ~16,000 available ephemeral ports.",
    solution: "Registered using builder.Services.AddHttpClient<IExternalApiClient, ExternalApiClient>(). IHttpClientFactory pools and reuses HttpMessageHandler instances (rotated every 2 minutes for DNS refresh). The typed client is registered as Transient, but the underlying handler is Singleton-pooled. No socket exhaustion, and DNS changes are picked up on rotation.",
    takeaway: "Never instantiate HttpClient directly in application code. Always use IHttpClientFactory. The typed client pattern (AddHttpClient<TClient, TImpl>()) gives you injection-friendly DI while the factory manages the handler pool lifecycle transparently.",
  },
  {
    title: "Background service captured a Scoped DbContext — silent data staleness",
    scenario: "Our nightly sync IHostedService was correctly injecting IOrderRepository via constructor injection. In production, it processed new orders fine on the first run but then started skipping newly created orders. The data it saw was frozen at the time the service started.",
    problem: "IHostedService is registered as a Singleton. When it injected IOrderRepository (Scoped) via constructor, the DI container resolved the repository once at startup and cached it for the service's lifetime. The DbContext inside that repository had a stale connection and a stale first-level cache. With ValidateScopes=false in production, no exception was thrown.",
    solution: "Removed the repository from the constructor. Injected IServiceScopeFactory instead (which is Singleton-safe). In ExecuteAsync, for each sync iteration: using var scope = scopeFactory.CreateScope(); var repo = scope.ServiceProvider.GetRequiredService<IOrderRepository>(); — then disposed the scope after each iteration. Each run now gets a fresh DbContext with no stale cache.",
    takeaway: "Background services (IHostedService, BackgroundService) are Singletons. They must never inject Scoped services directly. The correct pattern is constructor-inject IServiceScopeFactory and create a scope per unit of work inside ExecuteAsync.",
  },
];

export default function DependencyInjectionPage() {
  return (
    <MotionFade>
      <Section
        title="ASP.NET Core Dependency Injection"
        subtitle="How the built-in DI container resolves your services — and the lifetime bugs that will eventually hit production."
      >
        <AspNetDIVisualizer />
        <ConceptExplainer
          overview="ASP.NET Core ships with a built-in DI container (Microsoft.Extensions.DependencyInjection) that supports three service lifetimes: Singleton (one per app), Scoped (one per HTTP request), and Transient (new on every injection). The container builds a resolution graph at startup, validates it in Development, and resolves services lazily on first use. The most dangerous bugs come from lifetime mismatches — specifically, when a longer-lived service captures a reference to a shorter-lived one."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "ASP.NET Core 9 DI — lifetimes, keyed services, IHttpClientFactory", code: CODE_EXAMPLE }}
          whyItMatters="The DI container is the backbone of every ASP.NET Core application. Lifetime bugs — especially Singleton-captures-Scoped — are silent in production, cause shared mutable state between requests, and can corrupt data. Understanding how scopes are created, destroyed, and how services are disposed helps you build correct, leak-free services."
          pitfalls={[
            "DbContext as Singleton is the single most common .NET DI bug in production. DbContext is not thread-safe and its first-level cache grows unbounded. Always register with AddDbContext<T>() which defaults to Scoped.",
            "Scope validation (ValidateScopes=true) only runs in Development by default. The captive dependency that crashes dev silently corrupts production. Explicitly enable it: builder.Host.UseDefaultServiceProvider(opts => opts.ValidateScopes = true).",
            "Transient IDisposable services are owned by the scope. They're created fresh on each injection, but the scope holds a reference to dispose them. In long-lived scopes, this means Transient IDisposable instances accumulate. Always use using or rely on the scope lifetime.",
            "new HttpClient() in application code exhausts socket ports under load. Use IHttpClientFactory. This is not optional — it's the only correct approach when making outbound HTTP calls from an ASP.NET Core service.",
            "IServiceProvider.GetService<T>() returns null if T is not registered. GetRequiredService<T>() throws InvalidOperationException. Prefer GetRequiredService in application code — a null-return on a required dependency should fail fast, not cause a NullReferenceException 20 stack frames later.",
            "After builder.Build(), the IServiceCollection is frozen. You cannot add registrations. Services that need to add registrations dynamically (plugins, etc.) must do so before Build() or use a different approach like IServiceProvider.CreateScope() at runtime.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
