#!/usr/bin/env bash
# Add another Berry access key (for stores on a different Berry account). Run in the Droplet Console.
set -euo pipefail
cd /opt/store-screens
echo "Paste a Berry dashboard link from the other account, then press Enter:"
read -r LINK < /dev/tty
TOKEN=$(echo "$LINK" | tr -d '[:space:]' | sed 's/.*berry_board_token=//; s/&.*//')
if [ ${#TOKEN} -lt 40 ]; then echo "That doesn't look like a Berry link. Nothing was changed."; exit 1; fi
TOKEN="$TOKEN" node -e '
  const fs=require("fs");const c=JSON.parse(fs.readFileSync("config.json","utf8"));
  c.tokens=Array.isArray(c.tokens)?c.tokens:[];
  if(c.token===process.env.TOKEN||c.tokens.includes(process.env.TOKEN)){console.log("That key is already saved.");}
  else{c.tokens.push(process.env.TOKEN);fs.writeFileSync("config.json",JSON.stringify(c,null,2));console.log("Berry key saved. The server now has "+(1+c.tokens.length)+" keys.");}'
chown screens:screens config.json; chmod 600 config.json
systemctl restart store-screens
echo "Restarted Store Screens."
