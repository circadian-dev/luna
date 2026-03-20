// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/mineral/mineral.lunar.definition.ts
// ════════════════════════════════════════════════════════════════════════════
/**
 * Mineral lunar skin definition.
 *
 * Registers MineralLunarWidget and MineralLunaCompact under the 'mineral'
 * DesignMode for the Luna package's skin registry.
 *
 * Character: Sol mineral uses nine warm gemstones (carnelian, citrine, garnet…).
 * Luna mineral uses eight cold stones: Tourmaline, Labradorite, Moonstone,
 * Aquamarine, Selenite, Chalcedony, Moonstone, Larvikite. The defining visual
 * is the TERMINATOR LINE — a sharp vertical geometric line through the faceted
 * hexagonal gem orb that divides the lit from unlit faces, tracking illumination.
 */

import type { LunarPhase } from '../../hooks/useLunarPosition';
import type { LunaSkinDefinition, LunarPalette, LunarSkinPalettes } from '../types/luna-skin.types';
import { MineralLunaCompact } from './mineral.lunar.compact';
import { MINERAL_LUNAR_PALETTES, MineralLunarWidget } from './mineral.lunar.component';

// ─── Derive LunarSkinPalettes from MINERAL_LUNAR_PALETTES ────────────────────

const MINERAL_LUNAR_SKIN_PALETTES: LunarSkinPalettes = Object.fromEntries(
  (Object.keys(MINERAL_LUNAR_PALETTES) as LunarPhase[]).map((phase) => {
    const p = MINERAL_LUNAR_PALETTES[phase];
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
        orbFill: p.facetFill,
        border: p.pillBorder,
      } satisfies LunarPalette,
    ];
  }),
) as LunarSkinPalettes;

// ─── Export ────────────────────────────────────────────────────────────────────

export const mineralLunarSkin: LunaSkinDefinition = {
  id: 'mineral',
  label: 'Mineral',
  description:
    'Eight cold gemstones. The terminator as a sharp geometric line through faceted crystal.',
  lunarPalettes: MINERAL_LUNAR_SKIN_PALETTES,
  Component: MineralLunarWidget,
  CompactComponent: MineralLunaCompact,
};
