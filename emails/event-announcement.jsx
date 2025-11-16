import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Font
} from '@react-email/components';
import * as React from 'react';
import { Header } from './components/header.jsx';
import { EventDetailsCard } from './components/event-details-card.jsx';
import { RSVPButtons } from './components/rsvp-buttons.jsx';
import { MeetingLinkSection } from './components/meeting-link-section.jsx';
import { Footer } from './components/footer';

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
}) => {
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
      <Head>
        <Font
          fontFamily="Work Sans"
          fallbackFontFamily="Arial"
          webFont={{
            url: "https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&display=swap",
            format: "woff2"
          }}
        />
      </Head>
      <Preview>
        {event.title} - {dateStr} | KINN Treff Innsbruck
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with KINN Logo */}
          <Header />

          {/* Event Type Badge */}
          <Section style={badgeSection}>
            <Text style={eventTypeBadge}>
              {event.type === 'online'
                ? '🌐 Online Event'
                : event.type === 'hybrid'
                ? '🔀 Hybrid Event'
                : '📍 Präsenz Event'}
            </Text>
          </Section>

          {/* Main Heading */}
          <Heading style={h1}>{event.title}</Heading>

          {/* Greeting & Intro */}
          <Text style={greeting}>Hey {name}!</Text>
          <Text style={intro}>
            {intro || `Der nächste <strong>KINN Treff</strong> steht an:`}
          </Text>

          {/* Event Details Card */}
          <EventDetailsCard
            eventDate={dateStr}
            eventTime={`${timeStr} Uhr`}
            eventType={event.type}
            location={event.location}
            meetingLink={event.meetingLink}
          />

          {/* Description */}
          {event.description && (
            <Text style={description}>{event.description}</Text>
          )}

          {/* Meeting Link Section (Online/Hybrid only) */}
          {(event.type === 'online' || event.type === 'hybrid') && event.meetingLink && (
            <MeetingLinkSection
              meetingLink={event.meetingLink}
              eventType={event.type}
            />
          )}

          {/* RSVP Buttons */}
          <RSVPButtons
            yesUrl={rsvpLinks.yesUrl}
            maybeUrl={rsvpLinks.maybeUrl}
            noUrl={rsvpLinks.noUrl}
          />

          {/* Signature */}
          <Text style={signature}>
            Bis bald!<br />
            <strong>Thomas</strong>
          </Text>

          {/* Footer */}
          <Footer includeUnsubscribe={true} unsubscribeUrl={unsubscribeUrl} />
        </Container>
      </Body>
    </Html>
  );
};

// Styles (Professional Google Calendar Design)
const main = {
  backgroundColor: '#FFFFFF',
  fontFamily: "'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Arial', sans-serif"
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px'
};

const badgeSection = {
  textAlign: 'center',
  marginTop: '24px',
  marginBottom: '16px'
};

const eventTypeBadge = {
  display: 'inline-block',
  backgroundColor: '#E0EEE9',
  color: '#1A1A1A',
  padding: '6px 16px',
  borderRadius: '20px',
  fontSize: '13px',
  fontWeight: '500',
  margin: '0'
};

const h1 = {
  fontSize: '32px',
  fontWeight: '700',
  color: '#1A1A1A',
  textAlign: 'center',
  lineHeight: '1.2',
  margin: '24px 0',
  padding: '0'
};

const greeting = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#3A3A3A',
  marginBottom: '8px',
  marginTop: '24px'
};

const intro = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#3A3A3A',
  marginBottom: '0',
  marginTop: '0'
};

const description = {
  fontSize: '16px',
  lineHeight: '1.618',
  color: '#3A3A3A',
  marginBottom: '0',
  marginTop: '0'
};

const signature = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#3A3A3A',
  marginTop: '32px',
  marginBottom: '32px'
};

export default EventAnnouncement;
