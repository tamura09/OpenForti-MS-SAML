# OpenForti-MS-SAML

Forti VPN that requires Microsoft SAML authentication to stay connected in the CLI environment.

# OpenFortiVPN + Puppeteer TOTP SAML Login Script

This repository contains two scripts to automate VPN login for SSL-VPN using SAML authentication with TOTP (Time-based One-Time Password):

- `login_and_get_cookie.js`: A Node.js script using Puppeteer to log in via SAML and extract the `SVPNCOOKIE`.
- `script.sh`: A shell script that runs the above script in a loop and connects to the VPN using `openfortivpn`.

## 🔧 Requirements

- Node.js (v18+ recommended)
- `openfortivpn`
- A valid TOTP secret key
- Your SAML login credentials (username and password)

## 📦 Installation

1.  Install Node.js and `openfortivpn`:

    ```bash
    sudo apt install nodejs npm openfortivpn
    ```

1.  Install Node.js packages
    From the directory where login_and_get_cookie.js is located:

    ```bash
    npm install puppeteer otplib timers
    ```

## 🛠️ Configuration

### Set environment variables

You can either modify them directly in `script.sh`:

```sh
export SVPN_USER="your_username"
export SVPN_PASS="your_password"
export TOTP_SECRET="your_totp_secret"
export VPN_GW="your_vpn_gateway"
export VPN_PORT="your_vpn_gateway_port"
```

## ▶️ Usage

Make the shell script executable

```bash
chmod +x script.sh
```

Then run:

```bash
./script.sh
```

## 📄 Logging

All output is logged to: `~/vpn.log`

## ⚙️ sudo Without Password (Optional)

To avoid entering your password every time for openfortivpn, you can allow passwordless sudo for it:

```bash
sudo visudo
```

Add the following line (replace your_username with your actual user):

```bash
your_username ALL=(ALL) NOPASSWD: /usr/bin/openfortivpn
```

## 🧪 Debugging

### ❗️ Running as root causes Chrome launch error

If you run the script as the root user (e.g. via sudo node login_and_get_cookie.js), Puppeteer may fail to launch Chrome and show an error like the following:

```
Error: Could not find Chrome (ver. 137.0.7151.70). This can occur if either
1. you did not perform an installation before running the script (e.g. `npx puppeteer browsers install chrome`) or
2. your cache path is incorrectly configured (which is: /root/.cache/puppeteer).
```

This happens because:

- Chrome was installed for your normal user, but root has a different home directory and cache path (/root/.cache/puppeteer).
- Running Puppeteer as root also often requires additional flags like --no-sandbox, which are already set in this script, but are not sufficient if the Chrome binary is missing.

If the cookie is not obtained, check the following:

- Your credentials and TOTP secret are correct.
- The page layout has not changed (e.g. different selectors).
- Network issues or certificate errors.

You can also modify the script to run in non-headless mode:

```javascript
const browser = await puppeteer.launch({
headless: false,
args: ["--no-sandbox", "--disable-setuid-sandbox"]
});
```
