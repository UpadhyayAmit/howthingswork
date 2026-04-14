'use client';

/**
 * SharedFooter — Cross-promo footer section linking back to aiwisdom.dev
 */

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
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
  },
  {
    href: 'https://www.linkedin.com/in/amitupadhyay-ai/',
    label: 'LinkedIn',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    href: 'https://x.com/amitupadhyayai',
    label: 'X / Twitter',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
] as const;

export default function SharedFooter() {
  return (
    <section
      style={{
        background: 'linear-gradient(180deg, transparent 0%, rgba(79,70,229,0.06) 100%)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '3.5rem 1.5rem',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '2.5rem',
        }}
      >
        {/* Brand + CTA */}
        <div>
          <a href="https://aiwisdom.dev" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <span
              style={{
                display: 'inline-block',
                background: 'linear-gradient(90deg, #a5b4fc, #c084fc, #fb923c)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontSize: '20px',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                marginBottom: '0.75rem',
              }}
            >
              AI Wisdom
            </span>
          </a>
          <p
            style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.4)',
              lineHeight: 1.75,
              marginBottom: '1.25rem',
              maxWidth: '260px',
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
              gap: '0.4rem',
              fontSize: '13px',
              fontWeight: 600,
              color: '#a5b4fc',
              textDecoration: 'none',
              borderBottom: '1px solid rgba(165,180,252,0.3)',
              paddingBottom: '2px',
            }}
          >
            Explore AI Wisdom
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        </div>

        {/* Knowledge tracks */}
        <div>
          <h4
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.4)',
              marginBottom: '1rem',
            }}
          >
            Knowledge tracks
          </h4>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
            }}
          >
            {TRACK_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.5)',
                    textDecoration: 'none',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.9)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.5)')}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '2.5rem auto 0',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>© {new Date().getFullYear()} AI Wisdom · aiwisdom.dev</span>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {SOCIAL_LINKS.map((s) => (
            <a
              key={s.href}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              style={{
                color: 'rgba(255,255,255,0.35)',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.85)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.35)')}
            >
              {s.icon}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
