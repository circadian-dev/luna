'use client';
// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/tide/tide.lunar.compact.tsx
// ════════════════════════════════════════════════════════════════════════════
/**
 * Tide lunar compact widget.
 *
 * Three-row layout:
 *   Row 1 — nautical phase label (MONO uppercase) + illumination % (right)
 *   Row 2 — WaveTrack: sine wave ocean surface + bioluminescent orb
 *            Wave amplitude scales with illumination (waveAmp from palette).
 *            Orb opacity and glow radius scale with illumination.
 *            The water fill behind the orb persists through wrap-around snaps.
 *   Row 3 — ↑ MR HH:MM (left) · sublabel (center) · ↓ MS HH:MM (right)
 *
 * Bioluminescent orb: at new moon (neap) the glow is nearly absent.
 * At full moon (spring tide) the glow is maximum. Wave amplitude also at max.
 * This matches the tidal physics: spring tides (largest) at full/new moon.
 *
 * No weather. Purely lunar.
 */

import { motion } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import { type LunarPhase, useLunarPosition } from '../../hooks/useLunarPosition';
import type { CompactLunaWidgetProps } from '../types/luna-skin.types';
import { TIDE_LUNAR_PALETTES, lerpTideLunarPalette } from './tide.lunar.component';

// ─── Sizes ────────────────────────────────────────────────────────────────────

const SIZE_DIMS = {
  sm: { width: 200, height: 72, px: 12, py: 10, trackH: 22, labelSize: 10, timeSize: 8 },
  md: { width: 240, height: 88, px: 14, py: 11, trackH: 26, labelSize: 11, timeSize: 9 },
  lg: { width: 280, height: 104, px: 16, py: 12, trackH: 30, labelSize: 12, timeSize: 10 },
};

const MONO = "'SF Mono','Menlo',monospace";
const SANS = "'SF Pro Display','Helvetica Neue',sans-serif";

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

// ─── Wave track orb RAF ───────────────────────────────────────────────────────
// Same pattern as Sol tide compact. The water fill and wave stroke stay outside
// wrapGRef so the ocean surface persists during snap transitions.

interface LunaWaveOrbRefs {
  glowRef: React.RefObject<SVGCircleElement>;
  coreRef: React.RefObject<SVGCircleElement>;
  specRef: React.RefObject<SVGCircleElement>;
  wrapRef: React.RefObject<SVGGElement>;
}

function useTideLunaCompactOrbRaf(
  refs: LunaWaveOrbRefs,
  params: React.RefObject<{
    trackW: number;
    midY: number;
    amplitude: number;
    cycles: number;
    orbR: number;
  }>,
) {
  const curX = useRef(-1);
  const curP = useRef(0);
  const tgtX = useRef(0);
  const rafId = useRef<number | null>(null);
  const firstCall = useRef(true);
  const orbFading = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setWrapOpacity = (v: number) => {
    if (refs.wrapRef.current) refs.wrapRef.current.style.opacity = String(v);
  };

  const setPos = (x: number) => {
    const p = params.current;
    if (!p) return;
    const y = p.midY + p.amplitude * Math.sin((x / p.trackW) * Math.PI * 2 * p.cycles);
    refs.glowRef.current?.setAttribute('cx', String(x));
    refs.glowRef.current?.setAttribute('cy', String(y));
    refs.coreRef.current?.setAttribute('cx', String(x));
    refs.coreRef.current?.setAttribute('cy', String(y));
    const r = refs.coreRef.current ? Number(refs.coreRef.current.getAttribute('r') ?? 6) : 6;
    refs.specRef.current?.setAttribute('cx', String(x - r * 0.28));
    refs.specRef.current?.setAttribute('cy', String(y - r * 0.32));
  };

  const anim = () => {
    const diff = tgtX.current - curX.current;
    if (Math.abs(diff) > 0.15) {
      curX.current += diff * 0.12;
      setPos(curX.current);
      rafId.current = requestAnimationFrame(anim);
    } else {
      curX.current = tgtX.current;
      setPos(curX.current);
      rafId.current = null;
    }
  };

  const setTarget = (progress: number) => {
    const p = params.current;
    if (!p) return;
    const x = Math.max(0.01, Math.min(0.99, progress)) * p.trackW;
    tgtX.current = x;

    if (firstCall.current) {
      firstCall.current = false;
      curX.current = x;
      curP.current = progress;
      setPos(x);
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
        setPos(x);
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

// ─── LunaWaveTrack ────────────────────────────────────────────────────────────

function LunaWaveTrack({
  progress,
  trackW,
  trackH,
  orbFill,
  orbGlow,
  waveStroke,
  waveFill,
  pillBorder,
  sea,
  waveAmp,
  illumination,
}: {
  progress: number;
  trackW: number;
  trackH: number;
  orbFill: string;
  orbGlow: string;
  waveStroke: string;
  waveFill: string;
  pillBorder: string;
  sea: [string, string];
  waveAmp: number; // actual pixel amplitude
  illumination: number;
}) {
  const CYCLES = 1.5;
  const midY = trackH * 0.58;
  const orbR = trackH * 0.2 * (0.45 + illumination * 0.55); // scales with illumination
  const orbOpacity = Math.max(0.06, illumination * 0.94 + 0.06);

  const PTS = 100;
  const wavePoints = Array.from({ length: PTS }, (_, i) => {
    const t = i / (PTS - 1);
    return { x: t * trackW, y: midY + waveAmp * Math.sin(t * Math.PI * 2 * CYCLES) };
  });

  const progress01 = Math.max(0.01, Math.min(0.99, progress));
  const orbX = progress01 * trackW;
  const orbY = midY + waveAmp * Math.sin(progress01 * Math.PI * 2 * CYCLES);

  const wavePath = wavePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  const filledPts = wavePoints.filter((p) => p.x <= orbX);
  const fillPath =
    filledPts.length > 1
      ? `${filledPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} L${orbX.toFixed(1)},${orbY.toFixed(1)} L${orbX.toFixed(1)},${trackH} L0,${trackH} Z`
      : '';

  const glowRef = useRef<SVGCircleElement>(null);
  const coreRef = useRef<SVGCircleElement>(null);
  const specRef = useRef<SVGCircleElement>(null);
  const wrapRef = useRef<SVGGElement>(null);

  const paramsRef = useRef({ trackW, midY, amplitude: waveAmp, cycles: CYCLES, orbR });
  useEffect(() => {
    paramsRef.current = { trackW, midY, amplitude: waveAmp, cycles: CYCLES, orbR };
  });

  const { setTarget } = useTideLunaCompactOrbRaf({ glowRef, coreRef, specRef, wrapRef }, paramsRef);

  useEffect(() => {
    setTarget(progress);
  });
  useEffect(() => {
    if (glowRef.current) glowRef.current.style.fill = orbGlow;
    if (coreRef.current) coreRef.current.style.fill = orbFill;
  });

  const filterId = useMemo(() => `tlc-${Math.round(illumination * 100)}`, [illumination]);

  return (
    <svg
      role="presentation"
      width={trackW}
      height={trackH}
      viewBox={`0 0 ${trackW} ${trackH}`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <filter id={`${filterId}-glow`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation={orbR * 0.9} />
        </filter>
        <clipPath id={`${filterId}-clip`}>
          <rect x={0} y={0} width={trackW} height={trackH} />
        </clipPath>
        <linearGradient id={`${filterId}-sea`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sea[0]} />
          <stop offset="100%" stopColor={sea[1]} />
        </linearGradient>
      </defs>

      {/* Water fill — outside wrapRef, persists through snap */}
      {fillPath && (
        <path
          d={fillPath}
          fill={`url(#${filterId}-sea)`}
          opacity={0.35}
          clipPath={`url(#${filterId}-clip)`}
        />
      )}
      <path d={wavePath} fill="none" stroke={waveStroke} strokeWidth={1.3} opacity={0.6} />

      {/* Endpoint ticks */}
      <line
        x1={0}
        y1={midY - 4}
        x2={0}
        y2={midY + 4}
        stroke={pillBorder}
        strokeWidth={0.7}
        opacity={0.35}
      />
      <line
        x1={trackW}
        y1={midY - 4}
        x2={trackW}
        y2={midY + 4}
        stroke={pillBorder}
        strokeWidth={0.7}
        opacity={0.35}
      />

      {/* Bioluminescent orb wrap group */}
      <g ref={wrapRef} style={{ opacity: orbOpacity, transition: 'opacity 2.0s ease-in-out' }}>
        <circle
          ref={glowRef}
          cx={orbX}
          cy={orbY}
          r={orbR * 2.2}
          style={{ fill: orbGlow }}
          opacity={0.28}
          filter={`url(#${filterId}-glow)`}
        />
        <circle ref={coreRef} cx={orbX} cy={orbY} r={orbR} style={{ fill: orbFill }} />
        <circle
          ref={specRef}
          cx={orbX - orbR * 0.28}
          cy={orbY - orbR * 0.32}
          r={orbR * 0.25}
          fill="rgba(200,225,255,0.42)"
        />
      </g>
    </svg>
  );
}

// ─── TideLunaCompact ─────────────────────────────────────────────────────────

export function TideLunaCompact({
  latitude,
  longitude,
  timezone,
  simulatedDate,
  showIllumination = true,
  showMoonrise = true,
  size: sizeName = 'md',
  className = '',
}: CompactLunaWidgetProps) {
  const size = SIZE_DIMS[sizeName as keyof typeof SIZE_DIMS] ?? SIZE_DIMS.md;

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
      lerpTideLunarPalette(
        TIDE_LUNAR_PALETTES[blend.phase],
        TIDE_LUNAR_PALETTES[blend.nextPhase],
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

  // Wave amplitude = MAX_COMPACT * palette.waveAmp
  const MAX_COMPACT = size.trackH * 0.32;
  const waveAmp = MAX_COMPACT * pal.waveAmp;

  return (
    <motion.div
      className={className}
      style={{
        position: 'relative',
        width: size.width,
        height: size.height,
        borderRadius: 2,
        overflow: 'hidden',
        border: `1px solid ${pal.pillBorder}`,
        boxShadow: `0 2px 18px rgba(0,0,0,0.50), 0 0 22px 3px ${pal.outerGlow}`,
        cursor: 'default',
        userSelect: 'none',
      }}
      animate={{
        background: `linear-gradient(160deg, ${pal.bg[0]} 0%, ${pal.bg[1]} 55%, ${pal.bg[2]} 100%)`,
      }}
      transition={{ duration: 1.2, ease: 'easeInOut' }}
    >
      {/* 3-row content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
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
          <motion.span
            style={{
              fontFamily: MONO,
              fontSize: size.labelSize + 1,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              lineHeight: 1,
              fontWeight: 500,
            }}
            animate={{ color: pal.textPrimary }}
            transition={{ duration: 1.2 }}
          >
            {pal.label}
          </motion.span>

          {showIllumination && (
            <motion.span
              style={{
                fontFamily: SANS,
                fontSize: size.labelSize,
                letterSpacing: '0.04em',
                fontWeight: 300,
                lineHeight: 1,
                opacity: 0.55,
              }}
              animate={{ color: pal.textPrimary }}
              transition={{ duration: 1.2 }}
            >
              {illumPct}%
            </motion.span>
          )}
        </div>

        <div style={{ height: gapY, flexShrink: 0 }} />

        {/* ── Row 2 — Bioluminescent wave track ── */}
        <div style={{ width: trackW, height: size.trackH, flexShrink: 0 }}>
          <LunaWaveTrack
            progress={progressTarget}
            trackW={trackW}
            trackH={size.trackH}
            orbFill={pal.orbFill}
            orbGlow={pal.orbGlow}
            waveStroke={pal.waveStroke}
            waveFill={pal.waveFill}
            pillBorder={pal.pillBorder}
            sea={pal.sea}
            waveAmp={waveAmp}
            illumination={lunarPos.illumination}
          />
        </div>

        <div style={{ height: gapY, flexShrink: 0 }} />

        {/* ── Row 3 — moonrise · sublabel · moonset ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: row3H,
            flexShrink: 0,
            opacity: showMoonrise ? 1 : 0,
            transition: 'opacity 0.8s ease-in-out',
          }}
        >
          <motion.span
            style={{
              fontFamily: MONO,
              fontSize: size.timeSize,
              letterSpacing: '0.12em',
              lineHeight: 1,
              opacity: 0.42,
            }}
            animate={{ color: pal.textSecondary }}
            transition={{ duration: 1.2 }}
          >
            ↑ {moonriseStr}
          </motion.span>
          <motion.span
            style={{
              fontFamily: SANS,
              fontSize: size.timeSize - 1,
              letterSpacing: '0.16em',
              lineHeight: 1,
              opacity: 0.3,
              textTransform: 'uppercase',
            }}
            animate={{ color: pal.textSecondary }}
            transition={{ duration: 1.2 }}
          >
            {pal.sublabel}
          </motion.span>
          <motion.span
            style={{
              fontFamily: MONO,
              fontSize: size.timeSize,
              letterSpacing: '0.12em',
              lineHeight: 1,
              opacity: 0.42,
            }}
            animate={{ color: pal.textSecondary }}
            transition={{ duration: 1.2 }}
          >
            ↓ {moonsetStr}
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
}
