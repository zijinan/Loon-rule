// 最后更新: 2026-10-15 06:36 (北京时间)
var url = $request.url;
var method = ($request.method || "GET").toLowerCase();
var match = url.match(/^https?:\/\/([^/?#]+)(\/[^?#]*)?(\?.*)?/);

if (match) {
  var targetUrl = "https://one-api.zzxu.de/one/" + match[1] + (match[2] || "") + (match[3] || "");
  var headers = {};
  var orig = $request.headers || {};
  for (var k in orig) {
    var lk = k.toLowerCase();
    if (lk !== "host" && lk !== "content-length" && lk !== "external") {
      headers[k] = orig[k];
    }
  }

  var options = {
    url: targetUrl,
    headers: headers,
    timeout: 15000,
  };

  if ($request.body) options.body = $request.body;

  $httpClient[method](options, function (error, response, data) {
    if (error) {
      $done({ response: { status: 502, body: String(error) } });
      return;
    }
    var resp = response || {};
    var code = resp.status || 200;
    var h = resp.headers || {};
    var out = {};
    for (var k in h) {
      if (!/^(content-encoding|content-length|transfer-encoding)$/i.test(k)) out[k] = h[k];
    }
    $done({ response: { status: code, headers: out, body: data } });
  });
} else {
  $done({});
}
