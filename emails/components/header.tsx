import { Section, Img } from '@react-email/components';
import * as React from 'react';

interface HeaderProps {
  logoUrl?: string;
  logoWidth?: number;
}

export const Header = ({
  logoUrl = 'https://kinn.at/logo.svg',
  logoWidth = 120
}: HeaderProps) => {
  return (
    <Section style={headerSection}>
      <Img
        src={logoUrl}
        width={logoWidth}
        alt="KINN Logo"
        style={logoStyle}
      />
    </Section>
  );
};

const headerSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
  paddingTop: '20px'
};

const logoStyle = {
  margin: '0 auto',
  display: 'block'
};
