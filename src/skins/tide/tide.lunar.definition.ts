// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/tide/tide.lunar.definition.ts
// ════════════════════════════════════════════════════════════════════════════
/**
 * Tide lunar skin definition.
 *
 * Registers TideLunarWidget and TideLunaCompact under the 'tide'
 * DesignMode for the Luna package's skin registry.
 *
 * Character: Sol tide is a coastal instrument — sine wave ocean, bioluminescent
 * at night, nautical tidal labels (SLACK, FLOOD, EBB…). Luna tide extends this
 * to the moon: the orb traverses an ELLIPTICAL ARC above a bioluminescent ocean,
 * and the WAVE AMPLITUDE scales with illumination following tidal physics:
 *   - New/full moon → spring tides (maximum waves, waveAmp: 0.90)
 *   - First/last quarter → neap tides (minimum waves, waveAmp: 0.15–0.38)
 *
 * Bioluminescence is always active (it is always night) but inversely bright:
 * at new moon, the bio is the only light source and glows strongest. At full
 * moon, the moon itself provides light and the bio is subdued.
 *
 * Nautical lunar labels:
 *   NEAP / FLOOD / SURGE / SPRING / SPRING TIDE / EBB / SLACK / DRIFT
 */

import type { LunarPhase } from '../../hooks/useLunarPosition';
import type { LunaSkinDefinition, LunarPalette, LunarSkinPalettes } from '../types/luna-skin.types';
import { TideLunaCompact } from './tide.lunar.compact';
import { TIDE_LUNAR_PALETTES, TideLunarWidget } from './tide.lunar.component';

// ─── Derive LunarSkinPalettes from TIDE_LUNAR_PALETTES ──────────────────────

const TIDE_LUNAR_SKIN_PALETTES: LunarSkinPalettes = Object.fromEntries(
  (Object.keys(TIDE_LUNAR_PALETTES) as LunarPhase[]).map((phase) => {
    const p = TIDE_LUNAR_PALETTES[phase];
    return [
      phase,
      {
        bg: p.bg,
        accentColor: p.accentColor,
        outerGlow: p.outerGlow,
        textPrimary: p.textPrimary,
        textSecondary: p.textSecondary,
        mode: p.mode,
        label: p.label,
        orbFill: p.orbFill,
        border: p.pillBorder,
      } satisfies LunarPalette,
    ];
  }),
) as LunarSkinPalettes;

// ─── Export ────────────────────────────────────────────────────────────────────

export const tideLunarSkin: LunaSkinDefinition = {
  id: 'tide',
  label: 'Tide',
  description:
    'Bioluminescent ocean. Wave amplitude follows tidal physics. SPRING TIDE. Elliptical arc above cold water.',
  lunarPalettes: TIDE_LUNAR_SKIN_PALETTES,
  Component: TideLunarWidget,
  CompactComponent: TideLunaCompact,
};
