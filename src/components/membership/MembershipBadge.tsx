import React from 'react';
import { Crown } from 'lucide-react';
import type { MembershipLevel } from '@/types/database';
import { getMembershipColor } from '@/config/membership';

interface MembershipBadgeProps {
  level: MembershipLevel;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const MembershipBadge: React.FC<MembershipBadgeProps> = ({
  level,
  size = 'md',
  showText = false,
  className = ''
}) => {
  const color = getMembershipColor(level);
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>

      {showText && (
        <span 
          className={`font-semibold ${textSizeClasses[size]}`}
          style={{ color }}
        >
          V
        </span>
      )}
    </div>
  );
};
