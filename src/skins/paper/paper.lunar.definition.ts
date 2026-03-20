// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/paper/paper.lunar.definition.ts
// ════════════════════════════════════════════════════════════════════════════
/**
 * Paper lunar skin definition.
 *
 * Registers PaperLunarWidget and PaperLunaCompact under the 'paper'
 * DesignMode for the Luna package's skin registry.
 *
 * Character: Sol paper is warm ink on cream stock — sepia, amber, grain.
 * Luna paper inverts to cold: dark paper with silver ink. The grain texture,
 * serif italic typography, and ink wash/bloom orb are all preserved from
 * the Sol skin, but the temperature shifts from amber to silver-blue.
 * The phase label stays in italic Georgia ("Full Moon" not "full moon") —
 * editorial voice. The ink wash on the compact track represents "silver
 * light already shed on the paper."
 */

import type { LunarPhase } from '../../hooks/useLunarPosition';
import type { LunaSkinDefinition, LunarPalette, LunarSkinPalettes } from '../types/luna-skin.types';
import { PaperLunaCompact } from './paper.lunar.compact';
import { PAPER_LUNAR_PALETTES, PaperLunarWidget } from './paper.lunar.component';

// ─── Derive LunarSkinPalettes from PAPER_LUNAR_PALETTES ──────────────────────

const PAPER_LUNAR_SKIN_PALETTES: LunarSkinPalettes = Object.fromEntries(
  (Object.keys(PAPER_LUNAR_PALETTES) as LunarPhase[]).map((phase) => {
    const p = PAPER_LUNAR_PALETTES[phase];
    return [
      phase,
      {
        bg: p.bg,
        accentColor: p.accentColor,
        outerGlow: p.inkBloom, // ink bloom is the paper skin's equivalent of outerGlow
        textPrimary: p.textPrimary,
        textSecondary: p.textSecondary,
        mode: p.mode,
        label: p.label,
        orbFill: p.inkOrb,
        border: p.pillBorder,
      } satisfies LunarPalette,
    ];
  }),
) as LunarSkinPalettes;

// ─── Export ────────────────────────────────────────────────────────────────────

export const paperLunarSkin: LunaSkinDefinition = {
  id: 'paper',
  label: 'Paper',
  description:
    'Silver ink on dark paper. Warm grain, cold light. The moon as an editorial illustration.',
  lunarPalettes: PAPER_LUNAR_SKIN_PALETTES,
  Component: PaperLunarWidget,
  CompactComponent: PaperLunaCompact,
};
