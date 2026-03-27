# HowThingsWork — Category Expansion TODO

## Phase 0: Infrastructure & Scaffolding
- [x] Create [CategoryConceptTree](file:///c:/Projects/POC/howthingswork/src/app/_ui/CategoryConceptTree.tsx#48-143) shared React Flow component for concept maps
- [x] Update [constants.ts](file:///c:/Projects/POC/howthingswork/src/lib/constants.ts) — add all NAV_ITEMS for 11 categories (98 links)
- [x] Update [Sidebar.tsx](file:///c:/Projects/POC/howthingswork/src/app/_components/Sidebar.tsx) — add icons + colors for each category
- [x] Update home [page.tsx](file:///c:/Projects/POC/interview-prep/src/app/login/page.tsx) — add 11 category cards
- [x] Update all 7 locale translation files with new category keys
- [x] Create landing pages with concept trees for: JavaScript, C# (expanded), ASP.NET Core, EF Core, Azure (expanded), Architecture, Microservices, Testing, System Design, AI/ML
- [x] Build verification ✅

## Phase 1: JavaScript Internals (`javascript`) — 10 articles ✅
- [x] Landing page with React Flow concept tree
- [x] Event Loop & Call Stack
- [x] Closures & Scope Chain
- [x] Prototypal Inheritance
- [x] Promises & Microtasks
- [x] Async/Await Under the Hood
- [x] Garbage Collection (V8)
- [x] Module System (ESM vs CJS)
- [x] `this` Binding Rules
- [x] Web APIs & Browser Runtime
- [x] Memory Leaks & Debugging

## Phase 2: C# & .NET Runtime (`csharp-clr`) — expand 2→10
- [x] Updated landing page + concept tree
- [ ] CLR Architecture (new)
- [ ] Value Types vs Reference Types (new)
- [ ] async/await State Machine (new)
- [ ] LINQ Deferred Execution (new)
- [ ] Delegates & Events (new)
- [ ] Generics & Reification (new)
- [ ] DI Container & Service Lifetimes (new)
- [ ] Reflection & Source Generators (new)

## Phase 3: ASP.NET Core (`aspnet-core`) — 10 articles
- [x] Landing page + concept tree
- [ ] Request Pipeline & Middleware
- [ ] Routing & Endpoint Resolution
- [ ] DI in Action (per-request scopes)
- [ ] Authentication & Authorization
- [ ] Model Binding & Validation
- [ ] Filters (Action/Exception/Result)
- [ ] Configuration & Options Pattern
- [ ] Logging & Diagnostics
- [ ] API Versioning & Content Negotiation
- [ ] Error Handling & Problem Details

## Phase 4: Entity Framework Core (`entity-framework`) — 8 articles
- [x] Landing page + concept tree
- [ ] DbContext & Change Tracker
- [ ] Query Pipeline (LINQ → SQL)
- [ ] Migrations & Schema Evolution
- [ ] Loading Strategies (Eager/Lazy/Explicit)
- [ ] Relationships & Navigation
- [ ] Query Performance & Indexing
- [ ] Concurrency & Conflict Resolution
- [ ] Raw SQL & Stored Procedures

## Phase 5: Azure Cloud (`azure`) — expand 1→10
- [x] Landing page + concept tree
- [ ] App Service & Hosting (new)
- [ ] Azure AD / Entra ID (new)
- [ ] Service Bus & Messaging (new)
- [ ] Azure SQL & Cosmos DB (new)
- [ ] Blob Storage & CDN (new)
- [ ] API Management (new)
- [ ] Application Insights (new)
- [ ] Key Vault & Managed Identity (new)
- [ ] Azure DevOps Pipelines (new)

## Phase 6: Architecture & Design Patterns (`architecture`) — 10 articles
- [x] Landing page + concept tree
- [ ] SOLID Principles
- [ ] OOP: 4 Pillars in Practice
- [ ] Clean Architecture
- [ ] Repository & Unit of Work
- [ ] CQRS & Event Sourcing
- [ ] Mediator & MediatR Pattern
- [ ] Strategy, Factory, Observer
- [ ] Decorator & Chain of Responsibility
- [ ] Domain-Driven Design (DDD)
- [ ] Anti-Patterns & Code Smells

## Phase 7: Microservices (`microservices`) — 10 articles
- [x] Landing page + concept tree
- [ ] Monolith vs Microservices
- [ ] API Gateway Pattern
- [ ] Service Discovery & Load Balancing
- [ ] Inter-Service Communication
- [ ] Circuit Breaker & Resilience
- [ ] Saga Pattern
- [ ] Event-Driven Architecture
- [ ] Container Orchestration
- [ ] Observability (Logs/Metrics/Traces)
- [ ] Data Management per Service

## Phase 8: Testing Strategies (`testing`) — 10 articles
- [x] Landing page + concept tree
- [ ] Unit Testing Fundamentals
- [ ] xUnit & NUnit (.NET)
- [ ] Jest & React Testing Library
- [ ] Mocking & Dependency Isolation
- [ ] Integration Testing (ASP.NET)
- [ ] E2E Testing with Playwright
- [ ] Test-Driven Development
- [ ] Code Coverage & Quality Gates
- [ ] API & Contract Testing
- [ ] Performance & Load Testing

## Phase 9: System Design (`system-design`) — 10 articles
- [x] Landing page + concept tree
- [ ] Scalability (Vertical vs Horizontal)
- [ ] Load Balancers & Reverse Proxies
- [ ] Caching Strategies
- [ ] Database Sharding & Replication
- [ ] Message Queues & Pub/Sub
- [ ] Rate Limiting & Throttling
- [ ] CDN & Edge Computing
- [ ] Authentication at Scale
- [ ] Database Indexing Deep Dive
- [ ] Designing for Failure

## Phase 10: AI & ML for Devs (`ai-ml`) — 10 articles
- [x] Landing page + concept tree
- [ ] Neural Networks Basics
- [ ] Embeddings & Vector Databases
- [ ] Transformer Architecture
- [ ] RAG (Retrieval-Augmented Generation)
- [ ] Fine-Tuning vs Prompt Engineering
- [ ] AI Agents & Tool Use
- [ ] Tokenization & Context Windows
- [ ] Model Serving & Inference
- [ ] LangChain / Semantic Kernel
- [ ] Responsible AI & Evaluation
