"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const GenericsVisualizer = dynamic(() => import("./GenericsVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// Generic type definition — T is a placeholder until JIT time
public class Repository<TEntity> where TEntity : class, IEntity, new()
{
    private readonly AppDbContext _dbContext;
    private readonly DbSet<TEntity> _dbSet;

    public Repository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
        _dbSet = dbContext.Set<TEntity>(); // runtime constructed type
    }

    // Generic method with constraint
    public async Task<TEntity?> FindByIdAsync<TKey>(
        TKey id,
        CancellationToken cancellationToken = default)
        where TKey : IEquatable<TKey>
    {
        return await _dbSet.FindAsync(new object[] { id }, cancellationToken);
    }

    // ⚠️ this bites everyone eventually
    // Comparing T with == when T is unconstrained — compiles, always false for ref types
    public bool AreEqual<T>(T a, T b)
    {
        return a == b; // CS0019 if T unconstrained — use EqualityComparer<T>.Default.Equals(a, b)
    }
}

// Covariance: IEnumerable<out T> — T can only come OUT
IEnumerable<string> strings = new List<string>();
IEnumerable<object> objects = strings; // ✓ covariance — string IS-A object

// Contravariance: IComparer<in T> — T can only go IN
IComparer<object> objectComparer = Comparer<object>.Default;
IComparer<string> stringComparer = objectComparer; // ✓ contravariance

// DON'T do this — IList<T> is invariant
IList<string> strList = new List<string>();
// IList<object> objList = strList; // ✗ CS0266 — IList<T> is invariant

// Reification at work: these are three distinct CLR types
var intStack = new Stack<int>();    // specialized: stores int directly
var dblStack = new Stack<double>(); // specialized: separate native code
var strStack = new Stack<string>(); // shared ref-type implementation

// typeof(Stack<int>) != typeof(Stack<string>) — unlike Java where both are Stack
Console.WriteLine(typeof(Stack<int>).IsGenericType);            // True
Console.WriteLine(typeof(Stack<int>).GetGenericTypeDefinition() // Stack\`1
    == typeof(Stack<string>).GetGenericTypeDefinition());        // True — same *definition*
Console.WriteLine(typeof(Stack<int>) == typeof(Stack<string>)); // False — different *constructed types*`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Generic type definitions vs constructed types",
    body: "Stack<T> is a generic type definition — it's incomplete until T is specified. Stack<int> and Stack<string> are constructed types — closed generics that the CLR can actually instantiate. The type definition exists once in the assembly; constructed types are created at JIT time.",
  },
  {
    title: "Reification: the CLR materializes real types",
    body: "Unlike Java's type erasure, .NET reification means Stack<int> is a genuine, distinct type at runtime. typeof(Stack<int>) != typeof(Stack<string>). You can get generic type arguments via reflection, switch on generic types, and create instances via Activator.CreateInstance(typeof(Stack<>).MakeGenericType(typeof(int))).",
  },
  {
    title: "JIT specialization for value types",
    body: "For each unique value type T, the JIT generates separate native code for every generic method. Stack<int>.Push generates different x86-64 instructions than Stack<double>.Push. This is why generics eliminate boxing for value types — the native code directly handles the value-type layout.",
  },
  {
    title: "Shared implementation for reference types",
    body: "All reference types share one native implementation because all references are pointer-sized (8 bytes on x64). Stack<string>, Stack<MyClass>, and Stack<object> all use the same compiled method body — only one JIT compilation required regardless of how many reference type instantiations exist.",
  },
  {
    title: "Generic constraints enforce compile-time guarantees",
    body: "where T : class restricts to reference types (enables == null). where T : struct restricts to value types (enables Nullable<T>). where T : new() guarantees a parameterless constructor. where T : IComparable<T> allows calling CompareTo. Without constraints, you can only use operations available on object.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "Reification",
    definition:
      "The CLR creates real, distinct types for each generic instantiation. Stack<int> and Stack<string> are different types at runtime — you can reflect on them, switch on them, and they appear in stack traces.",
    icon: "🔬",
  },
  {
    term: "Type Erasure (Java)",
    definition:
      "Java's approach: generic parameters are removed at compile time and replaced with Object. At runtime, ArrayList<String> and ArrayList<Integer> are the same class. No specialization, always boxing for primitives.",
    icon: "🗑️",
  },
  {
    term: "JIT Specialization",
    definition:
      "For each value-type T, the JIT compiles a distinct native method body. This is done lazily — Stack<int> is JIT-compiled the first time it's used, then cached. Reference types share one compiled body.",
    icon: "⚡",
  },
  {
    term: "Covariance (out T)",
    definition:
      "IEnumerable<out T>: T can only appear in output positions (return values). Allows IEnumerable<string> to be assigned to IEnumerable<object>. Declared with 'out' on the type parameter.",
    icon: "↗️",
  },
  {
    term: "Contravariance (in T)",
    definition:
      "IComparer<in T>: T can only appear in input positions (parameters). Allows IComparer<object> to be assigned to IComparer<string>. Declared with 'in' on the type parameter.",
    icon: "↙️",
  },
  {
    term: "Generic Constraints",
    definition:
      "where T : class | struct | new() | BaseType | IInterface. Constraints expand what operations are valid on T at compile time. Without constraints, only object members (ToString, GetHashCode) are callable on T.",
    icon: "🔒",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "The 'Comparing T with ==' Silent Bug",
    scenario:
      "Our payment processing service had a generic validator: bool IsValid<T>(T a, T b) => a == b. It worked fine in unit tests with int and string. In production, it was called with PaymentId (a class wrapping a Guid) — and always returned false, silently accepting duplicate payments.",
    problem:
      "When T is an unconstrained type parameter, == compiles to reference equality (object identity), not value equality. Two separate PaymentId instances wrapping the same Guid are different objects, so == returns false. The compiler emits no warning. This bug is invisible until you run it with a reference type.",
    solution:
      "Changed to EqualityComparer<T>.Default.Equals(a, b) — the BCL's canonical way to compare generics. This uses IEquatable<T> if available, falling back to object.Equals. Added a code review rule: never use == on unconstrained type parameters.",
    takeaway:
      "With unconstrained T, == is reference equality — it silently compiles and silently fails for reference types. Always use EqualityComparer<T>.Default.Equals() or constrain with where T : IEquatable<T>.",
  },
  {
    title: "Boxing Pressure in a Hot Metrics Path",
    scenario:
      "Our telemetry service was processing 50k events/second and the GC was running Gen0 collections every 200ms. The CPU profiler showed 40% of allocations coming from our MetricsBucket class, which stored values in Dictionary<string, object> — the pre-generics pattern.",
    problem:
      "Every int, double, and TimeSpan metric value was being boxed on every write (dictionary[key] = value where value is object). At 50k events/second, that's potentially millions of small heap allocations per second driving GC pressure. The original developer used object to 'keep it flexible'.",
    solution:
      "Replaced Dictionary<string, object> with a generic MetricsBucket<TValue> where TValue : struct. For mixed types, used a discriminated union struct (MetricValue) rather than boxing. Gen0 collections dropped from every 200ms to every 2-3 seconds. P99 latency improved from 45ms to 8ms.",
    takeaway:
      "Generics exist precisely to eliminate boxing. Dictionary<string, object> is fine for configuration, terrible for hot paths. Use proper generic types for performance-sensitive data structures — the JIT will generate specialized code that avoids heap allocation entirely.",
  },
];

export default function GenericsPage() {
  return (
    <MotionFade>
      <Section
        title="Generics & Reification"
        subtitle="Why .NET generics are fundamentally different from Java — the CLR actually generates separate native code per value type."
      >
        <GenericsVisualizer />
        <ConceptExplainer
          overview=".NET generics are reified — the CLR creates distinct, real types for each instantiation. Stack<int> and Stack<string> are genuinely different types at runtime, unlike Java where type erasure removes all generic information. For value types, the JIT generates specialized native code, eliminating boxing entirely. For reference types, a single shared implementation handles all instantiations. This design gives .NET the best of both worlds: type safety without runtime overhead."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Generics — Reification, Constraints & Variance", code: CODE_EXAMPLE }}
          whyItMatters="Generic collections (List<T>, Dictionary<K,V>, Stack<T>) are the backbone of .NET application code. Understanding reification explains why List<int> is dramatically faster than ArrayList for value types, why typeof(List<int>) works correctly in reflection, and why covariance/contravariance rules exist. It also explains NativeAOT limitations — the ahead-of-time compiler can't always generate all possible generic instantiations."
          pitfalls={[
            "Comparing T with == on unconstrained type parameters: compiles fine, silently performs reference equality for all reference types. Use EqualityComparer<T>.Default.Equals(a, b) or constrain with where T : IEquatable<T>.",
            "IList<T> is invariant — you cannot assign IList<string> to IList<object>. Only interfaces with pure output (IEnumerable<out T>) or pure input (IComparer<in T>) can be variant. Forgetting this leads to CS0266 confusion.",
            "MakeGenericType() in hot paths: constructing generic types via reflection at runtime is expensive and defeats NativeAOT. Cache the constructed types in a ConcurrentDictionary<Type, Type> if you must do this.",
            "Generic method type inference failure: when calling Foo<T>(IEnumerable<T> items), if items is null, the compiler can't infer T and you get CS0411. Pass the type parameter explicitly: Foo<string>(null).",
            "NativeAOT and unbound generics: NativeAOT requires all generic instantiations to be known at publish time. Using MakeGenericType() or Type.GetType() + reflection to instantiate generics at runtime will fail or require rd.xml annotations.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
