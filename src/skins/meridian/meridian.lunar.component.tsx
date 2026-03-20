'use client';
// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/meridian/meridian.lunar.component.tsx
// ════════════════════════════════════════════════════════════════════════════
/**
 * Meridian lunar skin.
 *
 * Sol meridian is clean, airy, anti-Foundry — barely-there surface tints,
 * stroke-only icons, hairline arc. Luna meridian translates this to an
 * astronomical coordinate grid aesthetic: the moon is plotted as a precise
 * point on a sparse graticule, cold and measured.
 *
 * Visual character:
 *   - Near-white dark backgrounds (dark mode uses very dark blue-grey)
 *   - Sparse coordinate grid lines at low opacity — the "graticule"
 *   - Moon plotted as a small precise dot + stroke ring, not a bloom
 *   - Orb presence scales with illumination but stays restrained
 *   - Arc: single hairline, dashed, parabolic
 *   - No aurora bands, no texture, no atmosphere
 *
 * Uses parabolic arc (same as void/foundry) — not elliptical.
 * No weather. No Sol runtime imports. Purely lunar.
 *
 * MOBILE EXPAND FIX: same pattern as meridian.component.tsx.
 */

import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LunarPhase, useLunarPosition } from '../../hooks/useLunarPosition';
import { lerpColor } from '../../lib/luna-lerp';
import { useLunaTheme } from '../../provider/luna-theme-provider';

// ─── Palette ──────────────────────────────────────────────────────────────────

export interface MeridianLunarPalette {
  bg: [string, string, string];
  surface: string;
  orbFill: string; // the precise moon dot
  orbRing: string; // stroke ring around the dot
  gridColor: string; // the coordinate grid lines
  arc: string; // the hairline arc
  textPrimary: string;
  textSecondary: string;
  accentColor: string; // hairline / fine detail color
  shadow: string;
  mode: 'dark' | 'dim'; // full → 'dim', all others → 'dark'
  label: string;
  sublabel: string;
}

// ─── MERIDIAN_LUNAR_PALETTES ──────────────────────────────────────────────────
// Cold, restrained. Near-black backgrounds with cold blue-grey tints.
// Full moon lifts to a slightly lighter surface (mode: 'dim') but never warm.

export const MERIDIAN_LUNAR_PALETTES: Record<LunarPhase, MeridianLunarPalette> = {
  new: {
    bg: ['#0E0F12', '#111318', '#141720'],
    surface: '#111318',
    orbFill: '#282C38',
    orbRing: 'rgba(50,56,74,0.30)',
    gridColor: 'rgba(60,66,88,0.10)',
    arc: 'rgba(80,88,112,0.18)',
    textPrimary: '#4A5068',
    textSecondary: 'rgba(60,66,90,0.50)',
    accentColor: '#2E3248',
    shadow: 'rgba(0,0,0,0.28)',
    mode: 'dark',
    label: 'new moon',
    sublabel: 'no light',
  },
  'waxing-crescent': {
    bg: ['#0F1018', '#121420', '#161828'],
    surface: '#121420',
    orbFill: '#485878',
    orbRing: 'rgba(72,88,120,0.32)',
    gridColor: 'rgba(80,96,130,0.12)',
    arc: 'rgba(90,108,148,0.22)',
    textPrimary: '#7080A0',
    textSecondary: 'rgba(88,100,130,0.55)',
    accentColor: '#3A4A6A',
    shadow: 'rgba(0,0,0,0.26)',
    mode: 'dark',
    label: 'crescent',
    sublabel: 'waxing',
  },
  'first-quarter': {
    bg: ['#101220', '#141628', '#181C30'],
    surface: '#141628',
    orbFill: '#6070A0',
    orbRing: 'rgba(96,112,160,0.35)',
    gridColor: 'rgba(100,116,168,0.14)',
    arc: 'rgba(108,124,176,0.26)',
    textPrimary: '#8898C8',
    textSecondary: 'rgba(106,118,160,0.60)',
    accentColor: '#485880',
    shadow: 'rgba(0,0,0,0.24)',
    mode: 'dark',
    label: 'first quarter',
    sublabel: 'half lit',
  },
  'waxing-gibbous': {
    bg: ['#121528', '#171A32', '#1C1F3C'],
    surface: '#171A32',
    orbFill: '#7888B8',
    orbRing: 'rgba(120,136,184,0.38)',
    gridColor: 'rgba(122,140,188,0.16)',
    arc: 'rgba(128,146,196,0.28)',
    textPrimary: '#A0AEDE',
    textSecondary: 'rgba(122,136,180,0.65)',
    accentColor: '#5868A0',
    shadow: 'rgba(0,0,0,0.22)',
    mode: 'dark',
    label: 'gibbous',
    sublabel: 'waxing',
  },
  full: {
    bg: ['#161A38', '#1C2242', '#222850'],
    surface: '#1C2242',
    orbFill: '#C0C8E8',
    orbRing: 'rgba(190,200,232,0.45)',
    gridColor: 'rgba(168,180,220,0.20)',
    arc: 'rgba(176,188,228,0.32)',
    textPrimary: '#C8D4F0',
    textSecondary: 'rgba(170,182,220,0.72)',
    accentColor: '#8898D0',
    shadow: 'rgba(0,0,0,0.18)',
    mode: 'dim',
    label: 'full moon',
    sublabel: 'full illumination',
  },
  'waning-gibbous': {
    bg: ['#121528', '#161830', '#1A1D3A'],
    surface: '#161830',
    orbFill: '#7585B6',
    orbRing: 'rgba(117,133,182,0.36)',
    gridColor: 'rgba(120,136,184,0.15)',
    arc: 'rgba(126,142,192,0.26)',
    textPrimary: '#9DAADB',
    textSecondary: 'rgba(120,132,176,0.63)',
    accentColor: '#56669E',
    shadow: 'rgba(0,0,0,0.23)',
    mode: 'dark',
    label: 'gibbous',
    sublabel: 'waning',
  },
  'last-quarter': {
    bg: ['#101220', '#131526', '#17192E'],
    surface: '#131526',
    orbFill: '#5D6D9C',
    orbRing: 'rgba(93,109,156,0.33)',
    gridColor: 'rgba(96,112,162,0.13)',
    arc: 'rgba(104,120,170,0.24)',
    textPrimary: '#8592C4',
    textSecondary: 'rgba(102,114,156,0.58)',
    accentColor: '#46567E',
    shadow: 'rgba(0,0,0,0.25)',
    mode: 'dark',
    label: 'last quarter',
    sublabel: 'half lit',
  },
  'waning-crescent': {
    bg: ['#0F1018', '#111318', '#141620'],
    surface: '#111318',
    orbFill: '#424E6A',
    orbRing: 'rgba(66,78,106,0.28)',
    gridColor: 'rgba(70,82,112,0.10)',
    arc: 'rgba(80,94,124,0.18)',
    textPrimary: '#626C8A',
    textSecondary: 'rgba(78,88,114,0.50)',
    accentColor: '#32405A',
    shadow: 'rgba(0,0,0,0.28)',
    mode: 'dark',
    label: 'crescent',
    sublabel: 'waning',
  },
};

// ─── Palette interpolation ────────────────────────────────────────────────────

export function lerpMeridianLunarPalette(
  a: MeridianLunarPalette,
  b: MeridianLunarPalette,
  t: number,
): MeridianLunarPalette {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const c = lerpColor;
  return {
    bg: [c(a.bg[0], b.bg[0], t), c(a.bg[1], b.bg[1], t), c(a.bg[2], b.bg[2], t)],
    surface: c(a.surface, b.surface, t),
    orbFill: c(a.orbFill, b.orbFill, t),
    orbRing: c(a.orbRing, b.orbRing, t),
    gridColor: c(a.gridColor, b.gridColor, t),
    arc: c(a.arc, b.arc, t),
    textPrimary: c(a.textPrimary, b.textPrimary, t),
    textSecondary: c(a.textSecondary, b.textSecondary, t),
    accentColor: c(a.accentColor, b.accentColor, t),
    shadow: c(a.shadow, b.shadow, t),
    mode: t < 0.5 ? a.mode : b.mode,
    label: t < 0.5 ? a.label : b.label,
    sublabel: t < 0.5 ? a.sublabel : b.sublabel,
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
  return {
    x: t * W,
    y: ARC_BASE_Y - ARC_H * 4 * t * (1 - t),
  };
}

function buildArcPath(pts = 120): string {
  return Array.from({ length: pts }, (_, i) => {
    const t = i / (pts - 1);
    return `${i === 0 ? 'M' : 'L'}${(t * W).toFixed(1)},${(
      ARC_BASE_Y - ARC_H * 4 * t * (1 - t)
    ).toFixed(1)}`;
  }).join(' ');
}

// ─── Orb RAF (parabolic, precise dot) ────────────────────────────────────────

function useMeridianLunaOrbRaf(refs: {
  ring: React.RefObject<SVGCircleElement>;
  dot: React.RefObject<SVGCircleElement>;
}) {
  const curP = useRef(-1);
  const tgtP = useRef(0);
  const rafId = useRef<number | null>(null);
  const first = useRef(true);
  const fading = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPos = (p: number) => {
    const { x, y } = arcOrbPos(p);
    for (const r of [refs.ring, refs.dot]) {
      r.current?.setAttribute('cx', String(x));
      r.current?.setAttribute('cy', String(y));
    }
  };

  const setOpacity = (o: number) => {
    for (const r of [refs.ring, refs.dot]) {
      if (r.current) r.current.style.opacity = String(o);
    }
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

// ─── Coordinate graticule overlay ─────────────────────────────────────────────
// Sparse horizontal + vertical lines, very low opacity — like a star chart grid.

function AstroGraticule({
  color,
  illumination,
}: {
  color: string;
  illumination: number;
}) {
  // Grid brightens slightly with illumination (more visible at full moon)
  const op = 0.08 + illumination * 0.1;
  return (
    <svg
      role="presentation"
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
    >
      {/* Horizontal lines — 4 evenly spaced */}
      {[0.22, 0.44, 0.66, 0.88].map((f) => (
        <line
          key={`h${f}`}
          x1={0}
          y1={f * H}
          x2={W}
          y2={f * H}
          stroke={color}
          strokeWidth={0.5}
          opacity={op}
        />
      ))}
      {/* Vertical lines — 5 evenly spaced */}
      {[0.17, 0.33, 0.5, 0.67, 0.83].map((f) => (
        <line
          key={`v${f}`}
          x1={f * W}
          y1={0}
          x2={f * W}
          y2={H}
          stroke={color}
          strokeWidth={0.5}
          opacity={op}
        />
      ))}
      {/* Tick marks at intersections near the arc — small crosses */}
      {[0.25, 0.5, 0.75].map((fx) => (
        <g key={`tick${fx}`}>
          <line
            x1={fx * W - 3}
            y1={H * 0.44}
            x2={fx * W + 3}
            y2={H * 0.44}
            stroke={color}
            strokeWidth={0.5}
            opacity={op * 1.4}
          />
          <line
            x1={fx * W}
            y1={H * 0.44 - 3}
            x2={fx * W}
            y2={H * 0.44 + 3}
            stroke={color}
            strokeWidth={0.5}
            opacity={op * 1.4}
          />
        </g>
      ))}
    </svg>
  );
}

// ─── Moon phase icon — stroke-only, Meridian aesthetic ───────────────────────

function MoonPhaseIcon({
  phase,
  color,
  size = 22,
}: {
  phase: LunarPhase;
  color: string;
  size?: number;
}) {
  const r = size / 2 - 1.5;
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
        <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="1" opacity={0.28} />
        {/* Small cross marking center — astronomical notation */}
        <line
          x1={cx - 2}
          y1={cy}
          x2={cx + 2}
          y2={cy}
          stroke={color}
          strokeWidth="0.8"
          opacity={0.2}
        />
        <line
          x1={cx}
          y1={cy - 2}
          x2={cx}
          y2={cy + 2}
          stroke={color}
          strokeWidth="0.8"
          opacity={0.2}
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
        <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="1" opacity={0.75} />
        <circle cx={cx} cy={cy} r={r * 0.55} fill={color} opacity={0.85} />
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
        <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="1" opacity={0.45} />
        <path
          d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z`}
          fill={color}
          opacity={0.8}
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
        <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="1" opacity={0.45} />
        <path
          d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z`}
          fill={color}
          opacity={0.8}
        />
      </svg>
    );
  }
  const isWaxing = phase === 'waxing-crescent' || phase === 'waxing-gibbous';
  const isThin = phase === 'waxing-crescent' || phase === 'waning-crescent';
  const offset = isThin ? r * 0.62 : r * 0.18;
  const dx = isWaxing ? -offset : offset;
  const maskId = `meridian-luna-moon-${phase}-${size}`;

  return (
    <svg role="presentation" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <mask id={maskId}>
          <circle cx={cx} cy={cy} r={r} fill="white" />
          <circle cx={cx + dx} cy={cy} r={r} fill="black" />
        </mask>
      </defs>
      <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="1" fill="none" opacity={0.45} />
      <circle cx={cx} cy={cy} r={r} fill={color} mask={`url(#${maskId})`} opacity={0.8} />
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

const SPRING_EXPAND = {
  type: 'spring' as const,
  stiffness: 540,
  damping: 42,
  mass: 0.8,
};
const SPRING_CONTENT = {
  type: 'spring' as const,
  stiffness: 560,
  damping: 44,
};

// ─── MeridianLunarWidgetProps ─────────────────────────────────────────────────

export interface MeridianLunarWidgetProps {
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

// ─── MeridianLunarWidget ──────────────────────────────────────────────────────

export function MeridianLunarWidget({
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
}: MeridianLunarWidgetProps) {
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
      lerpMeridianLunarPalette(
        MERIDIAN_LUNAR_PALETTES[blend.phase],
        MERIDIAN_LUNAR_PALETTES[blend.nextPhase],
        blend.t,
      ),
    [blend],
  );

  const origin = TRANSFORM_ORIGINS[expandDirection] ?? 'top right';
  const yNudge = getYNudge(expandDirection);

  const [storedExpanded, setStoredExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const raw = localStorage.getItem('meridian-luna-widget-expanded');
      if (raw != null) return JSON.parse(raw);
    } catch {}
    return true;
  });

  const updateExpanded = useCallback((next: boolean) => {
    setStoredExpanded(next);
    try {
      localStorage.setItem('meridian-luna-widget-expanded', JSON.stringify(next));
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
  const ringRef = useRef<SVGCircleElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const { setTarget } = useMeridianLunaOrbRaf({ ring: ringRef, dot: dotRef });

  // Ring and dot scale with illumination — restrained but present
  const orbOpacity = Math.max(0.06, lunarPos.illumination * 0.94 + 0.06);
  const dotR = 3.5 + lunarPos.illumination * 3.5;
  const ringR = dotR + 4 + lunarPos.illumination * 4;

  const progressTarget = lunarPos.isVisible
    ? Math.max(0.01, Math.min(0.99, lunarPos.moonProgress))
    : 0.5;

  useEffect(() => {
    if (ringRef.current) {
      ringRef.current.style.stroke = palette.orbRing;
      ringRef.current.setAttribute('r', String(ringR));
    }
    if (dotRef.current) {
      dotRef.current.style.fill = palette.orbFill;
      dotRef.current.setAttribute('r', String(dotR));
    }
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
    ? `${fmtDays(lunarPos.daysUntilFull)} to full`
    : `${fmtDays(lunarPos.daysUntilNew)} to new`;

  const pillMinWidth = showIllumination ? 118 : 88;
  const SANS = "'Inter','SF Pro Display','Helvetica Neue',sans-serif";

  return (
    <div
      data-luna-skin="meridian"
      data-lunar-phase={lunarPos.phase}
      className={`relative ${className}`}
      style={{ isolation: 'isolate' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isExpanded ? (
          // ── EXPANDED ───────────────────────────────────────────────────────
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
            {/* Outer shadow — very restrained, no glow */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ borderRadius: '1rem' }}
              animate={{
                boxShadow: `0 4px 24px 0px ${palette.shadow}, 0 1px 4px 0px ${palette.shadow}`,
              }}
              transition={{ duration: 1.5 }}
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
                  borderRadius: '1rem',
                  border: `1px solid rgba(255,255,255,${palette.mode === 'dim' ? '0.08' : '0.05'})`,
                }}
                animate={{ background: palette.surface }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
              >
                {/* z=1 Astronomical coordinate graticule */}
                <AstroGraticule color={palette.gridColor} illumination={lunarPos.illumination} />

                {/* z=2 Arc hairline — dashed */}
                <svg
                  role="presentation"
                  aria-hidden
                  className="absolute inset-0"
                  style={{ zIndex: 2, pointerEvents: 'none' }}
                  width={W}
                  height={H}
                  viewBox={`0 0 ${W} ${H}`}
                >
                  <path
                    d={arcPath}
                    fill="none"
                    stroke={palette.arc}
                    strokeWidth="0.8"
                    strokeDasharray="3 7"
                    strokeLinecap="round"
                  />
                </svg>

                {/* z=3 Orb — precise dot + stroke ring */}
                <svg
                  role="presentation"
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    zIndex: 3,
                    opacity: orbOpacity,
                    transition: 'opacity 1.8s ease-in-out',
                  }}
                  width={W}
                  height={H}
                  viewBox={`0 0 ${W} ${H}`}
                >
                  {/* Stroke ring — thin, restrained */}
                  <circle
                    ref={ringRef}
                    cx={initPos.x}
                    cy={initPos.y}
                    r={ringR}
                    fill="none"
                    strokeWidth="0.8"
                    style={{
                      stroke: palette.orbRing,
                      transition: 'stroke 1.5s ease-in-out',
                    }}
                  />
                  {/* Precise dot — the moon's position */}
                  <circle
                    ref={dotRef}
                    cx={initPos.x}
                    cy={initPos.y}
                    r={dotR}
                    style={{
                      fill: palette.orbFill,
                      transition: 'fill 1.5s ease-in-out',
                    }}
                  />
                </svg>

                {/* z=5 Header */}
                <div className="absolute top-0 left-0 right-0 px-5 pt-5" style={{ zIndex: 5 }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <motion.p
                        style={{
                          fontFamily: SANS,
                          fontSize: 14,
                          fontWeight: 400,
                          letterSpacing: '0.01em',
                          lineHeight: 1,
                          opacity: 0.4,
                        }}
                        animate={{ color: palette.textPrimary }}
                        transition={{ duration: 1.5 }}
                      >
                        {palette.label}
                      </motion.p>
                      {showIllumination && (
                        <motion.p
                          style={{
                            fontFamily: SANS,
                            fontSize: 10,
                            fontWeight: 300,
                            letterSpacing: '0.06em',
                            marginTop: 5,
                            opacity: 0.26,
                          }}
                          animate={{ color: palette.textSecondary }}
                          transition={{ duration: 1.5 }}
                        >
                          {illumPct}% · {nextEventStr}
                        </motion.p>
                      )}
                    </div>

                    {/* Phase icon — stroke-only, Meridian style */}
                    <motion.div
                      animate={{ opacity: 0.42 }}
                      style={{ transition: 'opacity 1.2s ease-in-out' }}
                    >
                      <MoonPhaseIcon phase={lunarPos.phase} color={palette.orbFill} size={22} />
                    </motion.div>
                  </div>
                </div>

                {/* z=5 Bottom row — moonrise / sublabel / moonset */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 px-5 pb-[14px] flex items-center justify-between"
                  style={{
                    zIndex: 5,
                    opacity: showMoonrise ? 0.3 : 0,
                    transition: 'opacity 0.8s ease-in-out',
                  }}
                  animate={{ color: palette.textSecondary }}
                  transition={{ duration: 1.5 }}
                >
                  <span
                    style={{
                      fontFamily: SANS,
                      fontSize: 9,
                      letterSpacing: '0.10em',
                      fontWeight: 300,
                    }}
                  >
                    ↑ {moonriseStr}
                  </span>
                  {/* Center divider line — Meridian's clean language */}
                  <motion.span
                    style={{
                      display: 'block',
                      flex: 1,
                      margin: '0 12px',
                      height: 0,
                      borderTop: `1px solid ${palette.gridColor}`,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: SANS,
                      fontSize: 9,
                      letterSpacing: '0.10em',
                      fontWeight: 300,
                    }}
                  >
                    ↓ {moonsetStr}
                  </span>
                </motion.div>

                {/* z=7 Collapse button */}
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
                        transition={{ ...SPRING_CONTENT, delay: 0.16 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label="Collapse meridian luna widget"
                        style={{
                          position: 'absolute',
                          zIndex: 7,
                          top: 0,
                          ...(isRight ? { right: 0 } : { left: 0 }),
                          width: 34,
                          height: 34,
                          borderRadius: isRight ? '0 1rem 0 10px' : '1rem 0 10px 0',
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
                            stroke={palette.textSecondary}
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            opacity="0.55"
                          />
                        </svg>
                      </motion.button>
                    );
                  })()}
              </motion.div>
            </div>
          </motion.div>
        ) : (
          // ── PILL ──────────────────────────────────────────────────────────
          <motion.button
            key="collapsed"
            onClick={() => setExpanded(true)}
            initial={{ opacity: 0, scale: 0.8, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -6 }}
            transition={SPRING_EXPAND}
            className="flex items-center gap-2 cursor-pointer select-none"
            style={{
              height: 34,
              minWidth: pillMinWidth,
              paddingLeft: 10,
              paddingRight: 13,
              borderRadius: 17,
              background: palette.surface,
              border: `1px solid ${palette.arc}`,
              boxShadow: `0 2px 12px ${palette.shadow}`,
              transformOrigin: origin,
              scale: expandScale,
            }}
            whileHover={hoverEffect ? { scale: expandScale * 1.04 } : undefined}
            whileTap={{ scale: expandScale * 0.96 }}
            aria-label={`Meridian luna widget — ${palette.label}. Click to expand.`}
          >
            {/* Moon phase icon */}
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 18,
                height: 18,
                flexShrink: 0,
              }}
            >
              <MoonPhaseIcon phase={lunarPos.phase} color={palette.orbFill} size={15} />
            </span>

            {/* Illumination % */}
            {showIllumination && (
              <motion.span
                style={{
                  fontFamily: SANS,
                  fontSize: 12,
                  fontWeight: 400,
                  letterSpacing: '-0.01em',
                  minWidth: 28,
                }}
                animate={{ color: palette.textPrimary, opacity: 0.4 }}
                transition={{ duration: 1.5 }}
              >
                {illumPct}%
              </motion.span>
            )}

            {/* Dot separator */}
            <span
              style={{
                width: 3,
                height: 3,
                borderRadius: '50%',
                background: palette.arc,
                opacity: 0.5,
                flexShrink: 0,
              }}
            />

            {/* Phase label */}
            <motion.span
              style={{
                fontFamily: SANS,
                fontSize: 11,
                fontWeight: 400,
                letterSpacing: '0.01em',
                opacity: 0.4,
                whiteSpace: 'nowrap',
              }}
              animate={{ color: palette.textSecondary }}
              transition={{ duration: 1.5 }}
            >
              {palette.label}
            </motion.span>

            {/* Expand arrow */}
            <svg
              role="presentation"
              aria-hidden
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              style={{ marginLeft: 2, opacity: 0.38 }}
            >
              <path
                d={pillArrowPath(expandDirection)}
                stroke={palette.textSecondary}
                strokeWidth="1.4"
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
