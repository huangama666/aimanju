import React from 'react';

// 樱花花瓣SVG装饰
export const SakuraPetal: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 2C12 2 8 6 8 10C8 14 12 18 12 18C12 18 16 14 16 10C16 6 12 2 12 2Z"
      fill="currentColor"
      opacity="0.7"
    />
    <path
      d="M12 6C12 6 16 10 20 10C24 10 22 6 22 6C22 6 18 2 14 2C10 2 12 6 12 6Z"
      fill="currentColor"
      opacity="0.5"
    />
    <path
      d="M12 6C12 6 8 10 4 10C0 10 2 6 2 6C2 6 6 2 10 2C14 2 12 6 12 6Z"
      fill="currentColor"
      opacity="0.5"
    />
  </svg>
);

// 星星装饰SVG
export const AnimeStar: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 2L14.09 8.26L20 9L15 14.74L16.18 21.02L12 17.77L7.82 21.02L9 14.74L4 9L9.91 8.26L12 2Z"
      fill="currentColor"
    />
    <circle cx="12" cy="12" r="2" fill="white" opacity="0.8" />
  </svg>
);

// 漫画气泡装饰
export const ComicBubble: React.FC<{ className?: string; text?: string }> = ({ 
  className = "w-8 h-8", 
  text = "!" 
}) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="16" cy="12" rx="14" ry="10" fill="white" stroke="currentColor" strokeWidth="2"/>
    <path d="M16 22L12 26L20 26Z" fill="white" stroke="currentColor" strokeWidth="2"/>
    <text x="16" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor">
      {text}
    </text>
  </svg>
);

// 国风云朵装饰
export const ChineseCloud: React.FC<{ className?: string }> = ({ className = "w-12 h-8" }) => (
  <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8 20C4 20 2 16 4 12C6 8 12 8 16 12C20 8 28 8 32 12C36 16 34 20 30 20H8Z"
      fill="currentColor"
      opacity="0.6"
    />
    <path
      d="M12 24C8 24 6 20 8 16C10 12 16 12 20 16C24 12 32 12 36 16C40 20 38 24 34 24H12Z"
      fill="currentColor"
      opacity="0.4"
    />
  </svg>
);

// 可爱表情装饰
export const CuteEmoji: React.FC<{ className?: string; type?: 'happy' | 'wink' | 'love' }> = ({ 
  className = "w-6 h-6", 
  type = 'happy' 
}) => {
  const renderFace = () => {
    switch (type) {
      case 'wink':
        return (
          <>
            <circle cx="8" cy="10" r="1" fill="currentColor" />
            <path d="M14 9C14 9 16 11 18 9" stroke="currentColor" strokeWidth="1" fill="none" />
            <path d="M8 14C8 14 12 16 16 14" stroke="currentColor" strokeWidth="1" fill="none" />
          </>
        );
      case 'love':
        return (
          <>
            <path d="M6 8L8 6L10 8L8 10Z" fill="red" />
            <path d="M14 8L16 6L18 8L16 10Z" fill="red" />
            <path d="M8 14C8 14 12 16 16 14" stroke="currentColor" strokeWidth="1" fill="none" />
          </>
        );
      default:
        return (
          <>
            <circle cx="8" cy="10" r="1" fill="currentColor" />
            <circle cx="16" cy="10" r="1" fill="currentColor" />
            <path d="M8 14C8 14 12 16 16 14" stroke="currentColor" strokeWidth="1" fill="none" />
          </>
        );
    }
  };

  return (
    <div className={className}>
      {renderFace()}
    </div>
  );
};

// 日式扇子装饰
export const JapaneseFan: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 28L4 16L16 4L28 16L16 28Z" fill="currentColor" opacity="0.3" />
    <path d="M16 24L8 16L16 8L24 16L16 24Z" fill="currentColor" opacity="0.5" />
    <path d="M16 20L12 16L16 12L20 16L16 20Z" fill="currentColor" opacity="0.7" />
    <circle cx="16" cy="16" r="2" fill="white" />
  </svg>
);

// 漫画闪光效果
export const ComicSparkle: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <></>
);

// 国风印章装饰
export const ChineseSeal: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <div className={className}>
    <rect x="4" y="4" width="24" height="24" rx="2" fill="red" opacity="0.8" />
    <rect x="6" y="6" width="20" height="20" rx="1" fill="white" />
    <rect x="8" y="8" width="16" height="16" rx="1" fill="red" opacity="0.6" />
    <text x="16" y="18" textAnchor="middle" fontSize="8" fontWeight="bold" fill="white">
      漫
    </text>
  </div>
);