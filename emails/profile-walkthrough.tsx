import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Img,
  Link
} from '@react-email/components';
import * as React from 'react';
import { Button } from './components/button';
import { Footer } from './components/footer';

interface ProfileWalkthroughProps {
  name?: string;
  profileUrl?: string;
  unsubscribeUrl?: string;
}

export const ProfileWalkthrough = ({
  name = 'Thomas',
  profileUrl = 'https://kinn.at/api/auth/login?redirect=profil',
  unsubscribeUrl = 'https://kinn.at/api/auth/login?redirect=settings'
}: ProfileWalkthroughProps) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* KINN Logo */}
          <Section style={logoSection}>
            <Img
              src="https://kinn.at/kinn-logo.svg"
              width="280"
              alt="KINN Logo"
              style={logo}
            />
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={greeting}>Hey {name}!</Text>

            <Text style={paragraph}>
              <strong>Quick question:</strong> Hast du schon dein KINN Profil ausgefüllt?
            </Text>

            <Text style={paragraph}>
              Beim letzten Stammtisch waren 25 Leute da – AI Devs, Freelancer,
              Studenten, ein Startup-Gründer. Die größte Herausforderung?
              Herauszufinden, <strong>wer genau was kann und wer was sucht</strong>.
            </Text>

            <Text style={paragraph}>
              Deshalb haben wir ein <strong>Supply/Demand Matching System</strong> gebaut:
            </Text>

            {/* Feature Boxes */}
            <Section style={featureBox}>
              <Text style={featureTitle}>1. Supply: Was du kannst</Text>
              <Text style={featureText}>
                Skills, Experience Level, Verfügbarkeit
              </Text>
            </Section>

            <Section style={featureBox}>
              <Text style={featureTitle}>2. Demand: Was du suchst</Text>
              <Text style={featureText}>
                Job, Freelance, Cofounder, Collaboration, Learning
              </Text>
            </Section>

            <Section style={featureBox}>
              <Text style={featureTitle}>3. Matching vor Ort</Text>
              <Text style={featureText}>
                Thomas macht Intros beim nächsten Event
              </Text>
            </Section>

            <Text style={paragraph}>
              <strong>Dauert 5 Minuten, lohnt sich für die nächsten 6 Monate.</strong>
            </Text>

            {/* CTA */}
            <Section style={{ textAlign: 'center', margin: '32px 0' }}>
              <Button href={profileUrl} variant="primary">
                Profil jetzt erstellen
              </Button>
            </Section>

            <Text style={meta}>
              PS: Profil ist optional, aber ohne kannst du nicht gematcht werden.
            </Text>

            <Text style={signature}>
              Bis zum nächsten KINN Treff!<br/>
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
  fontFamily: "'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px'
};

const logoSection = {
  textAlign: 'center' as const,
  padding: '40px 20px 20px'
};

const logo = {
  margin: '0 auto',
  filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.06))'
};

const content = {
  padding: '20px'
};

const greeting = {
  fontSize: '16px',
  lineHeight: '1.618',
  color: '#3A3A3A',
  marginBottom: '16px',
  marginTop: '0'
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.618',
  color: '#3A3A3A',
  marginBottom: '16px',
  marginTop: '0'
};

const featureBox = {
  backgroundColor: 'rgba(94, 217, 166, 0.08)',
  padding: '16px',
  borderRadius: '8px',
  marginBottom: '12px',
  borderLeft: '4px solid #5ED9A6'
};

const featureTitle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#2C3E50',
  marginBottom: '4px',
  marginTop: '0'
};

const featureText = {
  fontSize: '14px',
  color: '#666',
  marginBottom: '0',
  marginTop: '0',
  lineHeight: '1.5'
};

const meta = {
  fontSize: '14px',
  lineHeight: '1.618',
  color: '#999',
  marginTop: '24px',
  marginBottom: '0'
};

const signature = {
  fontSize: '16px',
  lineHeight: '1.618',
  color: '#3A3A3A',
  marginTop: '32px',
  marginBottom: '0'
};

export default ProfileWalkthrough;
