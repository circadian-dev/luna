'use client';
// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/void/void.lunar.compact.tsx
// ════════════════════════════════════════════════════════════════════════════
/**
 * Void lunar compact widget.
 *
 * Mirrors void.compact.tsx structure exactly:
 *   Row 1 — phase label (lowercase) + illumination % (right)
 *   Row 2 — flat arc track with orb (same VoidTrack mechanics)
 *   Row 3 — moonrise (left) · phase sublabel (center) · moonset (right)
 *
 * Key differences from the solar void compact:
 *   - No weather layer
 *   - No temperature
 *   - Orb opacity and glow scale with lunar illumination
 *   - Bottom row shows moonrise/moonset instead of sunrise/sunset
 *   - Phase label uses lunar phase names
 *   - Star field behind the track (fades as moon brightens)
 */

import { motion } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import { type LunarPhase, useLunarPosition } from '../../hooks/useLunarPosition';
import { lerpColor } from '../../lib/luna-lerp';
import type { CompactLunaWidgetProps } from '../types/luna-skin.types';
import { VOID_LUNAR_PALETTES, lerpVoidLunarPalette } from './void.lunar.component';

// ─── Sizes — identical to void.compact.tsx ───────────────────────────────────

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
  const nextPhase = PHASE_ORDER[nextIdx] ?? 'new';
  const start = PHASE_STARTS[phase] ?? 0;
  const nextStart = nextIdx === 0 ? CYCLE : (PHASE_STARTS[nextPhase] ?? CYCLE);
  const duration = nextStart - start;
  const elapsed = ageInDays - start;
  const progress = Math.max(0, Math.min(1, elapsed / duration));
  const WINDOW = 0.2;
  const t = progress < 1 - WINDOW ? 0 : (progress - (1 - WINDOW)) / WINDOW;
  return { phase, nextPhase, t };
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtMinutes(m: number | null): string {
  if (m === null) return '--:--';
  const h = Math.floor(m / 60) % 24;
  const mm = Math.round(m % 60);
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// ─── Orb RAF — same pattern as void.compact.tsx ───────────────────────────────

function useVoidLunaOrbRaf(
  refs: {
    glowRef: React.RefObject<SVGCircleElement>;
    midRef: React.RefObject<SVGCircleElement>;
    coreRef: React.RefObject<SVGCircleElement>;
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

  const setPos = (x: number) => {
    (refs.glowRef.current as SVGCircleElement | null)?.setAttribute('cx', String(x));
    (refs.midRef.current as SVGCircleElement | null)?.setAttribute('cx', String(x));
    (refs.coreRef.current as SVGCircleElement | null)?.setAttribute('cx', String(x));
  };

  const setWrapOpacity = (v: number) => {
    if (refs.wrap.current) (refs.wrap.current as SVGGElement).style.opacity = String(v);
  };

  const anim = () => {
    const diff = tgtX.current - curX.current;
    if (Math.abs(diff) > 0.15) {
      curX.current += diff * 0.12;
      setPos(curX.current);
      rafId.current = window.requestAnimationFrame(anim);
    } else {
      curX.current = tgtX.current;
      setPos(curX.current);
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
      setPos(x);
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
        window.cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      orbFading.current = true;
      setWrapOpacity(0);
      fadeTimer.current = setTimeout(() => {
        curX.current = x;
        setPos(x);
        setWrapOpacity(1);
        orbFading.current = false;
        fadeTimer.current = null;
        if (!rafId.current) rafId.current = window.requestAnimationFrame(anim);
      }, 160);
    } else if (!orbFading.current) {
      if (!rafId.current) rafId.current = window.requestAnimationFrame(anim);
    }
  };

  useEffect(
    () => () => {
      if (rafId.current) window.cancelAnimationFrame(rafId.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    },
    [],
  );

  return { setTarget };
}

// ─── VoidLunaTrack ────────────────────────────────────────────────────────────

function VoidLunaTrack({
  progress,
  trackW,
  trackH,
  orbGlow,
  orbCore,
  pillBorder,
  orbOpacity,
  glowR,
  midR,
  coreR,
}: {
  progress: number;
  trackW: number;
  trackH: number;
  orbGlow: string;
  orbCore: string;
  pillBorder: string;
  orbOpacity: number;
  glowR: number;
  midR: number;
  coreR: number;
}) {
  const lineY = trackH / 2;
  const glowRef = useRef<SVGCircleElement>(null);
  const midRef = useRef<SVGCircleElement>(null);
  const coreRef = useRef<SVGCircleElement>(null);
  const wrapGRef = useRef<SVGGElement>(null);

  const { setTarget } = useVoidLunaOrbRaf({ glowRef, midRef, coreRef, wrap: wrapGRef }, trackW);

  useEffect(() => {
    setTarget(progress);
  });
  useEffect(() => {
    if (glowRef.current) {
      (glowRef.current as SVGCircleElement).style.fill = orbGlow;
      (glowRef.current as SVGCircleElement).setAttribute('r', String(glowR));
    }
    if (midRef.current) {
      (midRef.current as SVGCircleElement).style.fill = orbGlow;
      (midRef.current as SVGCircleElement).setAttribute('r', String(midR));
    }
    if (coreRef.current) {
      (coreRef.current as SVGCircleElement).style.fill = orbCore;
      (coreRef.current as SVGCircleElement).setAttribute('r', String(coreR));
    }
  });

  const initX = Math.max(0.01, Math.min(0.99, progress)) * trackW;

  return (
    <svg
      role="presentation"
      aria-hidden
      width={trackW}
      height={trackH}
      viewBox={`0 0 ${trackW} ${trackH}`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <filter id="void-luna-compact-blur" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="void-luna-compact-mid" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* Track line — always visible, outside wrap group */}
      <line
        x1={0}
        y1={lineY}
        x2={trackW}
        y2={lineY}
        stroke={pillBorder}
        strokeWidth={0.8}
        opacity={0.12}
      />

      {/* Orb wrap group — fades on wrap-around */}
      <g ref={wrapGRef} style={{ opacity: orbOpacity, transition: 'opacity 0.9s ease-in-out' }}>
        <circle
          ref={glowRef}
          cx={initX}
          cy={lineY}
          r={glowR}
          style={{ fill: orbGlow }}
          opacity={0.55}
          filter="url(#void-luna-compact-blur)"
        />
        <circle
          ref={midRef}
          cx={initX}
          cy={lineY}
          r={midR}
          style={{ fill: orbGlow }}
          opacity={0.4}
          filter="url(#void-luna-compact-mid)"
        />
        <circle
          ref={coreRef}
          cx={initX}
          cy={lineY}
          r={coreR}
          style={{ fill: orbCore }}
          opacity={1.0}
        />
      </g>
    </svg>
  );
}

// ─── VoidLunaCompact ──────────────────────────────────────────────────────────

export function VoidLunaCompact({
  latitude,
  longitude,
  timezone,
  simulatedDate,
  showIllumination = true,
  showMoonrise = true,
  size: sizeName = 'md',
}: CompactLunaWidgetProps) {
  const size = SIZE_DIMS[sizeName as keyof typeof SIZE_DIMS] ?? SIZE_DIMS.md;
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
      lerpVoidLunarPalette(
        VOID_LUNAR_PALETTES[blend.phase],
        VOID_LUNAR_PALETTES[blend.nextPhase],
        blend.t,
      ),
    [blend],
  );

  const moonriseStr = fmtMinutes(lunarPos.moonriseMinutes);
  const moonsetStr = fmtMinutes(lunarPos.moonsetMinutes);
  const illumPct = Math.round(lunarPos.illumination * 100);

  // Orb metrics scale with illumination — near-invisible at new moon
  const orbOpacity = Math.max(0.06, lunarPos.illumination * 0.94 + 0.06);
  const trackW = size.width - size.px * 2;
  const orbR = size.trackH * 0.38;
  const glowR = orbR * (2.5 * lunarPos.illumination + 0.5);
  const midR = orbR * (1.4 * lunarPos.illumination + 0.3);
  const coreR = orbR * (0.8 + lunarPos.illumination * 0.2);

  const progressTarget = lunarPos.isVisible
    ? Math.max(0.01, Math.min(0.99, lunarPos.moonProgress))
    : 0.5;

  const row1H = size.labelSize + 2;
  const row3H = size.timeSize + 2;
  const innerH = size.height - size.py * 2;
  const gapY = Math.max(2, Math.floor((innerH - row1H - size.trackH - row3H) / 2));

  return (
    <div
      style={{
        position: 'relative',
        width: size.width,
        height: size.height,
        borderRadius: 3,
        overflow: 'hidden',
        border: `1px solid ${pal.pillBorder}38`,
        boxShadow: `0 2px 20px rgba(0,0,0,0.88), 0 0 ${20 * lunarPos.illumination + 8}px 4px ${pal.orbGlow}28`,
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      {/* Background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${pal.bg[0]} 0%, ${pal.bg[1]} 100%)`,
          transition: 'background 2.4s ease-in-out',
        }}
      />

      {/* Star field — more stars when moon is dim */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <svg
          role="presentation"
          aria-hidden
          width="100%"
          height="100%"
          viewBox={`0 0 ${size.width} ${size.height}`}
          preserveAspectRatio="xMidYMid slice"
        >
          {(
            [
              [0.1, 0.18],
              [0.24, 0.42],
              [0.38, 0.12],
              [0.52, 0.65],
              [0.66, 0.28],
              [0.78, 0.52],
              [0.9, 0.16],
              [0.14, 0.78],
              [0.46, 0.88],
              [0.82, 0.74],
            ] as const
          ).map(([px, py], i) => (
            <circle
              // biome-ignore lint/suspicious/noArrayIndexKey: static constant array
              key={i}
              cx={px * size.width}
              cy={py * size.height}
              r={i % 2 === 0 ? 0.7 : 0.45}
              fill="#ffffff"
              opacity={
                Math.max(0.02, 0.22 * (1 - lunarPos.illumination * 0.6)) * (0.6 + (i % 4) * 0.1)
              }
            />
          ))}
        </svg>
      </div>

      {/* 3-row content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 4,
          display: 'flex',
          flexDirection: 'column',
          paddingTop: size.py,
          paddingBottom: size.py,
          paddingLeft: size.px,
          paddingRight: size.px,
        }}
      >
        {/* Row 1 */}
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

        {/* Row 2 — Void track with illumination-scaled orb */}
        <div style={{ width: trackW, height: size.trackH, flexShrink: 0 }}>
          <VoidLunaTrack
            progress={progressTarget}
            trackW={trackW}
            trackH={size.trackH}
            orbGlow={pal.orbGlow}
            orbCore={pal.orbCore}
            pillBorder={pal.pillBorder}
            orbOpacity={orbOpacity}
            glowR={glowR}
            midR={midR}
            coreR={coreR}
          />
        </div>

        <div style={{ height: gapY, flexShrink: 0 }} />

        {/* Row 3 — moonrise / sublabel / moonset */}
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
    </div>
  );
}
