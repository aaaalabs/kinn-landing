import { google } from 'googleapis';
import logger from '../../lib/logger.js';

// Initialize Google Sheets client
async function getSheetsClient() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    logger.error('[LIST-SHEETS] Failed to initialize Google Sheets client:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
    const sheets = await getSheetsClient();
    const SHEET_ID = process.env.RADAR_GOOGLE_SHEET_ID;

    // Get spreadsheet metadata to list all sheets
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID
    });

    const sheetNames = spreadsheet.data.sheets.map(sheet => ({
      name: sheet.properties.title,
      id: sheet.properties.sheetId,
      index: sheet.properties.index
    }));

    return res.status(200).json({
      success: true,
      spreadsheetTitle: spreadsheet.data.properties.title,
      sheets: sheetNames,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SHEET_ID}`
    });

  } catch (error) {
    logger.error('[LIST-SHEETS] Error:', error);
    return res.status(500).json({
      error: 'Failed to list sheets',
      message: error.message
    });
  }
}