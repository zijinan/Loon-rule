# Quantumult X Rewrite Notes

This folder documents Quantumult X compatible rewrite snippets only. Do not add
Loon plugin files here.

Default stance:

- Main config keeps all rewrite resources disabled by default.
- MITM is disabled by default because the main config has an empty hostname list.
- Enable one rewrite at a time in Quantumult X after confirming the affected app still works.
- Video and music rewrites must be treated as "manual test before enabling" because they can cause loading loops.
- Do not commit certificates, private script tokens, cookies, accounts, subscriptions, UUIDs, or passwords.

Remote resources in the main config:

| Tag | Source | Hostname required by resource | Notes |
| --- | --- | --- | --- |
| Sub-Store | `sub-store-org/Sub-Store` QX snippet | `sub.store` | Tooling rewrite. Keep disabled until needed. |
| Script-Hub | `Script-Hub-Org/Script-Hub` QX module | `script.hub`, `*.script.hub` | Tooling rewrite. Keep disabled until needed. |
| BoxJs | `chavyleung/scripts` QuanX rewrite | `boxjs.com`, `boxjs.net`, `*.boxjs.com`, `*.boxjs.net` | Tooling rewrite. Keep disabled until needed. |
| BlockAds | fmz200 QX `rewrite.snippet` | Large hostname list inside the remote resource | Broad ad block. Manual test before enabling. Do not copy its hostname list into the main MITM section. |
| TencentVideo-Clean | fmz200 QX `TencentVideo.snippet` | `vv.video.qq.com` | QX snippet only. Loon TencentVideo scripts are intentionally not used. Manual test before enabling. |
| YouTube-Tools | Orz-3 QX rewrite | `*.googlevideo.com` | Manual test before enabling. Keep disabled if YouTube loops or stalls. |
| BiliBili-Tools | app2smile QX module | `app.bilibili.com`, `grpc.biliapi.net` | Manual test before enabling. |
| Spotify-Tools | app2smile module | `spclient.wg.spotify.com`, `*spclient.spotify.com` | Manual test before enabling. |
| KuGouMusic-Clean | Local QX rewrite in this repo | See `KuGouMusic.conf` | Kept disabled. Loon KuGou plugin/script is not used because it is not trusted for migration. |

`KuGouMusic.conf` is QX-formatted and only targets selected small ad, report,
and promotion endpoints. It avoids music streams, cover CDN, and account/member
APIs, but it still requires manual app testing before enabling.
