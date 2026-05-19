# Loon-rule

个人 Loon 分流与插件规则仓库。

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
