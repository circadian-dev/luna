'use client';
// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/mineral/mineral.lunar.compact.tsx
// ════════════════════════════════════════════════════════════════════════════
/**
 * Mineral lunar compact widget.
 *
 * Three-row layout:
 *   Row 1 — phase label (uppercase) + stone name (subdued) + illumination % (right)
 *   Row 2 — FacetTrack with diamond facets in cold lunar tones + terminator gem orb
 *   Row 3 — ↑ moonrise · stone sublabel · moonset ↓
 *
 * Track treatment: the same diamond-facet track as mineral.compact.tsx but
 * using cold blue/silver palette colors. The orb is a small LunarGemOrb
 * (hexagonal faceted gem with sharp terminator line). Facets behind the
 * orb fill with lit color up to the orb position; ahead remain as dark
 * outlines. The octagonal clip-path from Sol compact is used on the card.
 *
 * No weather. Purely lunar.
 */

import { motion } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import { type LunarPhase, useLunarPosition } from '../../hooks/useLunarPosition';
import type { CompactLunaWidgetProps } from '../types/luna-skin.types';
import { MINERAL_LUNAR_PALETTES, lerpMineralLunarPalette } from './mineral.lunar.component';

// ─── Sizes ────────────────────────────────────────────────────────────────────

const SIZE_DIMS = {
  sm: { width: 200, height: 72, px: 12, py: 9, trackH: 18, labelSize: 10, subSize: 7, timeSize: 8 },
  md: {
    width: 240,
    height: 88,
    px: 14,
    py: 11,
    trackH: 22,
    labelSize: 11,
    subSize: 8,
    timeSize: 9,
  },
  lg: {
    width: 280,
    height: 104,
    px: 16,
    py: 13,
    trackH: 26,
    labelSize: 12,
    subSize: 9,
    timeSize: 10,
  },
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

function isWaningPhase(phase: LunarPhase): boolean {
  return phase === 'waning-gibbous' || phase === 'last-quarter' || phase === 'waning-crescent';
}

// ─── Format helper ────────────────────────────────────────────────────────────

function fmtMinutes(m: number | null): string {
  if (m === null) return '--:--';
  const h = Math.floor(m / 60) % 24;
  const mm = Math.round(m % 60);
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// ─── Compact facet RAF ────────────────────────────────────────────────────────

function useMineralLunaCompactFacetRaf(
  groupRef: React.RefObject<SVGGElement>,
  wrapRef: React.RefObject<SVGGElement>,
  trackW: number,
  midY: number,
) {
  const curX = useRef(-1);
  const curP = useRef(-1);
  const tgtX = useRef(0);
  const rafId = useRef<number | null>(null);
  const firstCall = useRef(true);
  const orbFading = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPos = (x: number) => {
    if (groupRef.current) groupRef.current.setAttribute('transform', `translate(${x},${midY})`);
  };

  const setWrapOpacity = (v: number) => {
    if (wrapRef.current) wrapRef.current.style.opacity = String(v);
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

// ─── Compact terminator gem orb ───────────────────────────────────────────────
// Smaller version of LunarGemOrb, adapted for compact track scale.

function CompactLunarGemOrb({
  litFill,
  darkFill,
  stroke,
  size,
  illumination,
  isWaning,
}: {
  litFill: string;
  darkFill: string;
  stroke: string;
  size: number;
  illumination: number;
  isWaning: boolean;
}) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = ((i * 60 - 30) * Math.PI) / 180;
    return [size * Math.cos(a), size * Math.sin(a)] as [number, number];
  });
  const hexPts = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const actualTermX = isWaning ? size * (1 - illumination * 2) : size * (illumination * 2 - 1);
  const clipId = `mlcgo-${Math.round(illumination * 100)}-${isWaning ? 'w' : 'x'}-${Math.round(size)}`;

  return (
    <g>
      <defs>
        <clipPath id={`${clipId}-lit`}>
          <rect
            x={isWaning ? -size : actualTermX}
            y={-size * 1.2}
            width={isWaning ? size - actualTermX : size * 2}
            height={size * 2.4}
          />
        </clipPath>
        <filter id={`${clipId}-sh`} x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="rgba(0,0,0,0.50)" result="s" />
          <feMerge>
            <feMergeNode in="s" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient
          id={`${clipId}-g`}
          x1={-size}
          y1={-size}
          x2={size}
          y2={size}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="rgba(255,255,255,0.40)" />
          <stop offset="30%" stopColor={litFill} />
          <stop offset="100%" stopColor={`${litFill}BB`} />
        </linearGradient>
      </defs>
      <polygon
        points={hexPts}
        fill={darkFill}
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinejoin="round"
        filter={`url(#${clipId}-sh)`}
      />
      <polygon
        points={hexPts}
        fill={`url(#${clipId}-g)`}
        clipPath={`url(#${clipId}-lit)`}
        strokeWidth="0"
      />
      {illumination > 0.03 && illumination < 0.97 && (
        <line
          x1={actualTermX}
          y1={-size * 0.85}
          x2={actualTermX}
          y2={size * 0.85}
          stroke={stroke}
          strokeWidth="0.7"
          opacity={0.65}
        />
      )}
    </g>
  );
}

// ─── MineralLunaFacetTrack ────────────────────────────────────────────────────

function MineralLunaFacetTrack({
  progress,
  trackW,
  trackH,
  facetFill,
  facetDark,
  facetStroke,
  facetGlow,
  pillBorder,
  illumination,
  isWaning,
  isVisible,
}: {
  progress: number;
  trackW: number;
  trackH: number;
  facetFill: string;
  facetDark: string;
  facetStroke: string;
  facetGlow: string;
  pillBorder: string;
  illumination: number;
  isWaning: boolean;
  isVisible: boolean;
}) {
  const midY = trackH / 2;
  const gemSize = trackH * 0.38;
  const facetW = 8;
  const facetH = trackH * 0.55;
  const facetHalf = facetH / 2;
  const count = Math.floor(trackW / facetW);
  const initX = Math.max(0.01, Math.min(0.99, progress)) * trackW;
  const orbOpacity = Math.max(0.08, illumination * 0.92 + 0.08);

  const orbGroupRef = useRef<SVGGElement>(null);
  const wrapGRef = useRef<SVGGElement>(null);

  const { setTarget } = useMineralLunaCompactFacetRaf(orbGroupRef, wrapGRef, trackW, midY);
  useEffect(() => {
    setTarget(progress);
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
      <defs>
        <filter id="mlcmp-shadow" x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.48)" result="s" />
          <feMerge>
            <feMergeNode in="s" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="mlcmp-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation={gemSize * 0.8} />
        </filter>
      </defs>

      {/* Diamond facets — cold blue/silver */}
      {Array.from({ length: count }, (_, i) => {
        const cx = i * facetW + facetW / 2;
        const filled = cx < initX;
        const bright = filled && cx > initX - facetW * 4;
        return (
          <polygon
            key={`facet-${cx}`}
            points={`${cx},${midY - facetHalf} ${cx + facetW / 2},${midY} ${cx},${midY + facetHalf} ${cx - facetW / 2},${midY}`}
            fill={filled ? facetFill : 'none'}
            stroke={filled ? facetStroke : pillBorder}
            strokeWidth={filled ? 0.4 : 0.5}
            opacity={filled ? (bright ? 0.9 : 0.55) : 0.18}
          />
        );
      })}

      {/* Top-face highlights */}
      {Array.from({ length: count }, (_, i) => {
        const cx = i * facetW + facetW / 2;
        if (cx >= initX) return null;
        return (
          <polygon
            key={`hi-${cx}`}
            points={`${cx},${midY - facetHalf} ${cx + facetW / 2},${midY} ${cx},${midY}`}
            fill="rgba(255,255,255,0.12)"
          />
        );
      })}

      {/* Orb wrap group */}
      <g ref={wrapGRef} style={{ opacity: orbOpacity, transition: 'opacity 1.2s ease-in-out' }}>
        <g ref={orbGroupRef} transform={`translate(${initX},${midY})`}>
          <circle
            r={gemSize * 1.6}
            fill={facetGlow}
            filter="url(#mlcmp-glow)"
            opacity={illumination * 0.5}
          />
          <g filter="url(#mlcmp-shadow)">
            <CompactLunarGemOrb
              litFill={facetFill}
              darkFill={facetDark}
              stroke={facetStroke}
              size={gemSize}
              illumination={illumination}
              isWaning={isWaning}
            />
          </g>
        </g>
      </g>
    </svg>
  );
}

// ─── MineralLunaCompact ───────────────────────────────────────────────────────

export function MineralLunaCompact({
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
      lerpMineralLunarPalette(
        MINERAL_LUNAR_PALETTES[blend.phase],
        MINERAL_LUNAR_PALETTES[blend.nextPhase],
        blend.t,
      ),
    [blend],
  );

  const moonriseStr = fmtMinutes(lunarPos.moonriseMinutes);
  const moonsetStr = fmtMinutes(lunarPos.moonsetMinutes);
  const illumPct = Math.round(lunarPos.illumination * 100);
  const isWaning = isWaningPhase(lunarPos.phase);

  const progressTarget = Math.max(0.01, Math.min(0.99, lunarPos.moonProgress));

  const trackW = size.width - size.px * 2;
  const row1H = size.labelSize + 2;
  const row3H = size.timeSize + 2;
  const innerH = size.height - size.py * 2;
  const gapY = Math.max(2, Math.floor((innerH - row1H - size.trackH - row3H) / 2));

  // Octagonal clip — mineral's distinctive shape
  const facetCorner = size.height * 0.12;
  const clipPath = `polygon(0px ${facetCorner}px, ${facetCorner}px 0px, ${size.width - facetCorner}px 0px, ${size.width}px ${facetCorner}px, ${size.width}px ${size.height - facetCorner}px, ${size.width - facetCorner}px ${size.height}px, ${facetCorner}px ${size.height}px, 0px ${size.height - facetCorner}px)`;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: size.width,
        height: size.height,
        clipPath,
        overflow: 'hidden',
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      {/* Background */}
      <motion.div
        style={{ position: 'absolute', inset: 0 }}
        animate={{
          background: `linear-gradient(135deg, ${pal.bg[0]} 0%, ${pal.bg[1]} 50%, ${pal.bg[2]} 100%)`,
        }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      />
      {/* Luster overlay */}
      <motion.div
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}
        animate={{
          background: `radial-gradient(ellipse 60% 55% at 38% 35%, ${pal.luster} 0%, ${pal.lustre2} 45%, transparent 75%)`,
        }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      />
      {/* Border + glow inset */}
      <motion.div
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}
        animate={{
          boxShadow: `inset 0 0 0 1px ${pal.pillBorder}, 0 4px 24px rgba(0,0,0,0.42), 0 0 20px 3px ${pal.outerGlow}`,
        }}
        transition={{ duration: 1 }}
      />
      {/* Edge catch-light */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '40%',
          height: '45%',
          background: `linear-gradient(135deg, ${pal.edgeGlow} 0%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      {/* 3-row content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 6,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <motion.span
              style={{
                fontFamily: SANS,
                fontSize: size.labelSize,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                lineHeight: 1,
                fontWeight: 500,
              }}
              animate={{ color: pal.textPrimary }}
              transition={{ duration: 1.2 }}
            >
              {pal.label}
            </motion.span>
            <motion.span
              style={{
                fontFamily: SANS,
                fontSize: size.subSize,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                lineHeight: 1,
                opacity: 0.45,
              }}
              animate={{ color: pal.accentColor }}
              transition={{ duration: 1.2 }}
            >
              {pal.stone}
            </motion.span>
          </div>
          {showIllumination && (
            <motion.span
              style={{
                fontFamily: SANS,
                fontSize: size.labelSize,
                letterSpacing: '0.04em',
                fontWeight: 500,
                lineHeight: 1,
              }}
              animate={{ color: pal.accentColor, opacity: 0.38 }}
              transition={{ duration: 1.2 }}
            >
              {illumPct}%
            </motion.span>
          )}
        </div>

        <div style={{ height: gapY, flexShrink: 0 }} />

        {/* Row 2 — facet track */}
        <div style={{ width: trackW, height: size.trackH, flexShrink: 0 }}>
          <MineralLunaFacetTrack
            progress={progressTarget}
            trackW={trackW}
            trackH={size.trackH}
            facetFill={pal.facetFill}
            facetDark={pal.facetDark}
            facetStroke={pal.facetStroke}
            facetGlow={pal.facetGlow}
            pillBorder={pal.pillBorder}
            illumination={lunarPos.illumination}
            isWaning={isWaning}
            isVisible={lunarPos.isVisible}
          />
        </div>

        <div style={{ height: gapY, flexShrink: 0 }} />

        {/* Row 3 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: row3H,
            flexShrink: 0,
          }}
        >
          <motion.span
            style={{
              fontFamily: SANS,
              fontSize: size.timeSize,
              letterSpacing: '0.08em',
              lineHeight: 1,
              opacity: showMoonrise ? 0.38 : 0,
              transition: 'opacity 0.8s ease-in-out',
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
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              lineHeight: 1,
              opacity: 0.26,
              textAlign: 'center',
            }}
            animate={{ color: pal.textSecondary }}
            transition={{ duration: 1.2 }}
          >
            {pal.stone}
          </motion.span>
          <motion.span
            style={{
              fontFamily: SANS,
              fontSize: size.timeSize,
              letterSpacing: '0.08em',
              lineHeight: 1,
              opacity: showMoonrise ? 0.38 : 0,
              transition: 'opacity 0.8s ease-in-out',
            }}
            animate={{ color: pal.textSecondary }}
            transition={{ duration: 1.2 }}
          >
            ↓ {moonsetStr}
          </motion.span>
        </div>
      </div>
    </div>
  );
}
