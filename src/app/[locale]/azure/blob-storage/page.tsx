"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const BlobStorageVisualizer = dynamic(() => import("./BlobStorageVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// Azure Blob Storage — @azure/storage-blob SDK v12
// User Delegation SAS (more secure than Account Key SAS)

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  UserDelegationKey,
} from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

// --- UPLOAD WITH LIFECYCLE TIER ---
const credential = new DefaultAzureCredential();       // Managed Identity — no secrets
const blobServiceClient = new BlobServiceClient(
  \`https://\${process.env.STORAGE_ACCOUNT}.blob.core.windows.net\`,
  credential
);

const containerClient = blobServiceClient.getContainerClient("reports");
const blockBlobClient = containerClient.getBlockBlobClient("2024/q1/report.pdf");

await blockBlobClient.uploadData(pdfBuffer, {
  tier: "Hot",                                          // explicit tier on upload
  blobHTTPHeaders: {
    blobContentType: "application/pdf",
    blobCacheControl: "public, max-age=86400",          // CDN/browser cache hint
  },
  metadata: { generatedBy: "report-service", version: "3" },
});

// --- USER DELEGATION SAS (preferred over Account Key SAS) ---
// User delegation key is bound to an Entra ID identity — rotates with the token
const userDelegationKey: UserDelegationKey =
  await blobServiceClient.getUserDelegationKey(
    new Date(),
    new Date(Date.now() + 60 * 60 * 1000)              // key valid for 1 hour
  );

const sasParams = generateBlobSASQueryParameters(
  {
    containerName: "reports",
    blobName: "2024/q1/report.pdf",
    permissions: BlobSASPermissions.parse("r"),         // read-only
    startsOn: new Date(),
    expiresOn: new Date(Date.now() + 15 * 60 * 1000),  // 15-minute window — short-lived
    ipRange: { start: "203.0.113.0", end: "203.0.113.255" }, // IP restriction
  },
  userDelegationKey,
  process.env.STORAGE_ACCOUNT!
);

const sasUrl = \`\${blockBlobClient.url}?\${sasParams.toString()}\`;

// --- LIFECYCLE MANAGEMENT POLICY (ARM / Bicep equivalent) ---
await blobServiceClient.setProperties({
  // Configure via Azure Portal or ARM template; SDK sets account-level properties
  // Lifecycle rules are JSON — example structure:
  // {
  //   rules: [{
  //     name: "archive-old-reports",
  //     type: "Lifecycle",
  //     definition: {
  //       filters: { blobTypes: ["blockBlob"], prefixMatch: ["reports/"] },
  //       actions: {
  //         baseBlob: {
  //           tierToCool: { daysAfterModificationGreaterThan: 30 },
  //           tierToArchive: { daysAfterModificationGreaterThan: 180 },
  //           delete: { daysAfterModificationGreaterThan: 365 },
  //         },
  //       },
  //     },
  //   }],
  // }
});`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Blobs are stored in containers within a Storage Account",
    body: "A Storage Account is the top-level namespace. Containers (like buckets) hold blobs. Blob names can include '/' separators to simulate a folder hierarchy — this is a naming convention, not a real directory structure. There are three blob types: Block (files, arbitrary data), Append (logging), Page (random-access, VM disks).",
  },
  {
    title: "Access tiers determine storage cost vs retrieval speed",
    body: "Hot: highest storage cost ($0.018/GB), lowest access cost — for frequently read data. Cool: lower storage cost ($0.01/GB), higher access cost, minimum 30-day retention. Cold: even lower ($0.004/GB), minimum 90-day retention. Archive: cheapest storage ($0.001/GB) but offline — retrieval (rehydration) takes 1–15 hours.",
  },
  {
    title: "Lifecycle management automates tier transitions",
    body: "JSON lifecycle policies run daily and automatically transition blobs between tiers or delete them based on age (last modified, last accessed, created). This is cost optimization on autopilot — e.g., move to Cool after 30 days, Archive after 180, delete after 365. Rules can target by container prefix or blob index tags.",
  },
  {
    title: "SAS tokens grant time-limited access without exposing account keys",
    body: "A Shared Access Signature (SAS) is a signed URL with embedded permissions (read/write/delete/list), expiry time, IP restrictions, and optional protocol constraints. The recipient can use it without an account key. User Delegation SAS (signed by an Entra ID token) is more secure than Service SAS (signed by an account key) because it rotates automatically.",
  },
  {
    title: "CDN caches blobs at edge nodes worldwide",
    body: "Azure CDN (or Azure Front Door) serves blobs from edge PoPs close to the user. On cache miss, the CDN fetches from the origin (Blob Storage) and caches for the duration of the Cache-Control header. Cache hits cost ~$0.0075/GB vs Blob egress ~$0.087/GB — ~12x cheaper. Cache invalidation requires a purge API call or URL versioning.",
  },
  {
    title: "Redundancy levels protect against hardware and regional failure",
    body: "LRS: 3 copies in one datacenter. ZRS: 3 copies across 3 availability zones. GRS: LRS + async replication to a secondary region. GZRS: ZRS + secondary region. RA-GRS: GRS with read access to the secondary endpoint at all times. Higher redundancy = higher cost + higher durability SLA (up to 16 nines with RA-GZRS).",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  { term: "Block / Append / Page Blobs", definition: "Block: up to 190.7TB, immutable block composition — for files, backups. Append: optimized for log writes (append only). Page: 512-byte random-access pages, up to 8TB — backing store for Azure VM disks.", icon: "🧱" },
  { term: "Access Tiers", definition: "Hot → Cool → Cold → Archive. Storage cost decreases; retrieval cost and latency increase. Archive blobs are offline — reads require a rehydration request first (1–15 hours). Early deletion penalties apply.", icon: "🌡" },
  { term: "Rehydration Priority", definition: "Rehydrating from Archive: Standard priority = up to 15 hours. High priority = typically <1 hour at ~10x the cost. Choose based on urgency. Always model rehydration time into your RTO.", icon: "⏰" },
  { term: "SAS Token Types", definition: "Service SAS: access to one storage service, signed by account key. Account SAS: access to multiple services, signed by account key. User Delegation SAS: signed by Entra ID user/managed identity token — automatically rotated, audit-logged.", icon: "🔑" },
  { term: "Stored Access Policy", definition: "A named policy on a container that a Service SAS can reference. Lets you revoke all SAS tokens referencing that policy without knowing the individual tokens — the only way to revoke account-key-signed SAS before expiry.", icon: "📋" },
  { term: "Redundancy (LRS/ZRS/GRS/GZRS/RA-GRS)", definition: "LRS: 3 copies, 1 zone. ZRS: 3 zones. GRS: LRS + async secondary region. GZRS: ZRS + secondary region. RA-GRS: readable secondary. Durability from 11 nines (LRS) to 16 nines (RA-GZRS).", icon: "🛡" },
  { term: "Soft Delete & Versioning", definition: "Soft delete retains deleted blobs for a configurable retention period (1–365 days). Versioning captures a snapshot on every overwrite. Both protect against accidental deletions. Neither helps if a lifecycle policy deletes intentionally.", icon: "🔄" },
  { term: "Lifecycle Management", definition: "JSON rules that run daily and move or delete blobs based on age, last access time, or index tags. Automates tier transitions at zero operational overhead.", icon: "⚙️" },
];

const USE_CASES: UseCase[] = [
  {
    title: "Medical imaging archive — 15-hour Archive rehydration blocked emergency access",
    scenario: "A hospital radiology system archived DICOM images older than 6 months to Archive tier to save costs. When a patient was readmitted, the on-call radiologist needed prior scan comparisons immediately. The rehydration request took 11 hours — the patient had been in surgery for 3 hours before images were accessible.",
    problem: "Standard priority rehydration from Archive is documented as 'up to 15 hours' but in practice often 8–15 hours under load. The team modeled Archive as 'cheap cold storage' but didn't map the rehydration SLA to their clinical RTO of <30 minutes. There was no High priority rehydration workflow configured.",
    solution: "Implemented a two-tier archive: images 6–24 months old go to Cold tier (instant access, $0.004/GB). Only images >24 months go to Archive. Added an emergency rehydration workflow using High priority (BlobRehydratePriority.High) for flagged patient IDs. High priority rehydration costs ~10x but typically completes in <1 hour.",
    takeaway: "Archive tier means 'offline storage' — blobs are not directly readable. Always map rehydration time (Standard: up to 15hrs, High: ~1hr) against your actual access SLA before choosing Archive. For disaster recovery scenarios, Cold tier with instant access is usually the right tradeoff.",
  },
  {
    title: "B2B file exchange — account-key SAS in source code, credential leaked",
    scenario: "A logistics company provided partners with SAS tokens to upload shipment manifests. The token generation code used a hardcoded storage account key. A developer accidentally committed the key to a public GitHub repository. Within 47 minutes, the account was enumerated, 200GB of manifests were downloaded, and the attacker began uploading malicious files.",
    problem: "Account-key SAS tokens cannot be selectively revoked — there is no registry of issued tokens. The only remediation was rotating the storage account key, which invalidated ALL SAS tokens instantly, breaking every partner integration simultaneously. Key rotation required emergency partner communication and 6 hours of coordinated downtime.",
    solution: "Migrated to User Delegation SAS signed by a Managed Identity. Token lifetime capped at 15 minutes per upload session. Added a Stored Access Policy on the upload container so all outstanding tokens can be instantly revoked by revoking the policy — without rotating the account key. Added GitHub secret scanning alert to the repo.",
    takeaway: "Account-key SAS tokens are irrevocable individually — rotation is the nuclear option. User Delegation SAS auto-rotates with the Entra ID token and can be audited in sign-in logs. Always prefer User Delegation SAS for any external-facing access. Always set a short expiry.",
  },
  {
    title: "Video streaming platform — CORS misconfiguration blocked browser direct upload",
    scenario: "A video platform migrated to a browser-direct-to-Blob-Storage upload architecture (using SAS tokens) to eliminate server bandwidth costs. The feature worked perfectly in the development environment but 100% of uploads failed in production with 'CORS policy: No Access-Control-Allow-Origin header' errors in the browser console.",
    problem: "Azure Blob Storage CORS rules are configured per storage account, not per container. The development environment storage account had wildcard CORS enabled (added during debugging). The production account had no CORS rules. Server-side uploads from the backend worked fine; browser XMLHttpRequest/fetch uploads to Blob Storage URLs require the storage account itself to return CORS headers.",
    solution: "Added a CORS rule to the production storage account allowing the app origin, PUT/POST methods, and required headers (x-ms-blob-type, Content-Type). CORS rules are applied in Azure Portal under Settings > Resource sharing (CORS) or via ARM template. Added a smoke test that verifies CORS configuration is present in the production deployment pipeline.",
    takeaway: "Browser-direct-to-Blob-Storage uploads require CORS rules configured on the storage account itself — not the app server. This is a separate configuration from server-side access. Missing CORS causes total upload failure with no error on the server side, making it hard to diagnose from logs alone.",
  },
];

export default function BlobStoragePage() {
  return (
    <MotionFade>
      <Section
        title="Azure Blob Storage & CDN"
        subtitle="Hot/Cool/Cold/Archive tiers, SAS tokens, and lifecycle policies — how Azure stores and serves objects at scale."
      >
        <BlobStorageVisualizer />
        <ConceptExplainer
          overview="Azure Blob Storage is an object storage service designed for unstructured data — documents, images, videos, backups, and logs. It scales to exabytes with 11–16 nines of durability depending on redundancy level. Its access tier system (Hot/Cool/Cold/Archive) lets you trade access speed for cost, automating transitions via lifecycle management policies."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Blob Storage — User Delegation SAS & Upload (@azure/storage-blob v12)", code: CODE_EXAMPLE }}
          whyItMatters="Blob Storage is the foundation of Azure data platforms — backing Data Lake, ML training datasets, CDN origins, VM disk images, and application file stores. Understanding the access tier economics and SAS token security model is critical: the difference between Hot and Archive tier is 18x on storage cost but the difference in access pattern can mean hours of rehydration delay in a production incident."
          pitfalls={[
            "Archive rehydration can take up to 15 hours with Standard priority. This is not a warning — it is the documented SLA. Teams routinely discover this during a production incident when they need 'archived' data immediately. Model rehydration time against your RTO before choosing Archive.",
            "SAS tokens generated with the account key cannot be individually revoked. If a token is leaked, your only option is to rotate the storage account key — which instantly invalidates every SAS token ever issued from that key, breaking all integrations. Use User Delegation SAS + Stored Access Policies for external-facing access.",
            "Account-key SAS is less auditable than User Delegation SAS. Account-key SAS operations do not appear in Entra ID sign-in logs. User Delegation SAS is tied to an identity and every token issuance is audited. For compliance-sensitive workloads, this distinction matters.",
            "Public blob access enabled on a container means ANY anonymous internet user can read ALL blobs in that container — no SAS required. Azure disabled this by default at the storage account level in 2023, but many legacy accounts still have it enabled. Audit with: az storage account list --query \"[?allowBlobPublicAccess==true]\".",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
