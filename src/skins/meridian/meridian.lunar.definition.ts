// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/meridian/meridian.lunar.definition.ts
// ════════════════════════════════════════════════════════════════════════════
/**
 * Meridian lunar skin definition.
 *
 * Registers MeridianLunarWidget and MeridianLunaCompact under the 'meridian'
 * DesignMode for the Luna package's skin registry.
 *
 * Character: clean, airy, astronomical. The moon plotted as a precise point
 * on a sparse coordinate graticule. Stroke-only phase icons. Hairline arc.
 * The most restrained of all Luna skins — no texture, no bloom, no atmosphere.
 */

import type { LunarPhase } from '../../hooks/useLunarPosition';
import type { LunaSkinDefinition, LunarPalette, LunarSkinPalettes } from '../types/luna-skin.types';
import { MeridianLunaCompact } from './meridian.lunar.compact';
import { MERIDIAN_LUNAR_PALETTES, MeridianLunarWidget } from './meridian.lunar.component';

// ─── Derive LunarSkinPalettes from MERIDIAN_LUNAR_PALETTES ───────────────────

const MERIDIAN_LUNAR_SKIN_PALETTES: LunarSkinPalettes = Object.fromEntries(
  (Object.keys(MERIDIAN_LUNAR_PALETTES) as LunarPhase[]).map((phase) => {
    const p = MERIDIAN_LUNAR_PALETTES[phase];
    return [
      phase,
      {
        bg: p.bg,
        accentColor: p.accentColor,
        outerGlow: p.shadow, // meridian has no outer glow — shadow is its equivalent
        textPrimary: p.textPrimary,
        textSecondary: p.textSecondary,
        mode: p.mode,
        label: p.label,
        orbFill: p.orbFill,
        border: p.arc,
      } satisfies LunarPalette,
    ];
  }),
) as LunarSkinPalettes;

// ─── Export ────────────────────────────────────────────────────────────────────

export const meridianLunarSkin: LunaSkinDefinition = {
  id: 'meridian',
  label: 'Meridian',
  description:
    'Astronomical precision. The moon as a plotted point on a sparse coordinate graticule.',
  lunarPalettes: MERIDIAN_LUNAR_SKIN_PALETTES,
  Component: MeridianLunarWidget,
  CompactComponent: MeridianLunaCompact,
};
