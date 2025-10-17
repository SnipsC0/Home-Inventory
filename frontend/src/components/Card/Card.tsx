import { ReactNode, CSSProperties } from 'react';

interface CardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function Card({
  children,
  onClick,
  className = '',
  style = {},
}: CardProps) {
  const baseStyle: CSSProperties = {
    background: 'var(--card-background-color)',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'transform 0.2s, box-shadow 0.2s',
    ...style,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    }
  };

  return (
    <div
      className={className}
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  style?: CSSProperties;
}

export function CardContent({ children, style = {} }: CardContentProps) {
  return (
    <div
      style={{
        cursor: 'pointer',
        padding: '12px',
        borderRadius: '6px',
        textAlign: 'center',
        transition: 'background 0.2s',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--secondary-background-color)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </div>
  );
}
