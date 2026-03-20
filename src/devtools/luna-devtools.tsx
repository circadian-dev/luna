'use client';

/**
 * devtools/luna-devtools.tsx
 *
 * Bottom-fixed dev panel for previewing lunar phases.
 *
 * Two independent controls (not one timeline slider):
 *
 *   Phase picker  — 8 buttons, one per lunar phase.
 *                   Selects which phase to preview. Controls palette,
 *                   illumination, and orb brightness. Monthly axis.
 *
 *   Arc slider    — 0–1 range. Moves the orb along tonight's arc.
 *                   0 = rising, 0.5 = zenith, 1 = setting. Daily axis.
 *                   Disabled when live (arc driven by real time).
 *
 * A single age-day scrubber was intentionally removed. Scrubbing days
 * fast-forwards through many daily cycles simultaneously, causing moonProgress
 * to oscillate and the orb to jump. The two-control design maps to the two
 * real axes cleanly.
 *
 * Usage (dev-only):
 *   import { LunaDevTools } from '@circadian/luna/devtools'
 *   {process.env.NODE_ENV === 'development' && <LunaDevTools />}
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LunarPhase } from '../hooks/useLunarPosition';
import { useLunaTheme } from '../provider/luna-theme-provider';
import { PHASES, simulatedDateForPhaseAndProgress } from './timeline';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface LunaDevToolsProps {
  defaultOpen?: boolean;
  position?: 'bottom-left' | 'bottom-center' | 'bottom-right';
  enabled?: boolean;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const OPEN_KEY = 'luna-devtools-open';
const PHASE_KEY = 'luna-devtools-phase';
const ARC_KEY = 'luna-devtools-arc';

function getStoredOpen(fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(OPEN_KEY);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch {}
  return fallback;
}

// ─── Position styles ──────────────────────────────────────────────────────────

const POSITION_STYLES: Record<string, React.CSSProperties> = {
  'bottom-left': { left: 16, right: 'auto' },
  'bottom-center': { left: '50%', transform: 'translateX(-50%)' },
  'bottom-right': { right: 16, left: 'auto' },
};

// ─── Phase display labels ─────────────────────────────────────────────────────

const PHASE_LABELS: Record<LunarPhase, string> = {
  new: 'new',
  'waxing-crescent': 'crescent ↑',
  'first-quarter': 'quarter ↑',
  'waxing-gibbous': 'gibbous ↑',
  full: 'full',
  'waning-gibbous': 'gibbous ↓',
  'last-quarter': 'quarter ↓',
  'waning-crescent': 'crescent ↓',
};

function arcLabel(p: number): string {
  if (p < 0.15) return 'rising';
  if (p > 0.85) return 'setting';
  if (p > 0.4 && p < 0.6) return 'zenith';
  return `${Math.round(p * 100)}%`;
}

// ─── LunaDevTools ─────────────────────────────────────────────────────────────

export function LunaDevTools({
  defaultOpen = false,
  position = 'bottom-left',
  enabled = true,
}: LunaDevToolsProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!enabled || !mounted) return null;
  return createPortal(
    <DevToolsInner defaultOpen={defaultOpen} position={position} />,
    document.body,
  );
}

// ─── DevToolsInner ────────────────────────────────────────────────────────────

function DevToolsInner({
  defaultOpen,
  position,
}: {
  defaultOpen: boolean;
  position: 'bottom-left' | 'bottom-center' | 'bottom-right';
}) {
  const { setOverridePhase, setSimulatedDate, activeSkin, phase: livePhase } = useLunaTheme();

  // ── Open state ─────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(() => getStoredOpen(defaultOpen));
  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(OPEN_KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
  }, []);

  // ── Phase pin — null means live ────────────────────────────────────────────
  const [pinnedPhase, setPinnedPhase] = useState<LunarPhase | null>(() => {
    try {
      const v = localStorage.getItem(PHASE_KEY);
      if (v && PHASES.includes(v as LunarPhase)) return v as LunarPhase;
    } catch {}
    return null;
  });

  // ── Arc progress — 0 rising, 0.5 zenith, 1 setting ────────────────────────
  const [arcProgress, setArcProgress] = useState<number>(() => {
    try {
      const v = localStorage.getItem(ARC_KEY);
      if (v !== null) {
        const n = Number.parseFloat(v);
        if (!Number.isNaN(n)) return Math.max(0, Math.min(1, n));
      }
    } catch {}
    return 0.5;
  });

  const isLive = pinnedPhase === null;
  const displayPhase = pinnedPhase ?? livePhase;

  // ── Sync simulated date → provider on every change ────────────────────────
  useEffect(() => {
    if (pinnedPhase === null) {
      setSimulatedDate(undefined);
      setOverridePhase(null);
      return;
    }
    setOverridePhase(pinnedPhase);
    setSimulatedDate(simulatedDateForPhaseAndProgress(pinnedPhase, arcProgress));
  }, [pinnedPhase, arcProgress, setSimulatedDate, setOverridePhase]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const selectPhase = useCallback((phase: LunarPhase) => {
    setPinnedPhase(phase);
    try {
      localStorage.setItem(PHASE_KEY, phase);
    } catch {}
  }, []);

  const handleArcChange = useCallback((val: number) => {
    setArcProgress(val);
    try {
      localStorage.setItem(ARC_KEY, String(val));
    } catch {}
  }, []);

  const goLive = useCallback(() => {
    setPinnedPhase(null);
    setArcProgress(0.5);
    setSimulatedDate(undefined);
    setOverridePhase(null);
    try {
      localStorage.removeItem(PHASE_KEY);
      localStorage.setItem(ARC_KEY, '0.5');
    } catch {}
  }, [setSimulatedDate, setOverridePhase]);

  // ── Palette for panel theming ──────────────────────────────────────────────
  const currentPalette = activeSkin.lunarPalettes[displayPhase];
  const accent = currentPalette.accentColor;
  const textColor = currentPalette.textPrimary;
  const bgColor = currentPalette.bg[1];
  const posStyles = POSITION_STYLES[position] ?? POSITION_STYLES['bottom-left'];

  // ── Collapsed pill ─────────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        type="button"
        onClick={toggleOpen}
        style={{
          position: 'fixed',
          bottom: 16,
          ...posStyles,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderRadius: 9999,
          border: '1px solid rgba(255,255,255,0.10)',
          background: bgColor,
          color: textColor,
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'inherit',
          cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
          transition: 'background 0.6s, color 0.6s',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isLive ? '#22c55e' : '#f59e0b',
            flexShrink: 0,
          }}
        />
        <span style={{ textTransform: 'capitalize' }}>{PHASE_LABELS[displayPhase]}</span>
      </button>
    );
  }

  // ── Expanded panel ─────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        ...posStyles,
        zIndex: 99999,
        width: 380,
        maxWidth: 'calc(100vw - 32px)',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.10)',
        background: bgColor,
        color: textColor,
        boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
        fontFamily: 'inherit',
        transition: 'background 0.6s, color 0.6s',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={toggleOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '12px 16px',
          background: 'none',
          border: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          color: 'inherit',
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isLive ? '#22c55e' : '#f59e0b',
            flexShrink: 0,
          }}
        />
        <span style={{ flex: 1, textAlign: 'left', textTransform: 'capitalize' }}>
          {PHASE_LABELS[displayPhase]}
        </span>
        <span style={{ fontSize: 11, opacity: 0.45 }}>▾ collapse</span>
      </button>

      {/* Body */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ── Phase picker ──────────────────────────────────────────────── */}
        <div>
          <div
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              opacity: 0.45,
              marginBottom: 8,
            }}
          >
            Phase
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 4,
            }}
          >
            {PHASES.map((phase) => {
              const isActive = pinnedPhase === phase;
              return (
                <button
                  key={phase}
                  type="button"
                  onClick={() => selectPhase(phase)}
                  style={{
                    padding: '6px 4px',
                    borderRadius: 7,
                    fontSize: 10,
                    fontFamily: 'inherit',
                    border: `1px solid ${isActive ? accent : 'rgba(255,255,255,0.08)'}`,
                    background: isActive ? `${accent}22` : 'rgba(255,255,255,0.04)',
                    color: isActive ? accent : 'rgba(255,255,255,0.45)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'center',
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {PHASE_LABELS[phase]}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Arc slider ────────────────────────────────────────────────── */}
        {/* Dimmed when live — arc is driven by real time, not scrubable */}
        <div style={{ opacity: isLive ? 0.35 : 1, transition: 'opacity 0.3s' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                opacity: 0.45,
              }}
            >
              Arc position
            </span>
            <span
              style={{
                fontSize: 11,
                opacity: 0.55,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {arcLabel(arcProgress)}
            </span>
          </div>

          <div style={{ position: 'relative' }}>
            <div
              style={{
                height: 8,
                borderRadius: 9999,
                width: '100%',
                background: `linear-gradient(90deg, rgba(255,255,255,0.05), ${accent}99, rgba(255,255,255,0.05))`,
                opacity: 0.65,
              }}
            />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={arcProgress}
              disabled={isLive}
              onChange={(e) => handleArcChange(Number(e.target.value))}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: isLive ? 'default' : 'pointer',
                margin: 0,
              }}
            />
            {/* Thumb */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                width: 16,
                height: 16,
                borderRadius: '50%',
                pointerEvents: 'none',
                left: `${arcProgress * 100}%`,
                transform: 'translate(-50%, -50%)',
                background: accent,
                boxShadow: `0 0 8px ${accent}, 0 2px 8px rgba(0,0,0,0.4)`,
                border: '2px solid rgba(255,255,255,0.5)',
                transition: 'background 0.6s, box-shadow 0.6s',
              }}
            />
          </div>

          {/* Track labels */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 6,
              fontSize: 9,
              opacity: 0.3,
            }}
          >
            <span>rising</span>
            <span>zenith</span>
            <span>setting</span>
          </div>
        </div>

        {/* ── Go Live ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={goLive}
            disabled={isLive}
            style={{
              padding: '5px 12px',
              borderRadius: 8,
              fontSize: 10,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontFamily: 'inherit',
              border: `1px solid ${isLive ? 'transparent' : 'rgba(255,255,255,0.10)'}`,
              background: isLive ? accent : 'rgba(255,255,255,0.06)',
              color: isLive ? '#000' : 'rgba(255,255,255,0.45)',
              cursor: isLive ? 'default' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {isLive ? '● Live' : 'Go Live'}
          </button>
        </div>
      </div>
    </div>
  );
}
