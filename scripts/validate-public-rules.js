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
  ".yaml",
  ".yml",
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
    pattern: /^[ \t]*#?[ \t]*ca-p12[ \t]*=[ \t]*(.*)$/i,
    allow: (value) => value.trim() === "" || allowedPlaceholder.test(value),
  },
  {
    name: "MITM ca-passphrase",
    pattern: /^[ \t]*#?[ \t]*ca-passphrase[ \t]*=[ \t]*(.*)$/i,
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
  if (!/^(Loon|QuantumultX|shadowrocket|scripts|\.github)\//.test(file)) return false;
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

function checkQuantumultXRuleSyntax(file, failures) {
  if (!/^QuantumultX\/rule\/.*\.list$/i.test(file)) return;
  const absolute = path.join(repoRoot, file);
  const lines = fs.readFileSync(absolute, "utf8").split(/\r?\n/);
  const supported = new Set([
    "HOST",
    "HOST-SUFFIX",
    "HOST-KEYWORD",
    "IP-CIDR",
    "IP6-CIDR",
    "GEOIP",
    "FINAL",
  ]);

  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const parts = line.split(",").map((part) => part.trim());
    const type = parts[0].toUpperCase();
    if (!supported.has(type)) {
      failures.push(`${file}:${index + 1}: unsupported/unknown Quantumult X rule type ${parts[0]}`);
      return;
    }
    const minFields = type === "FINAL" ? 2 : 3;
    if (parts.length < minFields || parts.slice(0, minFields).some((part) => part === "")) {
      failures.push(`${file}:${index + 1}: invalid Quantumult X rule; expected at least ${minFields} fields`);
    }
  });
}

function extractSection(text, name) {
  const marker = `[${name}]`;
  const start = text.indexOf(marker);
  if (start < 0) return "";
  const after = text.slice(start + marker.length);
  const next = after.search(/^\s*\[[^\]]+\]/m);
  return next < 0 ? after : after.slice(0, next);
}

function checkPublicSafeProfile(failures) {
  const file = "QuantumultX/config/QuanX_Public_Safe.conf";
  const absolute = path.join(repoRoot, file);
  if (!fs.existsSync(absolute)) {
    failures.push(`${file}: required public-safe profile is missing`);
    return;
  }

  const text = fs.readFileSync(absolute, "utf8");
  const rewriteLocal = extractSection(text, "rewrite_local");
  const rewriteRemote = extractSection(text, "rewrite_remote");
  const taskLocal = extractSection(text, "task_local");
  const serverRemote = extractSection(text, "server_remote");
  const mitm = extractSection(text, "mitm");

  const activeLines = (section) => section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (activeLines(rewriteLocal).length > 0) {
    failures.push(`${file}: public-safe profile must not contain active rewrite_local rules`);
  }
  if (activeLines(rewriteRemote).length > 0) {
    failures.push(`${file}: public-safe profile must not contain active rewrite_remote resources`);
  }
  if (activeLines(taskLocal).length > 0) {
    failures.push(`${file}: public-safe profile must not contain active task_local scripts`);
  }
  if (activeLines(serverRemote).some((line) => /https?:\/\//i.test(line))) {
    failures.push(`${file}: public-safe profile must not embed subscription URLs`);
  }
  if (/^[ \t]*(passphrase|p12)[ \t]*=[ \t]*\S+/mi.test(mitm)) {
    failures.push(`${file}: public-safe profile must not embed MITM credentials`);
  }
  if (/script-(request|response)-(header|body)|url\s+script-/i.test(text)) {
    failures.push(`${file}: public-safe profile must not execute rewrite scripts`);
  }
}

const failures = [];
for (const file of gitTrackedFiles()) {
  checkPath(file, failures);
  checkContent(file, failures);
  checkQuantumultXRuleSyntax(file, failures);
}
checkPublicSafeProfile(failures);

if (failures.length > 0) {
  console.error("Public rule validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Public rule validation passed: secrets, QX rule syntax, and public-safe invariants are clean.");
