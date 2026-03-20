/**
 * @circadian/luna
 *
 * Lunar-aware React widgets that follow the real phase of the moon.
 * https://circadian.dev
 */

// ── Provider + hook ───────────────────────────────────────────────────────────
export { LunaThemeProvider, useLunaTheme } from './provider/luna-theme-provider';
export type { LunaThemeContext } from './provider/luna-theme-provider';

// ── Widgets ───────────────────────────────────────────────────────────────────
export { LunaWidget } from './widgets/luna-widget.shell';
export { CompactLunaWidget } from './widgets/compact-luna-widget.shell';
export type { LunaWidgetProps } from './widgets/luna-widget.shell';
export type { CompactLunaWidgetPublicProps } from './widgets/compact-luna-widget.shell';

// ── Hook (lunar position only, no provider required) ──────────────────────────
export { useLunarPosition } from './hooks/useLunarPosition';
export type { LunarPosition, LunarPhase } from './hooks/useLunarPosition';

// ── Skin registry ─────────────────────────────────────────────────────────────
export { LUNA_SKINS } from './skins/index';
export type {
  LunaSkinDefinition,
  LunarPalette,
  LunarSkinPalettes,
} from './skins/types/luna-skin.types';

// ── Types ─────────────────────────────────────────────────────────────────────
export type { LunaExpandDirection, LunaWidgetSize } from './widgets/luna-widget.shell';
export type { CompactLunaSize } from './widgets/compact-luna-widget.shell';
