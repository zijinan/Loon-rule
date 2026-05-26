/*
 * Tencent Video ad SDK short-circuit.
 *
 * Keep this as a request script so Loon returns a tiny fake response before
 * the GDT/material request leaves the device.
 */

(function () {
  const url = ($request && $request.url) || "";
  const headers = ($request && $request.headers) || {};
  const accept = String(headers.Accept || headers.accept || "").toLowerCase();

  function fromBase64(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i) & 0xff;
    return bytes;
  }

  const responseHeaders = {
    "Cache-Control": "no-store",
    "X-Tencent-Video-AdBlock": "blocked"
  };

  if (accept.includes("image") || /\.(?:png|jpe?g|gif|webp)(?:\?|$)/i.test(url)) {
    responseHeaders["Content-Type"] = "image/gif";
    return $done({
      response: {
        status: 200,
        headers: responseHeaders,
        body: fromBase64("R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==")
      }
    });
  }

  if (accept.includes("json") || /\/(?:car|style_factory)\//i.test(url)) {
    responseHeaders["Content-Type"] = "application/json; charset=utf-8";
    return $done({ response: { status: 200, headers: responseHeaders, body: "{}" } });
  }

  responseHeaders["Content-Type"] = "text/plain; charset=utf-8";
  return $done({ response: { status: 200, headers: responseHeaders, body: "" } });
})();
