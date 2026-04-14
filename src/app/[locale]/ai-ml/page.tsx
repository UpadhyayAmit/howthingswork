'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import MotionFade from '@/app/_animations/MotionFade';
import Card from '@/app/_components/Card';
import CategoryConceptTree, { type ConceptNode, type ConceptEdge } from '@/app/_ui/CategoryConceptTree';

const conceptNodes: ConceptNode[] = [
  { id: 'nn', label: 'Neural Nets', x: 0, y: 0, group: 'foundation', shape: 'hexagon' },
  { id: 'embeddings', label: 'Embeddings', x: 260, y: 0, group: 'foundation', shape: 'circle' },
  { id: 'transformers', label: 'Transformers', x: 520, y: 0, group: 'models', shape: 'hexagon' },
  { id: 'tokenization', label: 'Tokenization', x: 760, y: 0, group: 'preprocessing', shape: 'pill' },
  { id: 'rag', label: 'RAG', x: 100, y: 160, group: 'patterns', shape: 'diamond' },
  { id: 'fine-tuning', label: 'Fine-Tuning', x: 380, y: 160, group: 'training', shape: 'rounded' },
  { id: 'agents', label: 'AI Agents', x: 640, y: 160, group: 'patterns', shape: 'hexagon' },
  { id: 'serving', label: 'Model Serving', x: 100, y: 320, group: 'deployment', shape: 'pill' },
  { id: 'orchestration', label: 'Orchestration', x: 420, y: 320, group: 'frameworks', shape: 'diamond' },
  { id: 'responsible', label: 'Responsible AI', x: 700, y: 320, group: 'ethics', shape: 'circle' },
];

const conceptEdges: ConceptEdge[] = [
  { from: 'nn', to: 'embeddings', animated: true },
  { from: 'embeddings', to: 'transformers', animated: true },
  { from: 'transformers', to: 'tokenization' },
  { from: 'embeddings', to: 'rag' },
  { from: 'transformers', to: 'fine-tuning' },
  { from: 'transformers', to: 'agents' },
  { from: 'fine-tuning', to: 'serving' },
  { from: 'rag', to: 'orchestration' },
  { from: 'agents', to: 'orchestration' },
  { from: 'serving', to: 'responsible' },
  { from: 'orchestration', to: 'responsible' },
];

const groupColors: Record<string, string> = {
  foundation: '#8b5cf6',
  models: '#06b6d4',
  preprocessing: '#f59e0b',
  patterns: '#10b981',
  training: '#ec4899',
  deployment: '#3b82f6',
  frameworks: '#a855f7',
  ethics: '#ef4444',
};

const sections = [
  {
    heading: 'Foundations',
    badge: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    items: [
      {
        title: 'Neural Networks Basics',
        description: 'Neurons, layers, activation functions, forward & backward propagation.',
        href: '/ai-ml/neural-networks',
      },
      {
        title: 'Embeddings & Vector Databases',
        description: 'Text → vectors, similarity search, Pinecone, Qdrant, and pgvector.',
        href: '/ai-ml/embeddings',
      },
      {
        title: 'Transformer Architecture',
        description: 'Self-attention, positional encoding, and why LLMs work so well.',
        href: '/ai-ml/transformers',
      },
      {
        title: 'Tokenization & Context Windows',
        description: 'BPE, SentencePiece, token limits, and context management strategies.',
        href: '/ai-ml/tokenization',
      },
    ],
  },
  {
    heading: 'Patterns & Training',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    items: [
      { title: 'RAG Architecture', description: 'Chunking, retrieval, prompt assembly, reranking, and evaluation.', href: '/ai-ml/rag' },
      {
        title: 'Fine-Tuning vs Prompt Engineering',
        description: 'LoRA, QLoRA, few-shot, system prompts — when to use which.',
        href: '/ai-ml/fine-tuning',
      },
      { title: 'AI Agents & Tool Use', description: 'ReAct pattern, function calling, agent loops, and multi-agent systems.', href: '/ai-ml/agents' },
    ],
  },
  {
    heading: 'Deployment & Ethics',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    items: [
      {
        title: 'Model Serving & Inference',
        description: 'ONNX, quantization, batch inference, latency budgets, and GPU optimization.',
        href: '/ai-ml/model-serving',
      },
      {
        title: 'LangChain / Semantic Kernel',
        description: 'Orchestration frameworks, chains, memory, and tool integration.',
        href: '/ai-ml/orchestration',
      },
      {
        title: 'Responsible AI & Evaluation',
        description: 'Hallucination detection, bias, safety guardrails, and eval metrics.',
        href: '/ai-ml/responsible-ai',
      },
    ],
  },
];

export default function AiMlPage() {
  return (
    <MotionFade>
      <div className="max-w-6xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-3 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            AI & Machine Learning
          </h1>
          <p className="text-text-secondary max-w-2xl leading-relaxed">
            How AI systems work under the hood — from neural networks and transformers to RAG, agent patterns, and responsible deployment.
          </p>
        </div>
        <CategoryConceptTree
          nodes={conceptNodes}
          edges={conceptEdges}
          accentColor="#8b5cf6"
          groupColors={groupColors}
          title="AI/ML Concept Map"
          height={390}
          layoutConfig={{ ranksep: 48, nodesep: 52 }}
        />
        <div className="space-y-12">
          {sections.map((section, si) => (
            <motion.div key={section.heading} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.08 }}>
              <div className="flex items-center gap-3 mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${section.badge}`}>
                  {section.heading}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {section.items.map((v) => (
                  <Link key={v.href} href={v.href}>
                    <Card glow className="cursor-pointer h-full group">
                      <h3
                        className="text-[15px] font-semibold mb-1.5 text-text-primary group-hover:text-white transition-colors"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {v.title}
                      </h3>
                      <p className="text-[13px] text-text-secondary leading-relaxed">{v.description}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Cross-link to aiwisdom.dev */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: sections.length * 0.08 + 0.1 }}
          className="mt-14 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6 flex flex-col sm:flex-row sm:items-center gap-4"
        >
          <div className="flex-1">
            <h3 className="text-base font-semibold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              Go deeper on these concepts
            </h3>
            <p className="text-[13px] text-text-secondary leading-relaxed">
              AI Wisdom covers RAG pipelines, transformer internals, agent architecture, and production deployment patterns — written for engineers
              who build AI systems.
            </p>
          </div>
          <a
            href="https://aiwisdom.dev/ai-architecture"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-5 py-2.5 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20 hover:text-violet-200"
          >
            Explore on aiwisdom.dev
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </a>
        </motion.div>
      </div>
    </MotionFade>
  );
}
