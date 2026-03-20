// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/foundry/foundry.lunar.definition.ts
// ════════════════════════════════════════════════════════════════════════════
/**
 * Foundry lunar skin definition.
 *
 * Registers FoundryLunarWidget and FoundryLunaCompact under the 'foundry'
 * DesignMode for the Luna package's skin registry.
 *
 * Character: Sol foundry is warm industrial (amber, copper, machined metal).
 * Luna foundry inverts to cold steel-blue with a "molten silver" orb that
 * brightens with illumination. The machined aesthetic (heavy border, channel
 * track, glass sheen, tick marks) is preserved but cold.
 */

import type { LunarPhase } from '../../hooks/useLunarPosition';
import type { LunaSkinDefinition, LunarPalette, LunarSkinPalettes } from '../types/luna-skin.types';
import { FoundryLunaCompact } from './foundry.lunar.compact';
import { FOUNDRY_LUNAR_PALETTES, FoundryLunarWidget } from './foundry.lunar.component';

// ─── Derive LunarSkinPalettes from FOUNDRY_LUNAR_PALETTES ────────────────────

const FOUNDRY_LUNAR_SKIN_PALETTES: LunarSkinPalettes = Object.fromEntries(
  (Object.keys(FOUNDRY_LUNAR_PALETTES) as LunarPhase[]).map((phase) => {
    const p = FOUNDRY_LUNAR_PALETTES[phase];
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

export const foundryLunarSkin: LunaSkinDefinition = {
  id: 'foundry',
  label: 'Foundry',
  description:
    'Cold steel inverts the warm industrial. Machined precision meets molten silver moonlight.',
  lunarPalettes: FOUNDRY_LUNAR_SKIN_PALETTES,
  Component: FoundryLunarWidget,
  CompactComponent: FoundryLunaCompact,
};
