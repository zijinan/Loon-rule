# Security Audit Report

Input file:

- `C:\Users\zijin\Desktop\新建 文本文档.txt`

Local backup:

- A timestamped backup was created under `backups/`. This directory is ignored because the backup contains private MITM material.

## Sensitive Material Removed

The original config contained private MITM material:

- `ca-passphrase`: removed from the public config.
- `ca-p12`: removed from the public config.

The public config also removes or replaces:

- real node/provider-specific policy names
- direct references to private or personal rule/plugin repositories
- any place where subscriptions, UUIDs, passwords, Reality public keys, short-ids, Hysteria2 passwords, private domains, or tokens should appear

Recommended rotation:

- Regenerate the Loon MITM CA certificate and passphrase.
- Reinstall the new CA on trusted devices only.
- If the old public/private repository ever received the original config, rotate any node passwords, UUIDs, Hysteria2 passwords, Reality public keys/short-ids, and subscription URLs that appeared in that history.

## DNS Settings Adjusted

- Replaced foreign-only DoH with mixed DNS:
  - `dns-server = system,223.5.5.5,119.29.29.29`
  - `doh-server = https://223.5.5.5/dns-query,https://doh.pub/dns-query,https://1.1.1.1/dns-query,https://dns.google/dns-query`
- Added `hijack-dns = *:53` for app hardcoded UDP DNS capture.
- Kept `disable-stun = true`.
- Kept `sni-sniffing = true`.
- Changed `dns-reject-mode` to `NXDOMAIN`.
- Kept `domain-reject-mode = DNS`.
- Expanded `skip-proxy`, `bypass-tun`, and `real-ip` for LAN, Apple, Tencent, WeChat, and CDN stability.
- Added `[Host]` DNS steering:
  - China apps use `server:system` or China DNS.
  - foreign proxy-bound services use encrypted DoH.

## Rules Added Or Reordered

- LAN, loopback, reserved, private, and multicast addresses are first and DIRECT.
- STUN is rejected with `PROTOCOL,STUN,REJECT`.
- direct app DoH endpoints such as `dns.google` and `cloudflare-dns.com` go through the fallback proxy strategy.
- China HTTPDNS endpoints for Tencent, Alibaba, Baidu, Bilibili, Meituan, ByteDance, and NetEase are DIRECT to avoid slowing China apps.
- Honor of Kings / Tencent game domains are routed to `国内游戏策略`, whose first option is DIRECT.
- Tencent, WeChat, QQ, qcloud, myqcloud, gtimg, qlogo, qpic, payment, CDN, and telemetry domains are DIRECT before broad China rules.
- Foreign services are placed before broad China fallback rules:
  - YouTube, Google, Telegram, Twitter/X, Facebook, Instagram, TikTok, Netflix, OpenAI, Anthropic/Claude, GitHub, Microsoft, OneDrive, Speedtest.
- Apple split:
  - `AppleProxy` and `TestFlight` use `苹果代理策略`.
  - `iCloud` and `Apple` use `苹果直连策略`, default DIRECT.
- China fallback order:
  - specific China apps first
  - `China`, `ChinaIPs`, `ChinaMax`
  - `GEOIP,CN,DIRECT`
  - `FINAL,兜底后备策略`

## blackmatrix7 Remote Rule Links Referenced

All links below were checked against the `rule/Loon` tree and use real existing paths:

- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Hijacking/Hijacking.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Privacy/Privacy.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/AdvertisingLite/AdvertisingLite.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/YouTube/YouTube.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Google/Google.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Telegram/Telegram.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Twitter/Twitter.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Facebook/Facebook.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Instagram/Instagram.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/TikTok/TikTok.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Netflix/Netflix.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/OpenAI/OpenAI.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Anthropic/Anthropic.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/GitHub/GitHub.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Microsoft/Microsoft.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/OneDrive/OneDrive.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Speedtest/Speedtest.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/AppleProxy/AppleProxy.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/TestFlight/TestFlight.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/iCloud/iCloud.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Apple/Apple.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Steam/Steam.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Epic/Epic.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/PlayStation/PlayStation.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Nintendo/Nintendo.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Game/Game.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Lan/Lan.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/WeChat/WeChat.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Tencent/Tencent.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/TencentVideo/TencentVideo.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/BiliBili/BiliBili.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/DouYin/DouYin.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/AliPay/AliPay.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Alibaba/Alibaba.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/JingDong/JingDong.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/MeiTuan/MeiTuan.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Baidu/Baidu.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/GaoDe/GaoDe.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/ByteDance/ByteDance.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/NetEase/NetEase.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/XiaoMi/XiaoMi.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/ChinaMedia/ChinaMedia.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/China/China.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/ChinaIPs/ChinaIPs.list
- https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/ChinaMax/ChinaMax.list

Requested names not present under those exact directory names:

- `QQ`
- `Taobao`
- `JD`
- `Amap`
- `Domestic`

Equivalent real paths used where available:

- `JD` -> `JingDong`
- `Amap` -> `GaoDe`
- `LAN` -> `Lan`
- `Meituan` -> `MeiTuan`

`Taobao` is covered by local direct rules and `Alibaba`. `QQ` is covered by local direct rules plus `Tencent` and `WeChat`. `Domestic` is covered by `China`, `ChinaIPs`, `ChinaMax`, and local high-frequency China app rules.

## Manual Private Information Needed

Fill these only in local Loon UI or an ignored private config:

- `YOUR_SUBSCRIPTION_URL`
- `YOUR_NODE_NAME`
- `YOUR_UUID`
- `YOUR_PASSWORD`
- `YOUR_PRIVATE_DOMAIN`
- `YOUR_REALITY_PUBLIC_KEY`
- `YOUR_REALITY_SHORT_ID`
- `YOUR_CA_P12_REMOVED`
- `YOUR_CA_PASSPHRASE_REMOVED`

## Validation Notes

- No real subscriptions or proxy URI schemes are present in the public output.
- Public config no longer contains original MITM CA material.
- `FINAL` uses `兜底后备策略`.
- All policies referenced by local and remote rules are defined in `[Proxy Group]` or are built-in Loon policies such as `DIRECT`, `REJECT`, and `REJECT-DROP`.
- The original strategy-group shape was preserved as a sanitized public skeleton: manual groups, URL-test groups, fallback groups, global fallback, and dedicated game/Apple/media/AI groups remain, but real node/provider names were removed.
