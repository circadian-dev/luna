'use client';
// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/paper/paper.lunar.component.tsx
// ════════════════════════════════════════════════════════════════════════════
/**
 * Paper lunar skin.
 *
 * Sol paper: warm ink editorial — cream paper, amber/sepia ink, grain.
 * Luna paper: the same grain + serif typography, but cold — dark paper with
 * silver ink. The orb is a soft ink bloom that brightens with illumination.
 *
 * Visual character:
 *   - Deep dark paper backgrounds (near-black warm-dark → dark charcoal)
 *   - Cold silver/blue-grey ink: grain texture, serif italic labels
 *   - Ink bloom orb that blooms from near-nothing (new) to full silver wash (full)
 *   - Dashed arc — the inked arc of the moon's path across dark paper
 *   - Phase label in italic serif — editorial character preserved
 *   - Grain texture scaled up slightly to feel more tactile at night
 *   - "Silver ink on dark paper" at crescent; "luminous wash" at full
 *
 * Uses elliptical arc (matching Sol paper's arc geometry).
 * No weather. No Sol runtime imports. Purely lunar.
 */

import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LunarPhase, useLunarPosition } from '../../hooks/useLunarPosition';
import { lerpColor } from '../../lib/luna-lerp';
import { useLunaTheme } from '../../provider/luna-theme-provider';

// ─── Palette ──────────────────────────────────────────────────────────────────

export interface PaperLunarPalette {
  bg: [string, string, string];
  inkOrb: string; // core ink dot color
  inkBloom: string; // soft halo bloom color
  arc: string; // dashed arc stroke
  arcOpacity: number;
  textPrimary: string;
  textSecondary: string;
  pillBg: string;
  pillBorder: string;
  pillText: string;
  accentColor: string;
  dropShadow: string;
  grain: number; // grain texture opacity (higher = more tactile)
  mode: 'dark' | 'dim'; // full → 'dim', others → 'dark'
  label: string;
  sublabel: string;
}

// ─── PAPER_LUNAR_PALETTES ─────────────────────────────────────────────────────
// Dark paper throughout — this is always a night/dark context.
// Silver ink brightens from new (invisible) to full (luminous silver wash).
// Temperature curve: near-black → cold dark grey → blue-grey → silver-blue → silver-white

export const PAPER_LUNAR_PALETTES: Record<LunarPhase, PaperLunarPalette> = {
  new: {
    bg: ['#050404', '#080605', '#0C0908'],
    inkOrb: 'rgba(40,38,45,0.70)',
    inkBloom: 'rgba(35,33,40,0.50)',
    arc: 'rgba(70,65,80,0.28)',
    arcOpacity: 0.28,
    textPrimary: '#3C3848',
    textSecondary: '#252230',
    pillBg: 'rgba(9,7,6,0.96)',
    pillBorder: 'rgba(56,52,65,0.30)',
    pillText: '#3A3648',
    accentColor: '#282530',
    dropShadow: 'rgba(0,0,0,0.60)',
    grain: 0.42,
    mode: 'dark',
    label: 'New Moon',
    sublabel: 'no light',
  },
  'waxing-crescent': {
    bg: ['#080810', '#0C0C18', '#101020'],
    inkOrb: 'rgba(110,112,148,0.82)',
    inkBloom: 'rgba(90,92,130,0.55)',
    arc: 'rgba(140,142,190,0.38)',
    arcOpacity: 0.38,
    textPrimary: '#9090C0',
    textSecondary: '#5A5880',
    pillBg: 'rgba(12,12,24,0.96)',
    pillBorder: 'rgba(120,120,170,0.32)',
    pillText: '#8080B0',
    accentColor: '#505080',
    dropShadow: 'rgba(0,0,0,0.55)',
    grain: 0.38,
    mode: 'dark',
    label: 'Crescent',
    sublabel: 'waxing',
  },
  'first-quarter': {
    bg: ['#0C0E1A', '#101428', '#151A32'],
    inkOrb: 'rgba(145,148,195,0.90)',
    inkBloom: 'rgba(118,122,172,0.62)',
    arc: 'rgba(165,168,218,0.45)',
    arcOpacity: 0.45,
    textPrimary: '#B0B4E0',
    textSecondary: '#707098',
    pillBg: 'rgba(14,16,32,0.96)',
    pillBorder: 'rgba(148,152,205,0.38)',
    pillText: '#9898C8',
    accentColor: '#606098',
    dropShadow: 'rgba(0,0,0,0.50)',
    grain: 0.36,
    mode: 'dark',
    label: 'First Quarter',
    sublabel: 'half lit',
  },
  'waxing-gibbous': {
    bg: ['#101428', '#151C36', '#1A2242'],
    inkOrb: 'rgba(175,178,225,0.95)',
    inkBloom: 'rgba(148,152,205,0.70)',
    arc: 'rgba(192,195,242,0.52)',
    arcOpacity: 0.52,
    textPrimary: '#C8CCEE',
    textSecondary: '#8888B8',
    pillBg: 'rgba(16,20,44,0.96)',
    pillBorder: 'rgba(168,172,225,0.45)',
    pillText: '#B0B4DC',
    accentColor: '#7878B0',
    dropShadow: 'rgba(0,0,0,0.45)',
    grain: 0.34,
    mode: 'dark',
    label: 'Gibbous',
    sublabel: 'waxing',
  },
  full: {
    bg: ['#141A38', '#1A2048', '#202858'],
    inkOrb: 'rgba(210,214,248,1.0)',
    inkBloom: 'rgba(185,190,235,0.82)',
    arc: 'rgba(215,218,255,0.60)',
    arcOpacity: 0.6,
    textPrimary: '#D8DCFF',
    textSecondary: '#A0A4D0',
    pillBg: 'rgba(20,26,58,0.96)',
    pillBorder: 'rgba(200,204,252,0.52)',
    pillText: '#C8CCFF',
    accentColor: '#9090D0',
    dropShadow: 'rgba(0,0,0,0.38)',
    grain: 0.3,
    mode: 'dim',
    label: 'Full Moon',
    sublabel: 'full illumination',
  },
  'waning-gibbous': {
    bg: ['#101428', '#141C34', '#192040'],
    inkOrb: 'rgba(170,173,220,0.93)',
    inkBloom: 'rgba(144,148,200,0.68)',
    arc: 'rgba(188,191,238,0.50)',
    arcOpacity: 0.5,
    textPrimary: '#C5C8EA',
    textSecondary: '#8585B5',
    pillBg: 'rgba(16,20,42,0.96)',
    pillBorder: 'rgba(163,166,220,0.43)',
    pillText: '#ADADD8',
    accentColor: '#7575AD',
    dropShadow: 'rgba(0,0,0,0.46)',
    grain: 0.35,
    mode: 'dark',
    label: 'Gibbous',
    sublabel: 'waning',
  },
  'last-quarter': {
    bg: ['#0C0E1A', '#0F1225', '#13172E'],
    inkOrb: 'rgba(140,143,190,0.87)',
    inkBloom: 'rgba(114,117,167,0.60)',
    arc: 'rgba(160,163,212,0.43)',
    arcOpacity: 0.43,
    textPrimary: '#ACAFDC',
    textSecondary: '#6D6D95',
    pillBg: 'rgba(14,15,30,0.96)',
    pillBorder: 'rgba(143,146,198,0.36)',
    pillText: '#9595C4',
    accentColor: '#5D5D93',
    dropShadow: 'rgba(0,0,0,0.52)',
    grain: 0.37,
    mode: 'dark',
    label: 'Last Quarter',
    sublabel: 'half lit',
  },
  'waning-crescent': {
    bg: ['#070710', '#0A0A16', '#0E0E1C'],
    inkOrb: 'rgba(95,97,132,0.78)',
    inkBloom: 'rgba(78,80,115,0.52)',
    arc: 'rgba(120,122,165,0.35)',
    arcOpacity: 0.35,
    textPrimary: '#7878A8',
    textSecondary: '#484870',
    pillBg: 'rgba(10,10,22,0.96)',
    pillBorder: 'rgba(105,107,150,0.28)',
    pillText: '#6868A0',
    accentColor: '#404070',
    dropShadow: 'rgba(0,0,0,0.58)',
    grain: 0.4,
    mode: 'dark',
    label: 'Crescent',
    sublabel: 'waning',
  },
};

// ─── Palette interpolation ────────────────────────────────────────────────────

function lerpNum(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function lerpPaperLunarPalette(
  a: PaperLunarPalette,
  b: PaperLunarPalette,
  t: number,
): PaperLunarPalette {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const c = lerpColor;
  return {
    bg: [c(a.bg[0], b.bg[0], t), c(a.bg[1], b.bg[1], t), c(a.bg[2], b.bg[2], t)],
    inkOrb: c(a.inkOrb, b.inkOrb, t),
    inkBloom: c(a.inkBloom, b.inkBloom, t),
    arc: c(a.arc, b.arc, t),
    arcOpacity: lerpNum(a.arcOpacity, b.arcOpacity, t),
    textPrimary: c(a.textPrimary, b.textPrimary, t),
    textSecondary: c(a.textSecondary, b.textSecondary, t),
    pillBg: c(a.pillBg, b.pillBg, t),
    pillBorder: c(a.pillBorder, b.pillBorder, t),
    pillText: c(a.pillText, b.pillText, t),
    accentColor: c(a.accentColor, b.accentColor, t),
    dropShadow: c(a.dropShadow, b.dropShadow, t),
    grain: lerpNum(a.grain, b.grain, t),
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

// ─── Elliptical arc (matching Sol paper's arc geometry) ───────────────────────

const W = 360;
const H = 180;
const CX = 180;
const CY = 200;
const RX = 169.2;
const RY = 171;
const ARC_D = `M ${CX - RX} ${CY} A ${RX} ${RY} 0 0 1 ${CX + RX} ${CY}`;

function arcPt(t: number) {
  const angle = Math.PI * (1 - t);
  return { x: CX + RX * Math.cos(angle), y: CY - RY * Math.sin(angle) };
}

// ─── Ink orb RAF (elliptical arc) ─────────────────────────────────────────────

function usePaperLunaOrbRaf(refs: {
  bloom: React.RefObject<SVGCircleElement>;
  center: React.RefObject<SVGCircleElement>;
}) {
  const curP = useRef(-1);
  const tgtP = useRef(0);
  const rafId = useRef<number | null>(null);
  const first = useRef(true);
  const fading = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPos = (p: number) => {
    const { x, y } = arcPt(p);
    refs.bloom.current?.setAttribute('cx', String(x));
    refs.bloom.current?.setAttribute('cy', String(y));
    refs.center.current?.setAttribute('cx', String(x));
    refs.center.current?.setAttribute('cy', String(y));
  };

  const setOpacity = (o: number) => {
    for (const r of [refs.bloom, refs.center]) {
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

// ─── Grain SVG (inline) ───────────────────────────────────────────────────────
// Same grain as Sol paper but slightly higher contrast for dark paper.

const GRAIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='240' height='240' filter='url(#n)' opacity='1'/></svg>`;
const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}")`;

// ─── Moon phase icon — printed diagram style ──────────────────────────────────
// Stroke-based, editorial — like a phase diagram in an almanac.

function MoonPhaseIcon({
  phase,
  color,
  size = 22,
}: {
  phase: LunarPhase;
  color: string;
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
          stroke={color}
          strokeWidth="0.8"
          opacity={0.28}
          strokeDasharray="2 3"
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
        <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.82} />
        <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="0.6" opacity={0.5} fill="none" />
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
        <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="0.8" opacity={0.35} />
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
        <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="0.8" opacity={0.35} />
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
  const maskId = `paper-luna-icon-${phase}-${size}`;

  return (
    <svg role="presentation" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <mask id={maskId}>
          <circle cx={cx} cy={cy} r={r} fill="white" />
          <circle cx={cx + dx} cy={cy} r={r} fill="black" />
        </mask>
      </defs>
      <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="0.8" fill="none" opacity={0.28} />
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

const SPRING_EXPAND = { type: 'spring' as const, stiffness: 420, damping: 36, mass: 0.9 };
const SPRING_CONTENT = { type: 'spring' as const, stiffness: 440, damping: 40 };
const SERIF = "'Georgia','Times New Roman',serif";

// ─── PaperLunarWidgetProps ────────────────────────────────────────────────────

export interface PaperLunarWidgetProps {
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

// ─── PaperLunarWidget ─────────────────────────────────────────────────────────

export function PaperLunarWidget({
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
}: PaperLunarWidgetProps) {
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
      lerpPaperLunarPalette(
        PAPER_LUNAR_PALETTES[blend.phase],
        PAPER_LUNAR_PALETTES[blend.nextPhase],
        blend.t,
      ),
    [blend],
  );

  const origin = TRANSFORM_ORIGINS[expandDirection] ?? 'top right';
  const yNudge = getYNudge(expandDirection);

  const [storedExpanded, setStoredExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const raw = localStorage.getItem('paper-luna-widget-expanded');
      if (raw != null) return JSON.parse(raw);
    } catch {}
    return true;
  });

  const updateExpanded = useCallback((next: boolean) => {
    setStoredExpanded(next);
    try {
      localStorage.setItem('paper-luna-widget-expanded', JSON.stringify(next));
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
  const bloomRef = useRef<SVGCircleElement>(null);
  const centerRef = useRef<SVGCircleElement>(null);
  const { setTarget } = usePaperLunaOrbRaf({ bloom: bloomRef, center: centerRef });

  // Ink bloom scales with illumination — faint at new, full wash at full moon
  const orbOpacity = lunarPos.isVisible ? Math.max(0.06, lunarPos.illumination * 0.94 + 0.06) : 0;
  const bloomR = 22 + lunarPos.illumination * 10;
  const centerR = 5 + lunarPos.illumination * 5;

  const progressTarget = Math.max(0.01, Math.min(0.99, lunarPos.moonProgress));

  useEffect(() => {
    if (bloomRef.current) {
      bloomRef.current.style.fill = palette.inkBloom;
      bloomRef.current.setAttribute('r', String(bloomR));
    }
    if (centerRef.current) {
      centerRef.current.style.fill = palette.inkOrb;
      centerRef.current.setAttribute('r', String(centerR));
    }
    setTarget(progressTarget);
  });

  const initPt = arcPt(progressTarget);

  // ── Display ────────────────────────────────────────────────────────────────
  const illumPct = Math.round(lunarPos.illumination * 100);
  const moonriseStr = fmtMinutes(lunarPos.moonriseMinutes);
  const moonsetStr = fmtMinutes(lunarPos.moonsetMinutes);
  const isNearFull = ['full', 'waxing-gibbous', 'waning-gibbous'].includes(lunarPos.phase);
  const nextEventStr = isNearFull
    ? `${fmtDays(lunarPos.daysUntilFull)} to full`
    : `${fmtDays(lunarPos.daysUntilNew)} to new`;

  const pillMinWidth = showIllumination ? 118 : 88;

  return (
    <div
      data-luna-skin="paper"
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
            {/* Drop shadow */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ borderRadius: 24 }}
              animate={{
                boxShadow: `0 8px 48px 0px ${palette.dropShadow}, 0 2px 12px 0px ${palette.dropShadow}`,
              }}
              transition={{ duration: 1.2 }}
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
                  borderRadius: 24,
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                }}
              >
                {/* z=0 Dark paper background */}
                <motion.div
                  className="absolute inset-0"
                  style={{ zIndex: 0 }}
                  animate={{
                    background: `linear-gradient(155deg,${palette.bg[0]} 0%,${palette.bg[1]} 52%,${palette.bg[2]} 100%)`,
                  }}
                  transition={{ duration: 1.4, ease: 'easeInOut' }}
                />

                {/* z=1 Grain texture — more pronounced at dark phases */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    zIndex: 1,
                    backgroundImage: GRAIN_URL,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '240px 240px',
                    mixBlendMode: 'overlay',
                    opacity: palette.grain,
                    borderRadius: 24,
                  }}
                />

                {/* z=2 Arc + ink blot orb */}
                <svg
                  role="presentation"
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    zIndex: 2,
                    overflow: 'hidden',
                    opacity: orbOpacity,
                    transition: 'opacity 1.2s ease-in-out',
                  }}
                  width={W}
                  height={H}
                  viewBox={`0 0 ${W} ${H}`}
                >
                  <defs>
                    <filter id="paper-luna-bloom" x="-150%" y="-150%" width="400%" height="400%">
                      <feGaussianBlur stdDeviation="14" />
                    </filter>
                    <filter id="paper-luna-arc-soft" x="-80%" y="-80%" width="260%" height="260%">
                      <feGaussianBlur stdDeviation="1.2" result="b" />
                      <feMerge>
                        <feMergeNode in="b" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {/* Dashed arc — the moon's inked path on paper */}
                  <path
                    d={ARC_D}
                    fill="none"
                    stroke={palette.arc}
                    strokeWidth="1.0"
                    strokeLinecap="round"
                    strokeDasharray="4 10"
                    strokeOpacity={palette.arcOpacity}
                    filter="url(#paper-luna-arc-soft)"
                  />
                  {/* Ink bloom */}
                  <circle
                    ref={bloomRef}
                    cx={initPt.x}
                    cy={initPt.y}
                    r={bloomR}
                    style={{ fill: palette.inkBloom, transition: 'fill 1.4s ease-in-out' }}
                    filter="url(#paper-luna-bloom)"
                  />
                  {/* Ink center */}
                  <circle
                    ref={centerRef}
                    cx={initPt.x}
                    cy={initPt.y}
                    r={centerR}
                    style={{
                      fill: palette.inkOrb,
                      filter: 'blur(2px)',
                      transition: 'fill 1.4s ease-in-out',
                    }}
                  />
                </svg>

                {/* z=5 Header */}
                <div className="absolute top-0 left-0 right-0 px-5 pt-[18px]" style={{ zIndex: 5 }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <motion.p
                        style={{
                          fontFamily: SERIF,
                          fontStyle: 'italic',
                          fontSize: 24,
                          fontWeight: 400,
                          letterSpacing: '-0.01em',
                          lineHeight: 1,
                        }}
                        animate={{ color: palette.textPrimary }}
                        transition={{ duration: 1.2 }}
                      >
                        {palette.label}
                      </motion.p>
                      {showIllumination && (
                        <motion.p
                          style={{
                            fontFamily: SERIF,
                            fontSize: 10,
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            marginTop: 5,
                            opacity: 0.42,
                          }}
                          animate={{ color: palette.textSecondary }}
                          transition={{ duration: 1.2 }}
                        >
                          {illumPct}% · {nextEventStr}
                        </motion.p>
                      )}
                    </div>

                    {/* Phase icon — almanac diagram style, top right */}
                    <motion.div animate={{ opacity: 0.42 }}>
                      <MoonPhaseIcon phase={lunarPos.phase} color={palette.inkOrb} size={22} />
                    </motion.div>
                  </div>
                </div>

                {/* z=5 Bottom row — moonrise / moonset */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 px-5 pb-[14px] flex items-center justify-between"
                  style={{
                    zIndex: 5,
                    opacity: showMoonrise ? 0.38 : 0,
                    transition: 'opacity 0.8s ease-in-out',
                  }}
                  animate={{ color: palette.textSecondary }}
                  transition={{ duration: 1.2 }}
                >
                  <span
                    style={{
                      fontFamily: SERIF,
                      fontSize: 10,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                    }}
                  >
                    ↑ {moonriseStr}
                  </span>
                  <span
                    style={{
                      fontFamily: SERIF,
                      fontStyle: 'italic',
                      fontSize: 9,
                      letterSpacing: '0.08em',
                      opacity: 0.65,
                    }}
                  >
                    {palette.sublabel}
                  </span>
                  <span
                    style={{
                      fontFamily: SERIF,
                      fontSize: 10,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                    }}
                  >
                    ↓ {moonsetStr}
                  </span>
                </motion.div>

                {/* z=6 Top catch-light */}
                <div
                  className="absolute top-0 left-0 right-0 pointer-events-none"
                  style={{
                    zIndex: 6,
                    height: 1,
                    borderRadius: '24px 24px 0 0',
                    background:
                      'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.10) 30%, rgba(255,255,255,0.10) 70%, transparent 100%)',
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
                        aria-label="Collapse paper luna widget"
                        style={{
                          position: 'absolute',
                          zIndex: 7,
                          top: 0,
                          ...(isRight ? { right: 0 } : { left: 0 }),
                          width: 34,
                          height: 34,
                          borderRadius: isRight ? '0 24px 0 10px' : '24px 0 10px 0',
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
              height: 36,
              minWidth: pillMinWidth,
              paddingLeft: 10,
              paddingRight: 14,
              borderRadius: 24,
              background: palette.pillBg,
              border: `1px solid ${palette.pillBorder}`,
              boxShadow: `0 4px 18px rgba(0,0,0,0.35), 0 1px 4px ${palette.dropShadow}`,
              backdropFilter: 'blur(8px)',
              transformOrigin: origin,
              scale: expandScale,
            }}
            whileHover={hoverEffect ? { scale: expandScale * 1.04 } : undefined}
            whileTap={{ scale: expandScale * 0.96 }}
            aria-label={`Paper luna widget — ${palette.label}. Click to expand.`}
          >
            {/* Moon phase icon */}
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
              <MoonPhaseIcon phase={lunarPos.phase} color={palette.inkOrb} size={16} />
            </span>

            {/* Illumination % */}
            {showIllumination && (
              <motion.span
                style={{
                  fontFamily: SERIF,
                  fontSize: 12,
                  fontWeight: 400,
                  letterSpacing: '-0.01em',
                  minWidth: 28,
                }}
                animate={{ color: palette.pillText, opacity: 0.42 }}
                transition={{ duration: 1.4 }}
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

            {/* Phase label — italic serif, paper's editorial voice */}
            <motion.span
              style={{
                fontFamily: SERIF,
                fontStyle: 'italic',
                fontSize: 11,
                letterSpacing: '0.06em',
                opacity: 0.45,
                whiteSpace: 'nowrap',
              }}
              animate={{ color: palette.textSecondary }}
              transition={{ duration: 1.4 }}
            >
              {palette.label}
            </motion.span>

            {/* Arrow */}
            <svg
              role="presentation"
              aria-hidden
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              style={{ marginLeft: 2, opacity: 0.45 }}
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
