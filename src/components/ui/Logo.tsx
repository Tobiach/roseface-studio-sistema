// src/components/ui/Logo.tsx
import React from 'react';
import logoImg from '../../assets/images/roseface_logo_1786547752720.jpg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
}) => {
  const sizeClasses = {
    sm: { img: 'h-10 w-auto', text: 'text-base', sub: 'text-[9px]' },
    md: { img: 'h-12 sm:h-14 w-auto', text: 'text-xl', sub: 'text-[10px]' },
    lg: { img: 'h-16 sm:h-20 w-auto', text: 'text-2xl', sub: 'text-xs' },
    xl: { img: 'h-24 sm:h-28 w-auto', text: 'text-3xl', sub: 'text-sm' },
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none group ${className}`}>
      <div className="relative overflow-hidden rounded-xl bg-pink-50/50 p-0.5 border border-pink-200/80 shadow-2xs group-hover:border-rf-gold transition-all">
        <img
          src={logoImg}
          alt="Roseface By Yosy - Studio Estético"
          className={`${sizeClasses.img} object-contain rounded-lg transition-transform duration-300 group-hover:scale-105`}
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="flex flex-col">
        <span className={`font-display font-bold text-rf-black tracking-wide leading-none ${sizeClasses.text}`}>
          Roseface
        </span>
        {showSubtitle && (
          <span className={`italic font-serif text-rf-gold font-semibold tracking-wider mt-0.5 ${sizeClasses.sub}`}>
            By Yosy • Studio Estético
          </span>
        )}
      </div>
    </div>
  );
};

