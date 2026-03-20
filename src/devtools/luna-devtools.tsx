'use client';

/**
 * devtools/luna-devtools.tsx
 *
 * Bottom-fixed dev pill for scrubbing the lunar cycle.
 * Mirrors SolarDevTools exactly — same open/close pattern, same portal,
 * same slider mechanics — but scrubs 0–29.53 days instead of 0–1439 minutes.
 *
 * The gradient track shows the full lunar cycle:
 *   black (new) → dark blue → silver-blue peak (full) → dark blue → black (new)
 *
 * Usage (dev-only):
 *   import { LunaDevTools } from '@circadian/luna/devtools'
 *   {process.env.NODE_ENV === 'development' && <LunaDevTools />}
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LunarPhase } from '../hooks/useLunarPosition';
import { useLunaTheme } from '../provider/luna-theme-provider';
import { LUNAR_CYCLE_DAYS, buildLunaSliderGradient, formatAge, phaseForAge } from './timeline';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface LunaDevToolsProps {
  defaultOpen?: boolean;
  position?: 'bottom-left' | 'bottom-center' | 'bottom-right';
  enabled?: boolean;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const OPEN_KEY = 'luna-devtools-open';
const AGE_KEY = 'luna-devtools-age';
const LIVE_KEY = 'luna-devtools-live';

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

// ─── Component ────────────────────────────────────────────────────────────────

export function LunaDevTools({
  defaultOpen = false,
  position = 'bottom-left', // default left so it doesn't clash with SolarDevTools (bottom-center)
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

// ─── Inner ────────────────────────────────────────────────────────────────────

function DevToolsInner({
  defaultOpen,
  position,
}: {
  defaultOpen: boolean;
  position: 'bottom-left' | 'bottom-center' | 'bottom-right';
}) {
  const { setOverridePhase, setSimulatedDate, activeSkin, ageInDays: liveAge } = useLunaTheme();

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

  // ── Age / live state ───────────────────────────────────────────────────────
  const [ageInDays, setAgeInDays] = useState(liveAge);
  const [useLive, setUseLive] = useState(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: init-on-mount
  useEffect(() => {
    try {
      const storedLive = localStorage.getItem(LIVE_KEY);
      const storedAge = localStorage.getItem(AGE_KEY);
      if (storedLive === '0' && storedAge !== null) {
        const age = Number.parseFloat(storedAge);
        if (!Number.isNaN(age)) {
          setAgeInDays(age);
          setUseLive(false);
          // Simulate the date corresponding to this lunar age
          const ref = 947182440000; // reference new moon ms
          const cycleMs = LUNAR_CYCLE_DAYS * 24 * 60 * 60 * 1000;
          const d = new Date(ref + age * 24 * 60 * 60 * 1000);
          setSimulatedDate(d);
          return;
        }
      }
    } catch {}
    setAgeInDays(liveAge);
    setUseLive(true);
  }, []);

  // ── Phase from slider ──────────────────────────────────────────────────────
  const sliderPhase: LunarPhase = useLive ? phaseForAge(liveAge) : phaseForAge(ageInDays);

  useEffect(() => {
    setOverridePhase(sliderPhase);
  }, [sliderPhase, setOverridePhase]);

  // ── Go Live ────────────────────────────────────────────────────────────────
  const goLive = useCallback(() => {
    setUseLive(true);
    setAgeInDays(liveAge);
    setOverridePhase(null);
    setSimulatedDate(undefined);
    try {
      localStorage.setItem(LIVE_KEY, '1');
      localStorage.removeItem(AGE_KEY);
    } catch {}
  }, [liveAge, setOverridePhase, setSimulatedDate]);

  // ── Slider onChange ────────────────────────────────────────────────────────
  const handleSlider = useCallback(
    (val: number) => {
      setUseLive(false);
      setAgeInDays(val);
      try {
        localStorage.setItem(LIVE_KEY, '0');
        localStorage.setItem(AGE_KEY, String(val));
      } catch {}
      // Simulate a date for this lunar age
      const ref = 947182440000;
      const ageDays = val;
      // Find how many complete cycles fit before the reference date
      // then add ageDays to get a date with that lunar age
      const nowMs = Date.now();
      const cycleMs = LUNAR_CYCLE_DAYS * 24 * 60 * 60 * 1000;
      const elapsed = nowMs - ref;
      const cycles = Math.floor(elapsed / cycleMs);
      const d = new Date(ref + cycles * cycleMs + ageDays * 24 * 60 * 60 * 1000);
      setSimulatedDate(d);
    },
    [setSimulatedDate],
  );

  // ── Skin-aware gradient ────────────────────────────────────────────────────
  const gradient = useMemo(() => buildLunaSliderGradient(activeSkin.lunarPalettes), [activeSkin]);

  const currentPalette = activeSkin.lunarPalettes[sliderPhase];
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
            background: useLive ? '#22c55e' : '#f59e0b',
            flexShrink: 0,
          }}
        />
        <span style={{ textTransform: 'capitalize' }}>{sliderPhase.replace('-', ' ')}</span>
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
            background: useLive ? '#22c55e' : '#f59e0b',
            flexShrink: 0,
          }}
        />
        <span style={{ flex: 1, textAlign: 'left', textTransform: 'capitalize' }}>
          {sliderPhase.replace('-', ' ')}
        </span>
        <span style={{ fontSize: 11, opacity: 0.45 }}>▾ collapse</span>
      </button>

      {/* Body */}
      <div style={{ padding: 16 }}>
        {/* Top row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
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
            Lunar cycle
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!useLive && (
              <span style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                {formatAge(ageInDays)}
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    opacity: 0.55,
                    textTransform: 'capitalize',
                  }}
                >
                  · {sliderPhase.replace('-', ' ')}
                </span>
              </span>
            )}
            <button
              type="button"
              onClick={goLive}
              disabled={useLive}
              style={{
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 10,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontFamily: 'inherit',
                border: `1px solid ${useLive ? 'transparent' : 'rgba(255,255,255,0.10)'}`,
                background: useLive ? accent : 'rgba(255,255,255,0.06)',
                color: useLive ? '#000' : 'rgba(255,255,255,0.45)',
                cursor: useLive ? 'default' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {useLive ? '● Live' : 'Go Live'}
            </button>
          </div>
        </div>

        {/* Gradient track */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              height: 8,
              borderRadius: 9999,
              width: '100%',
              background: gradient,
              opacity: 0.65,
            }}
          />
          <input
            type="range"
            min={0}
            max={LUNAR_CYCLE_DAYS}
            step={0.1}
            value={ageInDays}
            onChange={(e) => handleSlider(Number(e.target.value))}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
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
              left: `${(ageInDays / LUNAR_CYCLE_DAYS) * 100}%`,
              transform: 'translate(-50%, -50%)',
              background: accent,
              boxShadow: `0 0 8px ${accent}, 0 2px 8px rgba(0,0,0,0.4)`,
              border: '2px solid rgba(255,255,255,0.5)',
              transition: 'background 0.6s, box-shadow 0.6s',
            }}
          />
        </div>

        {/* Phase markers */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          {['new', 'quarter', 'full', 'quarter', 'new'].map((label, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: static constant array
              key={i}
              style={{
                fontSize: 9,
                opacity: 0.35,
                textTransform: 'lowercase',
                letterSpacing: '0.04em',
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
