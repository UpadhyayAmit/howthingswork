"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useCallback } from "react";

interface CodeEditorProps {
  value: string;
  language?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
}

export default function CodeEditor({
  value,
  language = "typescript",
  onChange,
  readOnly = false,
  height = "300px",
}: CodeEditorProps) {
  const handleMount: OnMount = useCallback((editor) => {
    editor.updateOptions({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', monospace",
      lineNumbers: "on",
      roundedSelection: true,
      padding: { top: 12 },
    });
  }, []);

  return (
    <div className="border border-border rounded-[10px] overflow-hidden">
      <div className="px-3 py-2 bg-elevated border-b border-border flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28CA41]" />
        </div>
        <span className="text-xs text-text-secondary ml-2">{language}</span>
      </div>
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={(val) => onChange?.(val ?? "")}
        theme="vs-dark"
        onMount={handleMount}
        options={{ readOnly }}
      />
    </div>
  );
}
