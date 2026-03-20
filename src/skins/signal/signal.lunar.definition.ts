// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/signal/signal.lunar.definition.ts
// ════════════════════════════════════════════════════════════════════════════
/**
 * Signal lunar skin definition.
 *
 * Registers SignalLunarWidget and SignalLunaCompact under the 'signal'
 * DesignMode for the Luna package's skin registry.
 *
 * Character: Sol signal is brutalist terminal — dark, monochrome, single
 * accent hue, monospace, codes not icons. Luna signal keeps all of this but
 * runs cold: 8 lunar phases, 8 cold accent hues (none warm), and the
 * defining visual is the PIXELATED MOON — a 5×5 grid of tiny square pixels
 * arranged in a circle, filled/empty based on the phase. Block segment
 * track fills = illumination percentage not solar progress.
 *
 * Phase codes: LUNA.NOVA / CRESCENT+ / QUAD.PRIMA / GIBBOUS+ / LUNA.PLENA /
 *              GIBBOUS- / QUAD.ULTIMA / CRESCENT-
 * Data fields: ILLUM:XX%, NEXT:XXD TO PLENA/NOVA, MR:, MS:
 */

import type { LunarPhase } from '../../hooks/useLunarPosition';
import type { LunaSkinDefinition, LunarPalette, LunarSkinPalettes } from '../types/luna-skin.types';
import { SignalLunaCompact } from './signal.lunar.compact';
import { SIGNAL_LUNAR_PALETTES, SignalLunarWidget } from './signal.lunar.component';

// ─── Derive LunarSkinPalettes from SIGNAL_LUNAR_PALETTES ────────────────────

const SIGNAL_LUNAR_SKIN_PALETTES: LunarSkinPalettes = Object.fromEntries(
  (Object.keys(SIGNAL_LUNAR_PALETTES) as LunarPhase[]).map((phase) => {
    const p = SIGNAL_LUNAR_PALETTES[phase];
    return [
      phase,
      {
        bg: p.bg,
        accentColor: p.accent,
        outerGlow: p.accentDim,
        textPrimary: p.textPrimary,
        textSecondary: p.textMuted,
        mode: p.mode,
        label: p.phaseCode, // terminal codes as labels
        orbFill: p.accent,
        border: p.pillBorder,
      } satisfies LunarPalette,
    ];
  }),
) as LunarSkinPalettes;

// ─── Export ────────────────────────────────────────────────────────────────────

export const signalLunarSkin: LunaSkinDefinition = {
  id: 'signal',
  label: 'Signal',
  description: 'Brutalist terminal moon. Pixelated phase display. Cold accent. LUNA.PLENA.',
  lunarPalettes: SIGNAL_LUNAR_SKIN_PALETTES,
  Component: SignalLunarWidget,
  CompactComponent: SignalLunaCompact,
};
