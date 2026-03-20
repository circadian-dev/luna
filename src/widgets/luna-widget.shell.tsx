'use client';

/**
 * widgets/luna-widget.shell.tsx
 *
 * Shell for the full Luna widget — expanded card + pill.
 * Reads design from LunaThemeProvider and routes to the correct skin component.
 * Mirrors solar-widget.shell.tsx exactly.
 */

import { useLayoutEffect, useState } from 'react';
import { useLunaTheme } from '../provider/luna-theme-provider';
import type { LunaWidgetSkinProps } from '../skins/types/luna-skin.types';

export type LunaExpandDirection =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type LunaWidgetSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface LunaWidgetProps {
  expandDirection?: LunaExpandDirection;
  size?: LunaWidgetSize;
  showIllumination?: boolean;
  showMoonrise?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  simulatedDate?: Date;
  forceExpanded?: boolean;
  hoverEffect?: boolean;
  className?: string;
}

export function LunaWidget({
  expandDirection = 'bottom-right',
  size = 'lg',
  showIllumination = true,
  showMoonrise = true,
  latitude,
  longitude,
  timezone,
  simulatedDate: simulatedDateProp,
  forceExpanded,
  hoverEffect = false,
  className = '',
}: LunaWidgetProps) {
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => setMounted(true), []);

  const {
    activeSkin,
    latitude: ctxLat,
    longitude: ctxLon,
    timezone: ctxTz,
    simulatedDate: ctxSimulatedDate,
  } = useLunaTheme();

  const resolvedLat = latitude ?? ctxLat;
  const resolvedLon = longitude ?? ctxLon;
  const resolvedTz = timezone ?? ctxTz;
  const simulatedDate = simulatedDateProp ?? ctxSimulatedDate;

  const SkinComponent = activeSkin.Component;

  const props: LunaWidgetSkinProps = {
    expandDirection,
    size,
    showIllumination,
    showMoonrise,
    latitude: resolvedLat,
    longitude: resolvedLon,
    timezone: resolvedTz,
    simulatedDate,
    forceExpanded,
    hoverEffect,
    className,
  };

  return (
    <div style={{ visibility: mounted ? 'visible' : 'hidden' }}>
      <SkinComponent {...props} />
    </div>
  );
}
