"use client";

import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";
import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";

const CLRArchitectureVisualizer = dynamic(
  () => import("./CLRArchitectureVisualizer"),
  { ssr: false, loading: () => <VisualizerSkeleton /> }
);

const CODE_EXAMPLE = `// .NET 9 — AssemblyLoadContext isolation (plugin system)
// ⚠️ this bites everyone eventually

public class PluginHost
{
    private readonly Dictionary<string, AssemblyLoadContext> _contexts = new();

    public IPlugin LoadPlugin(string pluginPath)
    {
        var alc = new AssemblyLoadContext(pluginPath, isCollectible: true);
        _contexts[pluginPath] = alc;

        var assembly = alc.LoadFromAssemblyPath(pluginPath);
        var pluginType = assembly.GetType("MyPlugin.Plugin")!;

        // DON'T do this — IPlugin is loaded in two different ALCs
        // typeof(IPlugin) from host != typeof(IPlugin) from plugin
        // This throws InvalidCastException at runtime, not compile time
        return (IPlugin)Activator.CreateInstance(pluginType)!;
    }

    public void UnloadPlugin(string pluginPath)
    {
        if (_contexts.TryGetValue(pluginPath, out var alc))
        {
            alc.Unload(); // triggers collectible ALC cleanup
            _contexts.Remove(pluginPath);
            // GC needs to collect before memory is actually freed
            GC.Collect();
            GC.WaitForPendingFinalizers();
        }
    }
}

// CORRECT: share the interface assembly through the default ALC
// Load it as a dependency in the plugin's ALC, not independently
public class SafePluginHost
{
    public IPlugin LoadPlugin(string pluginPath, string sharedInterfacePath)
    {
        var alc = new PluginLoadContext(pluginPath, sharedInterfacePath);
        var assembly = alc.LoadFromAssemblyPath(pluginPath);
        var pluginType = assembly.GetType("MyPlugin.Plugin")!;
        return (IPlugin)Activator.CreateInstance(pluginType)!;
    }
}

public class PluginLoadContext : AssemblyLoadContext
{
    private readonly AssemblyDependencyResolver _resolver;
    private readonly string _sharedPath;

    public PluginLoadContext(string pluginPath, string sharedPath)
        : base(isCollectible: true)
    {
        _resolver = new AssemblyDependencyResolver(pluginPath);
        _sharedPath = sharedPath;
    }

    protected override Assembly? Load(AssemblyName assemblyName)
    {
        // Route shared interface types through default ALC
        // so type identity is consistent across plugin boundaries
        if (assemblyName.Name == "Shared.Interfaces")
            return null; // null = fall through to default ALC

        var path = _resolver.ResolveAssemblyToPath(assemblyName);
        return path != null ? LoadFromAssemblyPath(path) : null;
    }
}`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Assembly Loading",
    body: "When you run a .NET app, the CLR's Assembly Loader reads the PE file, validates its structure, and maps it into memory. The AssemblyLoadContext (ALC) determines isolation boundaries — each ALC has its own type namespace, so the same type loaded in two ALCs are different types at runtime.",
  },
  {
    title: "Metadata & Type System Verification",
    body: "The CLR reads the assembly's metadata tables — type definitions, method signatures, field layouts. The verifier checks IL for type safety before execution. This is why managed code can guarantee no buffer overruns and no type confusion without hardware memory protection.",
  },
  {
    title: "JIT Compilation",
    body: "Methods are compiled to native code on first call (tiered: Tier 0 = quick unoptimized, Tier 1 = full RyuJIT optimized after call count threshold). The JIT stub in the method table gets replaced with the native pointer after compilation. Subsequent calls hit native directly.",
  },
  {
    title: "Garbage Collector",
    body: "The GC manages the managed heap with generational collection (Gen0/1/2 + LOH + POH). It knows about all object references because the JIT emits GC info alongside native code — every stack frame's live refs are tracked. The GC can move objects, which is why you need 'fixed' or GCHandle to pin them.",
  },
  {
    title: "Thread Pool & Synchronization",
    body: "The CLR thread pool manages worker and I/O threads with a hill-climbing algorithm that adjusts thread count based on throughput. The SynchronizationContext abstraction (used by async/await) lets UI frameworks like WinForms or ASP.NET marshal continuations back to their specific threads.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "AssemblyLoadContext",
    definition:
      "Isolation boundary for assemblies in .NET Core+. Replaces AppDomain for plugin isolation. Each ALC has independent type identity — same type name in two ALCs = two different types.",
    icon: "📦",
  },
  {
    term: "Managed Heap",
    definition:
      "GC-controlled memory region divided into Gen0 (short-lived), Gen1 (survivors), Gen2 (long-lived), LOH (>85KB objects), and POH (.NET 5+ for pinned objects that won't move).",
    icon: "🗂",
  },
  {
    term: "CTS (Common Type System)",
    definition:
      "The unified type system spanning all .NET languages. Defines how types are declared, used, and managed. Enables cross-language inheritance — a C# class can inherit from a VB.NET class.",
    icon: "🔗",
  },
  {
    term: "Execution Engine",
    definition:
      "The core CLR component that manages method dispatch, virtual calls, interface dispatch, and interop. Maintains method tables for each type with pointers to JIT-compiled native code.",
    icon: "⚙️",
  },
  {
    term: "Tiered Compilation",
    definition:
      ".NET 6+ feature where methods start at Tier 0 (quick compile, no inlining) and are recompiled at Tier 1 (full RyuJIT optimization) after enough calls. Reduces startup latency while maximizing throughput.",
    icon: "🚀",
  },
  {
    term: "AppDomain (legacy)",
    definition:
      "Pre-.NET Core isolation mechanism. Appeared to provide process-level isolation within one process but had severe performance costs. Removed in .NET Core — use AssemblyLoadContext instead.",
    icon: "⚰️",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "Plugin System Type Identity Crisis",
    scenario:
      "Our SaaS platform shipped a plugin marketplace. Plugins were .dll files customers could drop into a folder. Friday night at 2 AM, our on-call got paged: every plugin load started throwing InvalidCastException even though the types looked identical in the debugger.",
    problem:
      "We loaded the shared IPlugin interface assembly once in the plugin's ALC and once in the host ALC. typeof(IPlugin) returned two different Type objects. The cast succeeded at compile time (same type name) but failed at runtime because CLR uses ALC identity for type equality, not assembly name.",
    solution:
      "We implemented a PluginLoadContext that overrides Load() and returns null for the shared interfaces assembly, forcing the CLR to fall through to the default ALC. Now both host and plugin see the same Type object for IPlugin because they both resolve through the same ALC.",
    takeaway:
      "In .NET, type identity is ALC-scoped. typeof(Foo) == typeof(Foo) can be false if the two Type objects were loaded into different AssemblyLoadContexts. Always route shared contract assemblies through the default ALC in plugin architectures.",
  },
  {
    title: "LOH Fragmentation Killing Production Throughput",
    scenario:
      "Our image processing service handled PDF to PNG conversions. After about 6 hours of uptime, GC pauses started hitting 800ms+. Memory usage was stable but p99 latency was climbing. Rolling restart every 6 hours became our SLA workaround — until we actually diagnosed it.",
    problem:
      "Each PDF page was being decoded into a byte[] of 90–200KB (above the 85KB LOH threshold). The LOH is collected only during full GC (Gen2) and is never compacted by default. After hours of alloc/free cycles at different sizes, the LOH was Swiss-cheesed with fragmentation — we had 2GB of address space but couldn't allocate a 150KB contiguous buffer.",
    solution:
      "We switched to ArrayPool<byte>.Shared for all intermediate buffers, keeping allocation size under 85KB or reusing pooled arrays. For unavoidably large allocations we set GCSettings.LargeObjectHeapCompactionMode = GCLargeObjectHeapCompactionMode.CompactOnce before a full GC during off-peak hours.",
    takeaway:
      "The LOH threshold is 85KB and it is never compacted by default. High-throughput services that repeatedly allocate and free large byte arrays will fragment the LOH over hours. Use ArrayPool<T> or fixed-size pooled buffers to keep large objects off the LOH entirely.",
  },
];

export default function CLRArchitecturePage() {
  return (
    <MotionFade>
      <Section
        title="CLR Architecture & Managed Execution"
        subtitle="How the .NET runtime loads, verifies, and executes your code from assembly to native instructions."
      >
        <CLRArchitectureVisualizer />
        <ConceptExplainer
          overview="The Common Language Runtime is the execution engine that runs all .NET code. When you ship a .NET assembly, you're shipping IL bytecode — the CLR loads it, verifies it for type safety, JIT-compiles it to native code on first use, and manages its memory through the garbage collector. Understanding this pipeline explains why 'managed code' behaves so differently from C++ and why certain performance patterns work the way they do."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "AssemblyLoadContext — Plugin Isolation (.NET 9)", code: CODE_EXAMPLE }}
          whyItMatters="The CLR's layered architecture is why .NET can offer memory safety, cross-language interop, and dynamic plugin loading without requiring a VM interpreter. Each layer — loading, verification, JIT, GC — is independently tunable. In .NET 9 the JIT has loop unrolling, on-stack replacement, and tiered PGO. Understanding where your code lives in this pipeline (IL → Tier0 → Tier1) helps you reason about startup vs. throughput tradeoffs."
          pitfalls={[
            "typeof(Foo) == typeof(Foo) can return false — if two AssemblyLoadContexts both load the same assembly, each gets its own Type objects. Cross-ALC casts throw InvalidCastException at runtime with no compile-time warning.",
            "LOH fragmentation is silent until it isn't — allocating and freeing objects above 85KB repeatedly will fragment the Large Object Heap over hours. You won't see high memory usage, just eventually-failing allocations and 800ms GC pauses.",
            "Collectible ALCs don't unload until all references are gone — including references in static fields, event handlers, or long-lived delegates. A single forgotten reference to a type or object from the ALC keeps the entire ALC (and all its loaded assemblies) in memory.",
            "Tiered compilation invalidates assumptions about inlining at startup — Tier 0 code doesn't inline. If you benchmark a method on first call you'll measure Tier 0 perf, not steady-state. Use BenchmarkDotNet which handles warmup, or add [MethodImpl(MethodImplOptions.AggressiveOptimization)].",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
