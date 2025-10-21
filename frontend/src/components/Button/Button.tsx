import { ReactNode, CSSProperties } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  type?: 'button' | 'submit';
  disabled?: boolean;
  style?: CSSProperties;
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled = false,
  style = {},
}: ButtonProps) {
  const getVariantStyle = (): CSSProperties => {
    const base: CSSProperties = {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '4px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontWeight: 500,
      fontSize: '1em',
      transition: 'all 0.2s',
      opacity: disabled ? 0.5 : 1,
    };

    switch (variant) {
      case 'primary':
        return {
          ...base,
          background: 'var(--primary-color)',
          color: '#fff',
        };
      case 'secondary':
        return {
          ...base,
          background: 'var(--secondary-background-color)',
          color: 'var(--primary-text-color)',
          border: '1px solid var(--divider-color)',
        };
      case 'danger':
        return {
          ...base,
          background: 'var(--error-color)',
          color: '#fff',
        };
      default:
        return base;
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...getVariantStyle(), ...style }}
    >
      {children}
    </button>
  );
}
