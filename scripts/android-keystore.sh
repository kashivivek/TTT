#!/bin/sh
# Creates the Play Store upload key (android/upload-keystore.jks) and android/keystore.properties.
# Both are git-ignored. Back them up somewhere safe: losing them means you can't ship updates
# without a key reset through Play Console support.
set -e
cd "$(dirname "$0")/../android"

if [ -f upload-keystore.jks ]; then
  echo "android/upload-keystore.jks already exists. Delete it first if you really want a new key."
  exit 1
fi

printf "Choose a keystore password (min 6 chars): "
stty -echo; read -r STORE_PASS; stty echo; echo

keytool -genkeypair -v \
  -keystore upload-keystore.jks \
  -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$STORE_PASS" -keypass "$STORE_PASS" \
  -dname "CN=TV Time Tracker, O=TV Time Tracker, C=US"

cat > keystore.properties <<EOF
storeFile=upload-keystore.jks
storePassword=$STORE_PASS
keyAlias=upload
keyPassword=$STORE_PASS
EOF

echo ""
echo "Created android/upload-keystore.jks and android/keystore.properties."
echo "Back up BOTH files (e.g. in your password manager)."
