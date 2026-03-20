'use client';
// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/sundial/sundial.lunar.component.tsx
// ════════════════════════════════════════════════════════════════════════════
/**
 * Sundial lunar skin.
 *
 * Sol sundial: warm stone/marble, Roman numeral arc, gnomon shadow, Latin
 * phase labels (MANE, MERIDIES, NOX…), Palatino italic, carved groove arc.
 *
 * Luna sundial: the same classical instrument aesthetic, but the stone is
 * COLD MOONSTONE throughout (never warm amber). All 8 lunar phases use cool
 * blue-grey / silver-grey / slate tones. The Latin phase names are lunar
 * rather than solar — LUNA NOVA, LUNA PLENA, QUADRATURA PRIMA, etc.
 *
 * Defining visual: the GNOMON SHADOW scales with illumination. At new moon
 * the gnomon shadow is nearly invisible (the moon casts no shadow). At full
 * moon it is at maximum presence. This is the key difference from Sol sundial
 * where the gnomon is always solid.
 *
 * Stone luster: cool silver-blue rather than warm amber.
 * Stars: always faintly visible (it is always night).
 * Roman numerals on the arc: remain the same clock-face convention.
 * localStorage: 'sundial-luna-widget-expanded'
 *
 * Uses parabolic arc. No weather. No Sol runtime. Purely lunar.
 */

import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LunarPhase, useLunarPosition } from '../../hooks/useLunarPosition';
import { lerpColor } from '../../lib/luna-lerp';
import { useLunaTheme } from '../../provider/luna-theme-provider';

// ─── Palette ──────────────────────────────────────────────────────────────────

export interface SundialLunarPalette {
  bg: [string, string, string];
  luster: string; // cool silver-blue stone luster
  arcColor: string; // carved arc stroke
  arcGroove: string; // second groove line
  shadowColor: string; // gnomon shadow line
  orbFill: string; // moon orb color
  orbGlow: string; // orb halo
  tickColor: string; // Roman numeral tick marks
  textPrimary: string;
  textSecondary: string;
  outerGlow: string;
  pillBg: string;
  pillBorder: string;
  pillText: string;
  labelLatin: string; // Latin lunar phase name
  sublabel: string; // Latin sublabel
  starOpacity: number; // faint stars always visible
  mode: 'dark' | 'dim';
}

// ─── SUNDIAL_LUNAR_PALETTES ───────────────────────────────────────────────────
// Cold moonstone throughout. No warm tones.
// New moon: very dark slate/charcoal. Full moon: lighter silver-slate.

export const SUNDIAL_LUNAR_PALETTES: Record<LunarPhase, SundialLunarPalette> = {
  new: {
    bg: ['#0E0F14', '#12131A', '#161820'],
    luster: 'rgba(70,78,108,0.08)',
    arcColor: '#2A2E42',
    arcGroove: 'rgba(50,56,80,0.22)',
    shadowColor: 'rgba(30,34,52,0.20)', // nearly invisible — no moonlight
    orbFill: '#2A2E44',
    orbGlow: 'rgba(30,34,60,0.30)',
    tickColor: 'rgba(50,56,82,0.28)',
    textPrimary: '#585E7A',
    textSecondary: 'rgba(52,58,82,0.45)',
    outerGlow: 'rgba(18,20,38,0.22)',
    pillBg: 'rgba(14,15,20,0.96)',
    pillBorder: 'rgba(44,48,72,0.32)',
    pillText: 'rgba(88,94,122,0.80)',
    labelLatin: 'LUNA NOVA',
    sublabel: 'nullo lumine',
    starOpacity: 0.55,
    mode: 'dark',
  },
  'waxing-crescent': {
    bg: ['#101420', '#151A2A', '#1A2032'],
    luster: 'rgba(80,98,148,0.10)',
    arcColor: '#323C5A',
    arcGroove: 'rgba(62,76,118,0.25)',
    shadowColor: 'rgba(40,50,80,0.28)',
    orbFill: '#404E78',
    orbGlow: 'rgba(44,56,100,0.40)',
    tickColor: 'rgba(60,74,116,0.32)',
    textPrimary: '#7080A8',
    textSecondary: 'rgba(64,76,116,0.50)',
    outerGlow: 'rgba(26,32,68,0.25)',
    pillBg: 'rgba(16,20,32,0.96)',
    pillBorder: 'rgba(54,66,104,0.35)',
    pillText: 'rgba(112,128,168,0.82)',
    labelLatin: 'LUNA CRESCENS',
    sublabel: 'crescit lux',
    starOpacity: 0.45,
    mode: 'dark',
  },
  'first-quarter': {
    bg: ['#121828', '#18202E', '#1E2838'],
    luster: 'rgba(90,110,165,0.12)',
    arcColor: '#3A4668',
    arcGroove: 'rgba(72,90,140,0.28)',
    shadowColor: 'rgba(48,60,100,0.35)',
    orbFill: '#4C5E90',
    orbGlow: 'rgba(54,68,120,0.48)',
    tickColor: 'rgba(72,88,138,0.35)',
    textPrimary: '#8294C0',
    textSecondary: 'rgba(76,92,142,0.55)',
    outerGlow: 'rgba(32,40,88,0.28)',
    pillBg: 'rgba(18,24,40,0.96)',
    pillBorder: 'rgba(64,80,128,0.38)',
    pillText: 'rgba(130,148,192,0.85)',
    labelLatin: 'QUADRATURA PRIMA',
    sublabel: 'dimidia pars lucis',
    starOpacity: 0.38,
    mode: 'dark',
  },
  'waxing-gibbous': {
    bg: ['#141A2C', '#1A2238', '#202A44'],
    luster: 'rgba(100,120,180,0.14)',
    arcColor: '#425078',
    arcGroove: 'rgba(82,102,158,0.30)',
    shadowColor: 'rgba(56,70,118,0.42)',
    orbFill: '#5870A8',
    orbGlow: 'rgba(64,80,140,0.55)',
    tickColor: 'rgba(82,100,158,0.38)',
    textPrimary: '#94A8D4',
    textSecondary: 'rgba(86,104,162,0.60)',
    outerGlow: 'rgba(38,48,105,0.32)',
    pillBg: 'rgba(20,26,44,0.96)',
    pillBorder: 'rgba(74,92,148,0.42)',
    pillText: 'rgba(148,168,212,0.88)',
    labelLatin: 'LUNA GIBBOSA',
    sublabel: 'crescit lux plena',
    starOpacity: 0.28,
    mode: 'dark',
  },
  full: {
    bg: ['#18203A', '#202848', '#28305A'],
    luster: 'rgba(120,140,205,0.18)',
    arcColor: '#5060A0',
    arcGroove: 'rgba(100,118,190,0.35)',
    shadowColor: 'rgba(70,86,155,0.52)', // max shadow — full moonlight
    orbFill: '#708AC0',
    orbGlow: 'rgba(80,100,175,0.68)',
    tickColor: 'rgba(100,118,192,0.42)',
    textPrimary: '#A8BAE4',
    textSecondary: 'rgba(100,118,184,0.68)',
    outerGlow: 'rgba(52,64,130,0.40)',
    pillBg: 'rgba(24,32,58,0.96)',
    pillBorder: 'rgba(88,106,172,0.48)',
    pillText: 'rgba(168,186,228,0.90)',
    labelLatin: 'LUNA PLENA',
    sublabel: 'plena luce lucet',
    starOpacity: 0.12,
    mode: 'dim',
  },
  'waning-gibbous': {
    bg: ['#161E38', '#1C2444', '#222C52'],
    luster: 'rgba(116,136,200,0.16)',
    arcColor: '#4C5C9C',
    arcGroove: 'rgba(96,114,186,0.33)',
    shadowColor: 'rgba(66,82,150,0.50)',
    orbFill: '#6C86BC',
    orbGlow: 'rgba(76,96,170,0.65)',
    tickColor: 'rgba(96,114,188,0.40)',
    textPrimary: '#A4B6E0',
    textSecondary: 'rgba(96,114,180,0.65)',
    outerGlow: 'rgba(48,60,126,0.38)',
    pillBg: 'rgba(22,30,56,0.96)',
    pillBorder: 'rgba(84,102,168,0.46)',
    pillText: 'rgba(164,182,224,0.88)',
    labelLatin: 'LUNA GIBBOSA',
    sublabel: 'decrescit lux',
    starOpacity: 0.18,
    mode: 'dark',
  },
  'last-quarter': {
    bg: ['#121828', '#171E30', '#1C2438'],
    luster: 'rgba(88,108,162,0.12)',
    arcColor: '#384464',
    arcGroove: 'rgba(70,88,136,0.27)',
    shadowColor: 'rgba(46,58,97,0.38)',
    orbFill: '#4A5C8C',
    orbGlow: 'rgba(52,66,116,0.50)',
    tickColor: 'rgba(70,86,135,0.34)',
    textPrimary: '#8090BC',
    textSecondary: 'rgba(74,90,138,0.55)',
    outerGlow: 'rgba(30,38,86,0.28)',
    pillBg: 'rgba(18,24,40,0.96)',
    pillBorder: 'rgba(62,78,124,0.38)',
    pillText: 'rgba(128,144,188,0.84)',
    labelLatin: 'QUADRATURA ULTIMA',
    sublabel: 'dimidia pars lucis',
    starOpacity: 0.36,
    mode: 'dark',
  },
  'waning-crescent': {
    bg: ['#0E1018', '#121520', '#161A28'],
    luster: 'rgba(72,84,122,0.09)',
    arcColor: '#2C3048',
    arcGroove: 'rgba(54,60,92,0.22)',
    shadowColor: 'rgba(34,40,65,0.22)',
    orbFill: '#363E5E',
    orbGlow: 'rgba(36,44,78,0.35)',
    tickColor: 'rgba(54,62,98,0.28)',
    textPrimary: '#5E6482',
    textSecondary: 'rgba(55,62,92,0.46)',
    outerGlow: 'rgba(20,24,50,0.22)',
    pillBg: 'rgba(14,16,24,0.96)',
    pillBorder: 'rgba(46,52,80,0.30)',
    pillText: 'rgba(94,100,130,0.78)',
    labelLatin: 'LUNA DECRESCENS',
    sublabel: 'minuit lux',
    starOpacity: 0.5,
    mode: 'dark',
  },
};

// ─── Palette interpolation ────────────────────────────────────────────────────

function lerpNum(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function lerpSundialLunarPalette(
  a: SundialLunarPalette,
  b: SundialLunarPalette,
  t: number,
): SundialLunarPalette {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const c = lerpColor;
  return {
    bg: [c(a.bg[0], b.bg[0], t), c(a.bg[1], b.bg[1], t), c(a.bg[2], b.bg[2], t)],
    luster: t < 0.5 ? a.luster : b.luster,
    arcColor: c(a.arcColor, b.arcColor, t),
    arcGroove: c(a.arcGroove, b.arcGroove, t),
    shadowColor: c(a.shadowColor, b.shadowColor, t),
    orbFill: c(a.orbFill, b.orbFill, t),
    orbGlow: c(a.orbGlow, b.orbGlow, t),
    tickColor: c(a.tickColor, b.tickColor, t),
    textPrimary: c(a.textPrimary, b.textPrimary, t),
    textSecondary: c(a.textSecondary, b.textSecondary, t),
    outerGlow: c(a.outerGlow, b.outerGlow, t),
    pillBg: c(a.pillBg, b.pillBg, t),
    pillBorder: c(a.pillBorder, b.pillBorder, t),
    pillText: c(a.pillText, b.pillText, t),
    starOpacity: lerpNum(a.starOpacity, b.starOpacity, t),
    mode: t < 0.5 ? a.mode : b.mode,
    labelLatin: t < 0.5 ? a.labelLatin : b.labelLatin,
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

// ─── Arc constants ────────────────────────────────────────────────────────────

const W = 360;
const H = 180;
const ARC_BASE_Y = 162;
const ARC_ZENITH_Y = 32;
const ARC_HEIGHT = ARC_BASE_Y - ARC_ZENITH_Y;

const ROMAN_TICKS: Array<{ frac: number; label: string }> = [
  { frac: 0.0, label: 'VI' },
  { frac: 0.25, label: 'IX' },
  { frac: 0.5, label: 'XII' },
  { frac: 0.75, label: 'III' },
  { frac: 1.0, label: 'VI' },
];

function arcOrbPos(progress: number) {
  const t = Math.max(0.01, Math.min(0.99, progress));
  return { x: t * W, y: ARC_BASE_Y - ARC_HEIGHT * 4 * t * (1 - t) };
}

function buildArcPath(pts = 120): string {
  return Array.from({ length: pts }, (_, i) => {
    const t = i / (pts - 1);
    return `${i === 0 ? 'M' : 'L'}${(t * W).toFixed(1)},${(
      ARC_BASE_Y - ARC_HEIGHT * 4 * t * (1 - t)
    ).toFixed(1)}`;
  }).join(' ');
}

function buildArcGroovePath(offset: number, pts = 120): string {
  return Array.from({ length: pts }, (_, i) => {
    const t = i / (pts - 1);
    return `${i === 0 ? 'M' : 'L'}${(t * W).toFixed(1)},${(
      ARC_BASE_Y - ARC_HEIGHT * 4 * t * (1 - t) + offset
    ).toFixed(1)}`;
  }).join(' ');
}

// ─── Orb RAF ──────────────────────────────────────────────────────────────────

function useSundialLunaOrbRaf(refs: {
  orbGroup: React.RefObject<SVGGElement>;
  gnomon: React.RefObject<SVGLineElement>;
}) {
  const curP = useRef(-1);
  const tgtP = useRef(0);
  const rafId = useRef<number | null>(null);
  const first = useRef(true);
  const fading = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPos = (prog: number) => {
    const t = Math.max(0.01, Math.min(0.99, prog));
    const x = t * W;
    const y = ARC_BASE_Y - ARC_HEIGHT * 4 * t * (1 - t);
    refs.orbGroup.current?.setAttribute('transform', `translate(${x.toFixed(2)},${y.toFixed(2)})`);
    if (refs.gnomon.current) {
      refs.gnomon.current.setAttribute('x1', String(x.toFixed(2)));
      refs.gnomon.current.setAttribute('y1', String(y.toFixed(2)));
      refs.gnomon.current.setAttribute('x2', String(x.toFixed(2)));
    }
  };

  const setOpacity = (o: number) => {
    if (refs.orbGroup.current) refs.orbGroup.current.style.opacity = String(o);
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
    if (Math.abs(circDelta) < 0.03 && !fading.current) {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      curP.current = tgtP.current;
      setPos(curP.current);
      return;
    }
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

// ─── Seeded random (stars) ────────────────────────────────────────────────────

function sr(s: number) {
  const x = Math.sin(s + 1) * 10000;
  return x - Math.floor(x);
}

// ─── Sundial lunar pill icon ──────────────────────────────────────────────────
// Same as Sol sundial's SundialIcon — a gnomon + arc + circle.

function SundialLunaIcon({ color, size = 16 }: { color: string; size?: number }) {
  const cx = size * 0.5;
  const cy = size * 0.66;
  const r = size * 0.3;
  return (
    <svg
      role="presentation"
      aria-hidden
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
    >
      <line
        x1={size * 0.1}
        y1={cy}
        x2={size * 0.9}
        y2={cy}
        stroke={color}
        strokeWidth={1.1}
        strokeLinecap="round"
        opacity={0.7}
      />
      <path
        d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        stroke={color}
        strokeWidth={1.1}
        strokeLinecap="round"
        fill="none"
        opacity={0.7}
      />
      <line
        x1={cx}
        y1={cy - r - size * 0.1}
        x2={cx}
        y2={cy}
        stroke={color}
        strokeWidth={1.0}
        strokeLinecap="round"
        opacity={0.85}
      />
      {/* Small crescent at top of gnomon — marks it as lunar */}
      <path
        d={`M${cx - size * 0.07} ${cy - r - size * 0.08} A${size * 0.08} ${size * 0.08} 0 0 1 ${cx + size * 0.07} ${cy - r - size * 0.08}`}
        stroke={color}
        strokeWidth={0.8}
        strokeLinecap="round"
        fill="none"
        opacity={0.65}
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
  if (d < 1) return `${Math.round(d * 24)}H`;
  return `${Math.floor(d)}D`;
}

const SPRING_EXPAND = { type: 'spring' as const, stiffness: 520, damping: 38, mass: 0.8 };
const SPRING_CONTENT = { type: 'spring' as const, stiffness: 550, damping: 42 };
const SERIF = "'Palatino Linotype','Palatino','Book Antiqua','Georgia',serif";
const SANS = "'Inter','SF Pro Display','Helvetica Neue',sans-serif";

// ─── SundialLunarWidgetProps ──────────────────────────────────────────────────

export interface SundialLunarWidgetProps {
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

// ─── SundialLunarWidget ───────────────────────────────────────────────────────

export function SundialLunarWidget({
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
}: SundialLunarWidgetProps) {
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
      lerpSundialLunarPalette(
        SUNDIAL_LUNAR_PALETTES[blend.phase],
        SUNDIAL_LUNAR_PALETTES[blend.nextPhase],
        blend.t,
      ),
    [blend],
  );

  const origin = TRANSFORM_ORIGINS[expandDirection] ?? 'top right';
  const yNudge = getYNudge(expandDirection);

  const [storedExpanded, setStoredExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const raw = localStorage.getItem('sundial-luna-widget-expanded');
      if (raw != null) return JSON.parse(raw);
    } catch {}
    return true;
  });

  const updateExpanded = useCallback((next: boolean) => {
    setStoredExpanded(next);
    try {
      localStorage.setItem('sundial-luna-widget-expanded', JSON.stringify(next));
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
  const orbGroupRef = useRef<SVGGElement>(null);
  const gnomonRef = useRef<SVGLineElement>(null);
  const { setTarget } = useSundialLunaOrbRaf({ orbGroup: orbGroupRef, gnomon: gnomonRef });

  // Orb and gnomon shadow scale with illumination
  const orbOpacity = Math.max(0.08, lunarPos.illumination * 0.92 + 0.08);
  const gnomonOpacity = lunarPos.illumination * 0.52; // 0 at new → 0.52 at full
  const glowR = 18 + lunarPos.illumination * 8;

  const progressTarget = lunarPos.isVisible
    ? Math.max(0.01, Math.min(0.99, lunarPos.moonProgress))
    : 0.5;

  useEffect(() => {
    setTarget(progressTarget);
  });

  const arcPath = useMemo(() => buildArcPath(), []);
  const arcPath2 = useMemo(() => buildArcGroovePath(1.0), []);
  const initPos = arcOrbPos(progressTarget);

  // ── Display ────────────────────────────────────────────────────────────────
  const illumPct = Math.round(lunarPos.illumination * 100);
  const moonriseStr = fmtMinutes(lunarPos.moonriseMinutes);
  const moonsetStr = fmtMinutes(lunarPos.moonsetMinutes);
  const isNearFull = ['full', 'waxing-gibbous', 'waning-gibbous'].includes(lunarPos.phase);
  const nextStr = isNearFull
    ? `${fmtDays(lunarPos.daysUntilFull)} ad plenam`
    : `${fmtDays(lunarPos.daysUntilNew)} ad novam`;

  const pillMinWidth = showIllumination ? 148 : 110;

  return (
    <div
      data-luna-skin="sundial"
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
            {/* Outer glow */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ borderRadius: '1.6rem' }}
              animate={{ boxShadow: `0 0 60px 18px ${palette.outerGlow}` }}
              transition={{ duration: 1.8 }}
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
                  borderRadius: '1.6rem',
                  border: `1px solid ${palette.arcColor}40`,
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06)',
                }}
              >
                {/* z=0 Cold moonstone gradient */}
                <motion.div
                  className="absolute inset-0"
                  style={{ zIndex: 0 }}
                  animate={{
                    background: `linear-gradient(145deg,${palette.bg[0]} 0%,${palette.bg[1]} 55%,${palette.bg[2]} 100%)`,
                  }}
                  transition={{ duration: 1.8, ease: 'easeInOut' }}
                />

                {/* z=1 Stone luster — cool silver-blue */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ zIndex: 1 }}
                  animate={{
                    background: `radial-gradient(ellipse 55% 50% at 30% 28%, ${palette.luster} 0%, transparent 70%)`,
                  }}
                  transition={{ duration: 1.8, ease: 'easeInOut' }}
                />

                {/* z=2 Fixed stars — always visible */}
                {palette.starOpacity > 0.04 && (
                  <div className="absolute inset-0" style={{ zIndex: 2, pointerEvents: 'none' }}>
                    {Array.from({ length: 12 }, (_, i) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: static generated stars
                        key={i}
                        className="absolute rounded-full"
                        style={{
                          width: sr(i * 7) * 1.4 + 0.6,
                          height: sr(i * 7) * 1.4 + 0.6,
                          left: `${sr(i * 11 + 3) * 92}%`,
                          top: `${sr(i * 13 + 5) * 45}%`,
                          background: palette.textSecondary,
                          opacity: palette.starOpacity * (0.45 + sr(i * 3) * 0.55),
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* z=4 Arc + gnomon + orb */}
                <svg
                  role="presentation"
                  aria-hidden
                  className="absolute inset-0"
                  style={{ zIndex: 4, overflow: 'hidden' }}
                  width={W}
                  height={H}
                  viewBox={`0 0 ${W} ${H}`}
                >
                  <defs>
                    <filter id="sundial-luna-orb-glow" x="-80%" y="-80%" width="260%" height="260%">
                      <feGaussianBlur stdDeviation="8" />
                    </filter>
                    <filter id="sundial-luna-orb-core" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="1.8" result="b" />
                      <feMerge>
                        <feMergeNode in="b" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Baseline */}
                  <line
                    x1={0}
                    y1={ARC_BASE_Y}
                    x2={W}
                    y2={ARC_BASE_Y}
                    stroke={palette.arcColor}
                    strokeWidth={0.8}
                    opacity={0.5}
                  />

                  {/* Carved groove (double stroke) */}
                  <path
                    d={arcPath2}
                    fill="none"
                    stroke={palette.arcColor}
                    strokeWidth={0.6}
                    opacity={0.4}
                  />
                  <path
                    d={arcPath}
                    fill="none"
                    stroke={palette.arcGroove}
                    strokeWidth={0.6}
                    opacity={0.55}
                  />

                  {/* Roman numeral ticks */}
                  {ROMAN_TICKS.map(({ frac, label }) => {
                    const tx = frac * W;
                    const arcY = ARC_BASE_Y - ARC_HEIGHT * 4 * frac * (1 - frac);
                    return (
                      <g key={`tick-${frac}`}>
                        <line
                          x1={tx}
                          y1={arcY - 4}
                          x2={tx}
                          y2={arcY + 4}
                          stroke={palette.tickColor}
                          strokeWidth={0.7}
                          opacity={0.42}
                        />
                        <text
                          x={tx}
                          y={ARC_BASE_Y + 10}
                          textAnchor="middle"
                          fontSize={6}
                          fontFamily={SERIF}
                          fill={palette.tickColor}
                          opacity={0.4}
                          letterSpacing="0.06em"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Gnomon shadow — scales with illumination */}
                  <line
                    ref={gnomonRef}
                    x1={initPos.x}
                    y1={initPos.y}
                    x2={initPos.x}
                    y2={ARC_BASE_Y}
                    stroke={palette.shadowColor}
                    strokeWidth={1.0}
                    strokeDasharray="1.5 2.5"
                    opacity={gnomonOpacity}
                    style={{ transition: 'opacity 2.0s ease-in-out' }}
                  />

                  {/* Orb — scales with illumination */}
                  <g
                    ref={orbGroupRef}
                    transform={`translate(${initPos.x.toFixed(1)},${initPos.y.toFixed(1)})`}
                    style={{
                      opacity: orbOpacity,
                      transition: 'opacity 2.0s ease-in-out',
                    }}
                  >
                    <circle
                      cx={0}
                      cy={0}
                      r={glowR}
                      fill={palette.orbGlow}
                      filter="url(#sundial-luna-orb-glow)"
                    />
                    <circle
                      cx={0}
                      cy={0}
                      r={9}
                      fill={palette.orbFill}
                      filter="url(#sundial-luna-orb-core)"
                    />
                    {/* Specular — cool white, not warm */}
                    <circle cx={-3} cy={-3} r={2.5} fill="rgba(200,210,240,0.38)" />
                  </g>
                </svg>

                {/* z=6 Header — Latin phase label */}
                <div className="absolute top-0 left-0 right-0 px-5 pt-5" style={{ zIndex: 6 }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <motion.p
                        style={{
                          fontFamily: SERIF,
                          fontSize: 24,
                          fontStyle: 'italic',
                          fontWeight: 400,
                          letterSpacing: '0.12em',
                          lineHeight: 1,
                        }}
                        animate={{ color: palette.textPrimary }}
                        transition={{ duration: 1.8 }}
                      >
                        {palette.labelLatin}
                      </motion.p>
                      {showIllumination && (
                        <motion.p
                          style={{
                            fontFamily: SERIF,
                            fontSize: 10,
                            fontStyle: 'italic',
                            marginTop: 3,
                            letterSpacing: '0.08em',
                            opacity: 0.62,
                          }}
                          animate={{ color: palette.textSecondary }}
                          transition={{ duration: 1.8 }}
                        >
                          {illumPct}% · {nextStr}
                        </motion.p>
                      )}
                    </div>
                  </div>
                </div>

                {/* z=6 Bottom — moonrise / sublabel / moonset */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 px-5 pb-[14px] flex items-center justify-between"
                  style={{
                    zIndex: 6,
                    opacity: showMoonrise ? 1 : 0,
                    transition: 'opacity 0.8s ease-in-out',
                  }}
                  animate={{ color: palette.textSecondary }}
                  transition={{ duration: 1.8 }}
                >
                  <span
                    style={{
                      fontFamily: SANS,
                      fontSize: 9,
                      letterSpacing: '0.10em',
                      opacity: 0.42,
                    }}
                  >
                    {moonriseStr} ↑
                  </span>
                  <span
                    style={{
                      fontFamily: SERIF,
                      fontStyle: 'italic',
                      fontSize: 9,
                      letterSpacing: '0.06em',
                      opacity: 0.42,
                    }}
                  >
                    {palette.sublabel}
                  </span>
                  <span
                    style={{
                      fontFamily: SANS,
                      fontSize: 9,
                      letterSpacing: '0.10em',
                      opacity: 0.42,
                    }}
                  >
                    ↓ {moonsetStr}
                  </span>
                </motion.div>

                {/* z=7 Stone sheen */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    zIndex: 7,
                    borderRadius: '1.6rem',
                    background:
                      'linear-gradient(to bottom, rgba(255,255,255,0.05) 0%, transparent 30%, rgba(0,0,0,0.04) 70%, transparent 100%)',
                  }}
                />

                {/* z=8 Collapse */}
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
                        aria-label="Collapse sundial luna widget"
                        style={{
                          position: 'absolute',
                          zIndex: 8,
                          top: 0,
                          ...(isRight ? { right: 0 } : { left: 0 }),
                          width: 34,
                          height: 34,
                          borderRadius: isRight ? '0 1.6rem 0 10px' : '1.6rem 0 10px 0',
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
                            opacity="0.65"
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
            initial={{ opacity: 0, scale: 0.75, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.75, y: -8 }}
            transition={SPRING_EXPAND}
            className="flex items-center gap-2 cursor-pointer select-none"
            style={{
              height: 34,
              paddingLeft: 10,
              paddingRight: 14,
              borderRadius: 12,
              minWidth: pillMinWidth,
              background: palette.pillBg,
              border: `1px solid ${palette.pillBorder}`,
              boxShadow: `0 4px 16px rgba(0,0,0,0.28), 0 0 22px 4px ${palette.outerGlow}`,
              backdropFilter: 'blur(8px)',
              transformOrigin: origin,
              scale: expandScale,
            }}
            whileHover={hoverEffect ? { scale: expandScale * 1.05 } : undefined}
            whileTap={{ scale: expandScale * 0.96 }}
            aria-label={`Sundial luna widget — ${palette.labelLatin}. Click to expand.`}
          >
            {/* Sundial moon icon */}
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
              <SundialLunaIcon color={palette.pillText} size={16} />
            </span>

            {/* Illumination */}
            {showIllumination && (
              <motion.span
                style={{
                  fontFamily: SERIF,
                  fontStyle: 'italic',
                  fontSize: 12,
                  fontWeight: 400,
                  letterSpacing: '-0.01em',
                  minWidth: 28,
                }}
                animate={{ color: palette.pillText, opacity: 0.65 }}
                transition={{ duration: 1.8 }}
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
                background: palette.pillBorder,
                flexShrink: 0,
              }}
            />

            {/* Latin phase label */}
            <motion.span
              style={{
                fontFamily: SERIF,
                fontStyle: 'italic',
                fontSize: 10,
                fontWeight: 400,
                letterSpacing: '0.10em',
                whiteSpace: 'nowrap',
              }}
              animate={{ color: palette.textSecondary }}
              transition={{ duration: 1.8 }}
            >
              {palette.labelLatin}
            </motion.span>

            {/* Arrow */}
            <svg
              role="presentation"
              aria-hidden
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              style={{ marginLeft: 2, opacity: 0.5 }}
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
