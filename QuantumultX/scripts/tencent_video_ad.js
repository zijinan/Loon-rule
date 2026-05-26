/*
Tencent Video Ads Cleaner for Quantumult X

Design goals:
- Only process small JSON responses.
- Never process video segments, images, protobuf, octet-stream, or large bodies.
- Avoid broad *.qq.com / *.gtimg.com MITM patterns that can make QX cache grow very large.

Matched by:
QuantumultX/rewrite/TencentVideo-Safe.conf
*/

const MAX_BODY_SIZE = 300 * 1024;
const url = $request && $request.url ? $request.url : "";
const body = $response && $response.body ? $response.body : "";
const headers = ($response && $response.headers) || {};

function header(name) {
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return String(headers[key] || "");
  }
  return "";
}

function finish(payload) {
  if (payload === undefined) return $done({});
  return $done({ body: payload });
}

function isProbablyJson() {
  const contentType = header("Content-Type").toLowerCase();
  const trimmed = body.trim();

  if (!body || body.length > MAX_BODY_SIZE) return false;
  if (contentType.includes("octet-stream")) return false;
  if (contentType.includes("protobuf")) return false;
  if (contentType.includes("image/")) return false;
  if (contentType.includes("video/")) return false;
  if (contentType.includes("application/json") || contentType.includes("text/json") || contentType.includes("text/plain")) return true;
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function byteLength(text) {
  let length = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code <= 0x7f) {
      length += 1;
    } else if (code <= 0x7ff) {
      length += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      length += 4;
      i += 1;
    } else {
      length += 3;
    }
  }
  return length;
}

function decodeChunked(source) {
  let offset = 0;
  let decoded = "";
  let sawChunk = false;

  while (offset < source.length) {
    const lineEnd = source.indexOf("\r\n", offset);
    if (lineEnd < 0) return undefined;

    const sizeText = source.slice(offset, lineEnd).trim();
    if (!/^[0-9a-f]+$/i.test(sizeText)) return undefined;

    const size = parseInt(sizeText, 16);
    offset = lineEnd + 2;

    if (size === 0) {
      return sawChunk ? decoded : undefined;
    }

    decoded += source.slice(offset, offset + size);
    offset += size;
    if (source.slice(offset, offset + 2) !== "\r\n") return undefined;
    offset += 2;
    sawChunk = true;
  }

  return undefined;
}

function encodeSingleChunk(source) {
  return byteLength(source).toString(16) + "\r\n" + source + "\r\n0\r\n\r\n";
}

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
  "iacc.qq.com",
  "iacc.rec.qq.com",
  "rdelivery.qq.com/v1/statistic/report",
  "vip.image.video.qpic.cn/wupload/xy/promotiontest",
  "vip.image.video.qpic.cn/vupload/20221226/99fe431672021919301.zip",
  "vfiles.gtimg.cn/wupload/xy/promotiontest",
  "vfiles.gtimg.cn/wupload/xy/starter",
  "vfiles.gtimg.cn/wupload/xy/universal",
  "i.gtimg.cn/qqlive/images/20180111/i1515679287_1.jpg",
  "m.v.qq.com/activity/qqvideo/interact/vod.html",
  "m.x.qq.com/activity/qqvideo/interact/vod.html",
  "mall.video.qq.com/ecommerce/detail",
  "tytx.m.cn.miaozhen.com",
  "ad_frame_time",
  "type_ad_frame_time",
  "splash_ad",
  "launch_ad",
  "pre_ad",
  "pause_ad",
  "adtype",
  "advertisement"
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

function isAdObject(value) {
  if (!value || typeof value !== "object") return false;
  let text = "";
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

function clean(value) {
  if (!value || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    for (let i = value.length - 1; i >= 0; i--) {
      const item = value[i];
      if (isAdObject(item)) {
        value.splice(i, 1);
      } else {
        clean(item);
      }
    }
    return value;
  }

  for (const key of Object.keys(value)) {
    const normalized = key.toLowerCase().replace(/[-\s]/g, "_");
    const compact = normalized.replace(/_/g, "");

    if (EXACT_EMPTY_KEYS.has(normalized) || EXACT_EMPTY_KEYS.has(compact) || AD_KEY_RE.test(normalized)) {
      value[key] = emptyValue(value[key]);
      continue;
    }

    if (typeof value[key] === "string") {
      const trimmed = value[key].trim();
      if ((trimmed.startsWith("{") || trimmed.startsWith("[")) && AD_NEEDLES.some((needle) => trimmed.toLowerCase().includes(needle))) {
        try {
          const nested = JSON.parse(trimmed);
          clean(nested);
          value[key] = JSON.stringify(nested);
          continue;
        } catch (_) {}
      }
    }

    if (Array.isArray(value[key])) {
      clean(value[key]);
      continue;
    }

    if (isAdObject(value[key])) {
      value[key] = emptyValue(value[key]);
      continue;
    }

    clean(value[key]);
  }
  return value;
}

try {
  if (!isProbablyJson()) finish();

  let prefix = "";
  let isChunked = false;
  let jsonBody = body;
  const chunkedJson = decodeChunked(body);
  if (chunkedJson !== undefined) {
    isChunked = true;
    jsonBody = chunkedJson;
  }

  const prefixedJson = body.match(/^(\d{3}\s+)([\s\S]*[\]}])\s*$/);
  if (!isChunked && prefixedJson) {
    prefix = prefixedJson[1];
    jsonBody = prefixedJson[2];
  }

  const obj = JSON.parse(jsonBody);

  // Tencent Video monet resource endpoint observed in capture.
  // Keep quality/player resources and only remove ad-like resource entries.
  if (url.includes("/monet/comm_resource/get")) {
    for (const key of ["comm_resources", "commResources", "resources", "resource_list", "resourceList"]) {
      if (Array.isArray(obj[key])) {
        obj[key] = obj[key].filter((item) => !isAdObject(item));
      }
    }
  }

  clean(obj);
  const cleaned = prefix + JSON.stringify(obj);
  finish(isChunked ? encodeSingleChunk(cleaned) : cleaned);
} catch (_) {
  finish();
}
