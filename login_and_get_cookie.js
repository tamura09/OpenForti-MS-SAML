const puppeteer = require("puppeteer");
const { generate } = require("otplib");
const { setTimeout } = require("timers/promises");

(async () => {
  const USERNAME = process.env.SVPN_USER;
  const PASSWORD = process.env.SVPN_PASS;
  const TOTP_SECRET = process.env.TOTP_SECRET;
  const VPN_GW = process.env.VPN_GW;
  const VPN_PORT = process.env.VPN_PORT;

  // Reject incompatible secrets before sending credentials to the identity provider.
  // Generate again immediately before entry so the login uses a fresh token.
  try {
    await generate({ secret: TOTP_SECRET });
  } catch {
    console.error("Invalid TOTP_SECRET: provide a valid Base32 secret of at least 16 decoded bytes.");
    process.exitCode = 1;
    return;
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({ "Accept-Language": "ja-JP,ja;q=0.9" });

    await page.goto("https://"+VPN_GW+":"+VPN_PORT+"/remote/saml/start?redirect=1", {
      waitUntil: "networkidle2"
    });

    await page.waitForSelector("#i0116", { timeout: 15000 });
    await page.type("#i0116", USERNAME);
    await page.keyboard.press("Enter");

    await page.waitForSelector("#i0118", { timeout: 15000 });
    await page.type("#i0118", PASSWORD);
    await setTimeout(1000)
    await page.keyboard.press("Enter");

    // Find the OTP frame
    let otpFrame = null;
    for (let i = 0; i < 30; i++) {
      await setTimeout(1000);
      const frames = page.frames();
      otpFrame = frames.find(f => f.name() === "" || f.url().includes("microsoft"));
      if (otpFrame) {
        const exists = await otpFrame.$("#idTxtBx_SAOTCC_OTC");
        if (exists) break;
      }
    }

    if (!otpFrame) {
      console.error("OTP frame not found");
      process.exitCode = 1;
      return;
    }

    const otp = await generate({ secret: TOTP_SECRET });
    await otpFrame.type("#idTxtBx_SAOTCC_OTC", otp);
    await setTimeout(600)
    await page.keyboard.press("Enter");

    try {
      await page.waitForSelector("#idSIButton9", { timeout: 10000 });
      await page.click("#idSIButton9");
    } catch (e) {
      // optional
    }

    await setTimeout(5000);

    const cookies = await page.cookies();
    const svpn = cookies.find(c => c.name === "SVPNCOOKIE");
    if (svpn) {
      console.log("SVPNCOOKIE=" + svpn.value);
    } else {
      console.error("SVPNCOOKIE not found");
      process.exitCode = 1;
      return;
    }

  } finally {
    await browser.close();
  }
})().catch(() => {
  // Do not expose credentials, tokens, or provider response details in logs.
  console.error("VPN login failed. Check configuration, browser, and authentication settings.");
  process.exitCode = 1;
});
