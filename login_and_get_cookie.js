const puppeteer = require("puppeteer");
const { authenticator } = require("otplib");
const { setTimeout } = require("timers/promises");

(async () => {
  const USERNAME = process.env.SVPN_USER;
  const PASSWORD = process.env.SVPN_PASS;
  const TOTP_SECRET = process.env.TOTP_SECRET;

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );
  await page.setExtraHTTPHeaders({ "Accept-Language": "ja-JP,ja;q=0.9" });

// TODO: Replace the URL below with your actual SAML login start URL
await page.goto("https://{Replace the URL below with your actual SAML login start URL}/remote/saml/start?redirect=1", {
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
    await browser.close();
    process.exit(1);
  }

  const otp = authenticator.generate(TOTP_SECRET);
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
    await browser.close();
    process.exit(1);
  }

  await browser.close();
})();
