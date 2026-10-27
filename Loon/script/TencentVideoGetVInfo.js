// Tencent Video getvinfo form request adjustment for Loon.
// Only touches single ASCII digits for sppreviewtype and spsrt.
// Original request data, identifiers, credentials and tokens are never logged.
(function () {
  try {
    const url = ($request && $request.url) || "";
    if (!/^https:\/\/svv\.video\.qq\.com\/getvinfo(?:\?.*)?$/i.test(url)) {
      $done({});
      return;
    }
    const src = $request.body;
    if (!src || Object.prototype.toString.call(src) !== "[object Uint8Array]") {
      console.log("[TxVideoAD-Loon] getvinfo: no binary body");
      $done({});
      return;
    }
    const headers = $request.headers || {};
    let ct = "";
    for (const k in headers) if (k.toLowerCase() === "content-type") ct = String(headers[k]).toLowerCase();
    if (ct && !ct.includes("application/x-www-form-urlencoded")) {
      console.log("[TxVideoAD-Loon] getvinfo: skipped unexpected content type");
      $done({});
      return;
    }
    const buf = src.slice();
    const fields = ["sppreviewtype", "spsrt"];
    let altered = 0;
    function patch(key) {
      const needle = new Uint8Array(key.length + 1);
      for (let i = 0; i < key.length; i++) needle[i] = key.charCodeAt(i);
      needle[key.length] = 61; // '='
      for (let i = 0; i + needle.length < buf.length; i++) {
        if (i && buf[i - 1] !== 38) continue; // '&' or beginning
        let found = true;
        for (let j = 0; j < needle.length; j++) {
          if (buf[i + j] !== needle[j]) { found = false; break; }
        }
        if (!found) continue;
        const pos = i + needle.length;
        // Only modify a one-digit numeric value; body length stays unchanged.
        if (buf[pos] >= 48 && buf[pos] <= 57 &&
            (pos + 1 === buf.length || buf[pos + 1] === 38)) {
          if (buf[pos] !== 48) { buf[pos] = 48; altered++; }
        }
        return;
      }
    }
    for (const key of fields) patch(key);
    console.log("[TxVideoAD-Loon] getvinfo: " + (altered ? "PATCHED" : "unchanged") + " fields=" + altered);
    $done(altered ? { body: buf } : {});
  } catch (e) {
    console.log("[TxVideoAD-Loon] getvinfo ERR " + String(e));
    $done({});
  }
})();