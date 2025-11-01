import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Button,
  Hr,
} from '@react-email/components';

interface OptInEmailProps {
  confirmUrl: string;
}

export default function OptInEmail({ confirmUrl }: OptInEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={content}>
            <Text style={heading}>Servus! 👋</Text>

            <Text style={paragraph}>
              Du hast dich für den <strong>KINN KI Treff Innsbruck</strong> eingetragen.
            </Text>

            <Text style={paragraph}>
              Ein Klick, und du bekommst alle KI-Events direkt in deinen
              Google Kalender – <strong>kein Newsletter, keine Spam-Mails</strong>.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={confirmUrl}>
                Ja, ich bin dabei! 🧠
              </Button>
            </Section>

            <Text style={info}>
              Dieser Link ist 48 Stunden gültig.
            </Text>

            <Hr style={hr} />

            <Text style={footer}>
              KINN – Wo Tiroler KI Profil bekommt
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
};

const content = {
  padding: '40px',
};

const heading = {
  fontSize: '24px',
  lineHeight: '1.3',
  fontWeight: '300',
  color: '#333',
  marginBottom: '20px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.618',
  color: '#000',
  marginBottom: '16px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#E0EEE9',
  borderRadius: '12px',
  color: '#000',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const info = {
  fontSize: '12px',
  lineHeight: '1.5',
  color: '#666',
  textAlign: 'center' as const,
};

const hr = {
  borderColor: '#e0e0e0',
  margin: '32px 0',
};

const footer = {
  fontSize: '12px',
  lineHeight: '1.5',
  color: '#ccc',
  textAlign: 'center' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};
