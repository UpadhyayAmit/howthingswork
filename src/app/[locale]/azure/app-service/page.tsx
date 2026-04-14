"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import type { UseCase } from "@/app/_ui/RealWorldUseCase";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const AppServiceVisualizer = dynamic(
  () => import("./AppServiceVisualizer"),
  { ssr: false, loading: () => <VisualizerSkeleton /> }
);

const CODE_EXAMPLE = `// Bicep — App Service Plan + Web App with slots and auto-scale
resource plan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: 'plan-myapp-prod'
  location: resourceGroup().location
  sku: {
    name: 'P1v3'     // Premium v3 — required for VNet integration and deployment slots
    tier: 'PremiumV3'
    capacity: 2      // Start with 2 instances; auto-scale will add up to 10
  }
  properties: {
    reserved: true   // Linux
  }
}

resource app 'Microsoft.Web/sites@2023-01-01' = {
  name: 'app-myapp-prod'
  location: resourceGroup().location
  properties: {
    serverFarmId: plan.id
    siteConfig: {
      alwaysOn: true                 // REQUIRED on B1+ — not available on F1/D1
      healthCheckPath: '/health'     // Returns 200; unhealthy instances removed from LB
      vnetRouteAllEnabled: true      // Route ALL outbound traffic through VNet (not just RFC1918)
      appSettings: [
        { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '1' }  // Read-only deployment, faster start
        { name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' }
      ]
      connectionStrings: [
        {
          name: 'DefaultConnection'
          connectionString: '@Microsoft.KeyVault(SecretUri=https://mykv.vault.azure.net/secrets/db-conn)'
          type: 'SQLAzure'
          // slotSetting: false  ← DEFAULT — this conn string WILL be swapped with staging!
          // Set slotSetting: true to make it sticky (not swapped)
        }
      ]
    }
    virtualNetworkSubnetId: subnetId  // VNet integration for outbound
  }
}

// Staging deployment slot
resource stagingSlot 'Microsoft.Web/sites/slots@2023-01-01' = {
  name: 'staging'
  parent: app
  location: resourceGroup().location
  properties: {
    siteConfig: {
      alwaysOn: true
      appSettings: [
        { name: 'ASPNETCORE_ENVIRONMENT', value: 'Staging' }
        // Slot-sticky settings: slotSetting: true ensures these stay in staging after swap
      ]
    }
  }
}

// Auto-scale rule — CPU-based scale out
resource autoScale 'Microsoft.Insights/autoscalesettings@2022-10-01' = {
  name: 'autoscale-myapp'
  location: resourceGroup().location
  properties: {
    targetResourceUri: plan.id
    enabled: true
    profiles: [{
      name: 'CPU-based'
      capacity: { minimum: '2', maximum: '10', default: '2' }
      rules: [
        {
          metricTrigger: {
            metricName: 'CpuPercentage'
            metricResourceUri: plan.id
            timeGrain: 'PT1M'
            statistic: 'Average'
            timeWindow: 'PT5M'   // 5-min window — too short can cause flapping
            timeAggregation: 'Average'
            operator: 'GreaterThan'
            threshold: 70
          }
          scaleAction: { direction: 'Increase', type: 'ChangeCount', value: '1', cooldown: 'PT5M' }
        },
        {
          metricTrigger: {
            metricName: 'CpuPercentage'
            metricResourceUri: plan.id
            timeGrain: 'PT1M'
            statistic: 'Average'
            timeWindow: 'PT10M'  // Scale-in window longer than scale-out to avoid flapping
            timeAggregation: 'Average'
            operator: 'LessThan'
            threshold: 30
          }
          scaleAction: { direction: 'Decrease', type: 'ChangeCount', value: '1', cooldown: 'PT10M' }
        }
      ]
    }]
  }
}`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "App Service Plan — what you're actually paying for",
    body: "The App Service Plan is the compute resource: it defines the VM size, OS, region, and number of instances. All apps on the same plan share those instances — a B2 plan with 4 apps means all 4 apps compete for the same 2 vCores and 3.5 GB RAM. You pay for the plan whether or not apps are receiving requests.",
  },
  {
    title: "Deployment slots — blue/green built in",
    body: "Each slot (staging, preview, etc.) is a fully functional App Service app with its own hostname, configuration, and deployment target. When you swap slots, Azure warms up the new slot by sending a request to the site root, waits for a 200 response, then atomically swaps the routing rules. Traffic switches instantaneously; no DNS change required.",
  },
  {
    title: "Slot-sticky settings — the configuration swap trap",
    body: "App settings and connection strings are swapped with the app by default. If your staging slot uses a staging database connection string and you forget to mark it slot-sticky, the staging connection string will become production's connection string after the swap. Mark settings as 'deployment slot setting' (slot-sticky) in the portal or via slotSetting: true in Bicep to pin them to the slot.",
  },
  {
    title: "Always On — the cold start nobody talks about",
    body: "Without Always On enabled, Azure unloads your app's worker process after ~20 minutes of inactivity to reclaim resources. The next request will take 5–15 seconds while IIS/Kestrel restarts and your app initializes. Always On sends a periodic ping to keep the process alive. It is not available on Free or Shared tiers.",
  },
  {
    title: "Auto-scale rules and the cooldown window",
    body: "Auto-scale evaluates metric aggregations over a time window (e.g., average CPU over 5 minutes). After a scale action fires, the cooldown period prevents further scaling until metrics stabilize. Scale-out and scale-in cooldowns should be asymmetric: scale out quickly (5-min cooldown), scale in slowly (10–15 min cooldown) to avoid flapping during load spikes.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  {
    term: "Plan Tiers",
    definition: "F1 (Free, 60 CPU-min/day, no Always On, no slots) → B1 (Basic, 1 vCore, no slots, no auto-scale) → S1 (Standard, 5 slots, auto-scale) → P1v3 (Premium v3, 2 vCore, VNet, better cold-start). Never use F1 or B1 in production for latency-sensitive apps.",
    icon: "📊",
  },
  {
    term: "Deployment Slots",
    definition: "Named alternate environments (staging, canary) that each have their own URL, config, and deployment history. Swap moves traffic atomically. Available on Standard and above. The 'production' slot is the default.",
    icon: "🔄",
  },
  {
    term: "Slot-Sticky Settings",
    definition: "App settings or connection strings marked as 'deployment slot setting' stay bound to the slot they're configured on — they do NOT swap with the app. Use this for slot-specific secrets like staging DB connection strings.",
    icon: "📌",
  },
  {
    term: "Always On",
    definition: "Keeps the app worker process alive by sending periodic ping requests. Without it, the process is recycled after idle timeout, causing cold starts on the first request. Unavailable on Free and Shared (D1) tiers.",
    icon: "💚",
  },
  {
    term: "Health Check",
    definition: "App Service pings your /health endpoint every 2 minutes. If an instance fails 10 consecutive checks, it's removed from the load balancer and replaced. Requires at least 2 instances to be effective — one instance health check alerts only, doesn't replace.",
    icon: "🏥",
  },
  {
    term: "SCM / Kudu",
    definition: "The App Service management console at https://<appname>.scm.azurewebsites.net. Exposes a bash/PowerShell terminal, deployment logs, process explorer, and file system. It runs on the same compute and has no IP restriction by default — a significant attack surface.",
    icon: "🔧",
  },
  {
    term: "VNet Integration",
    definition: "Allows outbound calls from App Service into a private VNet (to reach databases, Redis, internal APIs). Only outbound — it does not make your app reachable from within the VNet. Regional VNet integration requires a dedicated subnet and Standard+ plan.",
    icon: "🌐",
  },
];

const USE_CASES: UseCase[] = [
  {
    title: "Connection String Swap Took Down Production Database",
    scenario: "A team deployed a new version to their staging slot with a staging SQL database. After load testing passed, they swapped staging to production. Within 2 minutes, all production users started receiving 'Login failed for user' SQL errors.",
    problem: "The staging slot had a connection string named 'DefaultConnection' pointing to the staging database. This connection string was NOT marked as slot-sticky. When the swap occurred, the staging connection string traveled with the app code into the production slot, pointing production traffic at the staging (empty) database.",
    solution: "Marked the 'DefaultConnection' setting as a deployment slot setting (slot-sticky) in both slots. The production slot now permanently holds its production connection string; staging permanently holds its staging string. After swap, the app code moves but the connection strings stay pinned to their respective slots.",
    takeaway: "Any setting that is environment-specific (DB connection strings, API keys pointing to environment-specific services) must be marked slot-sticky. Treat it as a mandatory deployment checklist item, not an optional configuration.",
  },
  {
    title: "Free Tier Cold Start Alarming Users Every Morning",
    scenario: "A startup's dashboard app on the F1 (Free) tier had a support ticket every Monday morning: 'The app takes forever to load'. Investigation showed first-request latency of 12–18 seconds after the weekend.",
    problem: "F1 tier does not support Always On. After ~20 minutes without traffic, the IIS worker process was recycled. Monday morning's first user triggered a full cold start: ASP.NET Core initialization, DI container build, EF Core model compilation, and connection pool warmup all on one request. Free tier hardware compounded the issue.",
    solution: "Upgraded to B1 ($13/month) and enabled Always On. Cold starts dropped to <2 seconds (EF Core model cache still warms on first request). Added a /health endpoint that pre-warms the EF Core model on startup using a lightweight query. Set up an external uptime monitor (UptimeRobot) to ping /health every 5 minutes as a belt-and-suspenders keep-alive.",
    takeaway: "F1 and D1 (Shared) tiers are development-only. No Always On means cold starts for every user session that falls outside peak hours. The cost of B1 is less than one hour of senior developer time spent debugging user-reported slowness.",
  },
  {
    title: "Kudu Console Exposed Without IP Restriction",
    scenario: "A security audit revealed that the app's Kudu console (https://appname.scm.azurewebsites.net) was accessible from the internet without any IP restriction. The audit team used it to list environment variables and read the application file system within 10 minutes of starting.",
    problem: "Kudu's SCM endpoint uses the same Azure AD authentication as the portal for management-plane access, but many teams accept any Azure login or use publish profile credentials. With no IP restriction, any attacker with valid credentials (or a leaked publish profile XML) has a terminal session with full filesystem and process access on the production web server.",
    solution: "Added an IP restriction in App Service networking to allow SCM access only from the team's VPN CIDR range (10.0.0.0/8) and the Azure DevOps agent subnet. Rotated all publish profile credentials. Migrated deployments to service principal + GitHub Actions, eliminating publish profile usage entirely.",
    takeaway: "Kudu is a fully featured server administration console. Restrict its SCM access URL by IP at the platform level — it's one checkbox in App Service Networking that most teams skip.",
  },
];

export default function AppServicePage() {
  return (
    <MotionFade>
      <Section
        title="Azure App Service & Hosting"
        subtitle="Deployment slots, auto-scaling, and the App Service plan — understanding what you're actually paying for."
      >
        <AppServiceVisualizer />
        <ConceptExplainer
          overview="Azure App Service is a fully managed PaaS for hosting web applications, REST APIs, and mobile backends. The platform handles OS patching, load balancing, and scaling, but the billing model, slot configuration, and Always On setting have non-obvious implications. Most production incidents trace back to three things: the wrong plan tier, connection strings that travel across a slot swap, or Kudu left open to the internet."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Bicep — P1v3 plan, staging slot, auto-scale rules, VNet integration", code: CODE_EXAMPLE }}
          whyItMatters="App Service abstracts away infrastructure management, but it does not abstract away configuration decisions. Slot swaps, sticky settings, plan tier constraints, and VNet integration all require explicit intent. A deployment pipeline that doesn't account for slot-sticky settings, or a cost-cutting move from S1 to F1, can create production incidents within minutes of the change taking effect."
          pitfalls={[
            "Connection strings and app settings travel with the app during a slot swap unless explicitly marked as slot-sticky (deployment slot setting). Staging database credentials going to production is the most common swap-induced outage.",
            "Free (F1) and Shared (D1) tiers do not support Always On. The worker process is recycled after idle timeout — first request cold start is 5–15 seconds. These tiers are not suitable for production apps with SLA requirements.",
            "Auto-scale time windows that are too short (1–2 minutes) cause flapping: scale out fires, adds an instance, CPU drops, scale in fires, removes the instance — on repeat. Use 5+ minute scale-out windows and 10+ minute scale-in windows.",
            "Kudu (SCM endpoint) is publicly accessible by default. It provides a terminal, file system browser, and process explorer on your production web server. Restrict it to your VPN CIDR in App Service Networking.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}
