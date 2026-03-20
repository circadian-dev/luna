'use client';
// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/signal/signal.lunar.compact.tsx
// ════════════════════════════════════════════════════════════════════════════
/**
 * Signal lunar compact widget.
 *
 * Three-row layout:
 *   Row 1 — pixel moon (left) + phase code + illumination % (right)
 *   Row 2 — block segment track (filled blocks = illumination %)
 *            + reticle at moonProgress position
 *   Row 3 — MR:HH:MM · (location) · MS:HH:MM
 *
 * Track treatment: identical TerminalTrack from signal.compact.tsx but
 * blocks filled = illumination (not dayProgress). Full moon = all blocks.
 * New moon = all empty. The reticle still tracks moonProgress on the arc.
 *
 * No weather. No temperature. Purely lunar.
 */

import { motion } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import { type LunarPhase, useLunarPosition } from '../../hooks/useLunarPosition';
import type { CompactLunaWidgetProps } from '../types/luna-skin.types';
import { PixelMoon, SIGNAL_LUNAR_PALETTES, lerpSignalLunarPalette } from './signal.lunar.component';
import { Reticle } from './signal.reticle';

// ─── Sizes ────────────────────────────────────────────────────────────────────

const SIZE_DIMS = {
  sm: { width: 200, height: 72, px: 10, py: 9, trackH: 18, labelSize: 9, timeSize: 8, segs: 14 },
  md: { width: 240, height: 88, px: 12, py: 10, trackH: 22, labelSize: 10, timeSize: 9, segs: 16 },
  lg: {
    width: 280,
    height: 104,
    px: 14,
    py: 11,
    trackH: 26,
    labelSize: 11,
    timeSize: 10,
    segs: 18,
  },
};

const MONO = "'JetBrains Mono','Fira Code','Cascadia Code','Menlo',monospace";

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

// ─── Signal luna compact orb RAF ─────────────────────────────────────────────
// Identical pattern to signal.compact.tsx — tracks progress, detects wrap.

function useSignalLunaCompactOrbRaf(refs: {
  group: React.RefObject<SVGGElement>;
  halo: React.RefObject<SVGCircleElement>;
  wrapG: React.RefObject<SVGGElement>;
}) {
  const curX = useRef(-1);
  const curP = useRef(-1);
  const tgtX = useRef(0);
  const rafId = useRef<number | null>(null);
  const firstCall = useRef(true);
  const orbFading = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setWrapOpacity = (v: number) => {
    if (refs.wrapG.current) refs.wrapG.current.style.opacity = String(v);
  };

  const setPos = (x: number, midY: number) => {
    refs.group.current?.setAttribute('transform', `translate(${x}, ${midY})`);
    refs.halo.current?.setAttribute('cx', String(x));
  };

  const anim = (midY: number) => {
    const diff = tgtX.current - curX.current;
    if (Math.abs(diff) > 0.15) {
      curX.current += diff * 0.12;
      setPos(curX.current, midY);
      rafId.current = requestAnimationFrame(() => anim(midY));
    } else {
      curX.current = tgtX.current;
      setPos(curX.current, midY);
      rafId.current = null;
    }
  };

  const setTarget = (x: number, midY: number, progress: number) => {
    tgtX.current = x;

    if (firstCall.current) {
      firstCall.current = false;
      curX.current = x;
      curP.current = progress;
      setPos(x, midY);
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
        setPos(x, midY);
        setWrapOpacity(1);
        orbFading.current = false;
        fadeTimer.current = null;
        if (!rafId.current) rafId.current = requestAnimationFrame(() => anim(midY));
      }, 160);
    } else if (!orbFading.current) {
      if (!rafId.current) rafId.current = requestAnimationFrame(() => anim(midY));
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

// ─── LunarTerminalTrack ───────────────────────────────────────────────────────
// Block segments — FILLED based on illumination (not dayProgress).
// Reticle position — based on moonProgress.

function LunarTerminalTrack({
  trackW,
  trackH,
  segs,
  accent,
  accentDim,
  illumination,
  moonProgress,
  groupRef,
  haloRef,
  wrapGRef,
}: {
  trackW: number;
  trackH: number;
  segs: number;
  accent: string;
  accentDim: string;
  illumination: number;
  moonProgress: number;
  groupRef: React.RefObject<SVGGElement>;
  haloRef: React.RefObject<SVGCircleElement>;
  wrapGRef: React.RefObject<SVGGElement>;
}) {
  const midY = trackH / 2;
  const orbR = (trackH * 0.55) / 2;
  const segW = trackW / segs;
  // Blocks filled = illumination percentage
  const filled = Math.round(illumination * segs);
  // Reticle position = moonProgress
  const initX = Math.max(0.01, Math.min(0.99, moonProgress)) * trackW;

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
        <filter id="slc-halo" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {/* Block segments — illumination-based fill, outside wrapGRef */}
      {Array.from({ length: segs }, (_, i) => {
        const x = i * segW;
        const isFilled = i < filled;
        const segH = isFilled ? trackH * 0.55 : trackH * 0.4;
        return (
          <rect
            key={`seg-${x}`}
            x={x + 0.5}
            y={midY - segH / 2}
            width={segW - 1.5}
            height={segH}
            fill={isFilled ? accent : 'none'}
            stroke={isFilled ? 'none' : accentDim}
            strokeWidth={0.5}
            opacity={isFilled ? 0.85 : 0.2}
            rx={0.5}
          />
        );
      })}

      {/* Reticle wrap group — fades on wrap-around */}
      <g ref={wrapGRef} style={{ transition: 'opacity 0.9s ease-in-out' }}>
        <circle
          ref={haloRef}
          cx={initX}
          cy={midY}
          r={orbR * 1.5}
          fill={accent}
          opacity={0.18}
          filter="url(#slc-halo)"
        />
        <g ref={groupRef} transform={`translate(${initX}, ${midY})`}>
          <Reticle accent={accent} size={orbR * 0.85} />
        </g>
      </g>
    </svg>
  );
}

// ─── SignalLunaCompact ────────────────────────────────────────────────────────

export function SignalLunaCompact({
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
      lerpSignalLunarPalette(
        SIGNAL_LUNAR_PALETTES[blend.phase],
        SIGNAL_LUNAR_PALETTES[blend.nextPhase],
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
  const midY = size.trackH / 2;
  const initX = progressTarget * trackW;
  const row1H = size.labelSize + 2;
  const row3H = size.timeSize + 2;
  const innerH = size.height - size.py * 2;
  const gapY = Math.max(2, Math.floor((innerH - row1H - size.trackH - row3H) / 2));

  const wrapGRef = useRef<SVGGElement>(null);
  const haloRef = useRef<SVGCircleElement>(null);
  const groupRef = useRef<SVGGElement>(null);

  const { setTarget } = useSignalLunaCompactOrbRaf({
    group: groupRef,
    halo: haloRef,
    wrapG: wrapGRef,
  });

  useEffect(() => {
    setTarget(progressTarget * trackW, midY, progressTarget);
  });

  // Keep reticle accent in sync
  useEffect(() => {
    if (groupRef.current) {
      for (const el of groupRef.current.querySelectorAll<SVGElement>('circle, line')) {
        if (el.getAttribute('stroke') && el.getAttribute('stroke') !== 'none') {
          el.setAttribute('stroke', pal.accent);
        }
      }
    }
    if (haloRef.current) haloRef.current.style.fill = pal.accent;
  });

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: size.width,
        height: size.height,
        borderRadius: 2,
        overflow: 'hidden',
        background: pal.bg[0],
        border: `1px solid ${pal.pillBorder}`,
        boxShadow: `0 0 0 1px ${pal.accentDim}, 0 4px 24px rgba(0,0,0,0.65), 0 0 20px 2px ${pal.accentDim}`,
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      {/* Scanlines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 1px, rgba(0,0,0,0.10) 1px, rgba(0,0,0,0.10) 2px)',
          backgroundSize: '100% 2px',
        }}
      />

      {/* Top accent line */}
      <motion.div
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, zIndex: 2 }}
        animate={{
          background: `linear-gradient(to right, transparent, ${pal.accent}, transparent)`,
        }}
        transition={{ duration: 0.8 }}
      />

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Pixel moon */}
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                width: size.labelSize + 2,
                height: size.labelSize + 2,
                flexShrink: 0,
              }}
            >
              <PixelMoon
                phase={lunarPos.phase}
                accent={pal.accent}
                accentDim={pal.accentDim}
                size={size.labelSize + 2}
              />
            </span>
            <motion.span
              style={{
                fontFamily: MONO,
                fontSize: size.labelSize,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                lineHeight: 1,
                fontWeight: 700,
              }}
              animate={{ color: pal.accent }}
              transition={{ duration: 0.6 }}
            >
              {pal.phaseCode}
            </motion.span>
          </div>

          {showIllumination && (
            <motion.span
              style={{
                fontFamily: MONO,
                fontSize: size.labelSize,
                letterSpacing: '0.08em',
                fontWeight: 700,
                lineHeight: 1,
              }}
              animate={{ color: pal.textMuted }}
              transition={{ duration: 0.6 }}
            >
              {illumPct}%
            </motion.span>
          )}
        </div>

        <div style={{ height: gapY, flexShrink: 0 }} />

        {/* ── Row 2 — Lunar terminal track ── */}
        <div style={{ width: trackW, height: size.trackH, flexShrink: 0 }}>
          <LunarTerminalTrack
            trackW={trackW}
            trackH={size.trackH}
            segs={size.segs}
            accent={pal.accent}
            accentDim={pal.accentDim}
            illumination={lunarPos.illumination}
            moonProgress={progressTarget}
            groupRef={groupRef}
            haloRef={haloRef}
            wrapGRef={wrapGRef}
          />
        </div>

        <div style={{ height: gapY, flexShrink: 0 }} />

        {/* ── Row 3 — MR / location / MS ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: row3H,
            flexShrink: 0,
            opacity: showMoonrise ? 1 : 0,
            transition: 'opacity 0.5s linear',
          }}
        >
          <motion.span
            style={{
              fontFamily: MONO,
              fontSize: size.timeSize,
              letterSpacing: '0.06em',
              lineHeight: 1,
              opacity: 0.42,
            }}
            animate={{ color: pal.accent }}
            transition={{ duration: 0.6 }}
          >
            MR:{moonriseStr}
          </motion.span>
          <motion.span
            style={{
              fontFamily: MONO,
              fontSize: size.timeSize,
              letterSpacing: '0.06em',
              lineHeight: 1,
              opacity: 0.42,
            }}
            animate={{ color: pal.accent }}
            transition={{ duration: 0.6 }}
          >
            MS:{moonsetStr}
          </motion.span>
        </div>
      </div>
    </div>
  );
}
