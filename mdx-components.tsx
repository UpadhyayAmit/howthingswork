import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold text-white mb-4">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl font-bold text-white mb-3 mt-8">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-semibold text-white mb-2 mt-6">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="text-[#A1A1AA] leading-relaxed mb-4">{children}</p>
    ),
    code: ({ children }) => (
      <code className="bg-[#1E1E1E] text-[#C084FC] px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg p-4 overflow-x-auto mb-4">
        {children}
      </pre>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside text-[#A1A1AA] mb-4 space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside text-[#A1A1AA] mb-4 space-y-1">
        {children}
      </ol>
    ),
    ...components,
  };
}
