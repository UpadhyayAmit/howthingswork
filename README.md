# How Things Work

A visual, interactive encyclopedia that explains how technologies work internally — deployed at [howthingswork.aiwisdom.dev](https://howthingswork.aiwisdom.dev).

## What is this?

How Things Work uses animated diagrams, step-through visualizations, and interactive code editors to explain the internals of technologies that developers use every day but rarely see inside.

Current topics include React Fiber, React Hooks, Azure Functions, .NET Garbage Collection, and JIT Compilation — with many more planned.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Diagrams | React Flow (@xyflow/react) |
| Code Editor | Monaco Editor |
| State (demos) | Zustand |
| Content | MDX |
| Deployment | Vercel |

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                  # Root layout with sidebar + topbar
│   ├── page.tsx                    # Home page
│   ├── react/
│   │   ├── page.tsx                # React overview
│   │   ├── fiber-visualizer/       # Fiber tree DFS traversal
│   │   └── hooks-visualizer/       # Hooks linked list + re-render cycle
│   ├── azure-functions/
│   │   ├── page.tsx                # Azure Functions overview
│   │   └── lifecycle-visualizer/   # Trigger → Binding → Execution flow
│   ├── csharp-clr/
│   │   ├── page.tsx                # CLR overview
│   │   ├── gc-visualizer/          # Generational GC simulation
│   │   └── jit-visualizer/         # IL → Native compilation pipeline
│   ├── _components/                # Layout components (Sidebar, Topbar, Card)
│   ├── _ui/                        # Reusable UI primitives (Button, Panel, Section)
│   ├── _editor/                    # Monaco Editor wrapper
│   ├── _diagrams/                  # React Flow wrapper
│   └── _animations/                # Framer Motion wrappers
├── lib/                            # Utilities, constants, theme
├── styles/                         # Global CSS + theme variables
└── data/                           # MDX content files
```

## Running Locally

```bash
# Clone the repository
git clone https://github.com/UpadhyayAmit/howthingswork.git
cd howthingswork

# Install dependencies
npm install

# Start the development server
npm run dev

# Open http://localhost:3000
```

## Deploying to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Vercel auto-detects Next.js — no configuration needed
4. Click **Deploy**

Or use the Vercel CLI:

```bash
npx vercel
```

## Current Visualizers

### React Internals
- **Fiber Visualizer** — Animated depth-first traversal of the React Fiber tree
- **Hooks Visualizer** — Hook linked list, state queue, and re-render cycle

### Azure Functions
- **Lifecycle Visualizer** — Step-through execution pipeline from trigger to response

### C# / CLR
- **GC Visualizer** — Generational garbage collection with mark, sweep, promote, compact
- **JIT Visualizer** — C# source → IL → native code compilation pipeline

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned topics and features.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/event-loop-visualizer`
3. Follow existing patterns — each visualizer is a client component in its own route folder
4. Ensure your visualizer has:
   - A step-through state machine
   - Framer Motion animations
   - Clean TypeScript types
5. Submit a pull request

## Design System

- **Theme**: Dark background (#0D0D0D) with Electric Purple (#A855F7) accents
- **Typography**: Inter for UI, JetBrains Mono for code
- **Components**: All UI primitives are in `src/app/_ui/`

## License

ISC
