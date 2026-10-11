#!/usr/bin/env bash
# Creates (first run) and starts an Android TV emulator, then installs the app on it.
# Needs internet off the corporate VPN for the one-time system image download (~1 GB).
# Usage: npm run android:tv            (packaged app, data from https://tvtime.online)
#        CAP_SERVER_URL=http://10.0.2.2:3000 npm run android:tv   (local `npm run dev`)
set -euo pipefail

SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_HOME="$SDK"
BIN="$SDK/cmdline-tools/latest/bin"
ABI="$( [ "$(uname -m)" = "arm64" ] && echo arm64-v8a || echo x86_64 )"
IMAGE="system-images;android-34;android-tv;$ABI"
AVD="TTT_Android_TV"

if ! "$BIN/avdmanager" list avd -c | grep -qx "$AVD"; then
  echo "Installing Android TV system image ($IMAGE)..."
  yes | "$BIN/sdkmanager" --install "$IMAGE" "platform-tools" "emulator" >/dev/null
  echo "no" | "$BIN/avdmanager" create avd -n "$AVD" -k "$IMAGE" -d tv_1080p
fi

if ! "$SDK/platform-tools/adb" devices | grep -q "^emulator-"; then
  echo "Starting $AVD..."
  "$SDK/emulator/emulator" -avd "$AVD" -netdelay none -netspeed full >/dev/null 2>&1 &
  "$SDK/platform-tools/adb" wait-for-device
  until [ "$("$SDK/platform-tools/adb" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 2; done
fi

[ -n "${CAP_SERVER_URL:-}" ] || node scripts/build-app-bundle.mjs
npx cap sync android
npx cap run android --target "$("$SDK/platform-tools/adb" devices | awk '/^emulator-/{print $1; exit}')"
