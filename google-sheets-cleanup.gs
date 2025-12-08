/**
 * KINN-RADAR Google Sheets Cleanup Script
 * Entfernt Duplikate basierend auf Titel + Datum
 * Behält die Version mit den meisten Daten
 *
 * Installation:
 * 1. Öffne dein Google Sheet
 * 2. Extensions → Apps Script
 * 3. Lösche den Standard-Code
 * 4. Füge diesen Code ein
 * 5. Speichern (Ctrl+S)
 * 6. Run → cleanupDuplicates
 */

function cleanupDuplicates() {
  // Konfiguration - passe diese Werte an dein Sheet an
  const SHEET_NAME = 'Events'; // Name des Sheets
  const HEADER_ROW = 1; // Zeile mit den Überschriften

  // Spalten-Indices (0-basiert)
  const COLUMNS = {
    EVENT_ID: 0,    // A
    TITLE: 1,       // B
    DATE: 2,        // C
    TIME: 3,        // D
    LOCATION: 4,    // E
    CITY: 5,        // F
    CATEGORY: 6,    // G
    SOURCE: 7,      // H
    DETAIL_URL: 8,  // I
    REGISTRATION: 9, // J
    DESCRIPTION: 10, // K
    ADDED: 11,      // L
    STATUS: 12      // M
  };

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Sheet "${SHEET_NAME}" nicht gefunden!`);
    return;
  }

  // Alle Daten holen (ohne Header)
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow <= HEADER_ROW) {
    SpreadsheetApp.getUi().alert('Keine Daten zum Bereinigen gefunden.');
    return;
  }

  const range = sheet.getRange(HEADER_ROW + 1, 1, lastRow - HEADER_ROW, lastCol);
  const data = range.getValues();

  console.log(`Analysiere ${data.length} Events...`);

  // Duplikate finden
  const eventMap = new Map();
  const rowsToDelete = [];
  const stats = {
    total: data.length,
    duplicates: 0,
    removed: 0,
    kept: 0
  };

  // Durchgehe alle Zeilen
  data.forEach((row, index) => {
    const actualRowNum = index + HEADER_ROW + 1; // Tatsächliche Zeilennummer im Sheet

    const title = (row[COLUMNS.TITLE] || '').toString().trim();
    const date = (row[COLUMNS.DATE] || '').toString().trim();

    // Skip leere Zeilen
    if (!title || !date) {
      rowsToDelete.push(actualRowNum);
      console.log(`Zeile ${actualRowNum}: Leer (kein Titel oder Datum)`);
      return;
    }

    // Erstelle eindeutigen Schlüssel
    const key = `${title.toLowerCase()}|${date}`;

    // Berechne Daten-Vollständigkeits-Score
    const score = calculateDataScore(row, COLUMNS);

    if (eventMap.has(key)) {
      // Duplikat gefunden!
      const existing = eventMap.get(key);
      stats.duplicates++;

      console.log(`Duplikat gefunden: "${title}" am ${date}`);
      console.log(`  - Zeile ${existing.row}: Score ${existing.score}`);
      console.log(`  - Zeile ${actualRowNum}: Score ${score}`);

      if (score > existing.score) {
        // Neue Zeile hat mehr Daten - lösche die alte
        rowsToDelete.push(existing.row);
        eventMap.set(key, {
          row: actualRowNum,
          score: score,
          data: row
        });
        console.log(`  → Behalte Zeile ${actualRowNum} (mehr Daten)`);
      } else if (score === existing.score) {
        // Gleicher Score - behalte die neuere (spätere Zeile)
        rowsToDelete.push(existing.row);
        eventMap.set(key, {
          row: actualRowNum,
          score: score,
          data: row
        });
        console.log(`  → Behalte Zeile ${actualRowNum} (neuere Version)`);
      } else {
        // Alte Zeile hat mehr Daten - lösche die neue
        rowsToDelete.push(actualRowNum);
        console.log(`  → Behalte Zeile ${existing.row} (mehr Daten)`);
      }
    } else {
      // Erstes Vorkommen
      eventMap.set(key, {
        row: actualRowNum,
        score: score,
        data: row
      });
    }
  });

  stats.removed = rowsToDelete.length;
  stats.kept = stats.total - stats.removed;

  // Bestätigung vom Benutzer
  if (rowsToDelete.length > 0) {
    const ui = SpreadsheetApp.getUi();
    const result = ui.alert(
      'Duplikate gefunden!',
      `Gefunden: ${stats.duplicates} Duplikate\n` +
      `Zu löschen: ${stats.removed} Zeilen\n` +
      `Zu behalten: ${stats.kept} Zeilen\n\n` +
      'Möchtest du die Duplikate entfernen?',
      ui.ButtonSet.YES_NO
    );

    if (result === ui.Button.YES) {
      // Sortiere Zeilen absteigend (von unten nach oben löschen)
      rowsToDelete.sort((a, b) => b - a);

      // Lösche Zeilen von unten nach oben
      let deletedCount = 0;
      rowsToDelete.forEach(rowNum => {
        sheet.deleteRow(rowNum - deletedCount);
        deletedCount++;
        console.log(`Gelöscht: Zeile ${rowNum}`);
      });

      // Erfolgsmeldung
      ui.alert(
        'Bereinigung abgeschlossen!',
        `✅ ${stats.removed} Duplikate entfernt\n` +
        `📊 ${stats.kept} Events behalten\n\n` +
        'Das Sheet wurde erfolgreich bereinigt.',
        ui.ButtonSet.OK
      );

      // Log für Debugging
      console.log('=== BEREINIGUNG ABGESCHLOSSEN ===');
      console.log(`Total Events: ${stats.total}`);
      console.log(`Duplikate gefunden: ${stats.duplicates}`);
      console.log(`Zeilen entfernt: ${stats.removed}`);
      console.log(`Events behalten: ${stats.kept}`);

    } else {
      ui.alert('Bereinigung abgebrochen', 'Keine Änderungen vorgenommen.', ui.ButtonSet.OK);
    }
  } else {
    SpreadsheetApp.getUi().alert(
      'Keine Duplikate gefunden!',
      'Das Sheet ist bereits sauber. 🎉',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Berechnet einen Score basierend auf der Datenvollständigkeit
 * Höherer Score = mehr ausgefüllte Felder
 */
function calculateDataScore(row, COLUMNS) {
  let score = 0;

  // Wichtige Felder (höhere Gewichtung)
  if (row[COLUMNS.TITLE] && row[COLUMNS.TITLE].toString().trim()) score += 3;
  if (row[COLUMNS.DATE] && row[COLUMNS.DATE].toString().trim()) score += 3;
  if (row[COLUMNS.TIME] && row[COLUMNS.TIME].toString().trim()) score += 2;
  if (row[COLUMNS.LOCATION] && row[COLUMNS.LOCATION].toString().trim()) score += 2;
  if (row[COLUMNS.DETAIL_URL] && row[COLUMNS.DETAIL_URL].toString().trim()) score += 2;

  // Zusätzliche Felder (niedrigere Gewichtung)
  if (row[COLUMNS.CITY] && row[COLUMNS.CITY].toString().trim()) score += 1;
  if (row[COLUMNS.CATEGORY] && row[COLUMNS.CATEGORY].toString().trim()) score += 1;
  if (row[COLUMNS.SOURCE] && row[COLUMNS.SOURCE].toString().trim()) score += 1;
  if (row[COLUMNS.REGISTRATION] && row[COLUMNS.REGISTRATION].toString().trim()) score += 1;
  if (row[COLUMNS.DESCRIPTION] && row[COLUMNS.DESCRIPTION].toString().trim()) score += 1;

  // Bonus für längere Beschreibungen
  const description = row[COLUMNS.DESCRIPTION] ? row[COLUMNS.DESCRIPTION].toString() : '';
  if (description.length > 100) score += 1;
  if (description.length > 200) score += 1;

  return score;
}

/**
 * Zusätzliche Hilfsfunktion: Zeigt Statistiken ohne zu löschen
 */
function analyzeDuplicates() {
  const SHEET_NAME = 'Events';
  const HEADER_ROW = 1;

  const COLUMNS = {
    TITLE: 1,  // B
    DATE: 2    // C
  };

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Sheet "${SHEET_NAME}" nicht gefunden!`);
    return;
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow <= HEADER_ROW) {
    SpreadsheetApp.getUi().alert('Keine Daten gefunden.');
    return;
  }

  const range = sheet.getRange(HEADER_ROW + 1, 1, lastRow - HEADER_ROW, lastCol);
  const data = range.getValues();

  const duplicateMap = new Map();

  data.forEach((row, index) => {
    const title = (row[COLUMNS.TITLE] || '').toString().trim();
    const date = (row[COLUMNS.DATE] || '').toString().trim();

    if (!title || !date) return;

    const key = `${title.toLowerCase()}|${date}`;

    if (!duplicateMap.has(key)) {
      duplicateMap.set(key, []);
    }
    duplicateMap.get(key).push(index + HEADER_ROW + 1);
  });

  // Finde nur die mit Duplikaten
  const duplicates = [];
  duplicateMap.forEach((rows, key) => {
    if (rows.length > 1) {
      const [title, date] = key.split('|');
      duplicates.push({
        title: title,
        date: date,
        count: rows.length,
        rows: rows.join(', ')
      });
    }
  });

  if (duplicates.length > 0) {
    let message = `Gefundene Duplikate:\n\n`;
    duplicates.forEach(dup => {
      message += `• "${dup.title}" am ${dup.date}\n`;
      message += `  ${dup.count}x in Zeilen: ${dup.rows}\n\n`;
    });

    SpreadsheetApp.getUi().alert('Duplikat-Analyse', message, SpreadsheetApp.getUi().ButtonSet.OK);
  } else {
    SpreadsheetApp.getUi().alert('Keine Duplikate gefunden', 'Das Sheet enthält keine Duplikate! 🎉', SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Menü beim Öffnen des Sheets hinzufügen
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🧹 KINN-RADAR Cleanup')
    .addItem('Duplikate entfernen', 'cleanupDuplicates')
    .addItem('Duplikate analysieren (nur anzeigen)', 'analyzeDuplicates')
    .addToUi();
}

/**
 * Manuelle Trigger-Funktion für Tests
 */
function testCleanup() {
  // Erstelle Test-Daten
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Test');
  if (!sheet) {
    SpreadsheetApp.getActiveSpreadsheet().insertSheet('Test');
  }

  const testData = [
    ['Event ID', 'Title', 'Date', 'Time', 'Location', 'City', 'Category', 'Source', 'Detail URL', 'Registration', 'Description', 'Added', 'Status'],
    ['1', 'AI Workshop', '2024-12-15', '18:00', 'InnCubator', 'Innsbruck', 'AI', 'InnCubator', 'https://example.com/1', '', 'Ein toller Workshop', '2024-12-01', 'Upcoming'],
    ['2', 'AI Workshop', '2024-12-15', '18:00', '', '', 'Tech', 'WKO', '', '', '', '2024-12-02', 'Upcoming'], // Duplikat mit weniger Daten
    ['3', 'Startup Meetup', '2024-12-20', '19:00', 'Impact Hub', 'Innsbruck', 'Networking', 'Impact Hub', 'https://example.com/3', '', 'Networking Event', '2024-12-01', 'Upcoming'],
    ['4', 'AI Workshop', '2024-12-15', '18:00', 'InnCubator', 'Innsbruck', 'AI', 'Startup.Tirol', 'https://example.com/4', 'https://register.com', 'Ein sehr detaillierter Workshop mit vielen Informationen über KI und Machine Learning', '2024-12-03', 'Upcoming'], // Duplikat mit mehr Daten
  ];

  const testSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Test');
  testSheet.clear();

  const range = testSheet.getRange(1, 1, testData.length, testData[0].length);
  range.setValues(testData);

  SpreadsheetApp.getUi().alert('Test-Daten erstellt', 'Test-Sheet wurde mit Beispiel-Duplikaten erstellt.', SpreadsheetApp.getUi().ButtonSet.OK);
}