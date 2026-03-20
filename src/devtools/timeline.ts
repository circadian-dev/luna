/**
 * devtools/timeline.ts
 *
 * Timeline helpers for LunaDevTools.
 * Scrubs 0–29.53 days (one lunar cycle) instead of 0–1439 minutes (one day).
 */

import type { LunarPhase } from '../hooks/useLunarPosition';
import type { LunarSkinPalettes } from '../skins/types/luna-skin.types';

export const LUNAR_CYCLE_DAYS = 29.53058770576;

export const PHASES: LunarPhase[] = [
  'new',
  'waxing-crescent',
  'first-quarter',
  'waxing-gibbous',
  'full',
  'waning-gibbous',
  'last-quarter',
  'waning-crescent',
];

// Phase start positions in days — used for tick marks on the scrubber
export const PHASE_STARTS: Record<LunarPhase, number> = {
  new: 0,
  'waxing-crescent': 1.85,
  'first-quarter': 7.38,
  'waxing-gibbous': 9.22,
  full: 14.77,
  'waning-gibbous': 16.61,
  'last-quarter': 22.15,
  'waning-crescent': 23.99,
};

export function phaseForAge(ageInDays: number): LunarPhase {
  const d = ageInDays;
  if (d < 1.85 || d >= 27.68) return 'new';
  if (d < 7.38) return 'waxing-crescent';
  if (d < 9.22) return 'first-quarter';
  if (d < 14.77) return 'waxing-gibbous';
  if (d < 16.61) return 'full';
  if (d < 22.15) return 'waning-gibbous';
  if (d < 23.99) return 'last-quarter';
  return 'waning-crescent';
}

export function formatAge(days: number): string {
  const d = Math.floor(days);
  const h = Math.round((days - d) * 24);
  return h > 0 ? `Day ${d}+${h}h` : `Day ${d}`;
}

/**
 * Builds the gradient for the scrubber track.
 * Goes black → dark → silver-blue (full) → dark → black.
 * Driven by the active skin's lunar palettes.
 */
export function buildLunaSliderGradient(palettes: LunarSkinPalettes): string {
  return `linear-gradient(90deg, ${[
    palettes.new.bg[1],
    palettes['waxing-crescent'].bg[1],
    palettes['first-quarter'].bg[1],
    palettes['waxing-gibbous'].bg[1],
    palettes.full.bg[1],
    palettes.full.bg[1], // peak — hold full moon color briefly
    palettes['waning-gibbous'].bg[1],
    palettes['last-quarter'].bg[1],
    palettes['waning-crescent'].bg[1],
    palettes.new.bg[1],
  ].join(', ')})`;
}
