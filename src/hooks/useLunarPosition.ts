// src/hooks/useLunarPosition.ts

import { useEffect, useRef, useState } from 'react';

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
  illumination: number; // 0–1 (0 = new, 1 = full)
  ageInDays: number; // 0–29.53
  daysUntilFull: number;
  daysUntilNew: number;
  moonriseMinutes: number | null; // minutes from midnight
  moonsetMinutes: number | null;
  moonProgress: number; // 0–1, position along nightly arc
  isVisible: boolean; // is the moon above the horizon right now
  isReady: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Reference new moon: January 6, 2000 18:14 UTC
const REFERENCE_NEW_MOON_MS = 947182440000;
const LUNAR_CYCLE_MS = 29.53058770576 * 24 * 60 * 60 * 1000;

// ─── Pure math helpers ────────────────────────────────────────────────────────

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

function getMoonriseMoonset(
  ageInDays: number,
  _date: Date,
): { moonrise: number | null; moonset: number | null } {
  // Simplified approximation:
  // New moon rises/sets with the sun (~6am rise, ~6pm set).
  // Full moon rises at sunset, sets at sunrise (~6pm rise, ~6am set).
  // Each day the moon rises ~50 minutes later than the previous day.
  const dayDelay = (ageInDays / 29.53) * 24 * 60; // minutes offset over full cycle
  const baseRise = 360; // 6:00 AM in minutes
  const moonriseMinutes = (baseRise + dayDelay) % (24 * 60);
  const moonsetMinutes = (moonriseMinutes + 720) % (24 * 60); // ~12 hours later
  return { moonrise: moonriseMinutes, moonset: moonsetMinutes };
}

function getMoonProgress(
  now: Date,
  moonriseMinutes: number,
  moonsetMinutes: number,
): { progress: number; isVisible: boolean } {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const rise = moonriseMinutes;
  const set = moonsetMinutes;

  // Handle wrap-around (e.g. rise=22:00, set=06:00)
  if (set < rise) {
    if (nowMinutes >= rise) {
      const duration = 24 * 60 - rise + set;
      const elapsed = nowMinutes - rise;
      return { progress: elapsed / duration, isVisible: true };
    }
    if (nowMinutes <= set) {
      const duration = 24 * 60 - rise + set;
      const elapsed = 24 * 60 - rise + nowMinutes;
      return { progress: elapsed / duration, isVisible: true };
    }
    return { progress: 0, isVisible: false };
  }

  if (nowMinutes < rise || nowMinutes > set) {
    return { progress: 0, isVisible: false };
  }

  return { progress: (nowMinutes - rise) / (set - rise), isVisible: true };
}

// ─── Pure computation (hoisted out of hook to avoid TDZ) ─────────────────────

function computeLunarPosition(date: Date): LunarPosition {
  const age = getLunarAge(date);
  const illumination = getIllumination(age);
  const phase = getPhase(age);
  const daysUntilFull = age < 14.77 ? 14.77 - age : 29.53 - age + 14.77;
  const daysUntilNew = age < 29.53 ? 29.53 - age : 29.53 - age + 29.53;

  const { moonrise, moonset } = getMoonriseMoonset(age, date);
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

interface UseLunarPositionOptions {
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  updateIntervalMs?: number;
  simulatedDate?: Date;
}

export function useLunarPosition({
  latitude: _latitude,
  longitude: _longitude,
  timezone: _timezone,
  updateIntervalMs = 60_000,
  simulatedDate,
}: UseLunarPositionOptions = {}): LunarPosition {
  // computeLunarPosition is a plain module-level function — no TDZ risk.
  const [position, setPosition] = useState<LunarPosition>(() =>
    computeLunarPosition(simulatedDate ?? new Date()),
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // latitude/longitude/timezone are accepted in the options interface so the
  // API is forward-compatible with real horizon math, but unused in the effect
  // until that work lands. Prefixed with _ to satisfy Biome's no-unused-vars.
  useEffect(() => {
    if (simulatedDate) {
      setPosition(computeLunarPosition(simulatedDate));
      return;
    }

    setPosition(computeLunarPosition(new Date()));
    intervalRef.current = setInterval(() => {
      setPosition(computeLunarPosition(new Date()));
    }, updateIntervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [updateIntervalMs, simulatedDate]);

  return position;
}
