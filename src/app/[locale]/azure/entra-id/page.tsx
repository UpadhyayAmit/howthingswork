"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const EntraIdVisualizer = dynamic(() => import("./EntraIdVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// ASP.NET Core — protect API with Entra ID (Bearer token validation)
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));

// appsettings.json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "your-tenant-id",
    "ClientId": "your-api-app-id",      // The API's own app registration
    "Audience": "api://your-api-app-id"  // Must match 'aud' claim in token
  }
}

// Controller — require scope from the token
[Authorize]
[RequiredScope("orders.read")]
public class OrdersController : ControllerBase { }

// Managed Identity — call another service without credentials in code
// No client secret, no certificate — Azure manages the identity
var credential = new DefaultAzureCredential(); // picks up managed identity automatically
var client = new SecretClient(
    new Uri("https://my-vault.vault.azure.net/"),
    credential);
var secret = await client.GetSecretAsync("db-password");

// App registration — expose an API scope
// In your API's app registration, define a scope:
// "orders.read" with admin consent required
// Client apps request this scope when acquiring tokens

// Client app acquires token for the API
var app = ConfidentialClientApplicationBuilder
    .Create(clientId)
    .WithClientSecret(clientSecret)
    .WithAuthority(new Uri($"https://login.microsoftonline.com/{tenantId}"))
    .Build();

var result = await app.AcquireTokenForClient(
    new[] { "api://your-api-app-id/.default" })  // .default requests all configured scopes
    .ExecuteAsync();

httpClient.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Bearer", result.AccessToken);`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "App Registrations vs Enterprise Applications",
    body: "Every application using Entra ID gets two objects. The App Registration is the global definition — it lives in your tenant and defines the app's identity, redirect URIs, API permissions, and exposed scopes. The Enterprise Application (Service Principal) is the local instantiation in a specific tenant — it holds consent grants, role assignments, and sign-in activity. When another tenant uses your app (multi-tenant), they get their own Enterprise Application but reference your App Registration.",
  },
  {
    title: "OAuth 2.0 Authorization Code Flow — The Web App Pattern",
    body: "For web apps with a user sign-in: the app redirects the user to login.microsoftonline.com with client_id, redirect_uri, scope, and a state parameter. Entra ID authenticates the user and returns an authorization code. The app exchanges the code for an access token and refresh token using its client secret. The access token (JWT) carries the user's claims. PKCE (Proof Key for Code Exchange) replaces client secrets for public clients (SPAs, mobile).",
  },
  {
    title: "Client Credentials Flow — Service-to-Service",
    body: "For background services or APIs calling other APIs without a user context: the service authenticates directly with its client ID and client secret (or certificate). No user consent needed — an admin consents to the app permissions at the tenant level. The resulting token has application permissions (roles), not delegated permissions (scopes). This is the pattern for microservices, Azure Functions, and WebJobs calling other APIs.",
  },
  {
    title: "Managed Identity — Credentials Azure Manages For You",
    body: "System-assigned managed identity creates an identity tied to a specific Azure resource's lifecycle. User-assigned managed identity is standalone and can be assigned to multiple resources. Either way, Azure manages the credential rotation — no secrets in code, no certificate expiry surprises. DefaultAzureCredential in the Azure SDK tries managed identity first, then Visual Studio credentials in dev. Works for Key Vault, Storage, Service Bus, SQL Server (with Azure AD auth enabled).",
  },
  {
    title: "Token Validation — What Your API Must Check",
    body: "When your API receives a Bearer token, it must validate: the signature (using Entra ID's public keys from the OIDC metadata endpoint), the issuer (iss claim must match your tenant), the audience (aud claim must match your API's client ID), and expiry (exp claim). Microsoft.Identity.Web handles all of this. What it doesn't validate automatically: the scp (scope) or roles claims — use [RequiredScope] or [Authorize(Roles = \"...\")] for that.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "App Registration",
    definition: "Global definition of an application in your Entra ID tenant. Defines client ID, redirect URIs, API permissions requested, scopes exposed, and token configuration. One app registration; can have multiple Enterprise Applications (one per tenant it's used in).",
    icon: "📋",
  },
  {
    term: "Managed Identity",
    definition: "An identity for Azure resources managed by Azure — no credentials to store or rotate. System-assigned: tied to a specific resource, deleted with it. User-assigned: standalone, assignable to multiple resources. Use DefaultAzureCredential to consume it in code.",
    icon: "🤖",
  },
  {
    term: "OAuth 2.0 Scope",
    definition: "Permission unit requested by clients. Delegated scopes (User.Read, orders.read) represent actions on behalf of a user. Application permissions (Mail.ReadAll) grant access without a user. Your API defines its own scopes in its App Registration.",
    icon: "🔑",
  },
  {
    term: "Access Token",
    definition: "Short-lived JWT (typically 1 hour) proving identity and permissions. Contains claims: oid (user/app ID), scp (delegated scopes), roles (app roles), aud (intended audience), exp (expiry). Validate aud against your API's client ID to prevent token substitution attacks.",
    icon: "🎟️",
  },
  {
    term: "Conditional Access",
    definition: "Policies that evaluate sign-in risk, device compliance, and location to grant or deny access and require MFA. Evaluated at token issuance. If a user's device becomes non-compliant after token issuance, the policy doesn't retroactively revoke the existing token.",
    icon: "🛡️",
  },
  {
    term: "PKCE",
    definition: "Proof Key for Code Exchange — replaces client secrets for public clients (SPAs, native apps) in the auth code flow. The app creates a code_verifier, hashes it to code_challenge, sends the challenge in the auth request, and proves it by sending the verifier in the token request. Prevents auth code interception attacks.",
    icon: "🔐",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "API Returns 401 Despite Valid Token From Other Service",
    scenario: "ServiceA calls your API with a valid token acquired from Entra ID. The API returns 401 Unauthorized. The token validates fine in jwt.ms, the scopes look correct, and ServiceA can call other APIs successfully with the same flow.",
    problem: "The token's 'aud' (audience) claim contains ServiceA's client ID, not your API's client ID. ServiceA was requesting a token for itself ('/.default' against its own app ID) rather than for your API. The token is valid — just not for your API. Your API's JWT validation correctly rejects it because the audience doesn't match.",
    solution: "ServiceA must request the token with your API's scope as the resource: new[] { 'api://your-api-client-id/.default' }. This produces a token with aud set to your API's client ID. Also verify your API's AzureAd:ClientId setting matches the audience the token is issued for. Common mistake: copying settings from another service's appsettings without updating the ClientId.",
    takeaway: "JWT audience validation prevents token substitution — a valid token for ServiceA cannot be used against your API. When a service-to-service call returns 401, check the 'aud' claim in the token at jwt.ms. It must match your API's client ID, not the caller's.",
  },
  {
    title: "Managed Identity Works Locally But Fails in Production",
    scenario: "A .NET app uses DefaultAzureCredential to access Key Vault. Works perfectly in development (developers have logged in via 'az login'). In production on App Service with managed identity enabled, it fails with 'ManagedIdentityCredential authentication failed: IMDS endpoint not responding within 1000ms'.",
    problem: "The App Service was deployed to a consumption plan with outbound VNET restrictions. The IMDS (Instance Metadata Service) endpoint at 169.254.169.254 is a link-local address that traffic is routed through — not the internet — but certain VNET configurations (specifically UDR rules that route 0.0.0.0/0 through a firewall) intercept this traffic and block it. DefaultAzureCredential's managed identity credential times out after 1 second by default.",
    solution: "Add an explicit UDR exception for 169.254.169.254/32 → Virtual Network to bypass the firewall for IMDS traffic. Alternatively, configure the DefaultAzureCredential to exclude irrelevant credential sources and increase the IMDS timeout: new ManagedIdentityCredential(new ManagedIdentityCredentialOptions { Transport = new HttpClientTransport(new HttpClient { Timeout = TimeSpan.FromSeconds(5) }) }). Add a startup health check that validates Key Vault access.",
    takeaway: "IMDS (169.254.169.254) is how managed identity tokens are obtained in Azure. VNET routing rules or firewalls can intercept this traffic. Always test managed identity in your actual network topology, not just with az login credentials locally. Add Key Vault access to your app's startup health check.",
  },
];

export default function EntraIdPage() {
  return (
    <MotionFade>
      <Section
        title="Microsoft Entra ID"
        subtitle="OAuth 2.0 and OIDC identity platform — app registrations, managed identities, and the token validation steps your API must not skip."
      >
        <EntraIdVisualizer />
        <ConceptExplainer
          overview="Entra ID (formerly Azure Active Directory) is Microsoft's identity platform implementing OAuth 2.0 and OpenID Connect. It handles authentication for web apps and APIs, service-to-service authorization, and credential-free access via managed identities. The complexity lies in understanding which flow to use (auth code for users, client credentials for services), what audience to request tokens for, and how managed identity interacts with VNET routing."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "API Protection, Managed Identity & Token Acquisition", code: CODE_EXAMPLE }}
          whyItMatters="Entra ID eliminates the need to build auth infrastructure. Managed identity removes secrets from code entirely — no credential rotation, no secrets in environment variables, no certificate expiry incidents. For internal services, it's the difference between secure-by-default and secure-if-you-remember-to-rotate-credentials."
          pitfalls={[
            "Access tokens are valid for 1 hour by default and cannot be revoked mid-lifetime (Continuous Access Evaluation extends this with near-real-time revocation for compliant clients). Conditional Access policy changes take effect at next token acquisition, not immediately.",
            "The 'aud' claim in a token identifies who the token is FOR. Your API must validate that aud matches its own client ID. A token acquired for ServiceA cannot be used against your API — this is the intended behavior, not a bug.",
            "Managed identity requires that the hosting environment can reach the IMDS endpoint (169.254.169.254). VNET routing rules or Azure Firewall can block this traffic. Test managed identity in your actual network topology.",
            "App permissions (roles) require admin consent and are granted at the tenant level. Delegated permissions (scopes) require user consent or admin pre-consent. Confusing the two is the most common cause of 'permission denied' errors that work for admins but not regular users.",
            "Multi-tenant apps: tokens issued from a different tenant will have a different issuer (iss) claim. Configure your token validation to accept multiple issuers or use the /common endpoint with additional issuer validation logic.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
