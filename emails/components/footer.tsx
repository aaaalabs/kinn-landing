import { Hr, Text, Link, Section } from '@react-email/components';
import * as React from 'react';

interface FooterProps {
  includeUnsubscribe?: boolean;
  unsubscribeUrl?: string;
}

export const Footer = ({ includeUnsubscribe = false, unsubscribeUrl }: FooterProps) => {
  return (
    <>
      <Hr style={{ borderColor: '#e0e0e0', margin: '32px 0 24px 0' }} />

      <Section style={{ padding: '0 20px' }}>
        <Text style={{
          fontSize: '12px',
          lineHeight: '1.618',
          color: '#999',
          margin: '0 0 16px 0'
        }}>
          <strong style={{ fontWeight: '600' }}>KINN – KI Treff Innsbruck</strong><br/>
          Thomas Seiger<br/>
          E-Mail: thomas@kinn.at<br/>
          Web: <Link href="https://kinn.at" style={{ color: '#999', textDecoration: 'underline' }}>kinn.at</Link>
        </Text>

        <Text style={{
          fontSize: '11px',
          lineHeight: '1.618',
          color: '#999',
          margin: '0'
        }}>
          <Link href="https://kinn.at/pages/privacy.html" style={{ color: '#999', textDecoration: 'none' }}>
            Datenschutz
          </Link>
          {' | '}
          <Link href="https://kinn.at/pages/impressum.html" style={{ color: '#999', textDecoration: 'none' }}>
            Impressum
          </Link>
          {includeUnsubscribe && unsubscribeUrl && (
            <>
              {' | '}
              <Link href={unsubscribeUrl} style={{ color: '#999', textDecoration: 'none' }}>
                Abmelden
              </Link>
            </>
          )}
        </Text>
      </Section>
    </>
  );
};
