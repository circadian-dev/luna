// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/sundial/sundial.lunar.definition.ts
// ════════════════════════════════════════════════════════════════════════════
/**
 * Sundial lunar skin definition.
 *
 * Registers SundialLunarWidget and SundialLunaCompact under the 'sundial'
 * DesignMode for the Luna package's skin registry.
 *
 * Character: Sol sundial is warm stone/marble — amber, travertine, gnomon
 * shadow, Latin solar labels (MANE, MERIDIES, NOX…). Luna sundial translates
 * to cold moonstone — slate-blue, silver, always dark, and the gnomon shadow
 * SCALES WITH ILLUMINATION. At new moon the stone is dark and the shadow is
 * near-invisible (the moon casts no light to project a shadow). At full moon
 * the shadow reaches full presence — the classical sundial instrument reading
 * the moon's own "light cast on stone."
 *
 * Latin lunar labels: LUNA NOVA, LUNA CRESCENS, QUADRATURA PRIMA, LUNA GIBBOSA,
 *                     LUNA PLENA, LUNA DECRESCENS, QUADRATURA ULTIMA.
 * Latin sublabels: nullo lumine, crescit lux, dimidia pars lucis, plena luce lucet…
 */

import type { LunarPhase } from '../../hooks/useLunarPosition';
import type { LunaSkinDefinition, LunarPalette, LunarSkinPalettes } from '../types/luna-skin.types';
import { SundialLunaCompact } from './sundial.lunar.compact';
import { SUNDIAL_LUNAR_PALETTES, SundialLunarWidget } from './sundial.lunar.component';

// ─── Derive LunarSkinPalettes from SUNDIAL_LUNAR_PALETTES ────────────────────

const SUNDIAL_LUNAR_SKIN_PALETTES: LunarSkinPalettes = Object.fromEntries(
  (Object.keys(SUNDIAL_LUNAR_PALETTES) as LunarPhase[]).map((phase) => {
    const p = SUNDIAL_LUNAR_PALETTES[phase];
    return [
      phase,
      {
        bg: p.bg,
        accentColor: p.orbFill,
        outerGlow: p.outerGlow,
        textPrimary: p.textPrimary,
        textSecondary: p.textSecondary,
        mode: p.mode,
        label: p.labelLatin, // Latin labels in registry
        orbFill: p.orbFill,
        border: p.pillBorder,
      } satisfies LunarPalette,
    ];
  }),
) as LunarSkinPalettes;

// ─── Export ────────────────────────────────────────────────────────────────────

export const sundialLunarSkin: LunaSkinDefinition = {
  id: 'sundial',
  label: 'Sundial',
  description:
    'Cold moonstone. Gnomon shadow scales with illumination. LUNA PLENA. Roman arc. Latin.',
  lunarPalettes: SUNDIAL_LUNAR_SKIN_PALETTES,
  Component: SundialLunarWidget,
  CompactComponent: SundialLunaCompact,
};
