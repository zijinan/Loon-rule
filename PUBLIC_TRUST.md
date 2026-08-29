# Public Trust / 公开使用安全说明

这个仓库同时包含“高级功能配置”和“公开安全配置”。为了让陌生用户可以先审查、再使用，推荐公开分发时默认使用 **Public Safe** 配置，而不是直接使用带 MITM / Rewrite / 远程脚本的高级配置。

## 推荐给普通用户的入口

Quantumult X：

```text
https://raw.githubusercontent.com/zijinan/Loon-rule/main/QuantumultX/config/QuanX_Public_Safe.conf
```

`QuanX_Public_Safe.conf` 的设计约束：

- 不包含节点、订阅、UUID、密码、token、证书或 MITM 私钥。
- `[server_remote]` 不内置任何订阅 URL。
- `[rewrite_local]` 为空。
- `[rewrite_remote]` 为空。
- `[task_local]` 为空。
- 不执行任何远程 JavaScript。
- 不做 HTTPS 响应体修改。
- 只使用本地分流规则、域名级广告拦截和文本规则列表。
- 登录、支付、微信、QQ、腾讯、国内 CDN 等优先保守处理。

因此，Public Safe 的安全边界比带脚本的高级配置更容易审查：它可以决定流量走 DIRECT / PROXY / REJECT，但默认不会读取或修改 HTTPS 响应正文。

## 高级配置的风险说明

`QuantumultX/config/QuanX_Optimized.conf` 是高级功能配置，当前会使用第三方 Rewrite / Script，例如 YouTube 去广告、字幕翻译以及部分 App 去广告功能。

这类配置的特点是：

- 需要用户自行安装并信任 Quantumult X MITM 证书。
- 第三方脚本能够查看或修改其匹配域名的 HTTPS 请求/响应内容。
- 上游仓库更新后，远程脚本行为可能变化。
- 去广告效果通常更强，但审计成本和兼容性风险也更高。

所以高级配置适合愿意审查脚本来源、理解 MITM 含义并接受兼容性风险的用户；不应把它描述为“零风险”。

## 自动检查

仓库的 GitHub Actions 会运行：

```bash
node scripts/validate-public-rules.js
```

当前检查包括：

1. 禁止提交常见代理 URI、UUID、密码、token、MITM 证书材料和敏感文件类型。
2. 检查 `QuantumultX/rule/*.list` 的基本 QX 规则字段格式，避免再次出现 `Invalid Line` 一类错误。
3. 强制 `QuanX_Public_Safe.conf` 保持无 Rewrite、无 Task、无订阅 URL、无 MITM 凭据、无脚本执行。

只要这些约束被破坏，CI 就会失败。

## 第三方依赖

Public Safe 仍可能引用第三方**文本规则列表**。文本规则也可能影响路由或拦截结果，因此使用者仍应关注上游变化。与远程 JavaScript 相比，它们的权限面更小，也更容易人工审查。

高级配置中的第三方 Rewrite / Script 不属于 Public Safe 的默认信任边界。

## 用户使用前应确认

- 从本仓库 Raw 地址导入，而不是来源不明的二次转载链接。
- 公开配置中没有出现你的真实订阅、节点、证书或 token。
- Quantumult X 的节点/订阅在本机自行添加。
- 如果启用高级 Rewrite/MITM，先确认脚本来源和匹配域名。
- 登录、支付、更新异常时，优先切回 Public Safe 排查。

## 安全定位

本仓库的目标不是承诺“绝对安全”，而是做到：

- 默认公开入口最小权限；
- 高权限功能明确标注；
- 私密信息不进入公开仓库；
- 规则格式和公开安全约束可由 CI 自动验证；
- 用户可以清楚区分“文本分流规则”和“可执行远程脚本”。
