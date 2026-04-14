"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const ServiceBusVisualizer = dynamic(() => import("./ServiceBusVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// Azure Service Bus — Peek-Lock pattern with proper settlement
// @azure/service-bus SDK v7

import { ServiceBusClient } from "@azure/service-bus";

const sbClient = new ServiceBusClient(process.env.SERVICEBUS_CONNECTION_STRING!);

// --- SENDER ---
const sender = sbClient.createSender("orders");
await sender.sendMessages({
  body: { orderId: "ord-1234", amount: 99.99 },
  messageId: crypto.randomUUID(),          // enables duplicate detection
  sessionId: "customer-42",               // session-aware processing
  timeToLive: 60_000,                     // 1-minute TTL
});

// --- RECEIVER (Peek-Lock mode — the safe default) ---
const receiver = sbClient.createReceiver("orders", {
  receiveMode: "peekLock",               // default; alternative: "receiveAndDelete"
});

receiver.subscribe({
  async processMessage(msg) {
    try {
      await processOrder(msg.body);
      await msg.completeMessage();        // REQUIRED — releases the lock, removes from queue
    } catch (err) {
      if (isTransient(err)) {
        await msg.abandonMessage();       // re-enqueues; delivery count increments
      } else {
        await msg.deadLetterMessage({     // explicit DLQ — sets DeadLetterReason
          deadLetterReason: "ProcessingFailed",
          deadLetterErrorDescription: String(err),
        });
      }
    }
  },
  async processError(err) {
    console.error("Service Bus error:", err.message);
  },
});

// --- READ FROM DEAD-LETTER QUEUE ---
const dlqReceiver = sbClient.createReceiver(
  "orders",
  { subQueueType: "deadLetter" }         // "$DeadLetterQueue" suffix handled automatically
);`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Producer sends a message",
    body: "A producer creates a ServiceBusSender and calls sendMessages(). The message is durably written to the broker using AMQP 1.0. Messages survive broker restarts because they are stored on disk. The broker assigns a SequenceNumber and tracks EnqueuedTimeUtc.",
  },
  {
    title: "Peek-Lock delivery to a consumer",
    body: "A receiver calls receiveMessages() or subscribe(). In Peek-Lock mode (the safe default), the broker locks the message for LockDuration (default 60s). The message stays in the queue but is invisible to other consumers. The delivery count increments on each lock acquisition.",
  },
  {
    title: "Message settlement — Complete, Abandon, or Dead-Letter",
    body: "The consumer MUST settle the message before the lock expires. CompleteMessage() removes it permanently. AbandonMessage() re-enqueues it (delivery count +1). DeadLetterMessage() moves it to the Dead-Letter Queue (DLQ). If the lock expires without settlement, Service Bus automatically re-enqueues it.",
  },
  {
    title: "Competing consumers in Queue mode",
    body: "Multiple receiver instances connect to the same queue. Service Bus load-balances: each message goes to exactly ONE consumer. If Consumer A crashes mid-processing, its lock expires and Service Bus redelivers to Consumer B — guaranteed at-least-once delivery.",
  },
  {
    title: "Fan-out in Topic/Subscription mode",
    body: "A Topic accepts messages and fans them out to all matching Subscriptions. Each subscription gets its own independent copy. Consumer group A can be an audit log writer, group B an email sender — both receive the same original message independently.",
  },
  {
    title: "Dead-Letter Queue and poison messages",
    body: "When MaxDeliveryCount (default 10) is exceeded, Service Bus automatically moves the message to the DLQ — a sub-queue at '<entity>/$DeadLetterQueue'. The DLQ never causes the main queue to back up, but an unchecked DLQ silently accumulates failed messages that must be separately processed or alerted on.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  { term: "Queue vs Topic", definition: "Queue: competing consumers, each message → one receiver. Topic: fan-out, each Subscription gets a copy. Use queues for work distribution, topics for event broadcast.", icon: "📬" },
  { term: "LockDuration", definition: "Time a peek-locked message is invisible to other consumers (1s–5min). If CompleteMessage() is not called before expiry, Service Bus re-enqueues the message automatically.", icon: "⏱" },
  { term: "MaxDeliveryCount", definition: "After this many failed deliveries (default 10), Service Bus auto-dead-letters the message. Set per queue/subscription, not per message.", icon: "🔢" },
  { term: "Dead-Letter Queue (DLQ)", definition: "Sub-queue at '<entity>/$DeadLetterQueue'. Holds poison messages. Must be monitored separately — a full DLQ causes silent data loss in some patterns.", icon: "☠️" },
  { term: "Sessions", definition: "RequiresSession=true enables ordered, FIFO processing per SessionId. Only one consumer holds a session lock at a time. Required for stateful workflows.", icon: "🔒" },
  { term: "Duplicate Detection", definition: "RequiresDuplicateDetection=true + a MessageId causes Service Bus to deduplicate within a configurable window (default 10min). The broker ignores duplicate MessageIds silently.", icon: "🔍" },
  { term: "AMQP 1.0", definition: "The wire protocol Service Bus uses (not HTTP by default). AMQP provides flow control, multiplexed channels, and lower latency than HTTP polling. The SDK uses it automatically.", icon: "🔌" },
  { term: "Standard vs Premium", definition: "Standard tier: max 256KB per message, shared infrastructure. Premium tier: dedicated capacity, up to 100MB messages, VNet integration, geo-disaster recovery.", icon: "⭐" },
];

const USE_CASES: UseCase[] = [
  {
    title: "E-commerce order processor — DLQ backpressure incident",
    scenario: "A high-volume UK retailer processes ~50k orders/day through a Service Bus queue. After a Black Friday deployment, order processing started silently failing. Orders appeared to be accepted but were never fulfilled.",
    problem: "A deserialization bug caused processMessage() to throw on every message. Because the error handler called neither completeMessage() nor deadLetterMessage(), the lock expired repeatedly until MaxDeliveryCount was reached. Messages auto-dead-lettered. The DLQ filled to 200k messages over 6 hours. No alert was configured on DLQ depth.",
    solution: "Added AbandonMessage() in the catch block for transient errors and DeadLetterMessage() for permanent errors. Added an Azure Monitor alert on 'Dead-lettered message count > 100'. Added a separate DLQ drain process that re-plays messages after bugs are fixed. Lock duration was increased from 60s to 5min to match actual processing time.",
    takeaway: "The DLQ is a silent graveyard by default. Always monitor 'Dead-lettered message count' metric in Azure Monitor. Always explicitly settle messages — never let the lock expire as your error strategy.",
  },
  {
    title: "Insurance claims pipeline — session ordering violation",
    scenario: "An insurance platform processes claim status updates via Service Bus. Claim state machine: Submitted → UnderReview → Approved/Rejected. Messages arrive per claim in order. Randomly, claims ended up in invalid states (e.g., 'Approved' before 'UnderReview').",
    problem: "The queue had RequiresSession=false with 8 competing consumers. Consumer A received the 'UnderReview' message and took 45 seconds to process it (external API call). Consumer B received 'Approved' for the same claim 2 seconds later — processed it first. The state machine transitioned out of order.",
    solution: "Enabled RequiresSession=true with SessionId set to the claimId. Now only one consumer holds the session lock for a given claim at a time. Processing is strictly ordered per claim, and other claims are processed in parallel by other consumers — no throughput loss.",
    takeaway: "Sessions in Service Bus are the only correct solution for ordered per-entity processing. Competing consumers WITHOUT sessions will process messages out of order under concurrency. This is a design decision, not a bug.",
  },
  {
    title: "Notification fan-out — topic with no subscriptions silently drops messages",
    scenario: "A SaaS platform switched from a queue to a topic to support multiple notification channels (email, push, SMS). During a 2-week feature freeze, the topic existed but the subscription for SMS had been deleted for maintenance. SMS notifications were being silently dropped.",
    problem: "Azure Service Bus topics with no matching subscriptions — or subscriptions whose SQL filter matches no messages — silently discard messages with no error. The sender receives a successful acknowledgment from the broker. There is no 'message dropped' event or metric out of the box.",
    solution: "Implemented a 'catch-all' subscription with no filter that writes to a secondary storage queue for auditing. Added an Azure Monitor alert on 'Incoming messages vs messages delivered' ratio. Subscription lifecycle is now managed by the same deployment pipeline as the sender — they cannot diverge.",
    takeaway: "A Service Bus topic delivers only to live, filter-matching subscriptions. If no subscriptions exist, messages vanish permanently with no error. Always have at least one monitoring subscription and alert on delivery rate anomalies.",
  },
];

export default function ServiceBusPage() {
  return (
    <MotionFade>
      <Section
        title="Azure Service Bus & Messaging"
        subtitle="Queues, topics, dead-letter queues, and competing consumers — how reliable async messaging works in Azure."
      >
        <ServiceBusVisualizer />
        <ConceptExplainer
          overview="Azure Service Bus is a fully managed enterprise message broker built on AMQP 1.0. It decouples producers from consumers using durable queues and topics, guaranteeing at-least-once delivery even if the consumer crashes mid-processing. Unlike storage queues, Service Bus provides message ordering (sessions), duplicate detection, and first-class dead-letter queue support."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Service Bus — Send, Receive & Dead-Letter (@azure/service-bus v7)", code: CODE_EXAMPLE }}
          whyItMatters="Service Bus enables reliable microservice communication at scale. Because producers and consumers are decoupled, each service can scale independently, be deployed independently, and fail independently. The broker absorbs traffic spikes — a consumer crashing doesn't lose a single message. This is the foundation of every resilient Azure-native architecture."
          pitfalls={[
            "Not calling CompleteMessage() means the lock expires (default 60s), the message is re-enqueued, delivery count increments, and eventually the message auto-dead-letters. This is a silent data loss pattern — the producer got a success ACK, the consumer never processed it.",
            "Topic with no active subscriptions (or subscriptions with non-matching SQL filters) silently discards all messages. The sender receives no error. This has burned teams after a subscription was accidentally deleted during a maintenance window.",
            "Standard tier max message size is 256KB. If you serialize a large JSON blob (images embedded, uncompressed audit logs), the send call throws ServiceBusError with reason 'MessageSizeExceeded'. Upgrade to Premium (100MB) or use the Claim Check pattern (store payload in Blob Storage, send pointer).",
            "Message lock duration must exceed your actual processing time. If a 60s lock is set but processing calls a slow external API that takes 90s, the lock expires mid-flight. Service Bus re-delivers to another consumer — you process the message twice. Extend locks via renewMessageLock() or set LockDuration per queue/subscription.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
