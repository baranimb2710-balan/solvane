import React, { useState } from 'react';

/**
 * Reusable Mascot Component for Solvane
 * Supports three poses: 'wave', 'thinking', 'pointing'.
 * Uses mascot images from /mascot/{pose}.png.
 * If the image is missing or fails to load, seamlessly falls back to a friendly
 * branded placeholder (stylized 'S' in a gradient circle with pose indicator)
 * so the application UI never breaks.
 * Respects prefers-reduced-motion via CSS.
 */
export default function Mascot({
  pose = 'wave',
  size = 'md',
  animate = true,
  className = '',
  alt = 'Solvane Mascot'
}) {
  const [imageError, setImageError] = useState(false);

  // Normalize size into pixel dimension or tailwind dimensions
  let dimensionPx = 48;
  if (typeof size === 'number') {
    dimensionPx = size;
  } else {
    switch (size) {
      case 'xs':
        dimensionPx = 28;
        break;
      case 'sm':
        dimensionPx = 36;
        break;
      case 'md':
        dimensionPx = 52;
        break;
      case 'lg':
        dimensionPx = 72;
        break;
      case 'xl':
        dimensionPx = 104;
        break;
      case '2xl':
        dimensionPx = 140;
        break;
      default:
        dimensionPx = 52;
    }
  }

  const validPoses = ['wave', 'thinking', 'pointing'];
  const safePose = validPoses.includes(pose) ? pose : 'wave';
  const imageSrc = `/mascot/${safePose}.png`;

  // Fallback pose emoji badges
  const poseEmoji = {
    wave: '👋',
    thinking: '💭',
    pointing: '👉'
  }[safePose];

  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 select-none ${
        animate ? 'animate-mascot-float' : ''
      } ${className}`}
      style={{ width: `${dimensionPx}px`, height: `${dimensionPx}px` }}
      aria-label={alt}
      role="img"
    >
      {!imageError ? (
        <img
          src={imageSrc}
          alt={alt}
          onError={() => setImageError(true)}
          className="w-full h-full object-contain filter drop-shadow-md transition-transform duration-300"
          loading="lazy"
        />
      ) : (
        /* Friendly Branded Fallback Placeholder ("S" in gradient circle) */
        <div
          className="relative w-full h-full rounded-full bg-gradient-to-tr from-sky-600 via-indigo-600 to-orange-500 p-0.5 shadow-lg border border-white/20 flex items-center justify-center group"
          title={`Solvane Mascot (${safePose})`}
        >
          <div className="w-full h-full rounded-full bg-slate-950/80 backdrop-blur-sm flex items-center justify-center relative overflow-hidden">
            {/* Subtle inner highlight glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-400/20 to-orange-400/20 pointer-events-none" />
            
            {/* Stylized 'S' initial */}
            <span
              className="font-black text-white tracking-tight drop-shadow-sm select-none"
              style={{ fontSize: `${Math.max(14, Math.round(dimensionPx * 0.44))}px` }}
            >
              S
            </span>

            {/* Pose indicator mini-badge */}
            <span
              className="absolute -bottom-0.5 -right-0.5 bg-slate-900 border border-white/20 rounded-full flex items-center justify-center shadow-md select-none"
              style={{
                fontSize: `${Math.max(10, Math.round(dimensionPx * 0.28))}px`,
                width: `${Math.max(14, Math.round(dimensionPx * 0.38))}px`,
                height: `${Math.max(14, Math.round(dimensionPx * 0.38))}px`
              }}
            >
              {poseEmoji}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
