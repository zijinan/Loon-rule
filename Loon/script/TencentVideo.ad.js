/*
 * 腾讯视频广告/预加载缓存拦截 for Loon
 *
 * 设计：
 * - 只处理请求阶段脚本。
 * - 不读取、不改写大响应体，避免 Loon 缓存膨胀。
 * - 阻止广告接口、推广弹窗接口、列表广告、广告预加载/本地缓存任务。
 */

(function () {
  const url = $request.url || "";
  const method = ($request.method || "").toUpperCase();
  const body = typeof $request.body === "string" ? $request.body : "";

  function pass() {
    $done({});
  }

  function reject(reason) {
    $done({
      response: {
        status: 204,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
          "X-TencentVideo-AdBlock": reason || "blocked"
        },
        body: ""
      }
    });
  }

  if (!/^https:\/\/i\.video\.qq\.com\/?$/.test(url) || method !== "POST") {
    return pass();
  }

  if (!body) {
    return pass();
  }

  const blockKeywords = [
    // 开屏 / 广告详情 / 激励广告
    "com.tencent.qqlive.protocol.pb.AdRequestContextInfo",
    "com.tencent.qqlive.protocol.pb.ChannelTopBarInfoRequest",
    "com.tencent.qqlive.protocol.pb.FeatureSequenceRequestInfo",
    "trpc.reward_ad_ssp.reward_judgment.reward_free_mode",
    "trpc.reward_ad_ssp.reward_ad_ssp_service.adService",
    "com.tencent.qqlive.protocol.pb.adService",

    // 会员推广 / 浮层活动 / 首页弹窗 / 信息流推广配置
    "trpc.vip_ad_promotion.access_adaptor.Adaptor",
    "trpc.vip_ad_promotion.access_adaptor.CommonAccessService/AccessPromotion",
    "trpc.vip_ad_promotion.promotion_limit_svr.Limit",
    "trpc.promotion.adapter.adapter/GetFloatActivity",
    "trpc.flow_pool.gateway.FlowPoolActivity",
    "trpc.flow_pool.gateway.FlowPoolActivity/GetPromotionGlobalConfig",
    "trpc.activity.memberExperience.ActivityTcp/getHomeGrowPopupUrl",

    // 本地缓存 / 预加载素材任务
    "trpc.video_growth_config.gateway.ResourcePreloadService",
    "trpc.video_growth_config.gateway.ResourcePreloadService/GetPreloadResourceList",

    // 运营商/SDK 推广初始化
    "trpc.adapter_group.mobile_sdk_adapter.CMCCPromoPushService"
  ];

  const hit = blockKeywords.find((keyword) => body.indexOf(keyword) !== -1);
  if (hit) {
    return reject(hit.replace(/^.*\//, "").slice(0, 80));
  }

  return pass();
})();
