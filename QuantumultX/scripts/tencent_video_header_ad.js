/*
Tencent Video header ad parameter guard for Quantumult X

Only neutralizes the captured qad_device_platform cookie on core Tencent Video
API requests. Login/session cookies are preserved so pagination, account state,
and playback are not affected.
*/

const request = typeof $request !== "undefined" ? $request : {};
const url = (request && request.url) || "";
const headers = (request && request.headers) || {};

function isCoreTencentVideoUrl(value) {
  return /^https?:\/\/(?:i\.video\.qq\.com\/|(?:vv|vv6)\.video\.qq\.com\/getvinfo|(?:tab\.video|config\.ab)\.qq\.com\/tab\/GetTabRemoteConfig|richmedia\.video\.qq\.com\/get_rich_media_info)/.test(value);
}

function headerValue(name) {
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return { key, value: String(headers[key] || "") };
  }
  return { key: name, value: "" };
}

try {
  if (!isCoreTencentVideoUrl(url)) {
    $done({});
  } else {
    const cookie = headerValue("Cookie");
    if (!cookie.value || !cookie.value.includes("qad_device_platform=5")) {
      $done({});
    } else {
      const nextHeaders = Object.assign({}, headers);
      nextHeaders[cookie.key] = cookie.value.split("qad_device_platform=5").join("qad_device_platform=0");
      $done({ headers: nextHeaders });
    }
  }
} catch (_) {
  $done({});
}
