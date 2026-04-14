'use client';

import { useState } from 'react';

/**
 * Fixed bottom-right badge linking to aiwisdom.dev.
 * Collapses to a 44px icon circle; expands on hover to reveal tagline + CTA.
 */
export default function AiWisdomBadge() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
    >
      <a
        href="https://aiwisdom.dev"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit AI Wisdom"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          width: hovered ? 218 : 44,
          height: 44,
          borderRadius: 22,
          background: 'linear-gradient(135deg, #0f172a 0%, #1a1040 100%)',
          border: `1.5px solid ${hovered ? 'rgba(139,92,246,0.55)' : 'rgba(255,255,255,0.1)'}`,
          boxShadow: hovered ? '0 8px 32px rgba(139,92,246,0.3), 0 2px 8px rgba(0,0,0,0.6)' : '0 4px 20px rgba(0,0,0,0.45)',
          transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1), border-color 0.3s, box-shadow 0.3s',
          textDecoration: 'none',
          cursor: 'pointer',
          padding: '0 8px',
          gap: 10,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {/* Icon — always visible */}
        <img
          src="/aiwisdom_icon.png"
          alt=""
          style={{
            width: 28,
            height: 28,
            objectFit: 'contain',
            flexShrink: 0,
          }}
        />

        {/* Text — fades + slides in on hover */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            opacity: hovered ? 1 : 0,
            transform: hovered ? 'translateX(0)' : 'translateX(-6px)',
            transition: 'opacity 0.2s ease 0.08s, transform 0.2s ease 0.08s',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.2,
              letterSpacing: '0.03em',
            }}
          >
            AI Wisdom
          </span>
          <span
            style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.3,
            }}
          >
            Architecture &amp; guides ↗
          </span>
        </div>
      </a>
    </div>
  );
}
