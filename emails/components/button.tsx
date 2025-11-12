import { Button as EmailButton } from '@react-email/components';
import * as React from 'react';

interface ButtonProps {
  href: string;
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
}

export const Button = ({ href, variant = 'primary', children }: ButtonProps) => {
  const styles = {
    primary: {
      backgroundColor: '#5ED9A6',
      color: '#000',
      fontWeight: '600',
      borderRadius: '12px',
      padding: '14px 32px',
      textDecoration: 'none',
      display: 'inline-block',
      fontSize: '1.125rem',
      letterSpacing: '0.01em',
      transition: 'all 0.2s ease'
    },
    secondary: {
      backgroundColor: '#f5f5f5',
      color: '#333',
      fontWeight: '600',
      borderRadius: '12px',
      padding: '14px 32px',
      textDecoration: 'none',
      display: 'inline-block',
      fontSize: '1.125rem'
    },
    danger: {
      backgroundColor: '#ffebee',
      color: '#c62828',
      fontWeight: '600',
      borderRadius: '12px',
      padding: '14px 32px',
      textDecoration: 'none',
      display: 'inline-block',
      fontSize: '1.125rem'
    }
  };

  return (
    <EmailButton href={href} style={styles[variant]}>
      {children}
    </EmailButton>
  );
};
