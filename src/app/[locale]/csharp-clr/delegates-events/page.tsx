"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const DelegatesEventsVisualizer = dynamic(
  () => import("./DelegatesEventsVisualizer"),
  { ssr: false, loading: () => <VisualizerSkeleton /> }
);

const CODE_EXAMPLE = `// Type-safe delegate declaration — this IS the contract
public delegate void OrderPlacedHandler(object sender, OrderPlacedEventArgs e);

// Or use the built-in EventHandler<T> (preferred)
public class OrderService
{
    // 'event' keyword = access modifier: external code can only += and -=
    // Without 'event', anyone can do OnOrderPlaced = null; ← catastrophic
    public event EventHandler<OrderPlacedEventArgs>? OnOrderPlaced;

    public async Task PlaceOrderAsync(Order order, CancellationToken cancellationToken)
    {
        await _dbContext.Orders.AddAsync(order, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        // ⚠️ this bites everyone eventually — always use ?.Invoke()
        // OnOrderPlaced(this, new OrderPlacedEventArgs(order)); // throws if null
        OnOrderPlaced?.Invoke(this, new OrderPlacedEventArgs(order));
    }
}

// Subscriber — in a long-lived service, this causes a MEMORY LEAK
// The publisher holds a ref to the subscriber via the delegate
public class EmailNotificationService
{
    public void Subscribe(OrderService orderService)
    {
        orderService.OnOrderPlaced += HandleOrderPlaced; // += captures 'this'
    }

    // DON'T forget to unsubscribe when this service is disposed
    public void Dispose()
    {
        // If OrderService outlives EmailNotificationService and you don't
        // unsubscribe, EmailNotificationService is never GC'd — memory leak
        _orderService.OnOrderPlaced -= HandleOrderPlaced;
    }

    private void HandleOrderPlaced(object? sender, OrderPlacedEventArgs e)
    {
        _emailClient.SendAsync(e.Order.CustomerEmail, "Order confirmed", ...);
    }
}

// Multicast delegate — the invocation list
Action<string> logger = Console.WriteLine;
logger += (msg) => File.AppendAllText("log.txt", msg); // second handler
logger += (msg) => _metrics.Increment("messages"); // third handler

// All three are called in order of subscription
// If handler[0] throws, handler[1] and [2] are NEVER called
// Use GetInvocationList() to call each handler in a try/catch if you need resilience`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Delegates are type-safe method references",
    body: "A delegate is an object that wraps a method reference — think of it as a strongly-typed function pointer. The CLR validates at compile time that the method's signature matches the delegate's signature, unlike raw function pointers in C++.",
  },
  {
    title: "Multicast: the invocation list",
    body: "Every delegate instance has an InvocationList — an array of method references. When you use +=, the CLR creates a new combined delegate (delegates are immutable). When invoked, each method in the list is called in order. This is the multicast pattern.",
  },
  {
    title: "The event keyword restricts access",
    body: "Declaring a field as 'event' prevents external code from doing two dangerous things: assigning directly (OnOrderPlaced = null) and invoking it (OnOrderPlaced(...)). Only the containing class can invoke the event. External code can only subscribe (+= ) and unsubscribe (-=).",
  },
  {
    title: "Exception propagation in multicast chains",
    body: "If any handler in the invocation list throws an unhandled exception, the remaining handlers are NOT called — execution stops at the faulting handler. For resilient event dispatch, call GetInvocationList() and invoke each delegate in a try/catch block.",
  },
  {
    title: "Memory: the publisher holds the subscriber reference",
    body: "When you subscribe with +=, the publisher's delegate holds a reference to your subscriber object (capturing 'this'). As long as the publisher is alive, the subscriber cannot be garbage-collected — even if all other references to it are gone. Always unsubscribe in Dispose().",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "Delegate",
    definition:
      "An object encapsulating a method reference with a specific signature. Sealed subclass of System.MulticastDelegate. Can be null, combined with +, or compared for equality.",
    icon: "🔗",
  },
  {
    term: "Invocation List",
    definition:
      "The internal array of delegate targets inside a MulticastDelegate. GetInvocationList() returns it. += creates a new combined delegate; delegates are immutable.",
    icon: "📋",
  },
  {
    term: "event keyword",
    definition:
      "A modifier that restricts a delegate field: external code can only += and -=. Prevents external code from clearing all subscriptions or invoking the event directly.",
    icon: "🔒",
  },
  {
    term: "EventHandler<T>",
    definition:
      "The standard BCL delegate: void EventHandler<TEventArgs>(object? sender, TEventArgs e). Use this pattern for all .NET events — it's consistent and compatible with WPF, WinForms, and ASP.NET.",
    icon: "📐",
  },
  {
    term: "Weak Event Pattern",
    definition:
      "WeakReference-based subscription (WeakEventManager in WPF) lets the GC collect the subscriber even if the publisher is alive. Solves the memory leak problem at the cost of complexity.",
    icon: "♻️",
  },
  {
    term: "?.Invoke()",
    definition:
      "The null-conditional invoke pattern. OnOrderPlaced?.Invoke(this, e) is the thread-safe way to raise an event — it reads the delegate into a local variable before the null check, preventing a race where another thread unsubscribes between the check and the call.",
    icon: "⚡",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "The Friday Night Memory Leak",
    scenario:
      "Our ASP.NET Core background service was leaking ~50 MB per hour in production. Memory profiler showed thousands of live instances of ReportEmailer — a service that should have been disposed after each job run.",
    problem:
      "JobSchedulerService registered ReportEmailer instances as event subscribers (schedulerService.OnJobComplete += emailer.Notify) but never unsubscribed. Because JobSchedulerService was a Singleton (alive for the app lifetime), its delegate's invocation list held strong references to every ReportEmailer ever created. None could be GC'd.",
    solution:
      "Added IDisposable to ReportEmailer with _schedulerService.OnJobComplete -= Notify in Dispose(), and registered it as Scoped so the DI container called Dispose() after each request scope. The weak event pattern (WeakEventManager) was considered but deemed overkill for this case.",
    takeaway:
      "In .NET, 'publisher outlives subscriber' is the #1 cause of event-related memory leaks. If your subscriber is shorter-lived than the publisher, you MUST unsubscribe — the GC will not save you.",
  },
  {
    title: "Invocation List Exception Swallowing",
    scenario:
      "Our e-commerce platform had an OrderPlaced event with 4 handlers: logging, inventory reservation, email notification, and analytics. The logging handler started throwing intermittently due to a log sink outage. Result: inventory was never reserved and customers received no confirmation emails for ~2 hours.",
    problem:
      "C# multicast delegates abort the entire invocation list on first exception. LoggingHandler was at index 0. When it threw, InventoryHandler[1] and EmailHandler[2] were silently skipped. The exception was caught at the top of PlaceOrder and logged as 'logging failed' — nobody noticed that orders were being accepted but not fulfilled.",
    solution:
      "Replaced the single event raise with explicit GetInvocationList() iteration with per-handler try/catch. Each handler failure is logged independently and does not block subsequent handlers. Critical handlers (inventory) were moved to a separate, guaranteed execution path using an outbox pattern.",
    takeaway:
      "Never assume all handlers in a multicast chain will execute. Either wrap each in try/catch via GetInvocationList(), or use a proper message bus (MediatR, NServiceBus) for production event dispatch where partial failure handling matters.",
  },
];

export default function DelegatesEventsPage() {
  return (
    <MotionFade>
      <Section
        title="Delegates, Events & Multicast Chains"
        subtitle="How .NET delegates are type-safe function pointers — and why forgetting to unsubscribe causes memory leaks."
      >
        <DelegatesEventsVisualizer />
        <ConceptExplainer
          overview="A delegate in .NET is not just a function pointer — it's a full object that carries method references, supports multicast (multiple subscribers), and is type-checked at compile time. The event keyword turns a delegate field into a publication/subscription channel with enforced access rules. Understanding how the invocation list works — and who owns references to whom — is essential for writing production-grade .NET code."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Delegates, Events & Multicast — Production Patterns", code: CODE_EXAMPLE }}
          whyItMatters="Events are everywhere in .NET: UI frameworks (WPF, WinForms, MAUI), ASP.NET Core middleware hooks, EF Core interceptors, and domain-driven design domain events all use this pattern. Getting it right — using ?.Invoke() for thread safety, unsubscribing in Dispose(), and handling partial failures — is the difference between solid production code and a memory leak waiting to happen."
          pitfalls={[
            "Memory leak via forgotten unsubscription: if the publisher outlives the subscriber and you never unsubscribe, the delegate holds a strong reference and the subscriber is never GC'd. Dispose() MUST call -=.",
            "Exception in handler[0] silently skips handler[1..n]: multicast delegates are not exception-resilient. A single faulting handler aborts the entire invocation list. Use GetInvocationList() + per-handler try/catch for resilient dispatch.",
            "Missing 'event' keyword: without 'event', external code can do OnOrderPlaced = null — wiping out all subscriptions — or invoke the delegate directly, bypassing your null checks and business rules.",
            "Thread-safety gap: checking 'if (OnOrderPlaced != null) OnOrderPlaced(...)' has a TOCTOU race — another thread can unsubscribe between the null check and the call. Always use ?.Invoke() which reads the delegate reference atomically.",
            "Lambda subscriptions you can't unsubscribe: subscribing with a lambda (OnEvent += (s, e) => DoThing()) creates an anonymous delegate you can't -= later. Always capture the delegate in a named method or a field if you need to unsubscribe.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
