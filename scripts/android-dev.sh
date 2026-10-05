#!/bin/sh
# Runs the Android app against the Next.js dev server on this Mac (no deploy needed).
# 1) In another terminal: npm run dev:lan   2) Phone on the same Wi-Fi as the Mac.
set -e
cd "$(dirname "$0")/.."

IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)"
if [ -z "$IP" ]; then
  echo "Couldn't find this Mac's Wi-Fi IP. Run: CAP_SERVER_URL=http://<ip>:3000 npx cap run android"
  exit 1
fi

echo "App will load http://$IP:3000 (make sure 'npm run dev:lan' is running)"
CAP_SERVER_URL="http://$IP:3000" npx cap sync android
CAP_SERVER_URL="http://$IP:3000" npx cap run android

# Point the installed project back at production so release builds aren't affected.
npx cap sync android >/dev/null
echo "Done. Re-run 'npm run android:run' later to install the production-pointing app again."
