#!/usr/bin/env bash
# Pull the latest version from GitHub and restart. Keeps config.json, uploads and playlist.
set -euo pipefail
cd /opt/store-screens
git config --global --add safe.directory /opt/store-screens
git pull --ff-only
export PLAYWRIGHT_BROWSERS_PATH=/opt/store-screens/.browsers
npm install --omit=dev --no-audit --no-fund
npx --yes playwright-core install chromium
chown -R screens:screens /opt/store-screens
systemctl restart store-screens
echo "Updated and restarted."
