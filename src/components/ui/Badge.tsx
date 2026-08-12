// src/components/ui/Badge.tsx
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'rose' | 'gold' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'rose',
  size = 'md',
  icon,
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  const variantClasses = {
    rose: 'bg-rf-blush text-rf-rose-deep font-semibold border border-pink-200',
    gold: 'bg-amber-100 text-amber-900 font-semibold border border-amber-300',
    success: 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 font-semibold border border-amber-200',
    danger: 'bg-red-50 text-red-800 font-semibold border border-red-200',
    neutral: 'bg-gray-100 text-rf-charcoal font-medium border border-gray-200',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full whitespace-nowrap ${sizeClasses} ${variantClasses}`}
    >
      {icon && <span className="w-3 h-3 flex items-center justify-center">{icon}</span>}
      {children}
    </span>
  );
};
