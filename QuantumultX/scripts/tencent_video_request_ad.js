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
      ["mod_trailer_ad", "mod_trailer_xx"],
      ["mod_recommend_ad", "mod_recommend_xx"],
      ["AdFeedImagePoster", "XxFeedImagePoster"],
      ["AdFocusPoster", "XxFocusPoster"],
      ["AdFeedVideoPoster", "XxFeedVideoPoster"],
      ["reward_ad_ssp", "reward_xx_ssp"],
      ["reward_ad_ssp_service", "reward_xx_ssp_service"],
      ["video_ad_ssp_feeds", "video_xx_ssp_feeds"],
      ["vip_ad_promotion", "vip_xx_promotion"],
      ["view_ad_ssp", "view_xx_ssp"],
      ["advertiser=", "xvertiserx="],
      ["creative_finger_print=", "creative_xinger_xrint="]
    ];

    for (const [needle, replacement] of swaps) {
      body = replaceLiteral(body, needle, replacement);
    }

    // vv.video.qq.com/getvinfo uses urlencoded form data for playback ads.
    if (/\/\/(?:vv|vv6)\.video\.qq\.com\/getvinfo/.test(url)) {
      body = replaceRegexStable(body, /spadseg=\d/g, () => "spadseg=0");
      body = replaceRegexStable(body, /pluginadctrl%3D\d/g, () => "pluginadctrl%3D0");
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
