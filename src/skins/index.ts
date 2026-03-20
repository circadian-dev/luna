/**
 * skins/index.ts
 *
 * Luna skin registry.
 * Add each skin definition here as you build it.
 * Pattern mirrors Sol's skins/index.ts exactly.
 */

import type { DesignMode } from '@circadian/sol';
import { auroraLunarSkin } from './aurora/aurora.lunar.definition';
import { foundryLunarSkin } from './foundry/foundry.lunar.definition';
import { meridianLunarSkin } from './meridian/meridian.lunar.definition';
import { mineralLunarSkin } from './mineral/mineral.lunar.definition';
import { paperLunarSkin } from './paper/paper.lunar.definition';
import { parchmentLunarSkin } from './parchment/parchment.lunar.definition';
import { signalLunarSkin } from './signal/signal.lunar.definition';
import { sundialLunarSkin } from './sundial/sundial.lunar.definition';
import { tideLunarSkin } from './tide/tide.lunar.definition';
import type { LunaSkinDefinition } from './types/luna-skin.types';
import { voidLunarSkin } from './void/void.lunar.definition';

// ─── Registry ─────────────────────────────────────────────────────────────────
// Keys match Sol's DesignMode so the same skin name works in both packages.
// Add remaining skins as they are built:
//   aurora   → auroraLunarSkin
//   tide     → tideLunarSkin
//   mineral  → mineralLunarSkin
//   foundry  → foundryLunarSkin
//   meridian → meridianLunarSkin
//   paper    → paperLunarSkin
//   signal   → signalLunarSkin
//   sundial  → sundialLunarSkin
//   parchment → parchmentLunarSkin

export const LUNA_SKINS: Record<DesignMode, LunaSkinDefinition> = {
  void: voidLunarSkin,
  aurora: auroraLunarSkin,
  tide: tideLunarSkin,
  mineral: mineralLunarSkin,
  foundry: foundryLunarSkin,
  meridian: meridianLunarSkin,
  paper: paperLunarSkin,
  signal: signalLunarSkin,
  sundial: sundialLunarSkin,
  parchment: parchmentLunarSkin,
};

export type { LunaSkinDefinition };
