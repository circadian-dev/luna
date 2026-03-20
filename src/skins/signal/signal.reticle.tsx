'use client';

export function Reticle({ accent, size = 14 }: { accent: string; size?: number }) {
  const r = size;
  const gap = r * 0.28;
  const arm = r * 0.55;
  return (
    <g>
      <circle cx="0" cy="0" r={r} stroke={accent} strokeWidth="1" fill="none" opacity="0.70" />
      <circle
        cx="0"
        cy="0"
        r={r * 0.35}
        stroke={accent}
        strokeWidth="0.7"
        fill="none"
        opacity="0.50"
      />
      <line
        x1={0}
        y1={-gap}
        x2={0}
        y2={-arm}
        stroke={accent}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.90"
      />
      <line
        x1={0}
        y1={gap}
        x2={0}
        y2={arm}
        stroke={accent}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.90"
      />
      <line
        x1={-gap}
        y1={0}
        x2={-arm}
        y2={0}
        stroke={accent}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.90"
      />
      <line
        x1={gap}
        y1={0}
        x2={arm}
        y2={0}
        stroke={accent}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.90"
      />
      {[45, 135, 225, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const ix = Math.cos(rad) * (r + 3);
        const iy = Math.sin(rad) * (r + 3);
        const ox = Math.cos(rad) * (r + 7);
        const oy = Math.sin(rad) * (r + 7);
        return (
          <line
            key={deg}
            x1={ix}
            y1={iy}
            x2={ox}
            y2={oy}
            stroke={accent}
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.45"
          />
        );
      })}
    </g>
  );
}
