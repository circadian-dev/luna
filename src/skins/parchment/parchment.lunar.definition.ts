// ════════════════════════════════════════════════════════════════════════════
// FILE: skins/parchment/parchment.lunar.definition.ts
// ════════════════════════════════════════════════════════════════════════════
/**
 * Parchment lunar skin definition.
 *
 * Registers ParchmentLunarWidget and ParchmentLunaCompact under the 'parchment'
 * DesignMode for the Luna package's skin registry.
 *
 * Character: Sol parchment is a Notion-native document widget — white, flat,
 * zero glows, rgba(55,53,47) ink. Luna parchment translates this to a
 * MEDIEVAL MANUSCRIPT. Same document restraint and flat-ink philosophy, but
 * the surface is aged warm vellum (cream → amber) rather than white paper,
 * and the moon is a hand-copied almanac illustration with a sepia ink dot
 * tracking its progress. Phase labels are in Latin. The grain texture is
 * coarser — aged vellum, not fresh stock.
 *
 * "Luna Plena" / "Quadratura Prima" / "Luna Nova" — as if copied by a monk.
 */

import type { LunarPhase } from '../../hooks/useLunarPosition';
import type { LunaSkinDefinition, LunarPalette, LunarSkinPalettes } from '../types/luna-skin.types';
import { ParchmentLunaCompact } from './parchment.lunar.compact';
import { PARCHMENT_LUNAR_PALETTES, ParchmentLunarWidget } from './parchment.lunar.component';

// ─── Ink tokens for derivation ────────────────────────────────────────────────

const INK_MED = 'rgba(45,35,20,0.65)';
const INK_GHOST = 'rgba(45,35,20,0.22)';

// ─── Derive LunarSkinPalettes from PARCHMENT_LUNAR_PALETTES ─────────────────

const PARCHMENT_LUNAR_SKIN_PALETTES: LunarSkinPalettes = Object.fromEntries(
  (Object.keys(PARCHMENT_LUNAR_PALETTES) as LunarPhase[]).map((phase) => {
    const p = PARCHMENT_LUNAR_PALETTES[phase];
    return [
      phase,
      {
        bg: p.bg,
        accentColor: INK_MED,
        outerGlow: 'transparent', // parchment emits nothing
        textPrimary: p.textPrimary,
        textSecondary: p.textSecondary,
        mode: p.mode,
        label: p.labelLatin, // Latin phase names for the registry
        orbFill: p.orbDot,
        border: p.borderMed,
      } satisfies LunarPalette,
    ];
  }),
) as LunarSkinPalettes;

// ─── Export ────────────────────────────────────────────────────────────────────

export const parchmentLunarSkin: LunaSkinDefinition = {
  id: 'parchment',
  label: 'Parchment',
  description:
    'A medieval manuscript moon. Warm vellum, sepia ink, Latin phase names. Document-native restraint.',
  lunarPalettes: PARCHMENT_LUNAR_SKIN_PALETTES,
  Component: ParchmentLunarWidget,
  CompactComponent: ParchmentLunaCompact,
};
