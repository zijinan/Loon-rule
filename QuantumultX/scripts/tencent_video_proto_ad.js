/*
Tencent Video proto/binary ad guard for Quantumult X

Observed in capture:
- https://i.video.qq.com/ responses may contain embedded ad module text in a protobuf/octet-stream body.
- The targeted module includes markers such as mod_trailer_ad, AdFeedImagePoster, pgdt.gtimg.cn, v3.gdt.qq.com.

Safety:
- Only handles small/medium API bodies, never video/image/CDN payloads.
- If the body clearly looks like an ad-only module response, return an empty body to make the module fail closed.
- Normal i.video.qq.com API responses are passed through unchanged.
*/

const MAX_BODY_SIZE = 300 * 1024;
const body = ($response && $response.body) || "";
const headers = ($response && $response.headers) || {};

function header(name) {
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return String(headers[key] || "");
  }
  return "";
}

function done(payload) {
  if (payload === undefined) return $done({});
  return $done({ body: payload });
}

try {
  if (!body || body.length > MAX_BODY_SIZE) done();

  const ct = header("Content-Type").toLowerCase();
  if (ct.includes("image/") || ct.includes("video/") || ct.includes("mpegurl")) done();

  const text = String(body).toLowerCase();

  const strongAdMarkers = [
    "mod_trailer_ad",
    "adfeedimageposter",
    "ad_control_config_test",
    "video_ad/mini_game_feeds",
    "pgdt.gtimg.cn",
    "v3.gdt.qq.com/gdt_stats.fcg",
    "review.gdtimg.com/qzone/biz/gdt",
    "nc.gdt.qq.com/gdt_report.fcg"
  ];

  const hasStrongAd = strongAdMarkers.some((x) => text.includes(x));
  const hasTencentVideoProto = text.includes("qqlive_rsp_head") || text.includes("trpc.ovb_galaxy") || text.includes("trpc.access.video_access_app");

  if (hasStrongAd && hasTencentVideoProto) {
    // This response is an embedded Tencent ad module, not a video segment.
    // Emptying it is safer than trying to rewrite protobuf length fields.
    done("");
  }

  done();
} catch (_) {
  done();
}
