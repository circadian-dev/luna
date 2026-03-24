'use client';
// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/aurora/aurora.lunar.compact.tsx
// ════════════════════════════════════════════════════════════════════════════
/**
 * Aurora lunar compact widget.
 *
 * Three-row layout:
 *   Row 1 — phase label (lowercase, opacity 0.38) + illumination % (right)
 *   Row 2 — aurora band track with illumination-driven orb
 *   Row 3 — ↑ moonrise · sublabel · moonset ↓
 *
 * Track treatment: spectral aurora band gradient behind the track line,
 * opacity driven by palette.auroraOpacity (which scales with lunar phase).
 * At new moon the bands are near-invisible; at full moon they bloom blue-silver.
 *
 * No weather layer. No temperature. Purely lunar.
 */

import { motion } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import { type LunarPhase, useLunarPosition } from '../../hooks/useLunarPosition';
import { lerpColor } from '../../lib/luna-lerp';
import type { CompactLunaWidgetProps } from '../types/luna-skin.types';
import { AURORA_LUNAR_PALETTES, lerpAuroraLunarPalette } from './aurora.lunar.component';

// ─── Sizes — identical to void.lunar.compact.tsx ─────────────────────────────

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

// ─── Aurora luna compact orb RAF ──────────────────────────────────────────────

function useAuroraLunaCompactOrbRaf(
  refs: {
    far: React.RefObject<SVGCircleElement>;
    near: React.RefObject<SVGCircleElement>;
    core: React.RefObject<SVGCircleElement>;
    wrap: React.RefObject<SVGGElement>;
  },
  trackW: number,
) {
  const curX = useRef(-1);
  const tgtX = useRef(0);
  const rafId = useRef<number | null>(null);
  const firstCall = useRef(true);
  const curP = useRef(0);
  const orbFading = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setX = (x: number) => {
    refs.far.current?.setAttribute('cx', String(x));
    refs.near.current?.setAttribute('cx', String(x));
    refs.core.current?.setAttribute('cx', String(x));
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

// ─── Aurora luna compact keyframes ───────────────────────────────────────────

const AURORA_LUNA_COMPACT_KF = `
@keyframes aurora-luna-cmp-drift-1 {
  0%   { transform: translateX(0%)   scaleY(1.00); }
  35%  { transform: translateX(-9%)  scaleY(1.12); }
  70%  { transform: translateX(5%)   scaleY(0.92); }
  100% { transform: translateX(0%)   scaleY(1.00); }
}
@keyframes aurora-luna-cmp-drift-2 {
  0%   { transform: translateX(-5%)  scaleY(1.00); }
  45%  { transform: translateX(7%)   scaleY(0.90); }
  100% { transform: translateX(-5%)  scaleY(1.00); }
}
`;

// ─── AuroraLunaTrack ──────────────────────────────────────────────────────────
// Spectral aurora band gradient behind the track, orb scales with illumination.

function AuroraLunaTrack({
  progress,
  trackW,
  trackH,
  band1,
  band2,
  orbFill,
  outerGlow,
  border,
  auroraOpacity,
  illumination,
}: {
  progress: number;
  trackW: number;
  trackH: number;
  band1: string;
  band2: string;
  orbFill: string;
  outerGlow: string;
  border: string;
  auroraOpacity: number;
  illumination: number;
}) {
  const orbOpacity = Math.max(0.06, illumination * 0.94 + 0.06);
  const orbR = trackH * 0.38;
  const glowR = orbR * (2.5 * illumination + 0.5);
  const midR = orbR * (1.4 * illumination + 0.3);
  const coreR = orbR * (0.8 + illumination * 0.2);
  const cy = trackH / 2;

  const farRef = useRef<SVGCircleElement>(null);
  const nearRef = useRef<SVGCircleElement>(null);
  const coreRef = useRef<SVGCircleElement>(null);
  const wrapRef = useRef<SVGGElement>(null);

  const { setTarget } = useAuroraLunaCompactOrbRaf(
    { far: farRef, near: nearRef, core: coreRef, wrap: wrapRef },
    trackW,
  );

  useEffect(() => {
    setTarget(progress);
  });

  useEffect(() => {
    if (farRef.current) {
      farRef.current.style.fill = outerGlow;
      farRef.current.setAttribute('r', String(glowR));
    }
    if (nearRef.current) {
      nearRef.current.style.fill = outerGlow;
      nearRef.current.setAttribute('r', String(midR));
    }
    if (coreRef.current) {
      coreRef.current.style.fill = orbFill;
      coreRef.current.setAttribute('r', String(coreR));
    }
  });

  const initX = Math.max(0.01, Math.min(0.99, progress)) * trackW;

  return (
    <>
      {auroraOpacity > 0.06 && <style>{AURORA_LUNA_COMPACT_KF}</style>}
      <svg
        role="presentation"
        aria-hidden
        width={trackW}
        height={trackH}
        viewBox={`0 0 ${trackW} ${trackH}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient
            id="aurora-luna-cmp-band"
            x1="0"
            y1="0"
            x2="1"
            y2="0"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" stopColor={band1} stopOpacity={0.2} />
            <stop offset="50%" stopColor={band2} stopOpacity={0.65} />
            <stop offset="100%" stopColor={band1} stopOpacity={0.2} />
          </linearGradient>
          <filter id="aurora-luna-cmp-far" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation={orbR * 0.8} />
          </filter>
          <filter id="aurora-luna-cmp-near" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation={orbR * 0.38} />
          </filter>
        </defs>

        {/* Aurora band atmosphere — scales with auroraOpacity */}
        {auroraOpacity > 0.04 && (
          <rect
            x={0}
            y={cy - trackH * 0.35}
            width={trackW}
            height={trackH * 0.7}
            rx={trackH * 0.35}
            fill="url(#aurora-luna-cmp-band)"
            opacity={auroraOpacity * 0.55}
            style={{ filter: 'blur(1.5px)' }}
          />
        )}

        {/* Track line — always visible, outside wrap group */}
        <line x1={0} y1={cy} x2={trackW} y2={cy} stroke={border} strokeWidth={0.8} opacity={0.18} />

        {/* Orb wrap group — fades on wrap-around */}
        <g ref={wrapRef} style={{ opacity: orbOpacity, transition: 'opacity 0.9s ease-in-out' }}>
          <circle
            ref={farRef}
            cx={initX}
            cy={cy}
            style={{ fill: outerGlow }}
            filter="url(#aurora-luna-cmp-far)"
            opacity={0.55}
          />
          <circle
            ref={nearRef}
            cx={initX}
            cy={cy}
            style={{ fill: outerGlow }}
            filter="url(#aurora-luna-cmp-near)"
            opacity={0.68}
          />
          <circle ref={coreRef} cx={initX} cy={cy} style={{ fill: orbFill }} opacity={0.95} />
        </g>
      </svg>
    </>
  );
}

// ─── AuroraLunaCompact ────────────────────────────────────────────────────────

export function AuroraLunaCompact({
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
      lerpAuroraLunarPalette(
        AURORA_LUNAR_PALETTES[blend.phase],
        AURORA_LUNAR_PALETTES[blend.nextPhase],
        blend.t,
      ),
    [blend],
  );

  const moonriseStr = fmtMinutes(lunarPos.moonriseMinutes);
  const moonsetStr = fmtMinutes(lunarPos.moonsetMinutes);
  const illumPct = Math.round(lunarPos.illumination * 100);

  const progressTarget = Math.max(0.01, Math.min(0.99, lunarPos.moonProgress));

  const trackW = size.width - size.px * 2;
  const row1H = size.labelSize + 2;
  const row3H = size.timeSize + 2;
  const innerH = size.height - size.py * 2;
  const gapY = Math.max(2, Math.floor((innerH - row1H - size.trackH - row3H) / 2));

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: size.width,
        height: size.height,
        borderRadius: 14,
        overflow: 'hidden',
        border: `1px solid ${pal.border}`,
        boxShadow: `0 4px 28px rgba(0,0,0,0.45), 0 0 ${28 * lunarPos.illumination + 8}px 4px ${pal.outerGlow}`,
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      {/* z=1 Sky background */}
      <motion.div
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        animate={{
          background: `linear-gradient(165deg, ${pal.bg[0]} 0%, ${pal.bg[1]} 55%, ${pal.bg[2]} 100%)`,
        }}
        transition={{ duration: 2.4, ease: 'easeInOut' }}
      />

      {/* z=2 Aurora ambient sweep — scales with auroraOpacity */}
      {pal.auroraOpacity > 0.04 && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            pointerEvents: 'none',
            overflow: 'hidden',
            opacity: pal.auroraOpacity * 0.28,
            transition: 'opacity 2.4s ease-in-out',
          }}
        >
          <style>{AURORA_LUNA_COMPACT_KF}</style>
          <div
            style={{
              position: 'absolute',
              top: '-15%',
              left: '-30%',
              width: '160%',
              height: '70%',
              background: `radial-gradient(ellipse 75% 60% at 45% 55%, ${pal.band1}99 0%, ${pal.band2}44 48%, transparent 75%)`,
              filter: 'blur(12px)',
              animation: 'aurora-luna-cmp-drift-1 18s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '5%',
              left: '-15%',
              width: '130%',
              height: '50%',
              background: `radial-gradient(ellipse 60% 45% at 60% 45%, ${pal.band3 ?? pal.band2}66 0%, transparent 72%)`,
              filter: 'blur(9px)',
              animation: 'aurora-luna-cmp-drift-2 12s ease-in-out infinite',
            }}
          />
        </div>
      )}

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
              letterSpacing: '0.12em',
              textTransform: 'lowercase',
              lineHeight: 1,
              fontWeight: 200,
              color: pal.textPrimary,
              opacity: 0.38,
              transition: 'color 2.4s ease-in-out',
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
                fontWeight: 200,
                lineHeight: 1,
                color: pal.textPrimary,
                opacity: 0.32,
                transition: 'color 2.4s ease-in-out',
              }}
            >
              {illumPct}%
            </span>
          )}
        </div>

        <div style={{ height: gapY, flexShrink: 0 }} />

        {/* ── Row 2 — Aurora band track ── */}
        <div style={{ width: trackW, height: size.trackH, flexShrink: 0 }}>
          <AuroraLunaTrack
            progress={progressTarget}
            trackW={trackW}
            trackH={size.trackH}
            band1={pal.band1}
            band2={pal.band2}
            orbFill={pal.orbFill}
            outerGlow={pal.outerGlow}
            border={pal.border}
            auroraOpacity={pal.auroraOpacity}
            illumination={lunarPos.illumination}
          />
        </div>

        <div style={{ height: gapY, flexShrink: 0 }} />

        {/* ── Row 3 — moonrise / sublabel / moonset ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: row3H,
            flexShrink: 0,
            opacity: showMoonrise ? 0.26 : 0,
            transition: 'opacity 1s ease-in-out',
          }}
        >
          <span
            style={{
              fontFamily: SANS,
              fontSize: size.timeSize,
              letterSpacing: '0.10em',
              lineHeight: 1,
              color: pal.textSecondary,
            }}
          >
            ↑ {moonriseStr}
          </span>
          <span
            style={{
              fontFamily: SANS,
              fontSize: size.timeSize - 1,
              letterSpacing: '0.08em',
              lineHeight: 1,
              color: pal.textSecondary,
              opacity: 0.7,
            }}
          >
            {pal.sublabel}
          </span>
          <span
            style={{
              fontFamily: SANS,
              fontSize: size.timeSize,
              letterSpacing: '0.10em',
              lineHeight: 1,
              color: pal.textSecondary,
            }}
          >
            ↓ {moonsetStr}
          </span>
        </div>
      </div>

      {/* z=6 Top edge catch-light */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          zIndex: 6,
          pointerEvents: 'none',
          background: `linear-gradient(to right, transparent 0%, rgba(255,255,255,${pal.mode === 'dim' ? '0.10' : '0.06'}) 25%, rgba(255,255,255,${pal.mode === 'dim' ? '0.10' : '0.06'}) 75%, transparent 100%)`,
        }}
      />
    </div>
  );
}
