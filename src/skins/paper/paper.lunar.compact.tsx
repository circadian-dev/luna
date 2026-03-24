'use client';
// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/paper/paper.lunar.compact.tsx
// ════════════════════════════════════════════════════════════════════════════
/**
 * Paper lunar compact widget.
 *
 * Three-row layout:
 *   Row 1 — phase label (italic serif) + illumination % (right, monospace)
 *   Row 2 — ink wash track with soft silver ink blot orb
 *   Row 3 — moonrise (left) · phase sublabel (center, italic) · moonset (right)
 *
 * Track treatment: the same InkWashTrack aesthetic from paper.compact.tsx but
 * in cold silver tones. The watercolor wash behind the orb represents the
 * "silver light already shed on the paper." The ink blot scales with
 * illumination — at new moon it's a ghost; at full moon a luminous bloom.
 * The dashed baseline runs full width always.
 *
 * No weather. Purely lunar.
 */

import { motion } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import { type LunarPhase, useLunarPosition } from '../../hooks/useLunarPosition';
import type { CompactLunaWidgetProps } from '../types/luna-skin.types';
import { PAPER_LUNAR_PALETTES, lerpPaperLunarPalette } from './paper.lunar.component';

// ─── Sizes ────────────────────────────────────────────────────────────────────

const SIZE_DIMS = {
  sm: { width: 200, height: 72, px: 12, py: 10, trackH: 20, labelSize: 10, timeSize: 8 },
  md: { width: 240, height: 88, px: 14, py: 11, trackH: 24, labelSize: 11, timeSize: 9 },
  lg: { width: 280, height: 104, px: 16, py: 12, trackH: 28, labelSize: 12, timeSize: 10 },
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

// ─── Grain SVG ────────────────────────────────────────────────────────────────

const GRAIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='240' height='240' filter='url(#n)' opacity='1'/></svg>`;
const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}")`;

// ─── Paper luna compact orb RAF ───────────────────────────────────────────────
// Tracks progress separately from pixel X for circular-distance detection.
// The watercolor wash (washRef) stays outside the wrap group — it represents
// the "silver light already shed" and persists through snap transitions.

function usePaperLunaCompactOrbRaf(
  refs: {
    washEl: React.RefObject<SVGEllipseElement>;
    featherEl: React.RefObject<SVGEllipseElement>;
    outerBlob: React.RefObject<SVGCircleElement>;
    coreBlob: React.RefObject<SVGCircleElement>;
    wrapG: React.RefObject<SVGGElement>;
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

  const setPos = (x: number) => {
    // Wash trails behind — represents history
    refs.washEl.current?.setAttribute('cx', String(x / 2));
    refs.washEl.current?.setAttribute('rx', String(Math.max(0, x / 2)));
    refs.featherEl.current?.setAttribute('cx', String(x));
    refs.outerBlob.current?.setAttribute('cx', String(x));
    refs.coreBlob.current?.setAttribute('cx', String(x));
  };

  const setWrapOpacity = (v: number) => {
    if (refs.wrapG.current) refs.wrapG.current.style.opacity = String(v);
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

// ─── SilverInkWashTrack ───────────────────────────────────────────────────────
// Cold silver ink wash on dark paper. Orb scales with illumination.

function SilverInkWashTrack({
  trackW,
  trackH,
  inkOrb,
  inkBloom,
  accentColor,
  pillBorder,
  illumination,
  isVisible,
  progress,
}: {
  trackW: number;
  trackH: number;
  inkOrb: string;
  inkBloom: string;
  accentColor: string;
  pillBorder: string;
  illumination: number;
  isVisible: boolean;
  progress: number;
}) {
  const orbOpacity = isVisible ? Math.max(0.06, illumination * 0.94 + 0.06) : 0;
  const orbR = trackH * 0.45 * (0.5 + illumination * 0.5);
  const lineY = trackH / 2 + trackH * 0.05;
  const initX = Math.max(0.01, Math.min(0.99, progress)) * trackW;

  const washRef = useRef<SVGEllipseElement>(null);
  const featherRef = useRef<SVGEllipseElement>(null);
  const outerRef = useRef<SVGCircleElement>(null);
  const coreRef = useRef<SVGCircleElement>(null);
  const wrapRef = useRef<SVGGElement>(null);

  const { setTarget } = usePaperLunaCompactOrbRaf(
    {
      washEl: washRef,
      featherEl: featherRef,
      outerBlob: outerRef,
      coreBlob: coreRef,
      wrapG: wrapRef,
    },
    trackW,
  );

  useEffect(() => {
    setTarget(progress);
  });
  useEffect(() => {
    if (outerRef.current) outerRef.current.style.fill = inkBloom;
    if (coreRef.current) coreRef.current.style.fill = inkOrb;
  });

  // linearGradient for wash — needs unique id per instance
  const gradId = `slw-${Math.round(illumination * 100)}`;

  return (
    <svg
      role="presentation"
      aria-hidden
      width={trackW}
      height={trackH}
      viewBox={`0 0 ${trackW} ${trackH}`}
      style={{ overflow: 'hidden' }}
    >
      <defs>
        <filter id={`${gradId}-blob`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <filter id={`${gradId}-core`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        <linearGradient
          id={`${gradId}-wash`}
          x1="0"
          y1="0"
          x2="1"
          y2="0"
          gradientUnits="objectBoundingBox"
        >
          <stop offset="0%" stopColor={accentColor} stopOpacity={0.05} />
          <stop offset="60%" stopColor={accentColor} stopOpacity={0.2} />
          <stop offset="100%" stopColor={accentColor} stopOpacity={0.45} />
        </linearGradient>
      </defs>

      {/* Dashed baseline — the moon's paper track */}
      <line
        x1={0}
        y1={lineY}
        x2={trackW}
        y2={lineY}
        stroke={pillBorder}
        strokeWidth={0.6}
        strokeDasharray="3 4"
        opacity={0.45}
      />

      {/* Silver watercolor wash — history of moonlight on paper */}
      <ellipse
        ref={washRef}
        cx={initX / 2}
        cy={lineY - trackH * 0.1}
        rx={Math.max(0, initX / 2)}
        ry={trackH * 0.32}
        fill={`url(#${gradId}-wash)`}
        opacity={0.65 * illumination + 0.05}
        style={{ filter: 'blur(1px)' }}
      />

      {/* Feather — ink spreading outward */}
      <ellipse
        ref={featherRef}
        cx={initX}
        cy={lineY}
        rx={orbR * 0.8}
        ry={trackH * 0.2}
        fill={inkBloom}
        opacity={0.15 * illumination}
        style={{ filter: 'blur(3px)' }}
      />

      {/* Ink blot wrap — fades on wrap-around */}
      <g ref={wrapRef} style={{ opacity: orbOpacity, transition: 'opacity 1.2s ease-in-out' }}>
        <circle
          ref={outerRef}
          cx={initX}
          cy={lineY - trackH * 0.15}
          r={orbR * 1.2}
          opacity={0.28}
          filter={`url(#${gradId}-blob)`}
          style={{ fill: inkBloom }}
        />
        <circle
          ref={coreRef}
          cx={initX}
          cy={lineY - trackH * 0.15}
          r={orbR * 0.48}
          opacity={0.7}
          filter={`url(#${gradId}-core)`}
          style={{ fill: inkOrb, mixBlendMode: 'screen' } as React.CSSProperties}
        />
      </g>

      {/* Endpoint ticks */}
      <line
        x1={1}
        y1={lineY - 4}
        x2={1}
        y2={lineY + 2}
        stroke={pillBorder}
        strokeWidth={0.6}
        opacity={0.4}
      />
      <line
        x1={trackW - 1}
        y1={lineY - 4}
        x2={trackW - 1}
        y2={lineY + 2}
        stroke={pillBorder}
        strokeWidth={0.6}
        opacity={0.4}
      />
    </svg>
  );
}

// ─── PaperLunaCompact ─────────────────────────────────────────────────────────

export function PaperLunaCompact({
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
  const SERIF = "'Georgia','Times New Roman',serif";
  const MONO = "'Courier New', monospace";

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
      lerpPaperLunarPalette(
        PAPER_LUNAR_PALETTES[blend.phase],
        PAPER_LUNAR_PALETTES[blend.nextPhase],
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
    <motion.div
      className={className}
      style={{
        position: 'relative',
        width: size.width,
        height: size.height,
        borderRadius: 6,
        overflow: 'hidden',
        border: `1px solid ${pal.pillBorder}`,
        boxShadow: `0 2px 16px rgba(0,0,0,0.40), 0 0 20px 4px ${pal.inkBloom}`,
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      {/* z=0 Dark paper background */}
      <motion.div
        style={{ position: 'absolute', inset: 0 }}
        animate={{ background: `linear-gradient(135deg, ${pal.bg[0]} 0%, ${pal.bg[1]} 100%)` }}
        transition={{ duration: 1.4, ease: 'easeInOut' }}
      />

      {/* z=1 Grain texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          backgroundImage: GRAIN_URL,
          backgroundRepeat: 'repeat',
          backgroundSize: '240px 240px',
          mixBlendMode: 'overlay',
          opacity: pal.grain,
          pointerEvents: 'none',
          borderRadius: 6,
        }}
      />

      {/* z=2 Letterpress top rule */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          zIndex: 2,
          background: `linear-gradient(to right, transparent, ${pal.accentColor}30, transparent)`,
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
          <motion.span
            style={{
              fontFamily: SERIF,
              fontStyle: 'italic',
              fontSize: size.labelSize + 1,
              letterSpacing: '0.01em',
              lineHeight: 1,
              fontWeight: 400,
            }}
            animate={{ color: pal.textPrimary }}
            transition={{ duration: 1.4 }}
          >
            {pal.label}
          </motion.span>

          {showIllumination && (
            <motion.span
              style={{
                fontFamily: MONO,
                fontSize: size.labelSize,
                letterSpacing: '0.04em',
                fontWeight: 400,
                lineHeight: 1,
                opacity: 0.42,
              }}
              animate={{ color: pal.textSecondary }}
              transition={{ duration: 1.4 }}
            >
              {illumPct}%
            </motion.span>
          )}
        </div>

        <div style={{ height: gapY, flexShrink: 0 }} />

        {/* ── Row 2 — Silver ink wash track ── */}
        <div style={{ width: trackW, height: size.trackH, flexShrink: 0 }}>
          <SilverInkWashTrack
            trackW={trackW}
            trackH={size.trackH}
            inkOrb={pal.inkOrb}
            inkBloom={pal.inkBloom}
            accentColor={pal.accentColor}
            pillBorder={pal.pillBorder}
            illumination={lunarPos.illumination}
            isVisible={lunarPos.isVisible}
            progress={progressTarget}
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
            transition: 'opacity 0.6s ease-in-out',
          }}
        >
          <motion.span
            style={{
              fontFamily: MONO,
              fontSize: size.timeSize,
              letterSpacing: '0.06em',
              lineHeight: 1,
              opacity: 0.38,
            }}
            animate={{ color: pal.textSecondary }}
            transition={{ duration: 1.4 }}
          >
            {moonriseStr}
          </motion.span>
          <motion.span
            style={{
              fontFamily: SERIF,
              fontStyle: 'italic',
              fontSize: size.timeSize - 1,
              letterSpacing: '0.04em',
              lineHeight: 1,
              opacity: 0.3,
              textAlign: 'center',
            }}
            animate={{ color: pal.textSecondary }}
            transition={{ duration: 1.4 }}
          >
            {pal.sublabel}
          </motion.span>
          <motion.span
            style={{
              fontFamily: MONO,
              fontSize: size.timeSize,
              letterSpacing: '0.06em',
              lineHeight: 1,
              opacity: 0.38,
            }}
            animate={{ color: pal.textSecondary }}
            transition={{ duration: 1.4 }}
          >
            {moonsetStr}
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
}
