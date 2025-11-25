import { Button as EmailButton } from '@react-email/components';
import * as React from 'react';

interface ButtonProps {
  href: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning';
  children: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = ({ href, variant = 'primary', children, fullWidth = false }: ButtonProps) => {
  const baseStyle = {
    fontWeight: '600',
    borderRadius: '8px',
    padding: '14px 32px',
    textDecoration: 'none',
    display: 'inline-block',
    fontSize: '16px',
    minWidth: fullWidth ? '200px' : 'auto',
    textAlign: 'center'
  };

  const variantStyles = {
    primary: {
      ...baseStyle,
      backgroundColor: '#5ED9A6',
      color: '#000'
    },
    secondary: {
      ...baseStyle,
      backgroundColor: '#f0f0f0',
      color: '#666'
    },
    warning: {
      ...baseStyle,
      backgroundColor: '#FFA500',
      color: '#000'
    },
    danger: {
      ...baseStyle,
      backgroundColor: '#ffebee',
      color: '#c62828'
    }
  };

  return (
    <EmailButton href={href} style={variantStyles[variant]}>
      {children}
    </EmailButton>
  );
};
