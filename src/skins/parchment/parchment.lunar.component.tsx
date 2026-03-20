'use client';
// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/parchment/parchment.lunar.component.tsx
// ════════════════════════════════════════════════════════════════════════════
/**
 * Parchment lunar skin.
 *
 * Sol parchment: Notion-native document aesthetic — bright white, flat, zero
 * glows, rgba(55,53,47,…) ink throughout.
 *
 * Luna parchment translates this to: a MEDIEVAL MANUSCRIPT. The same document
 * restraint — flat ink on surface, no glows, no gradients on the card body —
 * but the surface is aged vellum (warm cream/amber) instead of white paper,
 * and the moon is rendered as a small manuscript illustration in the corner.
 *
 * Design character:
 *   - Warm cream/vellum backgrounds (near-white at new, richer amber at full)
 *   - Sepia/umber ink: the same "one ink color" philosophy as Sol parchment
 *   - Lunar illumination drives a very subtle warming of the vellum surface
 *   - Phase icon: a manuscript moon diagram (circle with concentric terminator)
 *   - Orb: a small sepia ink dot tracking progress — same as NotionTrack dot
 *   - Arc: single hairline, dashed, warm sepia — like an ink ruling
 *   - Phase label in Latin (LUNA NOVA, LUNA PLENA…) — manuscript voice
 *   - Grain texture: stronger than Sol parchment (aged vellum vs. fresh paper)
 *   - localStorage key: 'parchment-luna-widget-expanded'
 *
 * "A lunar almanac page hand-copied by a monk in 1250 AD, with just enough
 * precision to survive typechecking."
 *
 * Uses parabolic arc (same as void). No weather. No Sol runtime. Purely lunar.
 */

import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LunarPhase, useLunarPosition } from '../../hooks/useLunarPosition';
import { lerpColor } from '../../lib/luna-lerp';
import { useLunaTheme } from '../../provider/luna-theme-provider';

// ─── Ink tokens — warm sepia/umber on vellum ─────────────────────────────────
// Matches Sol parchment's philosophy: one ink color, multiple opacities.
// Ink is warm sepia (45,35,20) not cool charcoal (55,53,47).

const INK = 'rgba(45,35,20,1)';
const INK_MED = 'rgba(45,35,20,0.65)';
const INK_LIGHT = 'rgba(45,35,20,0.42)';
const INK_GHOST = 'rgba(45,35,20,0.22)';
const INK_BORDER = 'rgba(45,35,20,0.10)';
const INK_BORDER_MED = 'rgba(45,35,20,0.18)';
const INK_FILL = 'rgba(45,35,20,0.05)';
const VELLUM_FONT = `"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif`;

// ─── Palette ──────────────────────────────────────────────────────────────────

export interface ParchmentLunarPalette {
  bg: [string, string, string]; // warm vellum — brightens with illumination
  surface: string; // the dominant surface color
  grain: number; // texture opacity (higher = more aged)
  textPrimary: string;
  textSecondary: string;
  border: string;
  borderMed: string;
  fill: string;
  orbDot: string; // the ink dot color
  arcColor: string; // the hairline arc color
  labelLatin: string; // Latin phase name
  sublabelLatin: string; // Latin sublabel
  mode: 'dark' | 'dim'; // full → 'dim', others → 'dark'
}

// ─── PARCHMENT_LUNAR_PALETTES ─────────────────────────────────────────────────
// Vellum warms slightly from new moon (cool old vellum) to full moon (warm
// fresh illuminated page). All phases use the same sepia ink tokens.
// The grain texture increases toward new moon (more aged / less light = more
// visible texture) and decreases toward full (washed in moonlight).

export const PARCHMENT_LUNAR_PALETTES: Record<LunarPhase, ParchmentLunarPalette> = {
  new: {
    bg: ['#F0EBE0', '#F3EEE3', '#F5F0E6'],
    surface: '#F3EEE3',
    grain: 0.48,
    textPrimary: INK,
    textSecondary: INK_MED,
    border: INK_BORDER,
    borderMed: INK_BORDER_MED,
    fill: INK_FILL,
    orbDot: INK_MED,
    arcColor: INK_GHOST,
    labelLatin: 'Luna Nova',
    sublabelLatin: 'nullo lumine',
    mode: 'dark',
  },
  'waxing-crescent': {
    bg: ['#F2EDE2', '#F5F0E5', '#F7F2E8'],
    surface: '#F5F0E5',
    grain: 0.42,
    textPrimary: INK,
    textSecondary: INK_MED,
    border: INK_BORDER,
    borderMed: INK_BORDER_MED,
    fill: INK_FILL,
    orbDot: INK_MED,
    arcColor: INK_GHOST,
    labelLatin: 'Luna Crescens',
    sublabelLatin: 'crescit lux',
    mode: 'dark',
  },
  'first-quarter': {
    bg: ['#F4EFE4', '#F7F2E7', '#F9F4EA'],
    surface: '#F7F2E7',
    grain: 0.38,
    textPrimary: INK,
    textSecondary: INK_MED,
    border: INK_BORDER,
    borderMed: INK_BORDER_MED,
    fill: INK_FILL,
    orbDot: INK_MED,
    arcColor: INK_GHOST,
    labelLatin: 'Quadratura Prima',
    sublabelLatin: 'dimidia lux',
    mode: 'dark',
  },
  'waxing-gibbous': {
    bg: ['#F5F0E5', '#F8F4E9', '#FAF6EC'],
    surface: '#F8F4E9',
    grain: 0.34,
    textPrimary: INK,
    textSecondary: INK_MED,
    border: INK_BORDER,
    borderMed: INK_BORDER_MED,
    fill: INK_FILL,
    orbDot: INK_MED,
    arcColor: INK_GHOST,
    labelLatin: 'Luna Gibbosa',
    sublabelLatin: 'crescit lux',
    mode: 'dark',
  },
  full: {
    bg: ['#F8F4E8', '#FBF8EE', '#FDFAF2'],
    surface: '#FBF8EE',
    grain: 0.28,
    textPrimary: INK,
    textSecondary: INK_MED,
    border: INK_BORDER,
    borderMed: INK_BORDER_MED,
    fill: INK_FILL,
    orbDot: INK_MED,
    arcColor: INK_GHOST,
    labelLatin: 'Luna Plena',
    sublabelLatin: 'plena luce',
    mode: 'dim',
  },
  'waning-gibbous': {
    bg: ['#F5EFE4', '#F8F3E8', '#FAF5EB'],
    surface: '#F8F3E8',
    grain: 0.35,
    textPrimary: INK,
    textSecondary: INK_MED,
    border: INK_BORDER,
    borderMed: INK_BORDER_MED,
    fill: INK_FILL,
    orbDot: INK_MED,
    arcColor: INK_GHOST,
    labelLatin: 'Luna Gibbosa',
    sublabelLatin: 'minuit lux',
    mode: 'dark',
  },
  'last-quarter': {
    bg: ['#F3EDE2', '#F6F1E6', '#F8F3E9'],
    surface: '#F6F1E6',
    grain: 0.39,
    textPrimary: INK,
    textSecondary: INK_MED,
    border: INK_BORDER,
    borderMed: INK_BORDER_MED,
    fill: INK_FILL,
    orbDot: INK_MED,
    arcColor: INK_GHOST,
    labelLatin: 'Quadratura Ultima',
    sublabelLatin: 'dimidia lux',
    mode: 'dark',
  },
  'waning-crescent': {
    bg: ['#F0EAE0', '#F3EDE2', '#F5EFE5'],
    surface: '#F3EDE2',
    grain: 0.44,
    textPrimary: INK,
    textSecondary: INK_MED,
    border: INK_BORDER,
    borderMed: INK_BORDER_MED,
    fill: INK_FILL,
    orbDot: INK_MED,
    arcColor: INK_GHOST,
    labelLatin: 'Luna Senescens',
    sublabelLatin: 'minuit lux',
    mode: 'dark',
  },
};

// ─── Palette interpolation ────────────────────────────────────────────────────

function lerpNum(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function lerpParchmentLunarPalette(
  a: ParchmentLunarPalette,
  b: ParchmentLunarPalette,
  t: number,
): ParchmentLunarPalette {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const c = lerpColor;
  return {
    bg: [c(a.bg[0], b.bg[0], t), c(a.bg[1], b.bg[1], t), c(a.bg[2], b.bg[2], t)],
    surface: c(a.surface, b.surface, t),
    grain: lerpNum(a.grain, b.grain, t),
    textPrimary: a.textPrimary, // ink tokens are constant
    textSecondary: a.textSecondary,
    border: a.border,
    borderMed: a.borderMed,
    fill: a.fill,
    orbDot: a.orbDot,
    arcColor: a.arcColor,
    mode: t < 0.5 ? a.mode : b.mode,
    labelLatin: t < 0.5 ? a.labelLatin : b.labelLatin,
    sublabelLatin: t < 0.5 ? a.sublabelLatin : b.sublabelLatin,
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

function useParchmentLunaOrbRaf(orbRef: React.RefObject<SVGCircleElement>) {
  const curP = useRef(-1);
  const tgtP = useRef(0);
  const rafId = useRef<number | null>(null);
  const first = useRef(true);
  const fading = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPos = (p: number) => {
    const { x, y } = arcOrbPos(p);
    orbRef.current?.setAttribute('cx', String(x));
    orbRef.current?.setAttribute('cy', String(y));
  };

  const setOpacity = (o: number) => {
    if (orbRef.current) orbRef.current.style.opacity = String(o);
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

// ─── Grain SVG ────────────────────────────────────────────────────────────────
// Warmer noise for vellum — slightly coarser than paper's grain.

const GRAIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='v'><feTurbulence type='fractalNoise' baseFrequency='0.62' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(#v)' opacity='1'/></svg>`;
const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}")`;

// ─── Manuscript moon illustration ─────────────────────────────────────────────
// Drawn with sepia ink strokes — like a medieval illuminated manuscript.
// The terminator is a curve drawn in ink, not a clip-path.

export function ManuscriptMoonIcon({
  phase,
  size = 22,
}: {
  phase: LunarPhase;
  size?: number;
}) {
  const r = size / 2 - 1;
  const cx = size / 2;
  const cy = size / 2;
  const stroke = INK_LIGHT;
  const fill = INK_FILL;

  // Outer ring — always drawn
  const outerCircle = (
    <circle cx={cx} cy={cy} r={r} stroke={stroke} strokeWidth="0.9" fill={fill} />
  );

  if (phase === 'new') {
    // Just the outline circle + tiny cross at center — astronomical notation
    return (
      <svg
        role="presentation"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
      >
        {outerCircle}
        <line x1={cx - 2} y1={cy} x2={cx + 2} y2={cy} stroke={stroke} strokeWidth="0.7" />
        <line x1={cx} y1={cy - 2} x2={cx} y2={cy + 2} stroke={stroke} strokeWidth="0.7" />
      </svg>
    );
  }

  if (phase === 'full') {
    // Fully hatched circle — illuminated manuscript solid dot
    return (
      <svg
        role="presentation"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
      >
        <circle cx={cx} cy={cy} r={r} fill={INK_LIGHT} stroke={stroke} strokeWidth="0.9" />
        {/* Cross-hatch lines */}
        {[-0.4, 0, 0.4].map((offset) => (
          <line
            key={offset}
            x1={cx - r * 0.8}
            y1={cy + offset * r}
            x2={cx + r * 0.8}
            y2={cy + offset * r}
            stroke={INK_GHOST}
            strokeWidth="0.5"
          />
        ))}
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
        {outerCircle}
        <path d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z`} fill={INK_LIGHT} />
        <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke={stroke} strokeWidth="0.8" />
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
        {outerCircle}
        <path d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z`} fill={INK_LIGHT} />
        <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke={stroke} strokeWidth="0.8" />
      </svg>
    );
  }

  const isWaxing = phase === 'waxing-crescent' || phase === 'waxing-gibbous';
  const isThin = phase === 'waxing-crescent' || phase === 'waning-crescent';
  const offset = isThin ? r * 0.62 : r * 0.18;
  const dx = isWaxing ? -offset : offset;
  const maskId = `parch-luna-icon-${phase}-${size}`;

  return (
    <svg role="presentation" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <mask id={maskId}>
          <circle cx={cx} cy={cy} r={r} fill="white" />
          <circle cx={cx + dx} cy={cy} r={r} fill="black" />
        </mask>
      </defs>
      {outerCircle}
      <circle cx={cx} cy={cy} r={r} fill={INK_LIGHT} mask={`url(#${maskId})`} />
      {/* Terminator line — ink stroke */}
      <line
        x1={cx + dx / 2}
        y1={cy - r * 0.92}
        x2={cx + dx / 2}
        y2={cy + r * 0.92}
        stroke={stroke}
        strokeWidth="0.7"
        opacity={0.55}
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

const SPRING_EXPAND = { type: 'spring' as const, stiffness: 520, damping: 38, mass: 0.8 };
const SPRING_CONTENT = { type: 'spring' as const, stiffness: 550, damping: 42 };

// ─── ParchmentLunarWidgetProps ────────────────────────────────────────────────

export interface ParchmentLunarWidgetProps {
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

// ─── ParchmentLunarWidget ─────────────────────────────────────────────────────

export function ParchmentLunarWidget({
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
}: ParchmentLunarWidgetProps) {
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
      lerpParchmentLunarPalette(
        PARCHMENT_LUNAR_PALETTES[blend.phase],
        PARCHMENT_LUNAR_PALETTES[blend.nextPhase],
        blend.t,
      ),
    [blend],
  );

  const origin = TRANSFORM_ORIGINS[expandDirection] ?? 'top right';
  const yNudge = getYNudge(expandDirection);

  const [storedExpanded, setStoredExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const raw = localStorage.getItem('parchment-luna-widget-expanded');
      if (raw != null) return JSON.parse(raw);
    } catch {}
    return true;
  });

  const updateExpanded = useCallback((next: boolean) => {
    setStoredExpanded(next);
    try {
      localStorage.setItem('parchment-luna-widget-expanded', JSON.stringify(next));
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

  // ── Orb RAF ────────────────────────────────────────────────────────────────
  const orbRef = useRef<SVGCircleElement>(null);
  const { setTarget } = useParchmentLunaOrbRaf(orbRef);

  // Orb is always a flat 5–6px ink dot — scales very slightly with illumination
  // but stays restrained (no bloom). This is the manuscript aesthetic.
  const orbR = 5 + lunarPos.illumination * 1.5;

  const progressTarget = lunarPos.isVisible
    ? Math.max(0.01, Math.min(0.99, lunarPos.moonProgress))
    : 0.5;

  useEffect(() => {
    if (orbRef.current) orbRef.current.setAttribute('r', String(orbR));
    setTarget(progressTarget);
  });

  const arcPath = useMemo(() => buildArcPath(), []);
  const initPos = arcOrbPos(progressTarget);

  // ── Display ────────────────────────────────────────────────────────────────
  const illumPct = Math.round(lunarPos.illumination * 100);
  const moonriseStr = fmtMinutes(lunarPos.moonriseMinutes);
  const moonsetStr = fmtMinutes(lunarPos.moonsetMinutes);
  const isNearFull = ['full', 'waxing-gibbous', 'waning-gibbous'].includes(lunarPos.phase);
  const nextEventStr = isNearFull
    ? `${fmtDays(lunarPos.daysUntilFull)} ad plenam`
    : `${fmtDays(lunarPos.daysUntilNew)} ad novam`;

  const pillMinWidth = showIllumination ? 138 : 100;

  return (
    <div
      data-luna-skin="parchment"
      data-lunar-phase={lunarPos.phase}
      className={`relative ${className}`}
      style={{ isolation: 'isolate' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isExpanded ? (
          // ── EXPANDED ───────────────────────────────────────────────────────
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.88, y: yNudge }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: yNudge * 0.8 }}
            transition={SPRING_EXPAND}
            style={{
              width: W * expandScale,
              height: H * expandScale,
              transformOrigin: origin,
              position: 'relative',
            }}
            className="select-none"
          >
            {/* Drop shadow — minimal, no color */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                borderRadius: 6,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 2px 10px rgba(0,0,0,0.05)',
              }}
            />

            {/* Scale wrapper */}
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
                  borderRadius: 6,
                  border: `1px solid ${INK_BORDER_MED}`,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
                }}
                animate={{
                  background: `linear-gradient(160deg, ${palette.bg[0]} 0%, ${palette.bg[1]} 55%, ${palette.bg[2]} 100%)`,
                }}
                transition={{ duration: 1.8, ease: 'easeInOut' }}
              >
                {/* z=0 Grain texture — vellum feel */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 0,
                    backgroundImage: GRAIN_URL,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '200px 200px',
                    mixBlendMode: 'multiply',
                    opacity: palette.grain,
                    pointerEvents: 'none',
                    borderRadius: 6,
                    transition: 'opacity 1.8s ease-in-out',
                  }}
                />

                {/* z=1 Arc + ink dot orb — flat, no filters */}
                <svg
                  role="presentation"
                  aria-hidden
                  className="absolute inset-0"
                  style={{ zIndex: 1 }}
                  width={W}
                  height={H}
                  viewBox={`0 0 ${W} ${H}`}
                >
                  {/* Ink ruling — the arc of the moon's path */}
                  <path
                    d={arcPath}
                    fill="none"
                    stroke={INK_GHOST}
                    strokeWidth="0.8"
                    strokeDasharray="3 8"
                    strokeLinecap="round"
                  />
                  {/* Ink dot — the moon's position */}
                  <circle
                    ref={orbRef}
                    cx={initPos.x}
                    cy={initPos.y}
                    r={orbR}
                    fill={INK_MED}
                    style={{ transition: 'r 1.8s ease-in-out' }}
                  />
                </svg>

                {/* z=5 Header — Latin phase name */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    padding: '20px 22px 0',
                    zIndex: 5,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontFamily: VELLUM_FONT,
                          fontSize: 20,
                          fontWeight: 600,
                          color: INK,
                          letterSpacing: '0.02em',
                          lineHeight: 1.2,
                          margin: 0,
                        }}
                      >
                        {palette.labelLatin}
                      </p>
                      {showIllumination && (
                        <p
                          style={{
                            fontFamily: VELLUM_FONT,
                            fontStyle: 'italic',
                            fontSize: 11,
                            fontWeight: 400,
                            color: INK_LIGHT,
                            letterSpacing: '0.04em',
                            margin: '4px 0 0',
                          }}
                        >
                          {illumPct}% · {nextEventStr}
                        </p>
                      )}
                    </div>

                    {/* Manuscript moon illustration — top right */}
                    <div style={{ opacity: 0.55 }}>
                      <ManuscriptMoonIcon phase={lunarPos.phase} size={22} />
                    </div>
                  </div>
                </div>

                {/* z=5 Divider rule */}
                <div
                  style={{
                    position: 'absolute',
                    top: 50,
                    left: 22,
                    right: 22,
                    zIndex: 5,
                    height: 1,
                    background: INK_BORDER,
                  }}
                />

                {/* z=5 Bottom row — moonrise / sublabel / moonset */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '0 22px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    zIndex: 5,
                    opacity: showMoonrise ? 1 : 0,
                    transition: 'opacity 0.8s ease-in-out',
                  }}
                >
                  <span
                    style={{
                      fontFamily: VELLUM_FONT,
                      fontSize: 10,
                      color: INK_GHOST,
                      letterSpacing: '0.08em',
                    }}
                  >
                    ↑ {moonriseStr}
                  </span>
                  <span
                    style={{
                      fontFamily: VELLUM_FONT,
                      fontStyle: 'italic',
                      fontSize: 9,
                      color: INK_GHOST,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {palette.sublabelLatin}
                  </span>
                  <span
                    style={{
                      fontFamily: VELLUM_FONT,
                      fontSize: 10,
                      color: INK_GHOST,
                      letterSpacing: '0.08em',
                    }}
                  >
                    ↓ {moonsetStr}
                  </span>
                </div>

                {/* z=6 Collapse — same as Sol parchment */}
                {!forceExpanded &&
                  (() => {
                    const side = collapseButtonSide(expandDirection);
                    const isRight = side === 'right';
                    return (
                      <motion.button
                        onClick={() => setExpanded(false)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ ...SPRING_CONTENT, delay: 0.18 }}
                        whileHover={{ background: INK_FILL }}
                        whileTap={{ scale: 0.94 }}
                        aria-label="Collapse parchment luna widget"
                        style={{
                          position: 'absolute',
                          zIndex: 6,
                          top: 0,
                          ...(isRight ? { right: 0 } : { left: 0 }),
                          width: 28,
                          height: 28,
                          borderRadius: isRight ? '0 6px 0 6px' : '6px 0 6px 0',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background 0.15s ease',
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
                            stroke={INK_GHOST}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </motion.button>
                    );
                  })()}
              </motion.div>
            </div>
          </motion.div>
        ) : (
          // ── PILL — Notion document chip style ─────────────────────────────
          <motion.button
            key="collapsed"
            onClick={() => setExpanded(true)}
            initial={{ opacity: 0, scale: 0.78, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.78, y: -6 }}
            transition={SPRING_EXPAND}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 28,
              paddingLeft: 8,
              paddingRight: 10,
              borderRadius: 6,
              minWidth: pillMinWidth,
              background: INK_FILL,
              border: `1px solid ${INK_BORDER_MED}`,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              cursor: 'pointer',
              userSelect: 'none',
              transformOrigin: origin,
              scale: expandScale,
            }}
            whileHover={hoverEffect ? { background: 'rgba(45,35,20,0.08)' } : undefined}
            whileTap={{ scale: expandScale * 0.97 }}
            aria-label={`Parchment luna widget — ${palette.labelLatin}. Click to expand.`}
          >
            {/* Moon illustration at 18px */}
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
              <ManuscriptMoonIcon phase={lunarPos.phase} size={18} />
            </span>

            {/* Dot separator */}
            <span
              style={{
                width: 2,
                height: 2,
                borderRadius: '50%',
                background: INK_GHOST,
                flexShrink: 0,
              }}
            />

            {/* Illumination % */}
            {showIllumination && (
              <span
                style={{
                  fontFamily: VELLUM_FONT,
                  fontSize: 12,
                  fontWeight: 400,
                  color: INK_MED,
                  letterSpacing: '-0.01em',
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: 28,
                  opacity: 0.65,
                }}
              >
                {Math.round(lunarPos.illumination * 100)}%
              </span>
            )}

            {/* Dot separator */}
            <span
              style={{
                width: 2,
                height: 2,
                borderRadius: '50%',
                background: INK_GHOST,
                flexShrink: 0,
              }}
            />

            {/* Latin phase label */}
            <span
              style={{
                fontFamily: VELLUM_FONT,
                fontStyle: 'italic',
                fontSize: 11,
                fontWeight: 400,
                color: INK_MED,
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
              }}
            >
              {palette.labelLatin}
            </span>

            {/* Expand arrow */}
            <svg
              role="presentation"
              aria-hidden
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              style={{ opacity: 0.38, marginLeft: 1 }}
            >
              <path
                d={pillArrowPath(expandDirection)}
                stroke={INK}
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
