"use client";

import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";
import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";

const AsyncStateMachineVisualizer = dynamic(
  () => import("./AsyncStateMachineVisualizer"),
  { ssr: false, loading: () => <VisualizerSkeleton /> }
);

const CODE_EXAMPLE = `// What you write:
public async Task<Order> GetOrderAsync(
    int orderId,
    CancellationToken cancellationToken)
{
    var user = await _userRepository          // await #1 — state 0→1
        .GetCurrentUserAsync(cancellationToken)
        .ConfigureAwait(false);               // ← missing this in libraries deadlocks

    var order = await _dbContext.Orders       // await #2 — state 1→2
        .Include(o => o.LineItems)
        .FirstOrDefaultAsync(
            o => o.Id == orderId && o.UserId == user.Id,
            cancellationToken)
        .ConfigureAwait(false);

    return order ?? throw new KeyNotFoundException(
        $"Order {orderId} not found for user {user.Id}");
}

// What the C# compiler ACTUALLY generates (~simplified):
[CompilerGenerated]
private sealed class GetOrderAsync_StateMachine
    : IAsyncStateMachine
{
    // State: -1 = not started, 0 = at first await,
    //         1 = at second await, -2 = done
    public int <>1__state;
    public AsyncTaskMethodBuilder<Order> <>t__builder;

    // Captured locals (all method locals become fields)
    private int orderId;
    private CancellationToken cancellationToken;
    private OrderService <>4__this;        // captured 'this'
    private User <user>5__1;               // local 'user'
    private Order <order>5__2;             // local 'order'

    // Awaiters for each await point
    private TaskAwaiter<User> <>u__1;
    private TaskAwaiter<Order?> <>u__2;

    void IAsyncStateMachine.MoveNext()
    {
        int state = this.<>1__state;
        try
        {
            if (state == 0) goto state0_resume;
            if (state == 1) goto state1_resume;

            // State -1: initial call — start the first awaitable
            var awaiter1 = <>4__this._userRepository
                .GetCurrentUserAsync(cancellationToken)
                .ConfigureAwait(false)
                .GetAwaiter();

            if (!awaiter1.IsCompleted)
            {
                <>1__state = 0;         // remember we're at await #1
                <>u__1 = awaiter1;      // save awaiter
                <>t__builder.AwaitUnsafeOnCompleted(
                    ref awaiter1, ref this); // schedule MoveNext as continuation
                return;                 // yield back to caller
            }

            state0_resume:              // continuation resumes here
            var user = <>u__1.GetResult();
            <user>5__1 = user;

            var awaiter2 = <>4__this._dbContext.Orders
                .Include(o => o.LineItems)
                .FirstOrDefaultAsync(/* ... */, cancellationToken)
                .ConfigureAwait(false)
                .GetAwaiter();

            if (!awaiter2.IsCompleted)
            {
                <>1__state = 1;         // remember we're at await #2
                <>u__2 = awaiter2;
                <>t__builder.AwaitUnsafeOnCompleted(
                    ref awaiter2, ref this);
                return;
            }

            state1_resume:
            var order = <>u__2.GetResult();
            <order>5__2 = order;

            // Return value — sets Task result and transitions to -2 (done)
            var result = order ?? throw new KeyNotFoundException(/* ... */);
            <>t__builder.SetResult(result);
        }
        catch (Exception ex)
        {
            <>1__state = -2;            // terminal state
            <>t__builder.SetException(ex); // faults the Task
        }
    }
}`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "The Compiler Rewrites Your Method",
    body: "When you write 'async Task<T>', the C# compiler replaces your method body with a state machine struct/class. Your method becomes a wrapper that creates the state machine, initializes it, and calls MoveNext() once to start it. Every local variable, captured 'this', and awaiter becomes a field on the state machine.",
  },
  {
    title: "State Numbers Track Await Position",
    body: "The state field (named '<>1__state' in generated code) tells MoveNext() where to resume. -1 = initial call, 0 = at first await, 1 = at second await, -2 = completed. It's literally a goto-based state machine. The compiler emits goto labels at each await resume point.",
  },
  {
    title: "Awaiters Drive Scheduling",
    body: "Each awaited expression must provide an INotifyCompletion awaiter. When awaiter.IsCompleted is false, MoveNext() saves the awaiter, schedules itself as the continuation via builder.AwaitUnsafeOnCompleted(), and returns — yielding the thread back. The awaiter calls MoveNext() again when the operation completes.",
  },
  {
    title: "SynchronizationContext and ConfigureAwait",
    body: "By default, the continuation after an await is scheduled on the captured SynchronizationContext (e.g., the UI thread in WinForms, or the ASP.NET Classic request context). ConfigureAwait(false) opts out — the continuation runs on a thread pool thread. Missing this in library code deadlocks single-threaded SCs.",
  },
  {
    title: "ValueTask vs Task",
    body: "Task always allocates. ValueTask<T> avoids allocation when the result is already available synchronously (e.g., cache hit). The state machine is identical — ValueTask just uses a different builder. Use ValueTask for hot paths that frequently complete synchronously; don't use it everywhere as it adds complexity for little gain.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "IAsyncStateMachine",
    definition:
      "The compiler-generated interface with a single MoveNext() method. Each async method becomes a class implementing this. The builder (AsyncTaskMethodBuilder<T>) manages the Task lifecycle and calls MoveNext() via continuations.",
    icon: "⚙️",
  },
  {
    term: "MoveNext()",
    definition:
      "The heart of the state machine. Called once to start, then called again by each awaiter when its operation completes. Uses goto-based dispatch to jump to the correct resume point based on the state field.",
    icon: "▶",
  },
  {
    term: "ConfigureAwait(false)",
    definition:
      "Tells the awaiter to not capture the current SynchronizationContext for the continuation. Required in library code. Without it, async library code deadlocks when called from a single-threaded SC (WinForms, old ASP.NET) using .Result or .Wait().",
    icon: "🔧",
  },
  {
    term: "SynchronizationContext",
    definition:
      "Abstraction for marshaling work to a specific thread or context. WinForms has a UI-thread SC. ASP.NET Classic had a request SC. ASP.NET Core intentionally has no SC — ConfigureAwait(false) is less critical but still a good habit.",
    icon: "🔄",
  },
  {
    term: "async void",
    definition:
      "An async method returning void. Exceptions thrown inside it cannot be observed — they go to the unhandled exception handler and crash the process in .NET Core. Only acceptable for event handlers. Never use for library code.",
    icon: "💀",
  },
  {
    term: "ValueTask<T>",
    definition:
      "A struct-based alternative to Task<T>. Avoids heap allocation when the result is synchronously available. Use for methods with frequent cache-hit paths. Don't await the same ValueTask twice — undefined behavior.",
    icon: "⚡",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "The ConfigureAwait Deadlock That Took Down Checkout",
    scenario:
      "We were migrating our checkout service from ASP.NET Framework to ASP.NET Core incrementally. During the migration window, our PaymentGatewayClient library (still targeting netstandard2.0) was called from classic ASP.NET controller actions. Every Friday evening checkout stalled — 100% CPU, requests hanging at payment step, then IIS recycled the app pool.",
    problem:
      "Our PaymentGatewayClient.ChargeAsync() method awaited multiple HttpClient calls without ConfigureAwait(false). ASP.NET Framework's SynchronizationContext is single-threaded per request. The controller called .Result on the task (blocking), which held the request SC thread. The continuation tried to resume on the same SC thread — deadlock. Only manifested under load when requests piled up.",
    solution:
      "Added ConfigureAwait(false) to every await in the library. Added a Roslyn analyzer rule (ConfigureAwaitChecker) to the library project to catch future violations in CI. Moved the library to async-all-the-way-down in the ASP.NET Classic layer, eliminating .Result calls. Deadlock never recurred.",
    takeaway:
      "Library code must use ConfigureAwait(false) on every await. Application code (controllers, handlers) doesn't need it in ASP.NET Core because there's no SynchronizationContext. But netstandard libraries run in both worlds — always use it. The deadlock only appears under load, making it a time-bomb in production.",
  },
  {
    title: "async void Swallowed Exceptions in the Email Worker",
    scenario:
      "Our notification service had an email worker that processed a queue. Someone refactored the message handler from a void callback to async void to avoid blocking. For three months, occasional emails silently disappeared with no errors in logs. The monitoring team noticed a 0.3% delivery rate drop — just enough to be suspicious but below alert thresholds.",
    problem:
      "The async void handler threw SmtpException on certain malformed addresses. In async void methods, exceptions go directly to the thread's unhandled exception handler — not to any Task or caller. Our global UnhandledExceptionHandler suppressed these (it was set up for UI crash reporting, not server exceptions). The exception was lost, the message was acked off the queue, and delivery silently failed.",
    solution:
      "Changed async void to async Task everywhere in the worker. The queue framework was updated to catch Task exceptions and dead-letter the message. Added a policy: async void is banned in server code via a Roslyn analyzer (AsyncFixer). Fixed the SmtpException handling to retry with exponential backoff.",
    takeaway:
      "async void exceptions are not observable. They do not surface to the calling code. They do not fail the enclosing Task. In .NET Core they terminate the process unless there's an AppDomain.CurrentDomain.UnhandledException handler that swallows them. Never use async void outside of UI event handlers.",
  },
];

export default function AsyncStateMachinePage() {
  return (
    <MotionFade>
      <Section
        title="async/await State Machine"
        subtitle="What the C# compiler actually generates when you write async/await — it's not magic, it's a state machine class."
      >
        <AsyncStateMachineVisualizer />
        <ConceptExplainer
          overview="Every async method you write becomes a compiler-generated state machine. The C# compiler transforms your linear async code into a class that implements IAsyncStateMachine, converting each await point into a state transition. Your local variables become fields, your await points become state numbers, and your method body becomes a MoveNext() method full of goto labels. Understanding this transformation demystifies ConfigureAwait, async void, and ValueTask behavior."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{
            label: "async/await → Compiler-Generated State Machine (C# 13)",
            code: CODE_EXAMPLE,
          }}
          whyItMatters="The async/await transformation is one of the most impactful compiler features in C# history. It enables writing scalable I/O-bound code without manual callback spaghetti, while generating essentially the same state machine you'd write by hand. Understanding the generated code explains why async void is dangerous, why ConfigureAwait matters, why you can't use Span<T> across await points, and why awaiting the same ValueTask twice is undefined behavior."
          pitfalls={[
            "async void swallows exceptions — exceptions thrown in async void methods are posted to the SynchronizationContext as unhandled, not to any observable Task. In ASP.NET Core this terminates the process. Use async Task always, except for UI event handlers.",
            "ConfigureAwait(false) missing in library code deadlocks with .Result — calling async library code synchronously via .Result or .Wait() from a single-threaded SynchronizationContext captures that context, then tries to resume on it while it's blocked. Instant deadlock.",
            "Closures in async lambdas capture the variable reference, not the value — variables in foreach loops captured in async lambdas all point to the loop variable after the loop. Classic bug: Task[] tasks = items.Select(async item => await Process(item)) where item is always the last value.",
            "ValueTask can't be awaited more than once — awaiting a ValueTask<T> more than once is undefined behavior. If you need to observe the result multiple times, call .AsTask() first. This is a footgun when caching ValueTask results.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
