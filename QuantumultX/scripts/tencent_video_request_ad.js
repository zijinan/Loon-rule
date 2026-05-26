/*
Tencent Video ad request cleaner for Quantumult X

The iOS app asks i.video.qq.com and vv.video.qq.com for ad modules inside
protobuf/form bodies. This script keeps the body length stable by replacing
ASCII ad identifiers with same-length neutral identifiers.
*/

const MAX_BODY_SIZE = 512 * 1024;
const url = ($request && $request.url) || "";
let body = ($request && $request.body) || "";

function replaceLiteral(source, needle, replacement) {
  if (!source || needle.length !== replacement.length) return source;
  return source.split(needle).join(replacement);
}

function replaceRegexStable(source, regex, replacer) {
  if (!source) return source;
  return source.replace(regex, (match) => {
    const replacement = replacer(match);
    return replacement.length === match.length ? replacement : match;
  });
}

let output;

try {
  if (body && body.length <= MAX_BODY_SIZE) {
    const original = body;

    const swaps = [
      ["AdRequestContextInfo", "XxRequestContextInfo"],
      ["adRequestParam", "xxRequestParam"],
      ["adService", "xxService"],
      ["adVipState", "xxVipState"],
      ["getAdDetailJ", "getXxDetailJ"],
      ["GetPersonalCenterAdDataJ", "GetPersonalCenterXxDataJ"],
      ["GetFollowHeartRewardAdInfoJ", "GetFollowHeartRewardXxInfoJ"],
      ["GetFloatActivity", "GetXxxxxActivity"],
      ["AccessPromotion", "AccessXxxxxxxxx"],
      ["GetPromotionGlobalConfig", "GetXxxxxxxxxGlobalConfig"],
      ["operationConfiguration", "operatixnConfiguratixn"],
      ["nextAction", "nextXxxxxx"],
      ["action_type", "xxxxxx_type"],
      ["trpc.promotion.adapter.adapter", "trpc.pxomotixn.adapter.adapter"],
      ["vip_xx_promotion", "vip_xx_pxomotixn"],
      ["promotion_limit_svr", "pxomotixn_limit_svr"],
      ["disable_display_promotion_skin", "disable_display_pxomotixn_skin"],
      ["PRE-DOWNLOAD", "XXX-DOWNLOAD"],
      ["CARD-PRERANK", "CARD-PREXXXX"],
      ["CARD-PROFILE", "CARD-PROFXXX"],
      ["CARD-RANK", "CARD-XXXX"],
      ["PRERANK", "PREXXXX"],
      ["PROFILE", "PROFXXX"],
      ["+RANK+", "+XXXX+"],
      ["mod_trailer_ad", "mod_trailer_xx"],
      ["mod_recommend_ad", "mod_recommend_xx"],
      ["AdFeedImagePoster", "XxFeedImagePoster"],
      ["AdFocusPoster", "XxFocusPoster"],
      ["AdFeedVideoPoster", "XxFeedVideoPoster"],
      ["reward_ad_ssp", "reward_xx_ssp"],
      ["reward_ad_ssp_service", "reward_xx_ssp_service"],
      ["video_ad_ssp_feeds", "video_xx_ssp_feeds"],
      ["video_ad_ssp", "video_xx_ssp"],
      ["ServerAdFeedsVideo", "ServerXxFeedsVideo"],
      ["serveradfeedsvideo", "serverxxfeedsvideo"],
      ["vip_ad_promotion", "vip_xx_promotion"],
      ["vip_xx_promotion", "vip_xx_pxomotixn"],
      ["view_ad_ssp", "view_xx_ssp"],
      ["iacc.qq.com", "iaxx.qq.com"],
      ["iacc.rec.qq.com", "iaxx.rec.qq.com"],
      ["advertiser=", "xvertiserx="],
      ["creative_finger_print=", "xreative_xinger_xrint="],
      ["qad_device_platform=5", "qad_device_platform=0"],
      ["reward_xx_ssp_service", "reward_yy_xxp_service"],
      ["reward_xx_ssp", "reward_yy_xxp"],
      ["video_xx_ssp_feeds", "video_yy_xxp_feeds"],
      ["video_xx_ssp", "video_yy_xxp"],
      ["view_xx_ssp", "view_yy_xxp"],
      ["reward_yy_xxp_service", "rewxxx_yy_xxp_service"],
      ["reward_yy_xxp", "rewxxx_yy_xxp"],
      ["reward_judgment", "rewxxx_judgment"],
      ["reward_free_mode", "rewxxx_free_mode"],
      ["GetRewardPendantJ", "GetRewxxxPendantJ"],
      ["GetRewardEntranceInfoJ", "GetRewxxxEntranceInfoJ"],
      ["last_ad_type", "last_xx_type"],
      ["focus_content_and_ad_num", "focus_content_and_xx_num"],
      ["content_count_after_last_ad", "content_count_after_last_xx"],
      ["industry_native_ad", "industry_native_xx"],
      ["has_industry_native_ad", "has_industry_native_xx"],
      ["os_version_ad_ssp_to_rear", "os_version_xx_ssp_to_rear"],
      ["ad_infinite_init", "xx_infinite_init"],
      ["ad_and_content", "xx_and_content"],
      ["native_ad_pos", "native_xx_pos"],
      ["parallel_ad_abs_pos", "parallel_xx_abs_pos"],
      ["parallel_ad_pos", "parallel_xx_pos"],
      ["ad_abs_seq", "xx_abs_seq"],
      ["ad_abs_pos", "xx_abs_pos"],
      ["ad_request_id", "xx_request_id"],
      ["ad_count", "xx_count"],
      ["ssp_adload", "ssp_xxload"],
      ["adload", "xxload"],
      ["ad_pos", "xx_pos"]
    ];

    for (const [needle, replacement] of swaps) {
      body = replaceLiteral(body, needle, replacement);
    }

    // vv.video.qq.com/getvinfo uses urlencoded form data for playback ads.
    if (/\/\/(?:vv|vv6)\.video\.qq\.com\/getvinfo/.test(url)) {
      body = replaceRegexStable(body, /spadseg=\d/g, () => "spadseg=0");
      body = replaceRegexStable(body, /spadseg%3D\d/g, () => "spadseg%3D0");
      body = replaceRegexStable(body, /spadseg%253D\d/g, () => "spadseg%253D0");
      body = replaceRegexStable(body, /pluginadctrl%3D\d/g, () => "pluginadctrl%3D0");
      body = replaceRegexStable(body, /pluginadctrl%253D\d/g, () => "pluginadctrl%253D0");
      body = replaceRegexStable(body, /pluginadctrl=\d/g, () => "pluginadctrl=0");
    }

    if (body !== original) output = body;
  }
} catch (_) {
}

if (output === undefined) {
  $done({});
} else {
  $done({ body: output });
}
