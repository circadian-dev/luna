'use client';
// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/parchment/parchment.lunar.compact.tsx
// ════════════════════════════════════════════════════════════════════════════
/**
 * Parchment lunar compact widget.
 *
 * Three-row layout:
 *   Row 1 — moon illustration (left) + Latin phase name + illumination % (right)
 *   Row 2 — Notion-style flat track: 1px ink ruling + small ink dot
 *   Row 3 — moonrise (left) · Latin sublabel (center, italic) · moonset (right)
 *
 * Track treatment: identical to Sol parchment's NotionTrack but the fill
 * rect and dot are sepia ink (INK_MED / INK_GHOST) on warm vellum.
 * The dot scales very slightly with illumination (5–6.5px) but never blooms.
 *
 * No weather. Purely lunar. Grain texture on background.
 */

import { motion } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import { type LunarPhase, useLunarPosition } from '../../hooks/useLunarPosition';
import type { CompactLunaWidgetProps } from '../types/luna-skin.types';
import {
  ManuscriptMoonIcon,
  PARCHMENT_LUNAR_PALETTES,
  lerpParchmentLunarPalette,
} from './parchment.lunar.component';

// ─── Ink tokens (duplicated to avoid importing from component) ────────────────

const INK = 'rgba(45,35,20,1)';
const INK_MED = 'rgba(45,35,20,0.65)';
const INK_LIGHT = 'rgba(45,35,20,0.42)';
const INK_GHOST = 'rgba(45,35,20,0.22)';
const INK_BORDER = 'rgba(45,35,20,0.10)';
const INK_BORDER_MED = 'rgba(45,35,20,0.18)';
const INK_FILL = 'rgba(45,35,20,0.05)';
const VELLUM_FONT = `"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif`;
const GRAIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='v'><feTurbulence type='fractalNoise' baseFrequency='0.62' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(#v)' opacity='1'/></svg>`;
const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}")`;

// ─── Sizes ────────────────────────────────────────────────────────────────────

const SIZE_DIMS = {
  sm: { width: 200, height: 72, px: 12, py: 10, trackH: 16, labelSize: 10, timeSize: 8 },
  md: { width: 240, height: 88, px: 14, py: 11, trackH: 18, labelSize: 11, timeSize: 9 },
  lg: { width: 280, height: 104, px: 16, py: 12, trackH: 22, labelSize: 12, timeSize: 10 },
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

// ─── Parchment luna compact orb RAF ──────────────────────────────────────────
// Simple ink dot RAF — tracks progress, detects wrap, fades + snaps.

function useParchmentLunaCompactOrbRaf(
  refs: {
    orbDot: React.RefObject<SVGCircleElement>;
    fillRect: React.RefObject<SVGRectElement>;
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

  const setX = (x: number) => {
    refs.orbDot.current?.setAttribute('cx', String(x));
    if (refs.fillRect.current) refs.fillRect.current.setAttribute('width', String(Math.max(0, x)));
  };

  const setWrapOpacity = (v: number) => {
    if (refs.wrapG.current) refs.wrapG.current.style.opacity = String(v);
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

// ─── VellumTrack ──────────────────────────────────────────────────────────────
// Identical to Sol parchment's NotionTrack but with warm sepia tokens.
// Dot scales very slightly with illumination.

function VellumTrack({
  progress,
  trackW,
  trackH,
  illumination,
  orbOpacity,
}: {
  progress: number;
  trackW: number;
  trackH: number;
  illumination: number;
  orbOpacity: number;
}) {
  const orbR = 4 + illumination * 1.5;
  const lineY = trackH / 2;
  const initX = Math.max(0.01, Math.min(0.99, progress)) * trackW;

  const orbDotRef = useRef<SVGCircleElement>(null);
  const fillRef = useRef<SVGRectElement>(null);
  const wrapGRef = useRef<SVGGElement>(null);

  const { setTarget } = useParchmentLunaCompactOrbRaf(
    { orbDot: orbDotRef, fillRect: fillRef, wrapG: wrapGRef },
    trackW,
  );

  useEffect(() => {
    setTarget(progress);
  });
  useEffect(() => {
    orbDotRef.current?.setAttribute('r', String(orbR));
  });

  return (
    <svg
      role="presentation"
      aria-hidden
      width={trackW}
      height={trackH}
      viewBox={`0 0 ${trackW} ${trackH}`}
      style={{ overflow: 'visible' }}
    >
      {/* Quarter tick marks — like chapter markers on a scroll */}
      {[0.25, 0.5, 0.75].map((p) => (
        <line
          key={p}
          x1={p * trackW}
          y1={lineY - 3}
          x2={p * trackW}
          y2={lineY + 3}
          stroke={INK_BORDER}
          strokeWidth={0.8}
        />
      ))}

      {/* Ink ruling */}
      <line
        x1={0}
        y1={lineY}
        x2={trackW}
        y2={lineY}
        stroke={INK_BORDER_MED}
        strokeWidth={1}
        strokeLinecap="round"
      />

      {/* Fill — light ink wash showing progress */}
      <rect ref={fillRef} x={0} y={lineY - 0.5} width={initX} height={1} fill={INK_GHOST} />

      {/* Ink dot — the moon's current position */}
      <g ref={wrapGRef} style={{ opacity: orbOpacity, transition: 'opacity 1.2s ease-in-out' }}>
        <circle ref={orbDotRef} cx={initX} cy={lineY} r={orbR} fill={INK_MED} />
      </g>
    </svg>
  );
}

// ─── ParchmentLunaCompact ─────────────────────────────────────────────────────

export function ParchmentLunaCompact({
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
      lerpParchmentLunarPalette(
        PARCHMENT_LUNAR_PALETTES[blend.phase],
        PARCHMENT_LUNAR_PALETTES[blend.nextPhase],
        blend.t,
      ),
    [blend],
  );

  const moonriseStr = fmtMinutes(lunarPos.moonriseMinutes);
  const moonsetStr = fmtMinutes(lunarPos.moonsetMinutes);
  const illumPct = Math.round(lunarPos.illumination * 100);

  const progressTarget = Math.max(0.01, Math.min(0.99, lunarPos.moonProgress));

  const orbOpacity = lunarPos.isVisible ? Math.max(0.06, lunarPos.illumination * 0.94 + 0.06) : 0;

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
        border: `1px solid ${INK_BORDER_MED}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        cursor: 'default',
        userSelect: 'none',
      }}
      animate={{
        background: `linear-gradient(160deg, ${pal.bg[0]} 0%, ${pal.bg[1]} 55%, ${pal.bg[2]} 100%)`,
      }}
      transition={{ duration: 1.8, ease: 'easeInOut' }}
    >
      {/* Grain texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: GRAIN_URL,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
          mixBlendMode: 'multiply',
          opacity: pal.grain,
          pointerEvents: 'none',
          transition: 'opacity 1.8s ease-in-out',
        }}
      />

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
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Moon diagram */}
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                width: size.labelSize + 2,
                height: size.labelSize + 2,
                flexShrink: 0,
              }}
            >
              <ManuscriptMoonIcon phase={lunarPos.phase} size={size.labelSize + 2} />
            </span>

            <span
              style={{
                fontFamily: VELLUM_FONT,
                fontSize: size.labelSize,
                fontWeight: 600,
                color: INK,
                letterSpacing: '0.02em',
                lineHeight: 1,
              }}
            >
              {pal.labelLatin}
            </span>
          </div>

          {showIllumination && (
            <span
              style={{
                fontFamily: VELLUM_FONT,
                fontSize: size.labelSize,
                fontWeight: 400,
                color: INK_LIGHT,
                letterSpacing: '-0.01em',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              }}
            >
              {illumPct}%
            </span>
          )}
        </div>

        <div style={{ height: gapY, flexShrink: 0 }} />

        {/* ── Row 2 — Vellum track ── */}
        <div style={{ width: trackW, height: size.trackH, flexShrink: 0 }}>
          <VellumTrack
            progress={progressTarget}
            trackW={trackW}
            trackH={size.trackH}
            illumination={lunarPos.illumination}
            orbOpacity={orbOpacity}
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
          <span
            style={{
              fontFamily: VELLUM_FONT,
              fontSize: size.timeSize,
              color: INK_GHOST,
              letterSpacing: '0.06em',
              lineHeight: 1,
            }}
          >
            ↑ {moonriseStr}
          </span>
          <span
            style={{
              fontFamily: VELLUM_FONT,
              fontStyle: 'italic',
              fontSize: size.timeSize - 1,
              color: INK_GHOST,
              letterSpacing: '0.04em',
              lineHeight: 1,
              opacity: 0.8,
            }}
          >
            {pal.sublabelLatin}
          </span>
          <span
            style={{
              fontFamily: VELLUM_FONT,
              fontSize: size.timeSize,
              color: INK_GHOST,
              letterSpacing: '0.06em',
              lineHeight: 1,
            }}
          >
            ↓ {moonsetStr}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
