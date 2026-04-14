'use client';

import Image from 'next/image';

const TRACK_LINKS = [
  { href: 'https://aiwisdom.dev/ai-architecture', label: 'AI Architecture' },
  { href: 'https://aiwisdom.dev/engineering', label: 'Engineering' },
  { href: 'https://aiwisdom.dev/models', label: 'Models' },
  { href: 'https://aiwisdom.dev/experiments', label: 'Experiments' },
  { href: 'https://aiwisdom.dev/knowledge-hub', label: 'Knowledge Hub' },
] as const;

const SOCIAL_LINKS = [
  {
    href: 'https://github.com/UpadhyayAmit',
    label: 'GitHub',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
  },
  {
    href: 'https://www.linkedin.com/in/amitupadhyay-ai/',
    label: 'LinkedIn',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    href: 'https://x.com/amitupadhyay_ai',
    label: 'X / Twitter',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    href: 'https://amitupadhyay.com',
    label: 'Personal Site',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
    ),
  },
] as const;

const SECTION_LABEL: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: 'rgba(255,255,255,0.3)',
  marginBottom: '1rem',
};

export default function SharedFooter() {
  return (
    <footer
      style={{
        position: 'relative',
        flexShrink: 0,
        background: 'linear-gradient(180deg, rgba(11,15,25,0) 0%, rgba(11,15,25,0.95) 20%, #0a0d16 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99,102,241,0.10) 0%, transparent 70%), radial-gradient(ellipse 30% 30% at 80% 50%, rgba(251,146,60,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Gradient top border */}
      <div
        aria-hidden="true"
        style={{
          height: '1px',
          background:
            'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.4) 25%, rgba(192,132,252,0.5) 50%, rgba(251,146,60,0.4) 75%, transparent 100%)',
        }}
      />

      <div style={{ position: 'relative', maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem 2rem' }}>
        {/* Main grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.8fr) minmax(0,1fr) minmax(0,1fr)',
            gap: '3rem',
          }}
          className="footer-grid"
        >
          {/* ── Brand column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <a
              href="https://aiwisdom.dev"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', marginBottom: '1rem' }}
            >
              {/* Logo with subtle glow ring */}
              <div
                style={{
                  position: 'relative',
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 0 0 4px rgba(99,102,241,0.08), 0 4px 20px rgba(99,102,241,0.12)',
                }}
              >
                <Image src="/aiwisdom_icon.png" alt="AI Wisdom logo" width={38} height={38} style={{ objectFit: 'contain' }} priority />
              </div>
              <div>
                <div
                  style={{
                    background: 'linear-gradient(90deg, #a5b4fc 0%, #c084fc 50%, #fb923c 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontSize: '18px',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1,
                  }}
                >
                  AI Wisdom
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px', letterSpacing: '0.02em' }}>aiwisdom.dev</div>
              </div>
            </a>

            <p
              style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.38)',
                lineHeight: 1.8,
                maxWidth: '280px',
                marginBottom: '1.5rem',
              }}
            >
              AI architecture patterns, engineering guides, model evaluations, and hands-on experiments.
            </p>

            <a
              href="https://aiwisdom.dev/start-here"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#a5b4fc',
                textDecoration: 'none',
                background: 'rgba(165,180,252,0.08)',
                border: '1px solid rgba(165,180,252,0.18)',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                width: 'fit-content',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(165,180,252,0.14)';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(165,180,252,0.35)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(165,180,252,0.08)';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(165,180,252,0.18)';
              }}
            >
              Explore AI Wisdom
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </a>
          </div>

          {/* ── Knowledge Tracks column ── */}
          <div>
            <h4 style={SECTION_LABEL}>Knowledge Tracks</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {TRACK_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.45)',
                      textDecoration: 'none',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.9)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.45)')}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: 'rgba(165,180,252,0.5)',
                        flexShrink: 0,
                      }}
                    />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Connect column ── */}
          <div>
            <h4 style={SECTION_LABEL}>Connect</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.4)',
                    textDecoration: 'none',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.9)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.4)')}
                >
                  {s.icon}
                  <span>{s.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            marginTop: '2.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Image src="/aiwisdom_icon.png" alt="" width={16} height={16} aria-hidden="true" style={{ opacity: 0.4, objectFit: 'contain' }} />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.22)' }}>© {new Date().getFullYear()} AI Wisdom · aiwisdom.dev</span>
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.04em' }}>Built with curiosity &amp; code</span>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}
