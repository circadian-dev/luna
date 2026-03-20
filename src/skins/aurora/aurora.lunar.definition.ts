// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/aurora/aurora.lunar.definition.ts
// ════════════════════════════════════════════════════════════════════════════
/**
 * Aurora lunar skin definition.
 *
 * Registers AuroraLunarWidget and AuroraLunaCompact under the 'aurora'
 * DesignMode for the Luna package's skin registry.
 *
 * Band character by phase:
 *   new         → bands invisible, near-black sky
 *   crescent    → first cold indigo wisps appear
 *   quarter     → blue-grey bands building
 *   gibbous     → silver-blue bands bright and animated
 *   full        → maximum silver-white bands, mode: 'dim'
 *   waning ←    mirrors waxing but each phase is slightly dimmer
 */

import type { LunarPhase } from '../../hooks/useLunarPosition';
import type { LunaSkinDefinition, LunarPalette, LunarSkinPalettes } from '../types/luna-skin.types';
import { AuroraLunaCompact } from './aurora.lunar.compact';
import { AURORA_LUNAR_PALETTES, AuroraLunarWidget } from './aurora.lunar.component';

// ─── Derive LunarSkinPalettes from AURORA_LUNAR_PALETTES ─────────────────────

const AURORA_LUNAR_SKIN_PALETTES: LunarSkinPalettes = Object.fromEntries(
  (Object.keys(AURORA_LUNAR_PALETTES) as LunarPhase[]).map((phase) => {
    const p = AURORA_LUNAR_PALETTES[phase];
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
        border: p.border,
      } satisfies LunarPalette,
    ];
  }),
) as LunarSkinPalettes;

// ─── Export ────────────────────────────────────────────────────────────────────

export const auroraLunarSkin: LunaSkinDefinition = {
  id: 'aurora',
  label: 'Aurora',
  description:
    'Northern lights translated to moonlight. Bands bloom silver-blue at full moon and vanish at new.',
  lunarPalettes: AURORA_LUNAR_SKIN_PALETTES,
  Component: AuroraLunarWidget,
  CompactComponent: AuroraLunaCompact,
};
