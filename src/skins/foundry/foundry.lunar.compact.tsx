'use client';
// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/foundry/foundry.lunar.compact.tsx
// ════════════════════════════════════════════════════════════════════════════
/**
 * Foundry lunar compact widget.
 *
 * Three-row layout:
 *   Row 1 — phase label (lowercase) + illumination % (right)
 *   Row 2 — machined channel track with illumination-driven orb
 *   Row 3 — ↑ moonrise · sublabel · moonset ↓
 *
 * Track treatment: the same MachinedTrack aesthetic from foundry.compact.tsx —
 * channel groove with quarter tick marks, fill rect, and a "molten silver" orb.
 * At low illumination the orb is nearly invisible. At full moon it blooms bright.
 * The moon crescent is shown at crescent phases. No star field (foundry is
 * industrial, not atmospheric).
 *
 * No weather. No temperature. Purely lunar.
 */

import { motion } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import { type LunarPhase, useLunarPosition } from '../../hooks/useLunarPosition';
import { lerpColor } from '../../lib/luna-lerp';
import type { CompactLunaWidgetProps } from '../types/luna-skin.types';
import { FOUNDRY_LUNAR_PALETTES, lerpFoundryLunarPalette } from './foundry.lunar.component';

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

// ─── Machined luna orb RAF ────────────────────────────────────────────────────
// Tracks progress (0-1) separately from pixel X. Uses circular distance
// to detect wraps in either direction — same logic as foundry.compact.tsx.

function useFoundryLunaCompactOrbRaf(
  refs: {
    moonG: React.RefObject<SVGGElement>;
    halo: React.RefObject<SVGCircleElement>;
    core: React.RefObject<SVGCircleElement>;
    fillRect: React.RefObject<SVGRectElement>;
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
  const orbRRef = useRef(0);

  const setX = (x: number, orbR: number) => {
    refs.moonG.current?.setAttribute('transform', `translate(${x}, ${orbR})`);
    refs.halo.current?.setAttribute('cx', String(x));
    refs.core.current?.setAttribute('cx', String(x));
    if (refs.fillRect.current) {
      refs.fillRect.current.setAttribute('width', String(Math.max(0, x - orbR * 0.6)));
    }
  };

  const setWrapOpacity = (v: number) => {
    if (refs.wrap.current) refs.wrap.current.style.opacity = String(v);
  };

  const anim = () => {
    const diff = tgtX.current - curX.current;
    if (Math.abs(diff) > 0.15) {
      curX.current += diff * 0.12;
      setX(curX.current, orbRRef.current);
      rafId.current = requestAnimationFrame(anim);
    } else {
      curX.current = tgtX.current;
      setX(curX.current, orbRRef.current);
      rafId.current = null;
    }
  };

  const setTarget = (progress: number, orbR: number) => {
    orbRRef.current = orbR;
    const x = Math.max(0.01, Math.min(0.99, progress)) * trackW;
    tgtX.current = x;

    if (firstCall.current) {
      firstCall.current = false;
      curP.current = progress;
      curX.current = x;
      setX(x, orbR);
      return;
    }

    const rawDelta = progress - curP.current;
    let circDelta = rawDelta;
    if (circDelta > 0.5) circDelta -= 1;
    if (circDelta < -0.5) circDelta += 1;
    const isWrap = Math.abs(rawDelta) > 0.5;
    const needsSnap = isWrap || Math.abs(circDelta) > 0.15;
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
        setX(x, orbR);
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

// ─── FoundryLunaMachinedTrack ─────────────────────────────────────────────────
// Adapted from MachinedTrack in foundry.compact.tsx.
// The orb size and glow radius scale with lunar illumination.
// Moon crescent shown when palette.showMoon is true.

function FoundryLunaMachinedTrack({
  progress,
  trackW,
  trackH,
  orbFill,
  orbGlow,
  border,
  accentColor,
  bg1,
  showMoon,
  illumination,
  isVisible,
}: {
  progress: number;
  trackW: number;
  trackH: number;
  orbFill: string;
  orbGlow: string;
  border: string;
  accentColor: string;
  bg1: string;
  showMoon: boolean;
  illumination: number;
  isVisible: boolean;
}) {
  const orbR = trackH / 2;
  const channelY = trackH / 2;
  const channelH = Math.max(3, trackH * 0.35);
  const S = orbR / 9;

  // Scale orb presence with illumination
  const orbOpacity = isVisible ? Math.max(0.06, illumination * 0.94 + 0.06) : 0;
  const haloR = orbR * (2.4 * illumination + 0.5);
  const coreRScale = 0.8 + illumination * 0.2;

  const moonGRef = useRef<SVGGElement>(null);
  const haloRef = useRef<SVGCircleElement>(null);
  const coreRef = useRef<SVGCircleElement>(null);
  const fillRef = useRef<SVGRectElement>(null);
  const wrapRef = useRef<SVGGElement>(null);

  const { setTarget } = useFoundryLunaCompactOrbRaf(
    { moonG: moonGRef, halo: haloRef, core: coreRef, fillRect: fillRef, wrap: wrapRef },
    trackW,
  );

  useEffect(() => {
    setTarget(progress, orbR);
  });

  useEffect(() => {
    const moonBody = moonGRef.current?.querySelector<SVGCircleElement>('.fl-moon-body');
    const moonCut = moonGRef.current?.querySelector<SVGCircleElement>('.fl-moon-cut');
    if (moonBody) moonBody.style.fill = orbFill;
    if (moonCut) moonCut.style.fill = bg1;
    if (haloRef.current) {
      haloRef.current.style.fill = orbGlow;
      haloRef.current.setAttribute('r', String(haloR));
    }
    if (coreRef.current) {
      coreRef.current.style.fill = orbFill;
      coreRef.current.setAttribute('r', String(orbR * coreRScale * (11 / 9)));
    }
  });

  const initX = Math.max(0.01, Math.min(0.99, progress)) * trackW;
  const haloBlur = Math.max(3, Math.round(10 * S));

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
        <filter id="fl-cmp-core-glow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation={6 * S} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="fl-cmp-channel" x="-5%" y="-20%" width="110%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.60)" />
        </filter>
        <linearGradient
          id="fl-cmp-fill"
          x1="0"
          y1="0"
          x2="1"
          y2="0"
          gradientUnits="objectBoundingBox"
        >
          <stop offset="0%" stopColor={orbFill} stopOpacity={0.45} />
          <stop offset="100%" stopColor={accentColor} stopOpacity={0.65} />
        </linearGradient>
      </defs>

      {/* Channel groove — machined inset */}
      <rect
        x={0}
        y={channelY - channelH / 2}
        width={trackW}
        height={channelH}
        rx={channelH / 2}
        fill="rgba(0,0,0,0.50)"
        stroke={border}
        strokeWidth={1}
        filter="url(#fl-cmp-channel)"
      />
      {/* Top catch-light on channel */}
      <rect
        x={2}
        y={channelY - channelH / 2}
        width={trackW - 4}
        height={1}
        rx={0.5}
        fill="rgba(255,255,255,0.08)"
      />

      {/* Quarter tick marks — machined precision */}
      {[0.25, 0.5, 0.75].map((p) => (
        <line
          key={p}
          x1={p * trackW}
          y1={channelY - channelH / 2 - 2.5}
          x2={p * trackW}
          y2={channelY - channelH / 2}
          stroke={border}
          strokeWidth={0.8}
          opacity={0.4}
        />
      ))}

      {/* Fill rect — progress indicator */}
      <rect
        ref={fillRef}
        x={0}
        y={channelY - channelH / 2 + 1}
        width={Math.max(0, initX - orbR * 0.6)}
        height={channelH - 2}
        rx={channelH / 2 - 1}
        fill="url(#fl-cmp-fill)"
        opacity={0.8 * illumination + 0.1}
      />

      {/* Orb wrap group — fades on wrap-around */}
      <g ref={wrapRef} style={{ opacity: orbOpacity, transition: 'opacity 1.2s ease-in-out' }}>
        {/* Moon crescent — low illumination phases */}
        <g
          ref={moonGRef}
          transform={`translate(${initX}, ${channelY})`}
          opacity={showMoon ? 0.82 : 0}
          style={{ transition: 'opacity 0.8s ease-in-out' }}
        >
          <circle className="fl-moon-body" cx={0} cy={0} r={orbR} fill={orbFill} />
          <circle className="fl-moon-cut" cx={5 * S} cy={-3 * S} r={7 * S} fill={bg1} />
        </g>

        {/* Halo — cold steel glow */}
        <circle
          ref={haloRef}
          cx={initX}
          cy={channelY}
          style={{
            fill: orbGlow,
            filter: `blur(${haloBlur}px)`,
            transition: 'fill 1.2s ease-in-out',
          }}
        />

        {/* Core — "molten silver" disk, hidden when showing moon crescent */}
        <circle
          ref={coreRef}
          cx={initX}
          cy={channelY}
          filter="url(#fl-cmp-core-glow)"
          style={
            {
              fill: orbFill,
              opacity: showMoon ? 0 : 1,
              transition: 'opacity 0.8s ease-in-out, fill 1.2s ease-in-out',
            } as React.CSSProperties
          }
        />
      </g>
    </svg>
  );
}

// ─── FoundryLunaCompact ───────────────────────────────────────────────────────

export function FoundryLunaCompact({
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
  const SANS_DISPLAY = "'SF Pro Display','Helvetica Neue',sans-serif";
  const SANS_TEXT = "'SF Pro Text','Helvetica Neue',sans-serif";

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
      lerpFoundryLunarPalette(
        FOUNDRY_LUNAR_PALETTES[blend.phase],
        FOUNDRY_LUNAR_PALETTES[blend.nextPhase],
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
        borderRadius: 10,
        overflow: 'hidden',
        border: `1.5px solid ${pal.border}`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.42), 0 0 ${28 * lunarPos.illumination + 8}px 5px ${pal.outerGlow}`,
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      {/* z=1 Background — cold steel gradient */}
      <motion.div
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        animate={{
          background: `linear-gradient(120deg, ${pal.bg[0]} 0%, ${pal.bg[1]} 55%, ${pal.bg[2]} 100%)`,
        }}
        transition={{ duration: 2.0, ease: 'easeInOut' }}
      />

      {/* z=2 Machined texture — subtle horizontal lines, scales with illumination */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'none',
          opacity: 0.025 + lunarPos.illumination * 0.04,
          transition: 'opacity 2.0s ease-in-out',
          backgroundImage: `repeating-linear-gradient(
            0deg, transparent, transparent 3px, ${pal.border} 3px, ${pal.border} 4px
          )`,
        }}
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
              fontFamily: SANS_DISPLAY,
              fontSize: size.labelSize,
              letterSpacing: '0.12em',
              textTransform: 'lowercase',
              lineHeight: 1,
              fontWeight: 200,
              color: pal.textPrimary,
              opacity: 0.38,
              transition: 'color 2.0s ease-in-out',
            }}
          >
            {pal.label}
          </span>

          {showIllumination && (
            <span
              style={{
                fontFamily: SANS_DISPLAY,
                fontSize: size.labelSize,
                letterSpacing: '0.04em',
                fontWeight: 300,
                lineHeight: 1,
                color: pal.textPrimary,
                opacity: 0.32,
                transition: 'color 2.0s ease-in-out',
              }}
            >
              {illumPct}%
            </span>
          )}
        </div>

        <div style={{ height: gapY, flexShrink: 0 }} />

        {/* ── Row 2 — Machined track ── */}
        <div style={{ width: trackW, height: size.trackH, flexShrink: 0 }}>
          <FoundryLunaMachinedTrack
            progress={progressTarget}
            trackW={trackW}
            trackH={size.trackH}
            orbFill={pal.orbFill}
            orbGlow={pal.orbGlow}
            border={pal.border}
            accentColor={pal.accentColor}
            bg1={pal.bg[1]}
            showMoon={pal.showMoon}
            illumination={lunarPos.illumination}
            isVisible={lunarPos.isVisible}
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
              fontFamily: SANS_TEXT,
              fontSize: size.timeSize,
              letterSpacing: '0.10em',
              lineHeight: 1,
              textTransform: 'uppercase',
              color: pal.textSecondary,
            }}
          >
            ↑ {moonriseStr}
          </span>
          <span
            style={{
              fontFamily: SANS_TEXT,
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
              fontFamily: SANS_TEXT,
              fontSize: size.timeSize,
              letterSpacing: '0.10em',
              lineHeight: 1,
              textTransform: 'uppercase',
              color: pal.textSecondary,
            }}
          >
            ↓ {moonsetStr}
          </span>
        </div>
      </div>

      {/* z=6 Glass sheen */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 6,
          pointerEvents: 'none',
          background: 'linear-gradient(165deg, rgba(255,255,255,0.09) 0%, transparent 40%)',
          borderRadius: 10,
        }}
      />
    </div>
  );
}
