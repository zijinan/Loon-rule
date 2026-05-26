#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");
const captureRoot = path.resolve(process.argv[2] || path.join(repoRoot, ".."));

const requestScript = fs.readFileSync(path.join(repoRoot, "QuantumultX/scripts/tencent_video_request_ad.js"), "utf8");
const responseScript = fs.readFileSync(path.join(repoRoot, "QuantumultX/scripts/tencent_video_proto_ad.js"), "utf8");
const jsonScript = fs.readFileSync(path.join(repoRoot, "QuantumultX/scripts/tencent_video_ad.js"), "utf8");
const conf = fs.readFileSync(path.join(repoRoot, "QuantumultX/rewrite/TencentVideo-Safe.conf"), "utf8");

const requestUrls = /^https:\/\/(i\.video\.qq\.com\/|disp-qryapi\.3g\.qq\.com\/v1\/dispatch|(?:vv|vv6)\.video\.qq\.com\/getvinfo)/;

const requestMarkers = [
  "ServerAdFeedsVideo",
  "serveradfeedsvideo",
  "video_ad_ssp_feeds",
  "video_ad_ssp",
  "vip_ad_promotion",
  "advertiser=",
  "creative_finger_print="
];

const responseMarkers = [
  "type.googleapis.com/com.tencent.qqlive.protocol.pb.Ad",
  "AdOpenWxProgramAction",
  "AdDownloadAction",
  "AdFeedInfo",
  "AdResponseInfo",
  "InnerAdPromotionEventList",
  "AdFeedImagePoster",
  "AdFocusPoster",
  "AdFeedVideoPoster",
  "mod_adfeed",
  "ad_focus",
  "adgroup_id",
  "adNetwork",
  "ad_nfb_none_view",
  "adsmind.gdtimg.com",
  "pgdt.gtimg.cn",
  "m.x.qq.com/activity/qqvideo/interact/vod.html",
  "mall.video.qq.com/ecommerce/detail"
];

const splashMarkers = [
  "ADSplash",
  "adsplash"
];

const keepNeedles = [
  "load_type",
  "download_upload_setting",
  "DownloadGroupActivity",
  "wuji_dashboard/xy/starter",
  "topic-feeds-in-video",
  "phoneScreencast.feedBackQrCode"
];

const jsonNoopUrls = [
  /^https:\/\/disp-qryapi\.3g\.qq\.com\/v1\/dispatch/,
  /^https:\/\/appcfg\.v\.qq\.com\/getconf/
];

const jsonCleanUrls = [
  /^https:\/\/tab\.video\.qq\.com\/tab\/GetTabRemoteConfig/,
  /^https:\/\/richmedia\.video\.qq\.com\/get_rich_media_info/
];

const jsonCleanMarkers = [
  "tvk_tab_config_ad_asycn_call",
  "ad_frame_time",
  "type_ad_frame_time"
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function parseHeaders(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^(:[^:]+):\s*(.*)$/) || line.match(/^([^:]+):\s*(.*)$/);
    if (match) out[match[1].toLowerCase()] = match[2];
  }
  return out;
}

function readTextIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function requestUrl(entryDir) {
  const basic = path.join(entryDir, "basic");
  if (fs.existsSync(basic)) return readTextIfExists(basic).split(/\r?\n/)[0].trim();

  const rawHeaders = path.join(entryDir, "request_header_raw.txt");
  if (!fs.existsSync(rawHeaders)) return "";

  const headers = parseHeaders(readTextIfExists(rawHeaders));
  const authority = headers[":authority"] || headers.host || "";
  if (!authority) return "";
  return `${headers[":scheme"] || "https"}://${authority}${headers[":path"] || "/"}`;
}

function responseHeaders(entryDir) {
  for (const name of ["response_headers", "response_header_raw.txt"]) {
    const file = path.join(entryDir, name);
    if (fs.existsSync(file)) return parseHeaders(readTextIfExists(file));
  }
  return {};
}

function body(entryDir, kind) {
  const names = kind === "request" ? ["request_body", "request_body_raw"] : ["response_body", "response_body_raw"];
  for (const name of names) {
    const file = path.join(entryDir, name);
    if (fs.existsSync(file)) return fs.readFileSync(file).toString("latin1");
  }
  return "";
}

function runRequest(url, source) {
  let result;
  vm.runInNewContext(requestScript, {
    $request: { url, body: source },
    $done: (value) => {
      result = value || {};
    }
  }, { timeout: 1000 });
  return result && typeof result.body === "string" ? result.body : source;
}

function runResponse(url, source, headers) {
  let result;
  vm.runInNewContext(responseScript, {
    $request: { url },
    $response: { body: source, headers },
    $done: (value) => {
      result = value || {};
    }
  }, { timeout: 1000 });
  return result && typeof result.body === "string" ? result.body : source;
}

function runJsonResponse(url, source, headers) {
  let result;
  vm.runInNewContext(jsonScript, {
    $request: { url },
    $response: { body: source, headers },
    $done: (value) => {
      result = value || {};
    }
  }, { timeout: 1000 });
  return result && typeof result.body === "string" ? result.body : source;
}

function includesAny(source, needles) {
  const lower = source.toLowerCase();
  return needles.some((needle) => (/[A-Z]/.test(needle) ? source : lower).includes(/[A-Z]/.test(needle) ? needle : needle.toLowerCase()));
}

function remaining(source, needles) {
  const lower = source.toLowerCase();
  return needles.filter((needle) => (/[A-Z]/.test(needle) ? source : lower).includes(/[A-Z]/.test(needle) ? needle : needle.toLowerCase()));
}

function addIssue(issues, type, entryDir, detail) {
  issues.push({
    type,
    sample: `${path.basename(path.dirname(entryDir))}/${path.basename(entryDir)}`,
    detail
  });
}

const captureDirs = fs.readdirSync(captureRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("capture_"))
  .map((entry) => path.join(captureRoot, entry.name));

const entryDirs = new Set();
for (const dir of captureDirs) {
  for (const file of walk(dir)) {
    if (/(?:request_body|response_body|request_header_raw\.txt|basic)$/.test(path.basename(file))) {
      entryDirs.add(path.dirname(file));
    }
  }
}

const stats = {
  captureDirs: captureDirs.length,
  entries: entryDirs.size,
  rejectRules: (conf.match(/\burl\s+reject/g) || []).length,
  requestSamples: 0,
  requestChanged: 0,
  responseSamples: 0,
  responseChanged: 0,
  splashSamples: 0,
  splashChanged: 0,
  jsonNoopSamples: 0,
  jsonCleanSamples: 0,
  jsonCleanChanged: 0,
  keep: Object.fromEntries(keepNeedles.map((needle) => [needle, { total: 0, kept: 0 }]))
};

const issues = [];

if (stats.rejectRules !== 0) {
  issues.push({ type: "config.rejectRules", sample: "TencentVideo-Safe.conf", detail: `${stats.rejectRules} reject rules found` });
}

if (/disp-qryapi\\.3g\\.qq\\.com.*script-response-body/.test(conf)) {
  issues.push({
    type: "config.dispatchResponseRewrite",
    sample: "TencentVideo-Safe.conf",
    detail: "disp-qryapi dispatch responses must not be cleaned; it removes normal unitResults"
  });
}

for (const entryDir of entryDirs) {
  const url = requestUrl(entryDir);
  const reqBody = body(entryDir, "request");
  const respBody = body(entryDir, "response");
  const headers = responseHeaders(entryDir);

  if (requestUrls.test(url) && reqBody && includesAny(reqBody, requestMarkers)) {
    stats.requestSamples += 1;
    const out = runRequest(url, reqBody);
    if (out !== reqBody) stats.requestChanged += 1;
    if (out.length !== reqBody.length) addIssue(issues, "request.lengthChanged", entryDir, url);
    const rem = remaining(out, requestMarkers);
    if (rem.length) addIssue(issues, "request.markerRemaining", entryDir, rem.join(", "));
  }

  if (!respBody || respBody.length > 1024 * 1024) continue;

  if (jsonNoopUrls.some((regex) => regex.test(url))) {
    stats.jsonNoopSamples += 1;
    const out = runJsonResponse(url, respBody, headers);
    if (out !== respBody) addIssue(issues, "json.noopChanged", entryDir, url);
  }

  if (jsonCleanUrls.some((regex) => regex.test(url)) && includesAny(respBody, jsonCleanMarkers)) {
    stats.jsonCleanSamples += 1;
    const out = runJsonResponse(url, respBody, headers);
    if (out !== respBody) stats.jsonCleanChanged += 1;
    const rem = remaining(out, jsonCleanMarkers);
    if (rem.length) addIssue(issues, "json.markerRemaining", entryDir, rem.join(", "));
  }

  const isTencentVideoApi = /^https:\/\/i\.video\.qq\.com\//.test(url) || url.includes("config.ab.qq.com/tab/GetTabRemoteConfig");
  if (!isTencentVideoApi) continue;

  const out = runResponse(url, respBody, headers);

  if (/^https:\/\/i\.video\.qq\.com\//.test(url) && includesAny(respBody, responseMarkers)) {
    stats.responseSamples += 1;
    if (out !== respBody) stats.responseChanged += 1;
    if (out.length !== respBody.length) addIssue(issues, "response.lengthChanged", entryDir, url);
    if (out.length === 0) addIssue(issues, "response.emptied", entryDir, url);
    const rem = remaining(out, responseMarkers);
    if (rem.length) addIssue(issues, "response.markerRemaining", entryDir, rem.join(", "));
  }

  if (url.includes("config.ab.qq.com/tab/GetTabRemoteConfig") && includesAny(respBody, splashMarkers)) {
    stats.splashSamples += 1;
    if (out !== respBody) stats.splashChanged += 1;
    if (out.length !== respBody.length) addIssue(issues, "splash.lengthChanged", entryDir, url);
    const rem = remaining(out, splashMarkers);
    if (rem.length) addIssue(issues, "splash.markerRemaining", entryDir, rem.join(", "));
  }

  for (const needle of keepNeedles) {
    if (!respBody.includes(needle)) continue;
    stats.keep[needle].total += 1;
    if (out.includes(needle)) stats.keep[needle].kept += 1;
    else addIssue(issues, "keep.lost", entryDir, needle);
  }
}

if (stats.captureDirs === 0) issues.push({ type: "captures.missing", sample: captureRoot, detail: "no capture_* directories found" });
if (stats.requestSamples === 0) issues.push({ type: "request.noSamples", sample: captureRoot, detail: "no ad request samples matched" });
if (stats.responseSamples === 0) issues.push({ type: "response.noSamples", sample: captureRoot, detail: "no ad response samples matched" });
if (stats.splashSamples === 0) issues.push({ type: "splash.noSamples", sample: captureRoot, detail: "no splash config samples matched" });
if (stats.jsonNoopSamples === 0) issues.push({ type: "json.noopNoSamples", sample: captureRoot, detail: "no dispatch/appcfg noop samples matched" });
if (stats.jsonCleanSamples === 0) issues.push({ type: "json.cleanNoSamples", sample: captureRoot, detail: "no tab/richmedia JSON ad samples matched" });
if (stats.jsonCleanSamples !== stats.jsonCleanChanged) {
  issues.push({
    type: "json.cleanUnchanged",
    sample: captureRoot,
    detail: `${stats.jsonCleanChanged}/${stats.jsonCleanSamples} JSON ad samples changed`
  });
}

console.log(JSON.stringify({ stats, issues: issues.slice(0, 50) }, null, 2));

if (issues.length) process.exit(1);
