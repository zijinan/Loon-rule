/*
 * Tencent Video protobuf/binary response ad guard for Loon.
 *
 * Ported from QuantumultX/scripts/tencent_video_proto_ad.js.
 * Clears only small ad-only modules; large feed/detail responses pass through.
 */

(function () {
  const MAX_BODY_SIZE = 1024 * 1024;
  const headers = ($response && $response.headers) || {};
  const rawBody =
    typeof $response.body !== "undefined" ? $response.body : $response.bodyBytes;
  const body = bodyToText(rawBody);
  let output;

  function bytesToText(bytes) {
    let text = "";
    for (let i = 0; i < bytes.length; i += 1) {
      text += String.fromCharCode(bytes[i] & 0xff);
    }
    return text;
  }

  function bodyToText(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof ArrayBuffer !== "undefined") {
      if (value instanceof ArrayBuffer) return bytesToText(new Uint8Array(value));
      if (ArrayBuffer.isView && ArrayBuffer.isView(value)) {
        return bytesToText(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
      }
    }
    if (typeof value.length === "number") return bytesToText(value);
    return String(value);
  }

  function header(name) {
    const lower = name.toLowerCase();
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === lower) return String(headers[key] || "");
    }
    return "";
  }

  try {
    if (body && body.length <= MAX_BODY_SIZE) {
      const ct = header("Content-Type").toLowerCase();
      const isMedia = ct.includes("image/") || ct.includes("video/") || ct.includes("mpegurl");

      if (!isMedia) {
        const text = String(body).toLowerCase();

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

        const hasAdOnlyModule = body.length <= 64 * 1024 && adOnlyMarkers.some(function (x) { return text.includes(x); });
        const hasSmallPromotionModule = body.length <= 64 * 1024 && smallPromotionMarkers.some(function (x) { return text.includes(x); });
        const hasAdMaterial = materialMarkers.some(function (x) { return text.includes(x); });
        const hasTencentVideoProto = text.includes("qqlive_rsp_head") || text.includes("trpc.ovb_galaxy") || text.includes("trpc.access.video_access_app");

        if ((hasAdOnlyModule || hasSmallPromotionModule) && (hasAdMaterial || hasTencentVideoProto)) {
          output = "";
        }
      }
    }
  } catch (_) {}

  if (output === undefined) {
    return $done({});
  }
  return $done({ body: output });
})();
