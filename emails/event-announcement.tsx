import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link
} from '@react-email/components';
import * as React from 'react';
import { Button } from './components/button';
import { Footer } from './components/footer';

interface EventAnnouncementProps {
  name?: string;
  intro?: string;
  event?: {
    id: string;
    title: string;
    description?: string;
    start: string; // ISO8601 timestamp
    type: 'online' | 'in-person' | 'hybrid';
    location?: string;
    meetingLink?: string;
  };
  rsvpLinks?: {
    yesUrl: string;
    maybeUrl: string;
    noUrl: string;
  };
  unsubscribeUrl?: string;
}

export const EventAnnouncement = ({
  name = 'KINN\'der',
  intro,
  event = {
    id: 'kinn-treff-1',
    title: 'KINN Treff #1 - AI & Innovation',
    description: 'Unser erster KINN Treff!',
    start: new Date().toISOString(),
    type: 'in-person',
    location: 'Coworking Tirol, Innsbruck'
  },
  rsvpLinks = {
    yesUrl: 'https://kinn.at',
    maybeUrl: 'https://kinn.at',
    noUrl: 'https://kinn.at'
  },
  unsubscribeUrl = 'https://kinn.at/pages/profil.html#unsubscribe'
}: EventAnnouncementProps) => {
  // Format event date for Austria/Vienna timezone
  const eventDate = new Date(event.start);

  const dateStr = eventDate.toLocaleDateString('de-AT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Vienna'
  });

  const timeStr = eventDate.toLocaleTimeString('de-AT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Vienna'
  });

  return (
    <Html lang="de">
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Main Content */}
          <Section style={content}>
            <Text style={greeting}>Hey {name}!</Text>

            <Text style={paragraph}>
              {intro || `Der nächste <strong>KINN Treff</strong> steht an:`}
            </Text>

            {/* Event Details Box */}
            <Section style={eventBox}>
              <Text style={eventTitle}>{event.title}</Text>

              <Text style={eventDetails}>
                📅 {dateStr}<br/>
                🕐 {timeStr} Uhr<br/>
                {event.type === 'online' || event.type === 'hybrid' ? (
                  <>💻 <Link href={event.meetingLink} style={meetingLink}>Meeting Link</Link></>
                ) : (
                  <>📍 {event.location}</>
                )}
              </Text>

              {event.description && (
                <Text style={eventDescription}>{event.description}</Text>
              )}
            </Section>

            <Text style={rsvpHeading}>Kommst du?</Text>

            {/* RSVP Buttons */}
            <Section style={rsvpSection}>
              <Section style={buttonRow}>
                <Button href={rsvpLinks.yesUrl} variant="primary" fullWidth={true}>
                  ✅ Ja, ich komme
                </Button>
              </Section>

              <Section style={buttonRow}>
                <Button href={rsvpLinks.maybeUrl} variant="warning" fullWidth={true}>
                  ❓ Vielleicht
                </Button>
              </Section>

              <Section style={buttonRow}>
                <Button href={rsvpLinks.noUrl} variant="secondary" fullWidth={true}>
                  ❌ Kann nicht
                </Button>
              </Section>
            </Section>

            <Text style={rsvpMeta}>
              Ein Klick genügt – kein Login nötig.
            </Text>

            <Text style={signature}>
              Bis bald!<br/>
              <strong>Thomas</strong>
            </Text>
          </Section>

          <Footer includeUnsubscribe={true} unsubscribeUrl={unsubscribeUrl} />
        </Container>
      </Body>
    </Html>
  );
};

// Styles (inline for email client compatibility)
const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Arial', sans-serif"
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px'
};

const content = {
  padding: '20px'
};

const greeting = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#3A3A3A',
  marginBottom: '16px',
  marginTop: '0'
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#3A3A3A',
  marginBottom: '16px',
  marginTop: '0'
};

const eventBox = {
  backgroundColor: 'rgba(94, 217, 166, 0.08)',
  padding: '24px',
  borderRadius: '12px',
  margin: '24px 0',
  borderLeft: '4px solid #5ED9A6'
};

const eventTitle = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#2C3E50',
  marginBottom: '12px',
  marginTop: '0'
};

const eventDetails = {
  fontSize: '15px',
  lineHeight: '1.8',
  color: '#666',
  marginBottom: '0',
  marginTop: '0'
};

const eventDescription = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#666',
  marginTop: '16px',
  marginBottom: '0'
};

const meetingLink = {
  color: '#5ED9A6',
  textDecoration: 'none'
};

const rsvpHeading = {
  fontSize: '16px',
  lineHeight: '1.6',
  fontWeight: '600',
  color: '#3A3A3A',
  marginBottom: '16px',
  marginTop: '0'
};

const rsvpSection = {
  margin: '24px 0'
};

const buttonRow = {
  textAlign: 'center' as const,
  paddingBottom: '12px'
};

const rsvpMeta = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#999',
  marginTop: '32px',
  marginBottom: '0',
  textAlign: 'center' as const
};

const signature = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#3A3A3A',
  marginTop: '32px',
  marginBottom: '0'
};

export default EventAnnouncement;
