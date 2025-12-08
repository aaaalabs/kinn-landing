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
    console.error('[INFO-UPDATE] Failed to initialize Google Sheets client:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check admin auth
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.RADAR_ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('[INFO-UPDATE] Updating Info sheet...');

    const sheets = await getSheetsClient();
    const SHEET_ID = process.env.RADAR_GOOGLE_SHEET_ID;

    // Updated Info content with new traffic light system
    const infoContent = [
      ['KINN-RADAR Event Aggregation System', '', ''],
      ['', '', ''],
      ['📊 Status-System (Ampelsystem)', '', ''],
      ['Status', 'Bedeutung', 'Beispiel'],
      ['✅ X events', 'Erfolgreich extrahierte Events', '✅ 8 events'],
      ['⚠️ X duplicates', 'Alle gefundenen Events waren Duplikate', '⚠️ 3 duplicates'],
      ['⚠️ No events', 'Keine Events auf der Seite gefunden', '⚠️ No events'],
      ['⏱️ Timeout', 'Extraktion hat zu lange gedauert', '⏱️ Timeout'],
      ['🔐 Auth needed', 'Authentifizierung erforderlich', '🔐 Auth needed'],
      ['❌ Error', 'Fehler bei der Extraktion', '❌ Error'],
      ['', '', ''],
      ['⭐ Quality-System', '', ''],
      ['Quality', 'Bedeutung', 'Kriterien'],
      ['⭐⭐⭐', 'Exzellent', '10+ Events mit 50%+ Erfolgsrate'],
      ['⭐⭐', 'Gut', '5+ Events mit 30%+ Erfolgsrate'],
      ['⭐', 'Funktioniert', 'Mindestens 1 Event extrahiert'],
      ['❌', 'Defekt', 'Events gefunden aber keine extrahiert'],
      ['🔍', 'Leer', 'Funktioniert aber aktuell keine Events'],
      ['⚠️', 'Fehler', 'Extraktion fehlgeschlagen'],
      ['', '', ''],
      ['🧹 Duplikat-Erkennung', '', ''],
      ['', 'Automatische Entfernung von Duplikaten basierend auf:', ''],
      ['', '• Titel + Datum (nicht Location)', ''],
      ['', '• Behält Version mit meisten Daten', ''],
      ['', '• Scoring-System für Datenqualität', ''],
      ['', '', ''],
      ['📅 Event-Kategorisierung', '', ''],
      ['Kategorie', 'Auto-Erkennung', 'Keywords'],
      ['🤖 AI', 'Automatisch', 'AI, KI, Machine Learning, GPT, LLM'],
      ['💻 Tech', 'Standard', 'Andere Tech-Events'],
      ['', '', ''],
      ['📊 Sheets', '', ''],
      ['Events', 'Zukünftige Events (ohne Duplikate)', ''],
      ['Archive', 'Alle Events inkl. vergangene', ''],
      ['Sources', 'Status aller Event-Quellen', ''],
      ['Summary', 'Statistiken und Metriken', ''],
      ['Info', 'Diese Dokumentation', ''],
      ['', '', ''],
      ['🔄 Letzte Aktualisierung', new Date().toLocaleString('de-AT'), '']
    ];

    // Clear Info sheet (try different possible sheet names)
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: 'Info!A:C'
      });
    } catch (e) {
      // Try "Information" if "Info" doesn't exist
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: 'Information!A:C'
      });
    }

    // Update Info sheet
    const sheetRange = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Info!A1'
    }).catch(() => ({ range: 'Information!A1' }));

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: sheetRange.range || 'Info!A1',
      valueInputOption: 'RAW',
      resource: {
        values: infoContent
      }
    });

    // Format headers
    const requests = [
      {
        repeatCell: {
          range: {
            sheetId: 4, // Info sheet ID (adjust if different)
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: 3
          },
          cell: {
            userEnteredFormat: {
              textFormat: {
                bold: true,
                fontSize: 14
              }
            }
          },
          fields: 'userEnteredFormat.textFormat'
        }
      },
      {
        repeatCell: {
          range: {
            sheetId: 4,
            startRowIndex: 2,
            endRowIndex: 3,
            startColumnIndex: 0,
            endColumnIndex: 1
          },
          cell: {
            userEnteredFormat: {
              textFormat: {
                bold: true,
                fontSize: 12
              }
            }
          },
          fields: 'userEnteredFormat.textFormat'
        }
      }
    ];

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      resource: {
        requests: requests
      }
    }).catch(err => {
      console.log('[INFO-UPDATE] Formatting failed (non-critical):', err.message);
    });

    console.log('[INFO-UPDATE] Info sheet updated successfully');

    return res.status(200).json({
      success: true,
      message: 'Info sheet updated with new traffic light system',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[INFO-UPDATE] Fatal error:', error);
    return res.status(500).json({
      error: 'Info update failed',
      message: error.message
    });
  }
}