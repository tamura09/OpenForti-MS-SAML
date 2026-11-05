const assert = require("node:assert/strict");
const { test } = require("node:test");
const { generate } = require("otplib");

// Public RFC 6238 SHA-1 test secret; these timestamps use seconds in otplib v13.
const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

test("TOTP matches RFC 6238 vectors with Microsoft-compatible defaults", async () => {
  for (const [epoch, expected] of [
    [59, "287082"],
    [1111111109, "081804"],
    [1111111111, "050471"],
    [1234567890, "005924"],
    [2000000000, "279037"],
    [20000000000, "353130"],
  ]) {
    assert.equal(await generate({ secret, epoch }), expected);
  }
});

test("TOTP rejects secrets below the v13 minimum length", async () => {
  await assert.rejects(generate({ secret: "JBSWY3DPEHPK3PXP" }));
});

test("Puppeteer loads from CommonJS and exposes the launch API", () => {
  assert.equal(typeof require("puppeteer").launch, "function");
});
