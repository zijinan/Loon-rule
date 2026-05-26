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
  rewritten = rewritten.replace(/(^|;\s*)(v_t_appid|appid)=wx([0-9a-f]{16})/gi, "$1$2=xx$3");
  rewritten = rewritten.replace(/(^|;\s*)(v_main_login|main_login)=wx(?=;|$)/gi, "$1$2=xx");
  return rewritten;
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
