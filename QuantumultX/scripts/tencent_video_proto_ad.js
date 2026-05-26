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

const MAX_BODY_SIZE = 1024 * 1024;
const body = ($response && $response.body) || "";
const headers = ($response && $response.headers) || {};

function header(name) {
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return String(headers[key] || "");
  }
  return "";
}

let output;

function replaceLiteral(source, needle, replacement) {
  if (!source || needle.length !== replacement.length) return source;
  return source.split(needle).join(replacement);
}

try {
  if (body && body.length <= MAX_BODY_SIZE) {
    const ct = header("Content-Type").toLowerCase();
    const isMedia = ct.includes("image/") || ct.includes("video/") || ct.includes("mpegurl");

    if (!isMedia) {
      let rewritten = String(body);
      const text = rewritten.toLowerCase();

      const adOnlyMarkers = [
        "mod_trailer_ad",
        "ad_control_config_test",
        "video_ad/mini_game_feeds",
        "getaddetailj",
        "getpersonalcenteraddataj",
        "ad.viploading"
      ];

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

      const hasAdOnlyModule = body.length <= 64 * 1024 && adOnlyMarkers.some((x) => text.includes(x));
      const hasSmallPromotionModule = body.length <= 64 * 1024 && smallPromotionMarkers.some((x) => text.includes(x));
      const hasAdMaterial = materialMarkers.some((x) => text.includes(x));
      const hasTencentVideoProto = text.includes("qqlive_rsp_head") || text.includes("trpc.ovb_galaxy") || text.includes("trpc.access.video_access_app");

      if ((hasAdOnlyModule || hasSmallPromotionModule) && (hasAdMaterial || hasTencentVideoProto)) {
        // This response is an embedded Tencent ad module, not a video segment.
        // Emptying it is safer than trying to rewrite protobuf length fields.
        output = "";
      } else if (hasAdMaterial || text.includes("advertiser=") || text.includes("creative_finger_print=")) {
        const swaps = [
          ["pgdt.gtimg.cn", "pgdt.gtimg.zz"],
          ["v3.gdt.qq.com", "xx.gdt.qq.com"],
          ["vr.gdt.qq.com", "xx.gdt.qq.com"],
          ["xs.gdt.qq.com", "xx.gdt.qq.com"],
          ["c3.gdt.qq.com", "xx.gdt.qq.com"],
          ["nc.gdt.qq.com", "xx.gdt.qq.com"],
          ["review.gdtimg.com", "revxxx.gdtimg.com"],
          ["iacc.qq.com", "iaxx.qq.com"],
          ["iacc.rec.qq.com", "iaxx.rec.qq.com"],
          ["vfiles.gtimg.cn", "vfiles.gtimg.zz"],
          ["vip.image.video.qpic.cn", "vip.image.video.qpic.zz"],
          ["AdFeedImagePoster", "XxFeedImagePoster"],
          ["AdFocusPoster", "XxFocusPoster"],
          ["AdFeedVideoPoster", "XxFeedVideoPoster"],
          ["adfeedimageposter", "xxfeedimageposter"],
          ["adfocusposter", "xxfocusposter"],
          ["adfeedvideoposter", "xxfeedvideoposter"],
          ["advertiser=", "xvertiserx="],
          ["creative_finger_print=", "creative_xinger_xrint="],
          ["video_ad_ssp_feeds", "video_xx_ssp_feeds"],
          ["serveradfeedsvideo", "serverxxfeedsvideo"]
        ];

        for (const [needle, replacement] of swaps) {
          rewritten = replaceLiteral(rewritten, needle, replacement);
        }

        if (rewritten !== body) output = rewritten;
      }
    }
  }
} catch (_) {
}

if (output === undefined) {
  $done({});
} else {
  $done({ body: output });
}
