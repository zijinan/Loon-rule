# Quantumult X Rewrite Notes

This folder documents Quantumult X compatible rewrite snippets only. Do not add Loon plugin files here.

Default stance:

- Main config keeps risky/broad rewrite resources disabled by default.
- MITM is disabled by default because the main config has an empty hostname list.
- Enable one rewrite at a time in Quantumult X after confirming the affected app still works.
- Video and music rewrites must be treated as manual test before enabling because they can cause loading loops.
- Do not commit certificates, private script tokens, cookies, accounts, subscriptions, UUIDs, or passwords.

## TencentVideo-Safe

Enhanced conservative Tencent Video rewrite for QX:

```text
https://raw.githubusercontent.com/zijinan/Loon-rule/main/QuantumultX/rewrite/TencentVideo-Safe.conf
```

Script used by the rewrite:

```text
https://raw.githubusercontent.com/zijinan/Loon-rule/main/QuantumultX/script/TencentVideo-AntiCache.js
```

Design:

- Based on misitechan txsp startup rules plus this repo's TencentVideo AntiCache capture analysis.
- Handles `vv.video.qq.com` vmind/getvinfo startup paths.
- Handles narrow `pgdt.gtimg.cn` / `ossgw.alicdn.com` / `vfiles.gtimg.cn` ad-material paths.
- Handles small config endpoints such as `config.ab.qq.com`, `appcfg.v.qq.com`, `rdelivery.qq.com`, and `playproxy.video.qq.com`.
- Uses request-stage script only for `i.video.qq.com` ad/promo/preload trpc requests.
- Does not do response-body rewriting.
- Does not read or rewrite large video/image CDN bodies.

Test steps:

1. Install only `TencentVideo-Safe.conf` first.
2. Disable other Tencent Video rewrites to avoid conflicts.
3. Clear Tencent Video cache, or reinstall the app if cached startup material still appears.
4. Capture again and check `vv.video.qq.com/getvmind`, `vv.video.qq.com/getvinfo`, `pgdt.gtimg.cn`, and `i.video.qq.com`.

## TencentVideo-misitechan

Imported upstream-style reference file from misitechan's txsp rules. Keep this mainly for comparison/testing:

```text
https://raw.githubusercontent.com/zijinan/Loon-rule/main/QuantumultX/rewrite/TencentVideo-misitechan.conf
```

## Remote resources in the main config

| Tag | Source | Hostname required by resource | Notes |
| --- | --- | --- | --- |
| Sub-Store | `sub-store-org/Sub-Store` QX snippet | `sub.store` | Tooling rewrite. Keep disabled until needed. |
| Script-Hub | `Script-Hub-Org/Script-Hub` QX module | `script.hub`, `*.script.hub` | Tooling rewrite. Keep disabled until needed. |
| BoxJs | `chavyleung/scripts` QuanX rewrite | `boxjs.com`, `boxjs.net`, `*.boxjs.com`, `*.boxjs.net` | Tooling rewrite. Keep disabled until needed. |
| BlockAds | fmz200 QX `rewrite.snippet` | Large hostname list inside the remote resource | Broad ad block. Manual test before enabling. Do not copy its hostname list into the main MITM section. |
| TencentVideo-Safe | Local QX rewrite in this repo | See `TencentVideo-Safe.conf` | Conservative request/rewrite only. Recommended Tencent Video test file. |
| TencentVideo-misitechan | Local imported reference | See `TencentVideo-misitechan.conf` | Reference only; upstream-style startup rules. |
| TencentVideo-Clean | fmz200 QX `TencentVideo.snippet` | `vv.video.qq.com` | QX snippet only, but current upstream file has most core rules commented. Keep disabled. |
| YouTube-Tools | Orz-3 QX rewrite | `*.googlevideo.com` | Manual test before enabling. Keep disabled if YouTube loops or stalls. |
| BiliBili-Tools | app2smile QX module | `app.bilibili.com`, `grpc.biliapi.net` | Manual test before enabling. |
| Spotify-Tools | app2smile module | `spclient.wg.spotify.com`, `*spclient.spotify.com` | Manual test before enabling. |
| KuGouMusic-Clean | Local QX rewrite in this repo | See `KuGouMusic.conf` | Kept disabled. Targets selected small ad/report/promotion endpoints only. |
