'use client';

import { useRef, useState, type ReactNode, type MouseEvent } from 'react';

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  size?: 'large' | 'small';
  variant?: 'default' | 'gold' | 'blue';
  accentColor?: string;
  style?: React.CSSProperties;
}

export function BentoCard({
  children,
  className = '',
  size = 'large',
  variant = 'default',
  accentColor,
  style: externalStyle,
}: BentoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    cardRef.current.style.setProperty('--mouse-x', `${x}%`);
    cardRef.current.style.setProperty('--mouse-y', `${y}%`);
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty('--mouse-x', '50%');
    cardRef.current.style.setProperty('--mouse-y', '50%');
    setIsHovered(false);
  };

  // Resolve accent color for corner/bottom accents
  const accent = accentColor || (variant === 'blue' ? '#4488FF' : '#00FFFF');

  // Variant-specific glow classes
  const glowClass = variant === 'blue'
    ? 'angle-glow angle-glow-blue angle-glow-ambient'
    : 'angle-glow angle-glow-ambient';

  // Variant-specific hover border tint
  const hoverBorderClass = variant === 'blue'
    ? 'hover:border-[rgba(0,163,255,0.15)]'
    : 'hover:border-[rgba(0,255,255,0.15)]';

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`
        group relative overflow-hidden rounded-2xl
        material-depth
        ${glowClass}
        liquid-glass
        grain-texture
        transition-all duration-300
        hover:scale-[1.01]
        ${hoverBorderClass}
        ${size === 'large' ? 'p-8 md:p-10' : 'p-6'}
        ${className}
      `}
      style={{
        '--mouse-x': '50%',
        '--mouse-y': '50%',
        transitionTimingFunction: 'var(--ease-precision)',
        ...externalStyle,
      } as React.CSSProperties}
    >
      {/* Corner accent — top-left */}
      <div
        className="absolute top-0 left-0 w-6 h-6 border-l border-t transition-all duration-500 pointer-events-none z-20"
        style={{
          borderColor: isHovered ? accent : `${accent}30`,
        }}
      />
      {/* Corner accent — bottom-right */}
      <div
        className="absolute bottom-0 right-0 w-6 h-6 border-r border-b transition-all duration-500 pointer-events-none z-20"
        style={{
          borderColor: isHovered ? accent : `${accent}30`,
        }}
      />

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 h-[2px] transition-all duration-500 pointer-events-none z-20"
        style={{
          width: isHovered ? '100%' : '25%',
          background: `linear-gradient(90deg, ${isHovered ? accent : accent + '60'}, transparent)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
