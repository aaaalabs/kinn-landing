import { google } from 'googleapis';

// Initialize Google Sheets client
async function getSheetsClient() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error('[RADAR Info] Failed to initialize Google Sheets client:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('[RADAR Info] Updating info sheet...');

    const SHEET_ID = process.env.RADAR_GOOGLE_SHEET_ID;
    if (!SHEET_ID) {
      throw new Error('RADAR_GOOGLE_SHEET_ID not configured');
    }

    // German explanations for the Info tab
    const infoContent = [
      ['📊 KINN-RADAR Informationen', ''],
      ['', ''],
      ['🎯 Systemübersicht', ''],
      ['Was ist RADAR?', 'KI-gestütztes Event-Aggregationssystem für kostenlose Veranstaltungen in Tirol'],
      ['Ziel', 'Automatische Erfassung aller kostenlosen AI/Tech/Startup Events'],
      ['Methoden', 'Newsletter-Verarbeitung, Website-Scraping, RSS-Feeds'],
      ['Update-Frequenz', 'Newsletter: Bei Empfang | Websites: Täglich | Sync: Alle 5 Minuten'],
      ['', ''],

      ['📋 Tab: Active Events', ''],
      ['Beschreibung', 'Alle zukünftigen Events mit Details'],
      ['Status Symbole', ''],
      ['🔴', 'Diese Woche (innerhalb 7 Tage)'],
      ['🟡', 'Nächste Woche (8-14 Tage)'],
      ['🟢', 'Zukunft (mehr als 14 Tage)'],
      ['⚫', 'Vergangen'],
      ['', ''],
      ['Kategorie Emojis', ''],
      ['🤖', 'AI - Künstliche Intelligenz, Machine Learning, ChatGPT'],
      ['💻', 'Tech - Programmierung, Software, IT, DevOps'],
      ['🚀', 'Startup - Gründung, Pitch, Investor, Entrepreneurship'],
      ['💡', 'Innovation - Digitale Transformation, Future Tech'],
      ['💼', 'Business - Marketing, Sales, Management, Networking'],
      ['📚', 'Education - Workshop, Training, Seminar'],
      ['📌', 'Other - Sonstige Events'],
      ['', ''],

      ['📊 Tab: Sources', ''],
      ['Beschreibung', 'Übersicht aller Event-Quellen und deren Status'],
      ['Status Symbole', ''],
      ['✅ Active', 'Quelle funktioniert, innerhalb 24h geprüft'],
      ['⚠️ Stale', 'Quelle braucht Überprüfung (24-72h ohne Check)'],
      ['❌ Error', 'Quelle fehlerhaft (mehr als 72h ohne Erfolg)'],
      ['⏸️ Inactive', 'Quelle noch nicht aktiviert'],
      ['', ''],
      ['Qualität', ''],
      ['⭐⭐⭐', 'HIGH - Hochwertige Quellen (InnCubator, Startup.Tirol, WKO, AI Austria)'],
      ['⭐⭐', 'MEDIUM - Mittlere Priorität (Unis, FHs, LSZ)'],
      ['⭐', 'LOW - Niedrige Priorität (Tourismus, allgemeine Events)'],
      ['🧪', 'TEST - Testquellen für Entwicklung'],
      ['', ''],
      ['Spalten Erklärung', ''],
      ['Source', 'Name der Event-Quelle'],
      ['Status', 'Aktueller Funktionsstatus'],
      ['Quality', 'Qualitätsbewertung der Quelle'],
      ['This Month', 'Gefundene Events diesen Monat'],
      ['Last 30 Days', 'Events der letzten 30 Tage'],
      ['Last Check', 'Zeitpunkt der letzten Überprüfung'],
      ['Type', 'Web = Website-Scraping | Newsletter = Email-Verarbeitung'],
      ['Schedule', 'Daily = Täglich | Weekly = Wöchentlich | As received = Bei Empfang'],
      ['URL', 'Link zur Event-Quelle'],
      ['', ''],

      ['📈 Tab: Statistics', ''],
      ['Beschreibung', 'Kennzahlen und Metriken des Systems'],
      ['Total Events', 'Gesamtanzahl aller erfassten Events'],
      ['Future Events', 'Anzahl zukünftiger Events'],
      ['This Week', 'Events in den nächsten 7 Tagen'],
      ['Past Events', 'Bereits vergangene Events'],
      ['Newsletters Processed', 'Anzahl verarbeiteter Newsletter'],
      ['Events Added', 'Erfolgreich hinzugefügte Events'],
      ['Events Rejected', 'Abgelehnte Events (nicht kostenlos/nicht Tirol)'],
      ['', ''],

      ['🔍 Filterkriterien', ''],
      ['KOSTENLOS', 'Nur Events ohne Eintritt/Gebühren'],
      ['TIROL', 'Nur Events in Tirol (Innsbruck, Hall, Kufstein, etc.)'],
      ['ÖFFENTLICH', 'Nur öffentlich zugängliche Events (keine Members-only)'],
      ['KATEGORISIERUNG', 'Automatische Zuordnung zu AI/Tech/Startup/Business/etc.'],
      ['', ''],

      ['📅 iCal Feed', ''],
      ['URL', 'https://kinn.at/api/radar/calendar.ics'],
      ['Inhalt', 'Nur AI-kategorisierte Events (gefiltert)'],
      ['Format', 'Standard iCalendar (.ics) kompatibel mit allen Kalender-Apps'],
      ['Update', 'Automatisch alle 4 Stunden'],
      ['', ''],

      ['🛠️ Technische Details', ''],
      ['AI Model', 'OpenAI GPT-OSS-20B für Event-Extraktion'],
      ['Datenbank', 'Redis (Upstash) für Event-Speicherung'],
      ['Sync Engine', 'Google Sheets API für Tabellen-Updates'],
      ['Hosting', 'Vercel Serverless Functions'],
      ['', ''],

      ['📧 Newsletter Einreichung', ''],
      ['Email', 'radar@in.kinn.at'],
      ['Verarbeitung', 'Automatisch bei Empfang'],
      ['Dauer', 'Ca. 30 Sekunden pro Newsletter'],
      ['Unterstützt', 'HTML und Plain-Text Newsletter'],
      ['', ''],

      ['🚀 Geplante Erweiterungen', ''],
      ['Phase 1', 'Mehr Event-Quellen aktivieren (MCI, FH Kufstein, DIH West)'],
      ['Phase 2', 'WhatsApp-Reminder für Events'],
      ['Phase 3', 'Personalisierte Event-Empfehlungen'],
      ['Phase 4', 'Event-Anmeldung direkt aus Sheet'],
      ['', ''],

      ['💡 Tipps', ''],
      ['Google Sheets', 'Filter verwenden für spezifische Kategorien'],
      ['iCal Abo', 'In Kalender-App abonnieren für automatische Updates'],
      ['Newsletter', 'Weiterleiten an radar@in.kinn.at für Verarbeitung'],
      ['', ''],

      ['📞 Support', ''],
      ['Kontakt', 'thomas@kinn.at'],
      ['GitHub', 'https://github.com/aaaalabs/kinn-landing'],
      ['Status', 'System läuft automatisch 24/7'],
      ['', ''],
      ['Letzte Aktualisierung', new Date().toLocaleString('de-AT', { timeZone: 'Europe/Vienna' })]
    ];

    // Get sheets client
    const sheets = await getSheetsClient();

    // Clear and update Info sheet
    const range = 'Info!A:B';

    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: range
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'Info!A1',
      valueInputOption: 'RAW',
      resource: {
        values: infoContent
      }
    });

    console.log('[RADAR Info] Successfully updated info sheet');

    return res.status(200).json({
      success: true,
      lines_written: infoContent.length,
      sheet_url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}#gid=3` // Assuming Info is 4th tab
    });

  } catch (error) {
    console.error('[RADAR Info] Update error:', error);
    return res.status(500).json({
      error: 'Info update failed',
      message: error.message
    });
  }
}