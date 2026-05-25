# Loon-rule

个人 Loon 分流与插件规则仓库。

## Loon Advanced Auto Safe Public 配置

这是公开安全版 Loon 配置模板，适合放在 GitHub 仓库中分发。真实节点、订阅、UUID、password、Reality public-key、short-id、Hysteria2 密码、MITM `ca-p12`、`ca-passphrase`、证书内容、私有域名和 token 都不要提交到仓库。

### 一键导入

```text
https://www.nsloon.com/openloon/import?sub=https%3A%2F%2Fraw.githubusercontent.com%2Fzijinan%2FLoon-rule%2Fmain%2FLoon%2Fconfig%2FLoon_Advanced_Auto_Safe.public.conf
```

### 原始配置链接

```text
https://raw.githubusercontent.com/zijinan/Loon-rule/main/Loon/config/Loon_Advanced_Auto_Safe.public.conf
```

### 本地私有信息

导入后在 Loon 本地添加你的私有节点或订阅，或参考：

```text
https://raw.githubusercontent.com/zijinan/Loon-rule/main/Loon/private.example.conf
```

`private.example.conf` 只保留占位符，真实私有配置必须留在本地。

### DNS 防泄漏测试

1. Loon 使用规则模式。
2. 打开 `https://www.dnsleaktest.com/` 或 `https://browserleaks.com/dns`。
3. 测试 YouTube、OpenAI、Telegram 等国外服务，DNS 结果不应暴露本地 ISP 解析器。
4. 测试微信、QQ、王者荣耀、支付宝、淘宝、京东、美团、抖音、B 站、高德地图等国内 App，请确认它们走 `DIRECT` 或 `国内游戏策略`。
5. 在 Loon 日志里确认 `dns.google`、`cloudflare-dns.com` 等国外 DoH 直连请求没有绕过代理。

### 微信/王者荣耀变慢时优先检查

- `WeChat`、`Tencent`、`TencentVideo`、`Lan`、`ChinaMax` 远程规则是否启用并更新成功。
- `qq.com`、`tencent.com`、`gtimg.com`、`qcloud.com`、`myqcloud.com`、`pvp.qq.com`、`smoba.qq.com`、`game.qq.com` 是否仍然指向 `DIRECT` 或 `国内游戏策略`。
- `[Host]` 里腾讯、微信、国内 CDN 域名是否仍使用 `server:system` 或国内 DNS。
- `国内游戏策略` 的首选是否仍为 `DIRECT`。
- 如果登录、支付、语音、更新异常，先临时关闭激进的广告或 HTTPDNS 插件排查。

## 可公开与不可公开

可以公开：

- `Loon/config/Loon_Advanced_Auto_Safe.public.conf`
- `Loon/private.example.conf`
- `Loon/rule/*.list`
- `README.md`
- `SECURITY_AUDIT.md`
- `.gitignore`

不要公开：

- 真实订阅链接
- 真实节点和能识别供应商或服务器的节点名
- UUID、password、Reality public-key、short-id、Hysteria2 密码
- MITM `ca-p12`、`ca-passphrase`、`.p12`、`.mobileconfig`、`.key`、`.pem`
- 私有域名、私有 token、原始备份配置

## Honor of Kings / 王者荣耀直连规则

```text
https://raw.githubusercontent.com/zijinan/Loon-rule/main/Loon/rule/HonorOfKings_Direct.list
```

这个规则只做 DIRECT 分流，不做去广告脚本，不拦截登录、支付、语音、更新和 CDN。

## MissAV 分流规则

### 安装链接

```text
https://raw.githubusercontent.com/zijinan/Loon-rule/main/Loon/plugin/MissAV.lpx
```

### Loon 安装方式

1. 打开 Loon。
2. 进入 `插件`。
3. 点击右上角 `+`。
4. 选择 `URL`。
5. 粘贴上面的链接。

### 规则说明

- `missav.ws` / `missav.live` / `missav.ai` / `missav.com`：主站走代理。
- `surrit.com`：视频播放 CDN 走代理。
- `fourhoi.com`：封面、预览资源走代理。
- `recombee.com`：推荐接口走代理。
- `tsyndicate.com` / `rallytrck.website` / `bluetrafficstream.com` / `myavlive.com` / `keepshare.org`：广告、跳转、统计域名拦截。

如果出现 Cloudflare 验证循环，可以在插件里临时取消：

```ini
# DOMAIN-SUFFIX,cloudflare.com,PROXY
```

前面的 `#` 注释符号。

## 腾讯视频 AntiCache 插件

```text
https://raw.githubusercontent.com/zijinan/Loon-rule/main/Loon/plugin/TencentVideo.lpx
```

说明：只 MITM 腾讯视频的小配置/广告接口，使用规则、Rewrite reject 和请求阶段脚本拦截，不做响应阶段脚本或响应体改写，避免 Loon 缓存膨胀。

## 酷狗音乐 AntiCache 插件

```text
https://raw.githubusercontent.com/zijinan/Loon-rule/main/Loon/plugin/KugouMusic.lpx
```

说明：根据抓包定制，主要拦截酷狗音乐统计、曝光、推送上报、广告追踪配置、活动推广素材和大体积礼物/挂件资源；保留登录、VIP、音乐播放、歌曲封面、会员状态等核心接口。不做响应体改写，避免 Loon 缓存膨胀。
