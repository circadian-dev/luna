/**
 * hooks/useLunarPosition.ts
 *
 * Computes real lunar position (phase, illumination, moonrise, moonset,
 * arc progress) from geographic coordinates + current time.
 * No external dependencies required.
 *
 * Structure mirrors useSolarPosition.ts exactly so the two hooks are
 * composable — a consumer can run both side-by-side and get consistent
 * isReady, simulatedDate, and coordinate-handling behaviour.
 *
 * Moonrise/moonset algorithm:
 *   Moon ecliptic position — Meeus "Astronomical Algorithms" simplified
 *   series (accurate to ~1–2°, plenty for rise/set times to ±5 min).
 *   Rise/set derived from lunar transit + hour angle, same approach as
 *   Sol's NOAA solar equations.
 */

'use client';

import { useEffect, useLayoutEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LunarPhase =
  | 'new'
  | 'waxing-crescent'
  | 'first-quarter'
  | 'waxing-gibbous'
  | 'full'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'waning-crescent';

export interface LunarPosition {
  phase: LunarPhase;
  illumination: number; // 0–1 (0 = new moon, 1 = full moon)
  ageInDays: number; // 0–29.53
  daysUntilFull: number;
  daysUntilNew: number;
  moonriseMinutes: number | null; // minutes from local midnight
  moonsetMinutes: number | null;
  moonProgress: number; // 0–1, position along nightly arc
  isVisible: boolean; // is the moon above the horizon right now
  isReady: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Reference new moon: January 6, 2000 18:14 UTC
const REFERENCE_NEW_MOON_MS = 947182440000;
const LUNAR_CYCLE_MS = 29.53058770576 * 24 * 60 * 60 * 1000;

// J2000.0 epoch: January 1.5, 2000 = Jan 1 2000 12:00 UTC
const J2000_MS = 946728000000;

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

// Defaults mirror Sol's DEFAULT_LAT/LON/TZ
const DEFAULT_LAT = 51.5074;
const DEFAULT_LON = -0.1278;
const DEFAULT_TZ = 'Europe/London';

// ─── Lunar age + phase ────────────────────────────────────────────────────────

function getLunarAge(date: Date): number {
  const elapsed = date.getTime() - REFERENCE_NEW_MOON_MS;
  const cyclePos = ((elapsed % LUNAR_CYCLE_MS) + LUNAR_CYCLE_MS) % LUNAR_CYCLE_MS;
  return (cyclePos / LUNAR_CYCLE_MS) * 29.53058770576;
}

function getIllumination(ageInDays: number): number {
  const angle = (2 * Math.PI * ageInDays) / 29.53058770576;
  return (1 - Math.cos(angle)) / 2;
}

function getPhase(ageInDays: number): LunarPhase {
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

// ─── Moon equatorial coordinates ─────────────────────────────────────────────
// Simplified Meeus series — accurate to ~1–2° in longitude, sufficient for
// rise/set times to within ~5 minutes. Mirrors the accuracy level Sol uses
// for solar position (NOAA simplified equations).

function getMoonEquatorialCoords(date: Date): { ra: number; dec: number } {
  const d = (date.getTime() - J2000_MS) / 86400000;

  // Mean elements (degrees)
  const L = (((218.316 + 13.176396 * d) % 360) + 360) % 360; // mean longitude
  const M = (((134.963 + 13.064993 * d) % 360) + 360) % 360; // mean anomaly
  const F = (((93.272 + 13.22935 * d) % 360) + 360) % 360; // argument of latitude
  const D = (((297.85 + 12.190749 * d) % 360) + 360) % 360; // mean elongation
  const Ms = (((357.529 + 0.9856 * d) % 360) + 360) % 360; // solar mean anomaly

  const MR = M * RAD;
  const FR = F * RAD;
  const DR = D * RAD;
  const MsR = Ms * RAD;

  // Ecliptic longitude (degrees) — six largest terms
  const lonCorr =
    6.289 * Math.sin(MR) +
    1.274 * Math.sin(2 * DR - MR) +
    0.658 * Math.sin(2 * DR) +
    0.214 * Math.sin(2 * MR) -
    0.186 * Math.sin(MsR) -
    0.114 * Math.sin(2 * FR);

  const lon = L + lonCorr;
  const lat = 5.128 * Math.sin(FR);

  // Ecliptic → equatorial (obliquity ≈ 23.4393°)
  const epsR = 23.4393 * RAD;
  const lonR = lon * RAD;
  const latR = lat * RAD;

  const ra =
    Math.atan2(Math.sin(lonR) * Math.cos(epsR) - Math.tan(latR) * Math.sin(epsR), Math.cos(lonR)) *
    DEG;
  const dec =
    Math.asin(Math.sin(latR) * Math.cos(epsR) + Math.cos(latR) * Math.sin(epsR) * Math.sin(lonR)) *
    DEG;

  return { ra: ((ra % 360) + 360) % 360, dec };
}

// ─── Greenwich Mean Sidereal Time ─────────────────────────────────────────────

function gmstDeg(date: Date): number {
  const d = (date.getTime() - J2000_MS) / 86400000;
  return (((280.46061837 + 360.98564736629 * d) % 360) + 360) % 360;
}

// ─── UTC offset from IANA timezone ───────────────────────────────────────────
// Mirrors Sol's utcOffsetFromTimezone exactly.

export function utcOffsetFromTimezone(tz: string, at?: Date): number {
  try {
    const now = at ?? new Date();
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    const match = offsetPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!match) return 0;
    const sign = match[1] === '+' ? 1 : -1;
    const hours = Number.parseInt(match[2] ?? '0', 10);
    const minutes = Number.parseInt(match[3] ?? '0', 10);
    return sign * (hours * 60 + minutes);
  } catch {
    return 0;
  }
}

// ─── Moonrise / moonset ───────────────────────────────────────────────────────
// Same approach as Sol's riseSetMinutes — derive transit time from RA vs LST,
// then apply hour-angle formula for the altitude threshold.
// Moon's effective rise/set altitude: ~0.125° (mean parallax 0.95° minus
// refraction 0.583° minus angular radius 0.267° ≈ 0.1°, rounded to 0.125°).

export function getMoonriseMoonset(
  date: Date,
  latDeg: number,
  lonDeg: number,
  utcOffsetMinutes: number,
): { moonrise: number | null; moonset: number | null } {
  // Compute moon RA/Dec at local noon (best single-point approximation for the day)
  const localNoon = new Date(date);
  localNoon.setHours(12, 0, 0, 0);
  const { ra, dec } = getMoonEquatorialCoords(localNoon);

  const latR = latDeg * RAD;
  const decR = dec * RAD;

  // LST at local midnight
  const localMidnight = new Date(date);
  localMidnight.setHours(0, 0, 0, 0);
  const utcMidnight = new Date(localMidnight.getTime() - utcOffsetMinutes * 60_000);
  const lst0 = (gmstDeg(utcMidnight) + lonDeg + 360) % 360;

  // Sidereal rate: degrees per minute of solar time
  const lstRate = 360.985 / 1440;

  // Transit: when LST equals moon's RA
  let transitMinutes = ((ra - lst0 + 360) % 360) / lstRate;
  if (transitMinutes > 1440) transitMinutes -= 1440;

  // Hour angle at rise/set
  const altRise = 0.125 * RAD;
  const cosHA =
    (Math.sin(altRise) - Math.sin(latR) * Math.sin(decR)) / (Math.cos(latR) * Math.cos(decR));

  // Circumpolar or never rises (e.g. polar regions)
  if (cosHA < -1 || cosHA > 1) {
    return { moonrise: null, moonset: null };
  }

  const ha = Math.acos(cosHA) * DEG;
  const haMinutes = ha / lstRate;

  const moonrise = (((transitMinutes - haMinutes) % 1440) + 1440) % 1440;
  const moonset = (((transitMinutes + haMinutes) % 1440) + 1440) % 1440;

  return { moonrise, moonset };
}

// ─── Arc progress ─────────────────────────────────────────────────────────────

function getMoonProgress(
  date: Date,
  moonriseMinutes: number,
  moonsetMinutes: number,
): { progress: number; isVisible: boolean } {
  const nowMinutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  const rise = moonriseMinutes;
  const set = moonsetMinutes;

  // Overnight arc: moon rises in evening, sets in morning (set < rise)
  if (set < rise) {
    if (nowMinutes >= rise) {
      const duration = 1440 - rise + set;
      return { progress: (nowMinutes - rise) / duration, isVisible: true };
    }
    if (nowMinutes <= set) {
      const duration = 1440 - rise + set;
      return { progress: (1440 - rise + nowMinutes) / duration, isVisible: true };
    }
    return { progress: 0, isVisible: false };
  }

  // Daytime arc: moon rises and sets during the day
  if (nowMinutes < rise || nowMinutes > set) {
    return { progress: 0, isVisible: false };
  }

  return { progress: (nowMinutes - rise) / (set - rise), isVisible: true };
}

// ─── Core computation ─────────────────────────────────────────────────────────

function computeLunarPosition(
  date: Date,
  latDeg: number,
  lonDeg: number,
  utcOffsetMinutes: number,
): LunarPosition {
  const age = getLunarAge(date);
  const illumination = getIllumination(age);
  const phase = getPhase(age);

  const daysUntilFull = age < 14.77 ? 14.77 - age : 29.53 - age + 14.77;
  const daysUntilNew = 29.53 - age;

  const { moonrise, moonset } = getMoonriseMoonset(date, latDeg, lonDeg, utcOffsetMinutes);

  const { progress, isVisible } =
    moonrise !== null && moonset !== null
      ? getMoonProgress(date, moonrise, moonset)
      : { progress: 0, isVisible: false };

  return {
    phase,
    illumination,
    ageInDays: age,
    daysUntilFull: Math.max(0, daysUntilFull),
    daysUntilNew: Math.max(0, daysUntilNew),
    moonriseMinutes: moonrise,
    moonsetMinutes: moonset,
    moonProgress: progress,
    isVisible,
    isReady: true,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseLunarPositionOptions {
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  updateIntervalMs?: number;
  simulatedDate?: Date;
}

// SSR-safe initial state — mirrors Sol's pattern exactly.
// useLayoutEffect overwrites this before first paint so users never see it.
const INITIAL_POSITION: LunarPosition = {
  phase: 'new',
  illumination: 0,
  ageInDays: 0,
  daysUntilFull: 14.77,
  daysUntilNew: 29.53,
  moonriseMinutes: null,
  moonsetMinutes: null,
  moonProgress: 0.5,
  isVisible: false,
  isReady: false,
};

export function useLunarPosition({
  latitude,
  longitude,
  timezone,
  updateIntervalMs = 60_000,
  simulatedDate,
}: UseLunarPositionOptions = {}): LunarPosition {
  const lat = latitude ?? DEFAULT_LAT;
  const lon = longitude ?? DEFAULT_LON;
  const tz = timezone ?? DEFAULT_TZ;

  const [position, setPosition] = useState<LunarPosition>(INITIAL_POSITION);

  // ── Compute real position before first paint ────────────────────────────
  // Mirrors Sol's useLayoutEffect pattern — fires after DOM mutations but
  // before the browser paints so the widget never flashes the wrong phase.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only — interval effect handles updates
  useLayoutEffect(() => {
    const date = simulatedDate ?? new Date();
    const utcOff = utcOffsetFromTimezone(tz, date);
    setPosition(computeLunarPosition(date, lat, lon, utcOff));
  }, []);

  // ── Interval effect ─────────────────────────────────────────────────────
  // lat, lon, tz in deps so position recomputes immediately when coordinates
  // change — mirrors Sol's interval dependency array exactly.
  useEffect(() => {
    const update = (d: Date) => {
      const utcOff = utcOffsetFromTimezone(tz, d);
      setPosition(computeLunarPosition(d, lat, lon, utcOff));
    };

    if (simulatedDate) {
      update(simulatedDate);
      return;
    }

    update(new Date());
    const id = setInterval(() => update(new Date()), updateIntervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, tz, updateIntervalMs, simulatedDate]);

  return position;
}
