"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const ReflectionVisualizer = dynamic(() => import("./ReflectionVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// ── RUNTIME REFLECTION ─────────────────────────────────────────────
// Useful for: plugin architectures, ORMs, serializers, DI containers

// Type discovery — all types in an assembly
var assembly = Assembly.GetExecutingAssembly();
var entityTypes = assembly
    .GetTypes()
    .Where(t => t.IsClass && !t.IsAbstract && typeof(IEntity).IsAssignableFrom(t))
    .ToList();
// ⚠️ Assembly.GetTypes() allocates a Type[] per call — cache this

// Property access via reflection
var order = new Order { Id = Guid.NewGuid(), TotalAmount = 99.99m };
var prop = typeof(Order).GetProperty("TotalAmount",
    BindingFlags.Public | BindingFlags.Instance);
var value = prop?.GetValue(order); // object — boxed if value type

// ⚠️ this bites everyone eventually — reflection bypasses access modifiers
var privateField = typeof(OrderService)
    .GetField("_internalState", BindingFlags.NonPublic | BindingFlags.Instance);
privateField?.SetValue(orderService, newState); // compiles and runs — dangerous

// Dynamic instantiation
var instance = Activator.CreateInstance(
    typeof(Repository<>).MakeGenericType(typeof(Order)));
// ⚠️ NativeAOT: MakeGenericType with runtime types is not always preserved

// ── SOURCE GENERATORS (.NET 6+) ─────────────────────────────────────
// Use when: JSON serialization, DI registration, mapper generation,
// validation, logging (LoggerMessage), Regex, pattern matching

// System.Text.Json source gen — zero reflection at runtime:
[JsonSerializable(typeof(Order))]
[JsonSerializable(typeof(List<Order>))]
internal partial class AppJsonContext : JsonSerializerContext { }

// Usage — same API, same output, no Type.GetProperties() at runtime:
var json = JsonSerializer.Serialize(order, AppJsonContext.Default.Order);
var order2 = JsonSerializer.Deserialize(json, AppJsonContext.Default.Order);

// LoggerMessage source gen — avoids boxing and string allocation per call:
public static partial class Log
{
    [LoggerMessage(Level = LogLevel.Warning,
        Message = "Order {OrderId} placed by {CustomerId}")]
    public static partial void OrderPlaced(
        ILogger logger, Guid orderId, Guid customerId);
}

// Usage — no string.Format, no object[] allocation:
Log.OrderPlaced(_logger, order.Id, order.CustomerId);

// ── EMIT (IL generation) ─────────────────────────────────────────────
// Use for: high-performance dynamic proxies, expression trees
// Largely replaced by source generators and compiled expressions

// Compiled expression — faster than PropertyInfo.GetValue():
var param = Expression.Parameter(typeof(Order), "o");
var body = Expression.Property(param, "TotalAmount");
var getter = Expression.Lambda<Func<Order, decimal>>(body, param).Compile();
// getter(order) is now as fast as direct property access — cached once`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Type metadata is embedded in every .NET assembly",
    body: "Every .NET assembly (DLL/EXE) contains a metadata section alongside the IL code. This metadata describes every type, method, property, and attribute defined in the assembly. Reflection reads this metadata at runtime via the CLR's metadata reader.",
  },
  {
    title: "Type, MethodInfo, PropertyInfo — the reflection API",
    body: "System.Type is the entry point. typeof(Order) or Type.GetType(\"MyApp.Order\") returns a Type object. From there, GetProperties(), GetMethods(), and GetCustomAttributes() return MethodInfo, PropertyInfo, and Attribute instances describing each member.",
  },
  {
    title: "BindingFlags control what's visible",
    body: "By default, reflection returns only public members. BindingFlags.NonPublic | BindingFlags.Instance returns private and protected members too. This is powerful but dangerous — it's how serializers and mocking frameworks work, but also how accidental access modifiers bypasses happen.",
  },
  {
    title: "Source generators run at compile time in Roslyn",
    body: "IIncrementalGenerator implementations receive the Roslyn syntax tree and semantic model at compile time. They emit additional C# source files that are compiled alongside your code. The generated code is visible in the IDE, debuggable, and doesn't require runtime reflection.",
  },
  {
    title: "NativeAOT and the reflection death trap",
    body: "NativeAOT (publish as native binary) uses tree-shaking: types and methods not referenced at compile time are trimmed. Reflection-accessed types are not statically referenced — they get trimmed, causing MissingMethodException or TypeLoadException at runtime. Source generators eliminate this problem by making all access statically visible.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "System.Type",
    definition:
      "The runtime representation of a type. Every object has one (obj.GetType()). Contains the complete type metadata: name, assembly, properties, methods, base type, interfaces, and custom attributes.",
    icon: "🔬",
  },
  {
    term: "BindingFlags",
    definition:
      "Flags enum controlling which members reflection returns. Public | NonPublic | Instance | Static | DeclaredOnly. Without BindingFlags.NonPublic, private members are invisible. With it, everything is accessible.",
    icon: "🚩",
  },
  {
    term: "Activator.CreateInstance",
    definition:
      "Creates an instance of a type at runtime without a compile-time reference. Requires a parameterless constructor unless you pass constructor arguments. Bypasses DI — don't use in production service code.",
    icon: "🏭",
  },
  {
    term: "IIncrementalGenerator",
    definition:
      "The .NET 6+ source generator API. Receives an IncrementalGeneratorInitializationContext to register syntax-based transforms. Incremental means only changed files trigger re-generation — much faster than the older ISourceGenerator.",
    icon: "⚡",
  },
  {
    term: "Expression Trees",
    definition:
      "A middle ground between reflection and source generators: compile lambda expressions to delegates at runtime (Expression.Compile()). 10-100x faster than PropertyInfo.GetValue() for hot paths. Used heavily in Entity Framework and AutoMapper.",
    icon: "🌳",
  },
  {
    term: "rd.xml / [DynamicDependency]",
    definition:
      "NativeAOT/trimming directives to tell the linker 'keep this type even though it's not statically referenced.' rd.xml is XML-based; [DynamicDependency] is attribute-based. Both are escape hatches when refactoring to source generators isn't feasible.",
    icon: "📌",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "Publishing to NativeAOT Broke the Entire API",
    scenario:
      "We published our ASP.NET Core 8 API as a NativeAOT binary to reduce cold start time (achieved: 8ms vs 800ms). Deployment to production: API started, health check passed, first real request to POST /orders returned HTTP 500. The serializer returned an empty JSON object {}.",
    problem:
      "System.Text.Json was using reflection to discover Order's properties at runtime. NativeAOT's linker had trimmed all the property metadata from the assembly because no static code reference pointed to Order's properties. typeof(Order).GetProperties() returned an empty array at runtime.",
    solution:
      "Added [JsonSerializable(typeof(Order))] source generator context. Replaced all JsonSerializer.Serialize(obj) calls with JsonSerializer.Serialize(obj, AppJsonContext.Default.Order). The source generator emitted compile-time property access code — no runtime reflection, linker-safe. Took 3 hours to retrofit across 47 entity types.",
    takeaway:
      "If you're considering NativeAOT or aggressive trimming, audit your reflection usage first. System.Text.Json, EF Core, and most serializers now have source generator modes. Enabling <PublishTrimmed>true</PublishTrimmed> in debug builds will surface trimming warnings before you hit production.",
  },
  {
    title: "Reflection in the Serialization Hot Path",
    scenario:
      "Our API gateway was serializing ~10k OrderSummary objects per second for the dashboard endpoint. APM showed this endpoint consuming 35% of CPU. dotnet-counters showed Gen0 GC collections every 80ms. The serializer was custom-built using PropertyInfo.GetValue() in a loop.",
    problem:
      "PropertyInfo.GetValue() boxes value types (decimal, Guid, DateTimeOffset) on every call — one heap allocation per property per object. With 12 properties per OrderSummary and 10k objects/sec, that's 120k allocations/sec from the serializer alone. Plus Type.GetProperties() was being called on every request instead of cached.",
    solution:
      "Replaced the reflection-based serializer with compiled expression trees: for each property, compile a Func<OrderSummary, object> using Expression.Lambda, cache it in a ConcurrentDictionary, and call the compiled delegate. Gen0 collections dropped to every 2 seconds. Serialization CPU dropped from 35% to 4%. Later fully replaced with System.Text.Json source gen.",
    takeaway:
      "Never call PropertyInfo.GetValue() in a hot path. At minimum, compile and cache expression trees. At best, use source generators which eliminate runtime reflection entirely. The difference between uncached reflection and source-generated code can be 50-100x in allocations.",
  },
];

export default function ReflectionPage() {
  return (
    <MotionFade>
      <Section
        title="Reflection & Source Generators"
        subtitle="Inspecting types at runtime with Assembly.GetTypes() — and why source generators replaced most reflection use cases in .NET 7+."
      >
        <ReflectionVisualizer />
        <ConceptExplainer
          overview="Reflection lets you inspect and manipulate types, methods, and properties at runtime — without compile-time knowledge of what those types are. It's how ORMs discover your entities, how serializers find your properties, and how DI containers scan assemblies for services. But reflection is expensive (allocations, metadata loading), bypasses access modifiers (security hole), and breaks under NativeAOT trimming. Source generators replace most reflection use cases with compile-time code generation — same flexibility, zero runtime cost."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Reflection, Source Generators & Expression Trees", code: CODE_EXAMPLE }}
          whyItMatters="Understanding the boundary between reflection and source generators is essential for modern .NET development. System.Text.Json, Microsoft.Extensions.Logging (LoggerMessage), Regex (GeneratedRegex), and Entity Framework Core all now offer source generator modes. NativeAOT deployment — which gives near-instant startup times — is impossible without eliminating reflection. Any library or framework you build today should offer a source generator alternative if it currently uses reflection."
          pitfalls={[
            "Reflection bypasses access modifiers: BindingFlags.NonPublic lets you read and write private fields and call private methods. This is how mocking frameworks work, but it also means reflection-heavy code can accidentally modify internal state and break invariants.",
            "Assembly.GetTypes() in a hot path: this allocates a new Type[] on every call and loads assembly metadata. Cache the result. Repeat calls to GetTypes() are a common source of allocation pressure in plugin-heavy architectures.",
            "Using GetType().Name instead of nameof(): GetType().Name is a runtime reflection call. nameof(MyClass) is resolved at compile time to a string literal. In logging, error messages, and serialization keys, always prefer nameof().",
            "NativeAOT trimming removes types you reflect on: if the linker doesn't see a static reference to a type's methods, it trims them. MakeGenericType(), Type.GetType(string), and Assembly.GetTypes() are all invisible to the linker. Use [DynamicDependency] or source generators to fix this.",
            "Reflection.Emit and dynamic IL generation: completely unsupported in NativeAOT. Expression trees (which use Emit internally) are also restricted. If your library uses Emit, you need a source generator alternative for NativeAOT targets.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
