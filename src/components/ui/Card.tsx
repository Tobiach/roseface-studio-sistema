// src/components/ui/Card.tsx
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-pink-100/70 p-5 shadow-xs transition-all duration-200 ${
        hoverable ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
