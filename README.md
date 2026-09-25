# Store Screens

In-store TV signage for our stores: a content dashboard, a TV player per store, and a live
multi-store drive-thru leaderboard read from each store's Berry AI dashboard.

- `feeder.js` – the server (reads Berry, serves the dashboard, TV player and leaderboard)
- `public/` – dashboard (`/admin`), TV player (`/tv?store=CODE`), leaderboard (`/board`)
- `config.example.json` – store list and settings. The real `config.json` (with the Berry
  access key and dashboard password) lives only on the server and is never committed.

## Install on a new Ubuntu 24.04 server (DigitalOcean Droplet Console, as root)

    git clone https://github.com/YOUR-USERNAME/store-screens /opt/store-screens && bash /opt/store-screens/install.sh

## Update to the latest version

    bash /opt/store-screens/update.sh
