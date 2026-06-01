# Security Policy

本仓库维护公开可分享的规则、插件和配置模板。安全目标是：任何提交到仓库的内容都不应包含真实私密配置，也不应让公开模板破坏基础网络功能。

## 支持范围

当前维护范围：

- `Loon/config/Loon_Advanced_Auto_Safe.public.conf`
- `Loon/private.example.conf`
- `Loon/rule/*.list`
- `Loon/plugin/*.lpx`
- `QuantumultX/**`
- `shadowrocket/**`
- 维护脚本、文档和 GitHub 工作流

## 如何报告安全问题

如果发现公开配置可能泄露私密信息、误导用户提交私密信息，或存在明显误拦截风险，请提交 `Public config safety review` Issue。

报告时请不要公开：

- 真实订阅链接、节点、UUID、password、Reality key、short-id、Hysteria2 密码。
- MITM 证书、`ca-p12`、`ca-passphrase`、`.p12`、`.mobileconfig`、`.key`、`.pem`。
- 私有域名、账号、Cookie、token、抓包完整请求或任何可识别个人环境的信息。

可以公开描述：

- 受影响文件路径。
- 规则类型或域名后缀。
- 预期行为和实际行为。
- 使用的客户端，例如 Loon、QuantumultX 或 Shadowrocket。

## 处理原则

- 疑似泄露优先处理，先移除或替换为占位符。
- 如果历史提交曾包含真实私密材料，应轮换对应订阅、密码、UUID、Reality key、short-id 和证书。
- 对登录、支付、语音、更新、CDN 相关规则保持保守，避免为了拦截广告破坏核心功能。
