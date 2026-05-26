/*
 * Tencent Video JSON response cleaner for Loon.
 *
 * Ported from QuantumultX/scripts/tencent_video_ad.js.
 * Handles only small JSON/text responses and skips video/image/protobuf bodies.
 */

(function () {
  const MAX_BODY_SIZE = 300 * 1024;
  const url = ($request && $request.url) || "";
  const body = ($response && $response.body) || "";
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
    "vfiles.gtimg.cn/wupload/xy/promotiontest",
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
    if (KEEP_NEEDLES.some(function (needle) { return text.includes(needle); })) return false;
    return AD_NEEDLES.some(function (needle) { return text.includes(needle); });
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
      for (let i = value.length - 1; i >= 0; i -= 1) {
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
        if ((trimmed.startsWith("{") || trimmed.startsWith("[")) && AD_NEEDLES.some(function (needle) { return trimmed.toLowerCase().includes(needle); })) {
          try {
            const nested = JSON.parse(trimmed);
            clean(nested);
            value[key] = JSON.stringify(nested);
            continue;
          } catch (_) {}
        }
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
    if (!isProbablyJson()) return finish();

    const obj = JSON.parse(body);

    if (url.includes("/monet/comm_resource/get")) {
      for (const key of ["comm_resources", "commResources", "resources", "resource_list", "resourceList"]) {
        if (Array.isArray(obj[key])) {
          obj[key] = obj[key].filter(function (item) {
            return !isAdObject(item);
          });
        }
      }
    }

    clean(obj);
    return finish(JSON.stringify(obj));
  } catch (_) {
    return finish();
  }
})();
