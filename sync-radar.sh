#!/bin/bash

# KINN-RADAR Sync Script
# Syncs events to Google Sheets with duplicate removal

echo "🎯 KINN-RADAR Sync & Cleanup"
echo "============================="
echo ""

# Check if token is provided as argument or prompt for it
if [ -z "$1" ]; then
    echo -n "Enter Admin Token: "
    read -s ADMIN_TOKEN
    echo ""
else
    ADMIN_TOKEN=$1
fi

echo "📊 Syncing events to Google Sheets..."
echo "⚙️  Removing duplicates automatically..."
echo ""

# Run sync
response=$(curl -X POST https://kinn.at/api/radar/sync-events-to-sheets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  --max-time 60 \
  -s)

# Check if successful
if echo "$response" | grep -q '"success":true'; then
    echo "✅ Sync successful!"
    echo ""
    echo "📈 Statistics:"
    echo "$response" | grep -oE '"[a-zA-Z]+":([0-9]+|"[^"]*")' | sed 's/"//g' | sed 's/:/ = /g'
    echo ""
    echo "📊 View Google Sheet:"
    echo "https://docs.google.com/spreadsheets/d/$(echo "$response" | grep -oE 'spreadsheets/d/[^"]*' | cut -d'/' -f3)"
else
    echo "❌ Sync failed!"
    echo "$response" | grep -oE '"error":"[^"]*"' | sed 's/"error":"//g' | sed 's/"//g'
fi

echo ""
echo "🔄 To update the Info sheet with new documentation:"
echo "curl -X POST https://kinn.at/api/radar/update-info-sheet -H \"Authorization: Bearer $ADMIN_TOKEN\""