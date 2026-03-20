// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/void/void.lunar.definition.ts
// ════════════════════════════════════════════════════════════════════════════
/**
 * Void lunar skin definition.
 *
 * Registers VoidLunarWidget and VoidLunaCompact under the 'void' DesignMode
 * for the Luna package's skin registry.
 *
 * Palette structure mirrors how void.definition.ts derives WidgetPalette
 * entries from VOID_WIDGET_PALETTES — same shape, lunar phase keys instead.
 */

import type { LunarPhase } from '../../hooks/useLunarPosition';
import type { LunaSkinDefinition, LunarPalette, LunarSkinPalettes } from '../types/luna-skin.types';
import { VoidLunaCompact } from './void.lunar.compact';
import { VOID_LUNAR_PALETTES, VoidLunarWidget } from './void.lunar.component';

// ─── Derive LunarPalette entries from VOID_LUNAR_PALETTES ─────────────────────
// Same pattern as void.definition.ts deriving WidgetPalette from VOID_WIDGET_PALETTES.

const VOID_LUNAR_SKIN_PALETTES: LunarSkinPalettes = Object.fromEntries(
  (Object.keys(VOID_LUNAR_PALETTES) as LunarPhase[]).map((phase) => {
    const p = VOID_LUNAR_PALETTES[phase];
    return [
      phase,
      {
        bg: [p.bg[0], p.bg[1], p.bg[1]] as [string, string, string],
        accentColor: p.orbCore,
        outerGlow: p.outerGlow,
        textPrimary: p.textPrimary,
        textSecondary: p.textSecondary,
        mode: 'dark' as const,
        label: p.label,
        orbFill: p.orbCore,
        border: p.pillBorder,
      } satisfies LunarPalette,
    ];
  }),
) as LunarSkinPalettes;

// ─── Export ────────────────────────────────────────────────────────────────────

export const voidLunarSkin: LunaSkinDefinition = {
  id: 'void',
  label: 'Void',
  description:
    'The anti-skin. Near-black. The orb brightens only with the moon. New moon is almost nothing. Full moon is everything.',
  lunarPalettes: VOID_LUNAR_SKIN_PALETTES,
  Component: VoidLunarWidget,
  CompactComponent: VoidLunaCompact,
};
