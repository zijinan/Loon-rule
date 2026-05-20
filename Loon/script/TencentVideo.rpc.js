/*
 * Tencent Video precise request-stage ad RPC blocker for Loon.
 *
 * Safety design:
 * - http-request only; no http-response body reading.
 * - Reads only small request bodies from i.video.qq.com.
 * - Returns an empty fake response only when an ad/promotional RPC marker is present.
 */

(function () {
  const url = $request.url || "";
  const method = ($request.method || "").toUpperCase();
  const body = bodyToText(
    typeof $request.body !== "undefined" ? $request.body : $request.bodyBytes
  );

  function bytesToText(bytes) {
    let text = "";
    for (let i = 0; i < bytes.length; i += 1) {
      text += String.fromCharCode(bytes[i] & 0xff);
    }
    return text;
  }

  function bodyToText(value) {
    if (!value) {
      return "";
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof ArrayBuffer !== "undefined") {
      if (value instanceof ArrayBuffer) {
        return bytesToText(new Uint8Array(value));
      }
      if (ArrayBuffer.isView && ArrayBuffer.isView(value)) {
        return bytesToText(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
      }
    }
    if (typeof value.length === "number") {
      return bytesToText(value);
    }
    return String(value);
  }

  function pass() {
    $done({});
  }

  function reject(reason) {
    $done({
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

  if (!/^https:\/\/i\.video\.qq\.com\/?$/.test(url) || method !== "POST") {
    return pass();
  }

  if (!body) {
    return pass();
  }

  const blockKeywords = [
    "com.tencent.qqlive.protocol.pb.AdRequestContextInfo",
    "com.tencent.qqlive.protocol.pb.ChannelTopBarInfoRequest",
    "com.tencent.qqlive.protocol.pb.FeatureSequenceRequestInfo",
    "trpc.reward_ad_ssp.reward_judgment.reward_free_mode",
    "trpc.reward_ad_ssp.reward_ad_ssp_service.adService",
    "com.tencent.qqlive.protocol.pb.adService",
    "trpc.vip_ad_promotion.access_adaptor.Adaptor",
    "trpc.vip_ad_promotion.access_adaptor.CommonAccessService/AccessPromotion",
    "trpc.vip_ad_promotion.promotion_limit_svr.Limit",
    "trpc.promotion.adapter.adapter/GetFloatActivity",
    "trpc.flow_pool.gateway.FlowPoolActivity",
    "trpc.flow_pool.gateway.FlowPoolActivity/GetPromotionGlobalConfig",
    "trpc.activity.memberExperience.ActivityTcp/getHomeGrowPopupUrl",
    "trpc.video_growth_config.gateway.ResourcePreloadService",
    "trpc.video_growth_config.gateway.ResourcePreloadService/GetPreloadResourceList",
    "trpc.adapter_group.mobile_sdk_adapter.CMCCPromoPushService"
  ];

  const hit = blockKeywords.find((keyword) => body.indexOf(keyword) !== -1);
  if (hit) {
    return reject(hit.replace(/^.*\//, "").slice(0, 80));
  }

  return pass();
})();
