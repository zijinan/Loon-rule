// ONE API relay compatibility - resilient revision (2026-10-16).
// Original code snapshot: Loon/script/One_Loon_Upstream_20261016.js
// The third-party relay receives the original request headers and body.
// No new mirror server or hidden backup relay is used.
var RELAY = "https://one-api.zzxu.de/one/";
var BREAKER_KEY = "one_relay_breaker_until_v2";
var BREAKER_MS = 25000;
var RELAY_TIMEOUT_MS = 6500; // Must stay below plugin script timeout=12 seconds.

var req = typeof $request === "undefined" ? {} : ($request || {});
var originalUrl = String(req.url || "");
var method = String(req.method || "GET").toLowerCase();
var match = originalUrl.match(/^https?:\/\/([a-z0-9.-]+)(\/[^?#]*)?(\?[^#]*)?/i);

function finishOriginal() {
  // Preserve original URL/headers/body, but route the fallback to DIRECT.
  $done({ node: "DIRECT" });
}
function logStatus(message) {
  // Never log request URLs, authorization headers, cookies, or request bodies.
  if (typeof console !== "undefined" && console.log) console.log("[ONE relay] " + message);
}
function readBreaker() {
  try {
    if (typeof $persistentStore !== "undefined" && $persistentStore.read) {
      return Number($persistentStore.read(BREAKER_KEY)) || 0;
    }
  } catch (_) {}
  return 0;
}
function openBreaker() {
  try {
    if (typeof $persistentStore !== "undefined" && $persistentStore.write) {
      $persistentStore.write(String(Date.now() + BREAKER_MS), BREAKER_KEY);
    }
  } catch (_) {}
}
function clearBreaker() {
  try {
    if (typeof $persistentStore !== "undefined" && $persistentStore.write) {
      $persistentStore.write(null, BREAKER_KEY);
    }
  } catch (_) {}
}
function isReadOnly(methodName, path) {
  if (/^(get|head|options)$/.test(methodName)) return true;
  // Some read endpoints are POST-based. Never reissue arbitrary user/payment
  // write calls, as the relay could have committed them before timing out.
  return methodName === "post" &&
    /^\/v\d+\.\d+\/(?:article|navigation|search|area|panda|actor|notice|feed|rank|topic|novel|live|popup)(?:\/|$)/i.test(path);
}
function upstreamError(safe, code, relayResponse, data) {
  openBreaker();
  logStatus("relay unavailable (" + String(code || "network") + ")" + (safe ? "; trying origin direct" : "; unsafe request not retried"));
  if (safe) {
    finishOriginal();
  } else if (relayResponse && Number(relayResponse.status) >= 400) {
    finishRelayResponse(relayResponse, data);
  } else {
    // No automatic retry for state-changing POST/PUT/PATCH/DELETE.
    $done({ response: { status: 502, headers: { "Content-Type": "application/json" },
      body: '{"error":"ONE relay unavailable; write request not retried"}' } });
  }
}
function finishRelayResponse(response, data) {
  var resultHeaders = {};
  var responseHeaders = response.headers || {};
  for (var name in responseHeaders) {
    if (!/^(content-encoding|content-length|transfer-encoding)$/i.test(name)) {
      resultHeaders[name] = responseHeaders[name];
    }
  }
  $done({ response: { status: Number(response.status), headers: resultHeaders,
    body: data === null || typeof data === "undefined" ? "" : data } });
}
if (!match || match[1].toLowerCase() === "one-api.zzxu.de" ||
    !/^(get|post|put|patch|delete|head|options)$/.test(method) ||
    typeof $httpClient === "undefined" || typeof $httpClient[method] !== "function") {
  $done({});
} else {
  var path = match[2] || "/";
  var safeFallback = isReadOnly(method, path);
  if (safeFallback && Date.now() < readBreaker()) {
    logStatus("temporary origin direct fallback");
    finishOriginal();
  } else {
    var headers = {};
    var originalHeaders = req.headers || {};
    for (var key in originalHeaders) {
      if (!/^(host|content-length|external|connection|transfer-encoding)$/i.test(key)) {
        headers[key] = originalHeaders[key];
      }
    }
    var options = {
      url: RELAY + match[1] + path + (match[3] || ""),
      headers: headers,
      timeout: RELAY_TIMEOUT_MS,
      "auto-redirect": false
    };
    if (req.body !== null && typeof req.body !== "undefined" &&
        method !== "get" && method !== "head") options.body = req.body;
    try {
      $httpClient[method](options, function (error, response, data) {
        var status = Number(response && response.status);
        if (error || !response || !status || status === 408 || status === 425 ||
            status === 429 || status >= 500) {
          upstreamError(safeFallback, status || "network", response, data);
          return;
        }
        // A Cloudflare challenge can return HTML with HTTP 200.
        var ctype = "";
        var responseHeaders = response.headers || {};
        for (var h in responseHeaders) {
          if (h.toLowerCase() === "content-type") ctype = String(responseHeaders[h]);
        }
        if (status === 200 && /text\/html/i.test(ctype) &&
            /^\s*(?:<!doctype html|<html)/i.test(String(data || "").slice(0, 256))) {
          upstreamError(safeFallback, "HTML challenge", response, data);
          return;
        }
        clearBreaker();
        finishRelayResponse(response, data);
      });
    } catch (_) {
      upstreamError(safeFallback, "script error", null, null);
    }
  }
}
