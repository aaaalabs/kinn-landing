#!/bin/bash
# Generate 800x800 thumbnails for all spotlight images
# Uses macOS sips (no ImageMagick needed)

SPOTLIGHT_DIR="$(dirname "$0")/../spotlight"

echo "Generating spotlight thumbnails..."

for dir in "$SPOTLIGHT_DIR"/*/; do
  if [ -d "$dir" ]; then
    id=$(basename "$dir")

    # Find the original image (png or jpg)
    for ext in png jpg jpeg PNG JPG JPEG; do
      for img in "$dir"kspot_*.${ext}; do
        if [ -f "$img" ]; then
          filename=$(basename "$img")
          thumb_name="${filename%.*}_thumb.jpg"
          thumb_path="$dir$thumb_name"

          # Skip if thumbnail already exists and is newer than source
          if [ -f "$thumb_path" ] && [ "$thumb_path" -nt "$img" ]; then
            echo "  [$id] Thumbnail up to date: $thumb_name"
            continue
          fi

          echo "  [$id] Creating thumbnail: $thumb_name"

          # Create a copy first (sips modifies in place)
          cp "$img" "$thumb_path"

          # Resize to 800x800 (maintains aspect ratio, fits within bounds)
          sips -Z 800 "$thumb_path" --out "$thumb_path" > /dev/null 2>&1

          # Convert to JPEG with 85% quality
          sips -s format jpeg -s formatOptions 85 "$thumb_path" --out "$thumb_path" > /dev/null 2>&1

          # Show file sizes
          orig_size=$(ls -lh "$img" | awk '{print $5}')
          thumb_size=$(ls -lh "$thumb_path" | awk '{print $5}')
          echo "    Original: $orig_size → Thumbnail: $thumb_size"
        fi
      done
    done
  fi
done

echo "Done!"
