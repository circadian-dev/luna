'use client';
// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/aurora/aurora.lunar.component.tsx
// ════════════════════════════════════════════════════════════════════════════
/**
 * Aurora lunar skin — northern lights translated to lunar light.
 *
 * The aurora bands respond to lunar illumination:
 *   new moon  → bands near-invisible (auroraOpacity ≈ 0.04)
 *   full moon → bands bloom silver-blue at maximum (auroraOpacity ≈ 0.88)
 *
 * Uses the elliptical arc (same as aurora.component.tsx) — the deeper
 * parabola better suits aurora's atmospheric sweep.
 *
 * No weather layer. No Sol runtime imports. Purely lunar.
 *
 * MOBILE EXPAND FIX:
 *   Same pattern as aurora.component.tsx — outer div uses W*expandScale
 *   as layout dimensions; inner scale wrapper renders full W×H card content.
 */

import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LunarPhase, useLunarPosition } from '../../hooks/useLunarPosition';
import { lerpColor } from '../../lib/luna-lerp';
import { useLunaTheme } from '../../provider/luna-theme-provider';

// ─── Palette ──────────────────────────────────────────────────────────────────

export interface AuroraLunarPalette {
  bg: [string, string, string];
  band1: string;
  band2: string;
  band3: string;
  auroraOpacity: number; // scales from ~0.04 (new) to ~0.88 (full)
  orbFill: string;
  outerGlow: string;
  textPrimary: string;
  textSecondary: string;
  mode: 'dark' | 'dim'; // NEVER 'light' — full moon uses 'dim'
  label: string;
  sublabel: string;
  accentColor: string;
  border: string;
}

// ─── AURORA_LUNAR_PALETTES ────────────────────────────────────────────────────
// Temperature curve: new (black) → crescent (cold indigo) → quarter (blue-grey)
//   → gibbous (silver-blue) → FULL (silver-white) → gibbous → quarter → crescent → new
// Aurora bands: cold blue → silver-blue → silver-white at full

export const AURORA_LUNAR_PALETTES: Record<LunarPhase, AuroraLunarPalette> = {
  new: {
    bg: ['#000204', '#010308', '#02040C'],
    band1: '#0A1020',
    band2: '#080C18',
    band3: '#0C1028',
    auroraOpacity: 0.04,
    orbFill: 'rgba(30,35,70,0.70)',
    outerGlow: 'rgba(10,15,40,0.30)',
    textPrimary: '#404060',
    textSecondary: 'rgba(60,65,90,0.50)',
    mode: 'dark',
    label: 'new moon',
    sublabel: 'no light',
    accentColor: '#1A2040',
    border: 'rgba(30,35,70,0.20)',
  },
  'waxing-crescent': {
    bg: ['#010410', '#020614', '#030818'],
    band1: '#1A2860',
    band2: '#102050',
    band3: '#1E2870',
    auroraOpacity: 0.18,
    orbFill: 'rgba(80,90,160,0.85)',
    outerGlow: 'rgba(40,50,120,0.35)',
    textPrimary: '#7080C0',
    textSecondary: 'rgba(90,100,150,0.55)',
    mode: 'dark',
    label: 'crescent',
    sublabel: 'waxing',
    accentColor: '#303880',
    border: 'rgba(50,60,130,0.35)',
  },
  'first-quarter': {
    bg: ['#020510', '#040820', '#050A28'],
    band1: '#2A3870',
    band2: '#203068',
    band3: '#303880',
    auroraOpacity: 0.38,
    orbFill: 'rgba(110,120,200,0.92)',
    outerGlow: 'rgba(60,70,160,0.45)',
    textPrimary: '#9098D8',
    textSecondary: 'rgba(110,120,180,0.60)',
    mode: 'dark',
    label: 'first quarter',
    sublabel: 'half lit',
    accentColor: '#4050A0',
    border: 'rgba(70,80,160,0.40)',
  },
  'waxing-gibbous': {
    bg: ['#030618', '#060C30', '#080E3A'],
    band1: '#3848A0',
    band2: '#2C3A90',
    band3: '#4050B0',
    auroraOpacity: 0.6,
    orbFill: 'rgba(140,150,230,0.97)',
    outerGlow: 'rgba(80,90,190,0.55)',
    textPrimary: '#B0B8E8',
    textSecondary: 'rgba(130,140,210,0.65)',
    mode: 'dark',
    label: 'gibbous',
    sublabel: 'waxing',
    accentColor: '#5060C0',
    border: 'rgba(90,100,200,0.50)',
  },
  full: {
    bg: ['#040840', '#080E70', '#0A1080'],
    band1: '#6070D0',
    band2: '#7080E0',
    band3: '#8090F0',
    auroraOpacity: 0.88,
    orbFill: 'rgba(200,210,255,1.0)',
    outerGlow: 'rgba(120,130,230,0.75)',
    textPrimary: '#D8DEFF',
    textSecondary: 'rgba(180,190,240,0.75)',
    mode: 'dim',
    label: 'full moon',
    sublabel: 'full illumination',
    accentColor: '#7080E0',
    border: 'rgba(130,140,240,0.65)',
  },
  'waning-gibbous': {
    bg: ['#030618', '#060C2E', '#080E38'],
    band1: '#35459E',
    band2: '#293890',
    band3: '#3D4DAA',
    auroraOpacity: 0.58,
    orbFill: 'rgba(138,148,228,0.96)',
    outerGlow: 'rgba(78,88,186,0.52)',
    textPrimary: '#ADB5E6',
    textSecondary: 'rgba(128,138,206,0.63)',
    mode: 'dark',
    label: 'gibbous',
    sublabel: 'waning',
    accentColor: '#4D5DBE',
    border: 'rgba(88,98,196,0.48)',
  },
  'last-quarter': {
    bg: ['#020510', '#04081E', '#050A25'],
    band1: '#283570',
    band2: '#1E2D65',
    band3: '#2E367C',
    auroraOpacity: 0.35,
    orbFill: 'rgba(108,118,194,0.90)',
    outerGlow: 'rgba(58,66,154,0.42)',
    textPrimary: '#8D94D4',
    textSecondary: 'rgba(106,114,172,0.57)',
    mode: 'dark',
    label: 'last quarter',
    sublabel: 'half lit',
    accentColor: '#3D4D9C',
    border: 'rgba(67,76,154,0.37)',
  },
  'waning-crescent': {
    bg: ['#010410', '#020613', '#030716'],
    band1: '#14205A',
    band2: '#0C1848',
    band3: '#181E64',
    auroraOpacity: 0.14,
    orbFill: 'rgba(70,80,145,0.83)',
    outerGlow: 'rgba(34,42,108,0.30)',
    textPrimary: '#6068A8',
    textSecondary: 'rgba(80,88,135,0.50)',
    mode: 'dark',
    label: 'crescent',
    sublabel: 'waning',
    accentColor: '#242C78',
    border: 'rgba(42,52,118,0.28)',
  },
};

// ─── Palette interpolation ────────────────────────────────────────────────────

function lerpNum(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function lerpAuroraLunarPalette(
  a: AuroraLunarPalette,
  b: AuroraLunarPalette,
  t: number,
): AuroraLunarPalette {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const c = lerpColor;
  return {
    bg: [c(a.bg[0], b.bg[0], t), c(a.bg[1], b.bg[1], t), c(a.bg[2], b.bg[2], t)],
    band1: c(a.band1, b.band1, t),
    band2: c(a.band2, b.band2, t),
    band3: c(a.band3, b.band3, t),
    auroraOpacity: lerpNum(a.auroraOpacity, b.auroraOpacity, t),
    orbFill: c(a.orbFill, b.orbFill, t),
    outerGlow: c(a.outerGlow, b.outerGlow, t),
    textPrimary: c(a.textPrimary, b.textPrimary, t),
    textSecondary: c(a.textSecondary, b.textSecondary, t),
    accentColor: c(a.accentColor, b.accentColor, t),
    border: c(a.border, b.border, t),
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

// ─── Elliptical arc geometry (aurora uses elliptical, not parabolic) ──────────

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

// ─── Orb RAF (elliptical arc) ─────────────────────────────────────────────────

function useAuroraLunaOrbRaf(refs: {
  glow: React.RefObject<SVGCircleElement>;
  mid: React.RefObject<SVGCircleElement>;
  core: React.RefObject<SVGCircleElement>;
}) {
  const curP = useRef(-1);
  const tgtP = useRef(0);
  const rafId = useRef<number | null>(null);
  const first = useRef(true);
  const fading = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPos = (p: number) => {
    const { x, y } = arcPt(p);
    for (const r of [refs.glow, refs.mid, refs.core]) {
      r.current?.setAttribute('cx', String(x));
      r.current?.setAttribute('cy', String(y));
    }
  };

  const setOpacity = (o: number) => {
    for (const r of [refs.glow, refs.mid, refs.core]) {
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

// ─── Aurora band keyframes (unique names to avoid conflict with sol aurora) ───

const AURORA_LUNA_KF = `
@keyframes aurora-luna-band-1 {
  0%   { transform: translateX(0%) translateY(0px) scaleY(1); }
  33%  { transform: translateX(-12%) translateY(4px) scaleY(1.08); }
  66%  { transform: translateX(-6%) translateY(-3px) scaleY(0.94); }
  100% { transform: translateX(0%) translateY(0px) scaleY(1); }
}
@keyframes aurora-luna-band-2 {
  0%   { transform: translateX(-8%) translateY(0px) scaleY(1); }
  40%  { transform: translateX(4%) translateY(-5px) scaleY(1.12); }
  75%  { transform: translateX(-4%) translateY(3px) scaleY(0.92); }
  100% { transform: translateX(-8%) translateY(0px) scaleY(1); }
}
@keyframes aurora-luna-band-3 {
  0%   { transform: translateX(6%) translateY(0px) scaleY(1); }
  30%  { transform: translateX(-5%) translateY(6px) scaleY(0.90); }
  70%  { transform: translateX(8%) translateY(-4px) scaleY(1.10); }
  100% { transform: translateX(6%) translateY(0px) scaleY(1); }
}
`;

// ─── AuroraLunaBands ──────────────────────────────────────────────────────────
// Bands use cold blue-silver colors that bloom at full moon and vanish at new.

function AuroraLunaBands({
  band1,
  band2,
  band3,
  opacity,
}: {
  band1: string;
  band2: string;
  band3: string;
  opacity: number;
}) {
  if (opacity < 0.02) return null;
  return (
    <>
      <style>{AURORA_LUNA_KF}</style>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          opacity,
          zIndex: 1,
          borderRadius: 'inherit',
          transition: 'opacity 2.4s ease-in-out',
        }}
      >
        {/* Primary band — sweeps across upper portion */}
        <div
          style={{
            position: 'absolute',
            left: '-50%',
            top: '12%',
            width: '200%',
            height: '42%',
            background: `radial-gradient(ellipse 80% 100% at 50% 50%, ${band1}CC 0%, ${band1}66 40%, transparent 75%)`,
            filter: 'blur(28px)',
            animation: 'aurora-luna-band-1 24s ease-in-out infinite',
            opacity: 0.82,
          }}
        />
        {/* Secondary band — offset horizontally */}
        <div
          style={{
            position: 'absolute',
            left: '-40%',
            top: '26%',
            width: '180%',
            height: '28%',
            background: `radial-gradient(ellipse 70% 100% at 45% 50%, ${band2}BB 0%, ${band2}55 45%, transparent 78%)`,
            filter: 'blur(22px)',
            animation: 'aurora-luna-band-2 18s ease-in-out infinite',
            opacity: 0.72,
          }}
        />
        {/* Tertiary band — higher, thinner */}
        <div
          style={{
            position: 'absolute',
            left: '-30%',
            top: '6%',
            width: '160%',
            height: '22%',
            background: `radial-gradient(ellipse 60% 100% at 55% 50%, ${band3}99 0%, ${band3}44 50%, transparent 80%)`,
            filter: 'blur(18px)',
            animation: 'aurora-luna-band-3 14s ease-in-out infinite',
            opacity: 0.62,
          }}
        />
        {/* Horizon glow — subtle base wash */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '-20%',
            width: '140%',
            height: '20%',
            background: `radial-gradient(ellipse 80% 100% at 50% 100%, ${band1}44 0%, transparent 70%)`,
            filter: 'blur(16px)',
            animation: 'aurora-luna-band-1 30s ease-in-out infinite reverse',
            opacity: 0.38,
          }}
        />
      </div>
    </>
  );
}

// ─── Moon phase icon ──────────────────────────────────────────────────────────
// Overlapping circle masking technique — lit side determined by phase direction.

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
        <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.88} />
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
          opacity={0.88}
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
          opacity={0.88}
        />
        <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="1" opacity={0.2} />
      </svg>
    );
  }
  const isWaxing = phase === 'waxing-crescent' || phase === 'waxing-gibbous';
  const isThin = phase === 'waxing-crescent' || phase === 'waning-crescent';
  const offset = isThin ? r * 0.62 : r * 0.18;
  const dx = isWaxing ? -offset : offset;
  const maskId = `aurora-luna-moon-${phase}-${size}`;

  return (
    <svg role="presentation" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <mask id={maskId}>
          <circle cx={cx} cy={cy} r={r} fill="white" />
          <circle cx={cx + dx} cy={cy} r={r} fill="black" />
        </mask>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={color} mask={`url(#${maskId})`} opacity={0.88} />
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

// ─── AuroraLunarWidgetProps ───────────────────────────────────────────────────

export interface AuroraLunarWidgetProps {
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

// ─── AuroraLunarWidget ────────────────────────────────────────────────────────

export function AuroraLunarWidget({
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
}: AuroraLunarWidgetProps) {
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
      lerpAuroraLunarPalette(
        AURORA_LUNAR_PALETTES[blend.phase],
        AURORA_LUNAR_PALETTES[blend.nextPhase],
        blend.t,
      ),
    [blend],
  );

  const origin = TRANSFORM_ORIGINS[expandDirection] ?? 'top right';
  const yNudge = getYNudge(expandDirection);

  const [storedExpanded, setStoredExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const raw = localStorage.getItem('aurora-luna-widget-expanded');
      if (raw != null) return JSON.parse(raw);
    } catch {}
    return true;
  });

  const updateExpanded = useCallback((next: boolean) => {
    setStoredExpanded(next);
    try {
      localStorage.setItem('aurora-luna-widget-expanded', JSON.stringify(next));
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
  const glowRef = useRef<SVGCircleElement>(null);
  const midRef = useRef<SVGCircleElement>(null);
  const coreRef = useRef<SVGCircleElement>(null);
  const { setTarget } = useAuroraLunaOrbRaf({ glow: glowRef, mid: midRef, core: coreRef });

  // Orb scale driven by illumination — new moon is near-invisible
  const orbOpacity = Math.max(0.06, lunarPos.illumination * 0.94 + 0.06);
  const glowR = 56 * lunarPos.illumination + 6;
  const midR = 26 * lunarPos.illumination + 4;
  const coreR = 4 + lunarPos.illumination * 3;

  const progressTarget = lunarPos.isVisible
    ? Math.max(0.01, Math.min(0.99, lunarPos.moonProgress))
    : 0.5;

  useEffect(() => {
    if (glowRef.current) {
      glowRef.current.style.fill = palette.orbFill;
      glowRef.current.setAttribute('r', String(glowR));
    }
    if (midRef.current) {
      midRef.current.style.fill = palette.orbFill;
      midRef.current.setAttribute('r', String(midR));
    }
    if (coreRef.current) {
      coreRef.current.style.fill = palette.orbFill;
      coreRef.current.setAttribute('r', String(coreR));
    }
    setTarget(progressTarget);
  });

  const initPos = arcPt(progressTarget);

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
      data-luna-skin="aurora"
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
            {/* Outer glow — scales with illumination */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ borderRadius: '1.8rem' }}
              animate={{
                boxShadow: `0 0 ${40 * lunarPos.illumination + 12}px ${8 * lunarPos.illumination + 3}px ${palette.outerGlow}, 0 4px 20px rgba(0,0,0,0.35)`,
              }}
              transition={{ duration: 2.4 }}
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
                  borderRadius: '1.8rem',
                  border: `1px solid ${palette.border}`,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              >
                {/* z=0 Background */}
                <motion.div
                  className="absolute inset-0"
                  style={{ zIndex: 0 }}
                  animate={{
                    background: `linear-gradient(175deg, ${palette.bg[0]} 0%, ${palette.bg[1]} 55%, ${palette.bg[2]} 100%)`,
                  }}
                  transition={{ duration: 2.4, ease: 'easeInOut' }}
                />

                {/* z=1 Aurora bands — opacity responds to illumination via palette */}
                <AuroraLunaBands
                  band1={palette.band1}
                  band2={palette.band2}
                  band3={palette.band3}
                  opacity={palette.auroraOpacity}
                />

                {/* z=2 Arc hairline (dashed for Luna, per spec) */}
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
                    d={ARC_D}
                    fill="none"
                    stroke={palette.border}
                    strokeWidth="1.0"
                    strokeDasharray="4 6"
                    strokeLinecap="round"
                    opacity={0.3}
                  />
                </svg>

                {/* z=3 Orb — opacity and size scale with illumination */}
                <svg
                  role="presentation"
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    zIndex: 3,
                    opacity: orbOpacity,
                    transition: 'opacity 2.0s ease-in-out',
                    overflow: 'visible',
                  }}
                  width={W}
                  height={H}
                  viewBox={`0 0 ${W} ${H}`}
                >
                  <defs>
                    <filter id="aurora-luna-bloom" x="-200%" y="-200%" width="500%" height="500%">
                      <feGaussianBlur stdDeviation="18" />
                    </filter>
                    <filter id="aurora-luna-mid" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur stdDeviation="7" />
                    </filter>
                  </defs>
                  <circle
                    ref={glowRef}
                    cx={initPos.x}
                    cy={initPos.y}
                    r={glowR}
                    style={{ fill: palette.orbFill, transition: 'fill 2.4s ease-in-out' }}
                    filter="url(#aurora-luna-bloom)"
                    opacity={0.55}
                  />
                  <circle
                    ref={midRef}
                    cx={initPos.x}
                    cy={initPos.y}
                    r={midR}
                    style={{ fill: palette.orbFill, transition: 'fill 2.4s ease-in-out' }}
                    filter="url(#aurora-luna-mid)"
                    opacity={0.7}
                  />
                  <circle
                    ref={coreRef}
                    cx={initPos.x}
                    cy={initPos.y}
                    r={coreR}
                    style={{ fill: palette.orbFill, transition: 'fill 2.4s ease-in-out' }}
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
                          fontWeight: 200,
                          letterSpacing: '0.18em',
                          textTransform: 'lowercase',
                          lineHeight: 1,
                          opacity: 0.38,
                        }}
                        animate={{ color: palette.textPrimary }}
                        transition={{ duration: 2.4 }}
                      >
                        {palette.label}
                      </motion.p>
                      {showIllumination && (
                        <motion.p
                          style={{
                            fontFamily: SANS,
                            fontSize: 10,
                            fontWeight: 200,
                            letterSpacing: '0.12em',
                            marginTop: 5,
                            opacity: 0.22,
                          }}
                          animate={{ color: palette.textSecondary }}
                          transition={{ duration: 2.4 }}
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
                  transition={{ duration: 2.4 }}
                >
                  <span style={{ fontFamily: SANS, fontSize: 9, letterSpacing: '0.14em' }}>
                    ↑ {moonriseStr}
                  </span>
                  <span
                    style={{ fontFamily: SANS, fontSize: 8, letterSpacing: '0.12em', opacity: 0.6 }}
                  >
                    {palette.sublabel}
                  </span>
                  <span style={{ fontFamily: SANS, fontSize: 9, letterSpacing: '0.14em' }}>
                    ↓ {moonsetStr}
                  </span>
                </motion.div>

                {/* z=6 Top edge catch-light */}
                <div
                  className="absolute top-0 left-0 right-0 pointer-events-none"
                  style={{
                    zIndex: 6,
                    height: 1,
                    borderRadius: '1.8rem 1.8rem 0 0',
                    background:
                      'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.09) 30%, rgba(255,255,255,0.09) 70%, transparent 100%)',
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
                        aria-label="Collapse aurora luna widget"
                        style={{
                          position: 'absolute',
                          zIndex: 7,
                          top: 0,
                          ...(isRight ? { right: 0 } : { left: 0 }),
                          width: 34,
                          height: 34,
                          borderRadius: isRight ? '0 1.8rem 0 12px' : '1.8rem 0 12px 0',
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
            aria-label={`Aurora luna widget — ${palette.label}. Click to expand.`}
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
                  fontFamily: SANS,
                  fontSize: 12,
                  fontWeight: 200,
                  letterSpacing: '-0.01em',
                  minWidth: 28,
                }}
                animate={{ color: palette.textPrimary, opacity: 0.38 }}
                transition={{ duration: 2.4 }}
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
                fontFamily: SANS,
                fontSize: 10,
                fontWeight: 200,
                letterSpacing: '0.18em',
                textTransform: 'lowercase',
                opacity: 0.38,
                whiteSpace: 'nowrap',
              }}
              animate={{ color: palette.textPrimary }}
              transition={{ duration: 2.4 }}
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
