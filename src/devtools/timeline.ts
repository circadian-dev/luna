/**
 * devtools/timeline.ts
 *
 * Helpers for LunaDevTools.
 *
 * LunaDevTools uses two independent controls instead of a single age slider:
 *   Phase picker  — selects which of the 8 phases to preview (monthly axis)
 *   Arc slider    — moves the orb along tonight's arc, 0=rising 1=setting (daily axis)
 *
 * simulatedDateForPhaseAndProgress() is the key function — it crafts a Date
 * that satisfies both axes simultaneously, so the widget sees the right phase
 * AND the right arc position without any wrap-around jumps.
 */

import {
  type LunarPhase,
  getMoonriseMoonset,
  utcOffsetFromTimezone,
} from '../hooks/useLunarPosition';

export const LUNAR_CYCLE_DAYS = 29.53058770576;

// Defaults mirror useLunarPosition defaults
const DEFAULT_LAT = 51.5074;
const DEFAULT_LON = -0.1278;
const DEFAULT_TZ = 'Europe/London';

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

// Phase start positions in days — used for reference / tick marks
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

/**
 * Midpoint age for each phase in days.
 * DevTools parks here when a phase is selected — the moon is deep in the
 * phase, not near a boundary, so illumination reads cleanly.
 */
export const PHASE_MIDPOINTS: Record<LunarPhase, number> = {
  new: 0.5,
  'waxing-crescent': 4.0,
  'first-quarter': 8.3,
  'waxing-gibbous': 12.0,
  full: 15.7,
  'waning-gibbous': 19.4,
  'last-quarter': 23.1,
  'waning-crescent': 26.0,
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

// Reference new moon: January 6, 2000 18:14 UTC
const REFERENCE_NEW_MOON_MS = 947182440000;

/**
 * Build a simulated Date that places the moon at the midpoint of `phase`
 * with the orb at `progress` along tonight's arc.
 *
 *   progress 0.0 → rising  (left of arc)
 *   progress 0.5 → zenith  (top of arc)
 *   progress 1.0 → setting (right of arc)
 *
 * This decouples the two cycles explicitly so DevTools can control them
 * independently without triggering the snap logic in the orb RAF hooks:
 *   - Phase (monthly axis) → PHASE_MIDPOINTS[phase]
 *   - Arc position (daily axis) → time-of-day offset from real moonrise
 *
 * Key invariant: the returned Date always has the moon above the horizon,
 * so getMoonProgress() returns { progress: P, isVisible: true }.
 */
export function simulatedDateForPhaseAndProgress(phase: LunarPhase, progress: number): Date {
  const midAge = PHASE_MIDPOINTS[phase];
  const d = new Date(REFERENCE_NEW_MOON_MS + midAge * 24 * 60 * 60 * 1000);

  // Compute actual moonrise/moonset using the same algorithm as useLunarPosition
  const utcOff = utcOffsetFromTimezone(DEFAULT_TZ, d);
  const { moonrise, moonset } = getMoonriseMoonset(d, DEFAULT_LAT, DEFAULT_LON, utcOff);

  let targetMinutes: number;

  if (moonrise !== null && moonset !== null) {
    // Compute real visibility duration, handling overnight wrap (set < rise)
    const duration = moonset < moonrise ? 1440 - moonrise + moonset : moonset - moonrise;
    targetMinutes = (moonrise + progress * duration) % 1440;
  } else {
    // Fallback for circumpolar edge cases — rough estimate
    const dayDelay = (midAge / 29.53) * 24 * 60;
    const moonriseEst = (360 + dayDelay) % 1440;
    targetMinutes = (moonriseEst + progress * 720) % 1440;
  }

  // setHours (local) — matches getMoonProgress which reads date.getHours()
  d.setHours(Math.floor(targetMinutes / 60), Math.round(targetMinutes % 60), 0, 0);
  return d;
}
