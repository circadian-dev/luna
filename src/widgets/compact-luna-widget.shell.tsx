'use client';

/**
 * widgets/compact-luna-widget.shell.tsx
 *
 * Shell for the compact Luna widget — slim pill/bar format.
 * Mirrors compact-widget.shell.tsx from Sol exactly.
 */

import type { DesignMode } from '@circadian/sol';
import { useLayoutEffect, useState } from 'react';
import { useLunaTheme } from '../provider/luna-theme-provider';
import type { CompactLunaWidgetProps } from '../skins/types/luna-skin.types';

export type CompactLunaSize = 'sm' | 'md' | 'lg';

export interface CompactLunaWidgetPublicProps {
  design?: DesignMode;
  size?: CompactLunaSize;
  showIllumination?: boolean;
  showMoonrise?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  simulatedDate?: Date;
  className?: string;
}

export function CompactLunaWidget({
  size = 'md',
  showIllumination = true,
  showMoonrise = true,
  latitude,
  longitude,
  timezone,
  simulatedDate: simulatedDateProp,
  className = '',
}: CompactLunaWidgetPublicProps) {
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

  const CompactComponent = activeSkin.CompactComponent;

  const props: CompactLunaWidgetProps = {
    size,
    showIllumination,
    showMoonrise,
    latitude: resolvedLat,
    longitude: resolvedLon,
    timezone: resolvedTz,
    simulatedDate,
    className,
  };

  return (
    <div
      className={className}
      style={{ visibility: mounted ? 'visible' : 'hidden', isolation: 'isolate' }}
    >
      <CompactComponent {...props} />
    </div>
  );
}
