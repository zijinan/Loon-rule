/*
KuGou Music cleaner for Quantumult X.
Only attach this script to small JSON promotion endpoints.
*/

const url = ($request && $request.url) || "";

function emptyBody() {
  return JSON.stringify({
    status: 1,
    error_code: 0,
    errcode: 0,
    data: {},
    list: [],
    ads: []
  });
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function looksLikeAdKey(key) {
  return /(^|_)(ad|ads|advert|advertise|advertisement|banner|splash|popup|pop|recommend_ad|promotion|promote|commercial|feed_ad|material|pendant|gift|bounty)(_|$)/i.test(key)
    || /广告|开屏|弹窗|推广|挂件|礼物|赏金|活动/.test(key);
}

function clean(value, depth) {
  if (depth > 8 || value == null) return value;

  if (Array.isArray(value)) {
    return value
      .map((item) => clean(item, depth + 1))
      .filter((item) => {
        if (!isObject(item)) return true;
        const text = JSON.stringify(item).slice(0, 2000);
        return !/(广告|开屏|弹窗|推广|挂件|礼物|赏金|ad_|ads_|splash|popup|banner|promotion|commercial)/i.test(text);
      });
  }

  if (!isObject(value)) return value;

  for (const key of Object.keys(value)) {
    if (looksLikeAdKey(key)) {
      if (Array.isArray(value[key])) value[key] = [];
      else if (isObject(value[key])) value[key] = {};
      else value[key] = "";
      continue;
    }
    value[key] = clean(value[key], depth + 1);
  }
  return value;
}

try {
  if (/\/sing7\/json\/v2\/cdn\/big_gift_list\/v2/i.test(url)
    || /\/sing7\/kingsbounty\/json\/v2\/cdn\/douge\/get_bounty_homepage/i.test(url)
    || /\/pendant\/v1\/get_user_pendant/i.test(url)
    || /youthimgbssdl\.kugou\.com\/[^/]+\.json/i.test(url)) {
    $done({ body: emptyBody() });
  } else if ($response && $response.body) {
    const body = $response.body;
    if (body.length > 262144) {
      $done({});
    } else {
      const json = clean(JSON.parse(body), 0);
      $done({ body: JSON.stringify(json) });
    }
  } else {
    $done({});
  }
} catch (error) {
  $done({});
}
