import { Section, Text } from '@react-email/components';
import * as React from 'react';


export const EventDetailsCard = ({
  eventDate,
  eventTime,
  eventType,
  location,
  meetingLink
}) => {
  return (
    <Section style={cardStyle}>
      <Text style={labelStyle}>📅 Datum</Text>
      <Text style={valueStyle}>{eventDate}</Text>

      <Text style={labelStyle}>⏰ Uhrzeit</Text>
      <Text style={valueStyle}>{eventTime}</Text>

      {(eventType === 'in-person' || eventType === 'hybrid') && location && (
        <>
          <Text style={labelStyle}>📍 Ort</Text>
          <Text style={valueStyle}>{location}</Text>
        </>
      )}

      {(eventType === 'online' || eventType === 'hybrid') && meetingLink && (
        <>
          <Text style={labelStyle}>💻 Online-Teilnahme</Text>
          <Text style={valueStyle}>
            <a href={meetingLink} style={linkStyle}>
              Meeting Link →
            </a>
          </Text>
        </>
      )}
    </Section>
  );
};

const cardStyle = {
  backgroundColor: '#F8F8F8',
  padding: '24px',
  borderRadius: '12px',
  marginBottom: '24px',
  marginTop: '24px'
};

const labelStyle = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#6B6B6B',
  marginBottom: '4px',
  marginTop: '12px'
};

const valueStyle = {
  fontSize: '16px',
  fontWeight: '500',
  color: '#1A1A1A',
  marginTop: '0',
  marginBottom: '0'
};

const linkStyle = {
  color: '#5ED9A6',
  textDecoration: 'none',
  fontWeight: '500'
};
