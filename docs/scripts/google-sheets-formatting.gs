/**
 * Google Apps Script für KINN-RADAR Event Formatierung
 * Installation:
 * 1. Google Sheet öffnen
 * 2. Extensions → Apps Script
 * 3. Code einfügen und speichern
 * 4. Trigger einrichten: Triggers → Add Trigger → onEdit → On edit
 */

/**
 * Wird automatisch bei jeder Änderung aufgerufen
 * NICHT manuell ausführen - nur durch Sheet-Änderungen!
 */
function onEdit(e) {
  // Sicherheitscheck - e kann undefined sein wenn manuell ausgeführt
  if (!e || !e.source) {
    console.log("Funktion muss durch Sheet-Edit ausgelöst werden, nicht manuell!");
    return;
  }

  try {
    const sheet = e.source.getActiveSheet();
    const sheetName = sheet.getName();

    // Nur auf bestimmten Sheets aktiv
    if (!['Active Events', 'Events', 'Sources'].includes(sheetName)) {
      return;
    }

    const range = e.range;
    const row = range.getRow();

    // Formatierung für Events Sheet
    if (sheetName === 'Active Events' || sheetName === 'Events') {
      formatEventRow(sheet, row);
    }

    // Formatierung für Sources Sheet
    if (sheetName === 'Sources') {
      formatSourceRow(sheet, row);
    }

  } catch (error) {
    console.error("Fehler in onEdit:", error);
  }
}

/**
 * Formatiert eine Event-Zeile basierend auf Kategorie
 */
function formatEventRow(sheet, row) {
  // Skip header row
  if (row <= 1) return;

  try {
    // Annahme: Kategorie ist in Spalte E (5)
    const categoryCell = sheet.getRange(row, 5);
    const category = categoryCell.getValue();

    // Ganze Zeile formatieren
    const rowRange = sheet.getRange(row, 1, 1, sheet.getLastColumn());

    // Farben basierend auf Kategorie
    switch(category) {
      case 'AI':
        rowRange.setBackground('#F3E8FF');     // Soft Purple
        rowRange.setFontWeight('bold');
        break;
      case 'Startup':
        rowRange.setBackground('#E6F4FF');     // Soft Blue
        break;
      case 'Workshop':
        rowRange.setBackground('#FFF4E6');     // Soft Orange
        break;
      case 'Networking':
        rowRange.setBackground('#E8F5E8');     // Soft Green
        break;
      case 'Tech':
        rowRange.setBackground('#F0F4F8');     // Soft Gray-Blue
        break;
      default:
        rowRange.setBackground(null);          // Clear formatting
        rowRange.setFontWeight('normal');
    }

    // Extra: Vergangene Events grau färben
    const dateCell = sheet.getRange(row, 2); // Annahme: Datum in Spalte B
    const eventDate = dateCell.getValue();
    if (eventDate && new Date(eventDate) < new Date()) {
      rowRange.setFontColor('#9CA3AF');
      rowRange.setBackground('#F9FAFB');
    }

  } catch (error) {
    console.error("Fehler beim Formatieren der Event-Zeile:", error);
  }
}

/**
 * Formatiert eine Source-Zeile basierend auf Status
 */
function formatSourceRow(sheet, row) {
  // Skip header row
  if (row <= 1) return;

  try {
    // Annahme: Status ist in Spalte B (2)
    const statusCell = sheet.getRange(row, 2);
    const status = statusCell.getValue();

    // Status-Zelle formatieren
    if (status) {
      // Grüne Hintergründe für erfolgreiche
      if (status.includes('✅')) {
        statusCell.setBackground('#D1FAE5');
        statusCell.setFontColor('#065F46');
      }
      // Gelbe für Warnungen
      else if (status.includes('⚠️')) {
        statusCell.setBackground('#FEF3C7');
        statusCell.setFontColor('#92400E');
      }
      // Rote für Fehler
      else if (status.includes('❌')) {
        statusCell.setBackground('#FEE2E2');
        statusCell.setFontColor('#991B1B');
      }
      // Blaue für Timeouts
      else if (status.includes('⏱️')) {
        statusCell.setBackground('#DBEAFE');
        statusCell.setFontColor('#1E40AF');
      }
    }

    // Quality-Spalte formatieren (Annahme: Spalte C)
    const qualityCell = sheet.getRange(row, 3);
    const quality = qualityCell.getValue();

    if (quality) {
      if (quality.includes('⭐⭐⭐')) {
        qualityCell.setFontColor('#059669');
        qualityCell.setFontWeight('bold');
      } else if (quality.includes('⭐⭐')) {
        qualityCell.setFontColor('#0891B2');
      } else if (quality.includes('⭐')) {
        qualityCell.setFontColor('#6B7280');
      } else if (quality.includes('❌')) {
        qualityCell.setFontColor('#DC2626');
      }
    }

  } catch (error) {
    console.error("Fehler beim Formatieren der Source-Zeile:", error);
  }
}

/**
 * Manuelle Funktion zum Testen der Formatierung
 * Diese kannst du manuell ausführen!
 */
function testFormatting() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();

  if (sheetName === 'Active Events' || sheetName === 'Events') {
    // Formatiere alle Event-Zeilen
    const lastRow = sheet.getLastRow();
    for (let row = 2; row <= lastRow; row++) {
      formatEventRow(sheet, row);
    }
    SpreadsheetApp.getUi().alert('Event-Formatierung angewendet!');
  } else if (sheetName === 'Sources') {
    // Formatiere alle Source-Zeilen
    const lastRow = sheet.getLastRow();
    for (let row = 2; row <= lastRow; row++) {
      formatSourceRow(sheet, row);
    }
    SpreadsheetApp.getUi().alert('Source-Formatierung angewendet!');
  } else {
    SpreadsheetApp.getUi().alert('Bitte wechsle zu Events oder Sources Sheet!');
  }
}

/**
 * Menü-Eintrag hinzufügen für manuelle Formatierung
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('KINN-RADAR')
    .addItem('Formatierung anwenden', 'testFormatting')
    .addItem('Alle AI Events highlighten', 'highlightAIEvents')
    .addSeparator()
    .addItem('Über', 'showAbout')
    .addToUi();
}

/**
 * Highlightet alle AI Events
 */
function highlightAIEvents() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    // Suche nach AI in verschiedenen Spalten
    const hasAI = row.some(cell =>
      String(cell).toLowerCase().includes('ai') ||
      String(cell).toLowerCase().includes('ki') ||
      String(cell).toLowerCase().includes('machine learning')
    );

    if (hasAI) {
      const rowRange = sheet.getRange(i + 1, 1, 1, sheet.getLastColumn());
      rowRange.setBackground('#F3E8FF');
      rowRange.setBorder(true, true, true, true, false, false, '#8B5CF6', SpreadsheetApp.BorderStyle.SOLID);
    }
  }

  SpreadsheetApp.getUi().alert('AI Events wurden hervorgehoben!');
}

/**
 * Zeigt Info-Dialog
 */
function showAbout() {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>KINN-RADAR Formatierung</h2>
      <p>Dieses Script formatiert automatisch:</p>
      <ul>
        <li>✅ Events nach Kategorie (AI = Lila)</li>
        <li>📊 Sources nach Status</li>
        <li>⭐ Quality-Bewertungen</li>
        <li>📅 Vergangene Events (grau)</li>
      </ul>
      <p><strong>Verwendung:</strong></p>
      <ol>
        <li>Änderungen werden automatisch formatiert</li>
        <li>Manuelle Formatierung über Menü möglich</li>
        <li>AI Events können speziell hervorgehoben werden</li>
      </ol>
    </div>
  `;

  const dialog = HtmlService.createHtmlOutput(html)
    .setWidth(400)
    .setHeight(300);

  SpreadsheetApp.getUi().showModalDialog(dialog, 'Über KINN-RADAR');
}