/**
 * luna-skin.types.ts
 *
 * The shared contract every Luna skin must satisfy.
 * Mirrors widget-skin.types.ts from Sol — same shape, lunar signal.
 */

import type { DesignMode } from '@circadian/sol';
import type { LunarPhase } from '../../hooks/useLunarPosition';

// ─── Lunar palette (per phase, per skin) ─────────────────────────────────────

export interface LunarPalette {
  /** Three gradient stops for the widget background */
  bg: [string, string, string];
  /** Primary accent color for this phase */
  accentColor: string;
  /** Outer glow color (rgba string) — scales with illumination in components */
  outerGlow: string;
  /** Primary text color */
  textPrimary: string;
  /** Secondary / muted text color */
  textSecondary: string;
  /**
   * Luna never reaches 'light' mode.
   * The moon is never bright enough to trigger light-mode palettes.
   * This constraint keeps Luna feeling nocturnal.
   */
  mode: 'dark' | 'dim';
  /** Human-readable phase label shown in the widget */
  label: string;
  /** Orb fill color */
  orbFill: string;
  /** Border / pill border color */
  border: string;
}

/** All 8 lunar phases for one skin */
export type LunarSkinPalettes = Record<LunarPhase, LunarPalette>;

// ─── Luna skin definition ─────────────────────────────────────────────────────

export interface LunaSkinDefinition {
  /** Matches Sol's DesignMode — same skin name across both packages */
  id: DesignMode;
  /** Human-readable label */
  label: string;
  /** Short description */
  description: string;
  /** Per-phase palette entries for this skin */
  lunarPalettes: LunarSkinPalettes;
  /** Full expanded card + pill component */
  Component: React.ComponentType<LunaWidgetSkinProps>;
  /** Compact pill/bar component */
  CompactComponent: React.ComponentType<CompactLunaWidgetProps>;
}

// ─── Props every Luna skin widget component receives ─────────────────────────

export interface LunaWidgetSkinProps {
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

// ─── Props every Luna compact skin component receives ─────────────────────────

export interface CompactLunaWidgetProps {
  size?: 'sm' | 'md' | 'lg';
  showIllumination?: boolean;
  showMoonrise?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  simulatedDate?: Date;
  className?: string;
}
