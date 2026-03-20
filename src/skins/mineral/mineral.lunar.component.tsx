'use client';
// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/mineral/mineral.lunar.component.tsx
// ════════════════════════════════════════════════════════════════════════════
/**
 * Mineral lunar skin.
 *
 * Sol mineral: faceted crystal geometry, nine phases, nine warm stones.
 * Luna mineral: the same faceted hexagonal orb, but cold — eight lunar phases,
 * eight cold stones. The defining visual feature is the TERMINATOR LINE:
 * a sharp vertical geometric line through the faceted gem orb that divides the
 * lit faces from the unlit faces, mirroring the moon's illumination fraction.
 *
 * Eight cold stones:
 *   new            → Black Tourmaline    (near-invisible, all-dark facets)
 *   waxing-crescent → Labradorite        (dark blue-grey, thin lit sliver)
 *   first-quarter   → Blue Moonstone     (half-lit, geometric terminator)
 *   waxing-gibbous  → Aquamarine         (silver-blue, mostly lit)
 *   full            → White Selenite     (silver-white, all facets lit, mode: dim)
 *   waning-gibbous  → Blue Chalcedony    (slightly dimmer aquamarine)
 *   last-quarter    → Grey Moonstone     (half-lit on left side)
 *   waning-crescent → Larvikite          (very dark blue-grey, thin sliver)
 *
 * Uses parabolic arc (not elliptical).
 * No weather. No Sol runtime imports. Purely lunar.
 */

import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LunarPhase, useLunarPosition } from '../../hooks/useLunarPosition';
import { lerpColor } from '../../lib/luna-lerp';
import { useLunaTheme } from '../../provider/luna-theme-provider';

// ─── Palette ──────────────────────────────────────────────────────────────────

export interface MineralLunarPalette {
  bg: [string, string, string];
  luster: string; // radial luster overlay
  lustre2: string; // secondary luster
  facetFill: string; // lit face fill color (cold gem)
  facetDark: string; // unlit face fill (darker)
  facetStroke: string; // facet edge stroke
  facetGlow: string; // halo behind orb
  edgeGlow: string; // catch-light top edge
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
  outerGlow: string;
  pillBg: string;
  pillBorder: string;
  pillText: string;
  mode: 'dark' | 'dim';
  label: string;
  sublabel: string;
  stone: string; // stone name shown in pill
}

// ─── MINERAL_LUNAR_PALETTES ───────────────────────────────────────────────────

export const MINERAL_LUNAR_PALETTES: Record<LunarPhase, MineralLunarPalette> = {
  new: {
    bg: ['#090910', '#0C0C14', '#101018'],
    luster: 'rgba(50,50,80,0.15)',
    lustre2: 'rgba(30,30,55,0.08)',
    facetFill: 'rgba(40,42,65,0.85)',
    facetDark: 'rgba(18,18,28,0.95)',
    facetStroke: 'rgba(90,92,130,0.50)',
    facetGlow: 'rgba(40,42,65,0.20)',
    edgeGlow: 'rgba(70,72,100,0.18)',
    textPrimary: '#484860',
    textSecondary: 'rgba(58,60,82,0.50)',
    accentColor: '#303050',
    outerGlow: 'rgba(30,32,55,0.18)',
    pillBg: 'rgba(12,12,20,0.97)',
    pillBorder: 'rgba(65,68,100,0.30)',
    pillText: '#484860',
    mode: 'dark',
    label: 'new moon',
    sublabel: 'no light',
    stone: 'Tourmaline',
  },
  'waxing-crescent': {
    bg: ['#0C1020', '#101828', '#141E30'],
    luster: 'rgba(80,110,180,0.22)',
    lustre2: 'rgba(50,80,150,0.12)',
    facetFill: 'rgba(70,95,155,0.88)',
    facetDark: 'rgba(20,28,55,0.95)',
    facetStroke: 'rgba(150,170,230,0.60)',
    facetGlow: 'rgba(80,110,200,0.35)',
    edgeGlow: 'rgba(120,150,220,0.22)',
    textPrimary: '#8898C8',
    textSecondary: 'rgba(100,118,172,0.58)',
    accentColor: '#5068A8',
    outerGlow: 'rgba(60,90,180,0.28)',
    pillBg: 'rgba(14,18,36,0.97)',
    pillBorder: 'rgba(120,145,215,0.38)',
    pillText: '#7888B8',
    mode: 'dark',
    label: 'crescent',
    sublabel: 'waxing',
    stone: 'Labradorite',
  },
  'first-quarter': {
    bg: ['#101428', '#161C36', '#1C2440'],
    luster: 'rgba(110,135,205,0.28)',
    lustre2: 'rgba(78,100,178,0.15)',
    facetFill: 'rgba(105,125,192,0.90)',
    facetDark: 'rgba(28,35,70,0.95)',
    facetStroke: 'rgba(175,192,248,0.65)',
    facetGlow: 'rgba(110,135,220,0.42)',
    edgeGlow: 'rgba(150,172,240,0.26)',
    textPrimary: '#A0B0E0',
    textSecondary: 'rgba(118,135,195,0.62)',
    accentColor: '#6878B8',
    outerGlow: 'rgba(88,108,205,0.35)',
    pillBg: 'rgba(16,20,44,0.97)',
    pillBorder: 'rgba(148,168,238,0.42)',
    pillText: '#8898C8',
    mode: 'dark',
    label: 'first quarter',
    sublabel: 'half lit',
    stone: 'Moonstone',
  },
  'waxing-gibbous': {
    bg: ['#121830', '#182040', '#1E2848'],
    luster: 'rgba(140,168,235,0.32)',
    lustre2: 'rgba(105,135,210,0.18)',
    facetFill: 'rgba(138,162,220,0.94)',
    facetDark: 'rgba(35,45,85,0.95)',
    facetStroke: 'rgba(200,215,255,0.70)',
    facetGlow: 'rgba(138,165,240,0.50)',
    edgeGlow: 'rgba(178,198,255,0.30)',
    textPrimary: '#B8C8F0',
    textSecondary: 'rgba(138,155,215,0.68)',
    accentColor: '#8098D8',
    outerGlow: 'rgba(112,138,225,0.42)',
    pillBg: 'rgba(18,24,52,0.97)',
    pillBorder: 'rgba(170,190,252,0.48)',
    pillText: '#A0B4E0',
    mode: 'dark',
    label: 'gibbous',
    sublabel: 'waxing',
    stone: 'Aquamarine',
  },
  full: {
    bg: ['#181E42', '#202850', '#28305C'],
    luster: 'rgba(195,205,250,0.40)',
    lustre2: 'rgba(165,178,235,0.22)',
    facetFill: 'rgba(205,212,248,0.97)',
    facetDark: 'rgba(205,212,248,0.97)', // full — no dark side
    facetStroke: 'rgba(230,235,255,0.78)',
    facetGlow: 'rgba(192,202,255,0.65)',
    edgeGlow: 'rgba(210,220,255,0.38)',
    textPrimary: '#D0D8FF',
    textSecondary: 'rgba(180,192,240,0.78)',
    accentColor: '#A0B0F0',
    outerGlow: 'rgba(155,168,250,0.58)',
    pillBg: 'rgba(24,30,66,0.97)',
    pillBorder: 'rgba(200,210,255,0.55)',
    pillText: '#C0CCFF',
    mode: 'dim',
    label: 'full moon',
    sublabel: 'full illumination',
    stone: 'Selenite',
  },
  'waning-gibbous': {
    bg: ['#121830', '#171F3E', '#1D2746'],
    luster: 'rgba(135,163,230,0.30)',
    lustre2: 'rgba(102,130,205,0.16)',
    facetFill: 'rgba(134,158,216,0.92)',
    facetDark: 'rgba(34,43,82,0.95)',
    facetStroke: 'rgba(196,210,252,0.68)',
    facetGlow: 'rgba(134,160,236,0.48)',
    edgeGlow: 'rgba(174,194,252,0.28)',
    textPrimary: '#B5C4EE',
    textSecondary: 'rgba(134,151,210,0.65)',
    accentColor: '#7C94D4',
    outerGlow: 'rgba(108,134,220,0.40)',
    pillBg: 'rgba(17,23,50,0.97)',
    pillBorder: 'rgba(166,186,248,0.46)',
    pillText: '#9DB1DC',
    mode: 'dark',
    label: 'gibbous',
    sublabel: 'waning',
    stone: 'Chalcedony',
  },
  'last-quarter': {
    bg: ['#101428', '#151B34', '#1B223E'],
    luster: 'rgba(106,130,200,0.26)',
    lustre2: 'rgba(75,97,174,0.14)',
    facetFill: 'rgba(100,120,186,0.88)',
    facetDark: 'rgba(26,34,68,0.95)',
    facetStroke: 'rgba(170,188,244,0.62)',
    facetGlow: 'rgba(105,128,215,0.40)',
    edgeGlow: 'rgba(145,168,236,0.24)',
    textPrimary: '#9CAEDD',
    textSecondary: 'rgba(114,130,190,0.60)',
    accentColor: '#6474B4',
    outerGlow: 'rgba(84,104,200,0.33)',
    pillBg: 'rgba(15,20,42,0.97)',
    pillBorder: 'rgba(143,164,232,0.40)',
    pillText: '#8498C5',
    mode: 'dark',
    label: 'last quarter',
    sublabel: 'half lit',
    stone: 'Moonstone',
  },
  'waning-crescent': {
    bg: ['#0B0F1C', '#0E1222', '#121628'],
    luster: 'rgba(64,82,135,0.18)',
    lustre2: 'rgba(42,58,108,0.10)',
    facetFill: 'rgba(58,74,118,0.82)',
    facetDark: 'rgba(16,22,42,0.96)',
    facetStroke: 'rgba(118,138,195,0.52)',
    facetGlow: 'rgba(60,78,138,0.28)',
    edgeGlow: 'rgba(92,112,168,0.18)',
    textPrimary: '#6878A0',
    textSecondary: 'rgba(80,95,140,0.52)',
    accentColor: '#404E80',
    outerGlow: 'rgba(44,60,110,0.22)',
    pillBg: 'rgba(13,17,34,0.97)',
    pillBorder: 'rgba(90,110,168,0.32)',
    pillText: '#5868A0',
    mode: 'dark',
    label: 'crescent',
    sublabel: 'waning',
    stone: 'Larvikite',
  },
};

// ─── Palette interpolation ────────────────────────────────────────────────────

function lerpNum(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function lerpMineralLunarPalette(
  a: MineralLunarPalette,
  b: MineralLunarPalette,
  t: number,
): MineralLunarPalette {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const c = lerpColor;
  return {
    bg: [c(a.bg[0], b.bg[0], t), c(a.bg[1], b.bg[1], t), c(a.bg[2], b.bg[2], t)],
    luster: c(a.luster, b.luster, t),
    lustre2: c(a.lustre2, b.lustre2, t),
    facetFill: c(a.facetFill, b.facetFill, t),
    facetDark: c(a.facetDark, b.facetDark, t),
    facetStroke: c(a.facetStroke, b.facetStroke, t),
    facetGlow: c(a.facetGlow, b.facetGlow, t),
    edgeGlow: c(a.edgeGlow, b.edgeGlow, t),
    textPrimary: c(a.textPrimary, b.textPrimary, t),
    textSecondary: c(a.textSecondary, b.textSecondary, t),
    accentColor: c(a.accentColor, b.accentColor, t),
    outerGlow: c(a.outerGlow, b.outerGlow, t),
    pillBg: c(a.pillBg, b.pillBg, t),
    pillBorder: c(a.pillBorder, b.pillBorder, t),
    pillText: c(a.pillText, b.pillText, t),
    mode: t < 0.5 ? a.mode : b.mode,
    label: t < 0.5 ? a.label : b.label,
    sublabel: t < 0.5 ? a.sublabel : b.sublabel,
    stone: t < 0.5 ? a.stone : b.stone,
  };
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

// ─── Parabolic arc ────────────────────────────────────────────────────────────

const W = 360;
const H = 180;
const ARC_BASE_Y = 165;
const ARC_ZENITH_Y = 30;
const ARC_H = ARC_BASE_Y - ARC_ZENITH_Y;

function arcOrbPos(progress: number) {
  const t = Math.max(0.01, Math.min(0.99, progress));
  return { x: t * W, y: ARC_BASE_Y - ARC_H * 4 * t * (1 - t) };
}

function buildArcPath(pts = 120): string {
  return Array.from({ length: pts }, (_, i) => {
    const t = i / (pts - 1);
    return `${i === 0 ? 'M' : 'L'}${(t * W).toFixed(1)},${(
      ARC_BASE_Y - ARC_H * 4 * t * (1 - t)
    ).toFixed(1)}`;
  }).join(' ');
}

// ─── Orb RAF ──────────────────────────────────────────────────────────────────

function useMineralLunaOrbRaf(groupRef: React.RefObject<SVGGElement>) {
  const curP = useRef(-1);
  const tgtP = useRef(0);
  const rafId = useRef<number | null>(null);
  const first = useRef(true);
  const fading = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPos = (p: number) => {
    const { x, y } = arcOrbPos(p);
    if (groupRef.current) groupRef.current.setAttribute('transform', `translate(${x},${y})`);
  };

  const setOpacity = (o: number) => {
    if (groupRef.current) groupRef.current.style.opacity = String(o);
  };

  const anim = () => {
    const d = tgtP.current - curP.current;
    if (Math.abs(d) > 0.0004) {
      curP.current += d * 0.12;
      setPos(curP.current);
      rafId.current = requestAnimationFrame(anim);
    } else {
      curP.current = tgtP.current;
      setPos(curP.current);
      rafId.current = null;
    }
  };

  const setTarget = (prog: number) => {
    tgtP.current = Math.max(0.01, Math.min(0.99, prog));
    if (first.current) {
      first.current = false;
      curP.current = tgtP.current;
      setPos(curP.current);
      return;
    }
    const rawDelta = prog - curP.current;
    let circDelta = rawDelta;
    if (circDelta > 0.5) circDelta -= 1;
    if (circDelta < -0.5) circDelta += 1;
    const needsSnap = Math.abs(rawDelta) > 0.5 || Math.abs(circDelta) > 0.15;
    if (needsSnap && !fading.current) {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      fading.current = true;
      setOpacity(0);
      fadeTimer.current = setTimeout(() => {
        curP.current = tgtP.current;
        setPos(curP.current);
        setOpacity(1);
        fading.current = false;
        fadeTimer.current = null;
        if (!rafId.current) rafId.current = requestAnimationFrame(anim);
      }, 160);
    } else if (!fading.current) {
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

// ─── LunarGemOrb ─────────────────────────────────────────────────────────────
// Hexagonal faceted gem with a SHARP TERMINATOR LINE dividing lit vs unlit faces.
// illumination (0–1) controls how much of the gem is lit (terminator position).
// Waxing phases: lit on right. Waning: lit on left.

function LunarGemOrb({
  litFill,
  darkFill,
  stroke,
  size = 14,
  illumination,
  isWaning,
}: {
  litFill: string;
  darkFill: string;
  stroke: string;
  size?: number;
  illumination: number;
  isWaning: boolean;
}) {
  // Hexagon vertices (flat-top orientation, 6 vertices)
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = ((i * 60 - 30) * Math.PI) / 180;
    return [size * Math.cos(a), size * Math.sin(a)] as [number, number];
  });
  const inner = Array.from({ length: 6 }, (_, i) => {
    const a = ((i * 60 - 30) * Math.PI) / 180;
    return [size * 0.58 * Math.cos(a), size * 0.58 * Math.sin(a)] as [number, number];
  });

  const hexPts = pts.map(([x, y]) => `${x},${y}`).join(' ');

  // Terminator: vertical clip boundary at x = termX
  // illumination 0 → termX fully covers lit side (all dark)
  // illumination 1 → termX fully exposes lit side (all lit)
  // Waxing: lit is right side; waning: lit is left side
  const termX = isWaning
    ? -size + illumination * 2 * size // left lit: clip moves right as illumination drops
    : size - illumination * 2 * size; // right lit: clip moves left as illumination grows
  const actualTermX = isWaning
    ? size * (1 - illumination * 2) // waning: terminator moves from right to left
    : size * (illumination * 2 - 1); // waxing: terminator moves from left to right

  const clipId = `lgo-clip-${Math.round(illumination * 100)}-${isWaning ? 'w' : 'x'}`;

  // Highlight on lit side
  const hiPts = isWaning
    ? [pts[4], pts[5], pts[0]].map(([x, y]) => `${x},${y}`).join(' ')
    : [pts[1], pts[2], pts[3]].map(([x, y]) => `${x},${y}`).join(' ');

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
        <clipPath id={`${clipId}-dark`}>
          <rect
            x={-size}
            y={-size * 1.2}
            width={isWaning ? size + actualTermX : size + actualTermX}
            height={size * 2.4}
          />
        </clipPath>
        <linearGradient
          id={`${clipId}-lit-grad`}
          x1={-size}
          y1={-size}
          x2={size}
          y2={size}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
          <stop offset="30%" stopColor={litFill} />
          <stop offset="100%" stopColor={`${litFill}BB`} />
        </linearGradient>
        <filter id={`${clipId}-glow`} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation={size * 0.55} />
        </filter>
        <filter id={`${clipId}-shadow`} x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="rgba(0,0,0,0.50)" result="s" />
          <feMerge>
            <feMergeNode in="s" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Glow halo — only on lit side */}
      <circle
        r={size * 1.5}
        fill={litFill}
        opacity={illumination * 0.4}
        filter={`url(#${clipId}-glow)`}
      />

      {/* Dark base — entire hex */}
      <polygon
        points={hexPts}
        fill={darkFill}
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
        filter={`url(#${clipId}-shadow)`}
      />

      {/* Lit side — clipped to illuminated portion */}
      <polygon
        points={hexPts}
        fill={`url(#${clipId}-lit-grad)`}
        clipPath={`url(#${clipId}-lit)`}
        strokeWidth="0"
      />

      {/* Inner facet lines */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line
          key={i}
          x1={inner[i][0]}
          y1={inner[i][1]}
          x2={pts[i][0]}
          y2={pts[i][1]}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="0.7"
        />
      ))}

      {/* Sharp terminator line — the key Mineral Luna feature */}
      {illumination > 0.02 && illumination < 0.98 && (
        <line
          x1={actualTermX}
          y1={-size * 0.9}
          x2={actualTermX}
          y2={size * 0.9}
          stroke={stroke}
          strokeWidth="0.9"
          opacity={0.7}
        />
      )}

      {/* Highlight on lit corner */}
      {illumination > 0.1 && (
        <polygon
          points={hiPts}
          fill="rgba(255,255,255,0.22)"
          clipPath={`url(#${clipId}-lit)`}
          stroke="none"
        />
      )}
    </g>
  );
}

// ─── Moon phase icon (faceted) ────────────────────────────────────────────────

function MineralMoonPhaseIcon({
  phase,
  litColor,
  darkColor,
  size = 22,
}: {
  phase: LunarPhase;
  litColor: string;
  darkColor: string;
  size?: number;
}) {
  const r = size / 2 - 1;
  const cx = size / 2;
  const cy = size / 2;

  if (phase === 'new') {
    return (
      <svg
        role="presentation"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={darkColor}
          stroke={litColor}
          strokeWidth="0.8"
          opacity={0.3}
        />
      </svg>
    );
  }
  if (phase === 'full') {
    return (
      <svg
        role="presentation"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
      >
        <circle cx={cx} cy={cy} r={r} fill={litColor} opacity={0.88} />
      </svg>
    );
  }
  if (phase === 'first-quarter') {
    return (
      <svg
        role="presentation"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={darkColor}
          stroke={litColor}
          strokeWidth="0.8"
          opacity={0.45}
        />
        <path
          d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z`}
          fill={litColor}
          opacity={0.88}
        />
        {/* Terminator line */}
        <line
          x1={cx}
          y1={cy - r}
          x2={cx}
          y2={cy + r}
          stroke={litColor}
          strokeWidth="0.8"
          opacity={0.65}
        />
      </svg>
    );
  }
  if (phase === 'last-quarter') {
    return (
      <svg
        role="presentation"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={darkColor}
          stroke={litColor}
          strokeWidth="0.8"
          opacity={0.45}
        />
        <path
          d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z`}
          fill={litColor}
          opacity={0.88}
        />
        <line
          x1={cx}
          y1={cy - r}
          x2={cx}
          y2={cy + r}
          stroke={litColor}
          strokeWidth="0.8"
          opacity={0.65}
        />
      </svg>
    );
  }
  const isWaxing = phase === 'waxing-crescent' || phase === 'waxing-gibbous';
  const isThin = phase === 'waxing-crescent' || phase === 'waning-crescent';
  const offset = isThin ? r * 0.62 : r * 0.18;
  const dx = isWaxing ? -offset : offset;
  const maskId = `mineral-luna-icon-${phase}-${size}`;
  // Terminator x in icon space
  const tx = cx + (isWaxing ? offset : -offset);

  return (
    <svg role="presentation" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <mask id={maskId}>
          <circle cx={cx} cy={cy} r={r} fill="white" />
          <circle cx={cx + dx} cy={cy} r={r} fill="black" />
        </mask>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={darkColor} opacity={0.4} />
      <circle cx={cx} cy={cy} r={r} fill={litColor} mask={`url(#${maskId})`} opacity={0.88} />
      <circle cx={cx} cy={cy} r={r} stroke={litColor} strokeWidth="0.8" fill="none" opacity={0.3} />
      {/* Terminator line on icon */}
      <line
        x1={tx}
        y1={cy - r}
        x2={tx}
        y2={cy + r}
        stroke={litColor}
        strokeWidth="0.8"
        opacity={0.55}
        clipPath={`inset(0 round ${r}px)`}
      />
    </svg>
  );
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────

const SIZE_SCALE: Record<string, number> = {
  xs: 0.55,
  sm: 0.7,
  md: 0.82,
  lg: 0.92,
  xl: 1.05,
};

const TRANSFORM_ORIGINS: Record<string, string> = {
  'top-right': 'top right',
  'top-left': 'top left',
  'top-center': 'top center',
  'center-left': 'center left',
  center: 'center center',
  'center-right': 'center right',
  'bottom-right': 'bottom right',
  'bottom-left': 'bottom left',
  'bottom-center': 'bottom center',
};

function getYNudge(d: string) {
  return d.startsWith('bottom') ? 12 : d.startsWith('center') ? 0 : -12;
}
function collapseButtonSide(d: string): 'right' | 'left' {
  return d === 'top-left' || d === 'bottom-left' || d === 'center-left' ? 'left' : 'right';
}
function pillArrowPath(d: string) {
  switch (d) {
    case 'top-right':
      return 'M1 7 L7 1 M4 1 L7 1 L7 4';
    case 'top-left':
      return 'M7 7 L1 1 M4 1 L1 1 L1 4';
    case 'top-center':
      return 'M4 1 L4 7 M1 5 L4 7 L7 5';
    case 'bottom-right':
      return 'M1 1 L7 7 M4 7 L7 7 L7 4';
    case 'bottom-left':
      return 'M7 1 L1 7 M4 7 L1 7 L1 4';
    default:
      return 'M1 7 L7 1 M4 1 L7 1 L7 4';
  }
}
function fmtMinutes(m: number | null): string {
  if (m === null) return '--:--';
  const h = Math.floor(m / 60) % 24;
  const mm = Math.round(m % 60);
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
function fmtDays(d: number): string {
  if (d < 1) return `${Math.round(d * 24)}h`;
  return `${Math.floor(d)}d`;
}

const SPRING_EXPAND = { type: 'spring' as const, stiffness: 500, damping: 40, mass: 0.85 };
const SPRING_CONTENT = { type: 'spring' as const, stiffness: 520, damping: 42 };

function isWaningPhase(phase: LunarPhase): boolean {
  return phase === 'waning-gibbous' || phase === 'last-quarter' || phase === 'waning-crescent';
}

// ─── MineralLunarWidgetProps ──────────────────────────────────────────────────

export interface MineralLunarWidgetProps {
  expandDirection?: string;
  size?: string;
  showIllumination?: boolean;
  showMoonrise?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  simulatedDate?: Date;
  forceExpanded?: boolean;
  hoverEffect?: boolean;
  className?: string;
}

// ─── MineralLunarWidget ───────────────────────────────────────────────────────

export function MineralLunarWidget({
  expandDirection = 'top-right',
  size = 'lg',
  showIllumination = true,
  showMoonrise = true,
  latitude,
  longitude,
  timezone,
  simulatedDate,
  forceExpanded,
  hoverEffect = true,
  className = '',
}: MineralLunarWidgetProps) {
  const { design } = useLunaTheme();

  const lunarPos = useLunarPosition({
    latitude,
    longitude,
    timezone,
    updateIntervalMs: 60_000,
    simulatedDate,
  });

  const blend = useMemo(() => getLunarBlend(lunarPos.ageInDays), [lunarPos.ageInDays]);

  const palette = useMemo(
    () =>
      lerpMineralLunarPalette(
        MINERAL_LUNAR_PALETTES[blend.phase],
        MINERAL_LUNAR_PALETTES[blend.nextPhase],
        blend.t,
      ),
    [blend],
  );

  const origin = TRANSFORM_ORIGINS[expandDirection] ?? 'top right';
  const yNudge = getYNudge(expandDirection);

  const [storedExpanded, setStoredExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const raw = localStorage.getItem('mineral-luna-widget-expanded');
      if (raw != null) return JSON.parse(raw);
    } catch {}
    return true;
  });

  const updateExpanded = useCallback((next: boolean) => {
    setStoredExpanded(next);
    try {
      localStorage.setItem('mineral-luna-widget-expanded', JSON.stringify(next));
    } catch {}
  }, []);

  const isExpanded = forceExpanded !== undefined ? forceExpanded : storedExpanded;
  const setExpanded = forceExpanded !== undefined ? () => {} : updateExpanded;

  const [expandScale, setExpandScale] = useState(SIZE_SCALE[size] ?? 0.92);
  useEffect(() => {
    const base = SIZE_SCALE[size] ?? 0.92;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    setExpandScale(vw < 640 ? Math.min(base, (vw - 24) / W) : base);
  }, [size]);

  const facetGroupRef = useRef<SVGGElement>(null);
  const { setTarget } = useMineralLunaOrbRaf(facetGroupRef);

  const orbOpacity = Math.max(0.08, lunarPos.illumination * 0.92 + 0.08);
  const progressTarget = lunarPos.isVisible
    ? Math.max(0.01, Math.min(0.99, lunarPos.moonProgress))
    : 0.5;
  const isWaning = isWaningPhase(lunarPos.phase);

  useEffect(() => {
    setTarget(progressTarget);
  });

  const arcPath = useMemo(() => buildArcPath(), []);
  const initPos = arcOrbPos(progressTarget);

  const illumPct = Math.round(lunarPos.illumination * 100);
  const moonriseStr = fmtMinutes(lunarPos.moonriseMinutes);
  const moonsetStr = fmtMinutes(lunarPos.moonsetMinutes);
  const isNearFull = ['full', 'waxing-gibbous', 'waning-gibbous'].includes(lunarPos.phase);
  const nextEventStr = isNearFull
    ? `${fmtDays(lunarPos.daysUntilFull)} to full`
    : `${fmtDays(lunarPos.daysUntilNew)} to new`;

  const pillMinWidth = showIllumination ? 118 : 88;
  const SANS = "'Inter','SF Pro Display','Helvetica Neue',sans-serif";

  // Faceted corner clip
  const facetCorner = H * 0.12 * (1 / expandScale);

  return (
    <div
      data-luna-skin="mineral"
      data-lunar-phase={lunarPos.phase}
      className={`relative ${className}`}
      style={{ isolation: 'isolate' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isExpanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.86, y: yNudge }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.86, y: yNudge * 0.8 }}
            transition={SPRING_EXPAND}
            style={{
              width: W * expandScale,
              height: H * expandScale,
              transformOrigin: origin,
              position: 'relative',
            }}
            className="select-none"
          >
            {/* Outer glow */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ borderRadius: '1.6rem' }}
              animate={{
                boxShadow: `0 0 48px 12px ${palette.outerGlow}, 0 4px 20px rgba(0,0,0,0.32)`,
              }}
              transition={{ duration: 1.2 }}
            />

            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: W,
                height: H,
                transform: `scale(${expandScale})`,
                transformOrigin: 'top left',
              }}
            >
              <motion.div
                className="relative w-full h-full overflow-hidden"
                style={{
                  borderRadius: '1.6rem',
                  boxShadow: `inset 0 1px 0 ${palette.edgeGlow}, inset 0 -1px 0 rgba(0,0,0,0.20)`,
                }}
              >
                {/* z=0 Background */}
                <motion.div
                  className="absolute inset-0"
                  style={{ zIndex: 0 }}
                  animate={{
                    background: `linear-gradient(145deg,${palette.bg[0]} 0%,${palette.bg[1]} 50%,${palette.bg[2]} 100%)`,
                  }}
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                />
                {/* z=1 Luster overlays */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ zIndex: 1 }}
                  animate={{
                    background: `radial-gradient(ellipse 60% 55% at 38% 35%, ${palette.luster} 0%, ${palette.lustre2} 45%, transparent 75%)`,
                  }}
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                />
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ zIndex: 2 }}
                  animate={{
                    background: `radial-gradient(ellipse 40% 30% at 72% 68%, ${palette.lustre2} 0%, transparent 65%)`,
                  }}
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                />

                {/* z=3 Orb + arc */}
                <svg
                  role="presentation"
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    zIndex: 3,
                    overflow: 'visible',
                    opacity: orbOpacity,
                    transition: 'opacity 1.8s ease-in-out',
                  }}
                  width={W}
                  height={H}
                  viewBox={`0 0 ${W} ${H}`}
                >
                  <path
                    d={arcPath}
                    fill="none"
                    stroke={palette.facetStroke}
                    strokeWidth="1.2"
                    strokeDasharray="3 6"
                    strokeLinecap="round"
                    opacity={0.22}
                  />
                  <g
                    ref={facetGroupRef}
                    transform={`translate(${initPos.x},${initPos.y})`}
                    style={{ transition: 'opacity 0.8s ease-in-out' }}
                  >
                    <LunarGemOrb
                      litFill={palette.facetFill}
                      darkFill={palette.facetDark}
                      stroke={palette.facetStroke}
                      size={14}
                      illumination={lunarPos.illumination}
                      isWaning={isWaning}
                    />
                  </g>
                </svg>

                {/* z=5 Header */}
                <div className="absolute top-0 left-0 right-0 px-5 pt-5" style={{ zIndex: 5 }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <motion.p
                        style={{
                          fontFamily: SANS,
                          fontSize: 14,
                          fontWeight: 500,
                          letterSpacing: '-0.01em',
                          lineHeight: 1,
                          opacity: 0.4,
                        }}
                        animate={{ color: palette.textPrimary }}
                        transition={{ duration: 1.2 }}
                      >
                        {palette.label}
                      </motion.p>
                      {showIllumination && (
                        <motion.p
                          style={{
                            fontFamily: SANS,
                            fontSize: 10,
                            fontWeight: 400,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            marginTop: 5,
                            opacity: 0.26,
                          }}
                          animate={{ color: palette.textSecondary }}
                          transition={{ duration: 1.2 }}
                        >
                          {illumPct}% · {nextEventStr}
                        </motion.p>
                      )}
                    </div>
                    <motion.div animate={{ opacity: 0.42 }}>
                      <MineralMoonPhaseIcon
                        phase={lunarPos.phase}
                        litColor={palette.facetFill}
                        darkColor={palette.facetDark}
                        size={22}
                      />
                    </motion.div>
                  </div>
                </div>

                {/* z=5 Bottom row */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 px-5 pb-[14px] flex items-center justify-between"
                  style={{
                    zIndex: 5,
                    opacity: showMoonrise ? 0.28 : 0,
                    transition: 'opacity 0.8s ease-in-out',
                  }}
                  animate={{ color: palette.textSecondary }}
                  transition={{ duration: 1.2 }}
                >
                  <span
                    style={{
                      fontFamily: SANS,
                      fontSize: 9,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                    }}
                  >
                    ↑ {moonriseStr}
                  </span>
                  <span
                    style={{
                      fontFamily: SANS,
                      fontSize: 8,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      opacity: 0.6,
                    }}
                  >
                    {palette.stone}
                  </span>
                  <span
                    style={{
                      fontFamily: SANS,
                      fontSize: 9,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                    }}
                  >
                    ↓ {moonsetStr}
                  </span>
                </motion.div>

                {/* z=6 Edge catch-light */}
                <div
                  className="absolute top-0 left-0 right-0 pointer-events-none"
                  style={{
                    zIndex: 6,
                    height: 1,
                    borderRadius: '1.6rem 1.6rem 0 0',
                    background: `linear-gradient(to right, transparent 0%, ${palette.edgeGlow} 30%, ${palette.edgeGlow} 70%, transparent 100%)`,
                  }}
                />

                {/* z=7 Collapse */}
                {!forceExpanded &&
                  (() => {
                    const side = collapseButtonSide(expandDirection);
                    const isRight = side === 'right';
                    return (
                      <motion.button
                        onClick={() => setExpanded(false)}
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ ...SPRING_CONTENT, delay: 0.18 }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        aria-label="Collapse mineral luna widget"
                        style={{
                          position: 'absolute',
                          zIndex: 7,
                          top: 0,
                          ...(isRight ? { right: 0 } : { left: 0 }),
                          width: 34,
                          height: 34,
                          borderRadius: isRight ? '0 1.6rem 0 12px' : '1.6rem 0 12px 0',
                          background: 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <svg
                          role="presentation"
                          aria-hidden
                          width="8"
                          height="8"
                          viewBox="0 0 8 8"
                          fill="none"
                        >
                          <path
                            d="M2 2 L6 6 M6 2 L2 6"
                            stroke={palette.pillText}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            opacity="0.70"
                          />
                        </svg>
                      </motion.button>
                    );
                  })()}
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            onClick={() => setExpanded(true)}
            initial={{ opacity: 0, scale: 0.78, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.78, y: -8 }}
            transition={SPRING_EXPAND}
            className="flex items-center gap-2 cursor-pointer select-none"
            style={{
              height: 36,
              minWidth: pillMinWidth,
              paddingLeft: 10,
              paddingRight: 14,
              borderRadius: 18,
              background: palette.pillBg,
              border: `1.5px solid ${palette.pillBorder}`,
              boxShadow: `0 4px 20px rgba(0,0,0,0.30), 0 0 18px 3px ${palette.outerGlow}`,
              backdropFilter: 'blur(10px)',
              transformOrigin: origin,
              scale: expandScale,
            }}
            whileHover={hoverEffect ? { scale: expandScale * 1.05 } : undefined}
            whileTap={{ scale: expandScale * 0.95 }}
            aria-label={`Mineral luna widget — ${palette.label}. Click to expand.`}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 20,
                height: 20,
                flexShrink: 0,
              }}
            >
              <MineralMoonPhaseIcon
                phase={lunarPos.phase}
                litColor={palette.facetFill}
                darkColor={palette.facetDark}
                size={16}
              />
            </span>
            {showIllumination && (
              <motion.span
                style={{
                  fontFamily: SANS,
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                  minWidth: 28,
                }}
                animate={{ color: palette.pillText, opacity: 0.4 }}
                transition={{ duration: 1.2 }}
              >
                {illumPct}%
              </motion.span>
            )}
            <span
              style={{
                width: 3,
                height: 3,
                borderRadius: '50%',
                background: palette.pillBorder,
                flexShrink: 0,
              }}
            />
            <motion.span
              style={{
                fontFamily: SANS,
                fontSize: 10,
                fontWeight: 400,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                opacity: 0.45,
                whiteSpace: 'nowrap',
              }}
              animate={{ color: palette.textSecondary }}
              transition={{ duration: 1.2 }}
            >
              {palette.stone}
            </motion.span>
            <svg
              role="presentation"
              aria-hidden
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              style={{ marginLeft: 2, opacity: 0.55 }}
            >
              <path
                d={pillArrowPath(expandDirection)}
                stroke={palette.pillText}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
