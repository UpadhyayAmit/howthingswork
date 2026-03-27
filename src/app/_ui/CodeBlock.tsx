"use client";

import { useState, useCallback } from "react";
import { Highlight, themes, type Language } from "prism-react-renderer";

interface CodeBlockProps {
  code: string;
  label?: string;
  language?: Language;
}

export default function CodeBlock({
  code,
  label,
  language = "tsx",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-[#0d1117]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-border">
        <div className="flex items-center gap-3">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          {label && (
            <span className="text-xs font-mono text-[#8b949e] tracking-wide">
              {label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Language badge */}
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#8b949e] bg-[#21262d] px-2 py-0.5 rounded">
            {language}
          </span>
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-mono text-[#8b949e] hover:text-[#c9d1d9] transition-colors px-2 py-0.5 rounded hover:bg-[#21262d]"
            aria-label="Copy code"
          >
            {copied ? (
              <>
                <CheckIcon />
                <span className="text-[#3fb950]">Copied!</span>
              </>
            ) : (
              <>
                <CopyIcon />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code body */}
      <Highlight
        theme={{
          ...themes.vsDark,
          plain: { color: "#c9d1d9", backgroundColor: "#0d1117" },
        }}
        code={code.trim()}
        language={language}
      >
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${className} overflow-x-auto p-4 text-sm leading-relaxed m-0`}
            style={{ ...style, backgroundColor: "#0d1117" }}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })} className="table-row">
                {/* Line number */}
                <span className="table-cell pr-4 text-right text-[#484f58] select-none w-8 text-xs leading-relaxed">
                  {i + 1}
                </span>
                {/* Line content */}
                <span className="table-cell">
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
