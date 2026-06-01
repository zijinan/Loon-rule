#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

const scannedExtensions = new Set([
  ".conf",
  ".js",
  ".list",
  ".lpx",
  ".plugin",
]);

const allowedPrivateFiles = new Set([
  "Loon/private.example.conf",
]);

const sensitivePathPatterns = [
  /\.p12$/i,
  /\.mobileconfig$/i,
  /\.key$/i,
  /\.pem$/i,
  /\.cer$/i,
  /\.crt$/i,
  /(^|\/)backups?\//i,
];

const allowedPlaceholder = /(YOUR_|REMOVED|PLACEHOLDER|EXAMPLE_|LOCAL_ONLY|localhost)/i;

const contentChecks = [
  {
    name: "proxy URI",
    pattern: /\b(vmess|vless|trojan|ss|ssr|hysteria2|hy2|tuic):\/\//i,
    allow: () => false,
  },
  {
    name: "MITM ca-p12",
    pattern: /^\s*#?\s*ca-p12\s*=\s*(.+)\s*$/i,
    allow: (value) => value.trim() === "" || allowedPlaceholder.test(value),
  },
  {
    name: "MITM ca-passphrase",
    pattern: /^\s*#?\s*ca-passphrase\s*=\s*(.+)\s*$/i,
    allow: (value) => value.trim() === "" || allowedPlaceholder.test(value),
  },
  {
    name: "password assignment",
    pattern: /\bpassword\s*=\s*([^,\s#]+)/i,
    allow: (value) => allowedPlaceholder.test(value),
  },
  {
    name: "uuid assignment",
    pattern: /\buuid\s*=\s*([^,\s#]+)/i,
    allow: (value) => allowedPlaceholder.test(value),
  },
  {
    name: "token assignment",
    pattern: /\b(token|access_token|refresh_token)\s*=\s*([^,\s#]+)/i,
    allow: (_value, match) => allowedPlaceholder.test(match[2]),
  },
];

function gitTrackedFiles() {
  const output = execFileSync("git", ["ls-files"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return output.split(/\r?\n/).filter(Boolean).map((file) => file.replace(/\\/g, "/"));
}

function shouldScanContent(file) {
  if (!/^(Loon|QuantumultX|shadowrocket|scripts)\//.test(file)) return false;
  return scannedExtensions.has(path.extname(file).toLowerCase());
}

function checkPath(file, failures) {
  if (allowedPrivateFiles.has(file)) return;
  for (const pattern of sensitivePathPatterns) {
    if (pattern.test(file)) {
      failures.push(`${file}: tracked sensitive file path matches ${pattern}`);
    }
  }
  if (/(^|\/)[^/]*(private|secret|token)[^/]*$/i.test(file)) {
    failures.push(`${file}: tracked path looks private; keep only placeholder examples`);
  }
}

function checkContent(file, failures) {
  if (!shouldScanContent(file)) return;
  const absolute = path.join(repoRoot, file);
  const text = fs.readFileSync(absolute, "utf8");
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const check of contentChecks) {
      const match = line.match(check.pattern);
      if (!match) continue;
      const value = match[1] || "";
      if (check.allow(value, match)) continue;
      failures.push(`${file}:${index + 1}: possible ${check.name}`);
    }
  });
}

const failures = [];
for (const file of gitTrackedFiles()) {
  checkPath(file, failures);
  checkContent(file, failures);
}

if (failures.length > 0) {
  console.error("Public rule validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Public rule validation passed.");
