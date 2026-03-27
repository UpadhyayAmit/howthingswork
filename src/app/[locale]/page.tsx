"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import Card from "../_components/Card";
import { routing } from "@/i18n/routing";

const categoryMeta = [
  {
    key: "react",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="2.5" />
        <ellipse cx="12" cy="12" rx="10" ry="4" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
      </svg>
    ),
    color: "from-cyan-500/20 to-cyan-600/5",
    iconColor: "text-cyan-400",
    borderHover: "hover:border-cyan-500/40",
    glowColor: "hover:shadow-[0_0_50px_rgba(6,182,212,0.12)]",
    slug: "react",
    articles: 20,
  },
  {
    key: "javascript",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
        <rect x="4" y="3" width="16" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 12v5M14 12c2 0 2 5 0 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: "from-yellow-500/20 to-yellow-600/5",
    iconColor: "text-yellow-400",
    borderHover: "hover:border-yellow-500/40",
    glowColor: "hover:shadow-[0_0_50px_rgba(234,179,8,0.12)]",
    slug: "javascript",
    articles: 10,
  },
  {
    key: "csharp",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
        <path d="M6.5 15.5l-2-3.5 2-3.5h4l2 3.5-2 3.5h-4z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 10h4M14 12h4M14 14h2" strokeLinecap="round" />
        <rect x="2" y="4" width="20" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: "from-purple-500/20 to-purple-600/5",
    iconColor: "text-purple-400",
    borderHover: "hover:border-purple-500/40",
    glowColor: "hover:shadow-[0_0_50px_rgba(168,85,247,0.12)]",
    slug: "csharp-clr",
    articles: 10,
  },
  {
    key: "aspnet",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: "from-blue-500/20 to-blue-600/5",
    iconColor: "text-blue-400",
    borderHover: "hover:border-blue-500/40",
    glowColor: "hover:shadow-[0_0_50px_rgba(59,130,246,0.12)]",
    slug: "aspnet-core",
    articles: 10,
  },
  {
    key: "ef",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
        <path d="M4 6h16M4 10h16M4 14h16M4 18h16M8 6v12M16 6v12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: "from-amber-500/20 to-amber-600/5",
    iconColor: "text-amber-400",
    borderHover: "hover:border-amber-500/40",
    glowColor: "hover:shadow-[0_0_50px_rgba(245,158,11,0.12)]",
    slug: "entity-framework",
    articles: 8,
  },
  {
    key: "azure",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: "from-sky-500/20 to-sky-600/5",
    iconColor: "text-sky-400",
    borderHover: "hover:border-sky-500/40",
    glowColor: "hover:shadow-[0_0_50px_rgba(14,165,233,0.12)]",
    slug: "azure",
    articles: 10,
  },
  {
    key: "architecture",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4M9 9h.01M15 9h.01M9 13h.01M15 13h.01" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: "from-emerald-500/20 to-emerald-600/5",
    iconColor: "text-emerald-400",
    borderHover: "hover:border-emerald-500/40",
    glowColor: "hover:shadow-[0_0_50px_rgba(16,185,129,0.12)]",
    slug: "architecture",
    articles: 10,
  },
  {
    key: "microservices",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
        <path d="M5 12h14M12 5v14M7.5 7.5l9 9M16.5 7.5l-9 9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: "from-rose-500/20 to-rose-600/5",
    iconColor: "text-rose-400",
    borderHover: "hover:border-rose-500/40",
    glowColor: "hover:shadow-[0_0_50px_rgba(244,63,94,0.12)]",
    slug: "microservices",
    articles: 10,
  },
  {
    key: "testing",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
        <path d="M9 12l2 2 4-4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: "from-lime-500/20 to-lime-600/5",
    iconColor: "text-lime-400",
    borderHover: "hover:border-lime-500/40",
    glowColor: "hover:shadow-[0_0_50px_rgba(132,204,22,0.12)]",
    slug: "testing",
    articles: 10,
  },
  {
    key: "systemdesign",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: "from-orange-500/20 to-orange-600/5",
    iconColor: "text-orange-400",
    borderHover: "hover:border-orange-500/40",
    glowColor: "hover:shadow-[0_0_50px_rgba(249,115,22,0.12)]",
    slug: "system-design",
    articles: 10,
  },
  {
    key: "aiml",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
        <path d="M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4zM6 20v-1a6 6 0 0112 0v1M9 14l-3 6M15 14l3 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: "from-violet-500/20 to-violet-600/5",
    iconColor: "text-violet-400",
    borderHover: "hover:border-violet-500/40",
    glowColor: "hover:shadow-[0_0_50px_rgba(139,92,246,0.12)]",
    slug: "ai-ml",
    articles: 10,
  },
];

export default function HomePage() {
  const t = useTranslations("home");
  const locale = useLocale();

  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;

  const titleText = t("title");
  const highlightWord = t("highlight");
  const parts = titleText.split(highlightWord);

  return (
    <div className="max-w-5xl mx-auto py-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-16"
      >
        <h1
          className="text-5xl md:text-6xl font-extrabold mb-4 tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {parts[0]}
          <span className="gradient-text">{highlightWord}</span>
          {parts[1] || ""}
        </h1>
        <p className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          {t("subtitle")}
        </p>

        {/* Decorative gradient line */}
        <div className="mt-8 mx-auto w-48 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      </motion.div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {categoryMeta.map((cat, i) => (
          <motion.div
            key={cat.slug}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link href={`${prefix}/${cat.slug}`}>
              <Card
                glow
                className={`h-full cursor-pointer group ${cat.borderHover} ${cat.glowColor}`}
              >
                {/* Icon + article count */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cat.color} border border-white/5 flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
                  >
                    <span className={cat.iconColor}>{cat.icon}</span>
                  </div>
                  <span className="text-xs text-text-muted font-mono">{cat.articles} topics</span>
                </div>
                <h3
                  className="text-lg font-bold mb-2 text-text-primary group-hover:text-white transition-colors"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {t(`${cat.key}Title`)}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {t(`${cat.key}Desc`)}
                </p>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Coming Soon */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-16 text-center"
      >
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-elevated border border-border text-text-secondary text-sm">
          <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
          {t("comingSoon")}
        </span>
      </motion.div>
    </div>
  );
}
