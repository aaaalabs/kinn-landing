import { Section, Text } from '@react-email/components';
import { Button } from './button';
import * as React from 'react';

interface RSVPButtonsProps {
  yesUrl: string;
  maybeUrl: string;
  noUrl: string;
}

export const RSVPButtons = ({ yesUrl, maybeUrl, noUrl }: RSVPButtonsProps) => {
  return (
    <Section style={rsvpSection}>
      <Text style={headingStyle}>Wirst du dabei sein?</Text>

      <Section style={buttonRow}>
        <Button href={yesUrl} variant="primary" fullWidth={true}>
          ✓ Zusagen
        </Button>
      </Section>

      <Section style={buttonRow}>
        <Button href={maybeUrl} variant="warning" fullWidth={true}>
          ? Vielleicht
        </Button>
      </Section>

      <Section style={buttonRow}>
        <Button href={noUrl} variant="secondary" fullWidth={true}>
          ✗ Absagen
        </Button>
      </Section>

      <Text style={metaTextStyle}>
        Ein Klick genügt – kein Login nötig.
      </Text>
    </Section>
  );
};

const rsvpSection = {
  marginTop: '32px',
  marginBottom: '32px'
};

const headingStyle = {
  fontSize: '18px',
  fontWeight: '600' as const,
  textAlign: 'center' as const,
  color: '#1A1A1A',
  marginBottom: '20px',
  marginTop: '0'
};

const buttonRow = {
  textAlign: 'center' as const,
  paddingBottom: '12px'
};

const metaTextStyle = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#999',
  marginTop: '32px',
  marginBottom: '0',
  textAlign: 'center' as const
};
