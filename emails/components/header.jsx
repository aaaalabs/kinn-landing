import { Section, Img } from '@react-email/components';
import * as React from 'react';

export const Header = ({
  logoUrl = 'https://kinn.at/kinn-logo.png',
  logoWidth = 120
}) => {
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
  textAlign: 'center',
  marginBottom: '32px',
  paddingTop: '20px'
};

const logoStyle = {
  margin: '0 auto',
  display: 'block'
};
