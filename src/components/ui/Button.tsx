// src/components/ui/Button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'gold' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-base gap-2.5 font-semibold',
  }[size];

  const variantClasses = {
    primary:
      'bg-rf-rose-deep text-white hover:bg-[#b05872] shadow-sm hover:shadow-md border border-transparent',
    secondary:
      'bg-rf-blush text-rf-black hover:bg-rf-rose border border-pink-200/80',
    outline:
      'bg-white text-rf-black border border-rf-gold/60 hover:bg-rf-cream hover:border-rf-gold',
    gold:
      'bg-rf-gold-bright text-rf-black font-semibold hover:bg-yellow-500 shadow-sm hover:shadow-md',
    danger:
      'bg-rf-danger text-white hover:bg-[#a85257]',
    ghost:
      'bg-transparent text-rf-charcoal hover:bg-pink-100/50 hover:text-rf-black',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
