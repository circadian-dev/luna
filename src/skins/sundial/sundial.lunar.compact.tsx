'use client';
// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/sundial/sundial.lunar.compact.tsx
// ════════════════════════════════════════════════════════════════════════════
/**
 * Sundial lunar compact widget.
 *
 * Three-row layout:
 *   Row 1 — Latin phase label (italic Palatino) + illumination % (right)
 *   Row 2 — ArcTrack in cold moonstone tones + gnomon shadow scaling with
 *            illumination (thin/invisible at new, full presence at full moon)
 *   Row 3 — moonrise (left) · Latin sublabel (center, italic) · moonset (right)
 *
 * Track treatment: the same ArcTrack from sundial.compact.tsx but:
 *   - Cold moonstone palette (no warm amber)
 *   - Gnomon shadow opacity = illumination × 0.45 (scales from 0 to max)
 *   - Orb glow and radius scale with illumination
 *   - Stars faintly visible in background (always night)
 *
 * No weather. Purely lunar.
 */

import { motion } from 'motion/react';
import { useEffect, useId, useMemo, useRef } from 'react';
import { type LunarPhase, useLunarPosition } from '../../hooks/useLunarPosition';
import type { CompactLunaWidgetProps } from '../types/luna-skin.types';
import { SUNDIAL_LUNAR_PALETTES, lerpSundialLunarPalette } from './sundial.lunar.component';

// ─── Sizes ────────────────────────────────────────────────────────────────────

const SIZE_DIMS = {
  sm: { width: 200, height: 72, px: 12, py: 10, trackH: 24, labelSize: 10, timeSize: 8 },
  md: { width: 240, height: 88, px: 14, py: 11, trackH: 28, labelSize: 11, timeSize: 9 },
  lg: { width: 280, height: 104, px: 16, py: 12, trackH: 34, labelSize: 12, timeSize: 10 },
};

const SERIF = "'Palatino Linotype','Palatino','Book Antiqua','Georgia',serif";
const SANS = "'Inter','SF Pro Display','Helvetica Neue',sans-serif";

// ─── Seeded random (stars) ────────────────────────────────────────────────────

function sr(s: number) {
  const x = Math.sin(s + 1) * 10000;
  return x - Math.floor(x);
}

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

// ─── Compact arc orb RAF ──────────────────────────────────────────────────────
// Identical to Sol sundial compact's useSundialOrbRaf, but adapted to Luna's
// moonProgress (no solar arc switching).

interface LunaArcOrbRefs {
  orbGroup: React.RefObject<SVGGElement>;
  shadowLine: React.RefObject<SVGLineElement>;
  wrap: React.RefObject<SVGGElement>;
}

function useSundialLunaCompactOrbRaf(
  refs: LunaArcOrbRefs,
  paramsRef: React.RefObject<{ trackW: number; baseY: number; arcHeight: number }>,
) {
  const curX = useRef(-1);
  const tgtX = useRef(0);
  const rafId = useRef<number | null>(null);
  const firstCall = useRef(true);
  const curP = useRef(0);
  const orbFading = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setWrapOpacity = (v: number) => {
    if (refs.wrap.current) refs.wrap.current.style.opacity = String(v);
  };

  const setPos = (x: number) => {
    const p = paramsRef.current;
    if (!p) return;
    const t = x / p.trackW;
    const y = p.baseY - p.arcHeight * 4 * t * (1 - t);
    refs.orbGroup.current?.setAttribute('transform', `translate(${x.toFixed(2)},${y.toFixed(2)})`);
    if (refs.shadowLine.current) {
      refs.shadowLine.current.setAttribute('x1', String(x.toFixed(2)));
      refs.shadowLine.current.setAttribute('x2', String(x.toFixed(2)));
      refs.shadowLine.current.setAttribute('y1', String(y.toFixed(2)));
    }
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
    const p = paramsRef.current;
    if (!p) return;
    const x = Math.max(0.01, Math.min(0.99, progress)) * p.trackW;
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

// ─── LunaArcTrack ─────────────────────────────────────────────────────────────
// Same arc track as Sol sundial compact but:
// - Cold moonstone palette
// - Gnomon shadow opacity = illumination × 0.45
// - Orb radius and glow scale with illumination

function LunaArcTrack({
  progress,
  trackW,
  trackH,
  orbFill,
  orbGlow,
  arcColor,
  tickColor,
  shadowColor,
  illumination,
}: {
  progress: number;
  trackW: number;
  trackH: number;
  orbFill: string;
  orbGlow: string;
  arcColor: string;
  tickColor: string;
  shadowColor: string;
  illumination: number;
}) {
  const baseY = trackH - 5;
  const topY = trackH * 0.06;
  const arcHeight = baseY - topY;
  const orbR = trackH * 0.18 * (0.55 + illumination * 0.45); // scale with illumination

  const arcPath = Array.from({ length: 80 }, (_, i) => {
    const t = i / 79;
    const x = t * trackW;
    const y = baseY - arcHeight * 4 * t * (1 - t);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const progress01 = Math.max(0.01, Math.min(0.99, progress));
  const initOrbX = progress01 * trackW;
  const initOrbY = baseY - arcHeight * 4 * progress01 * (1 - progress01);
  const orbOpacity = Math.max(0.06, illumination * 0.94 + 0.06);
  const gnomonOpacity = illumination * 0.45;

  const orbGroupRef = useRef<SVGGElement>(null);
  const wrapGRef = useRef<SVGGElement>(null);
  const shadowLineRef = useRef<SVGLineElement>(null);
  const paramsRef = useRef({ trackW, baseY, arcHeight });
  useEffect(() => {
    paramsRef.current = { trackW, baseY, arcHeight };
  });

  const { setTarget } = useSundialLunaCompactOrbRaf(
    { orbGroup: orbGroupRef, shadowLine: shadowLineRef, wrap: wrapGRef },
    paramsRef,
  );
  useEffect(() => {
    setTarget(progress);
  });

  // Keep fill colors in sync
  useEffect(() => {
    for (const el of orbGroupRef.current?.querySelectorAll<SVGCircleElement>('[data-orb-fill]') ??
      []) {
      el.style.fill = orbFill;
    }
    for (const el of orbGroupRef.current?.querySelectorAll<SVGCircleElement>('[data-orb-glow]') ??
      []) {
      el.style.fill = orbGlow;
    }
  });

  const filterId = `sdl${useId().replace(/:/g, '')}`;
  const ROMAN_TICKS = ['VI', 'IX', 'XII', 'III', 'VI'];

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
        <filter id={`${filterId}-glow`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation={orbR * 0.9} />
        </filter>
      </defs>

      {/* Baseline */}
      <line
        x1={0}
        y1={baseY}
        x2={trackW}
        y2={baseY}
        stroke={arcColor}
        strokeWidth={0.8}
        opacity={0.45}
      />

      {/* Arc */}
      <path d={arcPath} fill="none" stroke={arcColor} strokeWidth={1.0} opacity={0.5} />

      {/* Roman numeral ticks */}
      {ROMAN_TICKS.map((label, i) => {
        const tx = (i / 4) * trackW;
        const ty_arc = baseY - arcHeight * 4 * (i / 4) * (1 - i / 4);
        return (
          <g key={label}>
            <line
              x1={tx}
              y1={ty_arc - 3}
              x2={tx}
              y2={ty_arc + 3}
              stroke={tickColor}
              strokeWidth={0.6}
              opacity={0.3}
            />
            <text
              x={tx}
              y={baseY + 7}
              textAnchor="middle"
              fontSize={5}
              fontFamily={SERIF}
              fill={tickColor}
              opacity={0.3}
              letterSpacing="0.05em"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Gnomon shadow — outside wrapGRef, scales with illumination */}
      <line
        ref={shadowLineRef}
        x1={initOrbX}
        y1={initOrbY}
        x2={initOrbX}
        y2={baseY}
        stroke={shadowColor}
        strokeWidth={1.0}
        strokeDasharray="1 2"
        opacity={gnomonOpacity}
        style={{ transition: 'opacity 2.0s ease-in-out' }}
      />

      {/* Orb wrap group */}
      <g ref={wrapGRef} style={{ opacity: orbOpacity, transition: 'opacity 2.0s ease-in-out' }}>
        <g ref={orbGroupRef} transform={`translate(${initOrbX.toFixed(1)},${initOrbY.toFixed(1)})`}>
          <circle
            data-orb-glow
            cx={0}
            cy={0}
            r={orbR * 2.0}
            style={{ fill: orbGlow }}
            opacity={0.25}
            filter={`url(#${filterId}-glow)`}
          />
          <circle data-orb-fill cx={0} cy={0} r={orbR} style={{ fill: orbFill }} />
          {/* Cool specular */}
          <circle
            cx={-orbR * 0.3}
            cy={-orbR * 0.35}
            r={orbR * 0.22}
            fill="rgba(200,210,240,0.35)"
          />
        </g>
      </g>
    </svg>
  );
}

// ─── SundialLunaCompact ───────────────────────────────────────────────────────

export function SundialLunaCompact({
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
      lerpSundialLunarPalette(
        SUNDIAL_LUNAR_PALETTES[blend.phase],
        SUNDIAL_LUNAR_PALETTES[blend.nextPhase],
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
  const gapY = Math.max(1, Math.floor((innerH - row1H - size.trackH - row3H) / 2));

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
        boxShadow: `0 2px 16px rgba(0,0,0,0.42), 0 0 18px 2px ${pal.outerGlow}`,
        cursor: 'default',
        userSelect: 'none',
      }}
      animate={{
        background: `linear-gradient(145deg, ${pal.bg[0]} 0%, ${pal.bg[1]} 55%, ${pal.bg[2]} 100%)`,
      }}
      transition={{ duration: 1.8, ease: 'easeInOut' }}
    >
      {/* Stone luster — cool silver-blue */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 55% 50% at 35% 30%, ${pal.luster} 0%, transparent 70%)`,
          transition: 'background 1.8s ease-in-out',
        }}
      />

      {/* Faint stars — always night */}
      {pal.starOpacity > 0.04 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
          {Array.from({ length: 6 }, (_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static generated stars
              key={i}
              className="absolute rounded-full"
              style={{
                width: sr(i * 7) * 1.2 + 0.5,
                height: sr(i * 7) * 1.2 + 0.5,
                left: `${sr(i * 11 + 3) * 90}%`,
                top: `${sr(i * 13 + 5) * 35}%`,
                background: pal.textSecondary,
                opacity: pal.starOpacity * (0.4 + sr(i * 3) * 0.6),
              }}
            />
          ))}
        </div>
      )}

      {/* 3-row content */}
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
          <motion.span
            style={{
              fontFamily: SERIF,
              fontSize: size.labelSize + 1,
              letterSpacing: '0.10em',
              fontStyle: 'italic',
              lineHeight: 1,
              fontWeight: 400,
            }}
            animate={{ color: pal.textPrimary }}
            transition={{ duration: 1.8 }}
          >
            {pal.labelLatin}
          </motion.span>

          {showIllumination && (
            <motion.span
              style={{
                fontFamily: SERIF,
                fontStyle: 'italic',
                fontSize: size.labelSize,
                lineHeight: 1,
                fontWeight: 400,
                opacity: 0.55,
              }}
              animate={{ color: pal.textSecondary }}
              transition={{ duration: 1.8 }}
            >
              {illumPct}%
            </motion.span>
          )}
        </div>

        <div style={{ height: gapY, flexShrink: 0 }} />

        {/* ── Row 2 — Luna arc track ── */}
        <div style={{ width: trackW, height: size.trackH, flexShrink: 0 }}>
          <LunaArcTrack
            progress={progressTarget}
            trackW={trackW}
            trackH={size.trackH}
            orbFill={pal.orbFill}
            orbGlow={pal.orbGlow}
            arcColor={pal.arcColor}
            tickColor={pal.tickColor}
            shadowColor={pal.shadowColor}
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
              fontFamily: SANS,
              fontSize: size.timeSize,
              letterSpacing: '0.08em',
              lineHeight: 1,
              opacity: 0.38,
            }}
            animate={{ color: pal.textSecondary }}
            transition={{ duration: 1.8 }}
          >
            {moonriseStr}
          </motion.span>
          <motion.span
            style={{
              fontFamily: SERIF,
              fontStyle: 'italic',
              fontSize: size.timeSize - 1,
              letterSpacing: '0.06em',
              lineHeight: 1,
              opacity: 0.28,
              textAlign: 'center',
            }}
            animate={{ color: pal.textSecondary }}
            transition={{ duration: 1.8 }}
          >
            {pal.sublabel}
          </motion.span>
          <motion.span
            style={{
              fontFamily: SANS,
              fontSize: size.timeSize,
              letterSpacing: '0.08em',
              lineHeight: 1,
              opacity: 0.38,
            }}
            animate={{ color: pal.textSecondary }}
            transition={{ duration: 1.8 }}
          >
            {moonsetStr}
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
}
