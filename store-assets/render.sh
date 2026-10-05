#!/bin/sh
# Renders all Google Play listing images into store-assets/play/ using headless Chrome.
# Usage: sh store-assets/render.sh   (re-run after editing templates/screens.html)
set -e
cd "$(dirname "$0")"
ROOT="$(pwd)"
TPL="file://$ROOT/templates/screens.html"
OUT="$ROOT/play"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || CHROME="/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"

rm -rf "$OUT" && mkdir -p "$OUT/phone" "$OUT/tablet-7in" "$OUT/tablet-10in" "$OUT/tv"

# shot <kind> <shot> <cssW> <cssH> <scale> <out.png>
shot() {
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --force-device-scale-factor="$5" --window-size="$3,$4" --virtual-time-budget=1500 \
    --screenshot="$6" "$TPL?kind=$1&shot=$2" >/dev/null 2>&1
}

# Play requires screenshots/feature graphic without transparency: convert to high-quality JPEG.
to_jpg() {
  sips -s format jpeg -s formatOptions 92 "$1" --out "${1%.png}.jpg" >/dev/null && rm "$1"
}

NAMES="01-track 02-alerts 03-calendar 04-import 05-where-to-watch 06-ai-picks 07-stats-badges 08-community"
i=1
for name in $NAMES; do
  shot phone "$i" 360 640 3 "$OUT/phone/$name.png" && to_jpg "$OUT/phone/$name.png"
  shot tablet7 "$i" 600 960 2 "$OUT/tablet-7in/$name.png" && to_jpg "$OUT/tablet-7in/$name.png"
  shot tablet10 "$i" 800 1280 2 "$OUT/tablet-10in/$name.png" && to_jpg "$OUT/tablet-10in/$name.png"
  i=$((i + 1))
done

j=1
for name in 01-continue-watching 02-upcoming 03-show-details 04-ai-picks; do
  shot tv "$j" 960 540 2 "$OUT/tv/$name.png" && to_jpg "$OUT/tv/$name.png"
  j=$((j + 1))
done

shot tvbanner 1 640 360 2 "$OUT/tv/tv-banner-1280x720.png"
shot feature 1 1024 500 1 "$OUT/feature-graphic-1024x500.png" && to_jpg "$OUT/feature-graphic-1024x500.png"
sips -s format png -z 512 512 "$ROOT/../public/logo.png" --out "$OUT/app-icon-512.png" >/dev/null

echo "Rendered:"
find "$OUT" -type f | sort | while read -r f; do
  printf "  %-55s %s\n" "${f#$ROOT/}" "$(sips -g pixelWidth -g pixelHeight "$f" | awk '/pixel/{printf "%s ", $2}')"
done
