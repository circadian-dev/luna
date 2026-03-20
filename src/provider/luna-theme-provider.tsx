'use client';

/**
 * provider/luna-theme-provider.tsx
 *
 * The Luna equivalent of Sol's SolarThemeProvider.
 * Provides lunar position data and skin selection to all child components.
 *
 * Reads design from localStorage so the skin persists across page loads,
 * matching Sol's behaviour exactly.
 */

import type { DesignMode } from '@circadian/sol';
import { type ReactNode, createContext, useCallback, useContext, useState } from 'react';
import { type LunarPhase, type LunarPosition, useLunarPosition } from '../hooks/useLunarPosition';
import { LUNA_SKINS } from '../skins/index';
import type { LunaSkinDefinition } from '../skins/types/luna-skin.types';

// ─── Context shape ────────────────────────────────────────────────────────────

export interface LunaThemeContext {
  // ── Lunar signal ───────────────────────────────────────────────────────────
  phase: LunarPhase;
  illumination: number; // 0–1
  ageInDays: number; // 0–29.53
  daysUntilFull: number;
  daysUntilNew: number;
  moonriseMinutes: number | null;
  moonsetMinutes: number | null;
  moonProgress: number; // 0–1 arc position
  isVisible: boolean;
  isReady: boolean;

  // ── Location ───────────────────────────────────────────────────────────────
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;

  // ── Skin ───────────────────────────────────────────────────────────────────
  design: DesignMode;
  activeSkin: LunaSkinDefinition;
  accentColor: string;

  // ── Devtools ───────────────────────────────────────────────────────────────
  simulatedDate?: Date;
  setSimulatedDate: (d: Date | undefined) => void;
  overridePhase: LunarPhase | null;
  setOverridePhase: (p: LunarPhase | null) => void;

  // ── Actions ────────────────────────────────────────────────────────────────
  setDesign: (skin: DesignMode) => void;
}

const LunaContext = createContext<LunaThemeContext | null>(null);

const DESIGN_KEY = 'luna-widget-design';

// ─── Provider ─────────────────────────────────────────────────────────────────

interface LunaThemeProviderProps {
  children: ReactNode;
  initialDesign?: DesignMode;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
}

export function LunaThemeProvider({
  children,
  initialDesign = 'void',
  latitude,
  longitude,
  timezone,
}: LunaThemeProviderProps) {
  // ── Skin selection ─────────────────────────────────────────────────────────
  const [design, setDesignState] = useState<DesignMode>(() => {
    if (typeof window === 'undefined') return initialDesign;
    try {
      const stored = localStorage.getItem(DESIGN_KEY);
      if (stored && stored in LUNA_SKINS) return stored as DesignMode;
    } catch {}
    return initialDesign;
  });

  const setDesign = useCallback((skin: DesignMode) => {
    setDesignState(skin);
    try {
      localStorage.setItem(DESIGN_KEY, skin);
    } catch {}
  }, []);

  // ── Devtools state ─────────────────────────────────────────────────────────
  const [simulatedDate, setSimulatedDate] = useState<Date | undefined>(undefined);
  const [overridePhase, setOverridePhase] = useState<LunarPhase | null>(null);

  // ── Lunar position ─────────────────────────────────────────────────────────
  const lunarPos = useLunarPosition({
    latitude,
    longitude,
    timezone,
    updateIntervalMs: 60_000,
    simulatedDate,
  });

  const activePhase = overridePhase ?? lunarPos.phase;
  const activeSkin = LUNA_SKINS[design];
  const palette = activeSkin.lunarPalettes[activePhase];

  const value: LunaThemeContext = {
    // Lunar signal
    phase: activePhase,
    illumination: lunarPos.illumination,
    ageInDays: lunarPos.ageInDays,
    daysUntilFull: lunarPos.daysUntilFull,
    daysUntilNew: lunarPos.daysUntilNew,
    moonriseMinutes: lunarPos.moonriseMinutes,
    moonsetMinutes: lunarPos.moonsetMinutes,
    moonProgress: lunarPos.moonProgress,
    isVisible: lunarPos.isVisible,
    isReady: lunarPos.isReady,

    // Location
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    timezone: timezone ?? null,

    // Skin
    design,
    activeSkin,
    accentColor: palette.accentColor,

    // Devtools
    simulatedDate,
    setSimulatedDate: useCallback((d) => setSimulatedDate(d), []),
    overridePhase,
    setOverridePhase: useCallback((p) => setOverridePhase(p), []),

    // Actions
    setDesign,
  };

  return <LunaContext.Provider value={value}>{children}</LunaContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLunaTheme(): LunaThemeContext {
  const ctx = useContext(LunaContext);
  if (!ctx) throw new Error('useLunaTheme must be used inside <LunaThemeProvider>');
  return ctx;
}
