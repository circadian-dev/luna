'use client';
// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/tide/tide.lunar.component.tsx
// ════════════════════════════════════════════════════════════════════════════
/**
 * Tide lunar skin.
 *
 * Sol tide: coastal instrument — sine wave ocean, orb rides the wave surface,
 * bioluminescent sparkles at night, nautical phase labels (SLACK, FLOOD, EBB…).
 *
 * Luna tide: the same coastal aesthetic but cold and lunar throughout.
 * The defining visual arrangement: the MOON rides an ELLIPTICAL ARC above
 * a bioluminescent sine-wave OCEAN SURFACE. Two independent systems:
 *   - The water surface (sine wave) remains fixed in the lower portion
 *   - The moon orb traverses an elliptical arc above/through it
 *   - At new moon the bioluminescence is the ONLY light source
 *   - At full moon the orb glow illuminates the water below it
 *
 * Wave amplitude scales with illumination:
 *   new (neap tide) → minimal waves (waveAmp: 0.15)
 *   full (spring tide) → maximum waves (waveAmp: 0.90)
 *   This is oceanographically correct: spring tides (largest) occur at new
 *   and full moon; neap tides (smallest) at first/last quarter.
 *   We animate the full arc: small → large → small over the lunar cycle.
 *
 * Luna is always dark/night:
 *   - Bioluminescent sparkles always active (intensity scales with illumination)
 *   - Cold palette throughout: no warm tones
 *   - mode is always 'dark' (except full which is 'dim')
 *
 * Nautical labels for lunar phases:
 *   new            → NEAP     (smallest tidal range, no moon)
 *   waxing-crescent → FLOOD   (rising)
 *   first-quarter   → SURGE   (quarter spring)
 *   waxing-gibbous  → SPRING  (building to maximum)
 *   full            → SPRING TIDE (maximum tidal force)
 *   waning-gibbous  → EBB     (receding from maximum)
 *   last-quarter    → SLACK   (neap returning)
 *   waning-crescent → DRIFT   (fading out)
 *
 * Uses elliptical arc (CX=180, CY=200, RX=169.2, RY=171).
 * No weather. No Sol runtime. Purely lunar.
 */

import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LunarPhase, useLunarPosition } from '../../hooks/useLunarPosition';
import { lerpColor } from '../../lib/luna-lerp';
import { useLunaTheme } from '../../provider/luna-theme-provider';

// ─── Palette ──────────────────────────────────────────────────────────────────

export interface TideLunarPalette {
  bg: [string, string, string];
  sea: [string, string]; // ocean gradient
  waveStroke: string;
  waveFill: string;
  orbFill: string;
  orbGlow: string;
  bioLumColor: string; // bioluminescent sparkle color
  textPrimary: string;
  textSecondary: string;
  outerGlow: string;
  pillBg: string;
  pillBorder: string;
  pillText: string;
  accentColor: string;
  label: string; // nautical tidal term
  sublabel: string;
  mode: 'dark' | 'dim';
  waveAmp: number; // 0.15 at neap → 0.90 at spring
}

// ─── TIDE_LUNAR_PALETTES ──────────────────────────────────────────────────────
// Cold teal/blue throughout. Amplitude follows tidal physics.

export const TIDE_LUNAR_PALETTES: Record<LunarPhase, TideLunarPalette> = {
  new: {
    bg: ['#020608', '#030A10', '#050E18'],
    sea: ['#010304', '#020508'],
    waveStroke: '#0F2838',
    waveFill: '#080F1C',
    orbFill: '#1A2840',
    orbGlow: 'rgba(14,32,58,0.35)',
    bioLumColor: 'rgba(40,120,160,0.75)', // only light source at new moon
    textPrimary: '#2A4060',
    textSecondary: 'rgba(28,50,72,0.45)',
    outerGlow: 'rgba(8,24,48,0.22)',
    pillBg: 'rgba(2,6,8,0.96)',
    pillBorder: 'rgba(22,52,82,0.35)',
    pillText: 'rgba(42,64,96,0.82)',
    accentColor: '#184068',
    label: 'NEAP',
    sublabel: 'Smallest tide',
    mode: 'dark',
    waveAmp: 0.15, // neap tide — barely any waves
  },
  'waxing-crescent': {
    bg: ['#040C18', '#061428', '#0A1C38'],
    sea: ['#020608', '#030A14'],
    waveStroke: '#1A4870',
    waveFill: '#0A1C34',
    orbFill: '#3870B8',
    orbGlow: 'rgba(40,96,180,0.52)',
    bioLumColor: 'rgba(60,140,200,0.78)',
    textPrimary: '#7AAED8',
    textSecondary: 'rgba(72,118,172,0.52)',
    outerGlow: 'rgba(24,72,140,0.28)',
    pillBg: 'rgba(4,12,24,0.96)',
    pillBorder: 'rgba(44,100,168,0.38)',
    pillText: 'rgba(120,174,216,0.85)',
    accentColor: '#2860A8',
    label: 'FLOOD',
    sublabel: 'Rising tide',
    mode: 'dark',
    waveAmp: 0.28,
  },
  'first-quarter': {
    bg: ['#060E1E', '#0C1830', '#121E40'],
    sea: ['#030810', '#060E1C'],
    waveStroke: '#2458A0',
    waveFill: '#0E1C38',
    orbFill: '#4888D0',
    orbGlow: 'rgba(56,120,210,0.62)',
    bioLumColor: 'rgba(72,158,220,0.78)',
    textPrimary: '#88B8E0',
    textSecondary: 'rgba(80,132,188,0.55)',
    outerGlow: 'rgba(34,88,170,0.32)',
    pillBg: 'rgba(6,14,30,0.96)',
    pillBorder: 'rgba(58,116,192,0.42)',
    pillText: 'rgba(136,184,224,0.88)',
    accentColor: '#3878C0',
    label: 'SURGE',
    sublabel: 'Quarter spring',
    mode: 'dark',
    waveAmp: 0.38, // between neap and spring
  },
  'waxing-gibbous': {
    bg: ['#081428', '#0E2040', '#142C54'],
    sea: ['#040A14', '#080E20'],
    waveStroke: '#2E68C0',
    waveFill: '#101E3C',
    orbFill: '#58A0E8',
    orbGlow: 'rgba(68,148,230,0.72)',
    bioLumColor: 'rgba(84,172,238,0.82)',
    textPrimary: '#9CCAF0',
    textSecondary: 'rgba(90,150,210,0.60)',
    outerGlow: 'rgba(44,104,200,0.38)',
    pillBg: 'rgba(8,20,42,0.96)',
    pillBorder: 'rgba(72,136,218,0.48)',
    pillText: 'rgba(156,202,240,0.90)',
    accentColor: '#4890D8',
    label: 'SPRING',
    sublabel: 'Building tide',
    mode: 'dark',
    waveAmp: 0.65,
  },
  full: {
    bg: ['#0A1838', '#122050', '#182A68'],
    sea: ['#060A1C', '#0A1028'],
    waveStroke: '#3C7CE0',
    waveFill: '#142040',
    orbFill: '#78C0FF',
    orbGlow: 'rgba(90,175,255,0.85)',
    bioLumColor: 'rgba(100,195,255,0.90)', // maximum bioluminescence at full moon
    textPrimary: '#B8D8FF',
    textSecondary: 'rgba(108,172,240,0.72)',
    outerGlow: 'rgba(60,120,228,0.55)',
    pillBg: 'rgba(10,24,56,0.96)',
    pillBorder: 'rgba(90,160,248,0.58)',
    pillText: 'rgba(184,216,255,0.92)',
    accentColor: '#5898E8',
    label: 'SPRING TIDE',
    sublabel: 'Maximum tidal force',
    mode: 'dim',
    waveAmp: 0.9, // spring tide — maximum waves
  },
  'waning-gibbous': {
    bg: ['#081428', '#0D1E3E', '#132852'],
    sea: ['#040A14', '#08101E'],
    waveStroke: '#2C70BC',
    waveFill: '#0E1C3C',
    orbFill: '#5498E4',
    orbGlow: 'rgba(64,142,225,0.70)',
    bioLumColor: 'rgba(80,166,234,0.80)',
    textPrimary: '#98C6EC',
    textSecondary: 'rgba(86,144,204,0.58)',
    outerGlow: 'rgba(40,100,195,0.36)',
    pillBg: 'rgba(8,18,40,0.96)',
    pillBorder: 'rgba(68,130,212,0.46)',
    pillText: 'rgba(152,198,236,0.88)',
    accentColor: '#4488D0',
    label: 'EBB',
    sublabel: 'Receding tide',
    mode: 'dark',
    waveAmp: 0.62,
  },
  'last-quarter': {
    bg: ['#060E1C', '#0A1430', '#101A3E'],
    sea: ['#030710', '#060C1A'],
    waveStroke: '#1E5090',
    waveFill: '#0C1A34',
    orbFill: '#4478C8',
    orbGlow: 'rgba(52,108,202,0.60)',
    bioLumColor: 'rgba(68,145,210,0.75)',
    textPrimary: '#84B0DC',
    textSecondary: 'rgba(76,120,178,0.52)',
    outerGlow: 'rgba(28,78,158,0.30)',
    pillBg: 'rgba(6,12,28,0.96)',
    pillBorder: 'rgba(52,108,188,0.40)',
    pillText: 'rgba(132,176,220,0.85)',
    accentColor: '#3468B0',
    label: 'SLACK',
    sublabel: 'Neap returning',
    mode: 'dark',
    waveAmp: 0.36,
  },
  'waning-crescent': {
    bg: ['#040810', '#060E1C', '#0A1428'],
    sea: ['#020408', '#040810'],
    waveStroke: '#142848',
    waveFill: '#090F1E',
    orbFill: '#2A4888',
    orbGlow: 'rgba(30,60,140,0.45)',
    bioLumColor: 'rgba(48,100,170,0.72)',
    textPrimary: '#5678A8',
    textSecondary: 'rgba(48,72,114,0.48)',
    outerGlow: 'rgba(16,40,100,0.24)',
    pillBg: 'rgba(4,8,16,0.96)',
    pillBorder: 'rgba(32,62,112,0.34)',
    pillText: 'rgba(86,120,168,0.80)',
    accentColor: '#1C3A78',
    label: 'DRIFT',
    sublabel: 'Fading tide',
    mode: 'dark',
    waveAmp: 0.18,
  },
};

// ─── Palette interpolation ────────────────────────────────────────────────────

function lerpNum(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function lerpTideLunarPalette(
  a: TideLunarPalette,
  b: TideLunarPalette,
  t: number,
): TideLunarPalette {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const c = lerpColor;
  return {
    bg: [c(a.bg[0], b.bg[0], t), c(a.bg[1], b.bg[1], t), c(a.bg[2], b.bg[2], t)],
    sea: [c(a.sea[0], b.sea[0], t), c(a.sea[1], b.sea[1], t)],
    waveStroke: c(a.waveStroke, b.waveStroke, t),
    waveFill: c(a.waveFill, b.waveFill, t),
    orbFill: c(a.orbFill, b.orbFill, t),
    orbGlow: c(a.orbGlow, b.orbGlow, t),
    bioLumColor: c(a.bioLumColor, b.bioLumColor, t),
    textPrimary: c(a.textPrimary, b.textPrimary, t),
    textSecondary: c(a.textSecondary, b.textSecondary, t),
    outerGlow: c(a.outerGlow, b.outerGlow, t),
    pillBg: c(a.pillBg, b.pillBg, t),
    pillBorder: c(a.pillBorder, b.pillBorder, t),
    pillText: c(a.pillText, b.pillText, t),
    accentColor: c(a.accentColor, b.accentColor, t),
    waveAmp: lerpNum(a.waveAmp, b.waveAmp, t),
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

// ─── Elliptical arc ───────────────────────────────────────────────────────────

const W = 360;
const H = 180;
const CX = 180;
const CY = 200;
const RX = 169.2;
const RY = 171;
const ARC_D = `M ${CX - RX} ${CY} A ${RX} ${RY} 0 0 1 ${CX + RX} ${CY}`;

function arcOrbPos(progress: number) {
  const angle = Math.PI * (1 - Math.max(0.01, Math.min(0.99, progress)));
  return { x: CX + RX * Math.cos(angle), y: CY - RY * Math.sin(angle) };
}

// ─── Wave surface constants ───────────────────────────────────────────────────

const WAVE_Y = 118;
const WAVE_CYC = 1.5;
const MAX_AMP = 22;

function buildWavePath(amp: number, pts = 120): string {
  return Array.from({ length: pts }, (_, i) => {
    const t = i / (pts - 1);
    return `${i === 0 ? 'M' : 'L'}${(t * W).toFixed(1)},${(
      WAVE_Y + amp * Math.sin(t * Math.PI * 2 * WAVE_CYC)
    ).toFixed(1)}`;
  }).join(' ');
}

function buildWaterFill(amp: number): string {
  return `${buildWavePath(amp)} L${W},${H} L0,${H} Z`;
}

// ─── Orb RAF (elliptical) ─────────────────────────────────────────────────────

function useTideLunaOrbRaf(refs: {
  glow: React.RefObject<SVGCircleElement>;
  core: React.RefObject<SVGCircleElement>;
  spec: React.RefObject<SVGCircleElement>;
}) {
  const curP = useRef(-1);
  const tgtP = useRef(0);
  const rafId = useRef<number | null>(null);
  const first = useRef(true);
  const fading = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPos = (p: number) => {
    const { x, y } = arcOrbPos(p);
    refs.glow.current?.setAttribute('cx', String(x));
    refs.glow.current?.setAttribute('cy', String(y));
    refs.core.current?.setAttribute('cx', String(x));
    refs.core.current?.setAttribute('cy', String(y));
    if (refs.spec.current) {
      refs.spec.current.setAttribute('cx', String(x - 3));
      refs.spec.current.setAttribute('cy', String(y - 3));
    }
  };

  const setOpacity = (o: number) => {
    for (const r of [refs.glow, refs.core, refs.spec]) {
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

// ─── Seeded random (bioluminescence) ─────────────────────────────────────────

function sr(s: number) {
  const x = Math.sin(s + 1) * 10000;
  return x - Math.floor(x);
}

// ─── Wave pill icon (animated) ────────────────────────────────────────────────

function WaveLunaIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <svg role="presentation" width={size} height={size} viewBox="0 0 16 16" fill="none">
      <motion.path
        d="M0 8 Q2 5 4 8 Q6 11 8 8 Q10 5 12 8 Q14 11 16 8"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
        animate={{ x: [-2, 0, -2] }}
        transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
      <motion.path
        d="M0 11 Q2 9 4 11 Q6 13 8 11 Q10 9 12 11 Q14 13 16 11"
        stroke={color}
        strokeWidth={0.8}
        strokeLinecap="round"
        fill="none"
        opacity={0.45}
        animate={{ x: [0, -2, 0] }}
        transition={{
          duration: 3.2,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'easeInOut',
          delay: 0.6,
        }}
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
const SANS = "'SF Pro Display','Helvetica Neue',sans-serif";
const MONO = "'SF Mono','Menlo',monospace";

// ─── TideLunarWidgetProps ─────────────────────────────────────────────────────

export interface TideLunarWidgetProps {
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

// Pre-generated sparkle data — stable IDs prevent noArrayIndexKey lint error
const BIO_SPARKLES = Array.from({ length: 24 }, (_, i) => ({
  id: `bio-${i}`,
  w: sr(i * 3) * 2.2 + 0.5,
  leftPct: sr(i * 7 + 1) * 90,
  topPct: 62 + sr(i * 11 + 2) * 34,
  blur: sr(i * 3) * 5 + 2,
  dur: 1.5 + sr(i * 5) * 3,
  delay: sr(i * 13) * 5,
  peakOp: sr(i * 2) * 0.6 + 0.25,
}));

// ─── TideLunarWidget ─────────────────────────────────────────────────────────

export function TideLunarWidget({
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
}: TideLunarWidgetProps) {
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
      lerpTideLunarPalette(
        TIDE_LUNAR_PALETTES[blend.phase],
        TIDE_LUNAR_PALETTES[blend.nextPhase],
        blend.t,
      ),
    [blend],
  );

  const origin = TRANSFORM_ORIGINS[expandDirection] ?? 'top right';
  const yNudge = getYNudge(expandDirection);

  const [storedExpanded, setStoredExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const raw = localStorage.getItem('tide-luna-widget-expanded');
      if (raw != null) return JSON.parse(raw);
    } catch {}
    return true;
  });

  const updateExpanded = useCallback((next: boolean) => {
    setStoredExpanded(next);
    try {
      localStorage.setItem('tide-luna-widget-expanded', JSON.stringify(next));
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

  // ── Wave amp scales with illumination (spring = full, neap = quarter) ──────
  const waveAmp = MAX_AMP * palette.waveAmp;

  const wavePath = useMemo(() => buildWavePath(waveAmp), [waveAmp]);
  const waterFill = useMemo(() => buildWaterFill(waveAmp), [waveAmp]);

  // ── Orb RAF ────────────────────────────────────────────────────────────────
  const glowRef = useRef<SVGCircleElement>(null);
  const coreRef = useRef<SVGCircleElement>(null);
  const specRef = useRef<SVGCircleElement>(null);
  const { setTarget } = useTideLunaOrbRaf({ glow: glowRef, core: coreRef, spec: specRef });

  const orbOpacity = Math.max(0.06, lunarPos.illumination * 0.94 + 0.06);
  const glowR = 20 + lunarPos.illumination * 8;
  const coreR = 7 + lunarPos.illumination * 3;

  const progressTarget = lunarPos.isVisible
    ? Math.max(0.01, Math.min(0.99, lunarPos.moonProgress))
    : 0.5;

  useEffect(() => {
    if (glowRef.current) {
      glowRef.current.style.fill = palette.orbGlow;
      glowRef.current.setAttribute('r', String(glowR));
    }
    if (coreRef.current) {
      coreRef.current.style.fill = palette.orbFill;
      coreRef.current.setAttribute('r', String(coreR));
    }
    setTarget(progressTarget);
  });

  const initPos = arcOrbPos(progressTarget);

  // ── Bio-luminescence intensity scales with illumination ────────────────────
  const bioIntensity = Math.max(0.18, 1 - lunarPos.illumination * 0.65);
  // At new moon: bio is brightest (only light). At full moon: subdued (moon lights it).

  // ── Display ────────────────────────────────────────────────────────────────
  const illumPct = Math.round(lunarPos.illumination * 100);
  const moonriseStr = fmtMinutes(lunarPos.moonriseMinutes);
  const moonsetStr = fmtMinutes(lunarPos.moonsetMinutes);
  const isNearFull = ['full', 'waxing-gibbous', 'waning-gibbous'].includes(lunarPos.phase);
  const nextStr = isNearFull
    ? `${fmtDays(lunarPos.daysUntilFull)} to full`
    : `${fmtDays(lunarPos.daysUntilNew)} to new`;

  const pillMinWidth = showIllumination ? 148 : 108;

  return (
    <div
      data-luna-skin="tide"
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
              animate={{ boxShadow: `0 0 50px 14px ${palette.outerGlow}` }}
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
                  borderRadius: '1.6rem',
                  border: '2px solid rgba(255,255,255,0.10)',
                  boxShadow: 'inset 0 1.5px 1px rgba(255,255,255,0.08)',
                }}
              >
                {/* z=0 Sky background */}
                <motion.div
                  className="absolute inset-0"
                  style={{ zIndex: 0 }}
                  animate={{
                    background: `linear-gradient(175deg,${palette.bg[0]} 0%,${palette.bg[1]} 58%,${palette.bg[2]} 100%)`,
                  }}
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                />

                {/* z=1 Bioluminescent sparkles — always active, intensity inverted from illumination */}
                <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 1 }}>
                  {BIO_SPARKLES.map((s) => (
                    <motion.div
                      key={s.id}
                      className="absolute rounded-full"
                      style={{
                        width: s.w,
                        height: s.w,
                        left: `${s.leftPct}%`,
                        top: `${s.topPct}%`,
                        background: palette.bioLumColor,
                        boxShadow: `0 0 ${s.blur}px ${palette.bioLumColor}`,
                      }}
                      animate={{
                        opacity: [
                          0.05 * bioIntensity,
                          s.peakOp * bioIntensity,
                          0.05 * bioIntensity,
                        ],
                        scale: [0.8, 1.4, 0.8],
                      }}
                      transition={{
                        duration: s.dur,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: s.delay,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>

                {/* z=3 Arc + water + orb SVG */}
                <svg
                  role="presentation"
                  className="absolute inset-0"
                  style={{ zIndex: 3, overflow: 'hidden' }}
                  width={W}
                  height={H}
                  viewBox={`0 0 ${W} ${H}`}
                >
                  <defs>
                    <linearGradient id="tide-luna-sea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={palette.sea[0]} />
                      <stop offset="100%" stopColor={palette.sea[1]} />
                    </linearGradient>
                    <filter id="tide-luna-orb-blur" x="-150%" y="-150%" width="400%" height="400%">
                      <feGaussianBlur stdDeviation="10" />
                    </filter>
                    <filter id="tide-luna-orb-core" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="2.5" result="b" />
                      <feMerge>
                        <feMergeNode in="b" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    {/* Dashed arc path for elliptical track */}
                    <path id="tide-luna-arc" d={ARC_D} />
                  </defs>

                  {/* Ocean surface */}
                  <path d={waterFill} fill="url(#tide-luna-sea)" opacity={0.55} />
                  <path
                    d={wavePath}
                    fill="none"
                    stroke={palette.waveStroke}
                    strokeWidth={1.8}
                    opacity={0.62}
                  />

                  {/* Elliptical arc — faint dashed guide */}
                  <path
                    d={ARC_D}
                    fill="none"
                    stroke={palette.waveStroke}
                    strokeWidth={0.6}
                    strokeDasharray="3 8"
                    strokeLinecap="round"
                    opacity={0.18}
                  />

                  {/* Moon orb — scales with illumination */}
                  <circle
                    ref={glowRef}
                    cx={initPos.x}
                    cy={initPos.y}
                    r={glowR}
                    style={{
                      fill: palette.orbGlow,
                      opacity: orbOpacity,
                      transition: 'fill 1.2s ease-in-out, opacity 2.0s ease-in-out',
                    }}
                    filter="url(#tide-luna-orb-blur)"
                  />
                  <circle
                    ref={coreRef}
                    cx={initPos.x}
                    cy={initPos.y}
                    r={coreR}
                    style={{
                      fill: palette.orbFill,
                      opacity: orbOpacity,
                      transition: 'fill 1.2s ease-in-out, opacity 2.0s ease-in-out',
                    }}
                    filter="url(#tide-luna-orb-core)"
                  />
                  <circle
                    ref={specRef}
                    cx={initPos.x - 3}
                    cy={initPos.y - 3}
                    r={2.2}
                    fill="rgba(220,235,255,0.45)"
                    style={{
                      opacity: orbOpacity * 0.85,
                      transition: 'opacity 2.0s ease-in-out',
                    }}
                  />
                </svg>

                {/* z=5 Header */}
                <div className="absolute top-0 left-0 right-0 px-5 pt-5" style={{ zIndex: 5 }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <motion.p
                        style={{
                          fontFamily: MONO,
                          fontSize: 15,
                          fontWeight: 600,
                          letterSpacing: '0.20em',
                          textTransform: 'uppercase',
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
                            fontFamily: SANS,
                            fontSize: 10,
                            marginTop: 3,
                            letterSpacing: '0.10em',
                            textTransform: 'uppercase',
                          }}
                          animate={{ color: palette.textSecondary }}
                          transition={{ duration: 1.2 }}
                        >
                          {illumPct}% · {nextStr}
                        </motion.p>
                      )}
                    </div>
                  </div>
                </div>

                {/* z=5 Bottom row — moonrise / sublabel / moonset */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 px-5 pb-[14px] flex items-center justify-between"
                  style={{
                    zIndex: 5,
                    opacity: showMoonrise ? 1 : 0,
                    transition: 'opacity 0.8s ease-in-out',
                  }}
                  animate={{ color: palette.textSecondary }}
                  transition={{ duration: 1.2 }}
                >
                  <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em' }}>
                    ↑ MR {moonriseStr}
                  </span>
                  <span
                    style={{
                      fontFamily: SANS,
                      fontSize: 9,
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      opacity: 0.55,
                    }}
                  >
                    {palette.sublabel}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em' }}>
                    ↓ MS {moonsetStr}
                  </span>
                </motion.div>

                {/* z=6 Horizon sheen */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    zIndex: 6,
                    borderRadius: '1.6rem',
                    background:
                      'linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, transparent 38%, rgba(0,0,0,0.08) 65%, transparent 100%)',
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
                        aria-label="Collapse tide luna widget"
                        style={{
                          position: 'absolute',
                          zIndex: 7,
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
                        <svg role="presentation" width="8" height="8" viewBox="0 0 8 8" fill="none">
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
              borderRadius: 18,
              background: palette.pillBg,
              border: `1.5px solid ${palette.pillBorder}`,
              boxShadow: `0 4px 20px rgba(0,0,0,0.32), 0 0 18px 3px ${palette.outerGlow}`,
              backdropFilter: 'blur(12px)',
              transformOrigin: origin,
              scale: expandScale,
            }}
            whileHover={hoverEffect ? { scale: expandScale * 1.05 } : undefined}
            whileTap={{ scale: expandScale * 0.95 }}
            aria-label={`Tide luna widget — ${palette.label}. Click to expand.`}
          >
            {/* Wave icon */}
            <span
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                flexShrink: 0,
              }}
            >
              <WaveLunaIcon color={palette.pillText} size={16} />
            </span>

            {/* Illumination % */}
            {showIllumination && (
              <motion.span
                style={{
                  fontFamily: SANS,
                  fontSize: 12,
                  fontWeight: 300,
                  letterSpacing: '-0.01em',
                  minWidth: 28,
                }}
                animate={{ color: palette.pillText, opacity: 0.65 }}
                transition={{ duration: 1.2 }}
              >
                {illumPct}%
              </motion.span>
            )}

            {/* Dot */}
            <span
              style={{
                width: 3,
                height: 3,
                borderRadius: '50%',
                background: palette.pillBorder,
                flexShrink: 0,
              }}
            />

            {/* Nautical label */}
            <motion.span
              style={{
                fontFamily: MONO,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
              animate={{ color: palette.textSecondary }}
              transition={{ duration: 1.2 }}
            >
              {palette.label}
            </motion.span>

            {/* Arrow */}
            <svg
              role="presentation"
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
