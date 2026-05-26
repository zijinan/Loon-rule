/*
 * Tencent Video protobuf/binary response ad guard for Loon.
 *
 * Clears only small ad-only modules; large feed/detail responses pass through.
 */

(function () {
  const MAX_BODY_SIZE = 1024 * 1024;
  const headers = ($response && $response.headers) || {};
  const rawBody = pickBody();
  const body = bodyToText(rawBody);
  let output;

  function valueLength(value) {
    if (!value) return 0;
    if (typeof value === "string") return value.length;
    if (typeof ArrayBuffer !== "undefined") {
      if (value instanceof ArrayBuffer) return value.byteLength;
      if (ArrayBuffer.isView && ArrayBuffer.isView(value)) return value.byteLength;
    }
    return typeof value.length === "number" ? value.length : 0;
  }

  function pickBody() {
    const bodyBytes = $response && $response.bodyBytes;
    if (valueLength(bodyBytes) > 0) return bodyBytes;

    const bodyValue = $response && $response.body;
    if (valueLength(bodyValue) > 0) return bodyValue;

    return bodyBytes || bodyValue || "";
  }

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
          "vfiles.gtimg.cn/wupload/xy/promotiontest",
          "xs.gdt.qq.com",
          "extshort.weixin.qq.com",
          "minorshort.weixin.qq.com",
          "wzq.tenpay.com",
          "wzqcf.gtimg.com",
          "proxy.finance.qq.com"
        ];

        const materialMarkers = [
          "pgdt.gtimg.cn",
          "v3.gdt.qq.com/gdt_stats.fcg",
          "review.gdtimg.com/qzone/biz/gdt",
          "nc.gdt.qq.com/gdt_report.fcg",
          "xs.gdt.qq.com",
          "isrpt-vn.gdt.qq.com",
          "adfeedimageposter",
          "adfocusposter",
          "adfeedvideoposter"
        ];

        const hasAdOnlyModule = body.length <= 64 * 1024 && adOnlyMarkers.some(function (x) { return text.includes(x.toLowerCase()); });
        const hasSmallPromotionModule = body.length <= 64 * 1024 && smallPromotionMarkers.some(function (x) { return text.includes(x.toLowerCase()); });
        const hasAdMaterial = materialMarkers.some(function (x) { return text.includes(x.toLowerCase()); });
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
