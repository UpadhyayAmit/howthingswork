"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const CosmosDbVisualizer = dynamic(() => import("./CosmosDbVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// Azure Cosmos DB — @azure/cosmos SDK v4
// Partition key design: high-cardinality /userId

import { CosmosClient, PartitionKeyKind } from "@azure/cosmos";

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});

const { database } = await client.databases.createIfNotExists({ id: "myapp" });
const { container } = await database.containers.createIfNotExists({
  id: "orders",
  partitionKey: {
    paths: ["/userId"],                    // HIGH cardinality — millions of distinct values
    kind: PartitionKeyKind.Hash,
  },
  defaultTtl: 7776000,                    // 90-day TTL in seconds — prevents unbounded storage growth
  indexingPolicy: {
    automatic: true,
    indexingMode: "consistent",
    excludedPaths: [{ path: "/rawPayload/*" }],  // exclude large blobs from index — saves RUs
  },
});

// Point read — 1 RU. Fastest possible operation.
// Requires BOTH the item id AND the partition key value.
const { resource: order } = await container
  .item("ord-1234", "user-42")            // (id, partitionKeyValue)
  .read<Order>();

// Cross-partition query — expensive! Use sparingly.
// EnableScanInQuery lets it run; cost scales with partition count.
const { resources: recentOrders } = await container.items
  .query({
    query: "SELECT * FROM c WHERE c.status = @status AND c._ts > @cutoff",
    parameters: [
      { name: "@status", value: "pending" },
      { name: "@cutoff", value: Math.floor(Date.now() / 1000) - 3600 },
    ],
  })
  .fetchAll();

// Change Feed — react to inserts/updates in real-time
const changeFeedIterator = container.items.getChangeFeedIterator({
  changeFeedStartFrom: "Beginning",
});
for await (const { result } of changeFeedIterator) {
  await processChanges(result);            // drives downstream projections, cache invalidation
}`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Partition keys divide data horizontally",
    body: "Every item in Cosmos DB must include the partition key field. Cosmos groups items with the same partition key value into a logical partition. Logical partitions are mapped to physical partitions (each backed by a replica set of 4 nodes). A physical partition holds up to 50GB and serves up to 10,000 RU/s.",
  },
  {
    title: "Request Units (RU/s) are the throughput currency",
    body: "Every operation costs RUs: a 1KB point read = 1 RU, a 1KB write = ~5 RUs, a cross-partition query = 50–500+ RUs depending on result size and partition fan-out. You provision RU/s at the database or container level. Exceeding your provisioned RU/s returns HTTP 429 TooManyRequests.",
  },
  {
    title: "Consistency levels trade latency for staleness",
    body: "Cosmos offers 5 consistency levels. Strong guarantees linearizable reads but doubles write latency (waits for all replicas). Eventual offers lowest latency but reads may see stale data. Session (default) provides read-your-writes for a single client session — the best balance for most apps.",
  },
  {
    title: "Indexing policy controls RU cost and query capability",
    body: "By default Cosmos indexes every property. This makes any query possible but wastes RUs on writes. Exclude unused paths (large blobs, nested arrays you never query) using excludedPaths. Use composite indexes for ORDER BY with WHERE filters — without them, ORDER BY across a large container costs enormous RUs.",
  },
  {
    title: "TTL (Time to Live) prevents unbounded storage",
    body: "Set defaultTtl on the container and optionally ttl on each item. Cosmos automatically deletes expired items in the background — no RU charge for the deletes. Without TTL, logs, sessions, and audit records accumulate forever and inflate storage costs (Cosmos charges per GB stored).",
  },
  {
    title: "Change Feed streams every insert and update",
    body: "Cosmos Change Feed is an append-only log of changes per container, ordered by modification time within each partition. It powers cache invalidation, event-driven projections, and real-time analytics. It does NOT capture deletes (unless using TTL delete pattern or Change Feed with full fidelity preview).",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  { term: "RU/s (Request Units)", definition: "Normalized throughput currency. Combines CPU, memory, and IOPS. A 1KB point read = 1 RU. Provisioned or serverless. Throttled at 429 when exceeded.", icon: "⚡" },
  { term: "Partition Key", definition: "The field used to shard data. Must be high-cardinality (millions of values), immutable after item creation, and appear in your most frequent queries. Wrong choice = hot partition = 429s.", icon: "🗂" },
  { term: "Logical vs Physical Partition", definition: "Logical: all items sharing a partition key value (max 20GB). Physical: a group of logical partitions on one set of replicas (max 50GB, 10K RU/s). Cosmos splits physical partitions automatically.", icon: "📦" },
  { term: "Consistency Levels", definition: "5 levels: Strong, Bounded Staleness, Session (default), Consistent Prefix, Eventual. Trades read/write latency for data freshness guarantees across regions.", icon: "🔄" },
  { term: "Change Feed", definition: "Append-only ordered stream of all inserts/updates per container. Powers event-driven architectures. Does not capture deletes by default.", icon: "📡" },
  { term: "Multi-Region Writes", definition: "Enable writes to any configured region. Cosmos uses last-writer-wins (LWW) or custom conflict resolution. Latency drops to <10ms for users near any region.", icon: "🌍" },
  { term: "Serverless vs Provisioned", definition: "Serverless: pay per RU consumed, no baseline cost — good for dev/test or spiky workloads. Provisioned: fixed RU/s allocated, predictable cost and performance — good for production.", icon: "☁️" },
  { term: "Indexing Policy", definition: "Controls which paths are indexed. Default: all paths. Exclude large blobs to save write RUs. Add composite indexes for multi-field ORDER BY queries.", icon: "📋" },
];

const USE_CASES: UseCase[] = [
  {
    title: "IoT telemetry platform — hot partition from /deviceType key",
    scenario: "A smart building startup stores sensor readings from 50,000 devices in Cosmos DB, partitioned by /deviceType. There are 6 device types (temperature, humidity, CO2, motion, door, light). The platform worked fine in staging with 100 simulated devices but throttled constantly at 80k+ readings/minute in production.",
    problem: "With only 6 partition key values, nearly all writes concentrated in 2–3 physical partitions (most devices were temperature sensors). Those partitions hit the 10,000 RU/s physical partition cap and returned HTTP 429 continuously. Provisioning more RU/s at the container level didn't help because the cap is per physical partition.",
    solution: "Re-partitioned using a synthetic key: /partitionKey = deviceId + '_' + Math.floor(timestamp / 3600). This created ~50,000 × 24 = 1.2M distinct partition key values, distributing load evenly across hundreds of physical partitions. RU cost per write stayed the same; throttling dropped to zero.",
    takeaway: "Partition key cardinality must scale with your write throughput. Rule of thumb: you need at least as many logical partitions as you have peak concurrent writers. A /deviceType or /status key is almost always a hot partition waiting to happen in production.",
  },
  {
    title: "E-commerce order history — cross-partition query cost explosion",
    scenario: "A marketplace added an admin dashboard that queries 'all orders in the last 24 hours with status=processing'. In staging it cost ~15 RU/query. In production with 2M items across 400 partitions, the same query started returning RequestChargeTooLarge errors and costing 8,000+ RUs per execution.",
    problem: "The query 'SELECT * FROM c WHERE c.status = @s AND c._ts > @t' has no partition key in the WHERE clause. Cosmos performs a fan-out query — it sends the query to every physical partition and merges results. With 400 partitions, the base fan-out cost multiplied by 400. The development environment had 5 partitions.",
    solution: "Introduced a materialized view pattern: a Change Feed processor writes order summaries to a separate 'order-status-projections' container partitioned by /statusDay (e.g., 'processing_2024-01-15'). Admin queries hit this container with the partition key, costing ~5 RUs regardless of data volume.",
    takeaway: "Cross-partition queries do NOT scale linearly — they scale with physical partition count, which grows as your data grows. Queries that cost 15 RUs in dev can cost 15,000 in production. Always identify cross-partition query patterns early and build partitioned projections for them.",
  },
  {
    title: "User session store — unbounded storage from missing TTL",
    scenario: "A SaaS CRM used Cosmos DB to store user sessions (JWT data, UI preferences, last-seen state). After 18 months, the storage bill increased from $200/month to $4,800/month for the same active user count. The session container had grown to 12TB.",
    problem: "Sessions were written on every login but never explicitly deleted on logout (logout was client-side only). Inactive users accumulated sessions forever. No TTL was configured. Cosmos charges $0.25/GB/month — 12TB = $3,072/month just for storage, on top of RU costs. The data had zero business value after 30 days.",
    solution: "Added defaultTtl: 2592000 (30 days) to the container. Cosmos silently deleted all items older than 30 days over the following 48 hours — no RU charge for the cleanup. Storage dropped from 12TB to ~40GB. Added a monitor on 'Total Data Size' with a $200 budget alert.",
    takeaway: "Any container holding time-bounded data (sessions, logs, temp state, rate limit counters) MUST have TTL configured from day one. Storage costs compound silently. Cosmos TTL cleanup is free — you only pay for the storage while items are alive.",
  },
];

export default function CosmosDbPage() {
  return (
    <MotionFade>
      <Section
        title="Azure Cosmos DB"
        subtitle="Request Units, partition keys, and consistency levels — why your partition key is the most important architectural decision you'll make."
      >
        <CosmosDbVisualizer />
        <ConceptExplainer
          overview="Azure Cosmos DB is a globally distributed, multi-model NoSQL database with guaranteed single-digit millisecond latency at any scale. Its core abstraction is a container partitioned by a key you choose. Cosmos distributes data and throughput across physical partitions automatically — but only if your partition key has sufficient cardinality. Get the partition key wrong and no amount of provisioned RU/s will save you from throttling."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Cosmos DB — SDK v4: Partition Design, Point Read, Change Feed", code: CODE_EXAMPLE }}
          whyItMatters="Cosmos DB can serve millions of requests per second across the globe with <10ms latency — but only if data is distributed correctly. A bad partition key concentrates all load on one physical partition (a 'hot partition'), which caps at 10,000 RU/s and 50GB regardless of how much throughput you've provisioned. The partition key decision is made at container creation and cannot be changed."
          pitfalls={[
            "Low-cardinality partition key (/status, /type, /country with 3–50 values) creates hot partitions. The physical partition serving the most-used key value hits the 10,000 RU/s cap and returns 429 TooManyRequests. Provisioning more RU/s at the container level does NOT help — the per-physical-partition cap is fixed.",
            "Cross-partition queries (no partition key in WHERE clause) fan out to every physical partition. A query costing 20 RUs in dev with 5 partitions costs 20 × 200 = 4,000 RUs in production with 200 partitions. Fan-out queries also have higher tail latency as the coordinator waits for the slowest partition.",
            "Cosmos DB is NOT a relational database. There are no JOINs across containers, no foreign key constraints, no multi-container transactions (unless using the same partition key). Modeling many-to-many relationships requires denormalization, embedded documents, or Change Feed projections.",
            "Provisioned RU/s are charged 24/7 regardless of actual usage. An idle container with 10,000 RU/s provisioned costs ~$584/month even at zero load. Use serverless mode for dev/test and spiky workloads, or enable autoscale with a minimum RU/s floor.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
