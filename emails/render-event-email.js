/**
 * Render Event Announcement Email (Pure HTML - no JSX)
 *
 * This generates inline HTML email that works with all email clients.
 * No React/JSX required - compatible with Vercel serverless.
 */

export function renderEventEmail({
  name = 'KINN\'der',
  event,
  rsvpLinks = {},
  profileUrl,
  unsubscribeUrl,
  isTest = false,
  rsvpCounts = { yes: 0, maybe: 0 }  // For social proof in plain text
}) {
  const baseUrl = process.env.BASE_URL || 'https://kinn.at';

  // Format event date
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

  // Event type badge text
  const badgeText = event.type === 'online' ? 'Online Event' :
                    event.type === 'hybrid' ? 'Hybrid Event' :
                    'Präsenz Event';

  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${event.title}</title>
</head>
<body style="margin: 0; padding: 40px 20px; background-color: #FFFFFF; font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Arial', sans-serif;">
  <div style="max-width: 600px; margin: 0 auto;">

    <!-- Header with Logo -->
    <div style="text-align: center; margin-bottom: 32px; padding-top: 20px;">
      <img src="https://kinn.at/kinn-logo.png" width="120" alt="KINN Logo" style="margin: 0 auto; display: block;">
    </div>

    <!-- Event Type Badge -->
    <div style="text-align: center; margin-top: 24px; margin-bottom: 16px;">
      <span style="display: inline-block; background-color: #E0EEE9; color: #1A1A1A; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 500;">
        ${badgeText}
      </span>
    </div>

    <!-- Main Heading -->
    <h1 style="font-size: 32px; font-weight: 700; color: #1A1A1A; text-align: center; line-height: 1.2; margin: 24px 0; padding: 0;">
      ${event.title}
    </h1>

    <!-- Greeting & Intro -->
    <p style="font-size: 16px; line-height: 1.6; color: #3A3A3A; margin: 24px 0 8px 0;">Hey ${name}!</p>
    <p style="font-size: 16px; line-height: 1.6; color: #3A3A3A; margin: 0;">
      Der nächste <strong>KINN Treff</strong> steht an:
    </p>

    <!-- Event Details Card -->
    <div style="background-color: #F8F8F8; padding: 24px; border-radius: 12px; margin: 24px 0;">
      <p style="font-size: 13px; font-weight: 600; color: #6B6B6B; margin: 12px 0 4px 0;">Datum</p>
      <p style="font-size: 16px; font-weight: 500; color: #1A1A1A; margin: 0;">${dateStr}</p>

      <p style="font-size: 13px; font-weight: 600; color: #6B6B6B; margin: 12px 0 4px 0;">Uhrzeit</p>
      <p style="font-size: 16px; font-weight: 500; color: #1A1A1A; margin: 0;">${timeStr} Uhr</p>

      ${(event.type === 'in-person' || event.type === 'hybrid') && event.location ? `
      <p style="font-size: 13px; font-weight: 600; color: #6B6B6B; margin: 12px 0 4px 0;">Ort</p>
      <p style="font-size: 16px; font-weight: 500; color: #1A1A1A; margin: 0;">${event.location}</p>
      ` : ''}

      ${(event.type === 'online' || event.type === 'hybrid') && event.meetingLink ? `
      <p style="font-size: 13px; font-weight: 600; color: #6B6B6B; margin: 12px 0 4px 0;">Online-Teilnahme</p>
      <p style="font-size: 16px; font-weight: 500; color: #1A1A1A; margin: 0;">
        <a href="${event.meetingLink}" style="color: #5ED9A6; text-decoration: none; font-weight: 500;">Meeting Link</a>
      </p>
      ` : ''}

      ${rsvpCounts.yes >= 10 ? `
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
        <p style="font-size: 15px; font-weight: 600; color: #5ED9A6; margin: 0;">
          ${rsvpCounts.yes}+ Zusagen${rsvpCounts.maybe > 0 ? ` · ${rsvpCounts.maybe} vielleicht` : ''}
        </p>
      </div>
      ` : ''}
    </div>

    <!-- Description -->
    ${event.description ? `
    <p style="font-size: 16px; line-height: 1.618; color: #3A3A3A; margin: 0;">
      ${event.description.replace(/\n/g, '<br>')}
    </p>
    ` : ''}

    <!-- Meeting Link Section (Online/Hybrid) -->
    ${(event.type === 'online' || event.type === 'hybrid') && event.meetingLink ? `
    <div style="background-color: #E8F4FD; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
      <p style="font-weight: 600; font-size: 16px; margin: 0 0 12px 0; color: #1A1A1A;">
        ${event.type === 'hybrid' ? 'Online-Teilnahme auch möglich' : 'Online-Meeting'}
      </p>
      <a href="${event.meetingLink}" style="display: inline-block; background-color: #5ED9A6; color: #000; font-weight: 600; border-radius: 8px; padding: 14px 32px; text-decoration: none; font-size: 16px; margin: 12px 0;">
        Meeting beitreten
      </a>
      <p style="font-size: 13px; color: #6B6B6B; margin: 12px 0 0 0;">Link wird 15 Minuten vor Beginn aktiviert</p>
    </div>
    ` : ''}

    <!-- RSVP Section -->
    <div style="margin: 32px 0;">
      <p style="font-size: 18px; font-weight: 600; text-align: center; color: #1A1A1A; margin: 0 0 20px 0;">
        Wirst du dabei sein?
      </p>

      <div style="text-align: center; padding-bottom: 12px;">
        <a href="${rsvpLinks.yesUrl || '#'}" style="display: inline-block; background-color: #5ED9A6; color: #000; font-weight: 600; border-radius: 8px; padding: 14px 32px; text-decoration: none; font-size: 16px; min-width: 200px; text-align: center;">
          Ja, bin dabei
        </a>
      </div>

      <div style="text-align: center; padding-bottom: 12px;">
        <a href="${rsvpLinks.maybeUrl || '#'}" style="display: inline-block; background-color: #FFA500; color: #000; font-weight: 600; border-radius: 8px; padding: 14px 32px; text-decoration: none; font-size: 16px; min-width: 200px; text-align: center;">
          Vielleicht
        </a>
      </div>

      <div style="text-align: center; padding-bottom: 12px;">
        <a href="${rsvpLinks.noUrl || '#'}" style="display: inline-block; background-color: #f0f0f0; color: #666; font-weight: 600; border-radius: 8px; padding: 14px 32px; text-decoration: none; font-size: 16px; min-width: 200px; text-align: center;">
          Kann leider nicht
        </a>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #999; margin: 32px 0 0 0; text-align: center;">
        Ein Klick genügt - kein Login nötig.
      </p>
    </div>

    <!-- Profile CTA Section -->
    ${profileUrl ? `
    <div style="margin: 32px 0 24px 0; padding: 24px; background-color: #F8F9FA; border-radius: 12px; border-left: 4px solid #5ED9A6;">
      <p style="font-size: 15px; font-weight: 600; color: #1A1A1A; margin: 0 0 8px 0;">
        Hilf uns, das Event auf dich zuzuschneiden
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #6B6B6B; margin: 0 0 16px 0;">
        Mit deinem Profil wissen wir, welche Themen dich interessieren und
        mit wem wir dich vernetzen können. So wird der Treff für alle wertvoller.
      </p>
      <a href="${profileUrl}" style="font-size: 14px; font-weight: 600; color: #5ED9A6; text-decoration: none;">
        Profil aktualisieren
      </a>
    </div>
    ` : ''}

    <!-- Signature -->
    <p style="font-size: 16px; line-height: 1.6; color: #3A3A3A; margin: 32px 0;">
      Bis bald!<br>
      <strong>Thomas</strong>
    </p>

    <!-- Footer -->
    <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e0e0e0;">
      <p style="font-size: 12px; line-height: 1.6; color: #999; margin: 0; text-align: center;">
        ${unsubscribeUrl ? `<a href="${unsubscribeUrl}" style="color: #999; text-decoration: underline;">Abmelden</a>` : ''}
      </p>
    </div>

  </div>
</body>
</html>`;

  // Plain text version - optimized for deliverability
  // Dynamic social proof (only show if 10+ confirmed)
  const socialProof = rsvpCounts.yes >= 10
    ? `${rsvpCounts.yes}+ Zusagen${rsvpCounts.maybe > 0 ? `, ${rsvpCounts.maybe} vielleicht` : ''}. Und es werden mehr.`
    : '';

  // Build location/online info
  const locationInfo = [];
  if ((event.type === 'in-person' || event.type === 'hybrid') && event.location) {
    locationInfo.push(`WO:       ${event.location}`);
  }
  if ((event.type === 'online' || event.type === 'hybrid') && event.meetingLink) {
    locationInfo.push(`ONLINE:   ${event.meetingLink}`);
  }

  const text = `Hey ${name}!

Der nächste KINN Treff steht an - ${event.title}:

WANN:     ${dateStr}
UHRZEIT:  ${timeStr} Uhr
${locationInfo.join('\n')}
${socialProof ? `\n${socialProof}\n` : ''}
${event.description ? `${event.description}\n` : ''}
---

BIST DU DABEI?

Ja, bin dabei: ${rsvpLinks.yesUrl || '#'}

Vielleicht: ${rsvpLinks.maybeUrl || '#'}

Kann leider nicht: ${rsvpLinks.noUrl || '#'}

Ein Klick genügt - kein Login nötig.

---
${profileUrl ? `
DEIN PROFIL MACHT DEN UNTERSCHIED
Mit deinem Profil wissen wir, welche Themen dich interessieren
und mit wem wir dich vernetzen können.
${profileUrl}

---
` : ''}
Bis bald!
Thomas

${unsubscribeUrl ? `Abmelden: ${unsubscribeUrl}` : ''}
KINN - KI Treff Innsbruck | kinn.at`.trim();

  return { html, text };
}
