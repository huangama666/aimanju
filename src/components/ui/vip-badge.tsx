import React from 'react';

interface VipBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const VipBadge: React.FC<VipBadgeProps> = ({ className = '', size = 'sm' }) => {
  const sizeMap = {
    sm: 16,
    md: 20,
    lg: 24
  };

  const diamondSize = sizeMap[size];

  return (
    <span 
      className={`inline-flex items-center justify-center ${className}`}
      title="会员专属功能"
    >
      <svg
        width={diamondSize}
        height={diamondSize * 0.75}
        viewBox="0 0 16 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ 
          filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))'
        }}
      >
        {/* 钻石外形 */}
        <path
          d="M8 0L13 4L8 12L3 4L8 0Z"
          fill="url(#diamond-gradient)"
          stroke="#7C3AED"
          strokeWidth="0.5"
        />
        {/* 钻石切面 */}
        <path
          d="M8 0L10.5 4H5.5L8 0Z"
          fill="#9333EA"
          opacity="0.8"
        />
        <path
          d="M5.5 4L8 12L3 4H5.5Z"
          fill="#7C3AED"
          opacity="0.6"
        />
        <path
          d="M10.5 4L8 12L13 4H10.5Z"
          fill="#7C3AED"
          opacity="0.6"
        />
        <path
          d="M5.5 4H10.5L8 12L5.5 4Z"
          fill="#A855F7"
          opacity="0.7"
        />
        {/* 高光效果 */}
        <path
          d="M8 0L9 2L8 4L7 2L8 0Z"
          fill="white"
          opacity="0.4"
        />
        {/* 渐变定义 */}
        <defs>
          <linearGradient id="diamond-gradient" x1="8" y1="0" x2="8" y2="12" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="50%" stopColor="#9333EA" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
};
