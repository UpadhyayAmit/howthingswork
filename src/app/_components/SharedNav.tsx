'use client';

/**
 * SharedNav — Thin top bar linking back to aiwisdom.dev
 * Placed above the main app layout so it spans full width.
 */

interface SharedNavProps {
  currentSite?: string;
  homeURL?: string;
}

export default function SharedNav({ currentSite, homeURL = 'https://aiwisdom.dev' }: SharedNavProps) {
  return (
    <div
      style={{
        width: '100%',
        background: 'linear-gradient(90deg, #18182a 0%, #1c1c30 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        zIndex: 200,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 1.5rem',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left — brand wordmark */}
        <a
          href={homeURL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            textDecoration: 'none',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ opacity: 0.7 }}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span
            style={{
              background: 'linear-gradient(90deg, #a5b4fc, #c084fc, #fb923c)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 700,
            }}
          >
            AI Wisdom
          </span>
        </a>

        {/* Right — current site label */}
        {currentSite && (
          <span
            style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.06em',
            }}
          >
            Part of{' '}
            <a
              href={homeURL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'rgba(255,255,255,0.55)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              aiwisdom.dev
            </a>
          </span>
        )}
      </div>
    </div>
  );
}
