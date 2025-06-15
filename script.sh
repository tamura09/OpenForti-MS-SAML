#!/bin/bash

# Set the variable for the Node.js script path
export SVPN_USER="your_username"  # Replace with your actual username
export SVPN_PASS="your_passwd"    # Replace with your actual password
export TOTP_SECRET="your_totp_secret"  # TOTP secret key

# log file path
LOGFILE="$HOME/vpn.log"

# Get directory of the current script (for referencing the JS file in the same directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# loop to get the cookie and connect to VPN
while true; do
  echo "[$(date)] Getting SVPN cookie..." | tee -a "$LOGFILE"

  cookie=$(node "$SCRIPT_DIR/login_and_get_cookie.js")
  if [[ "$cookie" == SVPNCOOKIE=* ]]; then
    echo "[$(date)] Cookie acquired. Connecting VPN..." | tee -a "$LOGFILE"

    echo "$cookie" | sudo openfortivpn {Replace the URL below with your actual SAML login start URL}:{your_port} \
      --cookie-on-stdin -u "" -p "" \
      | tee -a "$LOGFILE"
    
    echo "[$(date)] VPN disconnected. Retrying in 10 seconds..." | tee -a "$LOGFILE"
    sleep 10
  else
    echo "[$(date)] Failed to get cookie. Retrying in 10 seconds..." | tee -a "$LOGFILE"
    sleep 10
  fi
done