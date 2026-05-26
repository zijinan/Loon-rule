/*
Tencent Video IACC ad guard for Quantumult X

Observed in captures:
- iacc.rec.qq.com appears next to pgdt.gtimg.cn material loads.
- Request cookies expose WeChat login/appid values to the ad service.
- Small binary request/response bodies can contain PRE-DOWNLOAD / PRERANK / PROFILE ad-rank hints.

Safety:
- Only for iacc.qq.com and iacc.rec.qq.com.
- No reject rules and no broad qq.com/gtimg.com MITM.
- Body replacements are same length to avoid breaking binary protobuf frames.
- Header cookies are allowed to change length; they are isolated to the ad service.
*/

const MAX_BODY_SIZE = 128 * 1024;
const request = typeof $request !== "undefined" ? $request : {};
const response = typeof $response !== "undefined" ? $response : undefined;
const url = (request && request.url) || "";
const body = (response && response.body) || (request && request.body) || "";
const headers = (request && request.headers) || {};

function isIaccUrl(value) {
  return /^https?:\/\/iacc(?:\.rec)?\.qq\.com\//.test(value);
}

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

function headerValue(name) {
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return { key, value: String(headers[key] || "") };
  }
  return { key: name, value: "" };
}

function neutralizeText(source) {
  let rewritten = String(source || "");
  const swaps = [
    ["PRE-DOWNLOAD", "XXX-DOWNLOAD"],
    ["CARD-PRERANK", "CARD-PREXXXX"],
    ["CARD-PROFILE", "CARD-PROFXXX"],
    ["CARD-RANK", "CARD-XXXX"],
    ["PRERANK", "PREXXXX"],
    ["PROFILE", "PROFXXX"],
    ["#RANK-10", "#XXXX-10"],
    ["-RANK-10", "-XXXX-10"],
    ["low_end_pad", "low_xxx_pad"],
    ["LowEndPad", "LowXxxPad"]
  ];

  for (const [needle, replacement] of swaps) {
    rewritten = replaceLiteral(rewritten, needle, replacement);
  }

  rewritten = replaceRegexStable(rewritten, /wx[0-9a-f]{16}/gi, (match) => `xx${match.slice(2)}`);
  return rewritten;
}

function neutralizeCookie(source) {
  let rewritten = String(source || "");
  const dropKeys = new Set([
    "access_token",
    "openid",
    "p_vuserid",
    "refresh_token",
    "v_p_vuserid",
    "v_t_access_token",
    "v_t_openid",
    "v_t_refresh_token",
    "v_vurefresh",
    "v_vuserid",
    "v_vusession",
    "vcuid",
    "vdevice_qimei36",
    "vqq_access_token",
    "vqq_appid",
    "vqq_openid",
    "vqq_refresh_token",
    "vqq_vuserid",
    "vqq_vusession",
    "vuserid",
    "vusession"
  ]);

  const replacements = {
    appid: "xxca942bbff22e0e51",
    main_login: "xx",
    qad_device_platform: "0",
    video_appid: "0",
    video_omgid: "",
    video_platform: "0",
    v_main_login: "xx",
    v_t_appid: "xxca942bbff22e0e51"
  };

  const parts = [];
  for (const rawPart of rewritten.split(";")) {
    const trimmed = rawPart.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    const key = eq >= 0 ? trimmed.slice(0, eq) : trimmed;
    const lower = key.toLowerCase();
    if (dropKeys.has(lower)) continue;
    if (Object.prototype.hasOwnProperty.call(replacements, lower)) {
      parts.push(`${key}=${replacements[lower]}`);
    } else {
      parts.push(trimmed);
    }
  }

  return parts.join("; ");
}

try {
  if (!isIaccUrl(url)) {
    $done({});
  } else if (request && !response) {
    const result = {};
    const cookie = headerValue("Cookie");
    if (cookie.value) {
      const nextCookie = neutralizeCookie(cookie.value);
      if (nextCookie !== cookie.value) {
        const nextHeaders = Object.assign({}, headers);
        nextHeaders[cookie.key] = nextCookie;
        const loginv = headerValue("loginv");
        if (loginv.value && loginv.value !== "0") nextHeaders[loginv.key] = "0";
        result.headers = nextHeaders;
      }
    }

    if (body && body.length <= MAX_BODY_SIZE) {
      const output = neutralizeText(body);
      if (output !== body) result.body = output;
    }

    if (result.headers || result.body) $done(result);
    else $done({});
  } else if (body && body.length <= MAX_BODY_SIZE) {
    const output = neutralizeText(body);
    if (output === body) $done({});
    else $done({ body: output });
  } else {
    $done({});
  }
} catch (_) {
  $done({});
}
