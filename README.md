# Loon-rule

个人 Loon 分流与插件规则仓库。

## Loon Advanced Auto Safe 配置

适合少量自建节点的日常配置，当前按「美国搬瓦工 + 荷兰搬瓦工」两类节点精简策略组，保留自动优选、手动切换、故障转移、SSID 直连、AI/流媒体/Telegram/GitHub 等常用分流。

### 一键导入

```text
https://www.nsloon.com/openloon/import?sub=https%3A%2F%2Fraw.githubusercontent.com%2Fzijinan%2FLoon-rule%2Fmain%2FLoon%2Fconfig%2FLoon_Advanced_Auto_Safe.conf
```

### 原始配置链接

```text
https://raw.githubusercontent.com/zijinan/Loon-rule/main/Loon/config/Loon_Advanced_Auto_Safe.conf
```

导入后在 Loon 本地添加你的私有节点或订阅，不要把真实节点信息提交到仓库。建议节点名包含 `BWG-US` / `USA` / `美国` 或 `BWG-NL` / `NL` / `荷兰`，这样配置里的筛选器能自动归类。

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
5. 粘贴下面链接：

```text
https://raw.githubusercontent.com/zijinan/Loon-rule/main/Loon/plugin/MissAV.lpx
```

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
