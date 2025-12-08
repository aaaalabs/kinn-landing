/**
 * Debug-Version für KINN-RADAR Google Sheets Formatierung
 * Dieses Script gibt detaillierte Informationen aus, was passiert
 */

/**
 * DIESE FUNKTION ZUERST AUSFÜHREN!
 * Zeigt Informationen über dein Sheet
 */
function debugSheetInfo() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = spreadsheet.getSheets();

  let output = "=== SHEET INFORMATION ===\n\n";
  output += "Spreadsheet Name: " + spreadsheet.getName() + "\n";
  output += "Total Sheets: " + sheets.length + "\n\n";

  output += "Available Sheets:\n";
  sheets.forEach((sheet, index) => {
    output += `${index + 1}. "${sheet.getName()}" - ${sheet.getLastRow()} rows, ${sheet.getLastColumn()} columns\n`;
  });

  output += "\n=== CURRENT SHEET ===\n";
  const activeSheet = spreadsheet.getActiveSheet();
  output += "Active Sheet: " + activeSheet.getName() + "\n";
  output += "Rows: " + activeSheet.getLastRow() + "\n";
  output += "Columns: " + activeSheet.getLastColumn() + "\n";

  // Zeige Header-Zeile
  if (activeSheet.getLastRow() > 0) {
    output += "\nHeader Row (first 10 columns):\n";
    const headers = activeSheet.getRange(1, 1, 1, Math.min(10, activeSheet.getLastColumn())).getValues()[0];
    headers.forEach((header, index) => {
      output += `  Column ${String.fromCharCode(65 + index)}: "${header}"\n`;
    });
  }

  // Zeige erste Datenzeile
  if (activeSheet.getLastRow() > 1) {
    output += "\nFirst Data Row (first 10 columns):\n";
    const firstRow = activeSheet.getRange(2, 1, 1, Math.min(10, activeSheet.getLastColumn())).getValues()[0];
    firstRow.forEach((cell, index) => {
      output += `  Column ${String.fromCharCode(65 + index)}: "${cell}"\n`;
    });
  }

  SpreadsheetApp.getUi().alert(output);

  // Log auch in die Konsole
  console.log(output);

  return output;
}

/**
 * Einfache Formatierung für JEDES Sheet
 * Passt sich automatisch an die Struktur an
 */
function simpleFormatAllRows() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('Keine Daten zum Formatieren gefunden!');
    return;
  }

  console.log(`Formatiere Sheet: ${sheetName}`);
  console.log(`Zeilen: ${lastRow}, Spalten: ${lastColumn}`);

  // Hole alle Daten auf einmal (effizienter)
  const dataRange = sheet.getRange(1, 1, lastRow, lastColumn);
  const values = dataRange.getValues();
  const headers = values[0];

  // Finde relevante Spalten-Indizes
  let categoryCol = -1;
  let statusCol = -1;
  let dateCol = -1;
  let titleCol = -1;
  let qualityCol = -1;

  // Suche nach Spalten (case-insensitive)
  headers.forEach((header, index) => {
    const headerLower = String(header).toLowerCase();
    if (headerLower.includes('category') || headerLower.includes('kategorie')) {
      categoryCol = index;
      console.log(`Kategorie-Spalte gefunden: ${String.fromCharCode(65 + index)}`);
    }
    if (headerLower.includes('status')) {
      statusCol = index;
      console.log(`Status-Spalte gefunden: ${String.fromCharCode(65 + index)}`);
    }
    if (headerLower.includes('date') || headerLower.includes('datum')) {
      dateCol = index;
      console.log(`Datum-Spalte gefunden: ${String.fromCharCode(65 + index)}`);
    }
    if (headerLower.includes('title') || headerLower.includes('titel') || headerLower.includes('event')) {
      titleCol = index;
      console.log(`Titel-Spalte gefunden: ${String.fromCharCode(65 + index)}`);
    }
    if (headerLower.includes('quality') || headerLower.includes('qualität')) {
      qualityCol = index;
      console.log(`Quality-Spalte gefunden: ${String.fromCharCode(65 + index)}`);
    }
  });

  let formattedCount = 0;

  // Formatiere Datenzeilen (skip Header)
  for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
    const row = values[rowIndex];
    const sheetRow = rowIndex + 1; // Sheet-Zeilen sind 1-basiert

    // Skip leere Zeilen
    if (row.every(cell => !cell || String(cell).trim() === '')) continue;

    // Formatiere basierend auf Kategorie
    if (categoryCol >= 0 && row[categoryCol]) {
      const category = String(row[categoryCol]).toLowerCase();
      const rowRange = sheet.getRange(sheetRow, 1, 1, lastColumn);

      if (category.includes('ai') || category.includes('ki')) {
        rowRange.setBackground('#F3E8FF'); // Lila für AI
        rowRange.setFontWeight('bold');
        formattedCount++;
      } else if (category.includes('startup')) {
        rowRange.setBackground('#E6F4FF'); // Blau
        formattedCount++;
      } else if (category.includes('workshop')) {
        rowRange.setBackground('#FFF4E6'); // Orange
        formattedCount++;
      } else if (category.includes('network')) {
        rowRange.setBackground('#E8F5E8'); // Grün
        formattedCount++;
      } else if (category.includes('tech')) {
        rowRange.setBackground('#F0F4F8'); // Grau-Blau
        formattedCount++;
      }
    }

    // Formatiere basierend auf Status
    if (statusCol >= 0 && row[statusCol]) {
      const status = String(row[statusCol]);
      const statusRange = sheet.getRange(sheetRow, statusCol + 1);

      if (status.includes('✅')) {
        statusRange.setBackground('#D1FAE5');
        statusRange.setFontColor('#065F46');
      } else if (status.includes('⚠️')) {
        statusRange.setBackground('#FEF3C7');
        statusRange.setFontColor('#92400E');
      } else if (status.includes('❌')) {
        statusRange.setBackground('#FEE2E2');
        statusRange.setFontColor('#991B1B');
      }
    }

    // Formatiere vergangene Events
    if (dateCol >= 0 && row[dateCol]) {
      try {
        const eventDate = new Date(row[dateCol]);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (eventDate < today) {
          const rowRange = sheet.getRange(sheetRow, 1, 1, lastColumn);
          rowRange.setFontColor('#9CA3AF');
          // Hellgrauer Hintergrund nur wenn noch kein anderer Hintergrund
          const currentBg = rowRange.getBackground();
          if (currentBg === '#ffffff' || !currentBg) {
            rowRange.setBackground('#F9FAFB');
          }
        }
      } catch (e) {
        console.log(`Datum-Parsing fehlgeschlagen für Zeile ${sheetRow}: ${e}`);
      }
    }

    // Highlight AI in Titel
    if (titleCol >= 0 && row[titleCol]) {
      const title = String(row[titleCol]).toLowerCase();
      if (title.includes('ai') || title.includes('ki') ||
          title.includes('machine learning') || title.includes('künstliche intelligenz')) {
        const titleRange = sheet.getRange(sheetRow, titleCol + 1);
        titleRange.setFontWeight('bold');
        titleRange.setFontColor('#7C3AED'); // Purple text
      }
    }
  }

  const message = `Formatierung abgeschlossen!\n\n` +
                  `Sheet: ${sheetName}\n` +
                  `Formatierte Zeilen: ${formattedCount}\n` +
                  `Gesamt Zeilen: ${lastRow - 1}`;

  SpreadsheetApp.getUi().alert(message);
  console.log(message);
}

/**
 * Testet die Formatierung mit einer einzelnen Zeile
 */
function testSingleRow() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const row = sheet.getActiveRange().getRow();

  if (row <= 1) {
    SpreadsheetApp.getUi().alert('Bitte wähle eine Datenzeile (nicht den Header)');
    return;
  }

  const rowRange = sheet.getRange(row, 1, 1, sheet.getLastColumn());

  // Teste verschiedene Hintergründe
  rowRange.setBackground('#F3E8FF');

  SpreadsheetApp.getUi().alert(`Zeile ${row} wurde lila gefärbt. Funktioniert es?`);
}

/**
 * Setzt alle Formatierungen zurück
 */
function resetFormatting() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const dataRange = sheet.getDataRange();

  // Zurücksetzen auf Standard
  dataRange.setBackground(null);
  dataRange.setFontColor(null);
  dataRange.setFontWeight('normal');

  SpreadsheetApp.getUi().alert('Alle Formatierungen wurden zurückgesetzt!');
}

/**
 * Menü beim Öffnen
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔧 KINN Debug')
    .addItem('📋 Sheet Info anzeigen', 'debugSheetInfo')
    .addItem('🎨 Einfache Formatierung', 'simpleFormatAllRows')
    .addItem('🧪 Teste einzelne Zeile', 'testSingleRow')
    .addItem('🔄 Formatierung zurücksetzen', 'resetFormatting')
    .addToUi();
}