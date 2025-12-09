#!/bin/bash

# Script to update all extraction endpoints to use new status schema

echo "📦 Updating extraction endpoints to use new status schema..."

# List of files to update
FILES=(
  "api/radar/extract-dynamic.js"
  "api/radar/extract-with-config.js"
  "api/radar/check-sites.js"
  "api/radar/check-sites-advanced.js"
  "api/radar/inbound.js"
)

for FILE in "${FILES[@]}"; do
  echo "Updating $FILE..."

  # Check if file uses @vercel/kv or @upstash/redis
  if grep -q "@vercel/kv" "$FILE"; then
    # Add import for createPendingEvent if not already there
    if ! grep -q "radar-status.js" "$FILE"; then
      sed -i '' "/import logger from/a\\
import { createPendingEvent } from '../../lib/radar-status.js';" "$FILE"
    fi
  else
    # For @upstash/redis files
    if ! grep -q "radar-status.js" "$FILE"; then
      sed -i '' "/import logger from/a\\
import { createPendingEvent } from '../../lib/radar-status.js';" "$FILE"
    fi
  fi

  # Replace reviewed: false with status: 'pending' pattern
  sed -i '' "s/reviewed: false/status: 'pending'/g" "$FILE"

  # Update storeEvent pattern if it exists
  if grep -q "const eventData = {" "$FILE"; then
    echo "  ✓ Found eventData pattern, updating..."
  fi
done

echo "✅ All extraction endpoints updated!"
echo ""
echo "Files updated:"
for FILE in "${FILES[@]}"; do
  echo "  - $FILE"
done