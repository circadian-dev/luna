'use client';
// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/meridian/meridian.lunar.compact.tsx
// ════════════════════════════════════════════════════════════════════════════
/**
 * Meridian lunar compact widget.
 *
 * Three-row layout:
 *   Row 1 — phase label (lowercase, opacity 0.40) + illumination % (right)
 *   Row 2 — hairline track with precise dot + degree markings
 *   Row 3 — ↑ moonrise · (center divider line) · moonset ↓
 *
 * Track treatment: the same HairlineTrack aesthetic from meridian.compact.tsx
 * but with small degree tick marks at 0%, 25%, 50%, 75%, 100% — an
 * astronomical arc measurement motif. Orb is a small precise dot with a
 * stroke ring. No fill bar (too heavy for Meridian). No moon crescent
 * (the stroke-only phase icon above handles that semantic).
 *
 * No weather. No temperature. Purely lunar.
 */

import { motion } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import { type LunarPhase, useLunarPosition } from '../../hooks/useLunarPosition';
import type { CompactLunaWidgetProps } from '../types/luna-skin.types';
import { MERIDIAN_LUNAR_PALETTES, lerpMeridianLunarPalette } from './meridian.lunar.component';

// ─── Sizes — identical to spec ────────────────────────────────────────────────

const SIZE_DIMS = {
  sm: { width: 200, height: 72, px: 12, py: 10, trackH: 16, labelSize: 10, timeSize: 8 },
  md: { width: 240, height: 88, px: 14, py: 11, trackH: 20, labelSize: 11, timeSize: 9 },
  lg: { width: 280, height: 104, px: 16, py: 12, trackH: 24, labelSize: 12, timeSize: 10 },
};

// ─── Lunar phase blend ────────────────────────────────────────────────────────

const PHASE_ORDER: LunarPhase[] = [
  'new',
  'waxing-crescent',
  'first-quarter',
  'waxing-gibbous',
  'full',
  'waning-gibbous',
  'last-quarter',
  'waning-crescent',
];

const PHASE_STARTS: Partial<Record<LunarPhase, number>> = {
  new: 0,
  'waxing-crescent': 1.85,
  'first-quarter': 7.38,
  'waxing-gibbous': 9.22,
  full: 14.77,
  'waning-gibbous': 16.61,
  'last-quarter': 22.15,
  'waning-crescent': 23.99,
};

function getLunarBlend(ageInDays: number): {
  phase: LunarPhase;
  nextPhase: LunarPhase;
  t: number;
} {
  const CYCLE = 29.53;
  const d = ageInDays;
  let phase: LunarPhase = 'new';
  if (d < 1.85 || d >= 27.68) phase = 'new';
  else if (d < 7.38) phase = 'waxing-crescent';
  else if (d < 9.22) phase = 'first-quarter';
  else if (d < 14.77) phase = 'waxing-gibbous';
  else if (d < 16.61) phase = 'full';
  else if (d < 22.15) phase = 'waning-gibbous';
  else if (d < 23.99) phase = 'last-quarter';
  else phase = 'waning-crescent';

  const idx = PHASE_ORDER.indexOf(phase);
  const nextIdx = (idx + 1) % PHASE_ORDER.length;
  const nextPhase = PHASE_ORDER[nextIdx];
  const start = PHASE_STARTS[phase] ?? 0;
  const nextStart = nextIdx === 0 ? CYCLE : (PHASE_STARTS[nextPhase] ?? CYCLE);
  const duration = nextStart - start;
  const elapsed = ageInDays - start;
  const progress = Math.max(0, Math.min(1, elapsed / duration));
  const WINDOW = 0.2;
  const t = progress < 1 - WINDOW ? 0 : (progress - (1 - WINDOW)) / WINDOW;
  return { phase, nextPhase, t };
}

// ─── Format helper ────────────────────────────────────────────────────────────

function fmtMinutes(m: number | null): string {
  if (m === null) return '--:--';
  const h = Math.floor(m / 60) % 24;
  const mm = Math.round(m % 60);
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// ─── Meridian luna compact orb RAF ────────────────────────────────────────────
// Tracks progress separately from pixel X. Circular distance wrap detection.

function useMeridianLunaCompactOrbRaf(
  refs: {
    ring: React.RefObject<SVGCircleElement>;
    dot: React.RefObject<SVGCircleElement>;
    wrap: React.RefObject<SVGGElement>;
  },
  trackW: number,
) {
  const curX = useRef(-1);
  const curP = useRef(-1);
  const tgtX = useRef(0);
  const rafId = useRef<number | null>(null);
  const firstCall = useRef(true);
  const orbFading = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setX = (x: number) => {
    refs.ring.current?.setAttribute('cx', String(x));
    refs.dot.current?.setAttribute('cx', String(x));
  };

  const setWrapOpacity = (v: number) => {
    if (refs.wrap.current) refs.wrap.current.style.opacity = String(v);
  };

  const anim = () => {
    const diff = tgtX.current - curX.current;
    if (Math.abs(diff) > 0.15) {
      curX.current += diff * 0.12;
      setX(curX.current);
      rafId.current = requestAnimationFrame(anim);
    } else {
      curX.current = tgtX.current;
      setX(curX.current);
      rafId.current = null;
    }
  };

  const setTarget = (progress: number) => {
    const x = Math.max(0.01, Math.min(0.99, progress)) * trackW;
    tgtX.current = x;

    if (firstCall.current) {
      firstCall.current = false;
      curP.current = progress;
      curX.current = x;
      setX(x);
      return;
    }

    const rawDelta = progress - curP.current;
    let circDelta = rawDelta;
    if (circDelta > 0.5) circDelta -= 1;
    if (circDelta < -0.5) circDelta += 1;
    const needsSnap = Math.abs(rawDelta) > 0.5 || Math.abs(circDelta) > 0.15;
    curP.current = progress;

    if (needsSnap && !orbFading.current) {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      orbFading.current = true;
      setWrapOpacity(0);
      fadeTimer.current = setTimeout(() => {
        curX.current = x;
        setX(x);
        setWrapOpacity(1);
        orbFading.current = false;
        fadeTimer.current = null;
        if (!rafId.current) rafId.current = requestAnimationFrame(anim);
      }, 160);
    } else if (!orbFading.current) {
      if (!rafId.current) rafId.current = requestAnimationFrame(anim);
    }
  };

  useEffect(
    () => () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    },
    [],
  );

  return { setTarget };
}

// ─── MeridianLunaHairlineTrack ────────────────────────────────────────────────
// Hairline with degree tick marks + precise dot orb.
// Restrained — no fill bar, no bloom, just precision.

function MeridianLunaHairlineTrack({
  progress,
  trackW,
  trackH,
  orbFill,
  orbRing,
  accentColor,
  arc,
  illumination,
}: {
  progress: number;
  trackW: number;
  trackH: number;
  orbFill: string;
  orbRing: string;
  accentColor: string;
  arc: string;
  illumination: number;
}) {
  const cy = trackH / 2;
  const dotR = 2.5 + illumination * 2.5;
  const ringR = dotR + 3 + illumination * 3;
  const orbOpacity = Math.max(0.06, illumination * 0.94 + 0.06);

  const ringRef = useRef<SVGCircleElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const wrapRef = useRef<SVGGElement>(null);

  const { setTarget } = useMeridianLunaCompactOrbRaf(
    { ring: ringRef, dot: dotRef, wrap: wrapRef },
    trackW,
  );

  useEffect(() => {
    setTarget(progress);
  });

  useEffect(() => {
    if (ringRef.current) {
      ringRef.current.style.stroke = orbRing;
      ringRef.current.setAttribute('r', String(ringR));
    }
    if (dotRef.current) {
      dotRef.current.style.fill = orbFill;
      dotRef.current.setAttribute('r', String(dotR));
    }
  });

  const initX = Math.max(0.01, Math.min(0.99, progress)) * trackW;

  // Degree tick positions — 0°, 90°, 180°, 270°, 360° mapped to track
  const tickPositions = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <svg
      role="presentation"
      aria-hidden
      width={trackW}
      height={trackH}
      viewBox={`0 0 ${trackW} ${trackH}`}
      style={{ overflow: 'visible' }}
    >
      {/* Main hairline — the arc baseline */}
      <line x1={0} y1={cy} x2={trackW} y2={cy} stroke={arc} strokeWidth={0.7} opacity={0.65} />

      {/* Degree tick marks — endpoints and quarter marks */}
      {tickPositions.map((p) => {
        const x = p * trackW;
        const h = p === 0 || p === 1 ? 5 : 3.5;
        return (
          <line
            key={p}
            x1={x}
            y1={cy - h}
            x2={x}
            y2={cy + h}
            stroke={accentColor}
            strokeWidth={p === 0 || p === 1 ? 0.9 : 0.6}
            opacity={p === 0 || p === 1 ? 0.45 : 0.28}
          />
        );
      })}

      {/* Orb wrap group */}
      <g ref={wrapRef} style={{ opacity: orbOpacity, transition: 'opacity 0.9s ease-in-out' }}>
        {/* Stroke ring */}
        <circle
          ref={ringRef}
          cx={initX}
          cy={cy}
          fill="none"
          strokeWidth={0.7}
          opacity={0.35}
          style={{ stroke: orbRing }}
        />
        {/* Precise dot */}
        <circle ref={dotRef} cx={initX} cy={cy} style={{ fill: orbFill }} />
      </g>
    </svg>
  );
}

// ─── MeridianLunaCompact ──────────────────────────────────────────────────────

export function MeridianLunaCompact({
  latitude,
  longitude,
  timezone,
  simulatedDate,
  showIllumination = true,
  showMoonrise = true,
  size: sizeName = 'md',
  className = '',
}: CompactLunaWidgetProps) {
  const size = SIZE_DIMS[sizeName] ?? SIZE_DIMS.md;
  const SANS = "'Inter','SF Pro Display','Helvetica Neue',sans-serif";

  const lunarPos = useLunarPosition({
    latitude,
    longitude,
    timezone,
    updateIntervalMs: 60_000,
    simulatedDate,
  });

  const blend = useMemo(() => getLunarBlend(lunarPos.ageInDays), [lunarPos.ageInDays]);

  const pal = useMemo(
    () =>
      lerpMeridianLunarPalette(
        MERIDIAN_LUNAR_PALETTES[blend.phase],
        MERIDIAN_LUNAR_PALETTES[blend.nextPhase],
        blend.t,
      ),
    [blend],
  );

  const moonriseStr = fmtMinutes(lunarPos.moonriseMinutes);
  const moonsetStr = fmtMinutes(lunarPos.moonsetMinutes);
  const illumPct = Math.round(lunarPos.illumination * 100);

  const progressTarget = lunarPos.isVisible
    ? Math.max(0.01, Math.min(0.99, lunarPos.moonProgress))
    : 0.5;

  const trackW = size.width - size.px * 2;
  const row1H = size.labelSize + 2;
  const row3H = size.timeSize + 2;
  const innerH = size.height - size.py * 2;
  const gapY = Math.max(2, Math.floor((innerH - row1H - size.trackH - row3H) / 2));

  return (
    <motion.div
      className={className}
      style={{
        position: 'relative',
        width: size.width,
        height: size.height,
        borderRadius: 4,
        overflow: 'hidden',
        border: `1px solid ${pal.arc}`,
        boxShadow: `0 1px 12px ${pal.shadow}`,
        cursor: 'default',
        userSelect: 'none',
      }}
      animate={{ background: pal.surface }}
      transition={{ duration: 1.5, ease: 'easeInOut' }}
    >
      {/* z=2 Top accent hairline — Meridian's single color rule */}
      <motion.div
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, zIndex: 2 }}
        animate={{
          background: `linear-gradient(to right, transparent 0%, ${pal.accentColor} 35%, ${pal.accentColor} 65%, transparent 100%)`,
          opacity: 0.3 + lunarPos.illumination * 0.2,
        }}
        transition={{ duration: 1.5 }}
      />

      {/* z=5 3-row content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          paddingTop: size.py,
          paddingBottom: size.py,
          paddingLeft: size.px,
          paddingRight: size.px,
        }}
      >
        {/* ── Row 1 ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: row1H,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: SANS,
              fontSize: size.labelSize,
              letterSpacing: '0.14em',
              textTransform: 'lowercase',
              lineHeight: 1,
              fontWeight: 300,
              color: pal.textPrimary,
              opacity: 0.4,
              transition: 'color 1.5s ease-in-out',
            }}
          >
            {pal.label}
          </span>

          {showIllumination && (
            <span
              style={{
                fontFamily: SANS,
                fontSize: size.labelSize,
                letterSpacing: '0.04em',
                fontWeight: 300,
                lineHeight: 1,
                color: pal.textPrimary,
                opacity: 0.32,
                transition: 'color 1.5s ease-in-out',
              }}
            >
              {illumPct}%
            </span>
          )}
        </div>

        <div style={{ height: gapY, flexShrink: 0 }} />

        {/* ── Row 2 — Hairline track with degree marks ── */}
        <div style={{ width: trackW, height: size.trackH, flexShrink: 0 }}>
          <MeridianLunaHairlineTrack
            progress={progressTarget}
            trackW={trackW}
            trackH={size.trackH}
            orbFill={pal.orbFill}
            orbRing={pal.orbRing}
            accentColor={pal.accentColor}
            arc={pal.arc}
            illumination={lunarPos.illumination}
          />
        </div>

        <div style={{ height: gapY, flexShrink: 0 }} />

        {/* ── Row 3 — moonrise · (line) · moonset ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: row3H,
            flexShrink: 0,
            opacity: showMoonrise ? 0.3 : 0,
            transition: 'opacity 1s ease-in-out',
          }}
        >
          <span
            style={{
              fontFamily: SANS,
              fontSize: size.timeSize,
              letterSpacing: '0.08em',
              lineHeight: 1,
              fontWeight: 300,
              color: pal.textSecondary,
              flexShrink: 0,
            }}
          >
            ↑ {moonriseStr}
          </span>

          {/* Center divider — Meridian's hairline language */}
          <span
            style={{
              display: 'block',
              flex: 1,
              margin: '0 8px',
              height: 0,
              borderTop: `1px solid ${pal.gridColor}`,
            }}
          />

          <span
            style={{
              fontFamily: SANS,
              fontSize: size.timeSize,
              letterSpacing: '0.08em',
              lineHeight: 1,
              fontWeight: 300,
              color: pal.textSecondary,
              flexShrink: 0,
            }}
          >
            ↓ {moonsetStr}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
