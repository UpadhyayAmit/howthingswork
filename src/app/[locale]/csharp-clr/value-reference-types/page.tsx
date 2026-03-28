"use client";

import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";
import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";

const ValueReferenceTypesVisualizer = dynamic(
  () => import("./ValueReferenceTypesVisualizer"),
  { ssr: false, loading: () => <VisualizerSkeleton /> }
);

const CODE_EXAMPLE = `// C# 13 — The struct mutation trap that bites everyone
// ⚠️ this bites everyone eventually

public struct MutablePoint
{
    public int X;
    public int Y;
    public void Translate(int dx, int dy) { X += dx; Y += dy; }
}

// DON'T do this — IEnumerable<T> boxes the struct
// Translate() is called on the COPY inside the box, not the original
IList<MutablePoint> points = new List<MutablePoint> { new(1, 1) };
((MutablePoint)points[0]).Translate(10, 10); // Compiles! Does nothing.

// The REAL boxing trap — interface call on struct
IMutatable shape = new MutablePoint { X = 5, Y = 5 }; // BOXES here
shape.Translate(10, 10);  // operates on the heap copy
Console.WriteLine(((MutablePoint)shape).X); // still 15 — fine here
// But if you stored the original struct separately, it's unchanged

// C# 13 ref struct with Span<T> — zero allocation, stack-only
public ref struct StackOnlyBuffer
{
    private Span<byte> _buffer;

    public StackOnlyBuffer(Span<byte> buffer) => _buffer = buffer;

    public void Write(ReadOnlySpan<byte> data)
        => data.CopyTo(_buffer);
}

// Usage — entire pipeline stack-allocated, zero GC pressure
void ProcessRequest(ReadOnlySpan<byte> rawBytes)
{
    Span<byte> workspace = stackalloc byte[512]; // stack allocation
    var buf = new StackOnlyBuffer(workspace);
    buf.Write(rawBytes);
    // No heap allocation, no GC, ref struct can't escape to heap
}

// 'in' parameter gotcha — defensive copy bites you silently
public struct LargeMatrix
{
    public double[,] Data; // reference inside value type
    public int Rows, Cols;

    // ⚠️ 'in' parameters for readonly methods are a lie for non-readonly structs
    // The JIT may emit a defensive copy before the method call
    public double GetDiagonalSum() { /* ... */ return 0; }
}

void ProcessMatrix(in LargeMatrix matrix)
{
    // If LargeMatrix isn't fully readonly, the JIT copies it to satisfy 'in'
    // Defeating the entire purpose of 'in' for performance
    var sum = matrix.GetDiagonalSum(); // potential defensive copy here
}`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Stack vs Heap Allocation",
    body: "Value types (struct, int, bool, DateTime) are allocated inline — on the stack for local variables, or inline within the containing object on the heap. Reference types (class, string, arrays) always allocate on the heap; the variable holds a 8-byte pointer. Stack allocations are 'free' — just moving the stack pointer.",
  },
  {
    title: "Value Semantics — Copy on Assignment",
    body: "Assigning a value type copies all its fields. a = b makes a fully independent copy. There's no aliasing — mutating a doesn't affect b. This is why passing a DateTime to a method is safe without defensive copying — the callee gets its own copy.",
  },
  {
    title: "Reference Semantics — Shared Identity",
    body: "Assigning a reference type copies the pointer. a = b means both variables point to the same heap object. Mutating through a also mutates through b. This is why List<T> parameters don't need ref — the callee and caller share the same object.",
  },
  {
    title: "Boxing — Wrapping Value Types in Objects",
    body: "Boxing is the implicit operation that wraps a value type in a heap-allocated object so it can be treated as object or an interface. It allocates memory, copies the struct fields into the heap object, and returns a reference. This is why adding an int to an ArrayList allocates — and why Span<T> exists to avoid it.",
  },
  {
    title: "ref struct and Span<T>",
    body: "ref struct types (.NET Core 2.1+) are stack-only — they cannot be boxed, cannot be heap-allocated, cannot be captured in closures, and cannot implement interfaces. Span<T> is the canonical ref struct. This constraint enables the JIT to make hard guarantees about their lifetime, enabling zero-allocation slice/pipe APIs.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "Stack Allocation",
    definition:
      "Value types in local scope are allocated by advancing the stack pointer. Freed instantly when the method returns — no GC involvement. Arrays and objects allocated via 'new' still go to the heap even if their type is a struct.",
    icon: "📚",
  },
  {
    term: "Boxing",
    definition:
      "Implicit operation that wraps a value type in a heap-allocated object. Triggered by: casting struct to object/interface, putting struct in non-generic collection, using struct as dynamic. Each box is a new allocation.",
    icon: "📦",
  },
  {
    term: "ref struct",
    definition:
      "Stack-only struct. Cannot be boxed, stored in fields of regular classes, captured in lambdas, or used with async/await. Enables safe zero-copy slicing. Span<T>, ReadOnlySpan<T>, and Memory<T> are all ref structs.",
    icon: "🔒",
  },
  {
    term: "Span<T>",
    definition:
      "A ref struct representing a contiguous region of memory — stack, heap, or unmanaged. Zero-copy slicing of arrays, strings, and unmanaged buffers. .NET 9 expanded Span APIs to cover most BCL string/array operations.",
    icon: "⚡",
  },
  {
    term: "in parameter",
    definition:
      "Pass-by-readonly-reference. Avoids copying large structs when passing to methods. TRAP: non-readonly struct methods called through 'in' parameters can trigger defensive copies, making 'in' slower than value copy for small structs.",
    icon: "📥",
  },
  {
    term: "Value Semantics vs Ref Semantics",
    definition:
      "Value types compare by content (Equals compares fields). Reference types compare by identity by default (Equals compares pointer). Records give you value semantics on reference types with = = comparing property values.",
    icon: "⚖️",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "The Invisible Struct Mutation Bug",
    scenario:
      "Our game engine used a mutable Vector3 struct for all physics calculations. A junior dev refactored the entity update loop to use a List<IMovable> interface for polymorphism. After the refactor, physics objects stopped responding to velocity changes — but only intermittently, and only when the entity count exceeded 50.",
    problem:
      "The struct was boxed when stored through the IMovable interface. Every call to IMovable.ApplyVelocity() operated on the heap copy inside the box. The original struct stored in the physics array was never updated. The bug was intermittent because small entity counts hit a code path that used a different data structure that didn't box.",
    solution:
      "We rewrote IMovable as a generic interface IMovable<TSelf> where TSelf : struct, IMovable<TSelf> and used generic constraints to avoid boxing. For the hot path we switched to a struct-of-arrays layout (separate float[] for X, Y, Z) and Span<float> slices — zero allocation, SIMD-friendly, no interface dispatch.",
    takeaway:
      "Calling a method through an interface on a struct boxes it. The method operates on the copy in the box. Your original struct is unchanged. Use generic constraints, virtual dispatch on classes, or source generators to avoid unintentional boxing in hot paths.",
  },
  {
    title: "ArrayPool Saves a Payment Processor",
    scenario:
      "Our payment gateway processed 50,000 ISO 8583 messages per second during Black Friday. After migrating to .NET 8 we profiled the GC and found 40% of all allocations were byte[] buffers between 256B and 4KB — created per message, collected almost immediately. Gen0 GC paused us 200+ times per second.",
    problem:
      "Each message parse allocated a new byte[] for the working buffer, processed it, then discarded it. These tiny short-lived allocations were exactly the Gen0 pressure scenario that kills throughput. 50K * 4KB * 200 GC pauses/s was measurable latency jitter even though each pause was only 0.5ms.",
    solution:
      "We replaced new byte[bufferSize] with ArrayPool<byte>.Shared.Rent(bufferSize) and returned buffers in a finally block. Combined with Span<byte> slices for parsing (zero-copy sub-buffer access) and stackalloc for buffers under 256 bytes. Gen0 collections dropped 95%, p99 latency fell from 12ms to 3ms.",
    takeaway:
      "ArrayPool<T>.Shared is the single highest-ROI performance change for services that allocate many short-lived arrays. Pair it with Span<T> for zero-copy slicing. The pattern is: Rent → use as Span → Return in finally. Never forget the Return or you'll leak pool slots.",
  },
];

export default function ValueReferenceTypesPage() {
  return (
    <MotionFade>
      <Section
        title="Value Types vs Reference Types"
        subtitle="Why int lives on the stack and string doesn't — and why that distinction costs you when you ignore it."
      >
        <ValueReferenceTypesVisualizer />
        <ConceptExplainer
          overview="In .NET, every type is either a value type (struct) or a reference type (class). Value types store their data inline — on the stack or inside another object. Reference types always live on the heap, and variables hold a pointer. This distinction drives performance characteristics, copy semantics, and GC pressure in ways that are invisible until they bite you. C# 13 continues expanding the power of value types with ref structs, Span<T>, and inline arrays."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{
            label: "Struct Traps & Span<T> Patterns (C# 13 / .NET 9)",
            code: CODE_EXAMPLE,
          }}
          whyItMatters="Value type design choices ripple through entire systems. A struct that gets boxed 50,000 times per second is a silent GC tax. Span<T> and Memory<T> unlocked a new era of high-performance .NET code — the BCL itself was rewritten to avoid allocations using these APIs. Understanding boxing, stack allocation, and ref structs lets you write code that performs like C++ while keeping C# safety guarantees."
          pitfalls={[
            "Struct mutation through an interface variable — the struct is boxed and the method operates on the heap copy. Your original struct is untouched. There's no compiler warning. This is how mutable structs become race conditions in game engines and physics simulations.",
            "Large structs (>16 bytes) get copied on every assignment and every method call that doesn't use ref/in. A 64-byte struct passed 10,000 times allocates nothing but copies 640KB of data — more expensive than the equivalent class reference.",
            "'in' parameters with non-readonly structs can trigger defensive copies — the JIT copies the struct to a temporary before calling a method that might mutate it, defeating the entire purpose of 'in'. Mark structs readonly or every method readonly to prevent this.",
            "ref struct types can't be used with async/await — they can't be stored in state machine fields. If you need Span<T> with async, you need to synchronously consume the span before the first await, or convert to Memory<T> which IS heap-safe.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
