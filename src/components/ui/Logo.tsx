// src/components/ui/Logo.tsx
import React from 'react';
import logoImg from '../../assets/images/home/logo-roseface.jpg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-11 w-11',
    md: 'h-12 sm:h-14 w-12 sm:w-14',
    lg: 'h-16 sm:h-20 w-16 sm:w-20',
    xl: 'h-24 sm:h-28 w-24 sm:w-28',
  }[size];

  return (
    <div className={`select-none group ${className}`}>
      <img
        src={logoImg}
        alt="Rose Face Studio by Yosy"
        className={`${sizeClasses} object-cover rounded-full border-2 border-rf-gold/60 shadow-xs transition-transform duration-300 group-hover:scale-105`}
      />
    </div>
  );
};

