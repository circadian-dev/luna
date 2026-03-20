'use client';
// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/foundry/foundry.lunar.component.tsx
// ════════════════════════════════════════════════════════════════════════════
/**
 * Foundry lunar skin.
 *
 * Sol foundry is warm volumetric industrial — amber, copper, machined metal.
 * Luna foundry inverts this completely: cold steel-blue backgrounds, a
 * "molten silver" orb that brightens with illumination, and the same
 * machined-metal structural aesthetic (heavy border, glass sheen, clean
 * geometry) but running entirely cold.
 *
 * Uses the parabolic arc (same as void, foundry, etc.) NOT the elliptical.
 * No aurora bands, no wave layers — just industrial cold steel.
 * No weather layer. Purely lunar.
 *
 * MOBILE EXPAND FIX:
 *   Outer div layout = W*expandScale × H*expandScale.
 *   Inner scale wrapper renders full W×H content scaled down.
 */

import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LunarPhase, useLunarPosition } from '../../hooks/useLunarPosition';
import { lerpColor } from '../../lib/luna-lerp';
import { useLunaTheme } from '../../provider/luna-theme-provider';

// ─── Palette ──────────────────────────────────────────────────────────────────

export interface FoundryLunarPalette {
  bg: [string, string, string];
  orbFill: string; // the "molten silver" orb color
  orbGlow: string; // cold halo around orb
  outerGlow: string;
  textPrimary: string;
  textSecondary: string;
  border: string; // machined border color
  accentColor: string; // track fill / accent
  mode: 'dark' | 'dim'; // full → 'dim', all others → 'dark'
  label: string;
  sublabel: string;
  showMoon: boolean; // true for crescent rendering at low illumination
}

// ─── FOUNDRY_LUNAR_PALETTES ───────────────────────────────────────────────────
// Temperature curve: new (black steel) → crescent (cold indigo-steel) →
//   quarter (blue-steel) → gibbous (silver-steel) → FULL (molten silver-white)
//   → gibbous → quarter → crescent → new (slightly dimmer on waning side)

export const FOUNDRY_LUNAR_PALETTES: Record<LunarPhase, FoundryLunarPalette> = {
  new: {
    bg: ['#040406', '#060608', '#08080C'],
    orbFill: 'rgba(28,30,46,0.62)',
    orbGlow: 'rgba(18,20,34,0.40)',
    outerGlow: 'rgba(10,12,20,0.25)',
    textPrimary: '#383848',
    textSecondary: 'rgba(50,52,70,0.50)',
    border: 'rgba(40,42,60,0.28)',
    accentColor: '#181A28',
    mode: 'dark',
    label: 'new moon',
    sublabel: 'no light',
    showMoon: false,
  },
  'waxing-crescent': {
    bg: ['#060A14', '#0A0E1C', '#0E1426'],
    orbFill: 'rgba(75,85,130,0.82)',
    orbGlow: 'rgba(50,58,100,0.45)',
    outerGlow: 'rgba(32,40,80,0.32)',
    textPrimary: '#6070A8',
    textSecondary: 'rgba(80,90,130,0.55)',
    border: 'rgba(55,65,110,0.38)',
    accentColor: '#28304A',
    mode: 'dark',
    label: 'crescent',
    sublabel: 'waxing',
    showMoon: true,
  },
  'first-quarter': {
    bg: ['#0A1020', '#10182E', '#161E38'],
    orbFill: 'rgba(108,118,168,0.90)',
    orbGlow: 'rgba(78,88,140,0.52)',
    outerGlow: 'rgba(54,64,118,0.40)',
    textPrimary: '#8090C8',
    textSecondary: 'rgba(100,112,168,0.62)',
    border: 'rgba(72,84,148,0.45)',
    accentColor: '#303A68',
    mode: 'dark',
    label: 'first quarter',
    sublabel: 'half lit',
    showMoon: true,
  },
  'waxing-gibbous': {
    bg: ['#0E1628', '#182440', '#20304E'],
    orbFill: 'rgba(152,162,200,0.96)',
    orbGlow: 'rgba(110,120,170,0.60)',
    outerGlow: 'rgba(78,90,150,0.50)',
    textPrimary: '#A8B4D8',
    textSecondary: 'rgba(130,142,190,0.68)',
    border: 'rgba(98,110,175,0.52)',
    accentColor: '#404E88',
    mode: 'dark',
    label: 'gibbous',
    sublabel: 'waxing',
    showMoon: false,
  },
  full: {
    bg: ['#121C38', '#1C2850', '#223060'],
    orbFill: 'rgba(208,212,228,1.0)',
    orbGlow: 'rgba(165,172,205,0.75)',
    outerGlow: 'rgba(120,130,188,0.68)',
    textPrimary: '#D0D6F0',
    textSecondary: 'rgba(175,185,228,0.78)',
    border: 'rgba(140,150,210,0.62)',
    accentColor: '#6070C0',
    mode: 'dim',
    label: 'full moon',
    sublabel: 'full illumination',
    showMoon: false,
  },
  'waning-gibbous': {
    bg: ['#0E1626', '#17233E', '#1F2F4C'],
    orbFill: 'rgba(150,160,198,0.94)',
    orbGlow: 'rgba(108,118,168,0.58)',
    outerGlow: 'rgba(76,88,148,0.48)',
    textPrimary: '#A5B1D5',
    textSecondary: 'rgba(128,140,187,0.65)',
    border: 'rgba(96,108,172,0.50)',
    accentColor: '#3E4C86',
    mode: 'dark',
    label: 'gibbous',
    sublabel: 'waning',
    showMoon: false,
  },
  'last-quarter': {
    bg: ['#0A101E', '#10182C', '#161E36'],
    orbFill: 'rgba(105,115,165,0.88)',
    orbGlow: 'rgba(76,85,137,0.50)',
    outerGlow: 'rgba(52,62,115,0.38)',
    textPrimary: '#7C8DC4',
    textSecondary: 'rgba(98,110,164,0.59)',
    border: 'rgba(70,81,145,0.43)',
    accentColor: '#2E3864',
    mode: 'dark',
    label: 'last quarter',
    sublabel: 'half lit',
    showMoon: true,
  },
  'waning-crescent': {
    bg: ['#060910', '#0A0D1A', '#0E1222'],
    orbFill: 'rgba(68,76,118,0.78)',
    orbGlow: 'rgba(44,52,92,0.42)',
    outerGlow: 'rgba(28,36,72,0.28)',
    textPrimary: '#585E90',
    textSecondary: 'rgba(72,80,115,0.50)',
    border: 'rgba(50,58,98,0.32)',
    accentColor: '#202840',
    mode: 'dark',
    label: 'crescent',
    sublabel: 'waning',
    showMoon: true,
  },
};

// ─── Palette interpolation ────────────────────────────────────────────────────

function lerpNum(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function lerpFoundryLunarPalette(
  a: FoundryLunarPalette,
  b: FoundryLunarPalette,
  t: number,
): FoundryLunarPalette {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const c = lerpColor;
  return {
    bg: [c(a.bg[0], b.bg[0], t), c(a.bg[1], b.bg[1], t), c(a.bg[2], b.bg[2], t)],
    orbFill: c(a.orbFill, b.orbFill, t),
    orbGlow: c(a.orbGlow, b.orbGlow, t),
    outerGlow: c(a.outerGlow, b.outerGlow, t),
    textPrimary: c(a.textPrimary, b.textPrimary, t),
    textSecondary: c(a.textSecondary, b.textSecondary, t),
    border: c(a.border, b.border, t),
    accentColor: c(a.accentColor, b.accentColor, t),
    mode: t < 0.5 ? a.mode : b.mode,
    label: t < 0.5 ? a.label : b.label,
    sublabel: t < 0.5 ? a.sublabel : b.sublabel,
    showMoon: t < 0.5 ? a.showMoon : b.showMoon,
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

// ─── Parabolic arc — same as void.lunar.component.tsx ────────────────────────

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

// ─── Orb RAF (parabolic arc) ──────────────────────────────────────────────────

function useFoundryLunaOrbRaf(refs: {
  halo: React.RefObject<SVGCircleElement>;
  mid: React.RefObject<SVGCircleElement>;
  core: React.RefObject<SVGCircleElement>;
  moonBody: React.RefObject<SVGCircleElement>;
  moonCut: React.RefObject<SVGCircleElement>;
}) {
  const curP = useRef(-1);
  const tgtP = useRef(0);
  const rafId = useRef<number | null>(null);
  const first = useRef(true);
  const fading = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPos = (p: number) => {
    const { x, y } = arcOrbPos(p);
    refs.halo.current?.setAttribute('cx', String(x));
    refs.halo.current?.setAttribute('cy', String(y));
    refs.mid.current?.setAttribute('cx', String(x));
    refs.mid.current?.setAttribute('cy', String(y));
    refs.core.current?.setAttribute('cx', String(x));
    refs.core.current?.setAttribute('cy', String(y));
    // Moon crescent follows orb
    refs.moonBody.current?.setAttribute('cx', String(x));
    refs.moonBody.current?.setAttribute('cy', String(y));
    refs.moonCut.current?.setAttribute('cx', String(x + 5));
    refs.moonCut.current?.setAttribute('cy', String(y - 3));
  };

  const setOpacity = (o: number) => {
    for (const r of [refs.halo, refs.mid, refs.core]) {
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

// ─── Moon phase icon ──────────────────────────────────────────────────────────

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
        <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="1" opacity={0.28} />
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
        <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.9} />
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
        <path
          d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z`}
          fill={color}
          opacity={0.9}
        />
        <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="1" opacity={0.2} />
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
        <path
          d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z`}
          fill={color}
          opacity={0.9}
        />
        <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="1" opacity={0.2} />
      </svg>
    );
  }
  const isWaxing = phase === 'waxing-crescent' || phase === 'waxing-gibbous';
  const isThin = phase === 'waxing-crescent' || phase === 'waning-crescent';
  const offset = isThin ? r * 0.62 : r * 0.18;
  const dx = isWaxing ? -offset : offset;
  const maskId = `foundry-luna-moon-${phase}-${size}`;

  return (
    <svg role="presentation" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <mask id={maskId}>
          <circle cx={cx} cy={cy} r={r} fill="white" />
          <circle cx={cx + dx} cy={cy} r={r} fill="black" />
        </mask>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={color} mask={`url(#${maskId})`} opacity={0.9} />
      <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="1" fill="none" opacity={0.18} />
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
  stiffness: 520,
  damping: 38,
  mass: 0.8,
};
const SPRING_CONTENT = {
  type: 'spring' as const,
  stiffness: 550,
  damping: 42,
};

// ─── FoundryLunarWidgetProps ──────────────────────────────────────────────────

export interface FoundryLunarWidgetProps {
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

// ─── FoundryLunarWidget ───────────────────────────────────────────────────────

export function FoundryLunarWidget({
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
}: FoundryLunarWidgetProps) {
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
      lerpFoundryLunarPalette(
        FOUNDRY_LUNAR_PALETTES[blend.phase],
        FOUNDRY_LUNAR_PALETTES[blend.nextPhase],
        blend.t,
      ),
    [blend],
  );

  const origin = TRANSFORM_ORIGINS[expandDirection] ?? 'top right';
  const yNudge = getYNudge(expandDirection);

  const [storedExpanded, setStoredExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const raw = localStorage.getItem('foundry-luna-widget-expanded');
      if (raw != null) return JSON.parse(raw);
    } catch {}
    return true;
  });

  const updateExpanded = useCallback((next: boolean) => {
    setStoredExpanded(next);
    try {
      localStorage.setItem('foundry-luna-widget-expanded', JSON.stringify(next));
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
  const haloRef = useRef<SVGCircleElement>(null);
  const midRef = useRef<SVGCircleElement>(null);
  const coreRef = useRef<SVGCircleElement>(null);
  const moonBodyRef = useRef<SVGCircleElement>(null);
  const moonCutRef = useRef<SVGCircleElement>(null);
  const { setTarget } = useFoundryLunaOrbRaf({
    halo: haloRef,
    mid: midRef,
    core: coreRef,
    moonBody: moonBodyRef,
    moonCut: moonCutRef,
  });

  // Orb scale driven by illumination
  const orbOpacity = Math.max(0.06, lunarPos.illumination * 0.94 + 0.06);
  const glowR = 56 * lunarPos.illumination + 8;
  const midR = 26 * lunarPos.illumination + 5;
  const coreR = 5 + lunarPos.illumination * 4;

  const progressTarget = lunarPos.isVisible
    ? Math.max(0.01, Math.min(0.99, lunarPos.moonProgress))
    : 0.5;

  useEffect(() => {
    if (haloRef.current) {
      haloRef.current.style.fill = palette.orbGlow;
      haloRef.current.setAttribute('r', String(glowR));
    }
    if (midRef.current) {
      midRef.current.style.fill = palette.orbGlow;
      midRef.current.setAttribute('r', String(midR));
    }
    if (coreRef.current) {
      coreRef.current.style.fill = palette.orbFill;
      coreRef.current.setAttribute('r', String(coreR));
    }
    if (moonBodyRef.current) moonBodyRef.current.style.fill = palette.orbFill;
    if (moonCutRef.current) moonCutRef.current.style.fill = palette.bg[1];
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
  const SANS_DISPLAY = "'SF Pro Display','Helvetica Neue',sans-serif";
  const SANS_TEXT = "'SF Pro Text','Helvetica Neue',sans-serif";

  return (
    <div
      data-luna-skin="foundry"
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
            {/* Outer glow — scales with illumination, cold steel hue */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ borderRadius: '1.8rem' }}
              animate={{
                boxShadow: `0 0 ${36 * lunarPos.illumination + 10}px ${7 * lunarPos.illumination + 3}px ${palette.outerGlow}, 0 4px 24px rgba(0,0,0,0.42)`,
              }}
              transition={{ duration: 2.0 }}
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
              {/* Card — machined border, glass sheen */}
              <motion.div
                className="relative w-full h-full overflow-hidden"
                style={{
                  borderRadius: '1.8rem',
                  border: `2px solid ${palette.border}`,
                  boxShadow:
                    'inset 0 1.5px 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.30)',
                }}
              >
                {/* z=0 Background — cold steel gradient */}
                <motion.div
                  className="absolute inset-0"
                  style={{ zIndex: 0 }}
                  animate={{
                    background: `linear-gradient(155deg, ${palette.bg[0]} 0%, ${palette.bg[1]} 52%, ${palette.bg[2]} 100%)`,
                  }}
                  transition={{ duration: 2.0, ease: 'easeInOut' }}
                />

                {/* z=1 Subtle horizontal machined lines — cold steel texture */}
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    zIndex: 1,
                    opacity: 0.03 + lunarPos.illumination * 0.05,
                    transition: 'opacity 2.0s ease-in-out',
                    backgroundImage: `repeating-linear-gradient(
                      0deg,
                      transparent,
                      transparent 3px,
                      ${palette.border} 3px,
                      ${palette.border} 4px
                    )`,
                  }}
                />

                {/* z=2 Arc hairline — dashed, cold steel color */}
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
                    stroke={palette.border}
                    strokeWidth="0.8"
                    strokeDasharray="3 5"
                    strokeLinecap="round"
                    opacity={0.22}
                  />
                </svg>

                {/* z=3 Orb — molten silver, scales with illumination */}
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
                  <defs>
                    <filter id="foundry-luna-halo" x="-200%" y="-200%" width="500%" height="500%">
                      <feGaussianBlur stdDeviation="14" />
                    </filter>
                    <filter id="foundry-luna-mid" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur stdDeviation="6" />
                    </filter>
                    <filter id="foundry-luna-core" x="-80%" y="-80%" width="260%" height="260%">
                      <feGaussianBlur stdDeviation="3" result="b" />
                      <feMerge>
                        <feMergeNode in="b" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Moon crescent — shown only at low illumination phases */}
                  <g
                    opacity={palette.showMoon ? 0.82 : 0}
                    style={{ transition: 'opacity 0.8s ease-in-out' }}
                  >
                    <circle
                      ref={moonBodyRef}
                      cx={initPos.x}
                      cy={initPos.y}
                      r={9}
                      style={{ fill: palette.orbFill, transition: 'fill 2.0s ease-in-out' }}
                    />
                    <circle
                      ref={moonCutRef}
                      cx={initPos.x + 5}
                      cy={initPos.y - 3}
                      r={7}
                      style={{ fill: palette.bg[1], transition: 'fill 2.0s ease-in-out' }}
                    />
                  </g>

                  {/* Halo bloom */}
                  <circle
                    ref={haloRef}
                    cx={initPos.x}
                    cy={initPos.y}
                    r={glowR}
                    style={{ fill: palette.orbGlow, transition: 'fill 2.0s ease-in-out' }}
                    filter="url(#foundry-luna-halo)"
                    opacity={0.6}
                  />
                  {/* Mid glow */}
                  <circle
                    ref={midRef}
                    cx={initPos.x}
                    cy={initPos.y}
                    r={midR}
                    style={{ fill: palette.orbGlow, transition: 'fill 2.0s ease-in-out' }}
                    filter="url(#foundry-luna-mid)"
                    opacity={0.72}
                  />
                  {/* Core — the "molten silver" disk */}
                  <circle
                    ref={coreRef}
                    cx={initPos.x}
                    cy={initPos.y}
                    r={coreR}
                    style={{
                      fill: palette.orbFill,
                      opacity: palette.showMoon ? 0 : 1,
                      transition: 'fill 2.0s ease-in-out, opacity 0.8s ease-in-out',
                    }}
                    filter="url(#foundry-luna-core)"
                  />
                </svg>

                {/* z=5 Header */}
                <div className="absolute top-0 left-0 right-0 px-5 pt-5" style={{ zIndex: 5 }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <motion.p
                        style={{
                          fontFamily: SANS_DISPLAY,
                          fontSize: 14,
                          fontWeight: 200,
                          letterSpacing: '0.16em',
                          textTransform: 'lowercase',
                          lineHeight: 1,
                          opacity: 0.38,
                        }}
                        animate={{ color: palette.textPrimary }}
                        transition={{ duration: 2.0 }}
                      >
                        {palette.label}
                      </motion.p>
                      {showIllumination && (
                        <motion.p
                          style={{
                            fontFamily: SANS_TEXT,
                            fontSize: 10,
                            fontWeight: 200,
                            letterSpacing: '0.12em',
                            marginTop: 5,
                            opacity: 0.22,
                          }}
                          animate={{ color: palette.textSecondary }}
                          transition={{ duration: 2.0 }}
                        >
                          {illumPct}% · {nextEventStr}
                        </motion.p>
                      )}
                    </div>

                    {/* Phase icon — top right */}
                    <motion.div
                      animate={{ opacity: 0.4 }}
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
                    opacity: showMoonrise ? 0.28 : 0,
                    transition: 'opacity 0.8s ease-in-out',
                  }}
                  animate={{ color: palette.textSecondary }}
                  transition={{ duration: 2.0 }}
                >
                  <span
                    style={{
                      fontFamily: SANS_TEXT,
                      fontSize: 9,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                    }}
                  >
                    ↑ {moonriseStr}
                  </span>
                  <span
                    style={{
                      fontFamily: SANS_TEXT,
                      fontSize: 8,
                      letterSpacing: '0.12em',
                      opacity: 0.6,
                    }}
                  >
                    {palette.sublabel}
                  </span>
                  <span
                    style={{
                      fontFamily: SANS_TEXT,
                      fontSize: 9,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                    }}
                  >
                    ↓ {moonsetStr}
                  </span>
                </motion.div>

                {/* z=6 Glass sheen — machined steel look */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    zIndex: 6,
                    background:
                      'linear-gradient(165deg, rgba(255,255,255,0.08) 0%, transparent 42%)',
                    borderRadius: '1.8rem',
                  }}
                />

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
                        transition={{ ...SPRING_CONTENT, delay: 0.18 }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        aria-label="Collapse foundry luna widget"
                        style={{
                          position: 'absolute',
                          zIndex: 7,
                          top: 0,
                          ...(isRight ? { right: 0 } : { left: 0 }),
                          width: 34,
                          height: 34,
                          borderRadius: isRight ? '0 1.8rem 0 10px' : '1.8rem 0 10px 0',
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
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            opacity="0.60"
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
              paddingLeft: 12,
              paddingRight: 14,
              borderRadius: 18,
              background: `${palette.bg[1]}f7`,
              border: `1.5px solid ${palette.border}`,
              boxShadow: `0 4px 20px rgba(0,0,0,0.70), 0 0 ${16 * lunarPos.illumination + 4}px 2px ${palette.outerGlow}`,
              backdropFilter: 'blur(12px)',
              transformOrigin: origin,
              scale: expandScale,
            }}
            whileHover={hoverEffect ? { scale: expandScale * 1.05 } : undefined}
            whileTap={{ scale: expandScale * 0.96 }}
            aria-label={`Foundry luna widget — ${palette.label}. Click to expand.`}
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
              <MoonPhaseIcon phase={lunarPos.phase} color={palette.orbFill} size={16} />
            </span>

            {/* Illumination % */}
            {showIllumination && (
              <motion.span
                style={{
                  fontFamily: SANS_DISPLAY,
                  fontSize: 12,
                  fontWeight: 300,
                  letterSpacing: '-0.01em',
                  minWidth: 28,
                }}
                animate={{ color: palette.textPrimary, opacity: 0.38 }}
                transition={{ duration: 2.0 }}
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
                background: palette.border,
                opacity: 0.45,
                flexShrink: 0,
              }}
            />

            {/* Phase label */}
            <motion.span
              style={{
                fontFamily: SANS_TEXT,
                fontSize: 10,
                fontWeight: 300,
                letterSpacing: '0.16em',
                textTransform: 'lowercase',
                opacity: 0.38,
                whiteSpace: 'nowrap',
              }}
              animate={{ color: palette.textPrimary }}
              transition={{ duration: 2.0 }}
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
              style={{ marginLeft: 2, opacity: 0.32 }}
            >
              <path
                d={pillArrowPath(expandDirection)}
                stroke={palette.textSecondary}
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
