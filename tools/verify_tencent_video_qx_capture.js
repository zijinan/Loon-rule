#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const repoRoot = path.resolve(__dirname, "..");
const captureRoot = path.resolve(process.argv[2] || path.join(repoRoot, ".."));

const requestScript = fs.readFileSync(path.join(repoRoot, "QuantumultX/scripts/tencent_video_request_ad.js"), "utf8");
const responseScript = fs.readFileSync(path.join(repoRoot, "QuantumultX/scripts/tencent_video_proto_ad.js"), "utf8");
const jsonScript = fs.readFileSync(path.join(repoRoot, "QuantumultX/scripts/tencent_video_ad.js"), "utf8");
const iaccScript = fs.readFileSync(path.join(repoRoot, "QuantumultX/scripts/tencent_video_iacc_ad.js"), "utf8");
const headerScript = fs.readFileSync(path.join(repoRoot, "QuantumultX/scripts/tencent_video_header_ad.js"), "utf8");
const conf = fs.readFileSync(path.join(repoRoot, "QuantumultX/rewrite/TencentVideo-Safe.conf"), "utf8");

const iaccRejectFiles = [
  "QuantumultX/QuanX.conf",
  "QuantumultX/config/QuanX_Optimized.conf",
  "QuantumultX/rule/Ads-Reject.list"
];

const qxProfileFiles = [
  "QuantumultX/QuanX.conf",
  "QuantumultX/config/QuanX_Optimized.conf"
];

const requestUrls = /^https:\/\/(i\.video\.qq\.com\/|disp-qryapi\.3g\.qq\.com\/v1\/dispatch|(?:vv|vv6)\.video\.qq\.com\/getvinfo)/;
const coreHeaderUrls = /^https:\/\/(i\.video\.qq\.com\/|(?:vv|vv6)\.video\.qq\.com\/getvinfo|(?:tab\.video|config\.ab)\.qq\.com\/tab\/GetTabRemoteConfig|richmedia\.video\.qq\.com\/get_rich_media_info)/;

const expectedMitmHosts = [
  "i.video.qq.com",
  "vv.video.qq.com",
  "vv6.video.qq.com",
  "tab.video.qq.com",
  "config.ab.qq.com",
  "disp-qryapi.3g.qq.com",
  "richmedia.video.qq.com",
  "iacc.qq.com",
  "iacc.rec.qq.com",
  "pgdt.gtimg.cn",
  "dldir1.qq.com",
  "v3.gdt.qq.com",
  "c3.gdt.qq.com",
  "p2.l.qq.com",
  "vip.image.video.qpic.cn",
  "vfiles.gtimg.cn"
];

const expectedDirectRejectRules = [
  { name: "pgdt.gtimg.cn", regex: /^\^https\?:\\\/\\\/pgdt\\\.gtimg\\\.cn\\\/.*\burl\s+reject\b/m },
  { name: "dldir1.qq.com/qqmi/video_ad", regex: /^\^https\?:\\\/\\\/dldir1\\\.qq\\\.com\\\/qqmi\\\/video_ad\\\/.*\burl\s+reject\b/m },
  { name: "v3/c3.gdt.qq.com", regex: /^\^https\?:\\\/\\\/\(\?:v3\|c3\)\\\.gdt\\\.qq\\\.com\\\/.*\burl\s+reject-dict\b/m },
  { name: "p2.l.qq.com", regex: /^\^https\?:\\\/\\\/p2\\\.l\\\.qq\\\.com\\\/.*\burl\s+reject-dict\b/m },
  { name: "cold launch splash zip", regex: /vip\\\.image\\\.video\\\.qpic\\\.cn\\\/vupload\\\/20221226\\\/99fe431672021919301\\\.zip.*\burl\s+reject\b/ },
  { name: "promotionTest resources", regex: /\(\?:vfiles\\\.gtimg\\\.cn\|vip\\\.image\\\.video\\\.qpic\\\.cn\)\\\/wupload\\\/xy\\\/promotionTest\\\/.*\burl\s+reject\b/ }
];

const requestMarkers = [
  "ServerAdFeedsVideo",
  "serveradfeedsvideo",
  "video_ad_ssp_feeds",
  "video_ad_ssp",
  "video_xx_ssp_feeds",
  "video_xx_ssp",
  "reward_xx_ssp",
  "view_xx_ssp",
  "qad_device_platform=5",
  "GetFloatActivity",
  "AccessPromotion",
  "GetPromotionGlobalConfig",
  "operationConfiguration",
  "nextAction",
  "action_type",
  "trpc.promotion.adapter.adapter",
  "vip_xx_promotion",
  "promotion_limit_svr",
  "disable_display_promotion_skin",
  "PRE-DOWNLOAD",
  "CARD-PRERANK",
  "CARD-PROFILE",
  "CARD-RANK",
  "PRERANK",
  "PROFILE",
  "+RANK+",
  "reward_yy_xxp",
  "reward_judgment",
  "reward_free_mode",
  "GetRewardPendantJ",
  "GetRewardEntranceInfoJ",
  "last_ad_type",
  "focus_content_and_ad_num",
  "content_count_after_last_ad",
  "industry_native_ad",
  "has_industry_native_ad",
  "os_version_ad_ssp_to_rear",
  "ad_infinite_init",
  "ad_and_content",
  "native_ad_pos",
  "parallel_ad_abs_pos",
  "parallel_ad_pos",
  "ad_abs_seq",
  "ad_abs_pos",
  "ad_request_id",
  "ad_count",
  "ssp_adload",
  "adload",
  "ad_pos",
  "vip_ad_promotion",
  "advertiser=",
  "advertiser_name_hashed_value",
  "xvertiserx_name_hashed_value",
  "creative_finger_print=",
  "creative_xinger_xrint",
  "qad_device_platform",
  "adpass=",
  "adversion=",
  "adchid=",
  "TADChid/0",
  "kNoSubAdType",
  "last_contract_ad_timestamp",
  "cache_ad",
  "ad.page.detail.vipbtn",
  "FILTER-ADD",
  "RERANK-ADD"
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
  "ad_nfb_bad_content",
  "ad_nfb_dislike",
  "ad_nfb_repetition",
  "ad_nfb_direct_close",
  "ad_nfb_dislike_brand",
  "ad_vid",
  "ad_is_bidding",
  "ad_product_id",
  "ad_flush_num",
  "ad_highlight",
  "ad_pr_id",
  "ad_trans_native",
  "ad_duration",
  "ad_reportkey_scd",
  "ad_cast_type",
  "ad_interaction_type",
  "ad_reportkey_fst",
  "ad_is_fail",
  "ad_empty_reason",
  "ad_old_action_type",
  "ad_norms",
  "ad_orderid",
  "ad_report_params",
  "ad_return_num",
  "ad_num",
  "WxProgram",
  "weixinadinfo",
  "SITE_SET_WECHAT",
  "WECHAT",
  "nativeOpenAdCanvas",
  "OpenAdCanvas",
  "nativeOpenXxCanvas",
  "OpenXxCanvas",
  "XxOpenXxProgramAction",
  "XxDownloadAction",
  "gdt/ams_ad_audit",
  "ams_ad_audit",
  "mall.video.qq.com",
  "http://c.l.qq.com/click",
  "click_id",
  "__CLICK_ID__",
  "click_data",
  "click_ext",
  "__CLICK_LPP__",
  "clklpp",
  "dynamic_creative",
  "pages/act/ams/union",
  "label=ams",
  "zq_ams_v18",
  "gdt_ad_id",
  "view_xx_ssp_ad",
  "view_xx_ssp_engine_passthrough",
  "view_xx_ssp",
  "video_xx_ssp",
  "reward_xx_ssp",
  "ssp_xx_type",
  "ams_xx_type",
  "parallel_ad_pos",
  "parallel_ad_abs_pos",
  "adload",
  "GsADCoIB",
  "xvertiserx_name_hashed_value",
  "creative_xinger_xrint",
  "PRE-DOWNLOAD",
  "CARD-PRERANK",
  "CARD-RANK",
  "gdt.qq.com/gdt_click",
  "gdt.qq.com/gdt_report",
  "gdt.qq.com/gdt_stats",
  "gdt.qq.com/imp_stay_report",
  "gdt.qq.com/conv",
  "adsmind.gdtimg.com",
  "pgdt.gtimg.cn",
  "m.x.qq.com/activity/qqvideo/interact/vod.html",
  "mall.video.qq.com/ecommerce/detail",
  "yuanbao.tencent.com/evt/tvdl",
  "m.manju.v.qq.com/z/kairos/download",
  "film.video.qq.com/weixin/v3/device"
];

const splashMarkers = [
  "ADSplash",
  "adsplash",
  "iqad_",
  "qad_",
  "ad_focus_strategy"
];

const iaccHeaderMarkers = [
  "appid=wx",
  "v_t_appid=wx",
  "main_login=wx",
  "v_main_login=wx",
  "qad_device_platform=5"
];

const iaccSensitiveHeaderMarkers = [
  "access_token=",
  "openid=",
  "p_vuserid=",
  "refresh_token=",
  "v_p_vuserid=",
  "v_t_access_token=",
  "v_t_openid=",
  "v_t_refresh_token=",
  "v_vurefresh=",
  "v_vuserid=",
  "v_vusession=",
  "vdevice_qimei36=",
  "video_appid=1000005",
  "video_platform=5",
  "vuserid=",
  "vusession="
];

const iaccBodyMarkers = [
  "PRE-DOWNLOAD",
  "PRERANK",
  "PROFILE",
  "RANK-10",
  "low_end_pad",
  "wxca942bbff22e0e51"
];

const keepNeedles = [
  "load_type",
  "download_upload_setting",
  "DownloadGroupActivity",
  "wuji_dashboard/xy/starter",
  "topic-feeds-in-video",
  "phoneScreencast.feedBackQrCode",
  "unitResults",
  "refresh",
  "Refresh",
  "page",
  "Page",
  "next",
  "Next",
  "offset",
  "Offset",
  "request_id",
  "session",
  "Session",
  "feed",
  "Feed"
];

const paginationContextNeedles = [
  "page_offset",
  "sdk_page_ctx",
  "video_un_page_index",
  "_ctrl_page_index",
  "feed_context",
  "page_context",
  "page=",
  "offset=",
  "cursor",
  "refresh"
];

const paginationRequestStateMarkers = [
  "last_ad_type",
  "focus_content_and_ad_num",
  "content_count_after_last_ad",
  "industry_native_ad",
  "has_industry_native_ad",
  "os_version_ad_ssp_to_rear",
  "ad_infinite_init",
  "ad_and_content",
  "native_ad_pos",
  "parallel_ad_abs_pos",
  "parallel_ad_pos",
  "ad_abs_seq",
  "ad_abs_pos",
  "ad_request_id",
  "ad_count",
  "ssp_adload",
  "adload",
  "ad_pos",
  "view_ad_ssp"
];

const paginationResponseStateMarkers = [
  "ad_session_id",
  "ad_schedule_ability",
  "ad_group_id",
  "ad_idx",
  "whole_ad_type",
  "ssp_ad_type",
  "ams_ad_type",
  "feeds_ad_style",
  "view_ad_ssp",
  "view_xx_ssp",
  "view_ad_ssp_engine_passthrough",
  "view_xx_ssp_engine_passthrough",
  "view_ad_ssp_ad",
  "view_xx_ssp_ad",
  "parallel_ad_abs_pos",
  "parallel_ad_pos",
  "ad_infinite_init",
  "ad_and_content",
  "native_ad_pos",
  "last_ad_type",
  "ad_abs_seq",
  "ad_abs_pos",
  "ad_count",
  "adload",
  "ad_pos",
  "jump_add_extra_info",
  "rerank_ad_info",
  "is_locked_ad",
  "is_converted_native_ad",
  "content_type_ad",
  "select_ad_type"
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

const directMaterialPatterns = [
  { name: "pgdt.gtimg.cn", regex: /^https?:\/\/pgdt\.gtimg\.cn\// },
  { name: "dldir1.qq.com/qqmi/video_ad", regex: /^https?:\/\/dldir1\.qq\.com\/qqmi\/video_ad\// },
  { name: "v3.gdt.qq.com", regex: /^https?:\/\/v3\.gdt\.qq\.com\// },
  { name: "c3.gdt.qq.com", regex: /^https?:\/\/c3\.gdt\.qq\.com\// },
  { name: "p2.l.qq.com", regex: /^https?:\/\/p2\.l\.qq\.com\// },
  { name: "cold launch splash zip", regex: /^https?:\/\/vip\.image\.video\.qpic\.cn\/vupload\/20221226\/99fe431672021919301\.zip/ },
  { name: "promotionTest resources", regex: /^https?:\/\/(?:vfiles\.gtimg\.cn|vip\.image\.video\.qpic\.cn)\/wupload\/xy\/promotionTest\// }
];

const provenanceLookback = 12;
const provenanceUpstreamUrls = /^https?:\/\/(?:i\.video\.qq\.com\/|iacc(?:\.rec)?\.qq\.com\/|(?:vv|vv6)\.video\.qq\.com\/getvinfo)/;
const provenanceMarkers = [
  "qad_device_platform",
  "advertiser_name_hashed_value",
  "xvertiserx_name_hashed_value",
  "creative_finger_print",
  "creative_xinger_xrint",
  "PRE-DOWNLOAD",
  "CARD-PRERANK",
  "CARD-RANK",
  "kNoSubAdType",
  "adpass=",
  "adversion=",
  "adchid=",
  "pgdt.gtimg.cn",
  "v3.gdt.qq.com",
  "c3.gdt.qq.com",
  "p2.l.qq.com",
  "gdt_click.fcg",
  "gdt_stats.fcg"
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

function readLatin1IfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file).toString("latin1") : "";
}

function stripChunked(buffer) {
  let index = 0;
  const chunks = [];

  while (index < buffer.length) {
    const end = buffer.indexOf("\r\n", index, "latin1");
    if (end < 0) return buffer;
    const line = buffer.subarray(index, end).toString("ascii").split(";", 1)[0].trim();
    if (!/^[0-9a-f]+$/i.test(line)) return buffer;
    const size = Number.parseInt(line, 16);
    index = end + 2;
    if (!Number.isFinite(size) || index + size > buffer.length) return buffer;
    if (size === 0) return Buffer.concat(chunks);
    chunks.push(buffer.subarray(index, index + size));
    index += size;
    if (buffer[index] !== 13 || buffer[index + 1] !== 10) return buffer;
    index += 2;
  }

  return buffer;
}

function decodeCapturedBuffer(buffer, headers) {
  if (!buffer || !buffer.length) return buffer;
  const transfer = String(headers["transfer-encoding"] || "").toLowerCase();
  const encoding = String(headers["content-encoding"] || "").toLowerCase();
  let decoded = transfer.includes("chunked") ? stripChunked(buffer) : stripChunked(buffer);

  if (encoding.includes("gzip") || (decoded[0] === 0x1f && decoded[1] === 0x8b)) {
    try {
      decoded = zlib.gunzipSync(decoded);
    } catch (_) {
    }
  }

  return decoded;
}

const wrapperCache = new Map();

function requestWrapper(entryDir) {
  if (wrapperCache.has(entryDir)) return wrapperCache.get(entryDir);
  const file = path.join(entryDir, "request_body_raw");
  if (!fs.existsSync(file)) {
    wrapperCache.set(entryDir, undefined);
    return undefined;
  }

  const text = readTextIfExists(file).trim();
  if (!text.startsWith("{") || !text.includes('"bodyBase64"') || !text.includes('"url"')) {
    wrapperCache.set(entryDir, undefined);
    return undefined;
  }

  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed.url !== "string") throw new Error("missing url");
    wrapperCache.set(entryDir, parsed);
    return parsed;
  } catch (_) {
    wrapperCache.set(entryDir, undefined);
    return undefined;
  }
}

function requestUrl(entryDir) {
  const basic = path.join(entryDir, "basic");
  if (fs.existsSync(basic)) return readTextIfExists(basic).split(/\r?\n/)[0].trim();

  const wrapper = requestWrapper(entryDir);
  if (wrapper && wrapper.url) return wrapper.url;

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

function requestHeaders(entryDir) {
  const wrapper = requestWrapper(entryDir);
  if (wrapper && wrapper.headers && typeof wrapper.headers === "object") {
    const out = {};
    for (const [key, value] of Object.entries(wrapper.headers)) {
      out[String(key).toLowerCase()] = String(value || "");
    }
    return out;
  }

  for (const name of ["request_headers", "request_header_raw.txt"]) {
    const file = path.join(entryDir, name);
    if (fs.existsSync(file)) return parseHeaders(readTextIfExists(file));
  }

  return {};
}

function body(entryDir, kind) {
  if (kind === "request") {
    const headers = requestHeaders(entryDir);
    const file = path.join(entryDir, "request_body");
    if (fs.existsSync(file)) return decodeCapturedBuffer(fs.readFileSync(file), headers).toString("latin1");

    const wrapper = requestWrapper(entryDir);
    if (wrapper && typeof wrapper.bodyBase64 === "string") {
      return decodeCapturedBuffer(Buffer.from(wrapper.bodyBase64, "base64"), headers).toString("latin1");
    }

    const rawFile = path.join(entryDir, "request_body_raw");
    return fs.existsSync(rawFile) ? decodeCapturedBuffer(fs.readFileSync(rawFile), headers).toString("latin1") : "";
  }

  const headers = responseHeaders(entryDir);
  const names = ["response_body", "response_body_raw"];
  for (const name of names) {
    const file = path.join(entryDir, name);
    if (fs.existsSync(file)) return decodeCapturedBuffer(fs.readFileSync(file), headers).toString("latin1");
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

function runIaccRequestHeader(url, headers) {
  let result;
  vm.runInNewContext(iaccScript, {
    $request: { url, headers },
    $response: undefined,
    $done: (value) => {
      result = value || {};
    }
  }, { timeout: 1000 });
  return result && result.headers ? result.headers : headers;
}

function runCoreRequestHeader(url, headers) {
  let result;
  vm.runInNewContext(headerScript, {
    $request: { url, headers },
    $done: (value) => {
      result = value || {};
    }
  }, { timeout: 1000 });
  return result && result.headers ? result.headers : headers;
}

function runIaccRequestBody(url, source) {
  let result;
  vm.runInNewContext(iaccScript, {
    $request: { url, body: source },
    $response: undefined,
    $done: (value) => {
      result = value || {};
    }
  }, { timeout: 1000 });
  return result && typeof result.body === "string" ? result.body : source;
}

function runIaccResponse(url, source, headers) {
  let result;
  vm.runInNewContext(iaccScript, {
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

function hasPaginationContext(source) {
  return includesAny(source || "", paginationContextNeedles);
}

function withoutAllowed(markers, allowedMarkers) {
  const allowed = new Set(allowedMarkers);
  return markers.filter((marker) => !allowed.has(marker));
}

function addIssue(issues, type, entryDir, detail) {
  issues.push({
    type,
    sample: `${path.basename(path.dirname(entryDir))}/${path.basename(entryDir)}`,
    detail
  });
}

function entryOrdinal(entryDir) {
  const match = path.basename(entryDir).match(/^\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

function entryLabel(entryDir) {
  return `${path.basename(path.dirname(entryDir))}/${path.basename(entryDir)}`;
}

function entriesByCaptureName() {
  const byCapture = new Map(captureDirs.map((dir) => [path.basename(dir), []]));
  for (const entryDir of entryDirs) {
    const captureName = captureNameForEntry(entryDir);
    if (!byCapture.has(captureName)) byCapture.set(captureName, []);
    byCapture.get(captureName).push(entryDir);
  }

  for (const dirs of byCapture.values()) {
    dirs.sort((left, right) => {
      const diff = entryOrdinal(left) - entryOrdinal(right);
      return diff || left.localeCompare(right);
    });
  }

  return byCapture;
}

function runProvenanceRequest(url, source) {
  if (/^https?:\/\/iacc(?:\.rec)?\.qq\.com\//.test(url)) {
    return runIaccRequestBody(url, source);
  }
  return runRequest(url, source);
}

function runProvenanceResponse(url, source, headers) {
  if (/^https?:\/\/iacc(?:\.rec)?\.qq\.com\//.test(url)) {
    return runIaccResponse(url, source, headers);
  }
  if (/^https:\/\/i\.video\.qq\.com\//.test(url) || url.includes("config.ab.qq.com/tab/GetTabRemoteConfig")) {
    return runResponse(url, source, headers);
  }
  return undefined;
}

function checkProvenanceBody(materialEntryDir, upstreamEntryDir, kind, url, before, headers, seen) {
  if (!before || before.length > 1024 * 1024 || !includesAny(before, provenanceMarkers)) return;

  const key = `${upstreamEntryDir}\u0000${kind}`;
  if (seen.has(key)) return;
  seen.add(key);

  const after = kind === "request"
    ? runProvenanceRequest(url, before)
    : runProvenanceResponse(url, before, headers);

  if (after === undefined) return;

  stats.directMaterialUpstreamSamples += 1;
  if (after !== before) stats.directMaterialUpstreamChanged += 1;
  if (after.length !== before.length) {
    addIssue(
      issues,
      `directMaterial.upstream${kind === "request" ? "Request" : "Response"}LengthChanged`,
      materialEntryDir,
      `${entryLabel(materialEntryDir)} <- ${entryLabel(upstreamEntryDir)} ${url}`
    );
  }

  const rem = remaining(after, provenanceMarkers);
  if (rem.length) {
    addIssue(
      issues,
      `directMaterial.upstream${kind === "request" ? "Request" : "Response"}MarkerRemaining`,
      materialEntryDir,
      `${entryLabel(materialEntryDir)} <- ${entryLabel(upstreamEntryDir)}: ${rem.join(", ")}`
    );
  } else {
    stats.directMaterialUpstreamClean += 1;
  }
}

function checkKeepNeedles(entryDir, before, after) {
  for (const needle of keepNeedles) {
    if (!before.includes(needle)) continue;
    stats.keep[needle].total += 1;
    if (after.includes(needle)) stats.keep[needle].kept += 1;
    else addIssue(issues, "keep.lost", entryDir, needle);
  }
}

function checkPaginationStatePreserved(entryDir, before, after, markers, kind) {
  for (const marker of markers) {
    if (!before.includes(marker)) continue;
    if (kind === "request") stats.paginationRequestStateSamples += 1;
    else stats.paginationResponseStateSamples += 1;

    if (after.includes(marker)) {
      if (kind === "request") stats.paginationRequestStatePreserved += 1;
      else stats.paginationResponseStatePreserved += 1;
    } else {
      addIssue(issues, `pagination.${kind}StateLost`, entryDir, marker);
    }
  }
}

function configuredMitmHosts() {
  const match = conf.match(/^hostname\s*=\s*(.*)$/m);
  if (!match) return [];
  return match[1].split(",").map((host) => host.trim()).filter(Boolean);
}

const captureDirs = fs.existsSync(captureRoot) && path.basename(captureRoot).startsWith("capture_")
  ? [captureRoot]
  : fs.readdirSync(captureRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("capture_"))
    .map((entry) => path.join(captureRoot, entry.name));

function captureNameForEntry(entryDir) {
  const resolved = path.resolve(entryDir);
  for (const dir of captureDirs) {
    const relative = path.relative(dir, resolved);
    if (relative === "" || (relative && !relative.startsWith("..") && !path.isAbsolute(relative))) {
      return path.basename(dir);
    }
  }
  return "(unknown)";
}

const entryDirs = new Set();
for (const dir of captureDirs) {
  for (const file of walk(dir)) {
    if (/(?:request_body|request_body_raw|response_body|response_body_raw|request_header_raw\.txt|basic)$/.test(path.basename(file))) {
      entryDirs.add(path.dirname(file));
    }
  }
}

const rejectLines = conf.split(/\r?\n/).filter((line) => /\burl\s+reject/.test(line));
function isAllowedDirectRejectLine(line) {
  return line.includes("pgdt\\.gtimg\\.cn")
    || line.includes("dldir1\\.qq\\.com\\/qqmi\\/video_ad")
    || line.includes("(?:v3|c3)\\.gdt\\.qq\\.com")
    || line.includes("p2\\.l\\.qq\\.com")
    || line.includes("vip\\.image\\.video\\.qpic\\.cn\\/vupload\\/20221226\\/99fe431672021919301\\.zip")
    || line.includes("(?:vfiles\\.gtimg\\.cn|vip\\.image\\.video\\.qpic\\.cn)\\/wupload\\/xy\\/promotionTest");
}

const stats = {
  captureDirs: captureDirs.length,
  entries: entryDirs.size,
  rejectRules: rejectLines.length,
  directMaterialRejectRules: rejectLines.filter(isAllowedDirectRejectLine).length,
  requestSamples: 0,
  requestChanged: 0,
  wrappedRequestEntries: 0,
  coreHeaderSamples: 0,
  coreHeaderChanged: 0,
  coreHeaderLoginPreserved: 0,
  responseSamples: 0,
  responseChanged: 0,
  splashSamples: 0,
  splashChanged: 0,
  jsonNoopSamples: 0,
  jsonCleanSamples: 0,
  jsonCleanChanged: 0,
  iaccHeaderSamples: 0,
  iaccHeaderChanged: 0,
  iaccHeaderHardened: 0,
  iaccRequestBodySamples: 0,
  iaccRequestBodyChanged: 0,
  iaccBodySamples: 0,
  iaccBodyChanged: 0,
  directMaterialRequests: 0,
  directMaterialByHost: Object.fromEntries(directMaterialPatterns.map((item) => [item.name, 0])),
  directMaterialByCapture: Object.fromEntries(captureDirs.map((dir) => [
    path.basename(dir),
    {
      total: 0,
      byHost: Object.fromEntries(directMaterialPatterns.map((item) => [item.name, 0]))
    }
  ])),
  directMaterialExamples: {},
  directMaterialProvenanceWindows: 0,
  directMaterialUpstreamSamples: 0,
  directMaterialUpstreamChanged: 0,
  directMaterialUpstreamClean: 0,
  paginationRequestStateSamples: 0,
  paginationRequestStatePreserved: 0,
  paginationResponseStateSamples: 0,
  paginationResponseStatePreserved: 0,
  paginationSoftSamples: 0,
  paginationSoftUnchanged: 0,
  paginationHardSamples: 0,
  paginationHardChanged: 0,
  mitmHosts: configuredMitmHosts().length,
  keep: Object.fromEntries(keepNeedles.map((needle) => [needle, { total: 0, kept: 0 }]))
};

const issues = [];
const requireBroadCoverage = captureDirs.length > 1 || process.env.TENCENT_VIDEO_QX_STRICT === "1";

const paginationSoftProto = [
  "qqlive_rsp_head",
  "video_un_page_index",
  "sdk_page_ctx",
  "{\"page_offset\":1,\"page_size\":5,\"used_module_num\":7}",
  "_ctrl_page_index",
  "ad.userinfo.vip",
  "ad.vipinfo",
  "https://vfiles.gtimg.cn/wupload/xy/starter/example.png",
  "https://vip.image.video.qpic.cn/wupload/xy/promotionTest/example.png"
].join("\u0000");
const paginationSoftOut = runResponse("https://i.video.qq.com/", paginationSoftProto, { "content-type": "application/octet-stream" });
stats.paginationSoftSamples += 1;
if (paginationSoftOut === paginationSoftProto) stats.paginationSoftUnchanged += 1;
else issues.push({
  type: "pagination.softChanged",
  sample: "synthetic/page-offset-soft-promotion",
  detail: "page-offset responses with only soft promotion resources must remain unchanged"
});

const paginationHardProto = paginationSoftProto + "\u0000pgdt.gtimg.cn\u0000AdFeedInfo\u0000click_id";
const paginationHardOut = runResponse("https://i.video.qq.com/", paginationHardProto, { "content-type": "application/octet-stream" });
stats.paginationHardSamples += 1;
if (paginationHardOut !== paginationHardProto) stats.paginationHardChanged += 1;
else issues.push({
  type: "pagination.hardUnchanged",
  sample: "synthetic/page-offset-hard-ad",
  detail: "page-offset responses with hard ad material must still be rewritten"
});
if (paginationHardOut.length !== paginationHardProto.length) {
  issues.push({
    type: "pagination.hardLengthChanged",
    sample: "synthetic/page-offset-hard-ad",
    detail: "hard ad rewrite must preserve protobuf-like body length"
  });
}

for (const expected of expectedDirectRejectRules) {
  if (!expected.regex.test(conf)) {
    issues.push({
      type: "config.directRejectMissing",
      sample: "TencentVideo-Safe.conf",
      detail: expected.name
    });
  }
}
for (const line of rejectLines) {
  if (!isAllowedDirectRejectLine(line)) {
    issues.push({
      type: "config.unexpectedRejectRule",
      sample: "TencentVideo-Safe.conf",
      detail: line
    });
  }
}

for (const relativeFile of iaccRejectFiles) {
  const file = path.join(repoRoot, relativeFile);
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  if (/iacc(?:\.rec)?\.qq\.com.*(?:REJECT|reject)/i.test(text)) {
    issues.push({
      type: "config.iaccRejectConflict",
      sample: relativeFile,
      detail: "iacc hosts must be rewritten by TencentVideo-Safe.conf, not rejected"
    });
  }
}

for (const relativeFile of qxProfileFiles) {
  const file = path.join(repoRoot, relativeFile);
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  const safeLine = text.split(/\r?\n/).find((line) => line.includes("QuantumultX/rewrite/TencentVideo-Safe.conf"));
  if (!safeLine) {
    issues.push({
      type: "config.tencentVideoSafeMissing",
      sample: relativeFile,
      detail: "TencentVideo-Safe rewrite resource is not present"
    });
  } else if (!/enabled=true\b/.test(safeLine)) {
    issues.push({
      type: "config.tencentVideoSafeDisabled",
      sample: relativeFile,
      detail: "TencentVideo-Safe rewrite resource must be enabled for the profile to use these scripts"
    });
  }
}

if (/disp-qryapi\\.3g\\.qq\\.com.*script-response-body/.test(conf)) {
  issues.push({
    type: "config.dispatchResponseRewrite",
    sample: "TencentVideo-Safe.conf",
    detail: "disp-qryapi dispatch responses must not be cleaned; it removes normal unitResults"
  });
}

if (/(playproxy\\.video\\.qq\\.com|rdelivery\\.qq\\.com).*script-response-body/.test(conf)) {
  issues.push({
    type: "config.noopJsonResponseRewrite",
    sample: "TencentVideo-Safe.conf",
    detail: "playproxy/rdelivery JSON responses were no-op in captures and should not be MITM rewritten"
  });
}

const mitmHosts = configuredMitmHosts();
for (const host of expectedMitmHosts) {
  if (!mitmHosts.includes(host)) {
    issues.push({ type: "config.mitmMissing", sample: "TencentVideo-Safe.conf", detail: host });
  }
}
for (const host of mitmHosts) {
  if (!expectedMitmHosts.includes(host)) {
    issues.push({ type: "config.mitmUnexpected", sample: "TencentVideo-Safe.conf", detail: host });
  }
}

for (const entryDir of entryDirs) {
  const url = requestUrl(entryDir);
  const reqBody = body(entryDir, "request");
  const respBody = body(entryDir, "response");
  const reqHeaders = requestHeaders(entryDir);
  const headers = responseHeaders(entryDir);
  if (requestWrapper(entryDir)) stats.wrappedRequestEntries += 1;

  for (const item of directMaterialPatterns) {
    if (!item.regex.test(url)) continue;
    const captureName = captureNameForEntry(entryDir);
    stats.directMaterialRequests += 1;
    stats.directMaterialByHost[item.name] += 1;
    if (stats.directMaterialByCapture[captureName]) {
      stats.directMaterialByCapture[captureName].total += 1;
      stats.directMaterialByCapture[captureName].byHost[item.name] += 1;
    }
    if (!stats.directMaterialExamples[item.name]) {
      stats.directMaterialExamples[item.name] = `${path.basename(path.dirname(entryDir))}/${path.basename(entryDir)}`;
    }
  }

  if (coreHeaderUrls.test(url)) {
    const cookie = reqHeaders.cookie || "";
    if (cookie.includes("qad_device_platform=5")) {
      stats.coreHeaderSamples += 1;
      const outHeaders = runCoreRequestHeader(url, reqHeaders);
      const outCookie = outHeaders.cookie || "";
      if (outCookie !== cookie) stats.coreHeaderChanged += 1;
      if (!outCookie.includes("qad_device_platform=5") && outCookie.includes("qad_device_platform=0")) {
        if (!cookie.includes("access_token=") || outCookie.includes("access_token=")) {
          stats.coreHeaderLoginPreserved += 1;
        } else {
          addIssue(issues, "coreHeader.loginLost", entryDir, url);
        }
      } else {
        addIssue(issues, "coreHeader.qadRemaining", entryDir, url);
      }
    }
  }

  if (/^https?:\/\/iacc(?:\.rec)?\.qq\.com\//.test(url)) {
    const cookie = reqHeaders.cookie || "";
    if (cookie && includesAny(cookie, iaccHeaderMarkers)) {
      stats.iaccHeaderSamples += 1;
      const outHeaders = runIaccRequestHeader(url, reqHeaders);
      const outCookie = outHeaders.cookie || "";
      if (outCookie !== cookie) stats.iaccHeaderChanged += 1;
      const rem = remaining(outCookie, iaccHeaderMarkers);
      if (rem.length) addIssue(issues, "iacc.headerMarkerRemaining", entryDir, rem.join(", "));
      const headerText = JSON.stringify(outHeaders).toLowerCase();
      const sensitiveRemaining = iaccSensitiveHeaderMarkers.filter((needle) => headerText.includes(needle.toLowerCase()));
      if (sensitiveRemaining.length) addIssue(issues, "iacc.sensitiveHeaderRemaining", entryDir, sensitiveRemaining.join(", "));
      else stats.iaccHeaderHardened += 1;
      if (outHeaders.loginv && outHeaders.loginv !== "0") addIssue(issues, "iacc.loginvRemaining", entryDir, outHeaders.loginv);
    }

    if (reqBody && reqBody.length <= 128 * 1024 && includesAny(reqBody, iaccBodyMarkers)) {
      stats.iaccRequestBodySamples += 1;
      const out = runIaccRequestBody(url, reqBody);
      if (out !== reqBody) stats.iaccRequestBodyChanged += 1;
      if (out.length !== reqBody.length) addIssue(issues, "iacc.requestLengthChanged", entryDir, url);
      const rem = remaining(out, iaccBodyMarkers);
      if (rem.length) addIssue(issues, "iacc.requestBodyMarkerRemaining", entryDir, rem.join(", "));
    }

    if (respBody && respBody.length <= 128 * 1024 && includesAny(respBody, iaccBodyMarkers)) {
      stats.iaccBodySamples += 1;
      const out = runIaccResponse(url, respBody, headers);
      if (out !== respBody) stats.iaccBodyChanged += 1;
      if (out.length !== respBody.length) addIssue(issues, "iacc.lengthChanged", entryDir, url);
      const rem = remaining(out, iaccBodyMarkers);
      if (rem.length) addIssue(issues, "iacc.bodyMarkerRemaining", entryDir, rem.join(", "));
    }
  }

  if (requestUrls.test(url) && reqBody && includesAny(reqBody, requestMarkers)) {
    stats.requestSamples += 1;
    const out = runRequest(url, reqBody);
    if (out !== reqBody) stats.requestChanged += 1;
    if (out.length !== reqBody.length) addIssue(issues, "request.lengthChanged", entryDir, url);
    const rem = hasPaginationContext(reqBody)
      ? withoutAllowed(remaining(out, requestMarkers), paginationRequestStateMarkers)
      : remaining(out, requestMarkers);
    if (rem.length) addIssue(issues, "request.markerRemaining", entryDir, rem.join(", "));
    if (hasPaginationContext(reqBody)) {
      checkPaginationStatePreserved(entryDir, reqBody, out, paginationRequestStateMarkers, "request");
    }
  }

  if (!respBody || respBody.length > 1024 * 1024) continue;

  if (jsonNoopUrls.some((regex) => regex.test(url))) {
    stats.jsonNoopSamples += 1;
    const out = runJsonResponse(url, respBody, headers);
    if (out !== respBody) addIssue(issues, "json.noopChanged", entryDir, url);
    checkKeepNeedles(entryDir, respBody, out);
  }

  if (jsonCleanUrls.some((regex) => regex.test(url)) && includesAny(respBody, jsonCleanMarkers)) {
    stats.jsonCleanSamples += 1;
    const out = runJsonResponse(url, respBody, headers);
    if (out !== respBody) stats.jsonCleanChanged += 1;
    const rem = remaining(out, jsonCleanMarkers);
    if (rem.length) addIssue(issues, "json.markerRemaining", entryDir, rem.join(", "));
    checkKeepNeedles(entryDir, respBody, out);
  }

  const isTencentVideoApi = /^https:\/\/i\.video\.qq\.com\//.test(url) || url.includes("config.ab.qq.com/tab/GetTabRemoteConfig");
  if (!isTencentVideoApi) continue;

  const out = runResponse(url, respBody, headers);

  if (/^https:\/\/i\.video\.qq\.com\//.test(url) && includesAny(respBody, responseMarkers)) {
    stats.responseSamples += 1;
    if (out !== respBody) stats.responseChanged += 1;
    if (out.length !== respBody.length) addIssue(issues, "response.lengthChanged", entryDir, url);
    if (out.length === 0) addIssue(issues, "response.emptied", entryDir, url);
    const rem = hasPaginationContext(respBody)
      ? withoutAllowed(remaining(out, responseMarkers), paginationResponseStateMarkers)
      : remaining(out, responseMarkers);
    if (rem.length) addIssue(issues, "response.markerRemaining", entryDir, rem.join(", "));
    if (hasPaginationContext(respBody)) {
      checkPaginationStatePreserved(entryDir, respBody, out, paginationResponseStateMarkers, "response");
    }
  }

  if (url.includes("config.ab.qq.com/tab/GetTabRemoteConfig") && includesAny(respBody, splashMarkers)) {
    stats.splashSamples += 1;
    if (out !== respBody) stats.splashChanged += 1;
    if (out.length !== respBody.length) addIssue(issues, "splash.lengthChanged", entryDir, url);
    const rem = remaining(out, splashMarkers);
    if (rem.length) addIssue(issues, "splash.markerRemaining", entryDir, rem.join(", "));
  }

  checkKeepNeedles(entryDir, respBody, out);
}

for (const dirs of entriesByCaptureName().values()) {
  const provenanceSeen = new Set();

  for (let index = 0; index < dirs.length; index += 1) {
    const entryDir = dirs[index];
    const url = requestUrl(entryDir);
    if (!directMaterialPatterns.some((item) => item.regex.test(url))) continue;

    stats.directMaterialProvenanceWindows += 1;

    const start = Math.max(0, index - provenanceLookback);
    for (let prevIndex = index - 1; prevIndex >= start; prevIndex -= 1) {
      const upstreamEntryDir = dirs[prevIndex];
      const upstreamUrl = requestUrl(upstreamEntryDir);
      if (!provenanceUpstreamUrls.test(upstreamUrl)) continue;

      const upstreamRequestBody = body(upstreamEntryDir, "request");
      checkProvenanceBody(
        entryDir,
        upstreamEntryDir,
        "request",
        upstreamUrl,
        upstreamRequestBody,
        requestHeaders(upstreamEntryDir),
        provenanceSeen
      );

      const upstreamResponseBody = body(upstreamEntryDir, "response");
      checkProvenanceBody(
        entryDir,
        upstreamEntryDir,
        "response",
        upstreamUrl,
        upstreamResponseBody,
        responseHeaders(upstreamEntryDir),
        provenanceSeen
      );
    }
  }
}

if (stats.captureDirs === 0) issues.push({ type: "captures.missing", sample: captureRoot, detail: "no capture_* directories found" });
if (requireBroadCoverage && stats.requestSamples === 0) issues.push({ type: "request.noSamples", sample: captureRoot, detail: "no ad request samples matched" });
if (requireBroadCoverage && stats.coreHeaderSamples === 0) issues.push({ type: "coreHeader.noSamples", sample: captureRoot, detail: "no Tencent Video qad_device_platform header samples matched" });
if (stats.coreHeaderSamples !== stats.coreHeaderChanged) {
  issues.push({
    type: "coreHeader.unchanged",
    sample: captureRoot,
    detail: `${stats.coreHeaderChanged}/${stats.coreHeaderSamples} core Tencent Video request header samples changed`
  });
}
if (stats.coreHeaderSamples !== stats.coreHeaderLoginPreserved) {
  issues.push({
    type: "coreHeader.loginNotPreserved",
    sample: captureRoot,
    detail: `${stats.coreHeaderLoginPreserved}/${stats.coreHeaderSamples} core Tencent Video request headers preserved login while changing qad`
  });
}
if (requireBroadCoverage && stats.responseSamples === 0) issues.push({ type: "response.noSamples", sample: captureRoot, detail: "no ad response samples matched" });
if (requireBroadCoverage && stats.splashSamples === 0) issues.push({ type: "splash.noSamples", sample: captureRoot, detail: "no splash config samples matched" });
if (requireBroadCoverage && stats.iaccHeaderSamples === 0) issues.push({ type: "iacc.headerNoSamples", sample: captureRoot, detail: "no iacc request header samples matched" });
if (stats.iaccHeaderSamples !== stats.iaccHeaderChanged) {
  issues.push({
    type: "iacc.headerUnchanged",
    sample: captureRoot,
    detail: `${stats.iaccHeaderChanged}/${stats.iaccHeaderSamples} iacc request header samples changed`
  });
}
if (stats.iaccRequestBodySamples !== stats.iaccRequestBodyChanged) {
  issues.push({
    type: "iacc.requestBodyUnchanged",
    sample: captureRoot,
    detail: `${stats.iaccRequestBodyChanged}/${stats.iaccRequestBodySamples} iacc request body samples changed`
  });
}
if (stats.iaccBodySamples !== stats.iaccBodyChanged) {
  issues.push({
    type: "iacc.bodyUnchanged",
    sample: captureRoot,
    detail: `${stats.iaccBodyChanged}/${stats.iaccBodySamples} iacc response body samples changed`
  });
}
if (requireBroadCoverage && stats.jsonNoopSamples === 0) issues.push({ type: "json.noopNoSamples", sample: captureRoot, detail: "no dispatch/appcfg noop samples matched" });
if (requireBroadCoverage && stats.jsonCleanSamples === 0) issues.push({ type: "json.cleanNoSamples", sample: captureRoot, detail: "no tab/richmedia JSON ad samples matched" });
if (stats.jsonCleanSamples !== stats.jsonCleanChanged) {
  issues.push({
    type: "json.cleanUnchanged",
    sample: captureRoot,
    detail: `${stats.jsonCleanChanged}/${stats.jsonCleanSamples} JSON ad samples changed`
  });
}
if (stats.paginationRequestStateSamples !== stats.paginationRequestStatePreserved) {
  issues.push({
    type: "pagination.requestStateNotPreserved",
    sample: captureRoot,
    detail: `${stats.paginationRequestStatePreserved}/${stats.paginationRequestStateSamples} pagination request state markers preserved`
  });
}
if (stats.paginationResponseStateSamples !== stats.paginationResponseStatePreserved) {
  issues.push({
    type: "pagination.responseStateNotPreserved",
    sample: captureRoot,
    detail: `${stats.paginationResponseStatePreserved}/${stats.paginationResponseStateSamples} pagination response state markers preserved`
  });
}

console.log(JSON.stringify({ stats, issues: issues.slice(0, 50) }, null, 2));

if (issues.length) process.exit(1);
