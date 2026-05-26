/*
 * TencentVideo AntiCache request filter for Quantumult X
 *
 * Strategy:
 * - Only process i.video.qq.com POST request bodies.
 * - Block ad, promotion, popup, reward-ad, and preload-material trpc tasks with tiny 204 responses.
 * - Do not read or rewrite response bodies.
 * - Do not touch video/image CDN responses, avoiding QX cache growth and playback delay.
 */

(function () {
  const url = ($request && $request.url) || "";
  const method = (($request && $request.method) || "").toUpperCase();
  const body = typeof $request.body === "string" ? $request.body : "";

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

  if (!/^https:\/\/i\.video\.qq\.com\/?$/.test(url) || method !== "POST") {
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

  const hit = blockKeywords.find((keyword) => body.indexOf(keyword) !== -1);
  if (hit) {
    return reject(hit.replace(/^.*\//, "").slice(0, 80));
  }

  return pass();
})();
