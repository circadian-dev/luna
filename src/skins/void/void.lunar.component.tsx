'use client';
// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/void/void.lunar.component.tsx
// ════════════════════════════════════════════════════════════════════════════
/**
 * Void lunar skin — the anti-skin applied to the moon.
 *
 * The same near-black everything philosophy as the solar void skin,
 * but the orb's presence is now driven by lunar illumination:
 *
 *   new moon    → orb is nearly invisible (illumination ≈ 0)
 *   full moon   → orb blooms to maximum presence (illumination ≈ 1)
 *
 * This is the key difference from Sol's void night phases — those are
 * always the same dark regardless of moon state. Luna void makes the
 * moon's illumination the only source of light in the widget.
 *
 * Arc is the same flat horizontal line as Sol void.
 * No weather layer — Luna is purely astronomical.
 * Bottom row: moonrise / moonset instead of sunrise / sunset.
 * Display data: illumination %, phase label, days to next phase.
 *
 * MOBILE EXPAND FIX:
 *   Outer motion.div layout = W*expandScale × H*expandScale.
 *   Inner scale wrapper renders full W×H content scaled down.
 *   Identical pattern to void.component.tsx.
 */

import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LunarPhase } from '../../hooks/useLunarPosition';
import { useLunarPosition } from '../../hooks/useLunarPosition';
import { lerpColor } from '../../lib/luna-lerp';
import { useLunaTheme } from '../../provider/luna-theme-provider';

// ─── Palette ──────────────────────────────────────────────────────────────────

export interface VoidLunarPalette {
  bg: [string, string];
  arcColor: string;
  orbGlow: string;
  orbCore: string;
  textPrimary: string;
  textSecondary: string;
  outerGlow: string;
  pillBg: string;
  pillBorder: string;
  pillText: string;
  label: string;
  sublabel: string;
  mode: 'dark';
}

// Helper to build palette entries concisely
const VP = (
  bg0: string,
  bg1: string,
  glow: string,
  core: string,
  text: string,
  label: string,
  sublabel: string,
): VoidLunarPalette => ({
  bg: [bg0, bg1],
  arcColor: glow,
  orbGlow: glow,
  orbCore: core,
  textPrimary: text,
  textSecondary: text,
  outerGlow: glow,
  pillBg: `${bg1}f7`,
  pillBorder: glow,
  pillText: `${text}66`,
  label,
  sublabel,
  mode: 'dark',
});

export const VOID_LUNAR_PALETTES: Record<LunarPhase, VoidLunarPalette> = {
  // new moon — absolute black, orb barely exists
  new: VP(
    '#000000',
    '#020204',
    'rgba(20,20,30,0.6)',
    'rgba(40,40,60,0.8)',
    '#606080',
    'new moon',
    'no light',
  ),
  // waxing crescent — first sliver of silver
  'waxing-crescent': VP(
    '#010108',
    '#02020C',
    'rgba(40,40,80,0.65)',
    'rgba(90,90,160,0.9)',
    '#8888C0',
    'crescent',
    'waxing',
  ),
  // first quarter — half lit, cold blue-grey
  'first-quarter': VP(
    '#020210',
    '#040420',
    'rgba(55,55,110,0.70)',
    'rgba(120,120,200,0.95)',
    '#A0A0D8',
    'first quarter',
    'half lit',
  ),
  // waxing gibbous — building silver
  'waxing-gibbous': VP(
    '#030318',
    '#06063A',
    'rgba(70,70,150,0.75)',
    'rgba(140,140,220,0.98)',
    '#B8B8E8',
    'gibbous',
    'waxing',
  ),
  // full moon — maximum presence, silver-blue bloom
  full: VP(
    '#04043A',
    '#08087A',
    'rgba(100,100,200,0.85)',
    'rgba(200,200,255,1.0)',
    '#E0E0FF',
    'full moon',
    'full illumination',
  ),
  // waning gibbous — fading from full
  'waning-gibbous': VP(
    '#030318',
    '#06063A',
    'rgba(70,70,150,0.72)',
    'rgba(140,140,220,0.96)',
    '#B8B8E8',
    'gibbous',
    'waning',
  ),
  // last quarter — half lit, left side
  'last-quarter': VP(
    '#020210',
    '#040420',
    'rgba(55,55,110,0.68)',
    'rgba(120,120,200,0.92)',
    '#A0A0D8',
    'last quarter',
    'half lit',
  ),
  // waning crescent — near-black again
  'waning-crescent': VP(
    '#010108',
    '#02020C',
    'rgba(35,35,70,0.60)',
    'rgba(75,75,140,0.85)',
    '#7878A8',
    'crescent',
    'waning',
  ),
};

// ─── Palette interpolation ────────────────────────────────────────────────────

export function lerpVoidLunarPalette(
  a: VoidLunarPalette,
  b: VoidLunarPalette,
  t: number,
): VoidLunarPalette {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const c = lerpColor;
  return {
    bg: [c(a.bg[0], b.bg[0], t), c(a.bg[1], b.bg[1], t)],
    arcColor: c(a.arcColor, b.arcColor, t),
    orbGlow: c(a.orbGlow, b.orbGlow, t),
    orbCore: c(a.orbCore, b.orbCore, t),
    textPrimary: c(a.textPrimary, b.textPrimary, t),
    textSecondary: c(a.textSecondary, b.textSecondary, t),
    outerGlow: c(a.outerGlow, b.outerGlow, t),
    pillBg: c(a.pillBg, b.pillBg, t),
    pillBorder: c(a.pillBorder, b.pillBorder, t),
    pillText: c(a.pillText, b.pillText, t),
    label: t < 0.5 ? a.label : b.label,
    sublabel: t < 0.5 ? a.sublabel : b.sublabel,
    mode: 'dark',
  };
}

// ─── Arc constants — identical to void.component.tsx ─────────────────────────

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

// ─── Orb RAF — identical mechanism to void.component.tsx ─────────────────────

function useLunaVoidOrbRaf(refs: {
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
    const { x, y } = arcOrbPos(p);
    (refs.glow.current as SVGCircleElement | null)?.setAttribute('cx', String(x));
    (refs.glow.current as SVGCircleElement | null)?.setAttribute('cy', String(y));
    (refs.mid.current as SVGCircleElement | null)?.setAttribute('cx', String(x));
    (refs.mid.current as SVGCircleElement | null)?.setAttribute('cy', String(y));
    (refs.core.current as SVGCircleElement | null)?.setAttribute('cx', String(x));
    (refs.core.current as SVGCircleElement | null)?.setAttribute('cy', String(y));
  };

  const setOpacity = (o: number) => {
    for (const r of [refs.glow, refs.mid, refs.core]) {
      if (r.current) (r.current as SVGCircleElement).style.opacity = String(o);
    }
  };

  const anim = () => {
    const d = tgtP.current - curP.current;
    if (Math.abs(d) > 0.0004) {
      curP.current += d * 0.12;
      setPos(curP.current);
      rafId.current = window.requestAnimationFrame(anim);
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
        window.cancelAnimationFrame(rafId.current);
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
        if (!rafId.current) rafId.current = window.requestAnimationFrame(anim);
      }, 160);
    } else if (!fading.current) {
      if (!rafId.current) rafId.current = window.requestAnimationFrame(anim);
    }
  };

  useEffect(
    () => () => {
      if (rafId.current) window.cancelAnimationFrame(rafId.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    },
    [],
  );

  return { setTarget };
}

// ─── Moon phase icon ──────────────────────────────────────────────────────────
// Simple SVG moon showing the correct terminator for each phase.

function MoonPill({
  phase,
  color,
  size = 16,
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
        <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="1" opacity={0.3} />
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
        <path d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z`} fill={color} />
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
        <path d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z`} fill={color} />
        <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="1" opacity={0.2} />
      </svg>
    );
  }
  const isWaxing = phase === 'waxing-crescent' || phase === 'waxing-gibbous';
  const isThin = phase === 'waxing-crescent' || phase === 'waning-crescent';
  const offset = isThin ? r * 0.62 : r * 0.18;
  const maskId = `void-moon-${phase}-${size}`;
  const dx = isWaxing ? -offset : offset;

  return (
    <svg role="presentation" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <mask id={maskId}>
          <circle cx={cx} cy={cy} r={r} fill="white" />
          <circle cx={cx + dx} cy={cy} r={r} fill="black" />
        </mask>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={color} mask={`url(#${maskId})`} />
      <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="1" fill="none" opacity={0.18} />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Springs ──────────────────────────────────────────────────────────────────

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
  const nextPhase = PHASE_ORDER[nextIdx] ?? 'new';
  const start = PHASE_STARTS[phase] ?? 0;
  const nextStart = nextIdx === 0 ? CYCLE : (PHASE_STARTS[nextPhase] ?? CYCLE);
  const duration = nextStart - start;
  const elapsed = ageInDays - start;
  const progress = Math.max(0, Math.min(1, elapsed / duration));
  const WINDOW = 0.2;
  const t = progress < 1 - WINDOW ? 0 : (progress - (1 - WINDOW)) / WINDOW;
  return { phase, nextPhase, t };
}

// ─── VoidLunarWidget Props ────────────────────────────────────────────────────

export interface VoidLunarWidgetProps {
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

// ─── VoidLunarWidget ──────────────────────────────────────────────────────────

export function VoidLunarWidget({
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
}: VoidLunarWidgetProps) {
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
      lerpVoidLunarPalette(
        VOID_LUNAR_PALETTES[blend.phase],
        VOID_LUNAR_PALETTES[blend.nextPhase],
        blend.t,
      ),
    [blend],
  );

  const origin = TRANSFORM_ORIGINS[expandDirection] ?? 'top right';
  const yNudge = getYNudge(expandDirection);

  const [storedExpanded, setStoredExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const raw = localStorage.getItem('void-luna-widget-expanded');
      if (raw != null) return JSON.parse(raw);
    } catch {}
    return true;
  });

  const updateExpanded = useCallback((next: boolean) => {
    setStoredExpanded(next);
    try {
      localStorage.setItem('void-luna-widget-expanded', JSON.stringify(next));
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
  const { setTarget } = useLunaVoidOrbRaf({ glow: glowRef, mid: midRef, core: coreRef });

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
      (glowRef.current as SVGCircleElement).style.fill = palette.orbGlow;
      (glowRef.current as SVGCircleElement).setAttribute('r', String(glowR));
    }
    if (midRef.current) {
      (midRef.current as SVGCircleElement).style.fill = palette.orbGlow;
      (midRef.current as SVGCircleElement).setAttribute('r', String(midR));
    }
    if (coreRef.current) {
      (coreRef.current as SVGCircleElement).style.fill = palette.orbCore;
      (coreRef.current as SVGCircleElement).setAttribute('r', String(coreR));
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
      data-luna-skin="void"
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
              style={{ borderRadius: '1.6rem' }}
              animate={{
                boxShadow: `0 0 ${32 * lunarPos.illumination + 8}px ${6 * lunarPos.illumination + 2}px ${palette.outerGlow}`,
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
                  borderRadius: '1.6rem',
                  border: `1px solid ${palette.arcColor}14`,
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.03)',
                }}
              >
                {/* z=0 Background */}
                <motion.div
                  className="absolute inset-0"
                  style={{ zIndex: 0 }}
                  animate={{
                    background: `linear-gradient(135deg, ${palette.bg[0]} 0%, ${palette.bg[1]} 100%)`,
                  }}
                  transition={{ duration: 2.4, ease: 'easeInOut' }}
                />

                {/* z=1 Star field — more stars visible when moon is dim */}
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{ zIndex: 1, borderRadius: 'inherit' }}
                >
                  <svg
                    role="presentation"
                    aria-hidden
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${W} ${H}`}
                    preserveAspectRatio="xMidYMid slice"
                  >
                    {(
                      [
                        [0.08, 0.12],
                        [0.15, 0.35],
                        [0.22, 0.08],
                        [0.31, 0.55],
                        [0.38, 0.18],
                        [0.45, 0.42],
                        [0.52, 0.07],
                        [0.61, 0.28],
                        [0.68, 0.62],
                        [0.74, 0.15],
                        [0.81, 0.48],
                        [0.88, 0.22],
                        [0.93, 0.38],
                        [0.12, 0.72],
                        [0.29, 0.81],
                        [0.56, 0.88],
                        [0.72, 0.75],
                        [0.85, 0.68],
                        [0.04, 0.52],
                        [0.96, 0.58],
                      ] as const
                    ).map(([px, py], i) => {
                      const starOpacity =
                        Math.max(0.03, 0.3 * (1 - lunarPos.illumination * 0.65)) *
                        (0.5 + (i % 5) * 0.1);
                      return (
                        <circle
                          // biome-ignore lint/suspicious/noArrayIndexKey: static constant array
                          key={i}
                          cx={px * W}
                          cy={py * H}
                          r={i % 3 === 0 ? 1.1 : i % 3 === 1 ? 0.75 : 0.45}
                          fill="#ffffff"
                          opacity={starOpacity}
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* z=2 Arc hairline */}
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
                    stroke={palette.arcColor}
                    strokeWidth={0.8}
                    opacity={0.12}
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
                    transition: 'opacity 1.8s ease-in-out',
                  }}
                  width={W}
                  height={H}
                  viewBox={`0 0 ${W} ${H}`}
                >
                  <defs>
                    <filter id="void-luna-bloom" x="-200%" y="-200%" width="500%" height="500%">
                      <feGaussianBlur stdDeviation="18" />
                    </filter>
                    <filter id="void-luna-mid" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur stdDeviation="8" />
                    </filter>
                  </defs>
                  <circle
                    ref={glowRef}
                    cx={initPos.x}
                    cy={initPos.y}
                    r={glowR}
                    style={{ fill: palette.orbGlow, transition: 'fill 2.4s ease-in-out' }}
                    filter="url(#void-luna-bloom)"
                  />
                  <circle
                    ref={midRef}
                    cx={initPos.x}
                    cy={initPos.y}
                    r={midR}
                    style={{ fill: palette.orbGlow, transition: 'fill 2.4s ease-in-out' }}
                    filter="url(#void-luna-mid)"
                    opacity={0.7}
                  />
                  <circle
                    ref={coreRef}
                    cx={initPos.x}
                    cy={initPos.y}
                    r={coreR}
                    style={{ fill: palette.orbCore, transition: 'fill 2.4s ease-in-out' }}
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
                      animate={{ opacity: 0.35 }}
                      style={{ transition: 'opacity 1.2s ease-in-out' }}
                    >
                      <MoonPill phase={lunarPos.phase} color={palette.orbCore} size={22} />
                    </motion.div>
                  </div>
                </div>

                {/* z=5 Bottom row — moonrise / moonset */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 px-5 pb-[14px] flex items-center justify-between"
                  style={{
                    zIndex: 5,
                    opacity: showMoonrise ? 0.26 : 0,
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
                    borderRadius: '1.6rem 1.6rem 0 0',
                    background:
                      'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.04) 70%, transparent 100%)',
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
                        aria-label="Collapse luna void widget"
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
            initial={{ opacity: 0, scale: 0.75, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.75, y: -8 }}
            transition={SPRING_EXPAND}
            className="flex items-center gap-2 cursor-pointer select-none group"
            style={{
              height: 36,
              minWidth: pillMinWidth,
              paddingLeft: 12,
              paddingRight: 14,
              borderRadius: 18,
              background: palette.pillBg,
              border: `1px solid ${palette.pillBorder}`,
              boxShadow: `0 4px 20px rgba(0,0,0,0.70), 0 0 ${16 * lunarPos.illumination + 4}px 2px ${palette.outerGlow}`,
              backdropFilter: 'blur(8px)',
              transformOrigin: origin,
              scale: expandScale,
            }}
            whileHover={hoverEffect ? { scale: expandScale * 1.05 } : undefined}
            whileTap={{ scale: expandScale * 0.96 }}
            aria-label={`Luna void widget — ${palette.label}. Click to expand.`}
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
              <MoonPill phase={lunarPos.phase} color={palette.orbCore} size={16} />
            </span>

            {/* Illumination % */}
            {showIllumination && (
              <motion.span
                style={{
                  fontFamily: SANS,
                  fontSize: 12,
                  fontWeight: 200,
                  letterSpacing: '-0.01em',
                  color: palette.textPrimary,
                  minWidth: 28,
                }}
                animate={{ opacity: 0.38 }}
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
                opacity: 0.4,
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
                color: palette.textPrimary,
                opacity: 0.38,
                whiteSpace: 'nowrap',
              }}
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
              style={{ marginLeft: 2, opacity: 0.3 }}
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
