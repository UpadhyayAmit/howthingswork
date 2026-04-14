"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const KeyVaultVisualizer = dynamic(() => import("./KeyVaultVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// .NET 8 — Zero-secret config with Key Vault + Managed Identity
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// DefaultAzureCredential tries, in order:
// 1. Environment variables, 2. Workload Identity, 3. Managed Identity,
// 4. Visual Studio, 5. Azure CLI, 6. Azure PowerShell, 7. Interactive
var credential = new DefaultAzureCredential();

// Add Key Vault as a configuration provider
builder.Configuration.AddAzureKeyVault(
    new Uri(builder.Configuration["KeyVault:VaultUri"]!),
    credential
);

// SecretClient for imperative access
builder.Services.AddSingleton(_ =>
    new SecretClient(new Uri(builder.Configuration["KeyVault:VaultUri"]!), credential));

var app = builder.Build();

// -----------------------------------------------
// Fetching a secret imperatively (with caching)
// -----------------------------------------------
public class SecretService
{
    private readonly SecretClient _client;
    private readonly IMemoryCache _cache;

    public async Task<string> GetSecretAsync(string name)
    {
        // Cache for 5 minutes — balance freshness vs rate limits (5 RPS per secret)
        return await _cache.GetOrCreateAsync($"secret:{name}", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
            var secret = await _client.GetSecretAsync(name);
            return secret.Value.Value;
        });
    }
}

// -----------------------------------------------
// App Service config reference (NO code needed!)
// -----------------------------------------------
// In App Service Application Settings, add:
// Name:  ConnectionStrings__Sql
// Value: @Microsoft.KeyVault(SecretUri=https://contoso-prod.vault.azure.net/secrets/sql-connstr/)
//
// App Service resolves this at runtime using its managed identity.
// The secret value appears as a regular config value to your app.`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Managed Identity removes the bootstrap secret problem",
    body: "The classic credential problem: you need a secret to get a secret. Managed Identity solves this — Azure assigns a cryptographic identity to your resource (App Service, VM, Function) backed by Azure AD. No password, no key file, no rotation needed.",
  },
  {
    title: "App requests a token from the Instance Metadata Service (IMDS)",
    body: "At runtime, the Azure SDK calls http://169.254.169.254/metadata/identity/oauth2/token — an Azure-internal endpoint only reachable from within Azure. This returns a short-lived JWT signed by Azure AD. DefaultAzureCredential handles this automatically.",
  },
  {
    title: "Key Vault validates the token and checks permissions",
    body: "Key Vault receives the request with the Bearer token. It validates the signature against Azure AD and then checks: does this identity have Key Vault Secrets User RBAC role (or access policy permission) on this vault? If not, 403 Forbidden.",
  },
  {
    title: "Secret is returned and should be cached",
    body: "The secret value is returned over TLS. Key Vault enforces a rate limit of 5 requests per second per secret. Your code should cache the value (5 minutes is typical) — refresh too rarely and you pick up rotated secrets too late; refresh too often and you hit rate limits.",
  },
  {
    title: "Secret rotation with versioning",
    body: "Key Vault stores all versions of a secret. When you set a new value, the previous version is not deleted — it's retained with a 90-day soft-delete window. Apps that fetch the latest version automatically get the new value on the next cache refresh. No redeployment needed.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "SecretClient",
    definition: "Azure SDK client for reading/writing Key Vault secrets. Pair with DefaultAzureCredential for zero-config auth that works in dev (Azure CLI) and prod (Managed Identity) without code changes.",
    icon: "🔐",
  },
  {
    term: "DefaultAzureCredential",
    definition: "Credential chain that tries multiple auth sources in order: environment variables → workload identity → managed identity → Visual Studio → Azure CLI. Same code works everywhere.",
    icon: "🔗",
  },
  {
    term: "Managed Identity",
    definition: "System-assigned: 1-to-1 with resource, deleted with resource. User-assigned: independent lifecycle, shareable across resources. Both eliminate the need to store any credentials.",
    icon: "🤖",
  },
  {
    term: "Key Vault References",
    definition: "App Service / Functions config value syntax: @Microsoft.KeyVault(SecretUri=...). Azure resolves this using the resource's managed identity at runtime. Zero SDK code required.",
    icon: "🔗",
  },
  {
    term: "Soft-delete & Purge Protection",
    definition: "Soft-delete retains deleted secrets for 7–90 days (recoverable). Purge protection prevents immediate permanent deletion, requiring the retention period to expire first. Both must be enabled to prevent accidental loss.",
    icon: "🗑️",
  },
  {
    term: "RBAC vs Access Policies",
    definition: "RBAC is the modern model — uses Azure AD roles (Key Vault Secrets User/Officer/Admin), supports Conditional Access and PIM. Access Policies is legacy, vault-level only, retiring. Always use RBAC for new vaults.",
    icon: "🛡️",
  },
  {
    term: "Secret Versioning",
    definition: "Every SetSecret() call creates a new version. The 'current' version is the latest active one. Applications fetching by name (without version) always get the latest, enabling zero-downtime rotation.",
    icon: "📚",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "Accidental Secret Deletion Without Purge Protection",
    scenario: "A developer ran a cleanup script to remove unused Key Vault secrets. A production secret named db-connection was accidentally deleted. The app started throwing connection errors within seconds.",
    problem: "The vault had soft-delete disabled (pre-2021 default). The deletion was permanent and immediate. The secret was gone with no recovery path. The team had to manually reconstruct the connection string from a colleague's local notes.",
    solution: "Enabled soft-delete (now mandatory on all new vaults) and purge protection on all vaults. Implemented a policy via Azure Policy that denies Key Vault creation without purge protection. Added RBAC so developers have Key Vault Secrets User (read-only) and only the pipeline service principal has Key Vault Secrets Officer.",
    takeaway: "Soft-delete is now mandatory on new Azure Key Vaults, but legacy vaults may still lack it. Purge protection is a separate setting and must be explicitly enabled. Without it, a single az keyvault secret delete command causes permanent data loss.",
  },
  {
    title: "Key Vault Firewall Blocking App Service After IP Change",
    scenario: "A team enabled the Key Vault firewall to restrict access to known IPs. The app worked fine until App Service automatically scaled out, assigning new outbound IPs that weren't in the allow-list. The app started returning 403 on every secret fetch.",
    problem: "App Service outbound IPs are not static — they change when you scale out, change pricing tier, or App Service rebalances its infrastructure. A firewall rule based on the 4 'main' IPs misses the additional IPs used during scale-out events.",
    solution: "Replaced IP firewall rules with private endpoints (Key Vault Private Link). The Key Vault is only accessible via the VNet, and the App Service connects through VNet Integration. Alternatively, added all possible outbound IPs from the App Service properties page and set up an alert when IPs change.",
    takeaway: "App Service has multiple possible outbound IPs (show in portal under 'Outbound IP addresses'). Using IP firewall on Key Vault is fragile — use private endpoints + VNet Integration for production environments.",
  },
  {
    title: "User-Assigned Managed Identity Not Attached to App Service",
    scenario: "A team created a user-assigned managed identity, granted it Key Vault Secrets User RBAC, and updated the app code to use DefaultAzureCredential. Local dev worked (Azure CLI fallback). Deploying to App Service returned 403 on every Key Vault request.",
    problem: "Creating a user-assigned managed identity and granting it RBAC is insufficient. The identity must also be explicitly assigned to the App Service resource in the Identity blade under User-assigned. Without this step, the App Service has no identity to present to IMDS.",
    solution: "Assigned the user-assigned identity to the App Service via the Identity > User assigned > + Add flow. Added this step to the Terraform / Bicep deployment template to prevent recurrence. Added an integration test that calls Key Vault on startup and fails the health check if access is denied.",
    takeaway: "User-assigned identity requires two steps: (1) grant RBAC on Key Vault, (2) attach to the resource. Most teams complete step 1 and forget step 2. System-assigned identity is simpler for single-resource scenarios — it's created and attached atomically.",
  },
];

export default function KeyVaultPage() {
  return (
    <MotionFade>
      <Section
        title="Azure Key Vault & Managed Identity"
        subtitle="Zero-secret configuration — how to get secrets into your app without storing credentials anywhere."
      >
        <KeyVaultVisualizer />
        <ConceptExplainer
          overview="Azure Key Vault stores secrets, certificates, and cryptographic keys in a hardware-backed, audited service. Managed Identity gives your Azure resources a cryptographic identity backed by Azure AD — eliminating the bootstrap credential problem. Combined, they enable zero-secret configuration: no passwords in code, config files, environment variables, or CI/CD pipelines."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: ".NET 8 — Key Vault + Managed Identity: zero secrets in config", code: CODE_EXAMPLE }}
          whyItMatters="Every secret stored in a config file, environment variable, or CI/CD pipeline is a credential leak waiting to happen — via git history, log files, process dumps, or stolen CI tokens. Managed Identity + Key Vault eliminates all of these attack surfaces. The app never possesses a long-lived credential; it requests short-lived tokens that expire and rotate automatically."
          pitfalls={[
            "Soft-delete doesn't prevent permanent deletion on its own — purge protection must also be enabled. Without purge protection, a deleted secret can be immediately purged (destroyed forever).",
            "App Service and Functions have multiple outbound IPs. IP-based Key Vault firewall rules break on scale-out when new IPs are assigned. Use private endpoints + VNet Integration instead.",
            "Key Vault enforces a rate limit of ~5 RPS per secret per vault. Fetching the secret on every request without caching will hit this limit under load and cause 429 errors.",
            "User-assigned managed identity requires TWO steps: (1) grant RBAC on Key Vault AND (2) assign the identity to the App Service/Function/VM. Completing only step 1 gives a misleading 403 that looks like an RBAC issue.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
