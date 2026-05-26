# Quantumult X Rewrite Notes

This folder contains Quantumult X compatible rewrite snippets only.

Default stance:

- Main config keeps all rewrite resources disabled by default.
- MITM is disabled by default because the main config has an empty hostname list.
- Enable one rewrite at a time in Quantumult X after confirming the affected app still works.
- Do not commit certificates, private script tokens, node subscriptions, UUIDs, or passwords.

Included in the main config as disabled remote resources:

- Sub-Store
- Script-Hub
- BoxJs
- BlockAds
- YouTube tools
- BiliBili tools
- Spotify tools
- KuGouMusic-Clean

`KuGouMusic.conf` is a local QX rewrite conversion. It only targets small ad, report, and promotion endpoints and avoids music streams, cover CDN, and account/member APIs.
