/*
 * TencentVideo AntiCache request filter for Quantumult X
 *
 * Handles:
 * - i.video.qq.com POST ad / promo / popup / preload tasks
 * - vv.video.qq.com/getvinfo ad-video playinfo requests
 *
 * Returns tiny 204 when a request is confidently ad-related.
 */

(function () {
  const url = ($request && $request.url) || "";
  const method = (($request && $request.method) || "").toUpperCase();
  const rawBody = typeof $request.body === "string" ? $request.body : "";

  function pass() {
    $done({});
  }

  function reject(reason) {
    $done({
      status: "HTTP/1.1 204 No Content",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-TencentVideo-AdBlock": reason || "blocked"
      },
      body: ""
    });
  }

  if (method !== "POST") return pass();

  const body = rawBody || "";
  const decodedBody = (() => {
    try {
      return decodeURIComponent(body);
    } catch (_) {
      return body;
    }
  })();

  // Block ad getvinfo requests. In the 2026-05-26 capture, the visible ad video
  // requested getvinfo with cid empty, logintype=0, spptype=4..101, and scene=playerUiType.
  // Normal content requests had a real cid and should pass.
  if (/^https?:\/\/(vv|vv6)\.video\.qq\.com\/getvinfo/.test(url)) {
    const b = decodedBody;
    const hasEmptyCid = /(^|&)cid=(&|$)/.test(b);
    const hasAdSpptype = /(^|&)spptype=/.test(b) || b.indexOf("spptype=4,5,6") !== -1 || b.indexOf("spptype=4%2C5%2C6") !== -1;
    const hasAdScene = b.indexOf("playerUiType=6") !== -1 || b.indexOf("sdtfrom=v3111") !== -1;
    const hasNoUser = /(^|&)userid=(&|$)/.test(b) || /(^|&)openid=(&|$)/.test(b);
    const explicitAdMarkers = [
      "spadseg=3",
      "pluginadctrl=1",
      "ad_type",
      "ad_scene",
      "ad_request_id"
    ];
    const markerHit = explicitAdMarkers.some((k) => b.indexOf(k) !== -1);

    if ((hasEmptyCid && hasAdSpptype) || (hasEmptyCid && hasAdScene) || (hasNoUser && hasAdSpptype && markerHit)) {
      return reject("getvinfo-ad-playinfo");
    }
    return pass();
  }

  if (!/^https:\/\/i\.video\.qq\.com\/?$/.test(url)) {
    return pass();
  }

  if (!body) return pass();

  const blockKeywords = [
    // Startup / reward / ad service
    "trpc.reward_ad_ssp.reward_judgment.reward_free_mode",
    "trpc.reward_ad_ssp.reward_ad_ssp_service.adService",
    "com.tencent.qqlive.protocol.pb.adService",
    "trpc.business_feeds.video_ad_ssp_feeds.ServerAdFeedsVideo",
    "video_ad_ssp_feeds",
    "ServerAdFeedsVideo",
    "AdRequestContextInfo",

    // VIP promo / float popup / activity popup
    "trpc.vip_ad_promotion.access_adaptor.Adaptor",
    "trpc.vip_ad_promotion.access_adaptor.CommonAccessService/AccessPromotion",
    "trpc.vip_ad_promotion.promotion_limit_svr.Limit",
    "trpc.promotion.adapter.adapter/GetFloatActivity",
    "trpc.activity.memberExperience.ActivityTcp/getHomeGrowPopupUrl",
    "GetPersonalCenterAdData",

    // Preload / local cached material tasks
    "trpc.video_growth_config.gateway.ResourcePreloadService",
    "trpc.video_growth_config.gateway.ResourcePreloadService/GetPreloadResourceList",
    "GetPreloadResourceList",

    // SDK/operator promotion init
    "trpc.adapter_group.mobile_sdk_adapter.CMCCPromoPushService",

    // Common ad request markers seen in Tencent Video payloads
    "ad_screen",
    "ad_type",
    "ad_device_platform",
    "ad_pos",
    "ad_scene",
    "ad_request_id",
    "advertiser=",
    "qz_gdt"
  ];

  const hit = blockKeywords.find((keyword) => body.indexOf(keyword) !== -1 || decodedBody.indexOf(keyword) !== -1);
  if (hit) {
    return reject(hit.replace(/^.*\//, "").slice(0, 80));
  }

  return pass();
})();
