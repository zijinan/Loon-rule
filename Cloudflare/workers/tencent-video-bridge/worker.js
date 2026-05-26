const MAX_PROXY_BODY = 1024 * 1024;
const MAX_TEXT_CLEAN = 512 * 1024;

const BLOCK_HOSTS = new Set([
  "xs.gdt.qq.com",
  "isrpt-vn.gdt.qq.com",
  "rpt.gdt.qq.com",
  "pgdt.gtimg.cn",
  "extshort.weixin.qq.com",
  "minorshort.weixin.qq.com",
  "wzq.tenpay.com",
  "wzqcf.gtimg.com",
  "proxy.finance.qq.com",
  "v3.gdt.qq.com",
  "sdkreport.e.qq.com",
  "h.trace.qq.com",
  "trace.inlong.qq.com",
  "iacc.qq.com",
  "iacc.rec.qq.com"
]);

const BLOCK_URL_PATTERNS = [
  /^https?:\/\/config\.ab\.qq\.com\/tab\/(?:GetTabRemoteConfig|GetTabToggle)/i,
  /^https?:\/\/tab\.video\.qq\.com\/tab\/GetTabRemoteConfig/i,
  /^https?:\/\/rdelivery\.qq\.com\/(?:v1\/sdkconfig\/get|v1\/statistic\/report)/i,
  /^https?:\/\/iwan\.video\.qq\.com\/trpc\.vgopen\.mini_game_detail\.MiniGameDetail\/GetPreloadGames/i,
  /^https?:\/\/playproxy\.video\.qq\.com\/monet\/comm_resource\/get/i,
  /^https?:\/\/vfiles\.gtimg\.cn\/wupload\/(?:ad_control_config_test\.ad_copy_pic_url_conf|xy\/promotionTest)\//i,
  /^https?:\/\/vip\.image\.video\.qpic\.cn\/wupload\/xy\/promotionTest\//i,
  /^https?:\/\/i\.gtimg\.cn\/qqlive\/images\/20170912\/enter_gray\.png/i,
  /^https?:\/\/dldir1\.qq\.com\/qqmi\/video_ad\//i
];

const AD_RPC_PATTERNS = [
  /getAdDetailJ/i,
  /GetPersonalCenterAdDataJ/i,
  /GetFollowHeartRewardAdInfoJ/i,
  /trpc\.business_feeds\.video_ad_ssp_feeds\.ServerAdFeedsVideo/i,
  /trpc\.reward_ad_ssp\.reward_judgment\.reward_free_mode/i,
  /trpc\.reward_ad_ssp\.reward_ad_ssp_service\.adService/i,
  /trpc\.vip_ad_promotion\.access_adaptor\.CommonAccessService\/AccessPromotion/i,
  /trpc\.vip_ad_promotion\.promotion_limit_svr\.Limit/i,
  /trpc\.promotion\.adapter\.adapter\/GetFloatActivity/i,
  /trpc\.flow_pool\.gateway\.FlowPoolActivity\/GetPromotionGlobalConfig/i,
  /AdRequestContextInfo/i,
  /advertiser=\d+.*creative_finger_print=\d+/is
];

const EXACT_EMPTY_KEYS = new Set([
  "ad",
  "ads",
  "ad_list",
  "adlist",
  "ad_info",
  "adinfo",
  "adverts",
  "advert",
  "advertise",
  "advertisement",
  "splash",
  "splash_ad",
  "splashad",
  "launch_ad",
  "launchad",
  "gdt",
  "gdt_ad",
  "gdtad",
  "pre_ad",
  "pread",
  "preload_ad",
  "preloadad",
  "patch_ad",
  "patchad",
  "pause_ad",
  "pausead"
]);

const AD_KEY_RE = /(^|_)(ad|ads|advert|advertise|advertisement|splash|launch|gdt|pgdt|promotion|monet)(_|$)/;

const AD_NEEDLES = [
  "pgdt.gtimg.cn",
  "v3.gdt.qq.com",
  "c.gdt.qq.com",
  "c3.gdt.qq.com",
  "gdt.qq.com",
  "e.qq.com",
  "sdkreport.e.qq.com",
  "xs.gdt.qq.com",
  "isrpt-vn.gdt.qq.com",
  "extshort.weixin.qq.com",
  "minorshort.weixin.qq.com",
  "wzq.tenpay.com",
  "wzqcf.gtimg.com",
  "proxy.finance.qq.com",
  "iacc.qq.com",
  "iacc.rec.qq.com",
  "rdelivery.qq.com/v1/statistic/report",
  "vip.image.video.qpic.cn/wupload/xy/promotiontest",
  "vfiles.gtimg.cn/wupload/xy/promotiontest",
  "splash_ad",
  "launch_ad",
  "pre_ad",
  "pause_ad",
  "adtype",
  "advertisement",
  "ad.userinfo.vip",
  "video_ad_ssp_feeds",
  "serveradfeedsvideo",
  "getpersonalcenteraddataj",
  "getaddetailj"
];

const KEEP_NEEDLES = [
  "tvmsr",
  "tvpsr",
  "super_resolution",
  "superresolution",
  "srmodel",
  "tvmsr.gtimg.com",
  "video.qq.com/getvinfo",
  "vv.video.qq.com/getvinfo"
];

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "tencent-video-bridge" });
    }

    if (request.method !== "POST" || url.pathname !== "/proxy") {
      return json({ error: "not_found" }, 404);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (_) {
      return json({ error: "bad_json" }, 400);
    }

    return handleProxy(payload);
  }
};

async function handleProxy(payload) {
  const targetUrl = String(payload.url || "");
  if (!/^https?:\/\//i.test(targetUrl)) return json({ error: "bad_target" }, 400);

  const parsed = new URL(targetUrl);
  const method = String(payload.method || "GET").toUpperCase();
  const reqBody = decodeBase64(payload.bodyBase64 || "");
  const reqText = bytesToText(reqBody);
  if (reqBody.byteLength > MAX_PROXY_BODY) return json({ error: "body_too_large" }, 413);

  if (shouldBlockRequest(targetUrl, reqText)) {
    return json({
      status: 200,
      headers: {
        "content-type": "application/octet-stream",
        "cache-control": "no-store",
        "x-tencent-video-bridge": "blocked"
      },
      bodyBase64: ""
    });
  }

  const headers = cleanRequestHeaders(payload.headers || {});
  let upstream;
  try {
    upstream = await fetch(targetUrl, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : reqBody,
      redirect: "manual",
      cf: { cacheTtl: 0, cacheEverything: false }
    });
  } catch (error) {
    return json({ error: "upstream_fetch_failed", message: String(error && error.message || error) }, 502);
  }

  const upstreamBytes = new Uint8Array(await upstream.arrayBuffer());
  const upstreamHeaders = cleanResponseHeaders(upstream.headers);
  let bodyBytes = upstreamBytes;
  let bodyText = null;

  const contentType = String(upstream.headers.get("content-type") || "").toLowerCase();
  const isMedia = /^(image|video)\//.test(contentType) || contentType.includes("mpegurl");
  const isIVideo = parsed.host === "i.video.qq.com";

  if (!isMedia && upstreamBytes.byteLength <= MAX_TEXT_CLEAN) {
    bodyText = bytesToText(upstreamBytes);
    const cleanResult = cleanBody(targetUrl, bodyText, contentType, upstreamBytes.byteLength, isIVideo);
    if (cleanResult.changed) {
      bodyBytes = textToBytes(cleanResult.body);
      upstreamHeaders["x-tencent-video-bridge"] = cleanResult.reason;
    }
  }

  return json({
    status: upstream.status,
    headers: upstreamHeaders,
    bodyBase64: encodeBase64(bodyBytes)
  });
}

function shouldBlockRequest(url, bodyText) {
  const parsed = new URL(url);
  if (BLOCK_HOSTS.has(parsed.host)) return true;
  if (BLOCK_URL_PATTERNS.some((pattern) => pattern.test(url))) return true;
  return parsed.host === "i.video.qq.com" && AD_RPC_PATTERNS.some((pattern) => pattern.test(bodyText || ""));
}

function cleanBody(url, bodyText, contentType, byteLength, isIVideo) {
  if (isIVideo) {
    const lower = bodyText.toLowerCase();
    const smallPromotionMarkers = [
      "video_ad_ssp_feeds",
      "serveradfeedsvideo",
      "ad.userinfo.vip",
      "vip_ad_promotion",
      "vip.image.video.qpic.cn/wupload/xy/promotiontest",
      "vfiles.gtimg.cn/wupload/xy/promotiontest"
    ];
    const materialMarkers = [
      "pgdt.gtimg.cn",
      "v3.gdt.qq.com/gdt_stats.fcg",
      "review.gdtimg.com/qzone/biz/gdt",
      "nc.gdt.qq.com/gdt_report.fcg",
      "adfeedimageposter",
      "adfocusposter",
      "adfeedvideoposter"
    ];
    const hasSmallPromotion = byteLength <= 64 * 1024 && smallPromotionMarkers.some((needle) => lower.includes(needle));
    const hasAdMaterial = materialMarkers.some((needle) => lower.includes(needle));
    const hasTencentProto = lower.includes("qqlive_rsp_head") || lower.includes("trpc.access.video_access_app");
    if (hasSmallPromotion && (hasAdMaterial || hasTencentProto)) {
      return { changed: true, body: "", reason: "proto-small-ad-cleared" };
    }
  }

  if (!isProbablyJson(bodyText, contentType)) return { changed: false, body: bodyText };

  try {
    const obj = JSON.parse(bodyText);
    const state = { changed: false };

    if (url.includes("/monet/comm_resource/get")) {
      for (const key of ["comm_resources", "commResources", "resources", "resource_list", "resourceList"]) {
        if (Array.isArray(obj[key])) {
          const before = obj[key].length;
          obj[key] = obj[key].filter((item) => !isAdObject(item));
          if (obj[key].length !== before) state.changed = true;
        }
      }
    }

    cleanJson(obj, state);
    return state.changed ? { changed: true, body: JSON.stringify(obj), reason: "json-cleaned" } : { changed: false, body: bodyText };
  } catch (_) {
    return { changed: false, body: bodyText };
  }
}

function isProbablyJson(body, contentType) {
  const trimmed = body.trim();
  if (!trimmed) return false;
  if (contentType.includes("json") || contentType.includes("text/plain")) return true;
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function isAdObject(value) {
  if (!value || typeof value !== "object") return false;
  let text;
  try {
    text = JSON.stringify(value).toLowerCase();
  } catch (_) {
    return false;
  }
  if (KEEP_NEEDLES.some((needle) => text.includes(needle))) return false;
  return AD_NEEDLES.some((needle) => text.includes(needle));
}

function emptyValue(value) {
  if (Array.isArray(value)) return [];
  if (value && typeof value === "object") return {};
  if (typeof value === "number") return 0;
  if (typeof value === "boolean") return false;
  return "";
}

function cleanJson(value, state) {
  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    for (let i = value.length - 1; i >= 0; i -= 1) {
      const item = value[i];
      if (isAdObject(item)) {
        value.splice(i, 1);
        state.changed = true;
      } else {
        cleanJson(item, state);
      }
    }
    return;
  }

  for (const key of Object.keys(value)) {
    const normalized = key.toLowerCase().replace(/[-\s]/g, "_");
    const compact = normalized.replace(/_/g, "");

    if (EXACT_EMPTY_KEYS.has(normalized) || EXACT_EMPTY_KEYS.has(compact) || AD_KEY_RE.test(normalized)) {
      value[key] = emptyValue(value[key]);
      state.changed = true;
      continue;
    }

    if (typeof value[key] === "string") {
      const trimmed = value[key].trim();
      if ((trimmed.startsWith("{") || trimmed.startsWith("[")) && AD_NEEDLES.some((needle) => trimmed.toLowerCase().includes(needle))) {
        try {
          const nested = JSON.parse(trimmed);
          const before = JSON.stringify(nested);
          cleanJson(nested, state);
          const after = JSON.stringify(nested);
          if (after !== before) {
            value[key] = after;
            state.changed = true;
          }
          continue;
        } catch (_) {}
      }
    }

    if (isAdObject(value[key])) {
      value[key] = emptyValue(value[key]);
      state.changed = true;
      continue;
    }

    cleanJson(value[key], state);
  }
}

function cleanRequestHeaders(input) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(input || {})) {
    const lower = key.toLowerCase();
    if (
      lower === "host" ||
      lower === ":authority" ||
      lower === "content-length" ||
      lower === "accept-encoding" ||
      lower.startsWith("cf-") ||
      lower.startsWith("x-forwarded-")
    ) {
      continue;
    }
    headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }
  headers.set("accept-encoding", "identity");
  return headers;
}

function cleanResponseHeaders(headers) {
  const output = {};
  for (const [key, value] of headers.entries()) {
    const lower = key.toLowerCase();
    if (
      lower === "content-length" ||
      lower === "content-encoding" ||
      lower === "transfer-encoding" ||
      lower === "alt-svc" ||
      lower === "connection"
    ) {
      continue;
    }
    output[key] = value;
  }
  output["cache-control"] = "no-store";
  return output;
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function bytesToText(bytes) {
  let text = "";
  for (let i = 0; i < bytes.length; i += 1) text += String.fromCharCode(bytes[i]);
  return text;
}

function textToBytes(text) {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

function encodeBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function decodeBase64(value) {
  if (!value) return new Uint8Array();
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
