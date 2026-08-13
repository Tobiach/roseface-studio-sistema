// src/components/ui/PhotoPlaceholder.tsx
import React from 'react';
import { Camera } from 'lucide-react';

interface PhotoPlaceholderProps {
  label: string;
  aspect?: string;
  className?: string;
}

export const PhotoPlaceholder: React.FC<PhotoPlaceholderProps> = ({
  label,
  aspect = 'aspect-[4/5]',
  className = '',
}) => {
  return (
    <div
      className={`relative ${aspect} w-full rounded-2xl bg-rf-blush/50 border border-rf-gold/40 flex flex-col items-center justify-center gap-2 px-6 overflow-hidden ${className}`}
    >
      <Camera className="w-6 h-6 text-rf-gold shrink-0" />
      <span className="text-[11px] font-medium text-rf-rose-deep text-center leading-relaxed max-w-[220px]">
        {label}
      </span>
    </div>
  );
};
