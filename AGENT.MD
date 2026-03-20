# Luna Skin Agent Instructions

You are building skins for `@circadian/luna` — the lunar-aware React widget
library from [Circadian](https://circadian.dev). This file tells you exactly
how to build each skin's three files so every skin is consistent.

---

## Context

Luna is the sister package to `@circadian/sol`. Sol tracks the sun (9 solar
phases). Luna tracks the moon (8 lunar phases). They share the same 10 skin
names (`DesignMode` from `@circadian/sol`) but every skin has its own unique
visual treatment for lunar phases.

The `void` skin is the reference implementation — always read it before
building a new skin.

Reference files (already built):
- `src/skins/void/void.lunar.component.tsx`
- `src/skins/void/void.lunar.compact.tsx`
- `src/skins/void/void.lunar.definition.ts`

---

## The 8 Lunar Phases

```ts
type LunarPhase =
  | 'new'              // age 0–1.85d   — no light, orb near-invisible
  | 'waxing-crescent'  // age 1.85–7.38d
  | 'first-quarter'    // age 7.38–9.22d — half lit, right side
  | 'waxing-gibbous'   // age 9.22–14.77d
  | 'full'             // age 14.77–16.61d — maximum light, mode: 'dim'
  | 'waning-gibbous'   // age 16.61–22.15d
  | 'last-quarter'     // age 22.15–23.99d — half lit, left side
  | 'waning-crescent'  // age 23.99–29.53d
```

**Critical rule:** Luna never reaches `mode: 'light'`. The moon is never
bright enough. Valid modes are `'dark'` and `'dim'` only. `full` moon uses
`'dim'`. All other phases use `'dark'`.

---

## Per-skin Visual Character

Each skin must feel like the same design system applied to lunar light.
Read the Sol skin's component to understand its aesthetic, then apply that
aesthetic to lunar phases. Key translations:

| Skin | Sol character | Luna translation |
|---|---|---|
| `void` | near-black, single orb | orb scales with illumination, star field fades at full |
| `aurora` | animated band layers, northern lights | bands shift blue-silver at full, near-invisible at new |
| `tide` | fluid wave layers at bottom | bioluminescent waves pulse with illumination |
| `mineral` | faceted crystal geometry | sharp terminator edge as geometric line |
| `foundry` | warm volumetric industrial | inverts to cold steel-blue, molten silver orb |
| `meridian` | hairline ruling lines | astronomical coordinate grid, moon plotted as precise point |
| `paper` | flat ink editorial | lunar phase diagram printed in corner, silver ink on dark paper |
| `signal` | pixel/CRT treatment | pixelated moon circle, filled/empty based on phase |
| `sundial` | Roman/classical carved | phase label in Latin (`LUNA PLENA`, `LUNA NOVA`) |
| `parchment` | aged document strokes | medieval manuscript moon illustration |

---

## File 1: `[skin].lunar.component.tsx`

The expanded card + collapsed pill for this skin.

### Required structure

```
'use client';
// FILE: skins/[skin]/[skin].lunar.component.tsx

// 1. Palette interface — VoidLunarPalette, AuroraLunarPalette, etc.
// 2. PALETTES constant — Record<LunarPhase, [Skin]LunarPalette>
// 3. lerpPalette function — interpolates between two palette entries
// 4. getLunarBlend(ageInDays) — returns { phase, nextPhase, t }
// 5. Orb RAF hook — useVoidOrbRaf / useAuroraOrbRaf etc.
// 6. Skin-specific visual components (aurora bands, tide waves, etc.)
// 7. MoonPhaseIcon — SVG icon showing correct terminator for each phase
// 8. [Skin]LunarWidget — the main export, expanded + pill
```

### Palette interface

Every skin's palette must include these fields — add skin-specific extras on top:

```ts
interface [Skin]LunarPalette {
  bg:            [string, string, string]; // 3-stop gradient
  accentColor:   string;
  outerGlow:     string;                  // rgba — scales with illumination
  textPrimary:   string;
  textSecondary: string;
  mode:          'dark' | 'dim';          // NEVER 'light'
  label:         string;                  // lowercase phase name shown in widget
  sublabel:      string;                  // secondary line e.g. 'waxing' / 'full illumination'
  orbFill:       string;
  border:        string;
}
```

### Palette values — temperature rule

Lunar light is cold and reflected. Palette temperature must follow this curve:

```
new (black) → crescent (cold indigo) → quarter (blue-grey)
→ gibbous (silver-blue) → FULL (silver-white) → gibbous → quarter → crescent → new
```

Never use warm colors (amber, orange, red) in lunar palettes. Sol uses those.
Luna is always cold: indigo, blue, grey, silver, white.

### Illumination-driven orb

The orb is the most important visual element. Its size and opacity MUST scale
with `lunarPos.illumination` (0–1):

```ts
const orbOpacity = Math.max(0.06, lunarPos.illumination * 0.94 + 0.06);
const glowR      = BASE_GLOW_R * lunarPos.illumination + MIN_R;
const coreR      = 4 + lunarPos.illumination * 3;
```

At new moon: orb is a ghost (opacity ~0.06).
At full moon: orb blooms to maximum presence.
This is the key difference from Sol's void night phases which are always identical.

### Expanded card z-layers (use same z-index order as Sol)

```
z=0  Background gradient (animates with palette)
z=1  Skin-specific atmosphere (star field, aurora bands, wave layers, etc.)
z=2  Arc hairline (dashed for Luna, solid for Sol)
z=3  Orb SVG (opacity + size driven by illumination)
z=5  Header text (phase label top-left, phase icon top-right)
z=5  Bottom row (moonrise ↑ / sublabel / moonset ↓)
z=6  Top edge catch-light (1px gradient line)
z=7  Collapse button
```

### Arc

Luna uses the same arc geometry as Sol void — flat parabolic curve:

```ts
const W           = 360;
const H           = 180;
const ARC_BASE_Y  = 165;
const ARC_ZENITH_Y = 30;
const ARC_H       = ARC_BASE_Y - ARC_ZENITH_Y;

function arcOrbPos(progress: number) {
  const t = Math.max(0.01, Math.min(0.99, progress));
  return { x: t * W, y: ARC_BASE_Y - ARC_H * 4 * t * (1 - t) };
}
```

**Exception:** Aurora and Tide skins use the elliptical arc from Sol's aurora
component instead:

```ts
const CX = 180; const CY = 200; const RX = 169.2; const RY = 171;
const ARC_D = `M ${CX - RX} ${CY} A ${RX} ${RY} 0 0 1 ${CX + RX} ${CY}`;
function arcPt(t: number) {
  const angle = Math.PI * (1 - t);
  return { x: CX + RX * Math.cos(angle), y: CY - RY * Math.sin(angle) };
}
```

### Moon progress

```ts
const progressTarget = lunarPos.isVisible
  ? Math.max(0.01, Math.min(0.99, lunarPos.moonProgress))
  : 0.5; // park orb at top of arc when moon is below horizon
```

### Header layout

```tsx
{/* Top-left: phase label + sublabel */}
<motion.p style={{ fontWeight: 200, letterSpacing: '0.18em', textTransform: 'lowercase', opacity: 0.38 }}>
  {palette.label}
</motion.p>
{/* Sublabel: illumination% + days to next event */}
<motion.p style={{ fontSize: 10, opacity: 0.22 }}>
  {illumPct}% · {nextEventStr}
</motion.p>

{/* Top-right: MoonPhaseIcon */}
<MoonPhaseIcon phase={lunarPos.phase} color={palette.orbFill} size={22} />
```

### Bottom row

```tsx
{/* moonrise ↑ (left) · sublabel (center) · moonset ↓ (right) */}
<span>↑ {moonriseStr}</span>
<span>{palette.sublabel}</span>
<span>↓ {moonsetStr}</span>
```

### Pill (collapsed)

```tsx
<MoonPhaseIcon phase={lunarPos.phase} color={palette.orbFill} size={16} />
{showIllumination && <span>{illumPct}%</span>}
<span>·</span>  {/* dot separator */}
<span style={{ opacity: 0.38 }}>{palette.label}</span>
<ArrowIcon />
```

### Pill box-shadow

Scale glow with illumination:

```ts
boxShadow: `0 4px 20px rgba(0,0,0,0.70), 0 0 ${16 * lunarPos.illumination + 4}px 2px ${palette.outerGlow}`
```

### localStorage key

Each skin uses its own key so Sol and Luna expanded states don't collide:

```ts
localStorage.getItem(`${skinId}-luna-widget-expanded`)
// e.g. 'void-luna-widget-expanded', 'aurora-luna-widget-expanded'
```

### Orb RAF hook

Copy the pattern from `void.lunar.component.tsx` — `useLunaVoidOrbRaf`. Key points:

- Three refs: `glow`, `mid`, `core` — all updated together via `setAttribute('cx'/'cy')`
- On wrap-around: fade all three to 0, snap, fade back to 1 (160ms)
- `firstCall.current` prevents initial lerp on mount

### MoonPhaseIcon

SVG moon showing the correct terminator for each phase. Use overlapping
circle masking technique:

```ts
// Waxing phases: lit on right (mask circle offset left)
// Waning phases: lit on left (mask circle offset right)
// Thin crescent: offset = r * 0.62
// Gibbous:       offset = r * 0.18
// Quarter:       half-circle path
// New:           empty circle stroke only
// Full:          filled circle
```

---

## File 2: `[skin].lunar.compact.tsx`

The compact pill/bar widget for this skin.

### Required structure

```
'use client';
// FILE: skins/[skin]/[skin].lunar.compact.tsx

// 1. SIZE_DIMS — sm/md/lg dimensions (copy from void.lunar.compact.tsx)
// 2. getLunarBlend — same function as in component file
// 3. fmtMinutes — formats moonrise/moonset
// 4. Orb RAF hook (compact version — uses trackW not canvas W/H)
// 5. [Skin]LunaTrack — the animated track SVG component
// 6. [Skin]LunaCompact — the main export
```

### Three-row layout

```
Row 1:  phase label (left, lowercase, opacity 0.38)  |  illumination% (right, opacity 0.32)
Row 2:  animated track with orb
Row 3:  ↑ moonrise (left)  ·  sublabel (center)  ·  moonset ↓ (right)
```

### SIZE_DIMS (copy exactly)

```ts
const SIZE_DIMS = {
  sm: { width: 200, height: 72,  px: 12, py: 10, trackH: 16, labelSize: 10, timeSize: 8  },
  md: { width: 240, height: 88,  px: 14, py: 11, trackH: 20, labelSize: 11, timeSize: 9  },
  lg: { width: 280, height: 104, px: 16, py: 12, trackH: 24, labelSize: 12, timeSize: 10 },
};
```

### Track component

The compact track replaces Sol's sunrise/sunset progress with lunar moonProgress.
Track line stays outside the orb wrap group (always visible). All orb circles
inside the wrap group (fade together on wrap-around).

Orb dimensions scale with illumination:

```ts
const orbR  = size.trackH * 0.38;
const glowR = orbR * (2.5 * lunarPos.illumination + 0.5);
const midR  = orbR * (1.4 * lunarPos.illumination + 0.3);
const coreR = orbR * (0.8 + lunarPos.illumination * 0.2);
```

### Skin-specific track treatment

- `void`:     flat line + soft glow circles (same as Sol void compact)
- `aurora`:   spectral aurora band gradient behind the track
- `tide`:     wave ripple marks along the track
- `mineral`:  geometric diamond tick marks
- `signal`:   pixel-stepped dashes instead of smooth line
- `meridian`: single hairline with degree markings
- `paper`:    ink-drawn wavering line
- `sundial`:  carved stone track with Roman numerals at phase boundaries
- `parchment`: rough ink stroke

### No weather layer

Luna compact has no weather integration. Remove all weather-related code.

### CompactLunaWidgetProps

```ts
interface CompactLunaWidgetProps {
  size?:             'sm' | 'md' | 'lg';
  showIllumination?: boolean;
  showMoonrise?:     boolean;
  latitude?:         number | null;
  longitude?:        number | null;
  timezone?:         string | null;
  simulatedDate?:    Date;
  className?:        string;
}
```

---

## File 3: `[skin].lunar.definition.ts`

Registers the skin in Luna's registry.

### Required structure

```ts
// FILE: skins/[skin]/[skin].lunar.definition.ts

import type { LunarPhase } from '../../hooks/useLunarPosition';
import type { LunarPalette, LunarSkinPalettes, LunaSkinDefinition } from '../types/luna-skin.types';
import { [SKIN]_LUNAR_PALETTES, [Skin]LunarWidget } from './[skin].lunar.component';
import { [Skin]LunaCompact } from './[skin].lunar.compact';

// 1. Derive LunarSkinPalettes from the skin's PALETTES constant
// 2. Export [skin]LunarSkin as LunaSkinDefinition
```

### Deriving LunarSkinPalettes

```ts
const [SKIN]_LUNAR_SKIN_PALETTES: LunarSkinPalettes = Object.fromEntries(
  (Object.keys([SKIN]_LUNAR_PALETTES) as LunarPhase[]).map(phase => {
    const p = [SKIN]_LUNAR_PALETTES[phase];
    return [
      phase,
      {
        bg:            [p.bg[0], p.bg[1], p.bg[1]] as [string, string, string],
        accentColor:   p.orbFill,        // or p.accentColor if skin defines it separately
        outerGlow:     p.outerGlow,
        textPrimary:   p.textPrimary,
        textSecondary: p.textSecondary,
        mode:          p.mode,
        label:         p.label,
        orbFill:       p.orbFill,
        border:        p.border,
      } satisfies LunarPalette,
    ];
  }),
) as LunarSkinPalettes;
```

### Export shape

```ts
export const [skin]LunarSkin: LunaSkinDefinition = {
  id:          '[skin]',         // must match DesignMode from @circadian/sol
  label:       '[Skin]',
  description: 'One sentence describing this skin's lunar character.',
  lunarPalettes: [SKIN]_LUNAR_SKIN_PALETTES,
  Component:        [Skin]LunarWidget,
  CompactComponent: [Skin]LunaCompact,
};
```

---

## Registering a new skin

After building the three files, open `src/skins/index.ts` and:

1. Import the definition:
```ts
import { auroraLunarSkin } from './aurora/aurora.lunar.definition';
```

2. Replace the placeholder in `LUNA_SKINS`:
```ts
aurora: auroraLunarSkin,   // was: voidLunarSkin (TODO placeholder)
```

---

## Imports to use

```ts
// Luna internals
import { lerpColor } from '../../lib/luna-lerp';
import { useLunarPosition, type LunarPhase } from '../../hooks/useLunarPosition';
import { useLunaTheme } from '../../provider/luna-theme-provider';
import type { LunaSkinDefinition, LunarPalette, LunarSkinPalettes } from '../types/luna-skin.types';
import type { CompactLunaWidgetProps } from '../../widgets/compact-luna-widget.shell';

// Motion
import { AnimatePresence, motion } from 'motion/react';

// React
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Sol (types only — no runtime Sol imports in skin files)
import type { DesignMode } from '@circadian/sol';
```

**Never import Sol runtime code** (components, hooks, providers) inside Luna
skin files. Only import Sol types.

---

## What NOT to include in Luna skins

- No weather layer (`WeatherBackdrop`, `WeatherLayer`, `WeatherCategory`)
- No `Open-Meteo` fetch
- No temperature display
- No country flags (no `countries-and-timezones` in skin files)
- No `useSolarPosition` or any Sol hooks
- No `mode: 'light'` palette entries

---

## Checking your work

Before submitting a skin, verify:

- [ ] All 8 `LunarPhase` keys present in PALETTES constant
- [ ] `full` phase uses `mode: 'dim'`, all others use `mode: 'dark'`
- [ ] Palette colors are cold (blue/silver/indigo) — no warm colors
- [ ] Orb opacity and size scale with `lunarPos.illumination`
- [ ] Bottom row shows moonrise/moonset, not sunrise/sunset
- [ ] `localStorage` key uses `[skin]-luna-widget-expanded`
- [ ] Definition file `id` matches the Sol `DesignMode` string exactly
- [ ] Skin registered in `src/skins/index.ts`
- [ ] No Sol runtime imports
- [ ] No weather code
- [ ] `bun run typecheck` passes
- [ ] `bun run build` passes

---

## Skin build order (recommended)

Build in this order — each one teaches you something that makes the next easier:

```
1. void      ✅ done — reference implementation, simplest visuals
2. aurora    — animated bands, most complex, establishes the pattern for layered skins
3. tide      — fluid waves, second layered skin
4. mineral   — geometric, introduces the terminator-as-geometry idea
5. meridian  — hairline, simplest after void
6. paper     — editorial, introduces print/texture aesthetic
7. signal    — pixel treatment, introduces discrete (non-smooth) rendering
8. foundry   — industrial, warm-inverted-to-cold
9. sundial   — classical, introduces Latin labels
10. parchment — manuscript, most illustrative
```

---

## Reference: void skin palette values

Use these as a baseline to understand the temperature and brightness range
expected across the 8 phases:

```ts
'new':             bg: ['#000000', '#020204'], orbCore: 'rgba(40,40,60,0.8)',   // nearly invisible
'waxing-crescent': bg: ['#010108', '#02020C'], orbCore: 'rgba(90,90,160,0.9)',
'first-quarter':   bg: ['#020210', '#040420'], orbCore: 'rgba(120,120,200,0.95)',
'waxing-gibbous':  bg: ['#030318', '#06063A'], orbCore: 'rgba(140,140,220,0.98)',
'full':            bg: ['#04043A', '#08087A'], orbCore: 'rgba(200,200,255,1.0)', // maximum
'waning-gibbous':  bg: ['#030318', '#06063A'], orbCore: 'rgba(140,140,220,0.96)',
'last-quarter':    bg: ['#020210', '#040420'], orbCore: 'rgba(120,120,200,0.92)',
'waning-crescent': bg: ['#010108', '#02020C'], orbCore: 'rgba(75,75,140,0.85)',
```

The waxing and waning versions of the same phase type (crescent, gibbous)
are nearly identical but waning is very slightly dimmer — the moon is fading.

---

## Questions to ask before starting a skin

1. What is the defining visual element of this Sol skin? (aurora bands, tide waves, etc.)
2. How does that element respond to lunar illumination? (bands brighten, waves glow brighter)
3. What color temperature does this skin naturally suggest for moonlight?
4. Does this skin use the parabolic arc (void/foundry/paper/signal/sundial/parchment/meridian)
   or the elliptical arc (aurora/tide/mineral)?