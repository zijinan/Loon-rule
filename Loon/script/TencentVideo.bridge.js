/*
 * Tencent Video Loon -> Cloudflare Worker bridge.
 *
 * Loon only intercepts request-time traffic and returns the Worker's upstream
 * response. Response body cleaning runs on Cloudflare instead of Loon.
 */

(function () {
  const WORKER_URL = "https://tencent-video-bridge.zijinan20000.workers.dev/proxy";
  const MAX_BODY_SIZE = 1024 * 1024;
  const url = ($request && $request.url) || "";
  const method = (($request && $request.method) || "GET").toUpperCase();
  const headers = ($request && $request.headers) || {};
  const rawBody = pickBody($request || {});

  function valueLength(value) {
    if (!value) return 0;
    if (typeof value === "string") return value.length;
    if (typeof ArrayBuffer !== "undefined") {
      if (value instanceof ArrayBuffer) return value.byteLength;
      if (ArrayBuffer.isView && ArrayBuffer.isView(value)) return value.byteLength;
    }
    return typeof value.length === "number" ? value.length : 0;
  }

  function pickBody(source) {
    if (valueLength(source.bodyBytes) > 0) return source.bodyBytes;
    if (valueLength(source.body) > 0) return source.body;
    return source.bodyBytes || source.body || "";
  }

  function bytesToText(bytes) {
    let text = "";
    for (let i = 0; i < bytes.length; i += 1) text += String.fromCharCode(bytes[i] & 0xff);
    return text;
  }

  function bodyToBytes(value) {
    if (!value) return [];
    if (typeof value === "string") {
      const bytes = [];
      for (let i = 0; i < value.length; i += 1) bytes.push(value.charCodeAt(i) & 0xff);
      return bytes;
    }
    if (typeof ArrayBuffer !== "undefined") {
      if (value instanceof ArrayBuffer) return Array.from(new Uint8Array(value));
      if (ArrayBuffer.isView && ArrayBuffer.isView(value)) {
        return Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
      }
    }
    if (typeof value.length === "number") return Array.from(value);
    return bodyToBytes(String(value));
  }

  function encodeBase64(value) {
    const bytes = bodyToBytes(value);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i] & 0xff);
    return btoa(binary);
  }

  function decodeBase64(value) {
    if (!value) return "";
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i) & 0xff;
    return bytes;
  }

  function filteredHeaders(input) {
    const output = {};
    for (const key of Object.keys(input || {})) {
      const lower = key.toLowerCase();
      if (lower === "host" || lower === ":authority" || lower === "content-length" || lower === "accept-encoding") continue;
      output[key] = String(input[key]);
    }
    output["Accept-Encoding"] = "identity";
    return output;
  }

  if (!url || valueLength(rawBody) > MAX_BODY_SIZE) {
    return $done({});
  }

  const payload = {
    url: url,
    method: method,
    headers: filteredHeaders(headers),
    bodyBase64: encodeBase64(rawBody)
  };

  $httpClient.post({
    url: WORKER_URL,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(payload),
    timeout: 15
  }, function (error, response, data) {
    if (error || !data) return $done({});

    try {
      const result = JSON.parse(data);
      if (!result || typeof result.status !== "number") return $done({});

      const responseHeaders = result.headers || {};
      responseHeaders["Content-Encoding"] = "identity";
      delete responseHeaders["content-encoding"];
      delete responseHeaders["Content-Length"];
      delete responseHeaders["content-length"];

      return $done({
        response: {
          status: result.status,
          headers: responseHeaders,
          body: decodeBase64(result.bodyBase64 || "")
        }
      });
    } catch (_) {
      return $done({});
    }
  });
})();
