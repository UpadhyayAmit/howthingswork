"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const AzureFunctionsVisualizer = dynamic(
  () => import("./AzureFunctionsVisualizer"),
  { ssr: false, loading: () => <VisualizerSkeleton /> }
);

const CODE_EXAMPLE = `// Isolated worker model (.NET 8) — host.json + function wiring
// host.json — controls timeouts, concurrency, retry
{
  "version": "2.0",
  "functionTimeout": "00:05:00",  // Consumption: max 10 min
  "extensions": {
    "serviceBus": {
      "maxConcurrentCalls": 16,
      "maxConcurrentSessions": 8
    }
  }
}

// Program.cs — isolated worker startup
var host = new HostBuilder()
  .ConfigureFunctionsWorkerDefaults()
  .ConfigureServices(services => {
    // Single HttpClient registered here — NOT inside the function
    services.AddHttpClient("orders", c => {
      c.BaseAddress = new Uri(Environment.GetEnvironmentVariable("ORDERS_API_URL")!);
    });
    // Credential once; reused across warm invocations
    services.AddSingleton<TokenCredential>(_ => new DefaultAzureCredential());
    services.AddSingleton(sp =>
      new BlobServiceClient(
        new Uri("https://mystorage.blob.core.windows.net"),
        sp.GetRequiredService<TokenCredential>()));
  })
  .Build();

await host.RunAsync();

// Function — DI-injected, no static HttpClient anti-pattern
public class OrderProcessor
{
  private readonly IHttpClientFactory _clientFactory;
  private readonly BlobServiceClient _blobs;

  public OrderProcessor(IHttpClientFactory cf, BlobServiceClient blobs)
  {
    _clientFactory = cf;
    _blobs = blobs;
  }

  [Function("ProcessOrder")]
  public async Task Run(
    [ServiceBusTrigger("orders", Connection = "SERVICEBUS_CONN")] Order order,
    FunctionContext context)
  {
    var log = context.GetLogger<OrderProcessor>();
    // HttpClient is reused across warm invocations — no socket exhaustion
    var client = _clientFactory.CreateClient("orders");
    var response = await client.PostAsJsonAsync("/process", order);
    response.EnsureSuccessStatusCode();
    log.LogInformation("Processed order {OrderId}", order.Id);
  }
}`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Trigger fires — host wakes the worker process",
    body: "A trigger event (HTTP request, timer tick, Service Bus message, Blob write) is detected by the Azure Functions host. On a cold start, the host allocates compute, starts the language worker process, and loads the Functions runtime. This sequence takes 800ms–2s on Consumption, significantly less on Premium with pre-warmed instances.",
  },
  {
    title: "Host initialization and extension loading",
    body: "The Functions host (functionshost.exe) initializes its HTTP server, loads the binding extensions from the extension bundle specified in host.json, and registers trigger listeners. Extension bundles ship a curated set of extensions (ServiceBus, EventHub, CosmosDB) at a tested version — you don't reference them directly in your project file.",
  },
  {
    title: "Worker process startup and function indexing",
    body: "In the isolated worker model (.NET 8+), a separate dotnet worker process starts, connects to the host over gRPC, and registers the function entry points. The host maps trigger definitions to their handlers. This is the boundary where in-process (.NET 6 and below) differs from isolated — in isolated, the host and your code run in separate processes with a well-defined RPC contract.",
  },
  {
    title: "Function invocation and binding resolution",
    body: "When a trigger fires, the host resolves input bindings (reading from blob storage, deserializing a Service Bus message) before calling your function. Output bindings are collected during execution and flushed after your function returns — a Blob output binding writes to storage after the function completes, not during.",
  },
  {
    title: "Scale controller and KEDA-based scaling",
    body: "The Azure Functions scale controller monitors trigger metrics (queue depth, partition lag, HTTP concurrency) and adds or removes worker instances. On Consumption, scale-out is rapid but scale-in is gradual. Premium uses pre-warmed instances to eliminate cold starts. KEDA (Kubernetes-based Event Driven Autoscaling) powers scaling in the Azure Container Apps hosting model.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "host.json",
    definition: "Global configuration file that controls the Functions host: timeouts, logging levels, extension config (concurrency, prefetch), and retry policies. Applies to all functions in the app — there is no per-function host.json.",
    icon: "⚙️",
  },
  {
    term: "Isolated Worker Model",
    definition: "The .NET 8+ execution model where your code runs in a separate dotnet process from the Functions host. Enables any target framework, independent versioning, and avoids version conflicts with host dependencies. Replaces the older in-process model.",
    icon: "🔒",
  },
  {
    term: "Extension Bundle",
    definition: "A versioned, pre-tested set of binding extensions declared in host.json. Avoids manual NuGet management for triggers. Pin the bundle version in production — 'latest' upgrades silently and can break existing bindings.",
    icon: "📦",
  },
  {
    term: "Consumption vs Premium vs Dedicated",
    definition: "Consumption: pay-per-execution, 10-min timeout, cold starts, scales to zero. Premium: pre-warmed instances, VNET integration, no cold starts, 60-min timeout. Dedicated: runs on App Service Plan — no scale-to-zero, always-on.",
    icon: "📊",
  },
  {
    term: "Durable Functions",
    definition: "Extension that enables stateful orchestrations via event sourcing. Orchestrator functions replay from history on each wake-up — never use I/O or DateTime.UtcNow directly in an orchestrator; they must be deterministic.",
    icon: "⚡",
  },
  {
    term: "KEDA Scaling",
    definition: "Kubernetes Event-Driven Autoscaling powers Functions on Azure Container Apps and AKS. Scales workers from zero based on queue depth, topic lag, or custom metrics — the same model as Consumption but with container portability.",
    icon: "📈",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "Nightly ETL Function Silently Dropped 40,000 Records",
    scenario: "A finance team's nightly report Function processed transaction records from Azure Blob Storage. One night the job ran for 10 minutes and 18 seconds, then stopped. No error alert fired. The next morning, 40,000 records were missing from the report.",
    problem: "The Function was on the Consumption plan with the default 10-minute timeout. The runtime killed the function mid-processing after exactly 600 seconds. Because the failure was a host-level timeout — not an unhandled exception in user code — Application Insights logged it as a 'host shutdown' rather than a function failure. The team's alert was on exception counts only.",
    solution: "Moved the ETL job to a Premium plan with a 60-minute timeout. Added a checkpoint pattern: the function writes progress to a Blob after each batch of 1,000 records so it can resume. Added an alert on 'Function Execution Duration approaching timeout threshold'. For jobs exceeding 60 minutes, migrated to Durable Functions with a fan-out/fan-in pattern.",
    takeaway: "Consumption plan timeout is a hard kill with no resume. Always design Functions to be resumable or idempotent when processing large datasets, and alert on duration percentage — not just exceptions.",
  },
  {
    title: "Socket Exhaustion from Per-Invocation HttpClient",
    scenario: "A high-throughput HTTP trigger Function calling a downstream API started returning sporadic 'Unable to connect to the remote server' errors under load. The Function itself had no bugs — it worked fine at low volume.",
    problem: "The team instantiated a new HttpClient() inside the function body on every invocation. Each invocation opened a new TCP socket. Under load (500 req/min), the socket pool was exhausted because sockets in TIME_WAIT state (from previous requests) weren't yet available. The OS-level limit was hit, causing connection failures.",
    solution: "Moved HttpClient creation to the DI container in Program.cs using services.AddHttpClient(). The IHttpClientFactory manages a pool of message handlers with proper lifecycle management. The same HttpClient instance (or rather, the same handler pool) is reused across warm invocations, eliminating per-invocation socket allocation.",
    takeaway: "Never instantiate HttpClient inside a function body or in a static constructor. Use IHttpClientFactory via DI. This is the single most common Azure Functions performance bug in .NET codebases.",
  },
  {
    title: "Timer Trigger Firing on Every Instance Corrupted Shared State",
    scenario: "A Functions app running 4 instances on a Premium plan had a TimerTrigger that synced configuration from an external API every 5 minutes. After migrating from Consumption (single instance) to Premium for performance, the configuration was being written 4 times simultaneously, causing partial overwrites.",
    problem: "TimerTrigger fires independently on every running instance of the Function app. On Consumption with scale-to-zero this is rarely an issue (usually 1 active instance). On Premium with multiple warm instances, every instance independently triggers, causing 4 concurrent writes to the same Cosmos DB document.",
    solution: "Used a distributed lock via Azure Blob Storage lease: at the start of the timer function, attempt to acquire a 90-second lease on a blob. If the lease fails (another instance holds it), return early. Only the instance that acquires the lease performs the work. Alternatively, used the 'RunOnStartup: false, UseMonitor: true' setting which uses blob-based singleton behavior.",
    takeaway: "TimerTrigger is NOT a singleton — it fires on every instance. Always implement a distributed lock (blob lease, Redis SETNX) for timer functions that write shared state or trigger external side effects.",
  },
];

export default function AzureFunctionsPage() {
  return (
    <MotionFade>
      <Section
        title="Azure Functions Internals"
        subtitle="Triggers, bindings, cold starts, and the host lifecycle — what actually happens when your serverless function wakes up."
      >
        <AzureFunctionsVisualizer />
        <ConceptExplainer
          overview="Azure Functions is an event-driven serverless compute platform. Each function is a unit of work bound to a trigger — HTTP, timer, queue message, blob change — that the Azure Functions host executes. Understanding the host lifecycle, worker model, and scaling behavior is essential for avoiding cold start surprises, timeout-induced data loss, and the socket exhaustion that plagues many production .NET Functions apps."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Isolated Worker (.NET 8) — DI setup, host.json, and ServiceBus trigger", code: CODE_EXAMPLE }}
          whyItMatters="Serverless doesn't mean zero ops concerns. The choice of hosting plan determines your cold start characteristics, maximum execution time, VNET capabilities, and scaling model. The isolated worker model changes how extensions and middleware work compared to in-process. Getting these fundamentals right prevents a class of production bugs that look like random failures but are actually deterministic host behavior."
          pitfalls={[
            "Consumption plan has a hard 10-minute timeout. The host kills the worker process without calling CancellationToken — your finally blocks may not run. Design for resumability.",
            "Creating a new HttpClient() per invocation exhausts TCP sockets under load. Register via IHttpClientFactory in Program.cs — this is the most common .NET Functions performance mistake.",
            "TimerTrigger fires on EVERY running instance, not just one. Multiple warm Premium instances will all trigger simultaneously. Use a blob lease for distributed locking.",
            "The isolated worker model (.NET 8+) uses a different middleware and extension API surface than the old in-process model. In-process extension NuGet packages are NOT compatible with isolated — you need the isolated-specific packages.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
