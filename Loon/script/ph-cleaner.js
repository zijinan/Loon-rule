/* Lightweight HTML ad cleaner for Loon. Does not touch video/HLS CDN. */
let body = $response.body || "";
try {
  const css = `<style id="loon-ph-cleaner">
iframe[src*="trafficjunky"],
iframe[src*="/embeddedads"],
iframe[src*="/_xa/ads"],
a[href*="trafficjunky"],
a[href*="ads.trafficjunky"],
.adsbytrafficjunky,
.adsbytrafficjunky-container,
.js-adsRemoveButton,
.adLink,
.ad-link,
.adContainer,
.ad-container,
.adWrapper,
.ad-wrapper,
.ad_box,
.ad-box,
.advertisement,
.videoAdUi,
.prerollAd,
.promoBanner,
.promoBannerPersistant,
[class*="trafficjunky"],
[id*="trafficjunky"],
[class*="adContainer"],
[class*="ad-container"],
[id*="adContainer"],
[id*="ad-container"] {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  max-height: 0 !important;
  min-height: 0 !important;
  overflow: hidden !important;
}
</style>`;

  body = body
    .replace(/var\s+tjPreloadAds\s*=\s*JSON\.parse\('.*?'\);?/gs, "var tjPreloadAds = null;")
    .replace(/var\s+TJ_ADS_TAKEOVER\s*=\s*\{[\s\S]*?\};\s*<\/script>/g, "</script>")
    .replace(/https?:\\?\/\\?\/[^"']*trafficjunky[^"']*/gi, "")
    .replace(/\\?\/\\?\/[^"']*\/_xa\\?\/ads(?:_batch)?[^"']*/gi, "");

  if (body.includes("</head>")) {
    body = body.replace("</head>", css + "</head>");
  } else {
    body = css + body;
  }
} catch (e) {}
$done({ body });
