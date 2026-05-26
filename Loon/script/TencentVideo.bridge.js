/*
 * Tencent Video request guard.
 *
 * Only known ad/config requests are answered locally. Normal playback and
 * content APIs pass through untouched so video playback does not depend on a
 * third-party proxy.
 */

(function () {
  const url = ($request && $request.url) || "";
  const rawBody = pickBody($request || {});
  const bodyText = bytesToText(bodyToBytes(rawBody));

  const AD_BODY_PATTERNS = [
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
    /advertiser=\d+.*creative_finger_print=\d+/is,
    /video_ad_ssp_feeds/i,
    /ad\.userinfo\.vip/i
  ];

  const JSON_URL_PATTERNS = [
    /^https?:\/\/(?:config\.ab|tab\.video)\.qq\.com\/tab\/(?:GetTabRemoteConfig|GetTabToggle)/i,
    /^https?:\/\/rdelivery\.qq\.com\/(?:v1\/sdkconfig\/get|v1\/statistic\/report)/i,
    /^https?:\/\/playproxy\.video\.qq\.com\/monet\/comm_resource\/get/i,
    /^https?:\/\/iwan\.video\.qq\.com\/trpc\.vgopen\.mini_game_detail\.MiniGameDetail\/GetPreloadGames/i
  ];

  function pickBody(source) {
    if (source.bodyBytes) return source.bodyBytes;
    if (source.body) return source.body;
    return "";
  }

  function bodyToBytes(value) {
    if (!value) return [];
    if (typeof value === "string") {
      const bytes = [];
      for (let i = 0; i < value.length; i += 1) bytes.push(value.charCodeAt(i) & 0xff);
      return bytes;
    }
    if (typeof ArrayBuffer !== "undefined") {
      if (value instanceof ArrayBuffer) return Array.from(new Uint8Array(value));
      if (ArrayBuffer.isView && ArrayBuffer.isView(value)) {
        return Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
      }
    }
    if (typeof value.length === "number") return Array.from(value);
    return bodyToBytes(String(value));
  }

  function bytesToText(bytes) {
    let text = "";
    for (let i = 0; i < bytes.length; i += 1) text += String.fromCharCode(bytes[i] & 0xff);
    return text;
  }

  function emptyResponse(contentType, body) {
    return $done({
      response: {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "no-store",
          "X-Tencent-Video-AdBlock": "blocked"
        },
        body: body || ""
      }
    });
  }

  if (/^https?:\/\/i\.video\.qq\.com\/?/i.test(url) && AD_BODY_PATTERNS.some((pattern) => pattern.test(bodyText))) {
    return emptyResponse("application/octet-stream", "");
  }

  if (JSON_URL_PATTERNS.some((pattern) => pattern.test(url))) {
    return emptyResponse("application/json; charset=utf-8", "{}");
  }

  return $done({});
})();
