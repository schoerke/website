#!/bin/bash

# Download WordPress media files locally to avoid Node.js SSL issues
# Usage:
#   bash scripts/wordpress/utils/downloadMedia.sh                          # uses media-urls.json
#   bash scripts/wordpress/utils/downloadMedia.sh post-image-urls.json     # uses named JSON file

set -e

# Resolve paths relative to the script's own location (scripts/wordpress/)
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MEDIA_DIR="$SCRIPT_DIR/data/downloaded-media"
MEDIA_JSON="$SCRIPT_DIR/data/${1:-media-urls.json}"

mkdir -p "$MEDIA_DIR"

echo "📥 Downloading media files from WordPress..."
echo ""

# Parse JSON and download each file
cat "$MEDIA_JSON" | jq -r '.[] | .url' | while read -r url; do
  # Extract filename and clean WordPress timestamp postfixes
  filename=$(basename "$url" | sed 's/%20/ /g' | sed -E 's/-e[0-9]+(-|\.)/\1/g')
  filepath="$MEDIA_DIR/$filename"
  
  if [ -f "$filepath" ]; then
    echo "⏭️  Skip: $filename (already exists)"
  else
    echo "📥 Download: $filename"
    curl -sS -L "$url" -o "$filepath" || echo "❌ Failed: $filename"
  fi
done

echo ""
echo "✅ Download complete!"
echo "📁 Files saved to: $MEDIA_DIR"
ls -lh "$MEDIA_DIR" | tail -5
