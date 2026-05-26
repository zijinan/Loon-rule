/*
 * Tencent Video Safe request cleaner for Loon.
 *
 * Low-power design:
 * - http-request only; no response body rewrite.
 * - Replaces ad request markers with same-length neutral markers.
 * - Returns an empty response only for clearly ad-only RPC requests.
 */

(function () {
  const MAX_BODY_SIZE = 512 * 1024;
  const url = ($request && $request.url) || "";
  const method = (($request && $request.method) || "").toUpperCase();
  const rawBody =
    typeof $request.body !== "undefined" ? $request.body : $request.bodyBytes;
  let body = bodyToText(rawBody);

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

  function done(payload) {
    if (payload === undefined) return $done({});
    return $done(payload);
  }

  function reject(reason) {
    return $done({
      response: {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Cache-Control": "no-store",
          "X-TencentVideo-AdBlock": reason || "rpc"
        },
        body: ""
      }
    });
  }

  function replaceLiteral(source, needle, replacement) {
    if (!source || needle.length !== replacement.length) return source;
    return source.split(needle).join(replacement);
  }

  function replaceRegexStable(source, regex, replacer) {
    if (!source) return source;
    return source.replace(regex, function (match, prefix) {
      const replacement = replacer(match, prefix || "");
      return replacement.length === match.length ? replacement : match;
    });
  }

  function zeroNumberParam(match, prefix) {
    return prefix + "0".repeat(match.length - prefix.length);
  }

  if (!body || body.length > MAX_BODY_SIZE || method !== "POST") {
    return done();
  }

  const isIVideo = /^https?:\/\/i\.video\.qq\.com\/?$/.test(url);
  const isGetVInfo = /^https?:\/\/(?:vv|vv6)\.video\.qq\.com\/getvinfo/.test(url);

  if (!isIVideo && !isGetVInfo) {
    return done();
  }

  const original = body;

  if (isIVideo) {
    const blockKeywords = [
      "getAdDetailJ",
      "GetPersonalCenterAdDataJ",
      "GetFollowHeartRewardAdInfoJ",
      "trpc.reward_ad_ssp.reward_judgment.reward_free_mode",
      "trpc.reward_ad_ssp.reward_ad_ssp_service.adService",
      "trpc.vip_ad_promotion.access_adaptor.CommonAccessService/AccessPromotion",
      "trpc.vip_ad_promotion.promotion_limit_svr.Limit",
      "trpc.promotion.adapter.adapter/GetFloatActivity",
      "trpc.flow_pool.gateway.FlowPoolActivity/GetPromotionGlobalConfig",
      "trpc.activity.memberExperience.ActivityTcp/getHomeGrowPopupUrl",
      "trpc.video_growth_config.gateway.ResourcePreloadService/GetPreloadResourceList",
      "trpc.adapter_group.mobile_sdk_adapter.CMCCPromoPushService"
    ];

    const hit = blockKeywords.find(function (keyword) {
      return body.indexOf(keyword) !== -1;
    });
    if (hit) {
      return reject(hit.replace(/^.*\//, "").slice(0, 80));
    }

    const swaps = [
      ["AdRequestContextInfo", "XxRequestContextInfo"],
      ["adRequestParam", "xxRequestParam"],
      ["adService", "xxService"],
      ["adVipState", "xxVipState"],
      ["mod_trailer_ad", "mod_trailer_xx"],
      ["mod_recommend_ad", "mod_recommend_xx"],
      ["reward_ad_ssp", "reward_xx_ssp"],
      ["reward_ad_ssp_service", "reward_xx_ssp_service"],
      ["video_ad_ssp_feeds", "video_xx_ssp_feeds"],
      ["vip_ad_promotion", "vip_xx_promotion"],
      ["view_ad_ssp", "view_xx_ssp"]
    ];

    for (let i = 0; i < swaps.length; i += 1) {
      body = replaceLiteral(body, swaps[i][0], swaps[i][1]);
    }

    body = replaceRegexStable(body, /(advertiser=)\d+/g, zeroNumberParam);
    body = replaceRegexStable(body, /(advertiser_name_hashed_value=)\d+/g, zeroNumberParam);
    body = replaceRegexStable(body, /(creative_finger_print=)\d+/g, zeroNumberParam);
    body = replaceRegexStable(body, /(product=)\d+/g, zeroNumberParam);
    body = replaceRegexStable(body, /(industry=)\d+/g, zeroNumberParam);
    body = replaceRegexStable(body, /(aid=)\d+/g, zeroNumberParam);
  }

  if (isGetVInfo) {
    body = replaceRegexStable(body, /spadseg=\d/g, function () {
      return "spadseg=0";
    });
    body = replaceRegexStable(body, /pluginadctrl%3D\d/g, function () {
      return "pluginadctrl%3D0";
    });
    body = replaceRegexStable(body, /pluginadctrl=\d/g, function () {
      return "pluginadctrl=0";
    });
  }

  if (body !== original) {
    return done({ body: body });
  }

  return done();
})();
