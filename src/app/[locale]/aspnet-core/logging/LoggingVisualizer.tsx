"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/app/_ui/Button";
import Panel from "@/app/_ui/Panel";

type LogLevel = "Trace" | "Debug" | "Information" | "Warning" | "Error" | "Critical";

interface LogEvent {
  id: number;
  level: LogLevel;
  template: string;
  properties: Record<string, string | number>;
  eventId: number;
  timestamp: string;
  category: string;
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  Trace: 0,
  Debug: 1,
  Information: 2,
  Warning: 3,
  Error: 4,
  Critical: 5,
};

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  Trace: "#6b7280",
  Debug: "#8b5cf6",
  Information: "#3b82f6",
  Warning: "#f59e0b",
  Error: "#ef4444",
  Critical: "#dc2626",
};

const SAMPLE_EVENTS: LogEvent[] = [
  {
    id: 1,
    level: "Information",
    template: "User {UserId} logged in from {IpAddress}",
    properties: { UserId: 42, IpAddress: "10.0.0.1" },
    eventId: 1001,
    timestamp: "14:23:01.442",
    category: "AuthController",
  },
  {
    id: 2,
    level: "Debug",
    template: "Cache miss for key {CacheKey}, fetching from database",
    properties: { CacheKey: "user:42:profile" },
    eventId: 2001,
    timestamp: "14:23:01.489",
    category: "CacheService",
  },
  {
    id: 3,
    level: "Warning",
    template: "Request to {Endpoint} took {ElapsedMs}ms, exceeding threshold of {ThresholdMs}ms",
    properties: { Endpoint: "/api/orders", ElapsedMs: 1843, ThresholdMs: 500 },
    eventId: 3001,
    timestamp: "14:23:02.334",
    category: "PerformanceMiddleware",
  },
  {
    id: 4,
    level: "Error",
    template: "Failed to process order {OrderId} for user {UserId}: {ExceptionMessage}",
    properties: { OrderId: "ORD-8821", UserId: 42, ExceptionMessage: "Timeout waiting for payment gateway" },
    eventId: 4001,
    timestamp: "14:23:03.101",
    category: "OrderService",
  },
  {
    id: 5,
    level: "Trace",
    template: "Entering method {MethodName} with args {Args}",
    properties: { MethodName: "ProcessPayment", Args: "{ amount: 99.99 }" },
    eventId: 5001,
    timestamp: "14:23:03.108",
    category: "PaymentService",
  },
  {
    id: 6,
    level: "Critical",
    template: "Database connection pool exhausted — {ActiveConnections}/{MaxConnections} connections in use",
    properties: { ActiveConnections: 100, MaxConnections: 100 },
    eventId: 6001,
    timestamp: "14:23:05.001",
    category: "DbConnectionPool",
  },
];

interface SinkConfig {
  name: string;
  minLevel: LogLevel;
  color: string;
  description: string;
}

const SINKS: SinkConfig[] = [
  { name: "Console", minLevel: "Information", color: "#6b7280", description: "stdout (local dev)" },
  { name: "Seq", minLevel: "Debug", color: "#3b82f6", description: "structured log server" },
  { name: "App Insights", minLevel: "Warning", color: "#f59e0b", description: "Azure telemetry" },
  { name: "OpenTelemetry", minLevel: "Error", color: "#10b981", description: "OTLP export" },
];

let _idCounter = 100;

function interpolate(template: string, props: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(props[key] ?? `{${key}}`));
}

export default function LoggingVisualizer() {
  const [minLevel, setMinLevel] = useState<LogLevel>("Information");
  const [activeEvent, setActiveEvent] = useState<LogEvent | null>(null);
  const [showStructured, setShowStructured] = useState(true);
  const [firedEvents, setFiredEvents] = useState<number[]>([]);

  const fireEvent = useCallback((event: LogEvent) => {
    setActiveEvent(event);
    setFiredEvents((prev) => [...prev.slice(-10), event.id]);
  }, []);

  const eventReachesSink = (event: LogEvent, sink: SinkConfig) => {
    return (
      LOG_LEVEL_ORDER[event.level] >= LOG_LEVEL_ORDER[minLevel] &&
      LOG_LEVEL_ORDER[event.level] >= LOG_LEVEL_ORDER[sink.minLevel]
    );
  };

  const levelPasses = (event: LogEvent) =>
    LOG_LEVEL_ORDER[event.level] >= LOG_LEVEL_ORDER[minLevel];

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-elevated border border-border rounded-xl">
        <span className="text-text-secondary text-[11px] uppercase tracking-widest mr-1">Min Log Level:</span>
        {(Object.keys(LOG_LEVEL_ORDER) as LogLevel[]).map((level) => (
          <button
            key={level}
            onClick={() => setMinLevel(level)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold transition-all border"
            style={{
              background: minLevel === level ? LOG_LEVEL_COLORS[level] + "22" : "transparent",
              borderColor: minLevel === level ? LOG_LEVEL_COLORS[level] : "#333",
              color: minLevel === level ? LOG_LEVEL_COLORS[level] : "#6b7280",
            }}
          >
            {level}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowStructured((v) => !v)}
            className="px-3 py-1.5 rounded-lg text-[11px] border transition-all"
            style={{
              borderColor: showStructured ? "#3b82f6" : "#333",
              color: showStructured ? "#3b82f6" : "#6b7280",
              background: showStructured ? "#3b82f622" : "transparent",
            }}
          >
            {showStructured ? "Structured" : "Interpolated"}
          </button>
        </div>
      </div>

      {/* Main pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Log source */}
        <Panel title="Log Source — Code" accentColor="#3b82f6">
          <div className="space-y-2">
            <div className="text-[10px] text-text-secondary mb-3 leading-relaxed">
              Click an event to send it through the pipeline
            </div>
            {SAMPLE_EVENTS.map((event) => (
              <motion.button
                key={event.id}
                onClick={() => fireEvent(event)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full text-left p-3 rounded-lg border transition-all"
                style={{
                  borderColor: activeEvent?.id === event.id ? LOG_LEVEL_COLORS[event.level] : "#333",
                  background: activeEvent?.id === event.id ? LOG_LEVEL_COLORS[event.level] + "11" : "#1a1a1a",
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                    style={{
                      background: LOG_LEVEL_COLORS[event.level] + "22",
                      color: LOG_LEVEL_COLORS[event.level],
                    }}
                  >
                    {event.level}
                  </span>
                  <span className="text-text-secondary text-[10px]">{event.category}</span>
                </div>
                <div
                  className="text-[10px] leading-relaxed"
                  style={{ color: "#d1d5db" }}
                >
                  {showStructured ? (
                    <span>
                      _logger.Log{event.level}(<br />
                      <span className="ml-2 text-[#86efac]">&quot;{event.template}&quot;</span>
                      {Object.entries(event.properties).map(([k, v]) => (
                        <span key={k}>, <span className="text-[#fbbf24]">{JSON.stringify(v)}</span></span>
                      ))}
                      );
                    </span>
                  ) : (
                    <span className="text-[#d1d5db]">
                      &quot;{interpolate(event.template, event.properties)}&quot;
                    </span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </Panel>

        {/* Middle: Log event object + level filter */}
        <Panel title="Log Event Object + Filter" accentColor="#3b82f6">
          <AnimatePresence mode="wait">
            {activeEvent ? (
              <motion.div
                key={activeEvent.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3"
              >
                {/* Structured event object */}
                <div className="rounded-lg border border-border p-3 bg-[#0d0d0d]">
                  <div className="text-[10px] text-text-secondary mb-2 uppercase tracking-widest">Log Event</div>
                  <div className="space-y-1 text-[11px]">
                    <div><span className="text-[#7c3aed]">EventId:</span> <span className="text-[#fbbf24]">{activeEvent.eventId}</span></div>
                    <div><span className="text-[#7c3aed]">Level:</span> <span style={{ color: LOG_LEVEL_COLORS[activeEvent.level] }}>{activeEvent.level}</span></div>
                    <div><span className="text-[#7c3aed]">Timestamp:</span> <span className="text-[#86efac]">{activeEvent.timestamp}</span></div>
                    <div><span className="text-[#7c3aed]">Category:</span> <span className="text-[#d1d5db]">{activeEvent.category}</span></div>
                    <div><span className="text-[#7c3aed]">MessageTemplate:</span></div>
                    <div className="ml-3 text-[#86efac] break-words">&quot;{activeEvent.template}&quot;</div>
                    <div><span className="text-[#7c3aed]">Properties:</span></div>
                    {Object.entries(activeEvent.properties).map(([k, v]) => (
                      <div key={k} className="ml-3">
                        <span className="text-[#60a5fa]">{k}</span>: <span className="text-[#fbbf24]">{JSON.stringify(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Level filter gate */}
                <div className="rounded-lg border p-3 text-center"
                  style={{
                    borderColor: levelPasses(activeEvent) ? "#22c55e" : "#ef4444",
                    background: levelPasses(activeEvent) ? "#22c55e11" : "#ef444411",
                  }}>
                  <div className="text-[10px] uppercase tracking-widest mb-1"
                    style={{ color: levelPasses(activeEvent) ? "#22c55e" : "#ef4444" }}>
                    Level Filter (MinLevel: {minLevel})
                  </div>
                  <div className="text-[11px]" style={{ color: levelPasses(activeEvent) ? "#22c55e" : "#ef4444" }}>
                    {LOG_LEVEL_ORDER[activeEvent.level]} &ge; {LOG_LEVEL_ORDER[minLevel]} → {levelPasses(activeEvent) ? "PASS" : "FILTERED OUT"}
                  </div>
                </div>

                {/* Structured vs string comparison */}
                {!showStructured && (
                  <div className="rounded-lg border border-[#f59e0b33] p-3 bg-[#f59e0b08]">
                    <div className="text-[9px] text-[#f59e0b] uppercase tracking-widest mb-1">Warning: String Interpolation</div>
                    <div className="text-[10px] text-text-secondary leading-relaxed">
                      String interpolation allocates memory even when the log level is filtered. Structured templates avoid this.
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center h-48 text-text-secondary text-[11px]"
              >
                Click a log event on the left
              </motion.div>
            )}
          </AnimatePresence>
        </Panel>

        {/* Right: Sinks */}
        <Panel title="Sinks (Output Targets)" accentColor="#3b82f6">
          <div className="space-y-3">
            {SINKS.map((sink) => {
              const reaches = activeEvent ? eventReachesSink(activeEvent, sink) : null;
              return (
                <motion.div
                  key={sink.name}
                  animate={{
                    borderColor: reaches === true ? sink.color : reaches === false ? "#44444466" : "#333",
                    opacity: reaches === false ? 0.4 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className="rounded-lg border p-3"
                  style={{ background: "#1a1a1a" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: sink.color }} />
                      <span className="font-bold text-[11px]" style={{ color: sink.color }}>{sink.name}</span>
                    </div>
                    <span className="text-[9px] text-text-secondary">min: {sink.minLevel}</span>
                  </div>
                  <div className="text-[10px] text-text-secondary mb-2">{sink.description}</div>
                  {activeEvent && (
                    <AnimatePresence>
                      {reaches ? (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-[10px] rounded p-2 mt-1"
                          style={{ background: sink.color + "11", color: sink.color }}
                        >
                          WRITING: [{activeEvent.timestamp}] [{activeEvent.level}] {activeEvent.category} — {interpolate(activeEvent.template, activeEvent.properties).slice(0, 50)}{activeEvent.template.length > 50 ? "…" : ""}
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-[10px] text-[#444] italic"
                        >
                          filtered (level below {sink.minLevel})
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </motion.div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Structured vs interpolated explainer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-[#ef444433] bg-[#ef444408]">
          <div className="text-[10px] uppercase tracking-widest text-[#ef4444] mb-2">Bad — String Interpolation</div>
          <code className="text-[11px] text-[#fca5a5] leading-relaxed block">
            _logger.LogInformation(<br />
            &nbsp;&nbsp;<span className="text-[#ef4444]">$&quot;User {"{userId}"} logged in&quot;</span><br />
            );
          </code>
          <div className="text-[10px] text-text-secondary mt-2 leading-relaxed">
            String is allocated even if Information is filtered. You lose structured properties — logs become unsearchable strings.
          </div>
        </div>
        <div className="p-4 rounded-xl border border-[#22c55e33] bg-[#22c55e08]">
          <div className="text-[10px] uppercase tracking-widest text-[#22c55e] mb-2">Good — Message Template</div>
          <code className="text-[11px] text-[#86efac] leading-relaxed block">
            _logger.LogInformation(<br />
            &nbsp;&nbsp;<span className="text-[#22c55e]">&quot;User &#123;UserId&#125; logged in&quot;</span>,<br />
            &nbsp;&nbsp;<span className="text-[#fbbf24]">userId</span><br />
            );
          </code>
          <div className="text-[10px] text-text-secondary mt-2 leading-relaxed">
            Template is a constant. UserId is stored as a structured property — searchable, indexable, zero allocation when filtered.
          </div>
        </div>
      </div>
    </div>
  );
}
