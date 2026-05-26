/*
Tencent Video proto/binary ad guard for Quantumult X

Observed in capture:
- https://i.video.qq.com/ responses may contain embedded ad module text in a protobuf/octet-stream body.
- The targeted module includes markers such as mod_trailer_ad, AdFeedImagePoster, pgdt.gtimg.cn, v3.gdt.qq.com.

Safety:
- Only handles small/medium API bodies, never video/image/CDN payloads.
- Keep protobuf/body length stable by replacing captured ad identifiers with same-length inert identifiers.
- Normal i.video.qq.com API responses are passed through unchanged.
*/

const MAX_BODY_SIZE = 1024 * 1024;
const url = ($request && $request.url) || "";
const body = ($response && $response.body) || "";
const headers = ($response && $response.headers) || {};

function header(name) {
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return String(headers[key] || "");
  }
  return "";
}

let output;

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

const JSON_EMPTY_KEYS = new Set([
  "ad",
  "ads",
  "ad_list",
  "adlist",
  "ad_info",
  "adinfo",
  "advert",
  "advertise",
  "advertisement",
  "splash",
  "splash_ad",
  "launch_ad",
  "pre_ad",
  "pause_ad"
]);

const JSON_AD_KEY_RE = /(^|_)(ad|ads|advert|advertise|advertisement|splash|launch|gdt|pgdt|promotion|monet)(_|$)/;

const JSON_AD_NEEDLES = [
  "pgdt.gtimg.cn",
  "v3.gdt.qq.com",
  "c.gdt.qq.com",
  "c3.gdt.qq.com",
  "gdt.qq.com",
  "e.qq.com",
  "sdkreport.e.qq.com",
  "iacc.qq.com",
  "iacc.rec.qq.com",
  "rdelivery.qq.com/v1/statistic/report",
  "vip.image.video.qpic.cn/wupload/xy/promotiontest",
  "vip.image.video.qpic.cn/vupload/20221226/99fe431672021919301.zip",
  "vfiles.gtimg.cn/wupload/xy/promotiontest",
  "vfiles.gtimg.cn/wupload/xy/starter",
  "vfiles.gtimg.cn/wupload/xy/universal",
  "i.gtimg.cn/qqlive/images/20180111/i1515679287_1.jpg",
  "m.v.qq.com/activity/qqvideo/interact/vod.html",
  "m.x.qq.com/activity/qqvideo/interact/vod.html",
  "mall.video.qq.com/ecommerce/detail",
  "mall.video.qq.com",
  "weixinadinfo",
  "nativeOpenAdCanvas",
  "OpenAdCanvas",
  "SITE_SET_WECHAT",
  "wx_appid",
  "gdt/ams_ad_audit",
  "ams_ad_audit",
  "click_id",
  "click_ext",
  "click_data",
  "gdt_ad_id",
  "dynamic_creative",
  "pages/act/ams/union",
  "AdOpenWxProgramAction",
  "AdDownloadAction",
  "openadcanvas",
  "adopenwxprogramaction",
  "addownloadaction",
  "tytx.m.cn.miaozhen.com",
  "ad_frame_time",
  "type_ad_frame_time",
  "adfeedimageposter",
  "adfocusposter",
  "adfeedvideoposter",
  "splash_ad",
  "launch_ad",
  "pre_ad",
  "pause_ad",
  "adtype",
  "advertisement"
];

const JSON_KEEP_NEEDLES = [
  "topic-feeds-in-video",
  "wuji_dashboard/xy/starter",
  "video.qq.com/getvinfo",
  "vv.video.qq.com/getvinfo"
];

function looksLikeJson(source, contentType) {
  const trimmed = source.trim();
  return contentType.includes("application/json") || contentType.includes("text/json") || trimmed.startsWith("{") || trimmed.startsWith("[");
}

function isJsonAdObject(value) {
  if (!value || typeof value !== "object") return false;
  let text = "";
  try {
    text = JSON.stringify(value).toLowerCase();
  } catch (_) {
    return false;
  }
  if (JSON_KEEP_NEEDLES.some((needle) => text.includes(needle))) return false;
  return JSON_AD_NEEDLES.some((needle) => text.includes(needle));
}

function emptyJsonValue(value) {
  if (Array.isArray(value)) return [];
  if (value && typeof value === "object") return {};
  if (typeof value === "number") return 0;
  if (typeof value === "boolean") return false;
  return "";
}

function cleanJson(value) {
  if (!value || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    for (let i = value.length - 1; i >= 0; i--) {
      const item = value[i];
      if (isJsonAdObject(item)) {
        value.splice(i, 1);
      } else {
        cleanJson(item);
      }
    }
    return value;
  }

  for (const key of Object.keys(value)) {
    const normalized = key.toLowerCase().replace(/[-\s]/g, "_");
    const compact = normalized.replace(/_/g, "");

    if (JSON_EMPTY_KEYS.has(normalized) || JSON_EMPTY_KEYS.has(compact) || JSON_AD_KEY_RE.test(normalized)) {
      value[key] = emptyJsonValue(value[key]);
      continue;
    }

    if (Array.isArray(value[key])) {
      cleanJson(value[key]);
      continue;
    }

    if (isJsonAdObject(value[key])) {
      value[key] = emptyJsonValue(value[key]);
      continue;
    }

    cleanJson(value[key]);
  }

  return value;
}

try {
  if (body && body.length <= MAX_BODY_SIZE) {
    const ct = header("Content-Type").toLowerCase();
    const isMedia = ct.includes("image/") || ct.includes("video/") || ct.includes("mpegurl");

    if (!isMedia) {
      let rewritten = String(body);
      if (looksLikeJson(rewritten, ct)) {
        try {
          const obj = JSON.parse(rewritten);
          const cleaned = JSON.stringify(cleanJson(obj));
          if (cleaned !== rewritten) output = cleaned;
        } catch (_) {
        }
      } else {
        const text = rewritten.toLowerCase();

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
          "vfiles.gtimg.cn/wupload/xy/starter",
          "vfiles.gtimg.cn/wupload/xy/universal",
          "vip.image.video.qpic.cn/vupload/20221226"
        ];

        const materialMarkers = [
          "pgdt.gtimg.cn",
          "p2.l.qq.com",
          "dldir1.qq.com/qqmi/video_ad",
          "v3.gdt.qq.com",
          "c3.gdt.qq.com",
          "v3.gdt.qq.com/gdt_stats.fcg",
          "review.gdtimg.com/qzone/biz/gdt",
          "nc.gdt.qq.com/gdt_report.fcg",
          "adsmind.gdtimg.com",
          "t.gdt.qq.com",
          "tytx.m.cn.miaozhen.com",
          "type.googleapis.com/com.tencent.qqlive.protocol.pb.ad",
          "inneradpromotioneventlist",
          "mod_adfeed",
          "ad_focus",
          "ad_card",
          "adnetwork",
          "m.v.qq.com/activity/qqvideo/interact/vod.html",
          "m.x.qq.com/activity/qqvideo/interact/vod.html",
          "mall.video.qq.com/ecommerce/detail",
          "i.gtimg.cn/qqlive/images/20180111",
          "adfeedimageposter",
          "adfocusposter",
          "adfeedvideoposter",
          "creative_xinger_xrint",
          "xvertiserx_name_hashed_value",
          "pre-download",
          "card-prerank",
          "card-rank",
          "adopenwxprogramaction",
          "addownloadaction",
          "openadcanvas",
          "click_id",
          "__click_id__",
          "click_data",
          "click_ext",
          "__click_lpp__",
          "clklpp",
          "dynamic_creative",
          "pages/act/ams/union",
          "label=ams",
          "zq_ams_v18",
          "gdt_ad_id"
        ];

        const pageActionMarkers = [
          "yuanbao.tencent.com/evt/tvdl",
          "m.manju.v.qq.com/z/kairos/download",
          "film.video.qq.com/weixin/v3/device"
        ];

        const hasAdOnlyModule = body.length <= 64 * 1024 && adOnlyMarkers.some((x) => text.includes(x));
        const hasSoftPromotionModule = body.length <= 64 * 1024 && smallPromotionMarkers.some((x) => text.includes(x));
        const hasAdMaterial = materialMarkers.some((x) => text.includes(x));
        const hasTencentVideoProto = text.includes("qqlive_rsp_head") || text.includes("trpc.ovb_galaxy") || text.includes("trpc.access.video_access_app");
        const hasTencentAdConfig = url.includes("config.ab.qq.com/tab/GetTabRemoteConfig") && (
          text.includes("adsplash") ||
          text.includes("splash") ||
          text.includes("launch") ||
          text.includes("iqad_") ||
          text.includes("qad_") ||
          text.includes("ad_focus_strategy")
        );
        const hasPageState = hasTencentVideoProto && (
          text.includes("page_offset") ||
          text.includes("sdk_page_ctx") ||
          text.includes("video_un_page_index") ||
          text.includes("_ctrl_page_index")
        );
        const hasHardAdSignal = hasTencentAdConfig || hasAdMaterial || hasAdOnlyModule || text.includes("advertiser=") || text.includes("creative_finger_print=") || text.includes("creative_xinger_xrint") || text.includes("xvertiserx_name_hashed_value");
        const hasPageAction = pageActionMarkers.some((x) => text.includes(x));
        const pageStateKeys = {
          "ad_session_id": true,
          "ad_schedule_ability": true,
          "ad_group_id": true,
          "ad_idx": true,
          "whole_ad_type": true,
          "ssp_ad_type": true,
          "ams_ad_type": true,
          "feeds_ad_style": true,
          "view_ad_ssp": true,
          "view_xx_ssp": true,
          "view_ad_ssp_engine_passthrough": true,
          "view_xx_ssp_engine_passthrough": true,
          "view_ad_ssp_ad": true,
          "view_xx_ssp_ad": true,
          "parallel_ad_abs_pos": true,
          "parallel_ad_pos": true,
          "ad_infinite_init": true,
          "ad_and_content": true,
          "native_ad_pos": true,
          "last_ad_type": true,
          "ad_abs_seq": true,
          "ad_abs_pos": true,
          "ad_count": true,
          "adload": true,
          "ad_pos": true,
          "jump_add_extra_info": true,
          "rerank_ad_info": true,
          "is_locked_ad": true,
          "is_converted_native_ad": true,
          "ad_nfb_none_view": true,
          "content_type_ad": true,
          "select_ad_type": true
        };

        if (hasHardAdSignal || (hasSoftPromotionModule && !hasPageState)) {
          const swaps = [
            ["iqad_", "ixxd_"],
            ["qad_", "qxx_"],
            ["QAD", "QXX"],
            ["adsplash_online_network", "xxsplxsh_offlin_network"],
            ["ADSplash", "XXSplxsh"],
            ["adsplash", "xxsplxsh"],
            ["splash", "xplash"],
            ["launch", "xaunch"],
            ["pgdt.gtimg.cn", "pgdt.gtimg.zz"],
            ["p2.l.qq.com", "px.l.qq.com"],
            ["v3.gdt.qq.com", "xx.gdt.qq.com"],
            ["vr.gdt.qq.com", "xx.gdt.qq.com"],
            ["xs.gdt.qq.com", "xx.gdt.qq.com"],
            ["c3.gdt.qq.com", "xx.gdt.qq.com"],
            ["nc.gdt.qq.com", "xx.gdt.qq.com"],
            ["review.gdtimg.com", "revxxx.gdtimg.com"],
            ["adsmind.gdtimg.com", "xxsmind.gdtimg.com"],
            ["t.gdt.qq.com", "x.gdt.qq.com"],
            ["isrpt-vn.gdt.qq.com", "isrpt-xx.gdt.qq.com"],
            ["isrpt-in.gdt.qq.com", "isrpt-xx.gdt.qq.com"],
            ["iacc.qq.com", "iaxx.qq.com"],
            ["iacc.rec.qq.com", "iaxx.rec.qq.com"],
            ["vfiles.gtimg.cn/wupload/ad_control_config_test.ad_copy_pic_url_conf", "vfiles.gtimg.zz/wupload/ad_control_config_test.ad_copy_pic_url_conf"],
            ["vfiles.gtimg.cn/wupload/xy/promotiontest", "vfiles.gtimg.zz/wupload/xy/promotiontest"],
            ["vfiles.gtimg.cn/wupload/xy/promotionTest", "vfiles.gtimg.zz/wupload/xy/promotionTest"],
            ["vfiles.gtimg.cn/wupload/xy/starter", "vfiles.gtimg.zz/wupload/xy/starter"],
            ["vfiles.gtimg.cn/wupload/xy/universal", "vfiles.gtimg.zz/wupload/xy/universal"],
            ["vip.image.video.qpic.cn/wupload/xy/promotiontest", "vip.image.video.qpic.zz/wupload/xy/promotiontest"],
            ["vip.image.video.qpic.cn/wupload/xy/promotionTest", "vip.image.video.qpic.zz/wupload/xy/promotionTest"],
            ["vip.image.video.qpic.cn/vupload/20221226", "vip.image.video.qpic.zz/vupload/20221226"],
            ["i.gtimg.cn/qqlive/images/20180111", "i.gtimg.zz/qqlive/images/20180111"],
            ["ad_control_config_test", "xx_control_config_test"],
            ["tytx.m.cn.miaozhen.com", "tytx.m.cn.miaozhen.bad"],
            ["m.v.qq.com/activity/qqvideo/interact/vod.html", "m.v.qq.com/activity/qqvideo/interact/vod.htm0"],
            ["m.x.qq.com/activity/qqvideo/interact/vod.html", "m.x.qq.com/activity/qqvideo/interact/vod.htm0"],
            ["yuanbao.tencent.com/evt/tvdl", "yuanbao.tencent.com/evt/null"],
            ["m.manju.v.qq.com/z/kairos/download", "m.manju.v.qq.com/z/kairos/disabled"],
            ["film.video.qq.com/weixin/v3/device", "film.video.qq.com/weixin/v3/blank_"],
            ["mall.video.qq.com/ecommerce/detail", "mall.video.qq.com/ecommerce/blank_"],
            ["pgdt.gtimg.zz", "pxxx.gtimg.zz"],
            ["gdt_report.fcg", "xxx_report.fcg"],
            ["gdt_click.fcg", "xxx_click.fcg"],
            ["gdt_stats.fcg", "xxx_stats.fcg"],
            ["gdt/ams_ad_audit", "xxx/ams_xx_audit"],
            ["ams_ad_audit", "ams_xx_audit"],
            ["gdt.qq.com", "xxx.qq.com"],
            ["gdtimg.com", "xxximg.com"],
            ["mall.video.qq.com", "mall.video.qq.zzz"],
            ["\"enter_action_show\":\"1\"", "\"enter_action_show\":\"0\""],
            ["\"enter_action_type\":\"4\"", "\"enter_action_type\":\"0\""],
            ["\"action_type\":\"4\"", "\"action_type\":\"0\""],
            ["\"biz_id\":7", "\"biz_id\":0"],
            ["\"opsrc\":1", "\"opsrc\":0"],
            ["\"vet\":1840723200,\"datatype\":5", "\"vet\":1000000000,\"datatype\":0"],
            ["\"datatype\":5", "\"datatype\":0"],
            ["type.googleapis.com/com.tencent.qqlive.protocol.pb.Ad", "type.googleapis.com/com.tencent.qqlive.protocol.pb.Xx"],
            ["com.tencent.qqlive.protocol.pb.Ad", "com.tencent.qqlive.protocol.pb.Xx"],
            ["AdOpenWxProgramAction", "XxStopXxProgramAction"],
            ["XxOpenXxProgramAction", "XxStopXxProgramAction"],
            ["OpenWxProgramAction", "StopXxProgramAction"],
            ["OpenXxProgramAction", "StopXxProgramAction"],
            ["AdDownloadAction", "XxDisabledAction"],
            ["XxDownloadAction", "XxDisabledAction"],
            ["http://c.l.qq.com/click", "http://x.l.qq.com/blank"],
            ["click_id", "xxxxx_id"],
            ["__CLICK_ID__", "__XXXXX_ID__"],
            ["click_data", "xxxxx_data"],
            ["click_ext", "xxxxx_ext"],
            ["__CLICK_LPP__", "__XXXXX_LPP__"],
            ["clklpp", "xxklpp"],
            ["dynamic_creative_id", "dynamic_xreative_id"],
            ["dynamic_creative", "dynamic_xreative"],
            ["pages/act/ams/union", "pages/act/xxx/union"],
            ["label=ams", "label=xxx"],
            ["zq_ams_v18", "zq_xxx_v18"],
            ["gdt_ad_id", "xxx_xx_id"],
            ["gh_", "gx_"],
            ["InnerAdPromotionEventList", "InnerXxPromotionEventList"],
            ["mod_trailer_ad", "mod_trailer_xx"],
            ["mod_recommend_ad", "mod_recommend_xx"],
            ["mod_adfeed", "mod_xxfeed"],
            ["adpass", "xxpass"],
            ["adNetwork", "xxNetwork"],
            ["advertiser", "xvertiserx"],
            ["adgroup_id", "xxgroup_id"],
            ["adtype", "xxtype"],
            ["ad.vipinfo", "xx.vipinfo"],
            ["_ad_insert_mix_block", "_xx_insert_mix_block"],
            ["ad_focus", "xx_focus"],
            ["ad_block", "xx_block"],
            ["ad_action_type", "xx_action_type"],
            ["ad_playmode", "xx_playmode"],
            ["ad_pr_type", "xx_pr_type"],
            ["ad_request_id", "xx_request_id"],
            ["ad_session_id", "xx_session_id"],
            ["ad_schedule_ability", "xx_schedule_ability"],
            ["ad_group_id", "xx_group_id"],
            ["ad_idx", "xx_idx"],
            ["whole_ad_type", "whole_xx_type"],
            ["ssp_ad_type", "ssp_xx_type"],
            ["ams_ad_type", "ams_xx_type"],
            ["feeds_ad_style", "feeds_xx_style"],
            ["view_ad_ssp_engine_passthrough", "view_xx_ssp_engine_passthru_xx"],
            ["view_xx_ssp_engine_passthrough", "view_xx_ssp_engine_passthru_xx"],
            ["view_ad_ssp_ad", "view_xx_ssp_xx"],
            ["view_xx_ssp_ad", "view_xx_ssp_xx"],
            ["parallel_ad_abs_pos", "parallel_xx_abs_pos"],
            ["parallel_ad_pos", "parallel_xx_pos"],
            ["ad_infinite_init", "xx_infinite_init"],
            ["ad_and_content", "xx_and_content"],
            ["native_ad_pos", "native_xx_pos"],
            ["last_ad_type", "last_xx_type"],
            ["ad_abs_seq", "xx_abs_seq"],
            ["ad_abs_pos", "xx_abs_pos"],
            ["ad_count", "xx_count"],
            ["adload", "xxload"],
            ["ad_pos", "xx_pos"],
            ["gdt_vid", "xxx_vid"],
            ["qz_gdt", "qz_xxx"],
            ["jump_add_extra_info", "jump_xxx_extra_info"],
            ["rerank_ad_info", "rerank_xx_info"],
            ["is_locked_ad", "is_locked_xx"],
            ["is_converted_native_ad", "is_converted_native_xx"],
            ["ad_nfb_none_view", "xx_nfb_none_view"],
            ["content_type_ad", "content_type_xx"],
            ["select_ad_type", "select_xx_type"],
            ["fromAd", "fromXx"],
            ["ADTAG", "XXTAG"],
            ["AD/id", "XX/id"],
            ["__SELECT_AD_TYPE__", "__SELECT_XX_TYPE__"],
            ["__ADX_EXPOSURE_TYPE__", "__XXX_EXPOSURE_TYPE__"],
            ["kNoSubAdType", "kNoSubXxType"],
            ["skadnetwork", "skxxnetwork"],
            ["dldir1.qq.com/qqmi/video_ad", "dldir1.qq.com/qqmi/video_xx"],
            ["user_center_ad_middle", "user_center_xx_middle"],
            ["adNetworkSourceAppStoreIdentifier", "xxNetworkSourceAppStoreIdentifier"],
            ["adNetworkPayloadVersion", "xxNetworkPayloadVersion"],
            ["adNetworkImpressionTimestamp", "xxNetworkImpressionTimestamp"],
            ["AdRequestContextInfo", "XxRequestContextInfo"],
            ["adRequestParam", "xxRequestParam"],
            ["adService", "xxService"],
            ["adVipState", "xxVipState"],
            ["getAdDetailJ", "getXxDetailJ"],
            ["GetPersonalCenterAdDataJ", "GetPersonalCenterXxDataJ"],
            ["GetFollowHeartRewardAdInfoJ", "GetFollowHeartRewardXxInfoJ"],
            ["video_ad/mini_game_feeds", "video_xx/mini_game_feeds"],
            ["ad.viploading", "xx.viploading"],
            ["ad.userinfo.vip", "xx.userinfo.vip"],
            ["WxProgram", "XxProgram"],
            ["wx_appid", "xx_appid"],
            ["WX_APPID", "XX_APPID"],
            ["weixinadinfo", "weixinxxinfo"],
            ["SITE_SET_WECHAT", "SITE_SET_XXCHAT"],
            ["WECHAT", "XXCHAT"],
            ["nativeOpenAdCanvas", "nativeStopXxCanvas"],
            ["nativeOpenXxCanvas", "nativeStopXxCanvas"],
            ["OpenAdCanvas", "StopXxCanvas"],
            ["OpenXxCanvas", "StopXxCanvas"],
            ["AdFeedImagePoster", "XxFeedImagePoster"],
            ["AdFocusPoster", "XxFocusPoster"],
            ["AdFeedVideoPoster", "XxFeedVideoPoster"],
            ["adfeedimageposter", "xxfeedimageposter"],
            ["adfocusposter", "xxfocusposter"],
            ["adfeedvideoposter", "xxfeedvideoposter"],
            ["advertiser=", "xvertiserx="],
            ["xvertiserx_name_hashed_value", "xvertiserx_name_hxshed_vxlue"],
            ["creative_finger_print=", "xreative_xinger_xrint="],
            ["creative_xinger_xrint", "xreative_xinger_xrint"],
            ["PRE-DOWNLOAD", "XXX-DOWNLOAD"],
            ["CARD-PRERANK", "CARD-PREXXXX"],
            ["CARD-RANK", "CARD-XXXX"],
            ["reward_ad_ssp_service", "reward_xx_ssp_service"],
            ["reward_ad_ssp", "reward_xx_ssp"],
            ["video_ad_ssp_feeds", "video_xx_ssp_feeds"],
            ["video_ad_ssp", "video_xx_ssp"],
            ["vip_ad_promotion", "vip_xx_promotion"],
            ["view_ad_ssp", "view_xx_ssp"],
            ["ServerAdFeedsVideo", "ServerXxFeedsVideo"],
            ["serveradfeedsvideo", "serverxxfeedsvideo"],
            ["view_xx_ssp", "view_yy_xxp"],
            ["video_xx_ssp", "video_yy_xxp"],
            ["reward_xx_ssp", "reward_yy_xxp"],
            ["ssp_xx_type", "xxp_xx_type"],
            ["ams_xx_type", "xxx_xx_type"],
            ["GsADCoIB", "GsXXCoIB"]
          ];

          for (const [needle, replacement] of swaps) {
            if (hasPageState && pageStateKeys[needle]) continue;
            rewritten = replaceLiteral(rewritten, needle, replacement);
          }

          rewritten = replaceRegexStable(rewritten, /(^|[^A-Za-z0-9])wx([0-9a-f]{16})/gi, (match) => {
            const prefix = match.slice(0, -18);
            return `${prefix}xx${match.slice(prefix.length + 2)}`;
          });
          if (!hasPageState) {
            rewritten = replaceRegexStable(rewritten, /(^|[^A-Za-z0-9_])ad_/g, (match) => `${match.slice(0, -3)}xx_`);
            rewritten = replaceRegexStable(rewritten, /(^|[^A-Za-z0-9_])ads_/g, (match) => `${match.slice(0, -4)}xxs_`);
          }

          if (rewritten !== body) output = rewritten;
        } else if (hasPageState && hasPageAction) {
          const pageActionSwaps = [
            ["yuanbao.tencent.com/evt/tvdl", "yuanbao.tencent.com/evt/null"],
            ["m.manju.v.qq.com/z/kairos/download", "m.manju.v.qq.com/z/kairos/disabled"],
            ["film.video.qq.com/weixin/v3/device", "film.video.qq.com/weixin/v3/blank_"]
          ];

          for (const [needle, replacement] of pageActionSwaps) {
            rewritten = replaceLiteral(rewritten, needle, replacement);
          }

          if (rewritten !== body) output = rewritten;
        }
      }
    }
  }
} catch (_) {
}

if (output === undefined) {
  $done({});
} else {
  $done({ body: output });
}
