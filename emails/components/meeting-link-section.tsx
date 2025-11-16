import { Section, Text } from '@react-email/components';
import { Button } from './button';
import * as React from 'react';

interface MeetingLinkSectionProps {
  meetingLink: string;
  eventType: 'online' | 'hybrid';
}

export const MeetingLinkSection = ({
  meetingLink,
  eventType
}: MeetingLinkSectionProps) => {
  return (
    <Section style={meetingCard}>
      <Text style={headingStyle}>
        {eventType === 'hybrid'
          ? '🎥 Online-Teilnahme auch möglich'
          : '🎥 Online-Meeting'}
      </Text>

      <Section style={buttonContainer}>
        <Button
          href={meetingLink}
          variant="primary"
          fullWidth={false}
        >
          Meeting beitreten →
        </Button>
      </Section>

      <Text style={smallTextStyle}>
        Link wird 15 Minuten vor Beginn aktiviert
      </Text>
    </Section>
  );
};

const meetingCard = {
  backgroundColor: '#E8F4FD',
  padding: '20px',
  borderRadius: '8px',
  textAlign: 'center' as const,
  marginBottom: '24px',
  marginTop: '24px'
};

const headingStyle = {
  fontWeight: '600' as const,
  fontSize: '16px',
  marginBottom: '12px',
  marginTop: '0',
  color: '#1A1A1A'
};

const buttonContainer = {
  textAlign: 'center' as const,
  marginTop: '12px',
  marginBottom: '12px'
};

const smallTextStyle = {
  fontSize: '13px',
  color: '#6B6B6B',
  marginTop: '12px',
  marginBottom: '0'
};
