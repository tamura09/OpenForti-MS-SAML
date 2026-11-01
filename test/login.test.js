const assert = require("node:assert/strict");
const { test } = require("node:test");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, writeFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const validSecret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

function runLogin(secret, browserStub, setup = "") {
  return spawnSync(process.execPath, ["-e", `
    ${setup}
    require.cache[require.resolve("puppeteer")] = { exports: ${browserStub} };
    require("./login_and_get_cookie.js");
  `], {
    cwd: root,
    env: { ...process.env, TOTP_SECRET: secret },
    encoding: "utf8",
    timeout: 5000,
  });
}

test("invalid TOTP secrets fail without launching a browser or disclosing the secret", () => {
  for (const secret of ["", "JBSWY3DPEHPK3PXP", "not-a-base32-secret!"]) {
    const result = runLogin(secret, `{
      async launch() { console.error("UNEXPECTED_BROWSER_LAUNCH"); throw new Error(); }
    }`);
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Invalid TOTP_SECRET/);
    assert.doesNotMatch(result.stderr, /UNEXPECTED_BROWSER_LAUNCH/);
    if (secret) assert.ok(!result.stderr.includes(secret));
  }
});

test("login failure closes the browser and reports failure without leaking provider details", () => {
  const result = runLogin(validSecret, `{
    async launch() {
      console.log("browser launched");
      return {
        async newPage() { throw new Error("private-provider-details"); },
        async close() { console.log("browser closed"); }
      };
    }
  }`);
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "browser launched\nbrowser closed\n");
  assert.match(result.stderr, /VPN login failed/);
  assert.doesNotMatch(result.stderr, /private-provider-details/);
});

test("successful login generates a fresh OTP after validation and closes the browser", () => {
  const result = runLogin(validSecret, `{
    async launch() {
      return {
        async newPage() {
          const frame = {
            name: () => "", $: async () => ({}),
            async type(selector, token) {
              require("node:assert/strict").equal(token, "050471");
            }
          };
          return {
            setUserAgent: async () => {}, setExtraHTTPHeaders: async () => {},
            goto: async () => {}, waitForSelector: async () => {},
            type: async () => {}, click: async () => {},
            keyboard: { press: async () => {} }, frames: () => [frame],
            cookies: async () => [{ name: "SVPNCOOKIE", value: "test-cookie" }]
          };
        },
        async close() { console.error("browser closed"); }
      };
    }
  }`, `
    require("timers/promises").setTimeout = async () => {};
    const otplib = require("otplib");
    let calls = 0;
    require.cache[require.resolve("otplib")].exports = {
      generate: options => otplib.generate({ ...options, epoch: ++calls === 1 ? 59 : 1111111111 })
    };
    process.on("beforeExit", () => require("node:assert/strict").equal(calls, 2));
  `);
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "SVPNCOOKIE=test-cookie\n");
  assert.equal(result.stderr, "browser closed\n");
});

test("wrapper rejects output from a failed login and waits before retrying", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "openforti-retry-"));
  try {
    const commands = {
      logger: "exit 0",
      node: "echo SVPNCOOKIE=must-not-use; exit 1",
      sudo: "echo UNEXPECTED_VPN_CONNECTION >&2; exit 1",
      sleep: 'echo "retry-delay=$1"; kill -TERM "$PPID"',
    };
    for (const [name, body] of Object.entries(commands)) {
      writeFileSync(path.join(dir, name), `#!/bin/bash\n${body}\n`, { mode: 0o755 });
    }
    const result = spawnSync("/bin/bash", [path.join(root, "script.sh")], {
      env: { ...process.env, PATH: `${dir}:/usr/bin:/bin` },
      encoding: "utf8",
      timeout: 5000,
    });
    assert.ifError(result.error);
    assert.equal(result.signal, "SIGTERM");
    assert.match(result.stdout, /Failed to get cookie/);
    assert.match(result.stdout, /retry-delay=30/);
    assert.doesNotMatch(result.stderr, /UNEXPECTED_VPN_CONNECTION/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
