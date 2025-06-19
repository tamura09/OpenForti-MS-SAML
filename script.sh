#!/bin/bash

# Set the variable for the Node.js script path
export SVPN_USER="your_username"  # Replace with your actual username
export SVPN_PASS="your_passwd"    # Replace with your actual password
export TOTP_SECRET="your_totp_secret"  # TOTP secret key
export VPN_GW="your_vpn_gateway" # Replace with your actual VPN gateway
export VPN_PORT="your_vpn_gateway_port" # Replace with your actual VPN port

# Get directory of the current script (for referencing the JS file in the same directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# loop to get the cookie and connect to VPN
logger -t OpenFortiVPN "Getting SVPN cookie..."

# loop to get the cookie and connect to VPN
while true; do
  cookie=$(node "$SCRIPT_DIR/login_and_get_cookie.js")
  if [[ "$cookie" == SVPNCOOKIE=* ]]; then
    logger -t OpenFortiVPN "Cookie acquired. Connecting VPN..."
    echo "[$(date)] Cookie acquired. Connecting VPN..."
    echo "$cookie" | sudo openfortivpn "$VPN_GW":"$VPN_PORT"/remote/saml/start --cookie-on-stdin | logger -t OpenFortiVPN
    logger -t OpenFortiVPN "VPN disconnected."
    echo "[$(date)] VPN disconnected."
  else
    logger -t OpenFortiVPN "Failed to get cookie."
    echo "[$(date)] Failed to get cookie."
  fi
done