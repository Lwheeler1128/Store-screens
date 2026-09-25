#!/usr/bin/env bash
# Store Screens server installer for Ubuntu 24.04 (run as root from the Droplet Console).
set -euo pipefail
APP=/opt/store-screens
cd "$APP"
say(){ printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }

say "Setting time zone to Eastern"
timedatectl set-timezone America/New_York || true

if ! swapon --show | grep -q .; then
  say "Adding 2 GB of backup memory (swap)"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

say "Installing system updates and tools (a few minutes)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates gnupg ufw debian-keyring debian-archive-keyring apt-transport-https

if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  say "Installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if ! command -v caddy >/dev/null; then
  say "Installing Caddy (secure HTTPS web server)"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi

id screens >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin screens
export PLAYWRIGHT_BROWSERS_PATH="$APP/.browsers"

say "Installing the Store Screens program"
npm install --omit=dev --no-audit --no-fund
npx --yes playwright-core install-deps chromium
npx --yes playwright-core install chromium

# ---- public address: https://<ip-with-dashes>.sslip.io ----
IP=$(curl -fs --max-time 3 http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address || curl -4fs --max-time 5 https://ifconfig.me)
HOST="$(echo "$IP" | tr . -).sslip.io"
PUBLIC="https://$HOST"

if [ ! -f config.json ]; then
  say "First-time setup"
  echo "Paste your Berry access key: the long code after  berry_board_token=  in a Berry dashboard link."
  echo "(Right-click in this window to paste, then press Enter.)"
  read -r TOKEN < /dev/tty
  TOKEN=$(echo "$TOKEN" | tr -d '[:space:]' | sed 's/.*berry_board_token=//; s/&.*//')
  PASS="zax-$(openssl rand -hex 4)"
  TOKEN="$TOKEN" PASS="$PASS" PUBLIC="$PUBLIC" node -e '
    const fs=require("fs");const c=JSON.parse(fs.readFileSync("config.example.json","utf8"));
    c.token=process.env.TOKEN;c.adminPassword=process.env.PASS;c.publicUrl=process.env.PUBLIC;c.host="127.0.0.1";
    fs.writeFileSync("config.json",JSON.stringify(c,null,2));'
  chmod 600 config.json
else
  node -e 'const fs=require("fs");const c=JSON.parse(fs.readFileSync("config.json","utf8"));c.publicUrl=process.argv[1];c.host="127.0.0.1";fs.writeFileSync("config.json",JSON.stringify(c,null,2));' "$PUBLIC"
fi
mkdir -p data && chown -R screens:screens "$APP"

say "Setting up HTTPS for $HOST"
cat > /etc/caddy/Caddyfile <<CADDY
$HOST {
	encode gzip
	request_body {
		max_size 300MB
	}
	reverse_proxy 127.0.0.1:8787
}
CADDY
systemctl enable caddy >/dev/null 2>&1; systemctl restart caddy

say "Turning on the firewall"
ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; ufw --force enable >/dev/null

say "Starting Store Screens and making it start on every reboot"
cat > /etc/systemd/system/store-screens.service <<UNIT
[Unit]
Description=Store Screens (Berry drive-thru feed, content dashboard, TV player)
After=network-online.target
Wants=network-online.target

[Service]
User=screens
WorkingDirectory=$APP
Environment=PLAYWRIGHT_BROWSERS_PATH=$APP/.browsers
Environment=NODE_ENV=production
ExecStart=/usr/bin/node $APP/feeder.js
Restart=always
RestartSec=5
MemoryMax=1700M

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable store-screens >/dev/null 2>&1
systemctl restart store-screens
sleep 6

PASS=$(node -e 'console.log(require("./config.json").adminPassword)')
echo
echo "=================================================================="
echo "  STORE SCREENS IS RUNNING"
echo
echo "  Dashboard:  $PUBLIC/admin"
echo "  Password:   $PASS"
echo "  Store TVs:  $PUBLIC/tv?store=ZBBG10   (use each store's Berry code)"
echo
echo "  The secure certificate can take 1-2 minutes to be ready."
echo "  Status:  systemctl status store-screens     Logs:  journalctl -u store-screens -f"
echo "=================================================================="
