'use client';
// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/signal/signal.lunar.component.tsx
// ════════════════════════════════════════════════════════════════════════════
/**
 * Signal lunar skin — brutalist terminal applied to the moon.
 *
 * Sol signal: dark surfaces, single accent hue per phase, reticle orb,
 * block segment track, scanlines, monospace font, codes not icons.
 *
 * Luna signal: the same terminal aesthetic but cold — 8 lunar phases,
 * 8 cold accent hues (none warm), and the defining visual:
 *
 *   PIXELATED MOON CIRCLE — a 5×5 grid of tiny square "pixels" arranged
 *   in a circle pattern, filled/empty based on illumination. At new moon
 *   all pixels are empty outlines. At full moon all pixels are filled.
 *   At first/last quarter, the right/left half is filled.
 *   This is the "pixel/CRT treatment" from the spec.
 *
 * Terminal data fields:
 *   PHASE: LUNA.NOVA / CRESCENT+ / QUAD.PRIMA / GIBBOUS+ / LUNA.PLENA /
 *          GIBBOUS- / QUAD.ULTIMA / CRESCENT-
 *   ILLUM: XX%
 *   NEXT:  XXd to PLENA/NOVA
 *   MR: HH:MM  (moonrise)
 *   MS: HH:MM  (moonset)
 *   LOC: XX    (country code if showFlag)
 *
 * Block segment track: filled blocks = illumination percentage.
 * Full moon = all blocks lit. New moon = all blocks empty.
 *
 * Uses parabolic arc. No weather. No Sol runtime. Purely lunar.
 */

import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LunarPhase, useLunarPosition } from '../../hooks/useLunarPosition';
import { lerpColor } from '../../lib/luna-lerp';
import { useLunaTheme } from '../../provider/luna-theme-provider';
import { Reticle } from './signal.reticle';

// ─── Palette ──────────────────────────────────────────────────────────────────

export interface SignalLunarPalette {
  bg: [string, string, string];
  accent: string; // primary accent — cold, scales with illumination
  accentDim: string; // dimmed accent for borders, dividers
  textPrimary: string;
  textMuted: string;
  pillBg: string;
  pillBorder: string;
  phaseCode: string; // terminal phase identifier
  mode: 'dark' | 'dim'; // full → 'dim', others → 'dark'
}

// ─── SIGNAL_LUNAR_PALETTES ────────────────────────────────────────────────────
// Cold accent curve: new (near-invisible grey) → crescent (dim blue) →
// quarter (mid blue) → gibbous (bright blue) → FULL (blue-white) → waning dims

export const SIGNAL_LUNAR_PALETTES: Record<LunarPhase, SignalLunarPalette> = {
  new: {
    bg: ['#040408', '#06060C', '#08080E'],
    accent: '#282840',
    accentDim: 'rgba(40,40,64,0.38)',
    textPrimary: '#303048',
    textMuted: 'rgba(48,48,72,0.45)',
    pillBg: '#06060C',
    pillBorder: 'rgba(40,40,64,0.45)',
    phaseCode: 'LUNA.NOVA',
    mode: 'dark',
  },
  'waxing-crescent': {
    bg: ['#060810', '#080C14', '#0C1018'],
    accent: '#1A60A8',
    accentDim: 'rgba(26,96,168,0.42)',
    textPrimary: '#4080B8',
    textMuted: 'rgba(64,128,184,0.45)',
    pillBg: '#080C14',
    pillBorder: 'rgba(26,96,168,0.50)',
    phaseCode: 'CRESCENT+',
    mode: 'dark',
  },
  'first-quarter': {
    bg: ['#080C18', '#0C1020', '#101428'],
    accent: '#2278C8',
    accentDim: 'rgba(34,120,200,0.45)',
    textPrimary: '#5098D0',
    textMuted: 'rgba(80,152,208,0.48)',
    pillBg: '#0C1020',
    pillBorder: 'rgba(34,120,200,0.52)',
    phaseCode: 'QUAD.PRIMA',
    mode: 'dark',
  },
  'waxing-gibbous': {
    bg: ['#0A1020', '#0E1428', '#121830'],
    accent: '#2E90E0',
    accentDim: 'rgba(46,144,224,0.48)',
    textPrimary: '#60B0E8',
    textMuted: 'rgba(96,176,232,0.50)',
    pillBg: '#0E1428',
    pillBorder: 'rgba(46,144,224,0.56)',
    phaseCode: 'GIBBOUS+',
    mode: 'dark',
  },
  full: {
    bg: ['#0C1428', '#121C38', '#182044'],
    accent: '#50B8F8',
    accentDim: 'rgba(80,184,248,0.55)',
    textPrimary: '#88CCF8',
    textMuted: 'rgba(136,204,248,0.58)',
    pillBg: '#121C38',
    pillBorder: 'rgba(80,184,248,0.62)',
    phaseCode: 'LUNA.PLENA',
    mode: 'dim',
  },
  'waning-gibbous': {
    bg: ['#0A1020', '#0D1326', '#10172E'],
    accent: '#2A8ADC',
    accentDim: 'rgba(42,138,220,0.46)',
    textPrimary: '#5AAAE4',
    textMuted: 'rgba(90,170,228,0.48)',
    pillBg: '#0D1326',
    pillBorder: 'rgba(42,138,220,0.54)',
    phaseCode: 'GIBBOUS-',
    mode: 'dark',
  },
  'last-quarter': {
    bg: ['#08101C', '#0B1322', '#0E1628'],
    accent: '#2070BC',
    accentDim: 'rgba(32,112,188,0.43)',
    textPrimary: '#4C90C8',
    textMuted: 'rgba(76,144,200,0.46)',
    pillBg: '#0B1322',
    pillBorder: 'rgba(32,112,188,0.50)',
    phaseCode: 'QUAD.ULTIMA',
    mode: 'dark',
  },
  'waning-crescent': {
    bg: ['#060810', '#080A14', '#0A0C18'],
    accent: '#165898',
    accentDim: 'rgba(22,88,152,0.38)',
    textPrimary: '#3A78A8',
    textMuted: 'rgba(58,120,168,0.43)',
    pillBg: '#080A14',
    pillBorder: 'rgba(22,88,152,0.45)',
    phaseCode: 'CRESCENT-',
    mode: 'dark',
  },
};

// ─── Palette interpolation ────────────────────────────────────────────────────

export function lerpSignalLunarPalette(
  a: SignalLunarPalette,
  b: SignalLunarPalette,
  t: number,
): SignalLunarPalette {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const c = lerpColor;
  return {
    bg: [c(a.bg[0], b.bg[0], t), c(a.bg[1], b.bg[1], t), c(a.bg[2], b.bg[2], t)],
    accent: c(a.accent, b.accent, t),
    accentDim: c(a.accentDim, b.accentDim, t),
    textPrimary: c(a.textPrimary, b.textPrimary, t),
    textMuted: c(a.textMuted, b.textMuted, t),
    pillBg: c(a.pillBg, b.pillBg, t),
    pillBorder: c(a.pillBorder, b.pillBorder, t),
    mode: t < 0.5 ? a.mode : b.mode,
    phaseCode: t < 0.5 ? a.phaseCode : b.phaseCode,
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

// ─── Reticle RAF (parabolic) ──────────────────────────────────────────────────

function useSignalLunaReticleRaf(groupRef: React.RefObject<SVGGElement>) {
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

// ─── Scanline CSS ─────────────────────────────────────────────────────────────

const SCANLINES_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
  pointerEvents: 'none',
};

// ─── PixelMoon ────────────────────────────────────────────────────────────────
// 5×5 grid of pixels arranged in a circle mask. Each pixel is filled/empty
// based on whether it falls in the illuminated portion of the moon.
// Waxing: right side lit. Waning: left side lit.

export function PixelMoon({
  phase,
  accent,
  accentDim,
  size = 20,
}: {
  phase: LunarPhase;
  accent: string;
  accentDim: string;
  size?: number;
}) {
  const px = Math.round(size / 5); // pixel size
  const gap = Math.max(1, Math.round(px * 0.15));
  const total = px * 5 + gap * 4;
  const off = (size - total) / 2;

  // 5×5 circle mask (which of the 25 cells are inside the circle)
  const CIRCLE_MASK = [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ];

  const isWaning =
    phase === 'waning-gibbous' || phase === 'last-quarter' || phase === 'waning-crescent';

  // For each cell in the circle, determine if it's in the lit portion
  const isLit = (col: number): boolean => {
    if (phase === 'new') return false;
    if (phase === 'full') return true;
    if (phase === 'first-quarter') return col >= 2; // right half (cols 2,3,4)
    if (phase === 'last-quarter') return col <= 2; // left half (cols 0,1,2)
    if (phase === 'waxing-crescent') return col >= 3; // thin right (cols 3,4)
    if (phase === 'waning-crescent') return col <= 1; // thin left (cols 0,1)
    if (phase === 'waxing-gibbous') return col >= 1; // wide right (cols 1-4)
    if (phase === 'waning-gibbous') return col <= 3; // wide left (cols 0-3)
    return false;
  };

  return (
    <svg role="presentation" width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      {CIRCLE_MASK.map((row, r) =>
        row.map((inCircle, c) => {
          if (!inCircle) return null;
          const x = off + c * (px + gap);
          const y = off + r * (px + gap);
          const lit = isLit(c);
          return (
            <rect
              // biome-ignore lint/suspicious/noArrayIndexKey: grid coordinates form a stable key
              key={`${r}-${c}`}
              x={x}
              y={y}
              width={px}
              height={px}
              fill={lit ? accent : 'none'}
              stroke={lit ? 'none' : accentDim}
              strokeWidth={0.6}
              opacity={lit ? 0.9 : 0.35}
            />
          );
        }),
      )}
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
function pillArrowStr() {
  return '>';
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

const MONO = "'JetBrains Mono','Fira Code','Cascadia Code','Menlo',monospace";
const SLIDE_EXPAND = { duration: 0.2, ease: 'easeOut' as const };
const SLIDE_CONTENT = { duration: 0.15, ease: 'easeOut' as const };

// ─── SignalLunarWidgetProps ───────────────────────────────────────────────────

export interface SignalLunarWidgetProps {
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

// ─── SignalLunarWidget ────────────────────────────────────────────────────────

export function SignalLunarWidget({
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
}: SignalLunarWidgetProps) {
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
      lerpSignalLunarPalette(
        SIGNAL_LUNAR_PALETTES[blend.phase],
        SIGNAL_LUNAR_PALETTES[blend.nextPhase],
        blend.t,
      ),
    [blend],
  );

  const origin = TRANSFORM_ORIGINS[expandDirection] ?? 'top right';
  const yNudge = getYNudge(expandDirection);

  const [storedExpanded, setStoredExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const raw = localStorage.getItem('signal-luna-widget-expanded');
      if (raw != null) return JSON.parse(raw);
    } catch {}
    return true;
  });

  const updateExpanded = useCallback((next: boolean) => {
    setStoredExpanded(next);
    try {
      localStorage.setItem('signal-luna-widget-expanded', JSON.stringify(next));
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

  // ── Reticle RAF ────────────────────────────────────────────────────────────
  const reticleGroupRef = useRef<SVGGElement>(null);
  const { setTarget } = useSignalLunaReticleRaf(reticleGroupRef);

  const orbOpacity = lunarPos.isVisible ? Math.max(0.06, lunarPos.illumination * 0.94 + 0.06) : 0;

  const progressTarget = Math.max(0.01, Math.min(0.99, lunarPos.moonProgress));

  useEffect(() => {
    // Update reticle accent color
    if (reticleGroupRef.current) {
      for (const el of reticleGroupRef.current.querySelectorAll<SVGElement>('circle, line')) {
        if (el.getAttribute('stroke') && el.getAttribute('stroke') !== 'none') {
          el.setAttribute('stroke', palette.accent);
        }
      }
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
  const nextStr = isNearFull
    ? `${fmtDays(lunarPos.daysUntilFull)} TO PLENA`
    : `${fmtDays(lunarPos.daysUntilNew)} TO NOVA`;

  const [hovered, setHovered] = useState(false);
  const pillMinWidth = showIllumination ? 148 : 110;

  return (
    <div
      data-luna-skin="signal"
      data-lunar-phase={lunarPos.phase}
      className={`relative ${className}`}
      style={{ isolation: 'isolate' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isExpanded ? (
          // ── EXPANDED ───────────────────────────────────────────────────────
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.86, y: yNudge * 0.5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.86, y: yNudge * 0.3 }}
            transition={SLIDE_EXPAND}
            style={{
              width: W * expandScale,
              height: H * expandScale,
              transformOrigin: origin,
              position: 'relative',
            }}
            className="select-none"
          >
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
              <div
                className="relative w-full h-full overflow-hidden"
                style={{
                  borderRadius: 6,
                  background: palette.bg[0],
                  border: `1.5px solid ${palette.accentDim}`,
                }}
              >
                {/* Scanlines */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ ...SCANLINES_STYLE, zIndex: 8, borderRadius: 6 }}
                />

                {/* Arc + reticle */}
                <svg
                  role="presentation"
                  aria-hidden
                  className="absolute inset-0"
                  style={{ zIndex: 3, overflow: 'hidden' }}
                  width={W}
                  height={H}
                  viewBox={`0 0 ${W} ${H}`}
                >
                  <path
                    d={arcPath}
                    fill="none"
                    stroke={palette.accentDim}
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeDasharray="6 10"
                    strokeOpacity="0.55"
                  />
                  <g
                    ref={reticleGroupRef}
                    style={{ opacity: orbOpacity, transition: 'opacity 1.2s ease-in-out' }}
                    transform={`translate(${initPos.x},${initPos.y})`}
                  >
                    <Reticle accent={palette.accent} size={13} />
                  </g>
                </svg>

                {/* z=5 Header */}
                <div className="absolute top-0 left-0 right-0 px-5 pt-4" style={{ zIndex: 5 }}>
                  <div className="flex justify-between items-start">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <motion.p
                        style={{
                          fontFamily: MONO,
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          lineHeight: 1,
                        }}
                        animate={{ color: palette.accent }}
                        transition={{ duration: 0.6 }}
                      >
                        {palette.phaseCode}
                      </motion.p>
                      {showIllumination && (
                        <motion.p
                          style={{
                            fontFamily: MONO,
                            fontSize: 9,
                            fontWeight: 400,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                          }}
                          animate={{ color: palette.textMuted }}
                          transition={{ duration: 0.6 }}
                        >
                          ILLUM: {illumPct}%
                        </motion.p>
                      )}
                      <motion.p
                        style={{
                          fontFamily: MONO,
                          fontSize: 9,
                          fontWeight: 400,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                        }}
                        animate={{ color: palette.textMuted }}
                        transition={{ duration: 0.6 }}
                      >
                        NEXT: {nextStr}
                      </motion.p>
                    </div>

                    {/* Pixel moon — top right */}
                    <motion.div
                      animate={{ opacity: 0.85 }}
                      style={{ transition: 'opacity 0.6s linear' }}
                    >
                      <PixelMoon
                        phase={lunarPos.phase}
                        accent={palette.accent}
                        accentDim={palette.accentDim}
                        size={22}
                      />
                    </motion.div>
                  </div>
                </div>

                {/* z=5 Bottom row — MR / divider / MS */}
                <div
                  className="absolute bottom-0 left-0 right-0 px-5 pb-[14px] flex items-center justify-between"
                  style={{
                    zIndex: 5,
                    opacity: showMoonrise ? 1 : 0,
                    transition: 'opacity 0.5s linear',
                  }}
                >
                  <motion.span
                    style={{
                      fontFamily: MONO,
                      fontSize: 9,
                      fontWeight: 400,
                      letterSpacing: '0.14em',
                    }}
                    animate={{ color: palette.textMuted }}
                    transition={{ duration: 0.6 }}
                  >
                    MR: {moonriseStr}
                  </motion.span>
                  <motion.span
                    style={{
                      display: 'block',
                      flex: 1,
                      height: 1,
                      margin: '0 12px',
                      opacity: 0.35,
                    }}
                    animate={{ background: palette.accentDim }}
                    transition={{ duration: 0.6 }}
                  />
                  <motion.span
                    style={{
                      fontFamily: MONO,
                      fontSize: 9,
                      fontWeight: 400,
                      letterSpacing: '0.14em',
                    }}
                    animate={{ color: palette.textMuted }}
                    transition={{ duration: 0.6 }}
                  >
                    MS: {moonsetStr}
                  </motion.span>
                </div>

                {/* z=9 Collapse */}
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
                        transition={SLIDE_CONTENT}
                        aria-label="Collapse signal luna widget"
                        style={{
                          position: 'absolute',
                          zIndex: 9,
                          top: 0,
                          ...(isRight ? { right: 0 } : { left: 0 }),
                          width: 34,
                          height: 34,
                          borderRadius: isRight ? '0 6px 0 4px' : '6px 0 4px 0',
                          background: 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
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
                            d="M1 1 L7 7 M7 1 L1 7"
                            stroke={palette.accent}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            opacity="0.70"
                          />
                        </svg>
                      </motion.button>
                    );
                  })()}
              </div>
            </div>
          </motion.div>
        ) : (
          // ── PILL ──────────────────────────────────────────────────────────
          <motion.button
            key="collapsed"
            onClick={() => setExpanded(true)}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={SLIDE_EXPAND}
            className="flex items-center gap-2 cursor-pointer select-none"
            style={{
              height: 34,
              minWidth: pillMinWidth,
              paddingLeft: 10,
              paddingRight: 14,
              borderRadius: 6,
              background: palette.pillBg,
              border: `1.5px solid ${hovered ? palette.accent : palette.pillBorder}`,
              boxShadow: hovered ? `0 0 12px 2px ${palette.accentDim}` : 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              transformOrigin: origin,
              scale: expandScale,
            }}
            aria-label={`Signal luna widget — ${palette.phaseCode}. Click to expand.`}
          >
            {/* Pixel moon */}
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
              <PixelMoon
                phase={lunarPos.phase}
                accent={palette.accent}
                accentDim={palette.accentDim}
                size={18}
              />
            </span>

            {/* Terminal separator */}
            <span
              style={{ fontFamily: MONO, fontSize: 10, color: palette.accentDim, opacity: 0.7 }}
            >
              {'//'}
            </span>

            {/* Phase code */}
            <span
              style={{
                fontFamily: MONO,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.10em',
                color: palette.textPrimary,
                whiteSpace: 'nowrap',
              }}
            >
              {palette.phaseCode}
            </span>

            {/* Illumination */}
            {showIllumination && (
              <>
                <span
                  style={{ fontFamily: MONO, fontSize: 10, color: palette.accentDim, opacity: 0.7 }}
                >
                  {'//'}
                </span>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: palette.textMuted,
                  }}
                >
                  {illumPct}%
                </span>
              </>
            )}

            {/* Expand indicator */}
            <span
              style={{
                fontFamily: MONO,
                fontSize: 10,
                color: palette.accentDim,
                opacity: 0.7,
                marginLeft: 2,
              }}
            >
              &gt;
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
