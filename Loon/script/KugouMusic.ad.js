/*
Kugou Music AntiCache Ad Cleaner for Loon
- Only used on small JSON endpoints.
- Do not attach this script to music streams, image CDN, or large media APIs.
*/

const url = ($request && $request.url) || '';
const headers = { 'Content-Type': 'application/json; charset=utf-8' };

function emptyPayload() {
  return {
    status: 200,
    headers,
    body: JSON.stringify({
      status: 1,
      error_code: 0,
      errcode: 0,
      data: {},
      list: [],
      ads: []
    })
  };
}

function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function looksLikeAdKey(key) {
  return /(^|_)(ad|ads|advert|advertise|advertisement|banner|splash|popup|pop|recommend_ad|promotion|promote|commercial|feed_ad|material|pendant|gift|bounty)(_|$)/i.test(key)
    || /广告|开屏|弹窗|推广|挂件|礼物|赏金|活动/.test(key);
}

function clean(obj, depth) {
  if (depth > 8 || obj == null) return obj;

  if (Array.isArray(obj)) {
    return obj
      .map(item => clean(item, depth + 1))
      .filter(item => {
        if (!isObject(item)) return true;
        const text = JSON.stringify(item).slice(0, 2000);
        return !/(广告|开屏|弹窗|推广|挂件|礼物|赏金|ad_|ads_|splash|popup|banner|promotion|commercial)/i.test(text);
      });
  }

  if (!isObject(obj)) return obj;

  for (const key of Object.keys(obj)) {
    if (looksLikeAdKey(key)) {
      if (Array.isArray(obj[key])) obj[key] = [];
      else if (isObject(obj[key])) obj[key] = {};
      else obj[key] = '';
      continue;
    }
    obj[key] = clean(obj[key], depth + 1);
  }
  return obj;
}

try {
  // These endpoints are non-core promotional payloads from the packet capture.
  // Return a small valid JSON to avoid caching huge gift/base64 resources.
  if (/\/sing7\/json\/v2\/cdn\/big_gift_list\/v2/i.test(url)
    || /\/sing7\/kingsbounty\/json\/v2\/cdn\/douge\/get_bounty_homepage/i.test(url)
    || /\/pendant\/v1\/get_user_pendant/i.test(url)
    || /youthimgbssdl\.kugou\.com\/[^/]+\.json/i.test(url)) {
    $done({ response: emptyPayload() });
  } else if ($response && $response.body) {
    let body = $response.body;
    // Safety: if a response is unexpectedly large, do not parse repeatedly.
    if (body.length > 262144) {
      $done({});
    } else {
      let json = JSON.parse(body);
      json = clean(json, 0);
      $done({ body: JSON.stringify(json) });
    }
  } else {
    $done({});
  }
} catch (e) {
  $done({});
}
